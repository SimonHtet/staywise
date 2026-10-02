'use client'

import { SessionProvider } from 'next-auth/react'
import { MotionConfig } from 'motion/react'
import { LanguageProvider } from '@/lib/i18n'
import NetworkActivity from '@/components/loading/NetworkActivity'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LanguageProvider>
        {/* Honour the OS "reduce motion" setting for every motion component */}
        <MotionConfig reducedMotion="user">
          <NetworkActivity />
          {children}
        </MotionConfig>
      </LanguageProvider>
    </SessionProvider>
  )
}
