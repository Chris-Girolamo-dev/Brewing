import type { Repository } from './repository'
import { DemoRepository } from './demoRepo'
import { SupabaseRepository, supabaseConfigured } from './supabaseRepo'

let repo: Repository | null = null

export function getRepository(): Repository {
  if (!repo) repo = supabaseConfigured() ? new SupabaseRepository() : new DemoRepository()
  return repo
}

export { newId, nowIso } from './repository'
export type { Repository } from './repository'
