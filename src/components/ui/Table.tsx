'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

// Ported from OPFOR design system — Tables. Native <table>; mono uppercase headers.
export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className={cn('w-full border-collapse text-sm', className)} {...props} />
    </div>
  )
}

export function TH({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'border-b border-border bg-surface-2 px-3 py-2 text-left font-mono text-[11px] font-semibold uppercase tracking-[0.07em] text-text-3',
        className
      )}
      {...props}
    />
  )
}

export function TD({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('border-b border-border/60 px-3 py-2 text-text-2', className)} {...props} />
}

export function TR({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('transition-colors hover:bg-surface-2/50', className)} {...props} />
}
