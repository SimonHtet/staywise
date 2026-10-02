import { prisma } from './prisma'
import { DEFAULT_TIMEZONE, dateIn } from './dates'

// Hotel timezone rarely changes — cache per serverless instance for 5 min
// so date-sensitive routes don't add a query each.
const cache = new Map<string, { tz: string; at: number }>()
const TTL_MS = 5 * 60 * 1000

export async function getHotelTimezone(hotelId: string): Promise<string> {
  const hit = cache.get(hotelId)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.tz
  let tz = DEFAULT_TIMEZONE
  try {
    const hotel = await prisma.hotel.findUnique({ where: { id: hotelId }, select: { timezone: true } })
    if (hotel?.timezone) tz = hotel.timezone
  } catch (err) {
    console.error('[hoteltime] timezone lookup failed:', err)
  }
  cache.set(hotelId, { tz, at: Date.now() })
  return tz
}

export function clearHotelTimezoneCache(hotelId: string) {
  cache.delete(hotelId)
}

/** Today's business date for the hotel. */
export async function hotelToday(hotelId: string): Promise<string> {
  return dateIn(new Date(), await getHotelTimezone(hotelId))
}

// Night audit closes the day that just ended: an audit run at 01:00 still
// belongs to yesterday. Before this hour (hotel time) we use the previous date.
const AUDIT_ROLLOVER_HOUR = 6

/** The business date the night audit should close right now. */
export async function hotelAuditDate(hotelId: string): Promise<string> {
  const tz = await getHotelTimezone(hotelId)
  return dateIn(new Date(Date.now() - AUDIT_ROLLOVER_HOUR * 3600000), tz)
}
