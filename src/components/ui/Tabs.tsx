'use client'

import * as React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

// Ported from OPFOR design system — Tabs & segmented controls.
export interface SegOption<T extends string> {
  value: T
  label: React.ReactNode
  dot?: boolean
}

const SEG_SPRING = { type: 'spring', stiffness: 170, damping: 24, mass: 1.2 } as const

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  fullWidth = false,
  size = 'sm',
}: {
  options: SegOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
  fullWidth?: boolean
  size?: 'xs' | 'sm' | 'md'
}) {
  const pillId = React.useId()
  const reduce = useReducedMotion()
  return (
    <div
      className={cn(
        'items-center gap-0.5 rounded-[9px] border border-border bg-canvas p-[3px]',
        fullWidth ? 'flex w-full' : 'inline-flex',
        'max-w-full overflow-x-auto scrollbar-none',
        className
      )}
      role="tablist"
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative flex items-center justify-center whitespace-nowrap rounded-md font-semibold transition-colors',
              size === 'md' ? 'h-8 px-3 text-[13px]' : size === 'xs' ? 'h-[26px] px-2 text-[11px]' : 'h-[28px] px-[11px] text-xs',
              fullWidth && 'flex-1',
              active ? 'text-fg' : 'text-text-3 hover:text-text-2'
            )}
          >
            {active && (
              <motion.span
                layoutId={pillId}
                className="absolute inset-0 rounded-md bg-elevated shadow-sm"
                transition={reduce ? { duration: 0 } : SEG_SPRING}
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {o.label}
              {o.dot && <span className="size-1.5 rounded-full bg-ok" />}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function Tabs<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: SegOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-1 overflow-x-auto border-b border-border scrollbar-none', className)} role="tablist">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative -mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              active ? 'border-accent text-fg' : 'border-transparent text-text-3 hover:text-text-2'
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
