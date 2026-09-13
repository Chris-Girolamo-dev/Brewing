// Common cider / mead / wine / ale strains for the yeast picker. Free-text entry stays
// available for anything not listed.
export interface YeastPreset {
  manufacturer: string
  strain: string
  note: string
}

export const COMMON_YEASTS: YeastPreset[] = [
  { manufacturer: 'Lalvin', strain: 'K1-V1116', note: 'Vigorous, clean, 18% tol.' },
  { manufacturer: 'Lalvin', strain: 'ICV-D47', note: 'Mead/white wine, keep under 70°F' },
  { manufacturer: 'Lalvin', strain: '71B', note: 'Fruit-forward, softens malic acid' },
  { manufacturer: 'Lalvin', strain: 'EC-1118', note: 'Champagne, bone dry, 18% tol.' },
  { manufacturer: 'Lalvin', strain: 'QA23', note: 'Aromatic, low nutrient need' },
  { manufacturer: 'Lalvin', strain: 'RC-212', note: 'Red wine, color retention' },
  { manufacturer: 'Red Star', strain: 'Premier Blanc', note: 'Champagne-type, dry' },
  { manufacturer: 'Red Star', strain: 'Premier Cuvée', note: 'Fast, neutral, dry' },
  { manufacturer: 'Red Star', strain: 'Côte des Blancs', note: 'Slower, fruity, semi-sweet' },
  { manufacturer: 'Fermentis', strain: 'SafAle S-04', note: 'English ale, quick flocculation' },
  { manufacturer: 'Fermentis', strain: 'SafAle US-05', note: 'Clean American ale' },
  { manufacturer: 'Fermentis', strain: 'SafCider AC-4', note: 'Crisp, dry cider' },
  { manufacturer: 'Fermentis', strain: 'SafCider AB-1', note: 'Fruity cider, retains sweetness' },
  { manufacturer: 'Lallemand', strain: 'Nottingham', note: 'Neutral ale, wide temp range' },
  { manufacturer: 'Mangrove Jack', strain: 'M02 Cider', note: 'Fruity, high ester cider' },
  { manufacturer: 'Wyeast', strain: '4184 Sweet Mead', note: 'Leaves residual sweetness' },
  { manufacturer: 'White Labs', strain: 'WLP720 Sweet Mead', note: 'Fruity, moderate attenuation' },
]

export const CUSTOM = '__custom__'

export function presetKey(p: { manufacturer: string | null; strain: string }): string {
  return `${(p.manufacturer ?? '').trim()}|${p.strain.trim()}`.toLowerCase()
}

export function findPreset(manufacturer: string | null, strain: string): YeastPreset | undefined {
  const key = presetKey({ manufacturer, strain })
  const byBoth = COMMON_YEASTS.find((p) => presetKey(p) === key)
  if (byBoth) return byBoth
  // Match on strain alone (e.g. "71B" with manufacturer blank or "Lalvin 71B-1122").
  const s = strain.trim().toLowerCase()
  return COMMON_YEASTS.find((p) => p.strain.toLowerCase() === s || s.startsWith(p.strain.toLowerCase()))
}

/** Timeline summary for a pitch: "Lalvin K1-V1116 · 5 g". */
export function yeastLabel(y: { manufacturer: string | null; strain: string; amount?: number | null; unit?: string | null }, extra?: string): string {
  const name = `${y.manufacturer ?? ''} ${y.strain}`.trim()
  const amt = y.amount != null ? ` · ${y.amount} ${y.unit ?? 'g'}` : ''
  return `${name}${amt}${extra ? ` · ${extra}` : ''}`
}
