import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'
import { audited } from '@/lib/audit'

// POST — assign a charge to a folio (moves it from any previous folio)
async function POST_handler(
  req: NextRequest,
  props: { params: Promise<{ id: string; folioId: string }> }
) {
  const params = await props.params
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  const folioId = parseInt(params.folioId, 10)
  if (isNaN(folioId)) return NextResponse.json({ error: 'Invalid folioId' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const { chargeId } = body

  if (!chargeId) return NextResponse.json({ error: 'chargeId is required' }, { status: 400 })

  try {
    const [folio, charge] = await Promise.all([
      prisma.folio.findUnique({
        where: { id: folioId },
        include: { reservation: { select: { hotelId: true } } },
      }),
      prisma.charge.findUnique({ where: { id: chargeId } }),
    ])

    if (!folio || folio.reservation.hotelId !== hotelId || folio.reservationId !== params.id) {
      return NextResponse.json({ error: 'Folio not found' }, { status: 404 })
    }
    if (!charge || charge.reservationId !== params.id) {
      return NextResponse.json({ error: 'Charge not found on this reservation' }, { status: 404 })
    }

    // A settled folio is closed: moving money into or out of it would change
    // what the guest already paid without anyone collecting / refunding it
    if (folio.status === 'settled') {
      return NextResponse.json({ error: `Folio "${folio.name}" is already paid — reopen it before changing its charges` }, { status: 400 })
    }
    const current = await prisma.folioCharge.findUnique({ where: { chargeId }, include: { folio: { select: { status: true, name: true } } } })
    if (current && current.folioId !== folioId && current.folio.status === 'settled') {
      return NextResponse.json({ error: `That charge is on folio "${current.folio.name}", which is already paid` }, { status: 400 })
    }

    // Upsert: move or create the FolioCharge link
    const folioCharge = await prisma.folioCharge.upsert({
      where: { chargeId },
      update: { folioId },
      create: { folioId, chargeId },
    })
    return NextResponse.json(folioCharge)
  } catch (err) {
    console.error('[POST /folios/[folioId]/assign]', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

// DELETE — remove charge from folio (unassign)
async function DELETE_handler(
  req: NextRequest,
  props: { params: Promise<{ id: string; folioId: string }> }
) {
  const params = await props.params
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  const folioId = parseInt(params.folioId, 10)
  if (isNaN(folioId)) return NextResponse.json({ error: 'Invalid folioId' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const { chargeId } = body

  if (!chargeId) return NextResponse.json({ error: 'chargeId is required' }, { status: 400 })

  try {
    const folio = await prisma.folio.findUnique({
      where: { id: folioId },
      include: { reservation: { select: { hotelId: true } } },
    })
    if (!folio || folio.reservation.hotelId !== hotelId || folio.reservationId !== params.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (folio.status === 'settled') {
      return NextResponse.json({ error: `Folio "${folio.name}" is already paid — reopen it before changing its charges` }, { status: 400 })
    }
    await prisma.folioCharge.deleteMany({ where: { folioId, chargeId } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /folios/[folioId]/assign]', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export const POST = audited('reservation.folioAssign', POST_handler)

export const DELETE = audited('reservation.folioUnassign', DELETE_handler)
