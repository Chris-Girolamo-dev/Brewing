'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

// Ported from OPFOR design system — Dialogs & modals. Backdrop blur + elevated box.
// On phones the dialog becomes a bottom sheet so one-handed logging works.
export function Dialog({
  open,
  onClose,
  title,
  subtitle,
  children,
  className,
  footer,
}: {
  open: boolean
  onClose?: () => void
  title?: React.ReactNode
  subtitle?: React.ReactNode
  children: React.ReactNode
  className?: string
  footer?: React.ReactNode
}) {
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          'relative z-10 flex w-full max-h-[92dvh] flex-col border border-border-2 bg-elevated shadow-[var(--shadow-lg)]',
          'rounded-t-2xl sm:max-w-lg sm:rounded-2xl',
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        {title != null && (
          <div className="flex items-start justify-between border-b border-border px-5 py-3.5">
            <div>
              <h2 className="text-base font-semibold text-fg">{title}</h2>
              {subtitle && <div className="text-xs text-text-3">{subtitle}</div>}
            </div>
            {onClose && (
              <button type="button" onClick={onClose} className="text-text-3 transition-colors hover:text-fg" aria-label="Close">
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}
