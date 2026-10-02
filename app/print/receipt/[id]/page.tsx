import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatMoney } from '@/lib/currency'
import { folioBalance, roomProjection, stayNights } from '@/lib/folio'
import { getHotelTimezone } from '@/lib/hoteltime'
import ReceiptControls from './ReceiptControls'

const METHOD_LABELS: Record<string, string> = {
  cash: 'cash',
  card: 'card',
  credit_card: 'card',
  transfer: 'bank transfer',
  bank_transfer: 'bank transfer',
  promptpay: 'PromptPay',
  company_credit: 'company account',
  city_ledger: 'company account',
  master: 'billed to master room',
}

// 80 mm thermal receipt — the format small hotels hand to guests at check-out.
// Everything is one narrow column; no colour, no images except the logo.
export default async function ReceiptPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const hotelId = (session.user as any).hotelId as string | undefined
  if (!hotelId) redirect('/login')

  const [reservation, hotel, setting, tz] = await Promise.all([
    prisma.reservation.findFirst({
      where: { id: params.id, hotelId },
      include: {
        folios: {
          include: { charges: { include: { charge: true }, orderBy: { id: 'asc' } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
    prisma.hotel.findUnique({ where: { id: hotelId } }),
    prisma.hotelSetting.findUnique({ where: { id: hotelId } }),
    getHotelTimezone(hotelId),
  ])
  if (!reservation) redirect('/reservations')

  const cur = setting?.baseCurrency ?? 'THB'
  const money = (n: number) => formatMoney(n, cur)
  const n = stayNights(reservation.checkIn, reservation.checkOut)
  const printedAt = new Date().toLocaleString('en-GB', {
    timeZone: tz,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  // Charges (positive) and payments (negative) across all folios
  const lines: { label: string; amount: number }[] = []
  for (const f of reservation.folios) {
    const proj = roomProjection(f, reservation)
    if (proj > 0) {
      // Projection = nights the night audit hasn't posted yet (all of them if it never ran)
      const pending = reservation.rate > 0 ? Math.round(proj / reservation.rate) : n
      const label = pending === n ? `${n} night(s)` : `${pending} more night(s)`
      lines.push({ label: `Room ${reservation.roomId} · ${label} × ${money(reservation.rate)}`, amount: proj })
    }
    for (const fc of f.charges) lines.push({ label: fc.charge.item, amount: fc.charge.amount })
  }
  const charges = lines.filter((l) => l.amount > 0)
  // Payments / deposits are negative charge lines; settling a folio records the
  // method on the folio instead, so a settled folio's remaining balance counts as paid.
  const payments = lines.filter((l) => l.amount < 0).map((l) => ({ ...l, amount: -l.amount }))
  let balance = 0
  for (const f of reservation.folios) {
    const owed = folioBalance(f, reservation)
    if (f.status === 'settled') {
      if (owed > 0.005) payments.push({ label: `Paid — ${METHOD_LABELS[f.paymentMethod ?? ''] ?? f.paymentMethod ?? 'settled'}`, amount: owed })
    } else {
      balance += owed
    }
  }
  const totalCharges = charges.reduce((s, l) => s + l.amount, 0)
  const totalPaid = payments.reduce((s, l) => s + l.amount, 0)

  return (
    <>
      <style>{`
        @page { size: 80mm auto; margin: 3mm; }
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .receipt { box-shadow: none !important; margin: 0 !important; }
        }
        .receipt { font-family: ui-monospace, 'Courier New', monospace; }
      `}</style>

      <ReceiptControls resNumber={reservation.reservationNumber} />

      <div className="min-h-screen bg-slate-100 py-6 print:bg-white print:py-0">
        <div className="receipt mx-auto w-[74mm] bg-white p-3 text-[11px] leading-snug text-black shadow">
          <div className="text-center">
            {hotel?.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hotel.logoUrl} alt="" className="mx-auto mb-1 h-12 w-12 object-contain grayscale" />
            )}
            <p className="text-sm font-bold">{hotel?.name}</p>
            {hotel?.address && <p>{hotel.address}</p>}
            {hotel?.location && <p>{hotel.location}</p>}
            {hotel?.phone && <p>Tel {hotel.phone}</p>}
            {hotel?.taxId && <p>Tax ID {hotel.taxId}</p>}
          </div>

          <p className="my-2 border-t border-dashed border-black" />
          <p className="text-center font-bold">RECEIPT</p>
          <p className="my-2 border-t border-dashed border-black" />

          <dl className="grid grid-cols-[auto_1fr] gap-x-2">
            <dt>No.</dt>
            <dd className="text-right">{reservation.reservationNumber}</dd>
            <dt>Guest</dt>
            <dd className="text-right">{reservation.guestName}</dd>
            <dt>Room</dt>
            <dd className="text-right">{reservation.roomId}</dd>
            <dt>Stay</dt>
            <dd className="text-right">
              {reservation.checkIn} → {reservation.checkOut}
            </dd>
          </dl>

          <p className="my-2 border-t border-dashed border-black" />

          {charges.map((l, i) => (
            <div key={`c${i}`} className="flex justify-between gap-2">
              <span className="break-words">{l.label}</span>
              <span className="whitespace-nowrap tabular-nums">{money(l.amount)}</span>
            </div>
          ))}
          <div className="mt-1 flex justify-between font-bold">
            <span>Total</span>
            <span className="tabular-nums">{money(totalCharges)}</span>
          </div>

          {payments.length > 0 && (
            <>
              <p className="my-2 border-t border-dashed border-black" />
              {payments.map((l, i) => (
                <div key={`p${i}`} className="flex justify-between gap-2">
                  <span className="break-words">{l.label}</span>
                  <span className="whitespace-nowrap tabular-nums">{money(l.amount)}</span>
                </div>
              ))}
              <div className="mt-1 flex justify-between font-bold">
                <span>Paid</span>
                <span className="tabular-nums">{money(totalPaid)}</span>
              </div>
            </>
          )}

          <p className="my-2 border-t border-dashed border-black" />
          <div className="flex justify-between text-sm font-bold">
            <span>{balance > 0.005 ? 'Balance due' : 'Balance'}</span>
            <span className="tabular-nums">{money(Math.max(0, balance))}</span>
          </div>

          <p className="my-2 border-t border-dashed border-black" />
          <p className="text-center">Thank you for staying with us</p>
          <p className="mt-1 text-center text-[10px]">{printedAt}</p>
        </div>
      </div>
    </>
  )
}
