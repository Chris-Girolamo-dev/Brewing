'use client'

import * as React from 'react'
import { getRepository, newId, nowIso } from '@/lib/data'
import {
  DEFAULT_PREFERENCES,
  emptySnapshot,
  type Batch,
  type BatchEvent,
  type Preferences,
  type Row,
  type Snapshot,
  type TableName,
} from '@/lib/types'

interface Store {
  ready: boolean
  error: string | null
  mode: 'supabase' | 'demo'
  data: Snapshot
  prefs: Preferences
  setPrefs: (p: Partial<Preferences>) => void
  insert: <T extends TableName>(table: T, row: Omit<Row<T>, 'id' | 'created_at'> & { id?: string }) => Promise<Row<T>>
  update: <T extends TableName>(table: T, id: string, patch: Partial<Row<T>>) => Promise<void>
  remove: (table: TableName, id: string) => Promise<void>
  logEvent: (e: Omit<BatchEvent, 'id' | 'created_at'>) => Promise<BatchEvent>
  touchBatch: (id: string, patch?: Partial<Batch>) => Promise<void>
  reload: () => Promise<void>
  resetDemo: () => Promise<void>
}

const Ctx = React.createContext<Store | null>(null)
const PREF_KEY = 'fbm_prefs_v1'

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = React.useState<Snapshot>(emptySnapshot)
  const [ready, setReady] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [prefs, setPrefsState] = React.useState<Preferences>(DEFAULT_PREFERENCES)
  const repo = React.useMemo(() => getRepository(), [])

  const reload = React.useCallback(async () => {
    try {
      setError(null)
      setData(await repo.loadAll())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setReady(true)
    }
  }, [repo])

  React.useEffect(() => {
    void reload()
    try {
      const raw = window.localStorage.getItem(PREF_KEY)
      if (raw) setPrefsState({ ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as Partial<Preferences>) })
    } catch {
      /* ignore */
    }
  }, [reload])

  const setPrefs = React.useCallback((p: Partial<Preferences>) => {
    setPrefsState((prev) => {
      const next = { ...prev, ...p }
      try {
        window.localStorage.setItem(PREF_KEY, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const insert = React.useCallback(
    async <T extends TableName>(table: T, row: Omit<Row<T>, 'id' | 'created_at'> & { id?: string }): Promise<Row<T>> => {
      const full = { ...row, id: row.id ?? newId(), created_at: nowIso() } as Row<T>
      setData((d) => ({ ...d, [table]: [...(d[table] as Row<T>[]), full] }))
      try {
        await repo.insert(table, full)
      } catch (e) {
        setData((d) => ({ ...d, [table]: (d[table] as Row<T>[]).filter((r) => r.id !== full.id) }))
        setError(e instanceof Error ? e.message : String(e))
        throw e
      }
      return full
    },
    [repo]
  )

  const update = React.useCallback(
    async <T extends TableName>(table: T, id: string, patch: Partial<Row<T>>) => {
      let prev: Row<T> | undefined
      setData((d) => ({
        ...d,
        [table]: (d[table] as Row<T>[]).map((r) => {
          if (r.id !== id) return r
          prev = r
          return { ...r, ...patch }
        }),
      }))
      try {
        await repo.update(table, id, patch)
      } catch (e) {
        if (prev) setData((d) => ({ ...d, [table]: (d[table] as Row<T>[]).map((r) => (r.id === id ? prev! : r)) }))
        setError(e instanceof Error ? e.message : String(e))
        throw e
      }
    },
    [repo]
  )

  const remove = React.useCallback(
    async (table: TableName, id: string) => {
      let removed: { id: string } | undefined
      setData((d) => ({
        ...d,
        [table]: (d[table] as { id: string }[]).filter((r) => {
          if (r.id === id) removed = r
          return r.id !== id
        }),
      }))
      try {
        await repo.remove(table, id)
      } catch (e) {
        if (removed) setData((d) => ({ ...d, [table]: [...(d[table] as { id: string }[]), removed!] }))
        setError(e instanceof Error ? e.message : String(e))
        throw e
      }
    },
    [repo]
  )

  const touchBatch = React.useCallback(
    async (id: string, patch: Partial<Batch> = {}) => {
      await update('batches', id, { ...patch, updated_at: nowIso() })
    },
    [update]
  )

  const logEvent = React.useCallback(
    async (e: Omit<BatchEvent, 'id' | 'created_at'>) => {
      const row = await insert('batch_events', e)
      await touchBatch(e.batch_id)
      return row
    },
    [insert, touchBatch]
  )

  const resetDemo = React.useCallback(async () => {
    if (repo.reset) await repo.reset()
    await reload()
  }, [repo, reload])

  const value = React.useMemo<Store>(
    () => ({ ready, error, mode: repo.mode, data, prefs, setPrefs, insert, update, remove, logEvent, touchBatch, reload, resetDemo }),
    [ready, error, repo.mode, data, prefs, setPrefs, insert, update, remove, logEvent, touchBatch, reload, resetDemo]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const s = React.useContext(Ctx)
  if (!s) throw new Error('useStore must be used inside DataProvider')
  return s
}
