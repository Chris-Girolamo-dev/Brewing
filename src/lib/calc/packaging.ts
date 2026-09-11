import type { SugarType, VolumeUnit } from '@/lib/types'
import { round } from './fermentation'
import { toFluidOunces, toGallons } from './units'

export interface BottleOption {
  label: string
  sizeOz: number
}

export const BOTTLE_SIZES: BottleOption[] = [
  { label: '12 oz', sizeOz: 12 },
  { label: '16 oz', sizeOz: 16 },
  { label: '22 oz', sizeOz: 22 },
  { label: '500 mL', sizeOz: 16.907 },
  { label: '750 mL', sizeOz: 25.36 },
]

/** Whole bottles that can be filled from a packaged volume (floor). */
export function bottlesFromVolume(volume: number, unit: VolumeUnit, bottleSizeOz: number): number {
  if (bottleSizeOz <= 0) return 0
  return Math.floor(toFluidOunces(volume, unit) / bottleSizeOz + 1e-9)
}

export function bottleBreakdown(volume: number, unit: VolumeUnit): { label: string; count: number }[] {
  return BOTTLE_SIZES.map((b) => ({ label: b.label, count: bottlesFromVolume(volume, unit, b.sizeOz) }))
}

/**
 * Residual CO₂ (volumes) already dissolved in beer/cider at a given temperature in °F.
 * Standard empirical fit used by most homebrew priming calculators.
 */
export function residualCo2(tempF: number): number {
  return 3.0378 - 0.050062 * tempF + 0.00026555 * tempF * tempF
}

/**
 * Priming sugar in grams. Sucrose: 15.195 g per gallon per volume of CO₂ added.
 * Dextrose (corn sugar) is ~91% as fermentable by weight, so it needs more.
 * Always computed from the ACTUAL packaged volume.
 */
export function primingSugarGrams(
  volume: number,
  unit: VolumeUnit,
  tempF: number,
  targetCo2: number,
  sugar: SugarType
): number {
  const gallons = toGallons(volume, unit)
  const needed = Math.max(0, targetCo2 - residualCo2(tempF))
  const sucrose = 15.195 * gallons * needed
  const grams = sugar === 'dextrose' ? sucrose / 0.91 : sucrose
  return round(grams, 1)
}

export function gramsToOunces(g: number): number {
  return round(g / 28.349523125, 2)
}
