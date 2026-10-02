'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { useT } from '@/lib/i18n'

// Catches a crash inside one dashboard page; the sidebar keeps working
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useT()
  useEffect(() => {
    console.error('[dashboard] page error:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md text-center">
        <AlertTriangle className="mx-auto mb-4 h-8 w-8 text-amber-500" aria-hidden />
        <h1 className="text-lg font-semibold text-slate-900">{t('error.title')}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{t('error.body')}</p>
        {error.digest && <p className="mt-2 text-xs text-slate-400">Ref: {error.digest}</p>}
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={reset} className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">
            {t('error.retry')}
          </button>
          <Link href="/" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            {t('error.home')}
          </Link>
        </div>
      </div>
    </div>
  )
}
