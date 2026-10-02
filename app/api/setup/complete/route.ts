import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { audited } from '@/lib/audit'

// POST /api/setup/complete — admin finishes the setup wizard
async function POST_handler() {
  const { hotelId, role, error } = await getSessionOrUnauthorized()
  if (error) return error
  if (!hasPermission(role!, 'MANAGE_USERS')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [types, rooms] = await Promise.all([
    prisma.roomType.count({ where: { hotelId: hotelId! } }),
    prisma.room.count({ where: { hotelId: hotelId! } }),
  ])
  if (types === 0 || rooms === 0) {
    return NextResponse.json({ error: 'Add at least one room type and one room before finishing' }, { status: 400 })
  }
  await prisma.hotel.update({ where: { id: hotelId! }, data: { setupCompletedAt: new Date() } })
  return NextResponse.json({ ok: true })
}

export const POST = audited('hotel.setupComplete', POST_handler)
