import { prisma } from './prisma'

// Sanity caps on a single amount, sized per currency. They were a flat
// 500,000 — fine in baht (~US$14k) but only ~US$240 in kyat, which blocked
// ordinary room bills for a hotel running in MMK.
const SINGLE_AMOUNT_CAP: Record<string, number> = {
  THB: 500_000,
  MMK: 50_000_000,
  USD: 15_000,
  EUR: 15_000,
  SGD: 20_000,
  CNY: 100_000,
}

export function amountCap(currency: string): number {
  return SINGLE_AMOUNT_CAP[currency] ?? SINGLE_AMOUNT_CAP.THB
}

/** Cap for one charge / payment / deposit / cash float in the hotel's main currency. */
export async function hotelAmountCap(hotelId: string): Promise<{ cap: number; currency: string }> {
  const setting = await prisma.hotelSetting
    .findUnique({ where: { id: hotelId }, select: { baseCurrency: true } })
    .catch(() => null)
  const currency = setting?.baseCurrency ?? 'THB'
  return { cap: amountCap(currency), currency }
}
