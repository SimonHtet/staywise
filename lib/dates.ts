// Calendar-date helpers. Business dates are 'YYYY-MM-DD' strings in the
// HOTEL's timezone — never derive them with toISOString(), which is UTC and
// rolls the date over at 07:00 in Bangkok / 06:30 in Yangon.
// Pure + isomorphic: safe in API routes, server components and the browser.

export const DEFAULT_TIMEZONE = 'Asia/Bangkok'

/** 'YYYY-MM-DD' for an instant as seen in `timeZone` (browser zone if omitted). */
export function dateIn(instant: Date, timeZone?: string): string {
  try {
    // en-CA formats as YYYY-MM-DD
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(instant)
  } catch {
    // Unknown zone string — fall back rather than crash a checkout
    return dateIn(instant, DEFAULT_TIMEZONE)
  }
}

/** Today's business date in `timeZone` (browser zone if omitted). */
export function todayIn(timeZone?: string, now: Date = new Date()): string {
  return dateIn(now, timeZone)
}

/** Shift a 'YYYY-MM-DD' by whole days. Uses UTC noon so DST can't skip a day. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Whole nights between two 'YYYY-MM-DD' dates (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86400000,
  )
}

/** Milliseconds `timeZone` is ahead of UTC at `instant` (Bangkok → +7h). */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000
}

/**
 * The real instants bounding a hotel calendar day: [start, end) where start is
 * local midnight of `date` and end is local midnight of the next day. Use for
 * timestamp columns (settledAt, createdAt) so a 01:00 payment lands on its
 * local day instead of the previous UTC one.
 */
export function zonedDayRange(date: string, timeZone: string): { start: Date; end: Date } {
  const startOf = (d: string) => {
    const guess = new Date(`${d}T00:00:00Z`)
    return new Date(guess.getTime() - zoneOffsetMs(guess, timeZone))
  }
  return { start: startOf(date), end: startOf(addDays(date, 1)) }
}
