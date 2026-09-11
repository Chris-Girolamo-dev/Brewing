'use client'

import * as React from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts'
import { differenceInHours } from 'date-fns'
import { Card, FigCaption } from '@/components/ui/Card'
import { SegmentedControl } from '@/components/ui/Tabs'
import type { BatchView } from '@/lib/derive'
import { estimatedAbv } from '@/lib/calc/fermentation'
import { convertTemp, preferredTempUnit } from '@/lib/calc/units'
import { useStore } from '@/lib/store'
import type { TempUnit } from '@/lib/types'

type Overlay = 'none' | 'temp' | 'ph'
type Series = 'sg' | 'abv'

/** Fermentation curve: SG vs days since pitch, optional temperature or pH overlay. */
export function FermentationChart({ view, compact = false }: { view: BatchView; compact?: boolean }) {
  const { prefs } = useStore()
  const [overlay, setOverlay] = React.useState<Overlay>('none')
  const [series, setSeries] = React.useState<Series>('sg')
  const tempUnit = preferredTempUnit(prefs.unit_system)

  const start = view.batch.pitch_date ?? view.batch.batch_date
  const data = React.useMemo(() => {
    const t0 = new Date(start).getTime()
    const rows = new Map<number, { day: number; sg?: number; abv?: number | null; temp?: number; ph?: number }>()
    const dayOf = (iso: string) => Math.round((differenceInHours(new Date(iso), t0) / 24) * 10) / 10
    for (const m of view.measurements) {
      const day = dayOf(m.measured_at)
      const row = rows.get(day) ?? { day }
      if (m.type === 'sg') {
        row.sg = m.value
        row.abv = estimatedAbv(view.og, m.value)
      } else if (m.type === 'temp') row.temp = Math.round(convertTemp(m.value, m.unit as TempUnit, tempUnit))
      else if (m.type === 'ph') row.ph = m.value
      rows.set(day, row)
    }
    return [...rows.values()].sort((a, b) => a.day - b.day)
  }, [view.measurements, view.og, start, tempUnit])

  const hasTemp = data.some((d) => d.temp != null)
  const hasPh = data.some((d) => d.ph != null)
  const sgVals = data.map((d) => d.sg).filter((v): v is number => v != null)
  const sgMin = sgVals.length ? Math.min(...sgVals) - 0.005 : 0.99
  const sgMax = sgVals.length ? Math.max(...sgVals) + 0.005 : 1.1

  if (sgVals.length < 2) {
    return (
      <Card className="p-5">
        <FigCaption>FIG. 01 / FERMENTATION CURVE</FigCaption>
        <div className="mt-6 text-center text-sm text-text-3">Log at least two gravity readings to draw the curve.</div>
      </Card>
    )
  }

  const overlayKey = overlay === 'temp' && hasTemp ? 'temp' : overlay === 'ph' && hasPh ? 'ph' : null

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FigCaption>
          FIG. 01 / {series === 'sg' ? 'GRAVITY' : 'EST. ABV'} · vs DAYS
          {overlayKey ? ` · ${overlayKey === 'temp' ? `°${tempUnit}` : 'pH'}` : ''}
        </FigCaption>
        {!compact && (
          <div className="flex flex-wrap gap-2">
            <SegmentedControl<Series>
              size="xs"
              value={series}
              onChange={setSeries}
              options={[
                { value: 'sg', label: 'SG' },
                { value: 'abv', label: 'ABV' },
              ]}
            />
            <SegmentedControl<Overlay>
              size="xs"
              value={overlay}
              onChange={setOverlay}
              options={[
                { value: 'none', label: 'None' },
                ...(hasTemp ? [{ value: 'temp' as Overlay, label: 'Temp' }] : []),
                ...(hasPh ? [{ value: 'ph' as Overlay, label: 'pH' }] : []),
              ]}
            />
          </div>
        )}
      </div>
      <div className={compact ? 'mt-3 h-40' : 'mt-4 h-64'}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: overlayKey ? 8 : 16, bottom: 0, left: -8 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="day"
              type="number"
              domain={['dataMin', 'dataMax']}
              tick={{ fill: 'var(--text-3)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              axisLine={{ stroke: 'var(--border-2)' }}
              tickLine={false}
              tickFormatter={(v) => `d${v}`}
            />
            <YAxis
              yAxisId="left"
              domain={series === 'sg' ? [sgMin, sgMax] : [0, 'auto']}
              tick={{ fill: 'var(--text-3)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => (series === 'sg' ? v.toFixed(3) : `${v}%`)}
              width={56}
            />
            {overlayKey && (
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={overlayKey === 'ph' ? [2.5, 4.5] : ['auto', 'auto']}
                tick={{ fill: 'var(--text-3)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
            )}
            <Tooltip
              contentStyle={{
                background: 'var(--elevated)',
                border: '1px solid var(--border-2)',
                borderRadius: 10,
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                color: 'var(--text)',
              }}
              labelFormatter={(v) => `Day ${v}`}
              formatter={(value, name) => {
                if (name === 'sg') return [Number(value).toFixed(3), 'SG']
                if (name === 'abv') return [`${value}%`, 'Est. ABV']
                if (name === 'temp') return [`${value}°${tempUnit}`, 'Temp']
                return [value, 'pH']
              }}
            />
            {view.batch.fg != null && series === 'sg' && (
              <ReferenceLine yAxisId="left" y={view.batch.fg} stroke="var(--ok)" strokeDasharray="4 4" label={{ value: 'FG', fill: 'var(--ok)', fontSize: 10, position: 'insideTopRight' }} />
            )}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey={series}
              stroke="var(--accent)"
              strokeWidth={2}
              dot={{ r: 3, fill: 'var(--accent)', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              connectNulls
              isAnimationActive={false}
            />
            {overlayKey && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey={overlayKey}
                stroke={overlayKey === 'temp' ? 'var(--chart-cat-3)' : 'var(--chart-cat-2)'}
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={{ r: 2 }}
                connectNulls
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
