'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

export function LoanApplicationDialog({ children }: { children: ReactNode }) {
  const router = useRouter()

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) router.back() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[#17231b]/55 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-5xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 text-slate-900 shadow-2xl focus:outline-none sm:max-h-[calc(100dvh-3rem)] sm:p-7">
          <Dialog.Title className="sr-only">Loan application</Dialog.Title>
          <Dialog.Description className="sr-only">Complete the loan application in three short steps.</Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
