import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'
import { audited } from '@/lib/audit'
import { canManageRooms, parseRoomType } from '@/lib/roomtypes'

export async function GET() {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error
  const types = await prisma.roomType.findMany({
    where: { hotelId: hotelId! },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })
  return NextResponse.json(types)
}

async function POST_handler(req: NextRequest) {
  const { hotelId, role, error } = await getSessionOrUnauthorized()
  if (error) return error
  if (!canManageRooms(role!)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const parsed = parseRoomType(body)
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 })
  if (!parsed.code || !parsed.name) {
    return NextResponse.json({ error: 'Code and name are required' }, { status: 400 })
  }
  const exists = await prisma.roomType.findUnique({ where: { hotelId_code: { hotelId: hotelId!, code: parsed.code } } })
  if (exists) return NextResponse.json({ error: `Room type ${parsed.code} already exists` }, { status: 409 })

  const count = await prisma.roomType.count({ where: { hotelId: hotelId! } })
  const created = await prisma.roomType.create({
    data: { hotelId: hotelId!, code: parsed.code, name: parsed.name, rate: parsed.rate ?? 0, sortOrder: count },
  })
  return NextResponse.json(created, { status: 201 })
}

export const POST = audited('roomType.create', POST_handler)
