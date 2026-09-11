'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

// Ported from OPFOR design system — Status & badges. FLAT semantic colors only.
export type Tone = 'neutral' | 'ok' | 'warn' | 'crit' | 'info' | 'accent'

const toneClass: Record<Tone, string> = {
  neutral: 'border border-border bg-surface-2 text-text-2',
  ok: 'bg-[color-mix(in_oklab,var(--ok)_16%,transparent)] text-ok',
  warn: 'bg-[color-mix(in_oklab,var(--warn)_18%,transparent)] text-warn',
  crit: 'bg-[color-mix(in_oklab,var(--crit)_16%,transparent)] text-crit',
  info: 'bg-[color-mix(in_oklab,var(--info)_16%,transparent)] text-info',
  accent: 'bg-accent-soft text-accent',
}

const dotClass: Record<Tone, string> = {
  neutral: 'bg-text-3',
  ok: 'bg-ok',
  warn: 'bg-warn',
  crit: 'bg-crit',
  info: 'bg-info',
  accent: 'bg-accent',
}

export function Badge({ tone = 'neutral', className, children, ...props }: { tone?: Tone } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold leading-[18px]', toneClass[tone], className)}
      {...props}
    >
      {children}
    </span>
  )
}

export function StatusPill({ tone = 'neutral', className, children, ...props }: { tone?: Tone } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <Badge tone={tone} className={className} {...props}>
      <span className={cn('size-1.5 rounded-full', dotClass[tone])} />
      {children}
    </Badge>
  )
}

export function CountToken({ className, children, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex min-w-5 items-center justify-center rounded-full bg-surface-2 px-1.5 text-[10px] font-bold tabular-nums text-text-2',
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

/** Stat chip as in the OPFOR results strip: icon + mono value. */
export function StatChip({ icon, children, className }: { icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 font-mono text-xs font-semibold tabular-nums text-fg',
        className
      )}
    >
      {icon && <span className="text-text-3 [&_svg]:size-3.5">{icon}</span>}
      {children}
    </span>
  )
}
