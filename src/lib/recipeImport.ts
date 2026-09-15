// Recipe extraction from a photo / PDF of a recipe or SOP page. The schema is what Claude is
// asked to fill via structured outputs; toRecipe() maps it onto the app's Recipe row.
// Structured outputs allow at most 16 nullable/union fields per schema, so optional text is an
// empty string and only numbers and a few enums are nullable (10 today).
import { z } from 'zod'
import {
  ADDITION_STAGES,
  BEVERAGE_TYPES,
  FERMENTATION_GOALS,
  INGREDIENT_CATEGORIES,
  INGREDIENT_UNITS,
  VOLUME_UNITS,
  type Recipe,
  type RecipeIngredient,
  type RecipeYeast,
} from '@/lib/types'

export const ExtractedRecipeSchema = z.object({
  name: z.string().describe('Recipe title as written, e.g. "Elderberry Mead"'),
  beverage_type: z.enum(BEVERAGE_TYPES),
  style: z.string().describe('Short style/subtype, e.g. "Elderberry melomel". Empty string if not stated.'),
  description: z.string().describe('One-line flavour description if the page has one, else empty string.'),
  target_volume: z.number().nullable().describe('Batch volume if stated. Null if not stated; do not guess.'),
  volume_unit: z.enum(VOLUME_UNITS).describe('Unit for target_volume. Use gal when no volume is stated.'),
  goal: z.enum(FERMENTATION_GOALS).nullable().describe('Dry / Semi-dry / Sweet / Still / Sparkling if implied, else null.'),
  ingredients: z.array(
    z.object({
      category: z.enum(INGREDIENT_CATEGORIES),
      name: z.string().describe('Ingredient as written, without the quantity.'),
      amount: z.number().nullable(),
      unit: z.enum(INGREDIENT_UNITS).nullable(),
      addition_stage: z.enum(ADDITION_STAGES).describe('Primary for day-of-batching items; Stabilization / Backsweetening / Aging for post-fermentation items.'),
      notes: z.string().describe('Qualifiers such as "or similar", "to taste", "topped to volume". Empty string if none.'),
    })
  ),
  yeasts: z.array(
    z.object({
      manufacturer: z.string().describe('Maker, e.g. Lalvin, Red Star, Fermentis. Empty string if unknown.'),
      strain: z.string(),
      amount: z.number().nullable(),
      unit: z.enum(['g', 'packet']).describe('g unless the page says packet/sachet.'),
    })
  ),
  steps: z.array(z.string()).describe('Procedure steps in order, one sentence each, references to other pages removed.'),
  batch_details: z.object({
    og: z.number().nullable().describe('Starting / original gravity if stated, as SG like 1.116'),
    fg: z.number().nullable().describe('Final gravity if stated'),
    abv: z.number().nullable().describe('ABV percent if stated'),
    primary_days: z.number().nullable().describe('Time in primary converted to days'),
    aging_days: z.number().nullable().describe('Aging time converted to days'),
    tasting_notes: z.string().describe('Empty string if none.'),
  }),
  notes: z.string().describe('Author batch notes, warnings, and anything else useful that does not fit above. Empty string if none.'),
})

export type ExtractedRecipe = z.infer<typeof ExtractedRecipeSchema>

export const EXTRACTION_SYSTEM = `You read photos and PDFs of home-fermentation recipes and standard operating procedures (cider, mead, melomel, wine, beer, kombucha) and transcribe them into structured data.

Rules:
- Transcribe what is on the page. Do not invent quantities, volumes, or gravities that are not written.
- Ingredients: one entry per line item. Keep the author's unit (lbs → lb, grams → g, tsp, gal, L). "Topped with water" is a Water ingredient with amount null.
- Yeast lines belong in yeasts, not ingredients. "K1-V1116 yeast or similar" → manufacturer "Lalvin", strain "K1-V1116". Nutrient lines such as Fermaid-O are Nutrient ingredients.
- Post-fermentation items ("Stabilizers", "Honey to taste") are ingredients with addition_stage Stabilization or Backsweetening and amount null.
- Beverage type: honey plus fruit → Melomel; honey only → Mead; apple juice → Cider; apple plus honey → Cyser.
- Batch details: pull OG/FG/ABV/time-in-primary/aged/tasting notes from any "batch notes" or "details" section. Convert months to days at 30 days per month.
- Steps: the numbered procedure, trimmed of cross-references like "(refer to Pg. 18)".`

export function toRecipe(x: ExtractedRecipe): Omit<Recipe, 'id' | 'created_at'> {
  const ingredients: RecipeIngredient[] = x.ingredients.map((i) => ({
    category: i.category,
    name: i.name.trim(),
    amount: i.amount,
    unit: i.unit,
    brand: null,
    variety: null,
    addition_stage: i.addition_stage,
    notes: i.notes.trim() || null,
  }))
  const yeasts: RecipeYeast[] = x.yeasts.map((y) => ({
    manufacturer: y.manufacturer.trim() || null,
    strain: y.strain.trim(),
    amount: y.amount,
    unit: y.amount == null ? null : y.unit,
    notes: null,
  }))
  const d = x.batch_details
  const details = [
    d.og != null ? `OG ${d.og.toFixed(3)}` : null,
    d.fg != null ? `FG ${d.fg.toFixed(3)}` : null,
    d.abv != null ? `ABV ${d.abv}%` : null,
    d.primary_days != null ? `Primary ${d.primary_days} days` : null,
    d.aging_days != null ? `Aged ${d.aging_days} days` : null,
    d.tasting_notes.trim() ? `Tasting: ${d.tasting_notes.trim()}` : null,
  ].filter(Boolean)
  const notesParts = [
    x.description.trim() || null,
    details.length ? `Reference batch: ${details.join(' · ')}` : null,
    x.steps.length ? `Procedure:\n${x.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}` : null,
    x.notes.trim() || null,
  ].filter(Boolean)
  return {
    name: x.name.trim(),
    version: 1,
    beverage_type: x.beverage_type,
    style: x.style.trim() || null,
    target_volume: x.target_volume,
    volume_unit: x.volume_unit,
    goal: x.goal,
    ingredients,
    yeasts,
    notes: notesParts.length ? notesParts.join('\n\n') : null,
    source_batch_id: null,
  }
}
