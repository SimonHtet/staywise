import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { altToBase, formatMoney, rateFor } from '@/lib/currency'
import { audited } from '@/lib/audit'
import { hotelAmountCap } from '@/lib/limits'

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const DEPOSIT_METHODS = ['Cash', 'Bank Transfer', 'Credit Card', 'PromptPay', 'Mobile Pay']

async function POST_handler(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  const { hotelId, role, error } = await getSessionOrUnauthorized()
  if (error) return error

  if (!hasPermission(role!, 'ADD_CHARGE')) {
    return NextResponse.json({ error: 'Forbidden — insufficient permissions' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const { amount, method, date, reference, currency } = body

  if (amount === undefined || !method || !date) {
    return NextResponse.json({ error: 'amount, method, and date are required' }, { status: 400 })
  }
  if (!DEPOSIT_METHODS.includes(method)) {
    return NextResponse.json({ error: 'Invalid deposit method' }, { status: 400 })
  }
  if (!DATE_REGEX.test(date)) {
    return NextResponse.json({ error: 'Date must be in YYYY-MM-DD format' }, { status: 400 })
  }
  if (reference !== undefined && typeof reference === 'string' && reference.length > 100) {
    return NextResponse.json({ error: 'Reference too long (max 100 chars)' }, { status: 400 })
  }

  const parsedAmount = parseFloat(amount)
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 })
  }

  const reservation = await prisma.reservation.findUnique({ where: { id: params.id } })
  if (!reservation) {
    return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
  }
  if (reservation.hotelId !== hotelId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (reservation.status !== 'confirmed' && reservation.status !== 'checked_in') {
    return NextResponse.json({ error: 'Deposits can only be recorded on confirmed or in-house reservations' }, { status: 400 })
  }

  // Convert at the house rate server-side so a stale client rate can't change the amount
  const setting = await prisma.hotelSetting.upsert({
    where: { id: hotelId! },
    update: {},
    create: { id: hotelId! },
  })

  let baseAmount = parsedAmount
  let fxNote = ''
  if (currency) {
    const rate = rateFor(setting, currency)
    if (rate === null) {
      return NextResponse.json({ error: `No exchange rate configured for ${currency} — set it in Settings first` }, { status: 400 })
    }
    if (rate !== 1) {
      baseAmount = altToBase(parsedAmount, rate)
      fxNote = ` (${currency} ${parsedAmount.toLocaleString()} @ ${rate})`
    }
  }

  const { cap, currency: capCur } = await hotelAmountCap(hotelId!)
  if (baseAmount > cap) {
    return NextResponse.json({ error: `Amount exceeds the maximum for one entry (${formatMoney(cap, capCur)})` }, { status: 400 })
  }

  const refNote = reference ? ` ref ${String(reference).trim()}` : ''
  const deposit = await prisma.charge.create({
    data: {
      reservationId: params.id,
      item: `Deposit — ${method}${refNote}${fxNote}`,
      amount: -Math.abs(baseAmount),
      date,
      category: 'DEPOSIT',
    },
  })

  return NextResponse.json(deposit, { status: 201 })
}

export const POST = audited('reservation.deposit', POST_handler)
