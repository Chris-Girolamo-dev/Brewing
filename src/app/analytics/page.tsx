'use client'

import * as React from 'react'
import Link from 'next/link'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts'
import { differenceInHours } from 'date-fns'
import { useStore } from '@/lib/store'
import { buildBatchView, type BatchView } from '@/lib/derive'
import { PageHeader, Loading } from '@/components/PageHeader'
import { Card, CardBody, CardHeader, CardTitle, FigCaption, MetricCard } from '@/components/ui/Card'
import { Table, TD, TH, TR } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { formatAmount, formatGravity, formatVolume } from '@/lib/calc/units'
import { cn, fmtDate } from '@/lib/utils'

const COLORS = ['var(--chart-cat-1)', 'var(--chart-cat-2)', 'var(--chart-cat-3)', 'var(--chart-cat-4)', 'var(--chart-cat-5)', 'var(--chart-cat-6)']

export default function AnalyticsPage() {
  const { data, prefs, ready } = useStore()
  const [selected, setSelected] = React.useState<string[]>([])
  const views = React.useMemo(() => data.batches.map((b) => buildBatchView(data, b, prefs)), [data, prefs])

  React.useEffect(() => {
    if (selected.length === 0 && views.length) setSelected(views.slice(0, Math.min(3, views.length)).map((v) => v.batch.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [views.length])

  const chosen = React.useMemo(
    () => selected.map((id) => views.find((v) => v.batch.id === id)).filter((v): v is BatchView => !!v),
    [selected, views]
  )

  // Merge curves onto a shared day axis.
  const curve = React.useMemo(() => {
    const rows = new Map<number, Record<string, number>>()
    for (const v of chosen) {
      const t0 = new Date(v.batch.pitch_date ?? v.batch.batch_date).getTime()
      for (const m of v.measurements.filter((m) => m.type === 'sg')) {
        const day = Math.round(differenceInHours(new Date(m.measured_at), t0) / 24)
        const row = rows.get(day) ?? { day }
        row[v.batch.id] = m.value
        rows.set(day, row)
      }
    }
    return [...rows.values()].sort((a, b) => a.day - b.day)
  }, [chosen])

  if (!ready) return <Loading />

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 6 ? s : [...s, id]))
  const rated = views.filter((v) => v.avgRating != null)
  const avgAbv = views.filter((v) => (v.finalAbv ?? v.estAbv) != null)

  const ingredientNames = [...new Set(chosen.flatMap((v) => v.ingredients.filter((i) => ['Fruit', 'Honey', 'Juice', 'Sugar'].includes(i.category)).map((i) => i.name)))]

  return (
    <>
      <PageHeader eyebrow="Analytics" title="Compare batches" subtitle="Pick up to six batches. Curves overlay on a shared day axis." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Batches" value={views.length} />
        <MetricCard label="Avg ABV" value={avgAbv.length ? `${(avgAbv.reduce((a, v) => a + (v.finalAbv ?? v.estAbv ?? 0), 0) / avgAbv.length).toFixed(1)}%` : '—'} />
        <MetricCard label="Avg rating" value={rated.length ? (rated.reduce((a, v) => a + (v.avgRating ?? 0), 0) / rated.length).toFixed(1) : '—'} />
        <MetricCard label="Tastings" value={data.tastings.length} />
      </div>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {views.map((v, i) => {
          const on = selected.includes(v.batch.id)
          const color = COLORS[selected.indexOf(v.batch.id) % COLORS.length]
          return (
            <Button key={v.batch.id} size="sm" variant={on ? 'secondary' : 'ghost'} onClick={() => toggle(v.batch.id)} className={cn(on && 'border-border-2')}>
              <span className="size-2 rounded-full" style={{ background: on ? color : 'var(--text-3)' }} />
              {v.batch.name}
              <span className="font-mono text-[10px] text-text-3">{v.batch.batch_code}</span>
              <span className="sr-only">{i}</span>
            </Button>
          )
        })}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="p-4 sm:p-5 lg:col-span-2">
          <FigCaption>FIG. 02 / GRAVITY OVERLAY · SG vs DAYS</FigCaption>
          <div className="mt-4 h-72">
            {curve.length < 2 ? (
              <div className="flex h-full items-center justify-center text-sm text-text-3">Select batches with gravity readings.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={curve} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" type="number" domain={['dataMin', 'dataMax']} tick={{ fill: 'var(--text-3)', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={{ stroke: 'var(--border-2)' }} tickLine={false} tickFormatter={(v) => `d${v}`} />
                  <YAxis domain={['auto', 'auto']} tick={{ fill: 'var(--text-3)', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v.toFixed(3)} width={56} />
                  <Tooltip contentStyle={{ background: 'var(--elevated)', border: '1px solid var(--border-2)', borderRadius: 10, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text)' }} labelFormatter={(v) => `Day ${v}`} formatter={(value, name) => [Number(value).toFixed(3), chosen.find((c) => c.batch.id === name)?.batch.name ?? String(name)]} />
                  <Legend formatter={(id) => chosen.find((c) => c.batch.id === id)?.batch.name ?? id} wrapperStyle={{ fontSize: 11 }} />
                  {chosen.map((v, i) => (
                    <Line key={v.batch.id} type="monotone" dataKey={v.batch.id} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 2.5 }} connectNulls isAnimationActive={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Finishing gravity vs rating</CardTitle>
          </CardHeader>
          <CardBody className="pt-3">
            {rated.length === 0 ? (
              <div className="text-xs text-text-3">Rate a few tastings to see where your preferred finishing gravity lands.</div>
            ) : (
              <ul className="space-y-2">
                {[...rated]
                  .sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0))
                  .map((v) => (
                    <li key={v.batch.id} className="flex items-center justify-between gap-3 text-sm">
                      <Link href={`/batches/${v.batch.id}`} className="truncate text-fg hover:underline">
                        {v.batch.name}
                      </Link>
                      <span className="shrink-0 font-mono text-xs text-text-2">
                        FG {formatGravity(v.batch.fg ?? v.latestSg?.value)} · <span className="text-accent">{v.avgRating}</span>/10
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {chosen.length > 0 && (
        <Card className="mt-5">
          <CardHeader>
            <CardTitle>Side by side</CardTitle>
          </CardHeader>
          <CardBody className="pt-3">
            <Table>
              <thead>
                <tr>
                  <TH>Metric</TH>
                  {chosen.map((v) => (
                    <TH key={v.batch.id}>
                      <Link href={`/batches/${v.batch.id}`} className="normal-case tracking-normal text-fg hover:underline">
                        {v.batch.name}
                      </Link>
                    </TH>
                  ))}
                </tr>
              </thead>
              <tbody>
                <CmpRow label="Batch ID" cells={chosen.map((v) => v.batch.batch_code)} mono />
                <CmpRow label="Type" cells={chosen.map((v) => `${v.batch.beverage_type}${v.batch.style ? ` · ${v.batch.style}` : ''}`)} />
                <CmpRow label="Stage" cells={chosen.map((v) => v.batch.stage)} />
                <CmpRow label="Started" cells={chosen.map((v) => fmtDate(v.batch.pitch_date ?? v.batch.batch_date))} />
                <CmpRow label="Volume" cells={chosen.map((v) => formatVolume(v.batch.target_volume, v.batch.volume_unit, prefs.unit_system))} mono />
                <CmpRow label="OG" cells={chosen.map((v) => formatGravity(v.og))} mono />
                <CmpRow label="FG / latest SG" cells={chosen.map((v) => formatGravity(v.batch.fg ?? v.latestSg?.value))} mono />
                <CmpRow label="ABV" cells={chosen.map((v) => ((v.finalAbv ?? v.estAbv) != null ? `${v.finalAbv ?? v.estAbv}%` : '—'))} mono />
                <CmpRow label="Attenuation" cells={chosen.map((v) => (v.attenuation != null ? `${v.attenuation}%` : '—'))} mono />
                <CmpRow label="Yeast" cells={chosen.map((v) => v.yeasts.map((y) => y.strain).join(', ') || '—')} />
                {ingredientNames.map((n) => (
                  <CmpRow key={n} label={n} cells={chosen.map((v) => { const i = v.ingredients.find((x) => x.name === n); return i ? formatAmount(i.amount, i.unit) : '—' })} mono />
                ))}
                <CmpRow label="Fermentation days" cells={chosen.map((v) => (v.batch.fermentation_complete_at ? String(Math.round((new Date(v.batch.fermentation_complete_at).getTime() - new Date(v.batch.pitch_date ?? v.batch.batch_date).getTime()) / 86_400_000)) : `${v.dayNumber ?? '—'} (ongoing)`))} mono />
                <CmpRow label="Transfers" cells={chosen.map((v) => String(v.transfers.length))} mono />
                <CmpRow label="Packaged" cells={chosen.map((v) => (v.packagings.length ? v.packagings.map((p) => `${p.quantity ?? '?'} × ${p.container_size} ${p.size_unit}`).join('; ') : '—'))} />
                <CmpRow label="Rating" cells={chosen.map((v) => (v.avgRating != null ? `${v.avgRating}/10` : '—'))} mono />
              </tbody>
            </Table>
          </CardBody>
        </Card>
      )}
    </>
  )
}

function CmpRow({ label, cells, mono }: { label: string; cells: string[]; mono?: boolean }) {
  return (
    <TR>
      <TD className="text-text-3">{label}</TD>
      {cells.map((c, i) => (
        <TD key={i} className={cn('text-fg', mono && 'font-mono tabular')}>
          {c}
        </TD>
      ))}
    </TR>
  )
}
