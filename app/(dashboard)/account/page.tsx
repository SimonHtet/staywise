'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { KeyRound, ShieldAlert } from 'lucide-react'
import { useT, Lang } from '@/lib/i18n'
import { toast } from '@/lib/toast'

const inputCls =
  'w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent aria-[invalid=true]:border-red-400'

export default function AccountPage() {
  const { t, lang, setLang } = useT()
  const router = useRouter()
  const { data: session, update } = useSession()
  const mustChange = Boolean((session?.user as any)?.mustChangePassword)

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const mismatch = repeat.length > 0 && next !== repeat

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (next !== repeat) {
      setError(t('account.mismatch'))
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Could not save the password')
        return
      }
      setCurrent('')
      setNext('')
      setRepeat('')
      toast(t('account.saved'))
      // Refresh the session token so the "must change" flag clears everywhere
      await update()
      if (mustChange) router.replace('/')
    } catch {
      setError('Network error — check the connection and try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{t('account.title')}</h2>
        <p className="text-sm text-slate-500">
          {session?.user?.name} · {session?.user?.email}
        </p>
      </div>

      {mustChange && (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="alert">
          <ShieldAlert className="h-5 w-5 flex-shrink-0 text-amber-600" aria-hidden />
          <p>{t('account.mustChange')}</p>
        </div>
      )}

      <form onSubmit={save} className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4" noValidate>
        <h3 className="flex items-center gap-2 font-semibold text-slate-900">
          <KeyRound className="w-4 h-4 text-slate-500" aria-hidden /> {t('account.password')}
        </h3>

        <div>
          <label htmlFor="pw-current" className="block text-sm font-medium text-slate-700 mb-1">
            {t('account.current')}
          </label>
          <input
            id="pw-current"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor="pw-new" className="block text-sm font-medium text-slate-700 mb-1">
            {t('account.new')}
          </label>
          <input
            id="pw-new"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
            minLength={8}
            aria-describedby="pw-hint"
            className={inputCls}
          />
          <p id="pw-hint" className="mt-1 text-xs text-slate-500">
            {t('account.hint')}
          </p>
        </div>

        <div>
          <label htmlFor="pw-repeat" className="block text-sm font-medium text-slate-700 mb-1">
            {t('account.confirm')}
          </label>
          <input
            id="pw-repeat"
            type="password"
            autoComplete="new-password"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            required
            aria-invalid={mismatch}
            aria-describedby={mismatch ? 'pw-mismatch' : undefined}
            className={inputCls}
          />
          {mismatch && (
            <p id="pw-mismatch" className="mt-1 text-xs text-red-600">
              {t('account.mismatch')}
            </p>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving || !current || next.length < 8 || mismatch}
          className="w-full sm:w-auto px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? t('account.saving') : t('account.save')}
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
        <label htmlFor="lang" className="block font-semibold text-slate-900 mb-2">
          {t('account.language')}
        </label>
        <select
          id="lang"
          value={lang}
          onChange={(e) => setLang(e.target.value as Lang)}
          className="border border-slate-300 rounded-lg px-3 py-2.5 text-base sm:text-sm bg-white"
        >
          <option value="en">English</option>
          <option value="my">မြန်မာ (Burmese)</option>
        </select>
      </div>
    </div>
  )
}
