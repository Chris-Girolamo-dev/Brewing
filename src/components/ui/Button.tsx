'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// Ported from OPFOR design system — Button. Token-only; weight 600; spring press supplied
// globally by `button:active{transform:scale(.96)}` in tokens.css.
const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap outline-none select-none ' +
    'transition-colors focus-visible:ring-[3px] focus-visible:ring-accent-soft ' +
    'disabled:pointer-events-none disabled:opacity-45 disabled:cursor-not-allowed ' +
    "[&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary: 'bg-accent text-[#0a0c11] border border-accent hover:bg-accent-hover hover:border-accent-hover',
        secondary: 'bg-surface-2 text-fg border border-border-2 hover:bg-elevated',
        ghost: 'bg-transparent text-text-2 border border-transparent hover:bg-surface-2 hover:text-fg',
        danger:
          'bg-[color-mix(in_oklab,var(--crit)_10%,transparent)] text-crit ' +
          'border border-[color-mix(in_oklab,var(--crit)_40%,transparent)] ' +
          'hover:bg-[color-mix(in_oklab,var(--crit)_18%,transparent)]',
        outline: 'bg-transparent text-fg border border-border hover:bg-surface-2',
        pill: 'rounded-full bg-surface-2 text-fg border border-border-2 hover:bg-elevated',
      },
      size: {
        xs: "h-6 gap-1 rounded-md px-2 text-[11px] [&_svg:not([class*='size-'])]:size-3.5",
        sm: 'h-7 gap-1.5 rounded-[7px] px-3 text-[12.5px]',
        md: 'h-[34px] gap-[7px] rounded-lg px-[15px] text-[13px]',
        lg: 'h-[42px] gap-2 rounded-[9px] px-5 text-sm',
        icon: 'size-[34px] gap-0 rounded-[7px] px-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean
}

export function Button({ className, variant, size, loading, disabled, children, type = 'button', ...props }: ButtonProps) {
  return (
    <button type={type} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} {...props}>
      {loading && <Loader2 className="size-3.5 animate-spin" />}
      {children}
    </button>
  )
}

export { buttonVariants }
