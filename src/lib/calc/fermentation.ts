import { differenceInCalendarDays, differenceInMilliseconds } from 'date-fns'
import type { Measurement } from '@/lib/types'

/** Estimated ABV from OG and current SG: (OG − SG) × 131.25. */
export function estimatedAbv(og: number | null | undefined, sg: number | null | undefined): number | null {
  if (og == null || sg == null) return null
  return round((og - sg) * 131.25, 1)
}

/** Apparent attenuation, percent. */
export function apparentAttenuation(og: number | null | undefined, fg: number | null | undefined): number | null {
  if (og == null || fg == null || og <= 1) return null
  return round(((og - fg) / (og - 1)) * 100, 1)
}

/** Brix to SG (standard polynomial). */
export function brixToSg(brix: number): number {
  return round(brix / (258.6 - (brix / 258.2) * 227.1) + 1, 3)
}

export function sgToBrix(sg: number): number {
  return round(-668.962 + 1262.45 * sg - 776.43 * sg * sg + 182.94 * sg * sg * sg, 1)
}

export function daysBetween(from: string | Date | null | undefined, to: string | Date = new Date()): number | null {
  if (!from) return null
  return differenceInCalendarDays(new Date(to), new Date(from))
}

export function yieldPercent(packagedLiters: number | null, startingLiters: number | null): number | null {
  if (packagedLiters == null || startingLiters == null || startingLiters <= 0) return null
  return round((packagedLiters / startingLiters) * 100, 1)
}

export function transferLoss(before: number | null, after: number | null): number | null {
  if (before == null || after == null) return null
  return round(before - after, 2)
}

export interface StabilityResult {
  stable: boolean
  latest: Measurement | null
  compared: Measurement | null
  spanDays: number | null
  delta: number | null
}

/**
 * Gravity is "apparently stable" when the latest SG reading and an earlier reading taken
 * at least `minDays` before it differ by no more than `tolerance`. This never declares
 * fermentation complete on its own; the user confirms FG explicitly.
 */
export function gravityStability(readings: Measurement[], minDays = 3, tolerance = 0.001): StabilityResult {
  const sg = readings
    .filter((m) => m.type === 'sg')
    .slice()
    .sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime())
  const none: StabilityResult = { stable: false, latest: null, compared: null, spanDays: null, delta: null }
  if (sg.length < 2) return { ...none, latest: sg[sg.length - 1] ?? null }
  const latest = sg[sg.length - 1]
  const latestT = new Date(latest.measured_at).getTime()
  const minMs = minDays * 86_400_000
  // Earliest reading that is at least minDays before the latest, walking backwards to
  // find the closest qualifying one.
  for (let i = sg.length - 2; i >= 0; i--) {
    const m = sg[i]
    const span = latestT - new Date(m.measured_at).getTime()
    if (span >= minMs) {
      const delta = Math.abs(latest.value - m.value)
      return {
        stable: delta <= tolerance + 1e-9,
        latest,
        compared: m,
        spanDays: round(span / 86_400_000, 1),
        delta: round(delta, 3),
      }
    }
  }
  const compared = sg[sg.length - 2]
  return {
    stable: false,
    latest,
    compared,
    spanDays: round(differenceInMilliseconds(latestT, new Date(compared.measured_at)) / 86_400_000, 1),
    delta: round(Math.abs(latest.value - compared.value), 3),
  }
}

export function latestOfType(readings: Measurement[], type: Measurement['type']): Measurement | null {
  let best: Measurement | null = null
  for (const m of readings) {
    if (m.type !== type) continue
    if (!best || new Date(m.measured_at) > new Date(best.measured_at)) best = m
  }
  return best
}

export function firstOfType(readings: Measurement[], type: Measurement['type']): Measurement | null {
  let best: Measurement | null = null
  for (const m of readings) {
    if (m.type !== type) continue
    if (!best || new Date(m.measured_at) < new Date(best.measured_at)) best = m
  }
  return best
}

export function round(n: number, digits: number): number {
  const f = 10 ** digits
  return Math.round(n * f) / f
}
