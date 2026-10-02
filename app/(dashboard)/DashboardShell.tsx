'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  LayoutDashboard,
  CalendarDays,
  Clock,
  Grid3X3,
  Users,
  LogOut,
  Radio,
  BarChart3,
  Building2,
  Settings2,
  Play,
  CheckCircle,
  AlertCircle,
  Loader2,
  Receipt,
  Sparkles,
  Search,
  Wallet,
  FileBarChart,
  Menu,
  X,
  UserCircle2,
  Languages,
  Wand2,
} from 'lucide-react'
import { hasPermission } from '@/lib/rbac'
import { getResStatusBadge, getResStatusLabel } from '@/lib/utils'
import { useT, TKey } from '@/lib/i18n'
import Toaster from '@/components/Toaster'
import BrandLoader from '@/components/loading/BrandLoader'

type NavItem = {
  href: string
  label: TKey
  icon: React.ComponentType<{ className?: string }>
  roles?: string[]
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/reservations', label: 'nav.reservations', icon: CalendarDays },
  { href: '/timeline', label: 'nav.timeline', icon: Clock },
  { href: '/rooms', label: 'nav.rooms', icon: Grid3X3 },
  { href: '/housekeeping', label: 'nav.housekeeping', icon: Sparkles },
  { href: '/guests', label: 'nav.guests', icon: Users },
  { href: '/companies', label: 'nav.companies', icon: Building2 },
  { href: '/shift', label: 'nav.shift', icon: Wallet, roles: ['admin', 'manager', 'front_desk'] },
  { href: '/reports', label: 'nav.reports', icon: FileBarChart, roles: ['admin', 'manager', 'front_desk'] },
  { href: '/analytics', label: 'nav.analytics', icon: BarChart3, roles: ['admin', 'manager'] },
  { href: '/accounting', label: 'nav.accounting', icon: Receipt, roles: ['admin', 'manager'] },
  { href: '/settings', label: 'nav.settings', icon: Settings2, roles: ['admin', 'manager'] },
]

// Pages reachable from the account menu rather than the main nav
const EXTRA_TITLES: Record<string, TKey> = { '/account': 'nav.account', '/setup': 'nav.setup' }

type HotelInfo = { name: string; location: string; setupCompletedAt: string | null }

function NightAuditClock({ canRun }: { canRun: boolean }) {
  const { t } = useT()
  const [timeLeft, setTimeLeft] = useState('')
  const [currentTime, setCurrentTime] = useState('')
  const [auditRan, setAuditRan] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    function tick() {
      const now = new Date()
      const midnight = new Date(now)
      midnight.setHours(24, 0, 0, 0)
      const diff = midnight.getTime() - now.getTime()
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const checkAuditStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/night-audit')
      const data = await res.json()
      setAuditRan(data.ran)
    } catch { }
  }, [])

  useEffect(() => { checkAuditStatus() }, [checkAuditStatus])

  async function runAudit() {
    setRunning(true)
    setConfirming(false)
    setResult(null)
    try {
      const res = await fetch('/api/night-audit', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setAuditRan(true)
        setResult({ ok: true, msg: `${data.chargesPosted} charge${data.chargesPosted !== 1 ? 's' : ''} posted · ฿${data.totalAmount.toLocaleString()}` })
      } else {
        setResult({ ok: false, msg: data.error ?? 'Failed' })
      }
    } catch {
      setResult({ ok: false, msg: 'Network error' })
    }
    setRunning(false)
  }

  return (
    <div className="px-4 py-3 mx-2 mb-2 rounded-xl bg-white/5 border border-white/10">
      <p className="text-xs text-sky-300/80 font-semibold mb-1">{t('audit.title')}</p>
      <p className="text-lg font-mono font-bold text-white">{timeLeft}</p>
      <p className="text-xs text-white/40 mt-0.5">{currentTime}</p>

      {canRun && (
        <div className="mt-2">
          {auditRan ? (
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle className="w-3 h-3" />
              <span className="text-xs font-semibold">{t('audit.done')}</span>
            </div>
          ) : confirming ? (
            <div className="space-y-1.5">
              <p className="text-xs text-amber-300 font-semibold">{t('audit.confirm')}</p>
              <div className="flex gap-1.5">
                <button
                  onClick={runAudit}
                  className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold rounded transition-colors"
                >
                  {t('audit.confirmYes')}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="flex-1 py-1.5 bg-white/10 hover:bg-white/20 text-white/70 text-xs font-bold rounded transition-colors"
                >
                  {t('audit.cancel')}
                </button>
              </div>
            </div>
          ) : running ? (
            <div className="flex items-center gap-1.5 text-white/50">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="text-xs">{t('audit.running')}</span>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-sky-300 hover:text-sky-200 transition-colors"
            >
              <Play className="w-3 h-3" /> {t('audit.run')}
            </button>
          )}

          {result && (
            <div className={`mt-1.5 flex items-start gap-1 ${result.ok ? 'text-emerald-400' : 'text-red-400'}`}>
              {result.ok
                ? <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                : <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />}
              <span className="text-[10px] leading-tight">{result.msg}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

type SearchResult = {
  id: string
  reservationNumber: string
  guestName: string
  roomId: string
  status: string
  checkIn: string
  checkOut: string
}

function GlobalSearch({ className = 'w-72', autoFocus = false }: { className?: string; autoFocus?: boolean }) {
  const { t } = useT()
  const router = useRouter()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  function onChange(value: string) {
    setQ(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.trim().length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(value.trim())}`)
        const data = await r.json()
        setResults(Array.isArray(data) ? data : [])
        setOpen(true)
      } catch {
        setResults([])
      }
    }, 250)
  }

  function select(res: SearchResult) {
    setQ('')
    setResults([])
    setOpen(false)
    router.push(`/reservations?focus=${res.id}`)
  }

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-sky-400 focus-within:border-transparent transition-all">
        <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        <input
          value={q}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => { if (results.length > 0) setOpen(true) }}
          placeholder={t('shell.search')}
          aria-label={t('shell.searchShort')}
          autoFocus={autoFocus}
          className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-500 focus:outline-none"
        />
      </div>
      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-xs text-gray-500 text-center">{t('shell.noMatches')}</p>
          ) : (
            results.map((r) => (
              <button
                key={r.id}
                onClick={() => select(r)}
                className="w-full text-left px-3 py-2 hover:bg-sky-50 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-gray-800 truncate">{r.guestName}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${getResStatusBadge(r.status as any)}`}>
                    {getResStatusLabel(r.status as any)}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {r.reservationNumber} · Room {r.roomId} · {r.checkIn} → {r.checkOut}
                </p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status } = useSession()
  const { t, lang, setLang } = useT()
  const userRole = (session?.user as any)?.role ?? ''
  const mustChangePassword = Boolean((session?.user as any)?.mustChangePassword)
  const visibleNavItems = NAV_ITEMS.filter((n) => !n.roles || n.roles.includes(userRole))

  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [hotel, setHotel] = useState<HotelInfo | null>(null)
  const drawerRef = useRef<HTMLElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/hotel')
      .then((r) => (r.ok ? r.json() : null))
      .then((h) => h && setHotel(h))
      .catch(() => {})
  }, [status, pathname === '/setup'])

  // A temporary (admin-set) password must be replaced before anything else
  useEffect(() => {
    if (mustChangePassword && pathname !== '/account') router.replace('/account')
  }, [mustChangePassword, pathname, router])

  // Close the mobile drawer / search on navigation
  useEffect(() => {
    setMenuOpen(false)
    setSearchOpen(false)
  }, [pathname])

  // Drawer: focus moves in on open; Escape closes and returns focus to the menu button
  useEffect(() => {
    if (!menuOpen) return
    drawerRef.current?.querySelector<HTMLElement>('a, button')?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        menuButtonRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const today = new Date().toLocaleDateString(lang === 'my' ? 'my-MM' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  if (status === 'loading') return <BrandLoader />

  const pageTitleKey: TKey =
    EXTRA_TITLES[pathname] ?? NAV_ITEMS.find((n) => isActive(n.href))?.label ?? 'nav.dashboard'
  const showSetupBanner =
    userRole === 'admin' && hotel && !hotel.setupCompletedAt && pathname !== '/setup' && !mustChangePassword
  const hotelLine = hotel ? [hotel.name, hotel.location].filter(Boolean).join(', ') : ''

  const sidebar = (
    <>
      {/* Logo */}
      <div className="px-5 pt-6 pb-4 flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-2xl font-black text-white tracking-tight">
            STAYWISE<span className="text-sky-400">.</span>
          </p>
          <p className="text-white/60 text-xs mt-1 truncate max-w-[11rem]">{hotel?.name}</p>
        </div>
        <button
          onClick={() => {
            setMenuOpen(false)
            menuButtonRef.current?.focus()
          }}
          className="lg:hidden -mr-2 p-2 text-white/70 hover:text-white rounded-lg"
          aria-label={t('nav.closeMenu')}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Date */}
      <div className="px-5 pb-4">
        <p className="text-xs text-white/50">{today}</p>
      </div>

      {/* Night audit */}
      {!mustChangePassword && <NightAuditClock canRun={hasPermission(userRole, 'POST_PAYMENT')} />}

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto" aria-label="Main">
        {!mustChangePassword &&
          visibleNavItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
                  active ? 'bg-sky-500 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{t(label)}</span>
              </Link>
            )
          })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/10 space-y-1">
        <Link
          href="/account"
          className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
            pathname === '/account' ? 'bg-white/10' : 'hover:bg-white/10'
          }`}
        >
          <div
            className="w-7 h-7 rounded-full bg-sky-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            aria-hidden
          >
            {session?.user?.name?.charAt(0) ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{session?.user?.name ?? 'Staff'}</p>
            <p className="text-xs text-white/50 truncate">{t('nav.account')}</p>
          </div>
          <UserCircle2 className="w-4 h-4 text-white/40" aria-hidden />
        </Link>
        <button
          onClick={() => setLang(lang === 'en' ? 'my' : 'en')}
          className="w-full flex items-center gap-3 px-3 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl text-sm font-medium transition-colors"
          aria-label={t('shell.languageLabel')}
        >
          <Languages className="w-4 h-4" aria-hidden />
          {t('shell.language')}
        </button>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-3 px-3 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl text-sm font-medium transition-colors"
        >
          <LogOut className="w-4 h-4" aria-hidden />
          {t('shell.signOut')}
        </button>
      </div>
    </>
  )

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      {/* Sidebar — static on large screens */}
      <aside className="hidden lg:flex w-60 flex-shrink-0 flex-col bg-[#0F2044]">{sidebar}</aside>

      {/* Sidebar — drawer on phones / tablets */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMenuOpen(false)} aria-hidden />
          <aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="absolute inset-y-0 left-0 w-72 max-w-[85vw] flex flex-col bg-[#0F2044] shadow-2xl"
          >
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="flex-shrink-0 bg-white border-b border-gray-200">
          <div className="h-14 flex items-center justify-between gap-3 px-3 sm:px-6">
            <div className="flex items-center gap-2 min-w-0">
              <button
                ref={menuButtonRef}
                onClick={() => setMenuOpen(true)}
                className="lg:hidden p-2 -ml-1 text-slate-600 hover:bg-slate-100 rounded-lg"
                aria-label={t('nav.openMenu')}
                aria-expanded={menuOpen}
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="font-semibold text-gray-900 text-sm truncate">{t(pageTitleKey)}</h1>
                <p className="text-xs text-gray-500 truncate">{hotelLine}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {!mustChangePassword && <GlobalSearch className="hidden md:block w-56 lg:w-72" />}
              {!mustChangePassword && (
                <button
                  onClick={() => setSearchOpen((v) => !v)}
                  className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                  aria-label={t('shell.searchShort')}
                  aria-expanded={searchOpen}
                >
                  <Search className="w-5 h-5" />
                </button>
              )}
              <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-semibold text-emerald-700">
                <Radio className="w-2.5 h-2.5 motion-safe:animate-pulse" aria-hidden />
                {t('shell.live')}
              </span>
            </div>
          </div>
          {searchOpen && (
            <div className="md:hidden px-3 pb-3">
              <GlobalSearch className="w-full" autoFocus />
            </div>
          )}
        </header>

        {showSetupBanner && (
          <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-2.5 bg-sky-50 border-b border-sky-100 text-sm text-sky-900">
            <span className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-sky-600" aria-hidden />
              {t('shell.setupBanner')}
            </span>
            <Link href="/setup" className="font-semibold text-sky-700 hover:text-sky-900 underline underline-offset-2">
              {t('shell.setupBannerAction')}
            </Link>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-gray-50">{children}</main>
      </div>

      <Toaster />
    </div>
  )
}
