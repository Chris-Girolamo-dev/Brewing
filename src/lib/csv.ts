import type { Preferences, Snapshot } from '@/lib/types'
import { buildBatchView } from '@/lib/derive'
import type { BatchView } from '@/lib/derive'

function csvEscape(v: unknown): string {
  if (v == null) return ''
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  if (!rows.length) return ''
  const cols = columns ?? Object.keys(rows[0])
  return [cols.join(','), ...rows.map((r) => cols.map((c) => csvEscape(r[c])).join(','))].join('\n')
}

export function downloadText(filename: string, text: string, mime = 'text/csv') {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportBatchesCsv(snap: Snapshot, prefs: Preferences) {
  const rows = snap.batches.map((b) => {
    const v = buildBatchView(snap, b, prefs)
    return {
      batch_code: b.batch_code,
      name: b.name,
      beverage_type: b.beverage_type,
      style: b.style,
      stage: b.stage,
      batch_date: b.batch_date,
      pitch_date: b.pitch_date,
      target_volume: b.target_volume,
      volume_unit: b.volume_unit,
      og: v.og,
      latest_sg: v.latestSg?.value,
      fg: b.fg,
      est_abv: v.estAbv,
      final_abv: v.finalAbv,
      attenuation: v.attenuation,
      day: v.dayNumber,
      yeast: v.yeasts.map((y) => `${y.manufacturer ?? ''} ${y.strain}`.trim()).join('; '),
      ingredients: v.ingredients.map((i) => `${i.name}${i.amount != null ? ` ${i.amount} ${i.unit ?? ''}` : ''}`.trim()).join('; '),
      avg_rating: v.avgRating,
      notes: b.notes,
    }
  })
  downloadText(`batches-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows))
}

/** Full batch export: one CSV per child table zipped into a single multi-section text file. */
export function exportBatchCsv(view: BatchView) {
  const sections: [string, Record<string, unknown>[]][] = [
    ['batch', [view.batch as unknown as Record<string, unknown>]],
    ['ingredients', view.ingredients as unknown as Record<string, unknown>[]],
    ['yeasts', view.yeasts as unknown as Record<string, unknown>[]],
    ['events', view.events as unknown as Record<string, unknown>[]],
    ['measurements', view.measurements as unknown as Record<string, unknown>[]],
    ['transfers', view.transfers as unknown as Record<string, unknown>[]],
    ['nutrient_additions', view.nutrients as unknown as Record<string, unknown>[]],
    ['stabilizations', view.stabilizations as unknown as Record<string, unknown>[]],
    ['backsweetening', view.backsweetenings as unknown as Record<string, unknown>[]],
    ['packaging', view.packagings as unknown as Record<string, unknown>[]],
    ['tastings', view.tastings as unknown as Record<string, unknown>[]],
  ]
  const text = sections
    .filter(([, rows]) => rows.length)
    .map(([name, rows]) => `# ${name}\n${toCsv(rows)}`)
    .join('\n\n')
  downloadText(`${view.batch.batch_code}.csv`, text)
}

export function exportMeasurementsCsv(view: BatchView) {
  const rows = [...view.measurements]
    .sort((a, b) => a.measured_at.localeCompare(b.measured_at))
    .map((m) => ({ measured_at: m.measured_at, type: m.type, value: m.value, unit: m.unit, stage: m.stage, notes: m.notes }))
  downloadText(`${view.batch.batch_code}-measurements.csv`, toCsv(rows))
}
