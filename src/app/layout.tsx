import * as React from 'react'
import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/providers/auth-provider'
import { AppShell } from '@/components/layout/app-shell'
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'Super A Plus | Cooperative Finance',
  description: 'Member accounts, lending and collections for Super A Plus Cooperative Finance.',
}

export default function RootLayout({
  children,
  applicationModal,
}: {
  children: React.ReactNode
  applicationModal: React.ReactNode
}) {
  return (
    <html lang="en" className={cn("h-full antialiased", "font-sans", geist.variable)}>
      <body className="h-full bg-background font-sans text-foreground">
        <AuthProvider>
          <React.Suspense fallback={<div className="h-screen w-full bg-background" />}>
            <AppShell>{children}{applicationModal}</AppShell>
          </React.Suspense>
        </AuthProvider>
      </body>
    </html>
  )
}
