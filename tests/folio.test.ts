import { test } from 'node:test'
import assert from 'node:assert/strict'
import { folioBalance, folioTotal, roomProjection, stayNights } from '../lib/folio.ts'

const res = { rate: 1000, checkIn: '2026-10-01', checkOut: '2026-10-04' } // 3 nights
const line = (amount: number, item = 'Minibar', category: string | null = 'F&B') => ({ charge: { amount, item, category } })

test('stayNights is at least one', () => {
  assert.equal(stayNights('2026-10-01', '2026-10-04'), 3)
  assert.equal(stayNights('2026-10-01', '2026-10-01'), 1)
})

test('main folio projects the full stay when night audit never ran', () => {
  const main = { name: 'Main', charges: [line(200)] }
  assert.equal(roomProjection(main, res), 3000)
  assert.equal(folioBalance(main, res), 3200)
})

test('posted nightly room charges are not counted twice', () => {
  const main = {
    name: 'Main',
    charges: [line(1000, 'Room Charge — 2026-10-01', 'ROOM'), line(1000, 'Room Charge — 2026-10-02', 'ROOM')],
  }
  assert.equal(roomProjection(main, res), 1000) // only the last night is still projected
  assert.equal(folioBalance(main, res), 3000)
})

test('payments reduce the balance; extra folios carry no room projection', () => {
  const main = { name: 'Main', charges: [line(-3000, 'Payment — cash', 'PAYMENT')] }
  assert.equal(folioBalance(main, res), 0)
  const extras = { name: 'Company', charges: [line(500)] }
  assert.equal(roomProjection(extras, res), 0)
  assert.equal(folioTotal(extras), 500)
})

test('over-posted room charges never make the projection negative', () => {
  const main = { name: 'main', charges: [line(5000, 'Room Charge — late', 'ROOM')] }
  assert.equal(roomProjection(main, res), 0)
})
