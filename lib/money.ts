import { currencySymbol } from './currency'

// The hotel's main currency for client screens. DashboardShell sets it from
// the server layout before any page renders, so cur() is right on first paint.
let baseCode = 'THB'

export function setBaseCurrency(code: string | null | undefined) {
  if (code) baseCode = code
}

export function baseCurrency(): string {
  return baseCode
}

/** Symbol for the hotel's main currency, e.g. ฿, K, $ */
export function cur(): string {
  return currencySymbol(baseCode).trim()
}
