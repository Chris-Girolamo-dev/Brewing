'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// Ported from OPFOR design system — Switch. Greyscale spring toggle.
const SPRING = { type: 'spring', stiffness: 800, damping: 80, mass: 4 } as const

export function Switch({
  checked = false,
  onCheckedChange,
  disabled = false,
  className,
}: {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
}) {
  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      onClick={() => !disabled && onCheckedChange?.(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors shadow-[inset_0_0_0_1px_var(--border-2)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        checked ? 'bg-accent' : 'bg-elevated',
        disabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer',
        className
      )}
    >
      <motion.span className="size-5 rounded-full bg-white shadow-md" animate={{ x: checked ? 20 : 0 }} transition={SPRING} />
    </motion.button>
  )
}
