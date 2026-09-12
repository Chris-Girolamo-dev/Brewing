'use client'

import * as React from 'react'
import Link from 'next/link'
import { Download, LayoutGrid, List, Plus, Search } from 'lucide-react'
import { useStore } from '@/lib/store'
import { buildBatchView, isActive, stageTone, type BatchView } from '@/lib/derive'
import { PageHeader, Loading } from '@/components/PageHeader'
import { BatchCard } from '@/components/BatchCard'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { SegmentedControl } from '@/components/ui/Tabs'
import { Table, TD, TH, TR } from '@/components/ui/Table'
import { StatusPill } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/Card'
import { BATCH_STAGES, BEVERAGE_TYPES } from '@/lib/types'
import { formatGravity } from '@/lib/calc/units'
import { fmtDate } from '@/lib/utils'
import { exportBatchesCsv } from '@/lib/csv'

type Scope = 'active' | 'all' | 'finished'

export default function BatchesPage() {
  const { data, prefs, ready } = useStore()
  const [q, setQ] = React.useState('')
  const [scope, setScope] = React.useState<Scope>('active')
  const [type, setType] = React.useState('')
  const [stage, setStage] = React.useState('')
  const [yeast, setYeast] = React.useState('')
  const [layout, setLayout] = React.useState<'grid' | 'table'>('grid')

  const yeastStrains = React.useMemo(() => [...new Set(data.yeasts.map((y) => y.strain))].sort(), [data.yeasts])

  const views = React.useMemo(() => {
    const needle = q.trim().toLowerCase()
    return data.batches
      .filter((b) => (scope === 'active' ? isActive(b) || b.stage === 'Split' : scope === 'finished' ? !isActive(b) && b.stage !== 'Split' : true))
      .filter((b) => !type || b.beverage_type === type)
      .filter((b) => !stage || b.stage === stage)
      .map((b) => buildBatchView(data, b, prefs))
      .filter((v) => !yeast || v.yeasts.some((y) => y.strain === yeast))
      .filter((v) => {
        if (!needle) return true
        const hay = [
          v.batch.name,
          v.batch.batch_code,
          v.batch.style ?? '',
          v.batch.beverage_type,
          ...v.ingredients.map((i) => i.name),
          ...v.yeasts.map((y) => `${y.manufacturer ?? ''} ${y.strain}`),
        ]
          .join(' ')
          .toLowerCase()
        return hay.includes(needle)
      })
      .sort((a, b) => {
        // Newest family first; children immediately after their parent, in code order.
        const fam = (v: BatchView) => v.parent ?? v.batch
        const ka = fam(a)
        const kb = fam(b)
        if (ka.id !== kb.id) return (kb.pitch_date ?? kb.batch_date).localeCompare(ka.pitch_date ?? ka.batch_date)
        if (!a.parent) return -1
        if (!b.parent) return 1
        return a.batch.batch_code.localeCompare(b.batch.batch_code, undefined, { numeric: true })
      })
  }, [data, prefs, q, scope, type, stage, yeast])

  if (!ready) return <Loading />

  return (
    <>
      <PageHeader
        eyebrow="Batches"
        title="All batches"
        subtitle={`${views.length} shown · ${data.batches.length} total`}
        actions={
          <>
            <Button variant="secondary" onClick={() => exportBatchesCsv(data, prefs)}>
              <Download /> CSV
            </Button>
            <Link href="/batches/new">
              <Button>
                <Plus /> New batch
              </Button>
            </Link>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SegmentedControl<Scope>
          value={scope}
          onChange={setScope}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'finished', label: 'Finished' },
            { value: 'all', label: 'All' },
          ]}
        />
        <div className="relative min-w-[200px] flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, code, ingredient, yeast…" className="pl-8" />
        </div>
        <div className="w-36">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            {BEVERAGE_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </div>
        <div className="w-44">
          <Select value={stage} onChange={(e) => setStage(e.target.value)}>
            <option value="">All stages</option>
            {BATCH_STAGES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </div>
        <div className="w-36">
          <Select value={yeast} onChange={(e) => setYeast(e.target.value)}>
            <option value="">All yeast</option>
            {yeastStrains.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </div>
        <SegmentedControl<'grid' | 'table'>
          value={layout}
          onChange={setLayout}
          options={[
            { value: 'grid', label: <LayoutGrid size={13} /> },
            { value: 'table', label: <List size={13} /> },
          ]}
        />
      </div>

      {views.length === 0 ? (
        <EmptyState title="No batches match" hint="Adjust filters or create a new batch." />
      ) : layout === 'grid' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {views.map((v) => (
            <BatchCard key={v.batch.id} view={v} />
          ))}
        </div>
      ) : (
        <Table>
          <thead>
            <tr>
              <TH>Batch</TH>
              <TH>Type</TH>
              <TH>Stage</TH>
              <TH className="text-right">OG</TH>
              <TH className="text-right">SG / FG</TH>
              <TH className="text-right">ABV</TH>
              <TH>Yeast</TH>
              <TH>Started</TH>
              <TH className="text-right">Day</TH>
              <TH className="text-right">Rating</TH>
            </tr>
          </thead>
          <tbody>
            {views.map((v) => (
              <TR key={v.batch.id}>
                <TD className={v.parent ? 'pl-8' : ''}>
                  <Link href={`/batches/${v.batch.id}`} className="font-medium text-fg hover:underline">
                    {v.parent ? '↳ ' : ''}
                    {v.batch.name}
                  </Link>
                  <div className="font-mono text-[10.5px] uppercase text-text-3">{v.batch.batch_code}</div>
                </TD>
                <TD>{v.batch.beverage_type}</TD>
                <TD>
                  <StatusPill tone={stageTone(v.batch.stage)}>{v.batch.stage}</StatusPill>
                </TD>
                <TD className="text-right font-mono tabular">{formatGravity(v.og)}</TD>
                <TD className="text-right font-mono tabular">{formatGravity(v.batch.fg ?? v.latestSg?.value)}</TD>
                <TD className="text-right font-mono tabular">{v.finalAbv ?? v.estAbv ?? '—'}%</TD>
                <TD>{v.yeasts.map((y) => y.strain).join(', ') || '—'}</TD>
                <TD>{fmtDate(v.batch.pitch_date ?? v.batch.batch_date)}</TD>
                <TD className="text-right font-mono tabular">{v.dayNumber ?? '—'}</TD>
                <TD className="text-right font-mono tabular">{v.avgRating ?? '—'}</TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}
    </>
  )
}
