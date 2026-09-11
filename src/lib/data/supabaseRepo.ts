import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { TABLE_NAMES, emptySnapshot, type Row, type Snapshot, type TableName } from '@/lib/types'
import type { Repository } from './repository'

export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export class SupabaseRepository implements Repository {
  readonly mode = 'supabase' as const
  private client: SupabaseClient

  constructor() {
    this.client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  }

  async loadAll(): Promise<Snapshot> {
    const snap = emptySnapshot()
    const results = await Promise.all(
      TABLE_NAMES.map(async (t) => {
        const { data, error } = await this.client.from(t).select('*')
        if (error) throw new Error(`${t}: ${error.message}`)
        return [t, data ?? []] as const
      })
    )
    for (const [t, rows] of results) {
      // Numeric columns come back as strings from PostgREST for `numeric`; coerce.
      ;(snap as Record<string, unknown[]>)[t] = rows.map(coerceNumerics)
    }
    return snap
  }

  async insert<T extends TableName>(table: T, row: Row<T>): Promise<void> {
    const { error } = await this.client.from(table).insert(row as never)
    if (error) throw new Error(`${table} insert: ${error.message}`)
  }

  async update<T extends TableName>(table: T, id: string, patch: Partial<Row<T>>): Promise<void> {
    const { error } = await this.client.from(table).update(patch as never).eq('id', id)
    if (error) throw new Error(`${table} update: ${error.message}`)
  }

  async remove(table: TableName, id: string): Promise<void> {
    const { error } = await this.client.from(table).delete().eq('id', id)
    if (error) throw new Error(`${table} delete: ${error.message}`)
  }
}

const NUMERIC_KEYS = new Set([
  'capacity',
  'target_volume',
  'og',
  'fg',
  'amount',
  'rehydration_temp',
  'value',
  'volume_before',
  'volume_after',
  'planned_amount',
  'actual_amount',
  'sg',
  'kmeta_amount',
  'sorbate_amount',
  'volume',
  'pre_sg',
  'post_sg',
  'container_size',
  'packaged_volume',
  'priming_sugar_grams',
  'target_co2',
  'conditioning_temp',
  'serving_temp',
  'rating',
])

function coerceNumerics<T extends Record<string, unknown>>(row: T): T {
  const out: Record<string, unknown> = { ...row }
  for (const k of Object.keys(out)) {
    const v = out[k]
    if (NUMERIC_KEYS.has(k) && typeof v === 'string' && v !== '') out[k] = Number(v)
  }
  return out as T
}
