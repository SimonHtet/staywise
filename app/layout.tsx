import type { Metadata, Viewport } from 'next'
import { Noto_Sans_Myanmar } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

// Only used when the UI language is Burmese (see globals.css html[lang='my'])
const myanmar = Noto_Sans_Myanmar({
  subsets: ['myanmar'],
  weight: ['400', '600', '700'],
  variable: '--font-myanmar',
  display: 'swap',
  preload: false,
})

export const metadata: Metadata = {
  title: 'Staywise PMS',
  description: 'Hotel Property Management System',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0F2044',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={myanmar.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
