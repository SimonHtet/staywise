// Folio arithmetic shared by the A4 folio print, the 80 mm receipt and tests.
// Keep this pure — no Prisma, no Date.now().

type ChargeLike = { amount: number; category: string | null; item: string }
type FolioLike = { name: string; charges: { charge: ChargeLike }[] }

/** Nights between two 'YYYY-MM-DD' dates, minimum 1. */
export function stayNights(checkIn: string, checkOut: string): number {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  return Math.max(1, Math.round(diff / 86400000))
}

/** Sum of the charges assigned to a folio (payments are negative). */
export function folioTotal(folio: { charges: { charge: { amount: number } }[] }): number {
  return folio.charges.reduce((sum, fc) => sum + fc.charge.amount, 0)
}

/**
 * Same formula as the check-out modal: the Main folio carries the projected
 * room cost minus nightly room charges already posted by night audit —
 * otherwise a stay where the audit never ran prints with no room fees.
 */
export function roomProjection(folio: FolioLike, reservation: { rate: number; checkIn: string; checkOut: string }): number {
  if (folio.name.toLowerCase() !== 'main') return 0
  const roomPosted = folio.charges
    .filter((fc) => fc.charge.category === 'ROOM' && fc.charge.item.startsWith('Room Charge —'))
    .reduce((s, fc) => s + fc.charge.amount, 0)
  return Math.max(0, reservation.rate * stayNights(reservation.checkIn, reservation.checkOut) - roomPosted)
}

/** What the guest owes on one folio after projection. */
export function folioBalance(folio: FolioLike, reservation: { rate: number; checkIn: string; checkOut: string }): number {
  return folioTotal(folio) + roomProjection(folio, reservation)
}
