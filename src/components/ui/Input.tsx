'use client'

import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// Ported from OPFOR design system — Inputs & fields. Focus = accent-soft glow.
const fieldBase =
  'w-full rounded-lg border border-border-2 bg-canvas text-sm text-fg placeholder:text-text-3 outline-none transition-colors ' +
  'focus:border-accent focus:ring-[3px] focus:ring-accent-soft disabled:cursor-not-allowed disabled:opacity-50'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref
) {
  return <input ref={ref} className={cn(fieldBase, 'h-[38px] px-[13px]', className)} {...props} />
})

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(fieldBase, 'min-h-[80px] px-[13px] py-2', className)} {...props} />
  }
)

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref
) {
  return (
    <div className="relative inline-flex w-full">
      <select ref={ref} className={cn(fieldBase, 'h-[38px] appearance-none pl-[13px] pr-9', className)} {...props}>
        {children}
      </select>
      <ChevronDown size={15} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-3" />
    </div>
  )
})

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('mb-[6px] block text-[12.5px] font-medium text-text-2', className)} {...props} />
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: React.ReactNode
  hint?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      {children}
      {hint && <div className="mt-1 text-[11.5px] text-text-3">{hint}</div>}
    </div>
  )
}

/** Input with a trailing unit selector or static unit label, OPFOR "input + adornment" pattern.
 *  Keeps the raw typed text locally so intermediate states like "1." or "1.0" survive a
 *  parent that stores the parsed number (otherwise "1.042" can never be typed). */
export function UnitInput({
  value,
  onChange,
  unit,
  units,
  onUnitChange,
  step = 'any',
  placeholder,
  inputMode = 'decimal',
  className,
  autoFocus,
}: {
  value: string
  onChange: (v: string) => void
  unit: string
  units?: readonly string[]
  onUnitChange?: (u: string) => void
  step?: string | number
  placeholder?: string
  inputMode?: 'decimal' | 'numeric'
  className?: string
  autoFocus?: boolean
}) {
  const [text, setText] = React.useState(value)
  React.useEffect(() => {
    // Sync from the parent only when it represents a different number than what is typed.
    const a = text.trim() === '' ? null : Number(text)
    const b = value.trim() === '' ? null : Number(value)
    const same = (a == null && b == null) || (a != null && b != null && Math.abs(a - b) < 1e-12)
    if (!same) setText(value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return (
    <div className={cn('flex min-w-0', className)}>
      <input
        type="number"
        inputMode={inputMode}
        step={step}
        value={text}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(e) => {
          setText(e.target.value)
          onChange(e.target.value)
        }}
        className={cn(fieldBase, 'h-[38px] min-w-0 rounded-r-none px-[13px] tabular')}
      />
      {units && onUnitChange ? (
        <div className="relative shrink-0">
          <select
            value={unit}
            onChange={(e) => onUnitChange(e.target.value)}
            className="h-[38px] appearance-none rounded-r-lg border border-l-0 border-border-2 bg-surface-2 pl-3 pr-7 text-xs font-semibold text-text-2 outline-none"
          >
            {units.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-3" />
        </div>
      ) : (
        <div className="flex h-[38px] shrink-0 items-center rounded-r-lg border border-l-0 border-border-2 bg-surface-2 px-3 text-xs font-semibold text-text-2">
          {unit}
        </div>
      )}
    </div>
  )
}

export function Slider({
  value,
  onChange,
  min = 1,
  max = 5,
  step = 1,
  label,
  low,
  high,
}: {
  value: number | null
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  label: string
  low?: string
  high?: string
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[12.5px] font-medium text-text-2">{label}</span>
        <span className="font-mono text-xs tabular-nums text-fg">{value ?? '—'}</span>
      </div>
      <input
        type="range"
        className="slider"
        min={min}
        max={max}
        step={step}
        value={value ?? Math.round((min + max) / 2)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {(low || high) && (
        <div className="mt-0.5 flex justify-between text-[10.5px] text-text-3">
          <span>{low}</span>
          <span>{high}</span>
        </div>
      )}
    </div>
  )
}
