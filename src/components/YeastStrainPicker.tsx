'use client'

import * as React from 'react'
import { Input, Select } from '@/components/ui/Input'
import { COMMON_YEASTS, CUSTOM, findPreset } from '@/lib/yeasts'

/**
 * Dropdown of common strains that fills manufacturer + strain together, with a Custom
 * option that reveals free-text fields. Anything already stored that is not in the list
 * shows as Custom with its text intact.
 */
export function YeastStrainPicker({
  manufacturer,
  strain,
  onChange,
  autoFocus,
}: {
  manufacturer: string | null
  strain: string
  onChange: (v: { manufacturer: string | null; strain: string }) => void
  autoFocus?: boolean
}) {
  const preset = strain ? findPreset(manufacturer, strain) : undefined
  const [custom, setCustom] = React.useState(() => Boolean(strain) && !preset)
  React.useEffect(() => {
    if (strain && !preset) setCustom(true)
  }, [strain, preset])
  const value = custom ? CUSTOM : preset ? `${preset.manufacturer}|${preset.strain}` : ''

  return (
    <div className="grid grid-cols-1 gap-2">
      <Select
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => {
          const v = e.target.value
          if (v === CUSTOM) {
            setCustom(true)
            return
          }
          setCustom(false)
          if (!v) {
            onChange({ manufacturer: null, strain: '' })
            return
          }
          const [m, s] = v.split('|')
          onChange({ manufacturer: m, strain: s })
        }}
      >
        <option value="">Choose a strain…</option>
        {COMMON_YEASTS.map((p) => (
          <option key={`${p.manufacturer}|${p.strain}`} value={`${p.manufacturer}|${p.strain}`}>
            {p.manufacturer} {p.strain} — {p.note}
          </option>
        ))}
        <option value={CUSTOM}>Custom / not listed…</option>
      </Select>
      {custom && (
        <div className="grid grid-cols-2 gap-2">
          <Input value={manufacturer ?? ''} onChange={(e) => onChange({ manufacturer: e.target.value || null, strain })} placeholder="Manufacturer" />
          <Input value={strain} onChange={(e) => onChange({ manufacturer, strain: e.target.value })} placeholder="Strain" autoFocus />
        </div>
      )}
    </div>
  )
}
