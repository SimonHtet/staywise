import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'
import { audited } from '@/lib/audit'
import { canManageRooms, parseRoomType } from '@/lib/roomtypes'

async function PUT_handler(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const { hotelId, role, error } = await getSessionOrUnauthorized()
  if (error) return error
  if (!canManageRooms(role!)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const type = await prisma.roomType.findFirst({ where: { id: params.id, hotelId: hotelId! } })
  if (!type) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  // Code is the key stored on rooms and reservations — renaming it would orphan them
  const { error: parseError, name, rate } = parseRoomType({ name: body.name, rate: body.rate })
  if (parseError) return NextResponse.json({ error: parseError }, { status: 400 })

  const updated = await prisma.roomType.update({ where: { id: type.id }, data: { name, rate } })
  return NextResponse.json(updated)
}

async function DELETE_handler(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const { hotelId, role, error } = await getSessionOrUnauthorized()
  if (error) return error
  if (!canManageRooms(role!)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const type = await prisma.roomType.findFirst({ where: { id: params.id, hotelId: hotelId! } })
  if (!type) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const inUse = await prisma.room.count({ where: { hotelId: hotelId!, type: type.code } })
  if (inUse > 0) {
    return NextResponse.json(
      { error: `${inUse} room(s) still use ${type.name}. Change their type first.` },
      { status: 400 },
    )
  }
  await prisma.roomType.delete({ where: { id: type.id } })
  return NextResponse.json({ ok: true })
}

export const PUT = audited('roomType.update', PUT_handler)
export const DELETE = audited('roomType.delete', DELETE_handler)
