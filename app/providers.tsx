'use client'

import { SessionProvider } from 'next-auth/react'
import { LanguageProvider } from '@/lib/i18n'
import NetworkActivity from '@/components/loading/NetworkActivity'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LanguageProvider>
        <NetworkActivity />
        {children}
      </LanguageProvider>
    </SessionProvider>
  )
}
