import { describe, expect, it } from 'vitest'
import { ExtractedRecipeSchema, toRecipe } from './recipeImport'

describe('recipe import mapping', () => {
  it('maps an extracted elderberry mead onto a Recipe row', () => {
    const parsed = ExtractedRecipeSchema.parse({
      name: 'Elderberry Mead',
      beverage_type: 'Melomel',
      style: 'Elderberry melomel',
      description: 'Dark, bold, and earthy.',
      target_volume: null,
      volume_unit: null,
      goal: null,
      ingredients: [
        { category: 'Honey', name: 'Raw wildflower honey', amount: 1, unit: 'lb', addition_stage: 'Primary', notes: null },
        { category: 'Honey', name: 'Raw buckwheat honey', amount: 2, unit: 'lb', addition_stage: 'Primary', notes: null },
        { category: 'Nutrient', name: 'Fermaid-O', amount: null, unit: null, addition_stage: 'Primary', notes: null },
        { category: 'Fruit', name: 'Elderberries', amount: 70, unit: 'g', addition_stage: 'Primary', notes: null },
        { category: 'Water', name: 'Spring water', amount: null, unit: null, addition_stage: 'Primary', notes: 'Topped to volume' },
        { category: 'Stabilizer', name: 'Stabilizers', amount: null, unit: null, addition_stage: 'Stabilization', notes: null },
        { category: 'Honey', name: 'Honey', amount: null, unit: null, addition_stage: 'Backsweetening', notes: 'To taste' },
      ],
      yeasts: [{ manufacturer: 'Lalvin', strain: 'K1-V1116', amount: null, unit: null }],
      steps: ['Sanitize all equipment.', 'Add honey, fruit, herbs, and water to the fermenter.'],
      batch_details: { og: 1.116, fg: 1.003, abv: 14.8, primary_days: 30, aging_days: 180, tasting_notes: 'Jammy, earthy, tannic, bitter.' },
      notes: 'Some elderberry variants can be toxic raw.',
    })
    const r = toRecipe(parsed)
    expect(r.name).toBe('Elderberry Mead')
    expect(r.beverage_type).toBe('Melomel')
    expect(r.volume_unit).toBe('gal')
    expect(r.ingredients).toHaveLength(7)
    expect(r.ingredients[6].addition_stage).toBe('Backsweetening')
    expect(r.yeasts[0].strain).toBe('K1-V1116')
    expect(r.notes).toContain('OG 1.116')
    expect(r.notes).toContain('Aged 180 days')
    expect(r.notes).toContain('1. Sanitize all equipment.')
  })
  it('rejects unknown categories', () => {
    expect(() =>
      ExtractedRecipeSchema.parse({ name: 'x', beverage_type: 'Mead', style: null, description: null, target_volume: null, volume_unit: null, goal: null, ingredients: [{ category: 'Rocks', name: 'x', amount: null, unit: null, addition_stage: null, notes: null }], yeasts: [], steps: [], batch_details: { og: null, fg: null, abv: null, primary_days: null, aging_days: null, tasting_notes: null }, notes: null })
    ).toThrow()
  })
})
