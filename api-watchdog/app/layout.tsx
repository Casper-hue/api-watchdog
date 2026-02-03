import React from "react"
import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Mono, VT323 } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { I18nProvider } from '@/contexts/i18n-context'
import './globals.css'

const ibmPlexMono = IBM_Plex_Mono({ 
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-mono"
});

const vt323 = VT323({ 
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display"
});

export const metadata: Metadata = {
  title: 'API_WATCHDOG // SYSTEM v1.0',
  description: 'Industrial LLM API Consumption Monitoring System',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1c1c1c",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className={`${ibmPlexMono.variable} ${vt323.variable} font-mono antialiased`}>
        <I18nProvider>{children}</I18nProvider>
        <Analytics />
      </body>
    </html>
  )
}
