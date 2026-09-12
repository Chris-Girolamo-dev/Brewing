import { apparentAttenuation, daysBetween, estimatedAbv, firstOfType, gravityStability, latestOfType, type StabilityResult } from '@/lib/calc/fermentation'
import { toLiters } from '@/lib/calc/units'
import type {
  Backsweetening,
  Batch,
  BatchEvent,
  BatchIngredient,
  BatchStage,
  Measurement,
  NutrientAddition,
  Packaging,
  Preferences,
  Reminder,
  Snapshot,
  Stabilization,
  Tasting,
  Transfer,
  Vessel,
  Yeast,
} from '@/lib/types'
import type { Tone } from '@/components/ui/Badge'

export interface BatchView {
  batch: Batch
  ingredients: BatchIngredient[]
  yeasts: Yeast[]
  events: BatchEvent[]
  measurements: Measurement[]
  transfers: Transfer[]
  nutrients: NutrientAddition[]
  stabilizations: Stabilization[]
  backsweetenings: Backsweetening[]
  packagings: Packaging[]
  tastings: Tasting[]
  reminders: Reminder[]
  vessel: Vessel | null
  latestSg: Measurement | null
  latestTemp: Measurement | null
  latestPh: Measurement | null
  og: number | null
  estAbv: number | null
  finalAbv: number | null
  attenuation: number | null
  dayNumber: number | null
  primaryDays: number | null
  agingDays: number | null
  packagedLiters: number | null
  startingLiters: number | null
  yieldPct: number | null
  stability: StabilityResult
  nextReminder: Reminder | null
  avgRating: number | null
  lastActivityAt: string | null
  // Lineage (one level). Children carry parent_batch_id; a split parent is an aggregate record.
  parent: Batch | null
  children: Batch[]
  isSplitParent: boolean
  inheritedIngredients: BatchIngredient[]
  inheritedYeasts: Yeast[]
  inheritedMeasurements: Measurement[]
  inheritedEvents: BatchEvent[]
  childSummaries: ChildSummary[]
}

export interface ChildSummary {
  batch: Batch
  vessel: Vessel | null
  latestSg: number | null
  estAbv: number | null
  finalAbv: number | null
  packagedLiters: number | null
  avgRating: number | null
  ownAdditions: BatchIngredient[]
}

export function buildBatchView(snap: Snapshot, batch: Batch, prefs: Preferences): BatchView {
  const byBatch = <T extends { batch_id: string | null }>(rows: T[]) => rows.filter((r) => r.batch_id === batch.id)
  const measurements = byBatch(snap.batch_measurements)
  const events = byBatch(snap.batch_events).sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
  const transfers = byBatch(snap.batch_transfers).sort((a, b) => a.transferred_at.localeCompare(b.transferred_at))
  const packagings = byBatch(snap.packaging_events)
  const tastings = byBatch(snap.tastings).sort((a, b) => b.tasted_at.localeCompare(a.tasted_at))
  const reminders = byBatch(snap.reminders).filter((r) => !r.done).sort((a, b) => a.due_at.localeCompare(b.due_at))

  const parent = batch.parent_batch_id ? (snap.batches.find((b) => b.id === batch.parent_batch_id) ?? null) : null
  const children = snap.batches.filter((b) => b.parent_batch_id === batch.id).sort((a, b) => a.batch_code.localeCompare(b.batch_code, undefined, { numeric: true }))
  const splitAt = batch.split_at ?? parent?.split_at ?? null
  const before = (iso: string) => !splitAt || iso <= splitAt
  const inheritedIngredients = parent ? snap.batch_ingredients.filter((i) => i.batch_id === parent.id && (!i.added_at || before(i.added_at))) : []
  const inheritedYeasts = parent ? snap.yeasts.filter((y) => y.batch_id === parent.id) : []
  const inheritedMeasurements = parent ? snap.batch_measurements.filter((m) => m.batch_id === parent.id && before(m.measured_at)) : []
  const inheritedEvents = parent
    ? snap.batch_events.filter((e) => e.batch_id === parent.id && before(e.occurred_at)).sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
    : []

  const latestSg = latestOfType(measurements, 'sg')
  const firstOwnSg = measurements.filter((m) => m.type === 'sg').sort((a, b) => a.measured_at.localeCompare(b.measured_at))[0]?.value ?? null
  const parentOg = parent ? (parent.og ?? firstOfType(inheritedMeasurements, 'sg')?.value ?? null) : null
  const og = batch.og ?? parentOg ?? firstOwnSg
  const currentSg = batch.fg ?? latestSg?.value ?? null
  const estAbv = estimatedAbv(og, currentSg)
  const finalAbv = batch.fg != null ? estimatedAbv(og, batch.fg) : null

  const pitchDate = batch.pitch_date ?? parent?.pitch_date ?? null
  const firstRack = transfers.find((t) => !t.to_batch_id)?.transferred_at ?? null
  const sumPackaged = (rows: Packaging[]) =>
    rows.reduce<number | null>((acc, p) => {
      if (p.packaged_volume == null) return acc
      return (acc ?? 0) + toLiters(p.packaged_volume, p.volume_unit)
    }, null)
  const childIds = new Set(children.map((c) => c.id))
  const packagedLiters = children.length
    ? sumPackaged(snap.packaging_events.filter((p) => childIds.has(p.batch_id)))
    : sumPackaged(packagings)

  const childSummaries: ChildSummary[] = children.map((c) => {
    const cm = snap.batch_measurements.filter((m) => m.batch_id === c.id)
    const cLatest = latestOfType(cm, 'sg')
    const cOg = c.og ?? og
    const ct = snap.tastings.filter((t) => t.batch_id === c.id).map((t) => t.rating).filter((r): r is number => r != null)
    return {
      batch: c,
      vessel: snap.vessels.find((v) => v.id === c.current_vessel_id) ?? null,
      latestSg: c.fg ?? cLatest?.value ?? null,
      estAbv: estimatedAbv(cOg, c.fg ?? cLatest?.value ?? null),
      finalAbv: c.fg != null ? estimatedAbv(cOg, c.fg) : null,
      packagedLiters: sumPackaged(snap.packaging_events.filter((p) => p.batch_id === c.id)),
      avgRating: ct.length ? Math.round((ct.reduce((a, b) => a + b, 0) / ct.length) * 10) / 10 : null,
      ownAdditions: snap.batch_ingredients.filter((i) => i.batch_id === c.id),
    }
  })
  const startingLiters = batch.target_volume != null ? toLiters(batch.target_volume, batch.volume_unit) : null

  const ratings = tastings.map((t) => t.rating).filter((r): r is number => r != null)

  return {
    batch,
    ingredients: byBatch(snap.batch_ingredients),
    yeasts: byBatch(snap.yeasts),
    events,
    measurements,
    transfers,
    nutrients: byBatch(snap.nutrient_additions).sort((a, b) => a.addition_number - b.addition_number),
    stabilizations: byBatch(snap.stabilizations),
    backsweetenings: byBatch(snap.backsweetening_events),
    packagings,
    tastings,
    reminders,
    vessel: snap.vessels.find((v) => v.id === batch.current_vessel_id) ?? null,
    latestSg,
    latestTemp: latestOfType(measurements, 'temp'),
    latestPh: latestOfType(measurements, 'ph'),
    og,
    estAbv,
    finalAbv,
    attenuation: apparentAttenuation(og, batch.fg),
    dayNumber: daysBetween(pitchDate ?? batch.batch_date),
    primaryDays: firstRack ? daysBetween(pitchDate ?? batch.batch_date, firstRack) : parent && splitAt ? daysBetween(pitchDate ?? batch.batch_date, splitAt) : null,
    agingDays: batch.fermentation_complete_at ? daysBetween(batch.fermentation_complete_at) : null,
    packagedLiters,
    startingLiters,
    yieldPct: packagedLiters != null && startingLiters ? Math.round((packagedLiters / startingLiters) * 1000) / 10 : null,
    stability: gravityStability(measurements, prefs.stable_gravity_days, prefs.stable_gravity_tolerance),
    nextReminder: reminders[0] ?? null,
    avgRating: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
    lastActivityAt: events[0]?.occurred_at ?? batch.updated_at,
    parent,
    children,
    isSplitParent: children.length > 0 || batch.stage === 'Split',
    inheritedIngredients,
    inheritedYeasts,
    inheritedMeasurements,
    inheritedEvents,
    childSummaries,
  }
}

/** Next child code for a split: PARENT-1, PARENT-2, … (one level only). */
export function nextSublotCode(snap: Snapshot, parent: Batch, offset = 0): string {
  const re = new RegExp(`^${parent.batch_code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)$`)
  let max = 0
  for (const b of snap.batches) {
    const m = b.batch_code.match(re)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `${parent.batch_code}-${max + 1 + offset}`
}

/** Effective pitch date for day counts: own, else inherited from the split parent. */
export function effectivePitchDate(snap: Snapshot, b: Batch): string {
  if (b.pitch_date) return b.pitch_date
  const parent = b.parent_batch_id ? snap.batches.find((x) => x.id === b.parent_batch_id) : null
  return parent?.pitch_date ?? b.batch_date
}

export const ACTIVE_STAGES: BatchStage[] = [
  'Prepared',
  'Primary Fermentation',
  'Secondary / Clearing',
  'Stabilizing',
  'Aging',
  'Ready to Package',
  'Bottle Conditioning',
  'Packaged / Aging',
]

export function isActive(b: Batch): boolean {
  return ACTIVE_STAGES.includes(b.stage)
}

export function stageTone(stage: BatchStage): Tone {
  switch (stage) {
    case 'Primary Fermentation':
      return 'ok'
    case 'Secondary / Clearing':
    case 'Stabilizing':
      return 'info'
    case 'Aging':
    case 'Packaged / Aging':
      return 'accent'
    case 'Split':
      return 'info'
    case 'Ready to Package':
    case 'Bottle Conditioning':
      return 'warn'
    case 'Finished':
    case 'Archived':
    case 'Planning':
    case 'Prepared':
    default:
      return 'neutral'
  }
}

export function nextBatchCode(snap: Snapshot, beverage: string, year = new Date().getFullYear()): string {
  const prefix = beverage.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6) || 'BATCH'
  const re = new RegExp(`^${prefix}-${year}-(\\d+)$`)
  let max = 0
  for (const b of snap.batches) {
    const m = b.batch_code.match(re)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `${prefix}-${year}-${String(max + 1).padStart(3, '0')}`
}

export function bumpVersionName(name: string): string {
  const m = name.match(/^(.*?)(?:\s+v(\d+))?$/i)
  if (!m) return `${name} v2`
  const base = m[1].trim()
  const v = m[2] ? Number(m[2]) + 1 : 2
  return `${base} v${v}`
}
