import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'

const PAGE_SIZE = 50

// GET /api/audit?entity=reservation&entityId=…&user=…&before=<id>
export async function GET(req: NextRequest) {
  const { hotelId, role, error } = await getSessionOrUnauthorized()
  if (error) return error
  if (!hasPermission(role!, 'VIEW_FINANCIALS')) {
    return NextResponse.json({ error: 'Forbidden — insufficient permissions' }, { status: 403 })
  }

  const sp = new URL(req.url).searchParams
  const entity = sp.get('entity')
  const entityId = sp.get('entityId')
  const user = sp.get('user')?.slice(0, 100)
  const before = Number(sp.get('before')) || undefined

  try {
    const rows = await prisma.auditLog.findMany({
      where: {
        hotelId: hotelId!,
        ...(entity ? { entity } : {}),
        ...(entityId ? { entityId } : {}),
        ...(user ? { userName: { contains: user, mode: 'insensitive' as const } } : {}),
        ...(before ? { id: { lt: before } } : {}),
      },
      orderBy: { id: 'desc' },
      take: PAGE_SIZE + 1,
    })
    return NextResponse.json({
      rows: rows.slice(0, PAGE_SIZE),
      nextBefore: rows.length > PAGE_SIZE ? rows[PAGE_SIZE - 1].id : null,
    })
  } catch (err) {
    console.error('[GET /api/audit] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
