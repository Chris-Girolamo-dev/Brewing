'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

// Ported from OPFOR design system — Card / Panel / Metric. Flat dark surface, 14px radius,
// hairline border. The ONLY gradient panel is Callout (brand moment, one per view).
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-[14px] border border-border bg-surface', className)} {...props} />
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center justify-between gap-3 px-5 pt-5', className)} {...props} />
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-sm font-semibold text-fg', className)} {...props} />
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />
}

export function MetricCard({
  label,
  value,
  trend,
  trendTone = 'neutral',
  className,
}: {
  label: string
  value: React.ReactNode
  trend?: React.ReactNode
  trendTone?: 'neutral' | 'ok' | 'crit' | 'warn'
  className?: string
}) {
  const trendColor =
    trendTone === 'ok' ? 'text-ok' : trendTone === 'crit' ? 'text-crit' : trendTone === 'warn' ? 'text-warn' : 'text-text-3'
  return (
    <Card className={cn('p-4', className)}>
      <div className="text-[12px] font-medium text-text-2">{label}</div>
      <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-fg sm:text-2xl">{value}</div>
      {trend != null && <div className={cn('mt-0.5 text-xs font-medium', trendColor)}>{trend}</div>}
    </Card>
  )
}

export function Callout({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[14px] border p-5',
        'border-[color-mix(in_oklab,var(--accent)_25%,transparent)]',
        'bg-[linear-gradient(90deg,color-mix(in_oklab,var(--accent)_10%,transparent),color-mix(in_oklab,var(--accent)_3%,transparent))]',
        className
      )}
      {...props}
    />
  )
}

/** Mono uppercase figure caption, e.g. "FIG. 01 / GRAVITY · SG vs DAYS". */
export function FigCaption({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-text-3', className)}
      {...props}
    />
  )
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[14px] border border-dashed border-border-2 px-6 py-10 text-center">
      <div className="text-sm font-semibold text-fg">{title}</div>
      {hint && <div className="mt-1 max-w-sm text-xs text-text-3">{hint}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
