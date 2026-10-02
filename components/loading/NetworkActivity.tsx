'use client'

import { useEffect, useState } from 'react'
import { installFetchTracker, subscribeActivity } from '@/lib/activity'
import { useT } from '@/lib/i18n'

const SHOW_BAR_AFTER_MS = 300 // don't flash for quick requests
const SHOW_SLOW_NOTE_AFTER_MS = 5000

/**
 * Thin progress bar at the very top while any API request is running, plus a
 * reassurance note when something takes longer than a few seconds (slow hotel
 * Wi-Fi is the normal case, not the exception).
 */
export default function NetworkActivity() {
  const { t } = useT()
  const [busy, setBusy] = useState(false)
  const [showBar, setShowBar] = useState(false)
  const [slow, setSlow] = useState(false)
  const [online, setOnline] = useState(true)

  useEffect(() => {
    installFetchTracker()
    return subscribeActivity((n) => setBusy(n > 0))
  }, [])

  useEffect(() => {
    if (!busy) {
      setShowBar(false)
      setSlow(false)
      return
    }
    const a = setTimeout(() => setShowBar(true), SHOW_BAR_AFTER_MS)
    const b = setTimeout(() => setSlow(true), SHOW_SLOW_NOTE_AFTER_MS)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
  }, [busy])

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  return (
    <>
      <div
        className={`fixed top-0 inset-x-0 z-[120] h-0.5 overflow-hidden pointer-events-none transition-opacity duration-200 ${showBar ? 'opacity-100' : 'opacity-0'}`}
        role="progressbar"
        aria-hidden={!showBar}
        aria-label={t('loading.page')}
      >
        <div className="sw-progress h-full w-1/3 bg-sky-400" />
      </div>

      {(slow || !online) && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[110] max-w-[calc(100vw-2rem)] flex items-center gap-2.5 rounded-xl bg-[#0F2044] px-4 py-2.5 text-sm text-white shadow-lg"
        >
          {online ? (
            <span className="sw-dot inline-block h-2 w-2 flex-shrink-0 rounded-full bg-sky-400" aria-hidden />
          ) : (
            <span className="inline-block h-2 w-2 flex-shrink-0 rounded-full bg-amber-400" aria-hidden />
          )}
          <span>{online ? t('loading.slow') : t('shell.offline')}</span>
        </div>
      )}
    </>
  )
}
