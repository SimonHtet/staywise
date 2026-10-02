'use client'

import { useCallback, useEffect, useState } from 'react'
import { History, ChevronDown, ChevronRight } from 'lucide-react'

type Row = {
  id: number
  userName: string | null
  action: string
  entity: string
  entityId: string | null
  details: Record<string, unknown>
  createdAt: string
}

// Plain-language names for the actions recorded by lib/audit.ts
const ACTION_LABELS: Record<string, string> = {
  'user.login': 'Signed in',
  'user.create': 'Added staff login',
  'user.update': 'Changed staff login',
  'user.delete': 'Deleted staff login',
  'user.passwordChange': 'Changed own password',
  'reservation.create': 'Created booking',
  'reservation.update': 'Edited booking',
  'reservation.checkin': 'Checked in',
  'reservation.checkout': 'Checked out',
  'reservation.undoCheckout': 'Undid check-out',
  'reservation.cancel': 'Cancelled booking',
  'reservation.noShow': 'Marked no-show',
  'reservation.move': 'Moved room',
  'reservation.extend': 'Extended stay',
  'reservation.shorten': 'Shortened stay',
  'reservation.chargeAdd': 'Added charge',
  'reservation.payment': 'Took payment',
  'reservation.deposit': 'Took deposit',
  'reservation.billToMaster': 'Billed to master room',
  'reservation.folioAssign': 'Moved charge to folio',
  'reservation.folioUnassign': 'Removed charge from folio',
  'reservation.folioUpdate': 'Settled / edited folio',
  'reservation.packageRemove': 'Removed package',
  'room.update': 'Changed room',
  'room.bulkCreate': 'Added rooms',
  'roomType.create': 'Added room type',
  'roomType.update': 'Changed room type',
  'roomType.delete': 'Deleted room type',
  'nightAudit.run': 'Ran night audit',
  'shift.open': 'Opened shift',
  'shift.close': 'Closed shift',
  'company.creditCharge': 'Posted to company account',
  'company.creditSettle': 'Settled company account',
  'company.creditOverride': 'Overrode credit limit',
  'taxInvoice.create': 'Issued tax invoice',
  'taxInvoice.update': 'Changed tax invoice',
  'taxInvoice.delete': 'Voided / deleted tax invoice',
  'settings.update': 'Changed currency settings',
  'hotel.update': 'Changed hotel details',
  'hotel.setupComplete': 'Finished hotel setup',
}

const FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Everything' },
  { value: 'reservation', label: 'Bookings & money' },
  { value: 'room', label: 'Rooms' },
  { value: 'user', label: 'Staff & sign-ins' },
  { value: 'company', label: 'Company accounts' },
  { value: 'nightAudit', label: 'Night audit' },
  { value: 'shift', label: 'Shifts' },
]

export default function AuditLogSection() {
  const [rows, setRows] = useState<Row[]>([])
  const [nextBefore, setNextBefore] = useState<number | null>(null)
  const [entity, setEntity] = useState('')
  const [user, setUser] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState<number | null>(null)

  const load = useCallback(
    async (before?: number) => {
      setLoading(true)
      setError('')
      const qs = new URLSearchParams()
      if (entity) qs.set('entity', entity)
      if (user.trim()) qs.set('user', user.trim())
      if (before) qs.set('before', String(before))
      try {
        const res = await fetch(`/api/audit?${qs}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setRows((prev) => (before ? [...prev, ...data.rows] : data.rows))
        setNextBefore(data.nextBefore)
      } catch (e: any) {
        setError(e?.message || 'Could not load the activity log')
      }
      setLoading(false)
    },
    [entity, user],
  )

  useEffect(() => {
    const id = setTimeout(() => load(), 250) // debounce the name filter
    return () => clearTimeout(id)
  }, [load])

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" aria-hidden /> Activity log
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">Who changed what, newest first. Passwords and passport numbers are never stored here.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="audit-filter">Show</label>
          <select
            id="audit-filter"
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            {FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="audit-user">Staff name</label>
          <input
            id="audit-user"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            placeholder="Staff name"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-36"
          />
        </div>
      </div>

      {error && <p className="px-6 py-4 text-sm text-red-600" role="alert">{error}</p>}

      {!error && rows.length === 0 && !loading && (
        <p className="px-6 py-10 text-center text-sm text-slate-500">
          Nothing recorded yet. Actions appear here as soon as staff start using the system.
        </p>
      )}

      <ul className="divide-y divide-slate-100">
        {rows.map((r) => {
          const expanded = open === r.id
          const hasDetails = r.details && Object.keys(r.details).length > 0
          return (
            <li key={r.id}>
              <button
                onClick={() => setOpen(expanded ? null : r.id)}
                disabled={!hasDetails}
                aria-expanded={hasDetails ? expanded : undefined}
                className="w-full grid grid-cols-[1fr_auto] sm:grid-cols-[10rem_1fr_auto] items-center gap-x-4 gap-y-0.5 px-4 sm:px-6 py-3 text-left text-sm hover:bg-slate-50 disabled:hover:bg-transparent disabled:cursor-default"
              >
                <span className="text-xs text-slate-500 tabular-nums sm:text-sm">
                  {new Date(r.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="col-start-1 sm:col-start-2 text-slate-800">
                  <span className="font-semibold">{r.userName ?? 'System'}</span> · {ACTION_LABELS[r.action] ?? r.action}
                  {r.entityId && <span className="text-slate-500"> · {r.entityId}</span>}
                </span>
                <span className="row-span-2 sm:row-span-1 col-start-2 sm:col-start-3 row-start-1 text-slate-400">
                  {hasDetails && (expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
                </span>
              </button>
              {expanded && (
                <pre className="mx-4 sm:mx-6 mb-3 overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                  {JSON.stringify(r.details, null, 2)}
                </pre>
              )}
            </li>
          )
        })}
      </ul>

      {loading && <p className="px-6 py-4 text-sm text-slate-500" role="status">Loading…</p>}
      {nextBefore && !loading && (
        <div className="px-6 py-3 border-t border-slate-100">
          <button onClick={() => load(nextBefore)} className="text-sm font-semibold text-sky-700 hover:text-sky-900">
            Show older
          </button>
        </div>
      )}
    </div>
  )
}
