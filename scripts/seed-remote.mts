// Seeds a Supabase project via the REST API using the anon key. Reads .env.local.
// Run: node --experimental-strip-types scripts/seed-remote.mts
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { buildSeed } from '../src/lib/data/seed.ts'
import type { TableName } from '../src/lib/types.ts'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => l.split('=', 2).map((s) => s.trim()) as [string, string])
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const ORDER: TableName[] = ['vessels','recipes','package_profiles','batches','batch_ingredients','yeasts','batch_events','batch_measurements','batch_transfers','nutrient_additions','stabilizations','backsweetening_events','packaging_events','tastings','reminders']
const snap = buildSeed()
for (const t of ORDER) {
  const rows = snap[t] as Record<string, unknown>[]
  if (!rows.length) continue
  const { error } = await sb.from(t).upsert(rows, { onConflict: 'id', ignoreDuplicates: true })
  if (error) { console.error(t, error.message); process.exit(1) }
  console.log(`${t}: ${rows.length}`)
}
