'use client'

// Counts in-flight /api requests app-wide so one indicator can cover every
// slow action (checkout, night audit, reports…) without touching each screen.
type Listener = (inflight: number) => void

let inflight = 0
const listeners = new Set<Listener>()
let installed = false

function emit() {
  listeners.forEach((l) => l(inflight))
}

export function installFetchTracker() {
  if (installed || typeof window === 'undefined') return
  installed = true
  const original = window.fetch.bind(window)
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    // Only our API — not NextAuth's session polling or Next's RSC prefetches
    const tracked = url.includes('/api/') && !url.includes('/api/auth/')
    if (!tracked) return original(input, init)
    inflight++
    emit()
    try {
      return await original(input, init)
    } finally {
      inflight--
      emit()
    }
  }
}

export function subscribeActivity(listener: Listener): () => void {
  listeners.add(listener)
  listener(inflight)
  return () => {
    listeners.delete(listener)
  }
}
