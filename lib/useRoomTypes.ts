'use client'

import { useEffect, useState } from 'react'
import { ROOM_TYPES } from './constants'

export type RoomTypeInfo = { id?: string; code: string; name: string; rate: number }

// Demo room types — used only until the hotel defines its own in Setup
const FALLBACK: RoomTypeInfo[] = Object.entries(ROOM_TYPES).map(([code, t]) => ({ code, name: t.name, rate: t.rate }))

// One fetch per page load, shared by every component that asks
let cache: RoomTypeInfo[] | null = null
let inflight: Promise<RoomTypeInfo[]> | null = null
const listeners = new Set<(t: RoomTypeInfo[]) => void>()

function load(): Promise<RoomTypeInfo[]> {
  if (!inflight) {
    inflight = fetch('/api/room-types')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: RoomTypeInfo[]) => (Array.isArray(rows) && rows.length > 0 ? rows : FALLBACK))
      .catch(() => FALLBACK)
      .then((types) => {
        cache = types
        listeners.forEach((l) => l(types))
        return types
      })
  }
  return inflight
}

/** Call after creating / editing room types so every screen picks it up. */
export function refreshRoomTypes() {
  inflight = null
  return load()
}

export function useRoomTypes() {
  const [types, setTypes] = useState<RoomTypeInfo[]>(cache ?? FALLBACK)
  useEffect(() => {
    listeners.add(setTypes)
    if (cache) setTypes(cache)
    else load()
    return () => {
      listeners.delete(setTypes)
    }
  }, [])

  const byCode = new Map(types.map((t) => [t.code, t]))
  return {
    types,
    nameOf: (code: string) => byCode.get(code)?.name ?? code,
    /** Default nightly rate for a type (0 if unknown) */
    rateOf: (code: string) => byCode.get(code)?.rate ?? 0,
  }
}

/** Nightly rack rate for a room: its own rate if set, else its type's rate. */
export function rackRateFor(room: { rate?: number | null; type: string } | undefined, rateOf: (code: string) => number) {
  if (!room) return 0
  return room.rate && room.rate > 0 ? room.rate : rateOf(room.type)
}
