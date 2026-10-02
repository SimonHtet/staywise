import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { writeAudit } from '@/lib/audit'
import { toCsv } from '@/lib/csv'
import { addDays, dateIn, zonedDayRange } from '@/lib/dates'
import { getHotelTimezone, hotelToday } from '@/lib/hoteltime'
import { folioBalance } from '@/lib/folio'

const DATE = /^\d{4}-\d{2}-\d{2}$/
const MAX_ROWS = 20000

// GET /api/export/{reservations|guests|revenue|receivables}?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: NextRequest, props: { params: Promise<{ kind: string }> }) {
  const params = await props.params
  const { session, hotelId, role, error } = await getSessionOrUnauthorized()
  if (error) return error
  if (!hasPermission(role!, 'VIEW_FINANCIALS')) {
    return NextResponse.json({ error: 'Only managers can export data' }, { status: 403 })
  }

  const sp = new URL(req.url).searchParams
  const today = await hotelToday(hotelId!)
  const to = DATE.test(sp.get('to') ?? '') ? sp.get('to')! : today
  const from = DATE.test(sp.get('from') ?? '') ? sp.get('from')! : addDays(to, -30)
  if (from > to) return NextResponse.json({ error: '"From" must be before "to"' }, { status: 400 })
  const tz = await getHotelTimezone(hotelId!)

  let csv: string
  let count: number
  try {
    switch (params.kind) {
      case 'reservations': {
        // Stays overlapping the range
        const rows = await prisma.reservation.findMany({
          where: { hotelId: hotelId!, checkIn: { lte: to }, checkOut: { gte: from } },
          include: { company: { select: { name: true } } },
          orderBy: { checkIn: 'asc' },
          take: MAX_ROWS,
        })
        count = rows.length
        csv = toCsv(
          ['Reservation', 'Status', 'Guest', 'Nationality', 'Room', 'Room type', 'Check-in', 'Check-out', 'Nights', 'Rate', 'Total', 'Adults', 'Children', 'Source', 'Company', 'Booking ref'],
          rows.map((r) => [r.reservationNumber, r.status, r.guestName, r.nationality, r.roomId, r.roomTypeId, r.checkIn, r.checkOut, r.totalNights, r.rate, r.totalAmount, r.adults, r.children, r.source, r.company?.name, r.bookingReference]),
        )
        break
      }
      case 'guests': {
        // Passport numbers deliberately left out (PDPA) — use the app for those
        const rows = await prisma.guest.findMany({
          where: { hotelId: hotelId! },
          include: { _count: { select: { reservations: true } } },
          orderBy: { name: 'asc' },
          take: MAX_ROWS,
        })
        count = rows.length
        csv = toCsv(
          ['Name', 'Nationality', 'Email', 'Phone', 'City', 'Country', 'Company', 'VIP', 'Stays', 'First seen'],
          rows.map((g) => [g.name, g.nationality, g.email, g.phone, g.city, g.country, g.company, g.vipStatus, g._count.reservations, dateIn(g.createdAt, tz)]),
        )
        break
      }
      case 'revenue': {
        // Folios settled in the range, by hotel-local settlement date
        const start = zonedDayRange(from, tz).start
        const end = zonedDayRange(to, tz).end
        const folios = await prisma.folio.findMany({
          where: { status: 'settled', settledAt: { gte: start, lt: end }, reservation: { hotelId: hotelId! } },
          include: {
            reservation: { select: { reservationNumber: true, guestName: true, roomId: true, rate: true, checkIn: true, checkOut: true } },
            charges: { include: { charge: { select: { amount: true, category: true, item: true } } } },
          },
          orderBy: { settledAt: 'asc' },
          take: MAX_ROWS,
        })
        count = folios.length
        csv = toCsv(
          ['Settled date', 'Reservation', 'Guest', 'Room', 'Folio', 'Payment method', 'Amount'],
          folios.map((f) => [
            dateIn(f.settledAt!, tz),
            f.reservation.reservationNumber,
            f.reservation.guestName,
            f.reservation.roomId,
            f.name,
            f.paymentMethod,
            Math.round(folioBalance(f, f.reservation) * 100) / 100,
          ]),
        )
        break
      }
      case 'receivables': {
        const txs = await prisma.creditTransaction.findMany({
          where: { hotelId: hotelId!, status: 'unpaid', amount: { gt: 0 } },
          include: { company: { select: { name: true } } },
          orderBy: { createdAt: 'asc' },
          take: MAX_ROWS,
        })
        count = txs.length
        const now = Date.now()
        csv = toCsv(
          ['Company', 'Posted', 'Days outstanding', 'Type', 'Description', 'Amount'],
          txs.map((t) => [t.company.name, dateIn(t.createdAt, tz), Math.floor((now - t.createdAt.getTime()) / 86400000), t.type, t.description, t.amount]),
        )
        break
      }
      default:
        return NextResponse.json({ error: 'Unknown export' }, { status: 404 })
    }
  } catch (err) {
    console.error(`[GET /api/export/${params.kind}] DB error:`, err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  const user = session!.user as any
  await writeAudit({
    hotelId: hotelId!,
    userId: user.id,
    userName: user.name ?? user.email,
    action: 'data.export',
    entity: 'export',
    entityId: params.kind,
    details: { from, to, rows: count },
  })

  const filename = params.kind === 'guests' || params.kind === 'receivables'
    ? `staywise-${params.kind}-${today}.csv`
    : `staywise-${params.kind}-${from}-to-${to}.csv`
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
