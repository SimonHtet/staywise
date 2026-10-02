import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'
import { audited } from '@/lib/audit'
import { canManageRooms } from '@/lib/roomtypes'

const MAX_ROOMS_PER_REQUEST = 300

export async function GET() {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  try {
    const rooms = await prisma.room.findMany({
      where: { hotelId: hotelId! },
      orderBy: [{ floor: 'asc' }, { id: 'asc' }],
    })
    return NextResponse.json(rooms)
  } catch (err) {
    console.error('[/api/rooms] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

// POST /api/rooms — bulk add: { rooms: [{ id: "101", floor: 1, type: "DELUXE" }] }
async function POST_handler(req: NextRequest) {
  const { hotelId, role, error } = await getSessionOrUnauthorized()
  if (error) return error
  if (!canManageRooms(role!)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const input = Array.isArray(body.rooms) ? body.rooms : null
  if (!input || input.length === 0) return NextResponse.json({ error: 'Add at least one room' }, { status: 400 })
  if (input.length > MAX_ROOMS_PER_REQUEST) {
    return NextResponse.json({ error: `Add at most ${MAX_ROOMS_PER_REQUEST} rooms at a time` }, { status: 400 })
  }

  const types = await prisma.roomType.findMany({ where: { hotelId: hotelId! } })
  const typeByCode = new Map(types.map((t) => [t.code, t]))

  const rooms: { id: string; floor: number; type: string; rate: number; hotelId: string }[] = []
  const seen = new Set<string>()
  for (const r of input) {
    const id = String(r?.id ?? '').trim()
    const floor = Number(r?.floor)
    const type = typeByCode.get(String(r?.type ?? ''))
    if (!/^[A-Za-z0-9-]{1,10}$/.test(id)) return NextResponse.json({ error: `"${id}" is not a valid room number` }, { status: 400 })
    if (!Number.isInteger(floor) || floor < -5 || floor > 200) return NextResponse.json({ error: `Room ${id}: enter a whole floor number` }, { status: 400 })
    if (!type) return NextResponse.json({ error: `Room ${id}: choose one of your room types` }, { status: 400 })
    if (seen.has(id)) return NextResponse.json({ error: `Room ${id} is listed twice` }, { status: 400 })
    seen.add(id)
    rooms.push({ id, floor, type: type.code, rate: type.rate, hotelId: hotelId! })
  }

  // Room ids are global (see README "Known limits") — report clashes clearly
  const clashes = await prisma.room.findMany({ where: { id: { in: rooms.map((r) => r.id) } }, select: { id: true } })
  if (clashes.length > 0) {
    return NextResponse.json(
      { error: `These room numbers already exist: ${clashes.map((c) => c.id).join(', ')}` },
      { status: 409 },
    )
  }

  await prisma.room.createMany({ data: rooms })
  return NextResponse.json({ created: rooms.length }, { status: 201 })
}

export const POST = audited('room.bulkCreate', POST_handler)
