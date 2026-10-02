'use client'

// Minimal two-language UI (English / Burmese). Covers the shell, loading,
// account, housekeeping and setup screens first — the ones floor staff use.
// Anything not in the dictionary falls back to English, so screens can be
// translated incrementally. Burmese strings need a native-speaker review.

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

export type Lang = 'en' | 'my'

const en = {
  'nav.dashboard': 'Dashboard',
  'nav.reservations': 'Reservations',
  'nav.timeline': 'Timeline',
  'nav.rooms': 'Room grid',
  'nav.housekeeping': 'Housekeeping',
  'nav.guests': 'Guest history',
  'nav.companies': 'Companies',
  'nav.shift': 'Shift / cash',
  'nav.reports': 'Reports',
  'nav.analytics': 'Analytics',
  'nav.accounting': 'Accounting',
  'nav.settings': 'Settings',
  'nav.account': 'My account',
  'nav.setup': 'Hotel setup',
  'nav.openMenu': 'Open menu',
  'nav.closeMenu': 'Close menu',

  'shell.signOut': 'Sign out',
  'shell.search': 'Search guest, reservation, room…',
  'shell.searchShort': 'Search',
  'shell.noMatches': 'No matches',
  'shell.live': 'System live',
  'shell.offline': 'Offline',
  'shell.language': 'မြန်မာ',
  'shell.languageLabel': 'Switch language to Burmese',
  'shell.setupBanner': 'Finish setting up your hotel — rooms, room types and staff.',
  'shell.setupBannerAction': 'Continue setup',

  'audit.title': 'Night audit',
  'audit.run': 'Run audit',
  'audit.running': 'Running…',
  'audit.done': 'Audit complete',
  'audit.confirm': 'Post room charges for all in-house guests?',
  'audit.confirmYes': 'Post charges',
  'audit.cancel': 'Cancel',

  'loading.page': 'Loading',
  'loading.session': 'Opening your workspace',
  'loading.slow': 'Still working — the connection is slow. Please don’t close this page.',

  'error.title': 'This page couldn’t load',
  'error.body': 'Something went wrong while loading. Your data is safe. Try again, and if it keeps happening, note the time and tell your manager.',
  'error.retry': 'Try again',
  'error.home': 'Go to dashboard',

  'account.title': 'My account',
  'account.password': 'Password',
  'account.mustChange': 'Choose your own password before you continue. The one you were given is temporary.',
  'account.current': 'Current password',
  'account.new': 'New password',
  'account.confirm': 'Repeat new password',
  'account.hint': 'At least 8 characters.',
  'account.mismatch': 'The two new passwords don’t match.',
  'account.save': 'Save password',
  'account.saving': 'Saving…',
  'account.saved': 'Password saved',
  'account.language': 'Language',

  'hk.title': 'Housekeeping board',
  'hk.allClean': 'All rooms are clean — nothing to do',
  'hk.waiting': '{n} room(s) waiting to be cleaned',
  'hk.markClean': 'Mark clean',
  'hk.marked': 'Room {room} marked clean',
  'hk.floor': 'Floor {n}',
  'status.dirty': 'Needs cleaning',
  'status.available': 'Clean & ready',
  'status.occupied': 'Occupied',
  'status.maintenance': 'Maintenance',
  'status.blocked': 'Blocked',
} as const

export type TKey = keyof typeof en

const my: Partial<Record<TKey, string>> = {
  'nav.dashboard': 'ပင်မစာမျက်နှာ',
  'nav.reservations': 'ဘိုကင်များ',
  'nav.timeline': 'အချိန်ဇယား',
  'nav.rooms': 'အခန်းဇယား',
  'nav.housekeeping': 'အခန်းသန့်ရှင်းရေး',
  'nav.guests': 'ဧည့်သည်မှတ်တမ်း',
  'nav.companies': 'ကုမ္ပဏီများ',
  'nav.shift': 'အလှည့် / ငွေသား',
  'nav.reports': 'အစီရင်ခံစာများ',
  'nav.analytics': 'ခွဲခြမ်းစိတ်ဖြာမှု',
  'nav.accounting': 'စာရင်းကိုင်',
  'nav.settings': 'ဆက်တင်များ',
  'nav.account': 'ကျွန်ုပ်၏အကောင့်',
  'nav.setup': 'ဟိုတယ် စတင်ပြင်ဆင်ခြင်း',
  'nav.openMenu': 'မီနူးဖွင့်ရန်',
  'nav.closeMenu': 'မီနူးပိတ်ရန်',

  'shell.signOut': 'ထွက်မည်',
  'shell.search': 'ဧည့်သည်၊ ဘိုကင်၊ အခန်း ရှာရန်…',
  'shell.searchShort': 'ရှာရန်',
  'shell.noMatches': 'ရှာမတွေ့ပါ',
  'shell.live': 'စနစ် အလုပ်လုပ်နေသည်',
  'shell.offline': 'အင်တာနက် မရှိပါ',
  'shell.language': 'English',
  'shell.languageLabel': 'Switch language to English',
  'shell.setupBanner': 'ဟိုတယ်ပြင်ဆင်မှု မပြီးသေးပါ — အခန်းများ၊ အခန်းအမျိုးအစားများနှင့် ဝန်ထမ်းများ ထည့်ပါ။',
  'shell.setupBannerAction': 'ဆက်လုပ်မည်',

  'audit.title': 'ညစာရင်းပိတ်',
  'audit.run': 'စာရင်းပိတ်မည်',
  'audit.running': 'လုပ်ဆောင်နေသည်…',
  'audit.done': 'စာရင်းပိတ်ပြီး',
  'audit.confirm': 'တည်းခိုနေသော ဧည့်သည်အားလုံးအတွက် အခန်းခ တင်မလား?',
  'audit.confirmYes': 'အခန်းခ တင်မည်',
  'audit.cancel': 'မလုပ်တော့ပါ',

  'loading.page': 'ဖွင့်နေသည်',
  'loading.session': 'သင့်လုပ်ငန်းခွင်ကို ဖွင့်နေသည်',
  'loading.slow': 'လုပ်ဆောင်နေဆဲ — အင်တာနက် နှေးနေသည်။ ဤစာမျက်နှာကို မပိတ်ပါနှင့်။',

  'error.title': 'ဤစာမျက်နှာကို ဖွင့်မရပါ',
  'error.body': 'ဖွင့်စဉ် အမှားတစ်ခု ဖြစ်သွားသည်။ သင့်ဒေတာ မပျက်ပါ။ ထပ်ကြိုးစားပါ။ ဆက်ဖြစ်နေပါက အချိန်ကို မှတ်ပြီး မန်နေဂျာကို ပြောပါ။',
  'error.retry': 'ထပ်ကြိုးစားမည်',
  'error.home': 'ပင်မစာမျက်နှာသို့',

  'account.title': 'ကျွန်ုပ်၏အကောင့်',
  'account.password': 'စကားဝှက်',
  'account.mustChange': 'ဆက်မလုပ်မီ ကိုယ်ပိုင် စကားဝှက် သတ်မှတ်ပါ။ ပေးထားသော စကားဝှက်မှာ ယာယီသာ ဖြစ်သည်။',
  'account.current': 'လက်ရှိ စကားဝှက်',
  'account.new': 'စကားဝှက်အသစ်',
  'account.confirm': 'စကားဝှက်အသစ် ထပ်ရိုက်ပါ',
  'account.hint': 'အနည်းဆုံး စာလုံး ၈ လုံး။',
  'account.mismatch': 'စကားဝှက်အသစ် နှစ်ခု မတူပါ။',
  'account.save': 'စကားဝှက် သိမ်းမည်',
  'account.saving': 'သိမ်းနေသည်…',
  'account.saved': 'စကားဝှက် သိမ်းပြီး',
  'account.language': 'ဘာသာစကား',

  'hk.title': 'အခန်းသန့်ရှင်းရေး ဇယား',
  'hk.allClean': 'အခန်းအားလုံး သန့်ရှင်းပြီး — လုပ်စရာ မရှိပါ',
  'hk.waiting': 'သန့်ရှင်းရန် အခန်း {n} ခု ကျန်သည်',
  'hk.markClean': 'သန့်ရှင်းပြီး',
  'hk.marked': 'အခန်း {room} သန့်ရှင်းပြီး',
  'hk.floor': 'အထပ် {n}',
  'status.dirty': 'သန့်ရှင်းရန်',
  'status.available': 'သန့်ရှင်းပြီး အသင့်',
  'status.occupied': 'ဧည့်သည်ရှိ',
  'status.maintenance': 'ပြုပြင်ဆဲ',
  'status.blocked': 'ပိတ်ထား',
}

const DICTS: Record<Lang, Partial<Record<TKey, string>>> = { en, my }
const STORAGE_KEY = 'staywise.lang'

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: TKey, vars?: Record<string, string | number>) => string }

function translate(lang: Lang, key: TKey, vars?: Record<string, string | number>) {
  let s: string = DICTS[lang][key] ?? en[key] ?? key
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v))
  return s
}

const LanguageContext = createContext<Ctx>({
  lang: 'en',
  setLang: () => {},
  t: (key, vars) => translate('en', key, vars),
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'my' || saved === 'en') setLangState(saved)
    } catch {
      // storage blocked (private mode) — stay on English
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {
      // per-device preference only; fine to lose
    }
  }, [])

  const t = useCallback((key: TKey, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang])

  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>
}

export function useT() {
  return useContext(LanguageContext)
}
