'use client'

import { useState, useEffect, useCallback } from 'react'
import { Room } from '@/types'
import { Sparkles, BedDouble, Wrench, Ban, CheckCircle2 } from 'lucide-react'
import { toast } from '@/lib/toast'
import { PageSkeleton } from '@/components/Skeletons'
import { useT, TKey } from '@/lib/i18n'
import { useRoomTypes } from '@/lib/useRoomTypes'

const STATUS_META: Record<string, { label: TKey; dot: string; card: string }> = {
  dirty:       { label: 'status.dirty',       dot: 'bg-amber-500',   card: 'bg-amber-50 border-amber-200' },
  available:   { label: 'status.available',   dot: 'bg-emerald-500', card: 'bg-emerald-50 border-emerald-200' },
  occupied:    { label: 'status.occupied',    dot: 'bg-blue-500',    card: 'bg-blue-50 border-blue-200' },
  maintenance: { label: 'status.maintenance', dot: 'bg-red-500',     card: 'bg-red-50 border-red-200' },
  blocked:     { label: 'status.blocked',     dot: 'bg-gray-400',    card: 'bg-gray-50 border-gray-200' },
}

const SECTION_ORDER = ['dirty', 'occupied', 'available', 'maintenance', 'blocked']

export default function HousekeepingPage() {
  const { t } = useT()
  const { nameOf } = useRoomTypes()
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [cleaningId, setCleaningId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const r = await fetch('/api/rooms')
    if (r.ok) {
      const data = await r.json()
      setRooms(Array.isArray(data) ? data : [])
    }
  }, [])

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])

  async function markClean(room: Room) {
    setCleaningId(room.id)
    try {
      const r = await fetch(`/api/rooms/${room.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'available' }),
      })
      if (!r.ok) {
        const data = await r.json().catch(() => ({}))
        toast(data.error ?? 'Could not update room', 'error')
        return
      }
      toast(t('hk.marked', { room: room.id }))
      await load()
    } finally {
      setCleaningId(null)
    }
  }

  if (loading) return <PageSkeleton />

  const byStatus = SECTION_ORDER.map((status) => ({
    status,
    rooms: rooms.filter((r) => r.status === status).sort((a, b) => a.id.localeCompare(b.id)),
  })).filter((s) => s.rooms.length > 0)

  const dirtyCount = rooms.filter((r) => r.status === 'dirty').length

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" aria-hidden /> {t('hk.title')}
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            {dirtyCount === 0 ? t('hk.allClean') : t('hk.waiting', { n: dirtyCount })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-600">
          {SECTION_ORDER.map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${STATUS_META[s].dot}`} aria-hidden />
              {t(STATUS_META[s].label)}
            </span>
          ))}
        </div>
      </div>

      {byStatus.map(({ status, rooms: sectionRooms }) => (
        <div key={status} className="mb-8">
          <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${STATUS_META[status].dot}`} aria-hidden />
            {t(STATUS_META[status].label)} ({sectionRooms.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {sectionRooms.map((room) => (
              <div
                key={room.id}
                className={`p-3 rounded-xl border ${STATUS_META[status].card} flex flex-col`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-black text-slate-900">{room.id}</span>
                  {status === 'occupied' && <BedDouble className="w-3.5 h-3.5 text-blue-400" />}
                  {status === 'maintenance' && <Wrench className="w-3.5 h-3.5 text-red-400" />}
                  {status === 'blocked' && <Ban className="w-3.5 h-3.5 text-gray-400" />}
                  {status === 'available' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <p className="text-xs text-slate-600 mb-2">
                  {t('hk.floor', { n: room.floor })} · {nameOf(room.type)}
                </p>
                {status === 'dirty' && (
                  <button
                    onClick={() => markClean(room)}
                    disabled={cleaningId === room.id}
                    className="mt-auto w-full min-h-[44px] py-2 bg-amber-700 hover:bg-amber-800 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {cleaningId === room.id ? '…' : (<><Sparkles className="w-4 h-4" aria-hidden /> {t('hk.markClean')}</>)}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
