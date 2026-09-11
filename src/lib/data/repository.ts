import type { Row, Snapshot, TableName } from '@/lib/types'

/**
 * Minimal persistence contract. The whole dataset for a home brewer is small enough to
 * load once and hold in memory, so adapters only need bulk-load plus row-level writes.
 */
export interface Repository {
  readonly mode: 'supabase' | 'demo'
  loadAll(): Promise<Snapshot>
  insert<T extends TableName>(table: T, row: Row<T>): Promise<void>
  update<T extends TableName>(table: T, id: string, patch: Partial<Row<T>>): Promise<void>
  remove(table: TableName, id: string): Promise<void>
  /** Demo adapter only: wipe browser storage and reload seed. */
  reset?(): Promise<void>
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  // Fallback for very old browsers.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function nowIso(): string {
  return new Date().toISOString()
}
