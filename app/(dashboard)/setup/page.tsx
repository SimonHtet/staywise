'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Check, Plus, Trash2, Building, BedDouble, DoorOpen, Users } from 'lucide-react'
import { toast } from '@/lib/toast'
import { refreshRoomTypes } from '@/lib/useRoomTypes'
import { PageSkeleton } from '@/components/Skeletons'

const inputCls =
  'w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent'
const labelCls = 'block text-sm font-medium text-slate-700 mb-1'
const primaryBtn =
  'inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed'
const secondaryBtn =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold disabled:opacity-50'

const TIMEZONES = [
  { id: 'Asia/Bangkok', label: 'Thailand (Bangkok, UTC+7)' },
  { id: 'Asia/Yangon', label: 'Myanmar (Yangon, UTC+6:30)' },
  { id: 'Asia/Ho_Chi_Minh', label: 'Vietnam (UTC+7)' },
  { id: 'Asia/Phnom_Penh', label: 'Cambodia (UTC+7)' },
  { id: 'Asia/Vientiane', label: 'Laos (UTC+7)' },
  { id: 'Asia/Singapore', label: 'Singapore / Malaysia (UTC+8)' },
]
const CURRENCIES = ['THB', 'MMK', 'USD', 'EUR', 'SGD', 'CNY']

type Hotel = {
  name: string
  location: string
  address: string | null
  phone: string | null
  email: string | null
  taxId: string | null
  logoUrl: string | null
  timezone: string
  setupCompletedAt: string | null
}
type RoomType = { id: string; code: string; name: string; rate: number }
type Room = { id: string; floor: number; type: string }
type Staff = { id: string; name: string | null; email: string; role: string; active: boolean }

const STEPS = [
  { key: 'hotel', title: 'Hotel details', icon: Building },
  { key: 'types', title: 'Room types', icon: BedDouble },
  { key: 'rooms', title: 'Rooms', icon: DoorOpen },
  { key: 'staff', title: 'Staff', icon: Users },
] as const

async function api<T = any>(url: string, init?: RequestInit): Promise<{ ok: boolean; data: T & { error?: string } }> {
  const res = await fetch(url, init?.body ? { ...init, headers: { 'Content-Type': 'application/json' } } : init)
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, data }
}

export default function SetupPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.role === 'admin'

  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [hotel, setHotel] = useState<Hotel | null>(null)
  const [baseCurrency, setBaseCurrency] = useState('THB')
  const [altCurrency, setAltCurrency] = useState('USD')
  const [types, setTypes] = useState<RoomType[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [staff, setStaff] = useState<Staff[]>([])

  const loadAll = useCallback(async () => {
    const [h, s, t, r, u] = await Promise.all([
      api<Hotel>('/api/hotel'),
      api('/api/settings'),
      api<RoomType[]>('/api/room-types'),
      api<Room[]>('/api/rooms'),
      api<Staff[]>('/api/users'),
    ])
    if (h.ok) setHotel(h.data)
    if (s.ok) {
      setBaseCurrency(s.data.baseCurrency)
      setAltCurrency(s.data.altCurrency)
    }
    if (t.ok && Array.isArray(t.data)) setTypes(t.data)
    if (r.ok && Array.isArray(r.data)) setRooms(r.data)
    if (u.ok && Array.isArray(u.data)) setStaff(u.data)
  }, [])

  useEffect(() => {
    loadAll().finally(() => setLoading(false))
  }, [loadAll])

  if (!isAdmin && session) {
    return <div className="p-6 text-sm text-slate-600">Only an admin can run hotel setup.</div>
  }
  if (loading || !hotel) return <PageSkeleton />

  const done = [
    Boolean(hotel.name && hotel.address),
    types.length > 0,
    rooms.length > 0,
    staff.length > 1,
  ]

  async function finish() {
    const { ok, data } = await api('/api/setup/complete', { method: 'POST' })
    if (!ok) return toast(data.error ?? 'Could not finish setup', 'error')
    toast('Setup complete')
    router.push('/')
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Set up {hotel.name || 'your hotel'}</h2>
        <p className="text-sm text-slate-600 mt-1">
          Four short steps. You can come back and change any of this later in Settings.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[13rem_1fr]">
        {/* Step list */}
        <ol className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible" aria-label="Setup steps">
          {STEPS.map((s, i) => {
            const current = i === step
            return (
              <li key={s.key} className="flex-shrink-0">
                <button
                  onClick={() => setStep(i)}
                  aria-current={current ? 'step' : undefined}
                  className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                    current ? 'bg-[#0F2044] text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      done[i] ? 'bg-emerald-500 text-white' : current ? 'bg-sky-400 text-[#0F2044]' : 'bg-slate-100 text-slate-600'
                    }`}
                    aria-hidden
                  >
                    {done[i] ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className="font-semibold whitespace-nowrap">{s.title}</span>
                  {done[i] && <span className="sr-only">(done)</span>}
                </button>
              </li>
            )
          })}
        </ol>

        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 min-w-0">
          {step === 0 && (
            <HotelStep
              hotel={hotel}
              baseCurrency={baseCurrency}
              altCurrency={altCurrency}
              onSaved={async () => {
                await loadAll()
                setStep(1)
              }}
            />
          )}
          {step === 1 && (
            <TypesStep
              types={types}
              rooms={rooms}
              currency={baseCurrency}
              onChange={async () => {
                await loadAll()
                refreshRoomTypes()
              }}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <RoomsStep types={types} rooms={rooms} onChange={loadAll} onNext={() => setStep(3)} />
          )}
          {step === 3 && (
            <StaffStep
              staff={staff}
              onChange={loadAll}
              canFinish={done[1] && done[2]}
              alreadyDone={Boolean(hotel.setupCompletedAt)}
              onFinish={finish}
            />
          )}
        </section>
      </div>
    </div>
  )
}

// ── Step 1: hotel details ───────────────────────────────────────────────────
function HotelStep({
  hotel,
  baseCurrency,
  altCurrency,
  onSaved,
}: {
  hotel: Hotel
  baseCurrency: string
  altCurrency: string
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    name: hotel.name ?? '',
    location: hotel.location ?? '',
    address: hotel.address ?? '',
    phone: hotel.phone ?? '',
    email: hotel.email ?? '',
    taxId: hotel.taxId ?? '',
    logoUrl: hotel.logoUrl ?? '',
    timezone: hotel.timezone,
  })
  const [currency, setCurrency] = useState(baseCurrency)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [logoBroken, setLogoBroken] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const zones = TIMEZONES.some((z) => z.id === form.timezone)
    ? TIMEZONES
    : [{ id: form.timezone, label: form.timezone }, ...TIMEZONES]

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) return setError('Enter the hotel name')
    setSaving(true)
    const h = await api('/api/hotel', { method: 'PUT', body: JSON.stringify(form) })
    if (!h.ok) {
      setSaving(false)
      return setError(h.data.error ?? 'Could not save hotel details')
    }
    if (currency !== baseCurrency) {
      // Base and alternate currency must differ — move the alternate out of the way
      const alt = currency === altCurrency ? (currency === 'USD' ? 'THB' : 'USD') : undefined
      const s = await api('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({ baseCurrency: currency, ...(alt ? { altCurrency: alt } : {}) }),
      })
      if (!s.ok) {
        setSaving(false)
        return setError(s.data.error ?? 'Hotel saved, but the currency could not be changed')
      }
    }
    setSaving(false)
    toast('Hotel details saved')
    onSaved()
  }

  return (
    <form onSubmit={save} className="space-y-5" noValidate>
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Hotel details</h3>
        <p className="text-sm text-slate-600">Printed on receipts, folios and the booking confirmation.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="h-name" className={labelCls}>Hotel name</label>
          <input id="h-name" value={form.name} onChange={set('name')} className={inputCls} required />
        </div>
        <div>
          <label htmlFor="h-loc" className={labelCls}>City and country</label>
          <input id="h-loc" value={form.location} onChange={set('location')} placeholder="Yangon, Myanmar" className={inputCls} />
        </div>
        <div>
          <label htmlFor="h-phone" className={labelCls}>Phone</label>
          <input id="h-phone" type="tel" value={form.phone} onChange={set('phone')} className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="h-addr" className={labelCls}>Street address</label>
          <input id="h-addr" value={form.address} onChange={set('address')} className={inputCls} />
        </div>
        <div>
          <label htmlFor="h-email" className={labelCls}>Email</label>
          <input id="h-email" type="email" value={form.email} onChange={set('email')} className={inputCls} />
        </div>
        <div>
          <label htmlFor="h-tax" className={labelCls}>Tax ID (optional)</label>
          <input id="h-tax" value={form.taxId} onChange={set('taxId')} className={inputCls} />
        </div>
        <div>
          <label htmlFor="h-tz" className={labelCls}>Time zone</label>
          <select id="h-tz" value={form.timezone} onChange={set('timezone')} className={inputCls}>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>{z.label}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">Decides when “today” starts for arrivals and the night audit.</p>
        </div>
        <div>
          <label htmlFor="h-cur" className={labelCls}>Main currency</label>
          <select id="h-cur" value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">Exchange rates for other currencies are in Settings.</p>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="h-logo" className={labelCls}>Logo link (optional)</label>
          <div className="flex items-center gap-3">
            <input
              id="h-logo"
              type="url"
              value={form.logoUrl}
              onChange={(e) => {
                setLogoBroken(false)
                set('logoUrl')(e)
              }}
              placeholder="https://…/logo.png"
              className={inputCls}
              aria-describedby="h-logo-hint"
            />
            {form.logoUrl.startsWith('https://') && !logoBroken && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.logoUrl}
                alt="Logo preview"
                className="h-11 w-11 flex-shrink-0 rounded-lg border border-slate-200 object-contain"
                onError={() => setLogoBroken(true)}
              />
            )}
          </div>
          <p id="h-logo-hint" className={`mt-1 text-xs ${logoBroken ? 'text-red-600' : 'text-slate-500'}`}>
            {logoBroken ? 'That link doesn’t load an image. Check it opens in a browser.' : 'A square PNG works best on receipts.'}
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <div className="flex justify-end">
        <button type="submit" disabled={saving} className={primaryBtn}>
          {saving ? 'Saving…' : 'Save and continue'}
        </button>
      </div>
    </form>
  )
}

// ── Step 2: room types ──────────────────────────────────────────────────────
function TypesStep({
  types,
  rooms,
  currency,
  onChange,
  onNext,
}: {
  types: RoomType[]
  rooms: Room[]
  currency: string
  onChange: () => Promise<void>
  onNext: () => void
}) {
  const [draft, setDraft] = useState({ code: '', name: '', rate: '' })
  const [edits, setEdits] = useState<Record<string, { name: string; rate: string }>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const roomCount = (code: string) => rooms.filter((r) => r.type === code).length

  async function add(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const code = (draft.code || draft.name).trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').slice(0, 20)
    setBusy(true)
    const { ok, data } = await api('/api/room-types', {
      method: 'POST',
      body: JSON.stringify({ code, name: draft.name, rate: Number(draft.rate || 0) }),
    })
    setBusy(false)
    if (!ok) return setError(data.error ?? 'Could not add room type')
    setDraft({ code: '', name: '', rate: '' })
    await onChange()
  }

  async function saveEdit(t: RoomType) {
    const e = edits[t.id]
    if (!e) return
    const { ok, data } = await api(`/api/room-types/${t.id}`, {
      method: 'PUT',
      body: JSON.stringify({ name: e.name, rate: Number(e.rate) }),
    })
    if (!ok) return toast(data.error ?? 'Could not save', 'error')
    setEdits(({ [t.id]: _, ...rest }) => rest)
    await onChange()
  }

  async function remove(t: RoomType) {
    const { ok, data } = await api(`/api/room-types/${t.id}`, { method: 'DELETE' })
    if (!ok) return toast(data.error ?? 'Could not delete', 'error')
    await onChange()
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Room types</h3>
        <p className="text-sm text-slate-600">
          The kinds of room you sell, with the normal nightly price in {currency}. A single room’s price can still be
          changed later in Settings.
        </p>
      </div>

      {types.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {types.map((t) => {
            const e = edits[t.id]
            return (
              <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                {e ? (
                  <>
                    <input
                      aria-label={`Name for ${t.code}`}
                      value={e.name}
                      onChange={(ev) => setEdits((x) => ({ ...x, [t.id]: { ...e, name: ev.target.value } }))}
                      className={`${inputCls} flex-1 min-w-[10rem]`}
                    />
                    <input
                      aria-label={`Rate for ${t.code}`}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={e.rate}
                      onChange={(ev) => setEdits((x) => ({ ...x, [t.id]: { ...e, rate: ev.target.value } }))}
                      className={`${inputCls} w-32`}
                    />
                    <button onClick={() => saveEdit(t)} className={primaryBtn}>Save</button>
                    <button onClick={() => setEdits(({ [t.id]: _, ...rest }) => rest)} className={secondaryBtn}>Cancel</button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-[10rem]">
                      <p className="font-semibold text-slate-900">{t.name}</p>
                      <p className="text-xs text-slate-500">
                        Code {t.code} · {roomCount(t.code)} room(s)
                      </p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums text-slate-800">
                      {t.rate.toLocaleString()} {currency}
                    </p>
                    <button
                      onClick={() => setEdits((x) => ({ ...x, [t.id]: { name: t.name, rate: String(t.rate) } }))}
                      className={secondaryBtn}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(t)}
                      disabled={roomCount(t.code) > 0}
                      title={roomCount(t.code) > 0 ? 'Rooms still use this type' : undefined}
                      className="p-2.5 rounded-xl text-red-600 hover:bg-red-50 disabled:text-slate-300 disabled:hover:bg-transparent"
                      aria-label={`Delete ${t.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <form onSubmit={add} className="rounded-xl bg-slate-50 p-4 space-y-3" noValidate>
        <p className="text-sm font-semibold text-slate-800">Add a room type</p>
        <div className="grid gap-3 sm:grid-cols-[1fr_9rem_8rem]">
          <div>
            <label htmlFor="rt-name" className={labelCls}>Name</label>
            <input
              id="rt-name"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Deluxe twin"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="rt-rate" className={labelCls}>Price / night</label>
            <input
              id="rt-rate"
              type="number"
              inputMode="decimal"
              min={0}
              value={draft.rate}
              onChange={(e) => setDraft((d) => ({ ...d, rate: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="rt-code" className={labelCls}>Short code</label>
            <input
              id="rt-code"
              value={draft.code}
              onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value.toUpperCase() }))}
              placeholder="DLX"
              maxLength={20}
              className={inputCls}
              aria-describedby="rt-code-hint"
            />
          </div>
        </div>
        <p id="rt-code-hint" className="text-xs text-slate-500">
          The code can’t be changed later. Leave it empty to make one from the name.
        </p>
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        <button type="submit" disabled={busy || !draft.name.trim()} className={secondaryBtn}>
          <Plus className="h-4 w-4" aria-hidden /> Add room type
        </button>
      </form>

      <div className="flex justify-end">
        <button onClick={onNext} disabled={types.length === 0} className={primaryBtn}>
          Continue to rooms
        </button>
      </div>
    </div>
  )
}

// ── Step 3: rooms ───────────────────────────────────────────────────────────
function RoomsStep({
  types,
  rooms,
  onChange,
  onNext,
}: {
  types: RoomType[]
  rooms: Room[]
  onChange: () => Promise<void>
  onNext: () => void
}) {
  const [floor, setFloor] = useState('1')
  const [from, setFrom] = useState('101')
  const [to, setTo] = useState('110')
  const [type, setType] = useState(types[0]?.code ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // "101" → "110" expands to 101…110; keeps any leading letters / zero padding
  const preview = useMemo(() => {
    const a = from.match(/^(\D*)(\d+)$/)
    const b = to.match(/^(\D*)(\d+)$/)
    if (!a || !b || a[1] !== b[1]) return null
    const start = Number(a[2])
    const end = Number(b[2])
    if (end < start || end - start >= 300) return null
    const width = a[2].length
    return Array.from({ length: end - start + 1 }, (_, i) => a[1] + String(start + i).padStart(width, '0'))
  }, [from, to])

  const byType = types.map((t) => ({ t, ids: rooms.filter((r) => r.type === t.code).map((r) => r.id) }))

  async function add(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!preview) return setError('Use the same pattern for both numbers, e.g. 101 to 110 (up to 300 rooms).')
    if (!type) return setError('Choose a room type')
    setBusy(true)
    const { ok, data } = await api('/api/rooms', {
      method: 'POST',
      body: JSON.stringify({ rooms: preview.map((id) => ({ id, floor: Number(floor), type })) }),
    })
    setBusy(false)
    if (!ok) return setError(data.error ?? 'Could not add rooms')
    toast(`Added ${data.created} room(s)`)
    await onChange()
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Rooms</h3>
        <p className="text-sm text-slate-600">Add rooms floor by floor. Each room starts at its type’s price.</p>
      </div>

      {rooms.length > 0 && (
        <div className="rounded-xl border border-slate-200 p-4 space-y-2">
          <p className="text-sm font-semibold text-slate-800">{rooms.length} room(s) so far</p>
          {byType.map(({ t, ids }) =>
            ids.length ? (
              <p key={t.id} className="text-sm text-slate-600">
                <span className="font-medium text-slate-800">{t.name}:</span> {ids.join(', ')}
              </p>
            ) : null,
          )}
        </div>
      )}

      <form onSubmit={add} className="rounded-xl bg-slate-50 p-4 space-y-3" noValidate>
        <p className="text-sm font-semibold text-slate-800">Add rooms</p>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <div>
            <label htmlFor="r-floor" className={labelCls}>Floor</label>
            <input id="r-floor" type="number" inputMode="numeric" value={floor} onChange={(e) => setFloor(e.target.value)} className={inputCls} />
          </div>
          <div className="col-span-2 sm:col-span-1 sm:order-last">
            <label htmlFor="r-type" className={labelCls}>Room type</label>
            <select id="r-type" value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
              {types.map((t) => (
                <option key={t.id} value={t.code}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="r-from" className={labelCls}>From room</label>
            <input id="r-from" value={from} onChange={(e) => setFrom(e.target.value.trim())} className={inputCls} />
          </div>
          <div>
            <label htmlFor="r-to" className={labelCls}>To room</label>
            <input id="r-to" value={to} onChange={(e) => setTo(e.target.value.trim())} className={inputCls} />
          </div>
        </div>
        <p className="text-xs text-slate-600" aria-live="polite">
          {preview
            ? `Will add ${preview.length} room(s): ${preview.slice(0, 8).join(', ')}${preview.length > 8 ? ' …' : ''}`
            : 'For one room, put the same number in both boxes.'}
        </p>
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        <button type="submit" disabled={busy || !preview || types.length === 0} className={secondaryBtn}>
          <Plus className="h-4 w-4" aria-hidden /> {busy ? 'Adding…' : 'Add rooms'}
        </button>
      </form>

      <div className="flex justify-end">
        <button onClick={onNext} disabled={rooms.length === 0} className={primaryBtn}>
          Continue to staff
        </button>
      </div>
    </div>
  )
}

// ── Step 4: staff ───────────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  front_desk: 'Front desk',
  housekeeping: 'Housekeeping',
}

function StaffStep({
  staff,
  onChange,
  canFinish,
  alreadyDone,
  onFinish,
}: {
  staff: Staff[]
  onChange: () => Promise<void>
  canFinish: boolean
  alreadyDone: boolean
  onFinish: () => void
}) {
  const [form, setForm] = useState({ name: '', email: '', password: '', userRole: 'front_desk' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function add(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { ok, data } = await api('/api/users', { method: 'POST', body: JSON.stringify(form) })
    setBusy(false)
    if (!ok) return setError(data.error ?? 'Could not add staff')
    toast(`Added ${form.name || form.email}`)
    setForm({ name: '', email: '', password: '', userRole: form.userRole })
    await onChange()
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Staff</h3>
        <p className="text-sm text-slate-600">
          Give each person their own login so the activity log shows who did what. They’ll choose their own password
          the first time they sign in.
        </p>
      </div>

      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
        {staff.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <div className="min-w-0">
              <p className="font-medium text-slate-900 truncate">{u.name || u.email}</p>
              <p className="text-xs text-slate-500 truncate">{u.email}</p>
            </div>
            <span className="text-xs font-semibold text-slate-600">{ROLE_LABELS[u.role] ?? u.role}</span>
          </li>
        ))}
      </ul>

      <form onSubmit={add} className="rounded-xl bg-slate-50 p-4 space-y-3" noValidate>
        <p className="text-sm font-semibold text-slate-800">Add a staff login</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="s-name" className={labelCls}>Name</label>
            <input id="s-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label htmlFor="s-email" className={labelCls}>Email (used to sign in)</label>
            <input
              id="s-email"
              type="email"
              autoComplete="off"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="s-pw" className={labelCls}>Temporary password</label>
            <input
              id="s-pw"
              type="text"
              autoComplete="off"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className={inputCls}
              aria-describedby="s-pw-hint"
            />
            <p id="s-pw-hint" className="mt-1 text-xs text-slate-500">At least 8 characters. Tell them in person.</p>
          </div>
          <div>
            <label htmlFor="s-role" className={labelCls}>Role</label>
            <select id="s-role" value={form.userRole} onChange={(e) => setForm((f) => ({ ...f, userRole: e.target.value }))} className={inputCls}>
              {Object.entries(ROLE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </div>
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        <button type="submit" disabled={busy || !form.email || form.password.length < 8} className={secondaryBtn}>
          <Plus className="h-4 w-4" aria-hidden /> {busy ? 'Adding…' : 'Add staff'}
        </button>
      </form>

      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
        {!canFinish && <p className="text-sm text-slate-600">Add room types and rooms first.</p>}
        <button onClick={onFinish} disabled={!canFinish} className={primaryBtn}>
          {alreadyDone ? 'Done' : 'Finish setup'}
        </button>
      </div>
    </div>
  )
}
