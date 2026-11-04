import * as React from 'react'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/providers/auth-provider'
import { AppShell } from '@/components/layout/app-shell'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Super A Plus | Microfinance Platform',
  description: 'Enterprise Microfinance Management Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}>
      <body className="h-full bg-slate-950 font-sans text-slate-100">
        <AuthProvider>
          <React.Suspense fallback={<div className="h-screen w-full bg-slate-950" />}>
            <AppShell>{children}</AppShell>
          </React.Suspense>
        </AuthProvider>
      </body>
    </html>
  )
}
