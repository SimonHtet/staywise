import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addDays, dateIn, daysBetween, todayIn, zonedDayRange } from '../lib/dates.ts'

test('business date follows the hotel zone, not UTC', () => {
  // 2026-10-02 01:30 in Bangkok is still 2026-10-01 in UTC
  const instant = new Date('2026-10-01T18:30:00Z')
  assert.equal(todayIn('Asia/Bangkok', instant), '2026-10-02')
  assert.equal(todayIn('Asia/Yangon', instant), '2026-10-02') // 01:00 local
  assert.equal(dateIn(instant, 'UTC'), '2026-10-01')
})

test('Yangon half-hour offset rolls over at 17:30 UTC', () => {
  assert.equal(dateIn(new Date('2026-10-01T17:29:00Z'), 'Asia/Yangon'), '2026-10-01')
  assert.equal(dateIn(new Date('2026-10-01T17:30:00Z'), 'Asia/Yangon'), '2026-10-02')
})

test('unknown zone falls back instead of throwing', () => {
  assert.equal(dateIn(new Date('2026-10-01T18:30:00Z'), 'Not/AZone'), '2026-10-02')
})

test('addDays crosses month and year ends', () => {
  assert.equal(addDays('2026-01-31', 1), '2026-02-01')
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
  assert.equal(addDays('2026-03-01', -1), '2026-02-28')
  assert.equal(addDays('2028-03-01', -1), '2028-02-29')
})

test('daysBetween counts nights', () => {
  assert.equal(daysBetween('2026-10-01', '2026-10-04'), 3)
  assert.equal(daysBetween('2026-10-04', '2026-10-01'), -3)
})

test('zonedDayRange gives local midnight to local midnight', () => {
  const bkk = zonedDayRange('2026-10-02', 'Asia/Bangkok')
  assert.equal(bkk.start.toISOString(), '2026-10-01T17:00:00.000Z')
  assert.equal(bkk.end.toISOString(), '2026-10-02T17:00:00.000Z')
  const ygn = zonedDayRange('2026-10-02', 'Asia/Yangon')
  assert.equal(ygn.start.toISOString(), '2026-10-01T17:30:00.000Z')
  // A payment at 01:00 Bangkok time belongs to that local day
  const payment = new Date('2026-10-01T18:00:00Z')
  assert.ok(payment >= bkk.start && payment < bkk.end)
})
