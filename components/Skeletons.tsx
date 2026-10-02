'use client'

import { useEffect, useState } from 'react'
import { useT } from '@/lib/i18n'

// Pulsing placeholder shown while page data loads — replaces the bare spinner.
// After a few seconds it adds a plain-language note so staff know it hasn't frozen.
export function PageSkeleton() {
  const { t } = useT()
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setSlow(true), 4000)
    return () => clearTimeout(id)
  }, [])

  return (
    <div className="p-4 sm:p-6" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{t('loading.page')}</span>
      <div className="animate-pulse motion-reduce:animate-none">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-200/70 rounded-2xl" />
          ))}
        </div>
        <div className="h-8 w-48 bg-slate-200/70 rounded-lg mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 bg-slate-200/60 rounded-xl" />
          ))}
        </div>
      </div>
      {slow && <p className="mt-6 text-center text-sm text-slate-500">{t('loading.slow')}</p>}
    </div>
  )
}
