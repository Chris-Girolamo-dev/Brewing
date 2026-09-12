// Domain types. Field names are snake_case to match the Postgres schema in
// supabase/migrations so rows round-trip through supabase-js without mapping.

export const BEVERAGE_TYPES = ['Cider', 'Mead', 'Melomel', 'Cyser', 'Wine', 'Beer', 'Kombucha', 'Other'] as const
export type BeverageType = (typeof BEVERAGE_TYPES)[number]

export const BATCH_STAGES = [
  'Planning',
  'Prepared',
  'Primary Fermentation',
  'Secondary / Clearing',
  'Stabilizing',
  'Aging',
  'Ready to Package',
  'Bottle Conditioning',
  'Packaged / Aging',
  'Finished',
  'Archived',
  'Split',
] as const
export type BatchStage = (typeof BATCH_STAGES)[number]

export const FERMENTATION_GOALS = ['Dry', 'Semi-dry', 'Sweet', 'Still', 'Sparkling'] as const
export type FermentationGoal = (typeof FERMENTATION_GOALS)[number]

export const VOLUME_UNITS = ['gal', 'L', 'oz', 'mL'] as const
export type VolumeUnit = (typeof VOLUME_UNITS)[number]

export const TEMP_UNITS = ['F', 'C'] as const
export type TempUnit = (typeof TEMP_UNITS)[number]

export const INGREDIENT_UNITS = ['g', 'kg', 'oz', 'lb', 'tsp', 'tbsp', 'mL', 'L', 'gal', 'each', 'packet'] as const
export type IngredientUnit = (typeof INGREDIENT_UNITS)[number]

export const INGREDIENT_CATEGORIES = [
  'Juice',
  'Fruit',
  'Honey',
  'Sugar',
  'Yeast',
  'Nutrient',
  'Acid',
  'Tannin',
  'Spice',
  'Herb',
  'Tea',
  'Water',
  'Fining Agent',
  'Stabilizer',
  'Oak',
  'Flavoring',
  'Other',
] as const
export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number]

export const ADDITION_STAGES = [
  'Primary',
  'Secondary',
  'Stabilization',
  'Backsweetening',
  'Aging',
  'Packaging',
  'Other',
] as const
export type AdditionStage = (typeof ADDITION_STAGES)[number]

export const ACTIVITY_TYPES = [
  'Batch Created',
  'Ingredient Added',
  'Yeast Pitched',
  'Nutrient Addition',
  'Gravity Reading',
  'pH Reading',
  'Temperature Reading',
  'Degassed / Swirled',
  'Punch Down',
  'Blow-off Installed',
  'Airlock Changed',
  'Racked',
  'Stabilized',
  'Pasteurized',
  'Backsweetened',
  'Acid Adjustment',
  'Tannin Adjustment',
  'Oak Added',
  'Oak Removed',
  'Fining Added',
  'Cold Crash Started',
  'Cold Crash Ended',
  'Bottled',
  'Kegged',
  'Taste Test',
  'Problem / Deviation',
  'Fermentation Complete',
  'Stage Changed',
  'Split into Sub-lots',
  'Other',
] as const
export type ActivityType = (typeof ACTIVITY_TYPES)[number]

export const MEASUREMENT_TYPES = ['sg', 'brix', 'ph', 'temp', 'volume'] as const
export type MeasurementType = (typeof MEASUREMENT_TYPES)[number]

export const PACKAGE_TYPES = ['Still wine bottle', 'Crown-cap beer bottle', 'Swing-top bottle', 'PET bottle', 'Keg', 'Other'] as const
export type PackageType = (typeof PACKAGE_TYPES)[number]

export const SUGAR_TYPES = ['sucrose', 'dextrose'] as const
export type SugarType = (typeof SUGAR_TYPES)[number]

// ---- Rows ------------------------------------------------------------------

export interface Batch {
  id: string
  batch_code: string
  name: string
  beverage_type: BeverageType
  style: string | null
  recipe_id: string | null
  batch_date: string // ISO date
  pitch_date: string | null // ISO timestamp
  target_volume: number | null
  volume_unit: VolumeUnit
  goal: FermentationGoal | null
  stage: BatchStage
  og: number | null
  fg: number | null
  fg_confirmed_at: string | null
  fermentation_complete_at: string | null
  current_vessel_id: string | null
  notes: string | null
  parent_batch_id: string | null
  lot_label: string | null
  split_at: string | null
  created_at: string
  updated_at: string
}

export interface BatchIngredient {
  id: string
  batch_id: string
  category: IngredientCategory
  name: string
  amount: number | null
  unit: IngredientUnit | null
  brand: string | null
  variety: string | null
  lot: string | null
  addition_stage: AdditionStage | null
  added_at: string | null
  removed_at: string | null
  oak_toast: string | null
  oak_form: string | null
  notes: string | null
  created_at: string
}

export interface Yeast {
  id: string
  batch_id: string
  manufacturer: string | null
  strain: string
  amount: number | null
  unit: 'g' | 'packet' | null
  pitched_at: string | null
  rehydrated: boolean
  rehydration_temp: number | null
  rehydration_temp_unit: TempUnit | null
  rehydration_minutes: number | null
  rehydration_medium: string | null
  lot: string | null
  expiration: string | null
  notes: string | null
  created_at: string
}

export interface Vessel {
  id: string
  name: string
  type: string | null
  capacity: number | null
  capacity_unit: VolumeUnit
  material: string | null
  notes: string | null
  created_at: string
}

export interface BatchEvent {
  id: string
  batch_id: string
  occurred_at: string
  type: ActivityType
  stage: BatchStage | null
  vessel_id: string | null
  title: string | null
  notes: string | null
  created_at: string
}

export interface Measurement {
  id: string
  batch_id: string
  event_id: string | null
  measured_at: string
  type: MeasurementType
  value: number
  unit: string
  stage: BatchStage | null
  vessel_id: string | null
  notes: string | null
  created_at: string
}

export interface Transfer {
  id: string
  batch_id: string
  event_id: string | null
  transferred_at: string
  from_vessel_id: string | null
  to_vessel_id: string | null
  to_batch_id: string | null
  volume_before: number | null
  volume_after: number | null
  volume_unit: VolumeUnit
  method: string | null
  reason: string | null
  headspace: string | null
  notes: string | null
  created_at: string
}

export interface NutrientAddition {
  id: string
  batch_id: string
  nutrient: string
  addition_number: number
  planned_at: string | null
  planned_point: string | null
  planned_amount: number | null
  actual_at: string | null
  actual_amount: number | null
  unit: IngredientUnit
  notes: string | null
  created_at: string
}

export interface Stabilization {
  id: string
  batch_id: string
  event_id: string | null
  stabilized_at: string
  sg: number | null
  kmeta_amount: number | null
  kmeta_unit: IngredientUnit | null
  sorbate_amount: number | null
  sorbate_unit: IngredientUnit | null
  volume: number | null
  volume_unit: VolumeUnit
  method: string | null
  waiting_days: number | null
  notes: string | null
  created_at: string
}

export interface Backsweetening {
  id: string
  batch_id: string
  event_id: string | null
  sweetened_at: string
  pre_sg: number | null
  sweetener: string
  amount: number | null
  unit: IngredientUnit | null
  volume: number | null
  volume_unit: VolumeUnit
  post_sg: number | null
  taste_result: string | null
  notes: string | null
  created_at: string
}

export interface PackageProfile {
  id: string
  name: string
  package_type: PackageType
  container_size: number | null
  size_unit: VolumeUnit
  closure: string | null
  created_at: string
}

export interface Packaging {
  id: string
  batch_id: string
  event_id: string | null
  packaged_at: string
  pre_sg: number | null
  packaged_volume: number | null
  volume_unit: VolumeUnit
  package_type: PackageType
  container_size: number | null
  size_unit: VolumeUnit
  quantity: number | null
  closure: string | null
  priming_sugar_type: SugarType | null
  priming_sugar_grams: number | null
  target_co2: number | null
  conditioning_temp: number | null
  temp_unit: TempUnit
  conditioning_start: string | null
  expected_ready_at: string | null
  notes: string | null
  created_at: string
}

export interface Tasting {
  id: string
  batch_id: string
  tasted_at: string
  serving_temp: number | null
  temp_unit: TempUnit
  appearance: string | null
  clarity: number | null
  aroma: string | null
  sweetness: number | null
  acidity: number | null
  tannin: number | null
  body: number | null
  carbonation: number | null
  alcohol_heat: number | null
  fruit_character: number | null
  off_flavors: string | null
  overall_notes: string | null
  rating: number | null
  would_make_again: boolean | null
  next_batch_changes: string | null
  created_at: string
}

export interface Reminder {
  id: string
  batch_id: string | null
  title: string
  due_at: string
  done: boolean
  created_at: string
}

export interface RecipeIngredient {
  category: IngredientCategory
  name: string
  amount: number | null
  unit: IngredientUnit | null
  brand: string | null
  variety: string | null
  addition_stage: AdditionStage | null
  notes: string | null
}

export interface RecipeYeast {
  manufacturer: string | null
  strain: string
  amount: number | null
  unit: 'g' | 'packet' | null
  notes: string | null
}

export interface Recipe {
  id: string
  name: string
  version: number
  beverage_type: BeverageType
  style: string | null
  target_volume: number | null
  volume_unit: VolumeUnit
  goal: FermentationGoal | null
  ingredients: RecipeIngredient[]
  yeasts: RecipeYeast[]
  notes: string | null
  source_batch_id: string | null
  created_at: string
}

// ---- Table registry --------------------------------------------------------

export interface Tables {
  batches: Batch
  batch_ingredients: BatchIngredient
  yeasts: Yeast
  vessels: Vessel
  batch_events: BatchEvent
  batch_measurements: Measurement
  batch_transfers: Transfer
  nutrient_additions: NutrientAddition
  stabilizations: Stabilization
  backsweetening_events: Backsweetening
  package_profiles: PackageProfile
  packaging_events: Packaging
  tastings: Tasting
  reminders: Reminder
  recipes: Recipe
}

export type TableName = keyof Tables
export type Row<T extends TableName> = Tables[T]

export const TABLE_NAMES: TableName[] = [
  'batches',
  'batch_ingredients',
  'yeasts',
  'vessels',
  'batch_events',
  'batch_measurements',
  'batch_transfers',
  'nutrient_additions',
  'stabilizations',
  'backsweetening_events',
  'package_profiles',
  'packaging_events',
  'tastings',
  'reminders',
  'recipes',
]

export type Snapshot = { [K in TableName]: Row<K>[] }

export function emptySnapshot(): Snapshot {
  return {
    batches: [],
    batch_ingredients: [],
    yeasts: [],
    vessels: [],
    batch_events: [],
    batch_measurements: [],
    batch_transfers: [],
    nutrient_additions: [],
    stabilizations: [],
    backsweetening_events: [],
    package_profiles: [],
    packaging_events: [],
    tastings: [],
    reminders: [],
    recipes: [],
  }
}

// ---- User preferences (browser-local) --------------------------------------

export type UnitSystem = 'us' | 'metric'

export interface Preferences {
  unit_system: UnitSystem
  stable_gravity_days: number
  stable_gravity_tolerance: number
}

export const DEFAULT_PREFERENCES: Preferences = {
  unit_system: 'us',
  stable_gravity_days: 3,
  stable_gravity_tolerance: 0.001,
}
