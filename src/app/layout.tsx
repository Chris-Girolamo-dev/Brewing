import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { IBM_Plex_Mono, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { DataProvider } from '@/lib/store'
import { AppShell } from '@/components/AppShell'
import { APP_NAME } from '@/lib/utils'

const spaceGrotesk = Space_Grotesk({
  variable: '--font-display-app',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-mono-app',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  title: `${APP_NAME} — Fermentation Batch Manager`,
  description: 'Structured, chronological tracking of fermentation batches, measurements, additions, transfers, packaging, and tastings.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: APP_NAME },
  icons: { icon: '/icon.svg', apple: '/apple-icon.png' },
}

export const viewport: Viewport = {
  themeColor: '#0a0c11',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark">
      <body className={`${GeistSans.variable} ${spaceGrotesk.variable} ${ibmPlexMono.variable} antialiased`}>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('fbm_theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}})();",
          }}
        />
        <DataProvider>
          <AppShell>{children}</AppShell>
        </DataProvider>
      </body>
    </html>
  )
}
