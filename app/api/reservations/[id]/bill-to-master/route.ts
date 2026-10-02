import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { calculateNights } from '@/lib/utils'
import { hotelToday } from '@/lib/hoteltime'
import { audited } from '@/lib/audit'

// POST — transfer this linked reservation's outstanding balance to its master
// reservation's bill. Each open folio gets an offsetting "Billed to master"
// line (netting it to zero) and the master's Main folio receives one matching
// charge, so group totals settle on the master room and nothing is counted twice.
async function POST_handler(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  const { hotelId, role, error } = await getSessionOrUnauthorized()
  if (error) return error
  if (!hasPermission(role!, 'ADD_CHARGE')) {
    return NextResponse.json({ error: 'Forbidden — insufficient permissions' }, { status: 403 })
  }

  try {
    const reservation = await prisma.reservation.findFirst({
      where: { id: params.id, hotelId: hotelId! },
      include: { folios: { include: { charges: { include: { charge: true } } } } },
    })
    if (!reservation) return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    if (!reservation.masterResId) {
      return NextResponse.json({ error: 'This reservation is not linked to a master' }, { status: 400 })
    }

    const master = await prisma.reservation.findFirst({
      where: { id: reservation.masterResId, hotelId: hotelId! },
      select: { id: true, reservationNumber: true, status: true },
    })
    if (!master) return NextResponse.json({ error: 'Master reservation not found' }, { status: 404 })
    if (master.status === 'checked_out' || master.status === 'cancelled' || master.status === 'no_show') {
      return NextResponse.json({ error: 'Master reservation is no longer active' }, { status: 400 })
    }

    // Make sure this reservation has a Main folio with all charges assigned
    let folios = reservation.folios
    if (!folios.some((f) => f.name === 'Main')) {
      await prisma.folio.create({ data: { reservationId: params.id, name: 'Main' } })
      folios = await prisma.folio.findMany({
        where: { reservationId: params.id },
        include: { charges: { include: { charge: true } } },
      })
    }
    const mainFolio = folios.find((f) => f.name === 'Main')!
    const unassigned = await prisma.charge.findMany({
      where: { reservationId: params.id, folioCharge: null },
      select: { id: true },
    })
    if (unassigned.length > 0) {
      await prisma.folioCharge.createMany({
        data: unassigned.map((c) => ({ folioId: mainFolio.id, chargeId: c.id })),
        skipDuplicates: true,
      })
      folios = await prisma.folio.findMany({
        where: { reservationId: params.id },
        include: { charges: { include: { charge: true } } },
      })
    }

    // Balance per open folio — same formula as the check-out modal
    const folioBalance = (folio: (typeof folios)[number]) => {
      const chargesSum = folio.charges.reduce((s, fc) => s + fc.charge.amount, 0)
      if (folio.name.toLowerCase() !== 'main') return chargesSum
      const roomPosted = folio.charges
        .filter((fc) => fc.charge.category === 'ROOM' && fc.charge.item.startsWith('Room Charge —'))
        .reduce((s, fc) => s + fc.charge.amount, 0)
      const projection = Math.max(
        0,
        reservation.rate * calculateNights(reservation.checkIn, reservation.checkOut) - roomPosted
      )
      return chargesSum + projection
    }

    const openFolios = folios.filter((f) => f.status !== 'settled')
    const transfers = openFolios
      .map((f) => ({ folio: f, balance: folioBalance(f) }))
      .filter((t) => t.balance !== 0)
    const totalTransfer = transfers.reduce((s, t) => s + t.balance, 0)

    if (openFolios.length === 0) {
      return NextResponse.json({ error: 'All folios are already settled' }, { status: 400 })
    }
    if (totalTransfer <= 0 && transfers.length === 0) {
      // Nothing owed — just settle the open folios to the master
      await prisma.folio.updateMany({
        where: { id: { in: openFolios.map((f) => f.id) } },
        data: { status: 'settled', paymentMethod: 'master', settledAt: new Date() },
      })
      return NextResponse.json({ transferred: 0, masterResNumber: master.reservationNumber })
    }

    // The group charge must land on an OPEN master folio. If the master has
    // already paid its Main folio, posting there would mark the linked room's
    // money as paid and let the master check out without collecting it —
    // use (or open) a separate "Group billing" folio instead.
    let masterMain = await prisma.folio.findFirst({
      where: { reservationId: master.id, name: 'Main', status: { not: 'settled' } },
      select: { id: true },
    })
    if (!masterMain) {
      masterMain =
        (await prisma.folio.findFirst({
          where: { reservationId: master.id, name: 'Group billing', status: { not: 'settled' } },
          select: { id: true },
        })) ??
        (await prisma.folio.create({
          data: {
            reservationId: master.id,
            name: (await prisma.folio.count({ where: { reservationId: master.id, name: 'Main' } })) ? 'Group billing' : 'Main',
          },
          select: { id: true },
        }))
    }

    const today = await hotelToday(hotelId!)

    await prisma.$transaction(async (tx) => {
      // Offset each open folio so it nets to zero
      for (const t of transfers) {
        const offset = await tx.charge.create({
          data: {
            reservationId: params.id,
            item: `Billed to master ${master.reservationNumber}`,
            amount: -t.balance,
            date: today,
            category: 'TRANSFER',
          },
        })
        await tx.folioCharge.create({ data: { folioId: t.folio.id, chargeId: offset.id } })
      }

      // One matching line on the master's bill
      const masterCharge = await tx.charge.create({
        data: {
          reservationId: master.id,
          item: `Room ${reservation.roomId} — ${reservation.guestName} (${reservation.reservationNumber})`,
          amount: totalTransfer,
          date: today,
          category: 'TRANSFER',
        },
      })
      await tx.folioCharge.create({ data: { folioId: masterMain!.id, chargeId: masterCharge.id } })

      // The linked folios are now settled — paid via the master bill
      await tx.folio.updateMany({
        where: { id: { in: openFolios.map((f) => f.id) } },
        data: { status: 'settled', paymentMethod: 'master', settledAt: new Date() },
      })
    })

    return NextResponse.json({
      transferred: totalTransfer,
      masterResNumber: master.reservationNumber,
    })
  } catch (err) {
    console.error('[POST /api/reservations/[id]/bill-to-master] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export const POST = audited('reservation.billToMaster', POST_handler)
