'use client'

import { useEffect, useState } from 'react'
import { useT } from '@/lib/i18n'

/**
 * Full-screen loader used while the session or a whole page is being prepared.
 * The wordmark's dot is the activity indicator — the one animated element.
 * Appears only after a short delay so fast loads never flash it.
 */
export default function BrandLoader({ message, delayMs = 250 }: { message?: string; delayMs?: number }) {
  const { t } = useT()
  const [visible, setVisible] = useState(delayMs === 0)
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    const a = setTimeout(() => setVisible(true), delayMs)
    const b = setTimeout(() => setSlow(true), 6000)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
  }, [delayMs])

  return (
    <div
      className={`fixed inset-0 z-[90] flex flex-col items-center justify-center bg-[#0F2044] px-4 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      role="status"
      aria-live="polite"
    >
      <p className="text-4xl sm:text-5xl font-black tracking-tight text-white" aria-hidden>
        STAYWISE<span className="sw-dot inline-block text-sky-400">.</span>
      </p>
      <p className="mt-6 text-sm text-white/60">{message ?? t('loading.session')}</p>
      {slow && <p className="mt-2 max-w-xs text-center text-xs text-white/40">{t('loading.slow')}</p>}
    </div>
  )
}
