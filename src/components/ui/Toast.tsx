'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tone } from './Badge'

// Ported from OPFOR design system — Toasts. Transient confirmations; semantic icon per tone.
interface ToastItem {
  id: number
  tone: Tone
  title: string
  message?: string
}

const ToastCtx = React.createContext<{ push: (t: Omit<ToastItem, 'id'>) => void } | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([])
  const push = React.useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = Date.now() + Math.random()
    setItems((xs) => [...xs, { ...t, id }])
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3200)
  }, [])
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[200] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              className="pointer-events-auto"
            >
              <Toast tone={t.tone} title={t.title} message={t.message} onClose={() => setItems((xs) => xs.filter((x) => x.id !== t.id))} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const c = React.useContext(ToastCtx)
  if (!c) throw new Error('useToast outside ToastProvider')
  return c.push
}

const icons = { ok: CheckCircle, warn: AlertTriangle, crit: XCircle, info: Info, accent: Info, neutral: Info } as const
const iconColor: Record<Tone, string> = {
  ok: 'text-ok',
  warn: 'text-warn',
  crit: 'text-crit',
  info: 'text-info',
  accent: 'text-accent',
  neutral: 'text-text-3',
}

export function Toast({
  tone = 'info',
  title,
  message,
  onClose,
  className,
}: {
  tone?: Tone
  title: React.ReactNode
  message?: React.ReactNode
  onClose?: () => void
  className?: string
}) {
  const Icon = icons[tone]
  return (
    <div
      className={cn(
        'flex w-[min(92vw,360px)] items-start gap-3 rounded-xl border border-border-2 bg-elevated px-4 py-3 shadow-[var(--shadow-lg)]',
        className
      )}
      role="status"
    >
      <Icon size={16} className={cn('mt-0.5 shrink-0', iconColor[tone])} />
      <div className="flex-1">
        <div className="text-sm font-semibold text-fg">{title}</div>
        {message != null && <div className="mt-0.5 text-xs text-text-2">{message}</div>}
      </div>
      {onClose && (
        <button type="button" onClick={onClose} className="text-text-3 transition-colors hover:text-fg" aria-label="Dismiss">
          <X size={14} />
        </button>
      )}
    </div>
  )
}
