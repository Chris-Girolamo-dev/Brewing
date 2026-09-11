import type { IngredientUnit, TempUnit, UnitSystem, VolumeUnit } from '@/lib/types'

// Canonical internal units: litres for volume, grams for mass, Celsius for temp.

const VOLUME_TO_L: Record<VolumeUnit, number> = {
  L: 1,
  mL: 0.001,
  gal: 3.785411784,
  oz: 0.0295735295625,
}

export function toLiters(value: number, unit: VolumeUnit): number {
  return value * VOLUME_TO_L[unit]
}

export function fromLiters(liters: number, unit: VolumeUnit): number {
  return liters / VOLUME_TO_L[unit]
}

export function convertVolume(value: number, from: VolumeUnit, to: VolumeUnit): number {
  return fromLiters(toLiters(value, from), to)
}

export function toGallons(value: number, unit: VolumeUnit): number {
  return convertVolume(value, unit, 'gal')
}

export function toFluidOunces(value: number, unit: VolumeUnit): number {
  return convertVolume(value, unit, 'oz')
}

const MASS_TO_G: Partial<Record<IngredientUnit, number>> = {
  g: 1,
  kg: 1000,
  oz: 28.349523125,
  lb: 453.59237,
}

export function isMassUnit(unit: IngredientUnit | null | undefined): boolean {
  return unit != null && unit in MASS_TO_G
}

export function toGrams(value: number, unit: IngredientUnit): number | null {
  const f = MASS_TO_G[unit]
  return f == null ? null : value * f
}

export function convertMass(value: number, from: IngredientUnit, to: IngredientUnit): number | null {
  const a = MASS_TO_G[from]
  const b = MASS_TO_G[to]
  if (a == null || b == null) return null
  return (value * a) / b
}

export function fToC(f: number): number {
  return ((f - 32) * 5) / 9
}

export function cToF(c: number): number {
  return (c * 9) / 5 + 32
}

export function convertTemp(value: number, from: TempUnit, to: TempUnit): number {
  if (from === to) return value
  return from === 'F' ? fToC(value) : cToF(value)
}

// Display helpers -------------------------------------------------------------

export function preferredVolumeUnit(system: UnitSystem): VolumeUnit {
  return system === 'us' ? 'gal' : 'L'
}

export function preferredSmallVolumeUnit(system: UnitSystem): VolumeUnit {
  return system === 'us' ? 'oz' : 'mL'
}

export function preferredTempUnit(system: UnitSystem): TempUnit {
  return system === 'us' ? 'F' : 'C'
}

export function preferredMassUnit(system: UnitSystem, large = false): IngredientUnit {
  if (system === 'us') return large ? 'lb' : 'oz'
  return large ? 'kg' : 'g'
}

export function formatVolume(value: number | null | undefined, unit: VolumeUnit, system: UnitSystem, digits = 2): string {
  if (value == null) return '—'
  // Small containers stay in oz/mL; batch-scale volumes go to gal/L.
  const liters = toLiters(value, unit)
  const small = liters < 1
  const target = small ? preferredSmallVolumeUnit(system) : preferredVolumeUnit(system)
  const v = fromLiters(liters, target)
  return `${trim(v, small ? 0 : digits)} ${target}`
}

export function formatTemp(value: number | null | undefined, unit: TempUnit, system: UnitSystem): string {
  if (value == null) return '—'
  const target = preferredTempUnit(system)
  return `${Math.round(convertTemp(value, unit, target))}°${target}`
}

export function formatAmount(value: number | null | undefined, unit: IngredientUnit | null | undefined): string {
  if (value == null) return '—'
  return unit ? `${trim(value, 2)} ${unit}` : trim(value, 2)
}

export function formatGravity(sg: number | null | undefined): string {
  return sg == null ? '—' : sg.toFixed(3)
}

export function trim(n: number, digits: number): string {
  const s = n.toFixed(digits)
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s
}
