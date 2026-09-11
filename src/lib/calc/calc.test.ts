import { describe, expect, it } from 'vitest'
import { apparentAttenuation, brixToSg, estimatedAbv, gravityStability, transferLoss, yieldPercent } from './fermentation'
import { bottleBreakdown, bottlesFromVolume, primingSugarGrams, residualCo2 } from './packaging'
import { convertMass, convertTemp, convertVolume, formatVolume, toLiters } from './units'
import type { Measurement } from '@/lib/types'

const sg = (measured_at: string, value: number): Measurement => ({
  id: measured_at,
  batch_id: 'b',
  event_id: null,
  measured_at,
  type: 'sg',
  value,
  unit: 'SG',
  stage: null,
  vessel_id: null,
  notes: null,
  created_at: measured_at,
})

describe('fermentation', () => {
  it('estimates ABV', () => {
    expect(estimatedAbv(1.12, 1.022)).toBe(12.9)
    expect(estimatedAbv(1.042, 0.997)).toBe(5.9)
    expect(estimatedAbv(null, 1.0)).toBeNull()
  })
  it('apparent attenuation', () => {
    expect(apparentAttenuation(1.05, 1.01)).toBe(80)
  })
  it('brix to sg', () => {
    expect(brixToSg(12)).toBeCloseTo(1.048, 3)
  })
  it('yield and loss', () => {
    expect(yieldPercent(3.7, 3.785)).toBe(97.8)
    expect(transferLoss(128, 125)).toBe(3)
  })
  it('detects stable gravity only across the interval', () => {
    const readings = [sg('2026-09-01T12:00:00Z', 1.02), sg('2026-09-03T12:00:00Z', 1.0), sg('2026-09-07T12:00:00Z', 1.0)]
    const r = gravityStability(readings, 3, 0.001)
    expect(r.stable).toBe(true)
    expect(r.compared?.value).toBe(1.0)
    expect(r.spanDays).toBe(4)
  })
  it('is not stable when readings are too close in time', () => {
    const readings = [sg('2026-09-01T12:00:00Z', 1.0), sg('2026-09-02T12:00:00Z', 1.0)]
    expect(gravityStability(readings, 3).stable).toBe(false)
  })
  it('is not stable when gravity is still dropping', () => {
    const readings = [sg('2026-09-01T12:00:00Z', 1.02), sg('2026-09-08T12:00:00Z', 1.01)]
    expect(gravityStability(readings, 3).stable).toBe(false)
  })
})

describe('packaging', () => {
  it('counts bottles from 125 oz', () => {
    const b = Object.fromEntries(bottleBreakdown(125, 'oz').map((x) => [x.label, x.count]))
    expect(b['12 oz']).toBe(10)
    expect(b['16 oz']).toBe(7)
    expect(b['22 oz']).toBe(5)
    expect(b['750 mL']).toBe(4)
    expect(bottlesFromVolume(5, 'gal', 22)).toBe(29)
  })
  it('residual co2 at 68F is about 0.85 volumes', () => {
    expect(residualCo2(68)).toBeCloseTo(0.86, 1)
  })
  it('priming sugar: 5 gal at 68F to 2.5 vol needs ~125 g sucrose', () => {
    const g = primingSugarGrams(5, 'gal', 68, 2.5, 'sucrose')
    expect(g).toBeGreaterThan(120)
    expect(g).toBeLessThan(130)
    expect(primingSugarGrams(5, 'gal', 68, 2.5, 'dextrose')).toBeGreaterThan(g)
  })
  it('never returns negative sugar', () => {
    expect(primingSugarGrams(1, 'gal', 40, 0.5, 'sucrose')).toBe(0)
  })
})

describe('units', () => {
  it('volume conversions', () => {
    expect(toLiters(1, 'gal')).toBeCloseTo(3.785, 3)
    expect(convertVolume(128, 'oz', 'gal')).toBeCloseTo(1, 6)
    expect(convertVolume(750, 'mL', 'oz')).toBeCloseTo(25.36, 2)
  })
  it('mass conversions', () => {
    expect(convertMass(2.5, 'lb', 'g')).toBeCloseTo(1133.98, 1)
    expect(convertMass(1, 'tsp', 'g')).toBeNull()
  })
  it('temperature', () => {
    expect(convertTemp(68, 'F', 'C')).toBeCloseTo(20, 6)
    expect(convertTemp(20, 'C', 'F')).toBe(68)
  })
  it('formatVolume respects preference and scale', () => {
    expect(formatVolume(1, 'gal', 'us')).toBe('1 gal')
    expect(formatVolume(1, 'gal', 'metric')).toBe('3.79 L')
    expect(formatVolume(22, 'oz', 'us')).toBe('22 oz')
    expect(formatVolume(750, 'mL', 'us')).toBe('25 oz')
  })
})
