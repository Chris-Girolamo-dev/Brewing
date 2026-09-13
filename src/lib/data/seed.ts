// Reference data: the three real batches from the spec (§32) plus starter vessels and
// package profiles. Values marked PLACEHOLDER are taken from the spec's examples and
// should be replaced with the paper notes; everything is editable in-app.
//
// IDs are fixed so the SQL seed generated from this file is deterministic.
// Relative imports only: scripts/gen-seed-sql.ts runs this under plain Node.

import type {
  Batch,
  BatchEvent,
  BatchIngredient,
  Measurement,
  NutrientAddition,
  PackageProfile,
  Reminder,
  Snapshot,
  Transfer,
  Vessel,
  Yeast,
} from '../types.ts'
import { emptySnapshot } from '../types.ts'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const T = '2026-09-11T12:00:00.000Z' // seed "created_at"; the app treats this as history.
const d = (iso: string) => `${iso}T17:00:00.000Z`

// Vessels are TYPES, not individual containers: several batches may share one entry.
const V = {
  jar: id(1),
  carboy5: id(4),
  carboy65: id(5),
  bucket65: id(6),
  jug: id(7),
}
const B = { mead: id(100), bcider: id(101), acider: id(102) }
const P = { bomber: id(200), wine750: id(201), swing16: id(202) }

export function buildSeed(): Snapshot {
  const s = emptySnapshot()

  s.vessels = [
    vessel(V.jar, '1-Gallon Glass Jar', 'Jar', 1, 'gal', 'Glass'),
    vessel(V.jug, '1.5-Gallon Jug', 'Jar', 1.5, 'gal', 'Glass'),
    vessel(V.carboy5, '5-Gallon Carboy', 'Carboy', 5, 'gal', 'Glass'),
    vessel(V.carboy65, '6.5-Gallon Carboy', 'Carboy', 6.5, 'gal', 'Glass'),
    vessel(V.bucket65, '6.5-Gallon Bucket', 'Bucket', 6.5, 'gal', 'HDPE'),
  ]

  s.package_profiles = [
    profile(P.bomber, '22 oz amber bomber', 'Crown-cap beer bottle', 22, 'oz', '26 mm crown cap'),
    profile(P.wine750, '750 mL wine bottle', 'Still wine bottle', 750, 'mL', 'Cork'),
    profile(P.swing16, '16 oz swing-top', 'Swing-top bottle', 16, 'oz', 'Swing top'),
  ]

  // ---------------------------------------------------------------- MEAD-2026-001
  const meadPitch = d('2026-08-30')
  s.batches.push(
    batch({
      id: B.mead,
      batch_code: 'MEAD-2026-001',
      name: 'Blueberry Mead',
      beverage_type: 'Melomel',
      style: 'Blueberry melomel',
      batch_date: '2026-08-30',
      pitch_date: meadPitch,
      target_volume: 1,
      volume_unit: 'gal',
      goal: 'Semi-dry',
      stage: 'Primary Fermentation',
      og: 1.12,
      current_vessel_id: V.jar,
      notes: 'PLACEHOLDER — values from spec examples. Replace with paper notes.',
    })
  )
  s.batch_ingredients.push(
    ing(id(300), B.mead, 'Honey', 'Wildflower honey', 3, 'lb', { addition_stage: 'Primary', added_at: meadPitch }),
    ing(id(301), B.mead, 'Fruit', 'Blueberries', 2, 'lb', { addition_stage: 'Primary', added_at: meadPitch, notes: 'Frozen, thawed' }),
    ing(id(302), B.mead, 'Water', 'Spring water', 0.75, 'gal', { addition_stage: 'Primary', added_at: meadPitch }),
    ing(id(303), B.mead, 'Nutrient', 'Fermaid-O', 5, 'g', { addition_stage: 'Primary', notes: 'Staggered — see nutrient plan' })
  )
  s.yeasts.push(yeast(id(400), B.mead, 'Lalvin', '71B', 5, 'g', meadPitch, { rehydrated: true, rehydration_medium: 'Go-Ferm' }))
  s.nutrient_additions.push(
    nut(id(500), B.mead, 'Fermaid-O', 1, 'Pitch', d('2026-08-30'), 1.5, d('2026-08-30'), 1.5),
    nut(id(501), B.mead, 'Fermaid-O', 2, '24 hr', d('2026-08-31'), 2.0, d('2026-08-31'), 2.0),
    nut(id(502), B.mead, 'Fermaid-O', 3, '48 hr', d('2026-09-01'), 1.5, d('2026-09-01'), 1.5)
  )
  const meadReadings: [string, number, number | null][] = [
    ['2026-08-30', 1.12, 70],
    ['2026-09-02', 1.098, 72],
    ['2026-09-05', 1.06, 71],
    ['2026-09-08', 1.036, 69],
    ['2026-09-10', 1.022, 68],
  ]
  addReadings(s, B.mead, meadReadings, 600, 'Primary Fermentation', V.jar)
  s.batch_events.push(
    ev(id(700), B.mead, meadPitch, 'Batch Created', 'Planning'),
    { ...ev(id(701), B.mead, meadPitch, 'Yeast Pitched', 'Primary Fermentation', 'Rehydrated in Go-Ferm'), title: 'Lalvin 71B · 5 g' },
    ev(id(702), B.mead, d('2026-08-31'), 'Nutrient Addition', 'Primary Fermentation', 'Fermaid-O 2.0 g (24 hr)'),
    ev(id(703), B.mead, d('2026-09-01'), 'Nutrient Addition', 'Primary Fermentation', 'Fermaid-O 1.5 g (48 hr)'),
    ev(id(704), B.mead, d('2026-09-01'), 'Blow-off Installed', 'Primary Fermentation', 'Vigorous fermentation; fruit cap pushing into airlock'),
    ev(id(705), B.mead, d('2026-09-03'), 'Degassed / Swirled', 'Primary Fermentation'),
    ev(id(706), B.mead, d('2026-09-10'), 'Taste Test', 'Primary Fermentation', 'Still slightly sweet')
  )
  s.reminders.push(rem(id(800), B.mead, 'Gravity check', d('2026-09-12')))

  // ---------------------------------------------------------------- CIDER-2026-001
  const bcPitch = d('2026-08-20')
  s.batches.push(
    batch({
      id: B.bcider,
      batch_code: 'CIDER-2026-001',
      name: 'Blueberry Cider',
      beverage_type: 'Cider',
      style: 'Fruit cider',
      batch_date: '2026-08-20',
      pitch_date: bcPitch,
      target_volume: 1,
      volume_unit: 'gal',
      goal: 'Dry',
      stage: 'Secondary / Clearing',
      og: 1.042,
      fg: 0.997,
      fg_confirmed_at: d('2026-08-29'),
      fermentation_complete_at: d('2026-08-29'),
      current_vessel_id: V.jar,
      notes: 'PLACEHOLDER — values from spec comparison example (v1). Replace with paper notes.',
    })
  )
  s.batch_ingredients.push(
    ing(id(310), B.bcider, 'Juice', 'Apple juice', 1, 'gal', { addition_stage: 'Primary', added_at: bcPitch, notes: 'No preservatives' }),
    ing(id(311), B.bcider, 'Fruit', 'Blueberries', 2, 'lb', { addition_stage: 'Primary', added_at: bcPitch }),
    ing(id(312), B.bcider, 'Fining Agent', 'Bentonite', 1, 'tsp', { addition_stage: 'Secondary', added_at: d('2026-09-06') })
  )
  s.yeasts.push(yeast(id(410), B.bcider, 'Lalvin', '71B', 5, 'g', bcPitch, { rehydrated: false }))
  addReadings(
    s,
    B.bcider,
    [
      ['2026-08-20', 1.042, 68],
      ['2026-08-23', 1.02, 70],
      ['2026-08-26', 1.0, 69],
      ['2026-08-29', 0.997, 68],
      ['2026-09-05', 0.997, 67],
    ],
    610,
    'Primary Fermentation',
    V.jar
  )
  s.batch_transfers.push(
    xfer(id(900), B.bcider, d('2026-09-06'), V.jar, V.jar, 128, 125, 'oz', 'Auto-siphon', 'Remove from lees / fruit', 'Clear, minimal sediment')
  )
  s.batch_events.push(
    ev(id(710), B.bcider, bcPitch, 'Batch Created', 'Planning'),
    { ...ev(id(711), B.bcider, bcPitch, 'Yeast Pitched', 'Primary Fermentation'), title: 'Lalvin 71B · 5 g' },
    ev(id(712), B.bcider, d('2026-08-24'), 'Punch Down', 'Primary Fermentation'),
    ev(id(713), B.bcider, d('2026-08-29'), 'Fermentation Complete', 'Primary Fermentation', 'FG 0.997 confirmed'),
    ev(id(714), B.bcider, d('2026-09-06'), 'Racked', 'Secondary / Clearing', 'Racked to a clean 1-gal jar, 128 → 125 oz'),
    ev(id(715), B.bcider, d('2026-09-06'), 'Fining Added', 'Secondary / Clearing', 'Bentonite 1 tsp')
  )
  s.reminders.push(rem(id(810), B.bcider, 'Check clarity; rack off bentonite', d('2026-09-14')))

  // ---------------------------------------------------------------- CIDER-2026-002
  // Reality as of 2026-09-12: still in primary in the 5-gal carboy. Plan: rack and split into
  // 3 × 1.5 gal sub-lots (1.5 g ginger / 2.5 g ginger / control).
  const acPitch = d('2026-08-30')
  s.batches.push(
    batch({
      id: B.acider,
      batch_code: 'CIDER-2026-002',
      name: '5-Gallon Apple Cider',
      beverage_type: 'Cider',
      style: 'Dry cider',
      batch_date: '2026-08-30',
      pitch_date: acPitch,
      target_volume: 5,
      volume_unit: 'gal',
      goal: 'Dry',
      stage: 'Primary Fermentation',
      og: 1.05,
      current_vessel_id: V.carboy5,
      notes: 'PLACEHOLDER gravity readings — replace with paper notes. Plan: rack and split into 3 × 1.5 gal (1.5 g ginger / 2.5 g ginger / control).',
    })
  )
  s.batch_ingredients.push(
    ing(id(320), B.acider, 'Juice', 'Apple juice', 5, 'gal', { addition_stage: 'Primary', added_at: acPitch }),
    ing(id(321), B.acider, 'Nutrient', 'Fermaid-O', 5, 'g', { addition_stage: 'Primary', added_at: acPitch })
  )
  s.yeasts.push(yeast(id(420), B.acider, 'Lalvin', 'K1-V1116', 5, 'g', acPitch, { rehydrated: true, rehydration_medium: 'Water' }))
  addReadings(
    s,
    B.acider,
    [
      ['2026-08-30', 1.05, 66],
      ['2026-09-03', 1.032, 68],
      ['2026-09-07', 1.016, 67],
      ['2026-09-10', 1.008, 66],
    ],
    620,
    'Primary Fermentation',
    V.carboy5
  )
  s.batch_events.push(
    ev(id(720), B.acider, acPitch, 'Batch Created', 'Planning'),
    { ...ev(id(721), B.acider, acPitch, 'Yeast Pitched', 'Primary Fermentation', 'Rehydrated in water'), title: 'Lalvin K1-V1116 · 5 g' }
  )
  s.reminders.push(rem(id(821), B.acider, 'Rack and split into 3 × 1.5 gal: 1.5 g ginger / 2.5 g ginger / control', d('2026-09-19')))

  return s
}

// ---- row builders --------------------------------------------------------------

function vessel(id: string, name: string, type: string, capacity: number, unit: Vessel['capacity_unit'], material: string): Vessel {
  return { id, name, type, capacity, capacity_unit: unit, material, notes: null, created_at: T }
}

function profile(
  id: string,
  name: string,
  package_type: PackageProfile['package_type'],
  size: number,
  unit: PackageProfile['size_unit'],
  closure: string
): PackageProfile {
  return { id, name, package_type, container_size: size, size_unit: unit, closure, created_at: T }
}

function batch(b: Partial<Batch> & Pick<Batch, 'id' | 'batch_code' | 'name' | 'beverage_type' | 'batch_date'>): Batch {
  return {
    style: null,
    recipe_id: null,
    pitch_date: null,
    target_volume: null,
    volume_unit: 'gal',
    goal: null,
    stage: 'Planning',
    og: null,
    fg: null,
    fg_confirmed_at: null,
    fermentation_complete_at: null,
    current_vessel_id: null,
    notes: null,
    parent_batch_id: null,
    lot_label: null,
    split_at: null,
    created_at: T,
    updated_at: T,
    ...b,
  }
}

function ing(
  id: string,
  batch_id: string,
  category: BatchIngredient['category'],
  name: string,
  amount: number,
  unit: BatchIngredient['unit'],
  extra: Partial<BatchIngredient> = {}
): BatchIngredient {
  return {
    id,
    batch_id,
    category,
    name,
    amount,
    unit,
    brand: null,
    variety: null,
    lot: null,
    addition_stage: null,
    added_at: null,
    removed_at: null,
    oak_toast: null,
    oak_form: null,
    notes: null,
    created_at: T,
    ...extra,
  }
}

function yeast(
  id: string,
  batch_id: string,
  manufacturer: string,
  strain: string,
  amount: number,
  unit: Yeast['unit'],
  pitched_at: string,
  extra: Partial<Yeast> = {}
): Yeast {
  return {
    id,
    batch_id,
    manufacturer,
    strain,
    amount,
    unit,
    pitched_at,
    rehydrated: false,
    rehydration_temp: null,
    rehydration_temp_unit: null,
    rehydration_minutes: null,
    rehydration_medium: null,
    lot: null,
    expiration: null,
    notes: null,
    created_at: T,
    ...extra,
  }
}

function nut(
  id: string,
  batch_id: string,
  nutrient: string,
  n: number,
  point: string,
  planned_at: string,
  planned_amount: number,
  actual_at: string | null,
  actual_amount: number | null
): NutrientAddition {
  return {
    id,
    batch_id,
    nutrient,
    addition_number: n,
    planned_at,
    planned_point: point,
    planned_amount,
    actual_at,
    actual_amount,
    unit: 'g',
    notes: null,
    created_at: T,
  }
}

function ev(id: string, batch_id: string, occurred_at: string, type: BatchEvent['type'], stage: BatchEvent['stage'], notes?: string): BatchEvent {
  return { id, batch_id, occurred_at, type, stage, vessel_id: null, title: null, notes: notes ?? null, created_at: T }
}

function rem(id: string, batch_id: string, title: string, due_at: string): Reminder {
  return { id, batch_id, title, due_at, done: false, created_at: T }
}

function xfer(
  id: string,
  batch_id: string,
  transferred_at: string,
  from: string,
  to: string,
  before: number,
  after: number,
  unit: Transfer['volume_unit'],
  method: string,
  reason: string,
  notes: string | null
): Transfer {
  return {
    id,
    batch_id,
    event_id: null,
    transferred_at,
    from_vessel_id: from,
    to_vessel_id: to,
    to_batch_id: null,
    volume_before: before,
    volume_after: after,
    volume_unit: unit,
    method,
    reason,
    headspace: null,
    notes,
    created_at: T,
  }
}

function addReadings(
  s: Snapshot,
  batch_id: string,
  rows: [string, number, number | null][],
  base: number,
  stage: Measurement['stage'],
  vessel_id: string
) {
  rows.forEach(([day, sgv, temp], i) => {
    const at = d(day)
    const evId = id(base * 10 + i)
    s.batch_events.push({ ...ev(evId, batch_id, at, 'Gravity Reading', stage), title: `SG ${sgv.toFixed(3)}${temp != null ? ` · ${temp}°F` : ''}` })
    s.batch_measurements.push({
      id: id(base * 10 + i + 5000),
      batch_id,
      event_id: evId,
      measured_at: at,
      type: 'sg',
      value: sgv,
      unit: 'SG',
      stage,
      vessel_id,
      notes: null,
      created_at: T,
    })
    if (temp != null) {
      s.batch_measurements.push({
        id: id(base * 10 + i + 6000),
        batch_id,
        event_id: evId,
        measured_at: at,
        type: 'temp',
        value: temp,
        unit: 'F',
        stage,
        vessel_id,
        notes: null,
        created_at: T,
      })
    }
  })
}
