import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNowStrict, isValid, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function fmtDate(iso: string | null | undefined, pattern = 'MMM d, yyyy'): string {
  if (!iso) return '—'
  const d = parseISO(iso)
  return isValid(d) ? format(d, pattern) : '—'
}

export function fmtDateTime(iso: string | null | undefined): string {
  return fmtDate(iso, 'MMM d, yyyy · h:mm a')
}

export function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = parseISO(iso)
  if (!isValid(d)) return '—'
  const s = formatDistanceToNowStrict(d, { addSuffix: true })
  return s
}

/** ISO string → value for <input type="datetime-local">. */
export function toLocalInput(iso: string | null | undefined): string {
  const d = iso ? new Date(iso) : new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromLocalInput(v: string): string {
  return new Date(v).toISOString()
}

export function todayInput(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function num(v: string | number | null | undefined): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

export function str(v: string | null | undefined): string | null {
  const t = (v ?? '').trim()
  return t === '' ? null : t
}

export function slugCode(prefix: string, year: number, n: number): string {
  return `${prefix}-${year}-${String(n).padStart(3, '0')}`
}

export const APP_NAME = 'Ferment'
export const WORDMARK = { lead: 'FER', accent: 'MENT' }
