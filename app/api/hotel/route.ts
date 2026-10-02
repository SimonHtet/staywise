import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { audited } from '@/lib/audit'
import { clearHotelTimezoneCache } from '@/lib/hoteltime'

const TEXT_FIELDS = ['name', 'location', 'address', 'phone', 'email', 'taxId', 'logoUrl'] as const

function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

// GET /api/hotel — profile shown in the header, receipts and the setup wizard
export async function GET() {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error
  const hotel = await prisma.hotel.findUnique({ where: { id: hotelId! } })
  if (!hotel) return NextResponse.json({ error: 'Hotel not found' }, { status: 404 })
  return NextResponse.json(hotel)
}

async function PUT_handler(req: NextRequest) {
  const { hotelId, role, error } = await getSessionOrUnauthorized()
  if (error) return error
  if (!hasPermission(role!, 'MANAGE_USERS')) {
    return NextResponse.json({ error: 'Only an admin can change hotel details' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const data: Record<string, string | null> = {}
  for (const f of TEXT_FIELDS) {
    if (body[f] === undefined) continue
    if (body[f] !== null && typeof body[f] !== 'string') {
      return NextResponse.json({ error: `${f} must be text` }, { status: 400 })
    }
    const v = (body[f] ?? '').trim().slice(0, f === 'logoUrl' ? 500 : 200)
    data[f] = v || null
  }
  if (data.name === null) return NextResponse.json({ error: 'Hotel name is required' }, { status: 400 })
  if (data.location === null) data.location = ''
  if (data.logoUrl && !/^https:\/\//i.test(data.logoUrl)) {
    return NextResponse.json({ error: 'Logo link must start with https://' }, { status: 400 })
  }
  if (body.timezone !== undefined) {
    if (typeof body.timezone !== 'string' || !isValidTimezone(body.timezone)) {
      return NextResponse.json({ error: 'Choose a valid timezone' }, { status: 400 })
    }
    data.timezone = body.timezone
  }

  const hotel = await prisma.hotel.update({ where: { id: hotelId! }, data: data as any })
  clearHotelTimezoneCache(hotelId!)
  return NextResponse.json(hotel)
}

export const PUT = audited('hotel.update', PUT_handler)
