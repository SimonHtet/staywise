import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { prisma } from './prisma'

// Fields never written to the audit trail
const REDACT = new Set(['password', 'newPassword', 'currentPassword', 'passportNumber'])
const MAX_DETAIL_CHARS = 4000

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => scrub(v, depth + 1))
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = REDACT.has(k) ? '[redacted]' : scrub(v, depth + 1)
  }
  return out
}

/** Write one audit row. Never throws — auditing must not break the action. */
export async function writeAudit(entry: {
  hotelId: string
  userId?: string | null
  userName?: string | null
  action: string
  entity: string
  entityId?: string | null
  details?: unknown
}) {
  try {
    let details = scrub(entry.details ?? {})
    if (JSON.stringify(details).length > MAX_DETAIL_CHARS) details = { truncated: true }
    await prisma.auditLog.create({
      data: {
        hotelId: entry.hotelId,
        userId: entry.userId ?? null,
        userName: entry.userName ?? null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        details: details as object,
      },
    })
  } catch (err) {
    console.error('[audit] write failed:', entry.action, err)
  }
}

// Next 15+: route params arrive as a Promise
type Ctx = { params: Promise<Record<string, string>> }
type Handler = (req: Request, ctx: Ctx) => Promise<Response>

/**
 * Wrap a mutating route handler: after a 2xx response, record who did what.
 * `action` is "<entity>.<verb>", e.g. "reservation.checkout"; the entity id
 * is the route's [id] param (plus folio / tx ids when present).
 */
export function audited(action: string, handler: (req: any, ctx: any) => Promise<Response>): Handler {
  const entity = action.split('.')[0]
  return async (req, ctx) => {
    let body: unknown = undefined
    try {
      if (req.headers.get('content-type')?.includes('application/json')) body = await req.clone().json()
    } catch {
      // empty / non-JSON body — nothing to record
    }
    const res = await handler(req, ctx)
    if (res.ok) {
      const session = await getServerSession(authOptions)
      const user = session?.user as any
      if (user?.hotelId) {
        const { id, ...otherParams } = (await ctx?.params) ?? {}
        await writeAudit({
          hotelId: user.hotelId,
          userId: user.id,
          userName: user.name ?? user.email,
          action,
          entity,
          entityId: id ?? null,
          details: { ...(Object.keys(otherParams).length ? { params: otherParams } : {}), ...(body !== undefined ? { body } : {}) },
        })
      }
    }
    return res
  }
}
