'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { AlertTriangle, AlertCircle, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmWord?: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'default'
  onConfirm: () => Promise<void> | void
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmWord,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  onConfirm,
}: ConfirmDialogProps) {
  const [typedWord, setTypedWord] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (!open) {
      setTypedWord('')
      setLoading(false)
    }
  }, [open])

  const isConfirmed = confirmWord ? typedWord.trim().toUpperCase() === confirmWord.toUpperCase() : true

  const handleConfirm = async () => {
    if (!isConfirmed || loading) return
    try {
      setLoading(true)
      await onConfirm()
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  const variantColors = {
    danger: {
      icon: <AlertCircle className="h-5 w-5 text-rose-400" />,
      btn: 'bg-rose-600 hover:bg-rose-500 text-white focus:ring-rose-500',
      badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    },
    warning: {
      icon: <AlertTriangle className="h-5 w-5 text-amber-400" />,
      btn: 'bg-amber-600 hover:bg-amber-500 text-white focus:ring-amber-500',
      badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    },
    default: {
      icon: <AlertCircle className="h-5 w-5 text-emerald-400" />,
      btn: 'bg-emerald-600 hover:bg-emerald-500 text-white focus:ring-emerald-500',
      badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
  }[variant]

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs transition-opacity" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl transition-all duration-200">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 border border-slate-700">
              {variantColors.icon}
            </div>
            <div className="flex-1">
              <DialogPrimitive.Title className="text-base font-semibold text-slate-100">
                {title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-xs leading-relaxed text-slate-400">
                {description}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="rounded-md p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 focus:outline-none">
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          {confirmWord && (
            <div className="mt-4 rounded-md border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-xs text-slate-300">
                To proceed, type <span className="font-mono font-bold text-amber-400">{confirmWord}</span> below:
              </p>
              <input
                type="text"
                value={typedWord}
                onChange={(e) => setTypedWord(e.target.value)}
                placeholder={confirmWord}
                className="mt-2 block w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-xs text-slate-100 uppercase placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => onOpenChange(false)}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              {cancelText}
            </button>
            <button
              type="button"
              disabled={!isConfirmed || loading}
              onClick={handleConfirm}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                variantColors.btn
              )}
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {confirmText}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
