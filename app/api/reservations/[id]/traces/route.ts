import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'
import { audited } from '@/lib/audit'

async function POST_handler(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  const body = await req.json().catch(() => ({}))
  const { text, date, department } = body

  if (!text || !date) {
    return NextResponse.json({ error: 'text and date are required' }, { status: 400 })
  }

  try {
    const reservation = await prisma.reservation.findUnique({ where: { id: params.id } })
    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    if (reservation.hotelId !== hotelId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const trace = await prisma.trace.create({
      data: {
        reservationId: params.id,
        text,
        date,
        status: 'pending',
        department: department || 'FRONT OFFICE',
      },
    })

    return NextResponse.json(trace, { status: 201 })
  } catch (err) {
    console.error('[POST /api/reservations/[id]/traces] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

async function PUT_handler(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  const body = await req.json().catch(() => ({}))
  const { traceId } = body

  if (!traceId) {
    return NextResponse.json({ error: 'traceId is required' }, { status: 400 })
  }

  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: params.id },
      select: { hotelId: true },
    })

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    if (reservation.hotelId !== hotelId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const trace = await prisma.trace.update({
      where: { id: parseInt(traceId) },
      data: { status: 'resolved' },
    })

    return NextResponse.json(trace)
  } catch (err) {
    console.error('[PUT /api/reservations/[id]/traces] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export const POST = audited('reservation.traceAdd', POST_handler)

export const PUT = audited('reservation.traceUpdate', PUT_handler)
