'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export function PageHeader({
  title,
  eyebrow,
  subtitle,
  actions,
  className,
}: {
  title: React.ReactNode
  eyebrow?: React.ReactNode
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-5 flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-text-3">{eyebrow}</div>}
        <h1 className="t-display truncate text-[22px] leading-tight text-fg sm:text-2xl">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-text-2">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Loading() {
  return (
    <div className="flex items-center justify-center py-24 text-sm text-text-3">
      <span className="mr-2 inline-block size-3 animate-pulse rounded-full bg-accent" /> Loading…
    </div>
  )
}
