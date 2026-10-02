import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toCsv } from '../lib/csv.ts'
import { formatMoney, rateFor, altToBase } from '../lib/currency.ts'

test('CSV starts with a BOM and quotes commas / quotes / newlines', () => {
  const csv = toCsv(['Name', 'Note'], [['Aung, Ko', 'said "hi"\nthen left']])
  assert.ok(csv.startsWith('﻿'))
  assert.ok(csv.includes('"Aung, Ko"'))
  assert.ok(csv.includes('"said ""hi""\nthen left"'))
})

test('CSV neutralises formula injection in text but keeps negative numbers', () => {
  const csv = toCsv(['a', 'b', 'c'], [['=HYPERLINK("x")', '+cmd', -250]])
  assert.ok(csv.includes(`"'=HYPERLINK(""x"")"`))
  assert.ok(csv.includes("'+cmd"))
  assert.ok(csv.trimEnd().endsWith(',-250'))
})

test('money formats per currency', () => {
  assert.equal(formatMoney(1500, 'THB'), '฿1,500')
  assert.equal(formatMoney(150000, 'MMK'), 'K150,000')
  assert.equal(formatMoney(12.5, 'USD'), '$12.5')
})

test('house rate conversion', () => {
  const setting = { id: 'H', baseCurrency: 'THB', altCurrency: 'USD', fxRate: 36, fxRates: { MMK: 0.017 } }
  assert.equal(rateFor(setting, 'THB'), 1)
  assert.equal(rateFor(setting, 'USD'), 36)
  assert.equal(rateFor(setting, 'MMK'), 0.017)
  assert.equal(rateFor(setting, 'EUR'), null)
  assert.equal(altToBase(10, 36), 360)
})
