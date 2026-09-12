import { emptySnapshot, type Row, type Snapshot, type TableName } from '@/lib/types'
import type { Repository } from './repository'
import { buildSeed } from './seed'

const KEY = 'fbm_demo_snapshot_v2'

/**
 * Browser-local adapter used when Supabase env vars are absent. Persists the whole
 * snapshot to localStorage. Seeded on first run with the three reference batches.
 */
export class DemoRepository implements Repository {
  readonly mode = 'demo' as const

  private read(): Snapshot {
    if (typeof window === 'undefined') return emptySnapshot()
    try {
      const raw = window.localStorage.getItem(KEY)
      if (raw) return { ...emptySnapshot(), ...(JSON.parse(raw) as Partial<Snapshot>) }
    } catch {
      /* fall through to seed */
    }
    const seed = buildSeed()
    this.write(seed)
    return seed
  }

  private write(snap: Snapshot) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(snap))
    } catch {
      /* quota or private mode: keep going in memory */
    }
  }

  async loadAll(): Promise<Snapshot> {
    return this.read()
  }

  async insert<T extends TableName>(table: T, row: Row<T>): Promise<void> {
    const snap = this.read()
    ;(snap[table] as Row<T>[]).push(row)
    this.write(snap)
  }

  async update<T extends TableName>(table: T, id: string, patch: Partial<Row<T>>): Promise<void> {
    const snap = this.read()
    const rows = snap[table] as Row<T>[]
    const i = rows.findIndex((r) => r.id === id)
    if (i >= 0) rows[i] = { ...rows[i], ...patch }
    this.write(snap)
  }

  async remove(table: TableName, id: string): Promise<void> {
    const snap = this.read()
    ;(snap[table] as { id: string }[]) = (snap[table] as { id: string }[]).filter((r) => r.id !== id) as never
    this.write(snap)
  }

  async reset(): Promise<void> {
    window.localStorage.removeItem(KEY)
  }
}
