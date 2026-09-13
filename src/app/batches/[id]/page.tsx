'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowRight,
  Bell,
  BookmarkPlus,
  CheckCircle2,
  Copy,
  Download,
  Droplets,
  FlaskConical,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Trash2,
  Wine,
  Thermometer,
  Split,
  GitBranch,
  BarChart3,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { buildBatchView, stageTone } from '@/lib/derive'
import { PageHeader, Loading } from '@/components/PageHeader'
import { Card, CardBody, CardHeader, CardTitle, EmptyState, MetricCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, StatusPill } from '@/components/ui/Badge'
import { Tabs } from '@/components/ui/Tabs'
import { Table, TD, TH, TR } from '@/components/ui/Table'
import { Select } from '@/components/ui/Input'
import { FermentationChart } from '@/components/FermentationChart'
import { useShell } from '@/components/AppShell'
import {
  BacksweetenDialog,
  ConfirmFgDialog,
  DuplicateDialog,
  EditBatchDialog,
  EventDialog,
  IngredientDialog,
  MeasurementDialog,
  PackagingDialog,
  ReminderDialog,
  StabilizationDialog,
  TastingDialog,
  YeastDialog,
} from '@/components/batch/dialogs'
import { NutrientPlan } from '@/components/batch/NutrientPlan'
import { BATCH_STAGES, type BatchEvent, type BatchIngredient, type Measurement, type Tasting, type TempUnit, type Yeast } from '@/lib/types'
import { formatAmount, formatGravity, formatTemp, formatVolume, convertVolume } from '@/lib/calc/units'
import { transferLoss, daysBetween } from '@/lib/calc/fermentation'
import { bottleBreakdown } from '@/lib/calc/packaging'
import { exportBatchCsv, exportMeasurementsCsv } from '@/lib/csv'
import { fmtDate, fmtDateTime, cn } from '@/lib/utils'
import { Dialog } from '@/components/ui/Dialog'

type Tab = 'overview' | 'timeline' | 'ingredients' | 'measurements' | 'transfers' | 'additions' | 'packaging' | 'tastings'

export default function BatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data, prefs, ready, touchBatch, remove, update } = useStore()
  const { openLog, openSplit } = useShell()
  const [tab, setTab] = React.useState<Tab>('overview')
  const [dlg, setDlg] = React.useState<string | null>(null)
  const [editIng, setEditIng] = React.useState<BatchIngredient | null>(null)
  const [editYeast, setEditYeast] = React.useState<Yeast | null>(null)
  const [editTasting, setEditTasting] = React.useState<Tasting | null>(null)
  const [editMeasurement, setEditMeasurement] = React.useState<Measurement | null>(null)
  const [editEvent, setEditEvent] = React.useState<BatchEvent | null>(null)
  const [menu, setMenu] = React.useState(false)

  const batch = data.batches.find((b) => b.id === id)
  const view = React.useMemo(() => (batch ? buildBatchView(data, batch, prefs) : null), [data, batch, prefs])

  if (!ready) return <Loading />
  if (!batch || !view) {
    return <EmptyState title="Batch not found" action={<Link href="/batches"><Button variant="secondary">Back to batches</Button></Link>} />
  }

  const close = () => setDlg(null)
  const showStable = view.stability.stable && batch.fg == null

  async function deleteBatch() {
    if (view!.children.length > 0) return
    await remove('batches', batch!.id)
    router.push('/batches')
  }

  const tabs: { value: Tab; label: string }[] = [
    { value: 'overview', label: 'Overview' },
    { value: 'timeline', label: `Timeline` },
    { value: 'ingredients', label: 'Ingredients' },
    { value: 'measurements', label: 'Measurements' },
    { value: 'transfers', label: 'Transfers' },
    { value: 'additions', label: 'Additions' },
    { value: 'packaging', label: 'Packaging' },
    { value: 'tastings', label: 'Tastings' },
  ]

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <Link href="/batches" className="hover:text-fg">
              Batches
            </Link>
            {view.parent && (
              <>
                <span>/</span>
                <Link href={`/batches/${view.parent.id}`} className="hover:text-fg">
                  {view.parent.batch_code}
                </Link>
              </>
            )}
            <span>/</span>
            <span>{view.parent ? `-${batch.batch_code.slice(view.parent.batch_code.length + 1)}` : batch.batch_code}</span>
            {batch.lot_label && <span className="rounded bg-accent-soft px-1.5 text-accent normal-case tracking-normal">{batch.lot_label}</span>}
          </span>
        }
        title={batch.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <StatusPill tone={stageTone(batch.stage)}>{batch.stage}</StatusPill>
            <span className="font-mono text-xs">Day {view.dayNumber ?? '—'}</span>
            <span className="text-text-3">·</span>
            <span>{batch.beverage_type}{batch.style ? ` · ${batch.style}` : ''}</span>
            {!view.isSplitParent && (
              <>
                <span className="text-text-3">·</span>
                <button type="button" onClick={() => setDlg('edit')} className="inline-flex items-center gap-1 hover:text-fg" title="Change vessel">
                  <FlaskConical size={12} /> {view.vessel?.name ?? 'No vessel'}
                </button>
              </>
            )}
            {view.isSplitParent && (
              <>
                <span className="text-text-3">·</span>
                <span className="inline-flex items-center gap-1">
                  <GitBranch size={12} /> {view.children.length} sub-lots
                </span>
              </>
            )}
          </span>
        }
        actions={
          <>
            {!view.isSplitParent && (
              <>
                <Button onClick={() => openLog(batch.id, 'Gravity Reading')}>
                  <Droplets /> Log gravity
                </Button>
                <Button variant="secondary" onClick={() => openLog(batch.id)}>
                  <Plus /> Log activity
                </Button>
              </>
            )}
            {view.isSplitParent && view.children.length > 1 && (
              <Link href={`/analytics?ids=${view.children.map((c) => c.id).join(',')}`}>
                <Button variant="secondary">
                  <BarChart3 /> Compare sub-lots
                </Button>
              </Link>
            )}
            <div className="relative">
              <Button variant="outline" size="icon" onClick={() => setMenu((m) => !m)} aria-label="More">
                <MoreHorizontal />
              </Button>
              {menu && (
                <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-xl border border-border-2 bg-elevated p-1 shadow-[var(--shadow-lg)]" onMouseLeave={() => setMenu(false)}>
                  {[
                    ['edit', 'Edit batch', Pencil],
                    ...(!batch.parent_batch_id && !view.isSplitParent ? [['split', 'Split into sub-lots', Split]] : []),
                    ['duplicate', 'Duplicate batch', Copy],
                    ['recipe', 'Save as recipe', BookmarkPlus],
                    ['reminder', 'Add reminder', Bell],
                    ['csv', 'Export CSV', Download],
                    ['delete', 'Delete batch', Trash2],
                  ].map(([k, label, Icon]) => {
                    const I = Icon as React.ComponentType<{ size?: number }>
                    return (
                      <button
                        key={k as string}
                        className={cn('flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2', k === 'delete' ? 'text-crit' : 'text-fg')}
                        onClick={() => {
                          setMenu(false)
                          if (k === 'csv') exportBatchCsv(view)
                          else if (k === 'split') openSplit(batch.id)
                          else setDlg(k as string)
                        }}
                      >
                        <I size={14} /> {label as string}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        }
      />

      {showStable && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color-mix(in_oklab,var(--ok)_35%,transparent)] bg-[color-mix(in_oklab,var(--ok)_10%,transparent)] px-4 py-3">
          <div className="text-sm">
            <span className="font-semibold text-ok">Gravity appears stable.</span>{' '}
            <span className="text-text-2">
              {formatGravity(view.stability.compared?.value)} → {formatGravity(view.stability.latest?.value)} over {view.stability.spanDays} days. Not declared complete automatically.
            </span>
          </div>
          <Button size="sm" onClick={() => setDlg('fg')}>
            <CheckCircle2 /> Mark fermentation complete
          </Button>
        </div>
      )}

      {view.isSplitParent ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard label="OG" value={formatGravity(view.og)} />
          <MetricCard label="Sub-lots" value={view.children.length} trend={batch.split_at ? `Split ${fmtDate(batch.split_at)}` : undefined} />
          <MetricCard label="Packaged (all lots)" value={view.packagedLiters != null ? formatVolume(view.packagedLiters, 'L', prefs.unit_system) : '—'} />
          <MetricCard label="Original volume" value={formatVolume(batch.target_volume, batch.volume_unit, prefs.unit_system)} trend={view.yieldPct != null ? `${view.yieldPct}% yield` : undefined} />
        </div>
      ) : (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="OG" value={formatGravity(view.og)} />
        <MetricCard
          label={batch.fg != null ? 'FG (confirmed)' : 'Latest SG'}
          value={formatGravity(batch.fg ?? view.latestSg?.value)}
          trend={batch.fg != null ? `Confirmed ${fmtDate(batch.fg_confirmed_at)}` : view.latestSg ? fmtDate(view.latestSg.measured_at) : undefined}
          trendTone={batch.fg != null ? 'ok' : 'neutral'}
        />
        <MetricCard
          label={view.finalAbv != null ? 'Final ABV' : 'Estimated ABV'}
          value={view.finalAbv != null ? `${view.finalAbv}%` : view.estAbv != null ? `~${view.estAbv}%` : '—'}
          trend={view.attenuation != null ? `${view.attenuation}% attenuation` : undefined}
        />
        <MetricCard label="Volume" value={formatVolume(batch.target_volume, batch.volume_unit, prefs.unit_system)} trend={view.yieldPct != null ? `${view.yieldPct}% yield packaged` : undefined} />
      </div>
      )}

      {!view.isSplitParent && (
      <div className="mt-5 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => setDlg('ingredient')}>
          <Plus /> Add ingredient
        </Button>
        <Button size="sm" variant="secondary" onClick={() => openLog(batch.id, 'Racked')}>
          <ArrowRight /> Rack
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setDlg('tasting')}>
          <Wine /> Taste
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setDlg('packaging')}>
          <Package /> Package
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setDlg('stabilize')}>
          Stabilize
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setDlg('backsweeten')}>
          Backsweeten
        </Button>
        <div className="ml-auto w-48">
          <Select value={batch.stage} onChange={(e) => touchBatch(batch.id, { stage: e.target.value as typeof batch.stage })} className="h-8 text-xs">
            {BATCH_STAGES.filter((s) => s !== 'Split').map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </div>
      </div>
      )}

      {view.isSplitParent && (
        <Card className="mt-5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch size={14} className="text-accent" /> Sub-lots
            </CardTitle>
            <span className="text-xs text-text-3">This batch is an aggregate record. Log activity on each sub-lot.</span>
          </CardHeader>
          <CardBody className="pt-3">
            <Table>
              <thead>
                <tr>
                  <TH>Lot</TH>
                  <TH>Stage</TH>
                  <TH>Vessel</TH>
                  <TH className="text-right">Volume</TH>
                  <TH className="text-right">SG</TH>
                  <TH className="text-right">ABV</TH>
                  <TH>Additions</TH>
                  <TH className="text-right">Packaged</TH>
                  <TH className="text-right">Rating</TH>
                </tr>
              </thead>
              <tbody>
                {view.childSummaries.map((c) => (
                  <TR key={c.batch.id}>
                    <TD>
                      <Link href={`/batches/${c.batch.id}`} className="font-medium text-fg hover:underline">
                        {c.batch.lot_label ?? c.batch.name}
                      </Link>
                      <div className="font-mono text-[10.5px] uppercase text-text-3">{c.batch.batch_code}</div>
                    </TD>
                    <TD>
                      <StatusPill tone={stageTone(c.batch.stage)}>{c.batch.stage}</StatusPill>
                    </TD>
                    <TD>{c.vessel?.name ?? '—'}</TD>
                    <TD className="text-right font-mono tabular">{formatVolume(c.batch.target_volume, c.batch.volume_unit, prefs.unit_system)}</TD>
                    <TD className="text-right font-mono tabular">{formatGravity(c.latestSg)}</TD>
                    <TD className="text-right font-mono tabular">{(c.finalAbv ?? c.estAbv) != null ? `${c.finalAbv ?? `~${c.estAbv}`}%` : '—'}</TD>
                    <TD className="max-w-[220px] truncate">{c.ownAdditions.map((i) => `${i.name}${i.amount != null ? ` ${i.amount} ${i.unit ?? ''}` : ''}`).join(', ') || 'Control'}</TD>
                    <TD className="text-right font-mono tabular">{c.packagedLiters != null ? formatVolume(c.packagedLiters, 'L', prefs.unit_system) : '—'}</TD>
                    <TD className="text-right font-mono tabular">{c.avgRating ?? '—'}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </CardBody>
        </Card>
      )}

      <Tabs<Tab> className="mt-5" options={tabs} value={tab} onChange={setTab} />

      <div className="mt-5">
        {tab === 'overview' && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="space-y-5 lg:col-span-2">
              <FermentationChart view={view} />
              <Card>
                <CardHeader>
                  <CardTitle>Recent activity</CardTitle>
                  <button className="text-xs text-text-3 hover:text-fg" onClick={() => setTab('timeline')}>
                    Full timeline →
                  </button>
                </CardHeader>
                <CardBody className="pt-3">
                  <Timeline view={view} limit={6} onEdit={(e) => { setEditEvent(e); setDlg('event') }} />
                </CardBody>
              </Card>
            </div>
            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                  <button className="text-text-3 hover:text-fg" onClick={() => setDlg('edit')} aria-label="Edit">
                    <Pencil size={14} />
                  </button>
                </CardHeader>
                <CardBody className="pt-3">
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                    <Row k="Pitched" v={fmtDate(batch.pitch_date)} />
                    <Row k="Goal" v={batch.goal ?? '—'} />
                    <Row k="Yeast" v={[...view.inheritedYeasts, ...view.yeasts].map((y) => `${y.manufacturer ?? ''} ${y.strain}`.trim()).join(', ') || '—'} />
                    <Row k="Vessel" v={view.vessel?.name ?? '—'} />
                    <Row k="Primary" v={view.primaryDays != null ? `${view.primaryDays} days` : batch.fermentation_complete_at ? `${daysBetween(batch.pitch_date ?? batch.batch_date, batch.fermentation_complete_at)} days` : 'in progress'} />
                    <Row k="Aging" v={view.agingDays != null ? `${view.agingDays} days` : '—'} />
                    {view.latestTemp && <Row k="Temp" v={formatTemp(view.latestTemp.value, view.latestTemp.unit as TempUnit, prefs.unit_system)} />}
                    {view.latestPh && <Row k="pH" v={String(view.latestPh.value)} />}
                    {view.avgRating != null && <Row k="Rating" v={`${view.avgRating}/10`} />}
                  </dl>
                  {batch.notes && <p className="mt-3 whitespace-pre-wrap border-t border-border pt-3 text-xs text-text-2">{batch.notes}</p>}
                </CardBody>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Reminders</CardTitle>
                  <button className="text-text-3 hover:text-fg" onClick={() => setDlg('reminder')} aria-label="Add reminder">
                    <Plus size={14} />
                  </button>
                </CardHeader>
                <CardBody className="pt-3">
                  {view.reminders.length === 0 ? (
                    <div className="text-xs text-text-3">Nothing scheduled.</div>
                  ) : (
                    <ul className="space-y-2">
                      {view.reminders.map((r) => (
                        <li key={r.id} className="flex items-center gap-2 text-sm">
                          <button onClick={() => update('reminders', r.id, { done: true })} className="text-text-3 hover:text-ok" aria-label="Done">
                            <CheckCircle2 size={15} />
                          </button>
                          <span className="flex-1 text-fg">{r.title}</span>
                          <span className="font-mono text-xs text-text-3">{fmtDate(r.due_at, 'MMM d')}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardBody>
              </Card>
            </div>
            {(batch.beverage_type === 'Mead' || batch.beverage_type === 'Melomel' || batch.beverage_type === 'Cyser' || view.nutrients.length > 0) && (
              <div className="lg:col-span-3">
                <NutrientPlan view={view} />
              </div>
            )}
          </div>
        )}

        {tab === 'timeline' && (
          <Card>
            <CardBody>
              <Timeline view={view} onEdit={(e) => { setEditEvent(e); setDlg('event') }} />
            </CardBody>
          </Card>
        )}

        {tab === 'ingredients' && (
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Yeast</CardTitle>
                <Button size="sm" variant="secondary" onClick={() => { setEditYeast(null); setDlg('yeast') }}>
                  <Plus /> Pitch yeast
                </Button>
              </CardHeader>
              <CardBody className="pt-3">
                {view.inheritedYeasts.length > 0 && (
                  <div className="mb-3 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-text-3">
                    Inherited from {view.parent?.batch_code}: {view.inheritedYeasts.map((y) => `${y.manufacturer ?? ''} ${y.strain}`.trim()).join(', ')}
                    {view.inheritedYeasts[0]?.pitched_at ? ` · pitched ${fmtDate(view.inheritedYeasts[0].pitched_at)}` : ''}
                  </div>
                )}
                {view.yeasts.length === 0 ? (
                  <div className="text-xs text-text-3">{view.inheritedYeasts.length ? 'No additional yeast on this sub-lot.' : 'No yeast recorded.'}</div>
                ) : (
                  <Table>
                    <thead>
                      <tr>
                        <TH>Strain</TH>
                        <TH>Amount</TH>
                        <TH>Pitched</TH>
                        <TH>Rehydration</TH>
                        <TH>Lot / Exp</TH>
                      </tr>
                    </thead>
                    <tbody>
                      {view.yeasts.map((y) => (
                        <TR key={y.id} className="cursor-pointer" onClick={() => { setEditYeast(y); setDlg('yeast') }}>
                          <TD className="text-fg">
                            {y.manufacturer} <span className="font-semibold">{y.strain}</span>
                          </TD>
                          <TD className="font-mono">{formatAmount(y.amount, y.unit)}</TD>
                          <TD>{fmtDateTime(y.pitched_at)}</TD>
                          <TD>{y.rehydrated ? `${y.rehydration_medium ?? 'Yes'}${y.rehydration_temp ? ` · ${y.rehydration_temp}°${y.rehydration_temp_unit}` : ''}${y.rehydration_minutes ? ` · ${y.rehydration_minutes} min` : ''}` : 'Direct pitch'}</TD>
                          <TD>{[y.lot, y.expiration].filter(Boolean).join(' / ') || '—'}</TD>
                        </TR>
                      ))}
                    </tbody>
                  </Table>
                )}
              </CardBody>
            </Card>
            <IngredientTable view={view} title="Ingredients" filter={(i) => i.addition_stage !== 'Packaging'} onAdd={() => { setEditIng(null); setDlg('ingredient') }} onEdit={(i) => { setEditIng(i); setDlg('ingredient') }} inherited={view.inheritedIngredients.filter((i) => i.addition_stage !== 'Packaging')} parentCode={view.parent?.batch_code} />
          </div>
        )}

        {tab === 'measurements' && (
          <div className="space-y-5">
            <FermentationChart view={view} />
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>All readings</CardTitle>
                  <div className="text-xs text-text-3">Tap a row to edit or delete.</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => exportMeasurementsCsv(view)}>
                    <Download /> CSV
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => openLog(batch.id, 'Gravity Reading')}>
                    <Plus /> Reading
                  </Button>
                </div>
              </CardHeader>
              <CardBody className="pt-3">
                {view.measurements.length === 0 ? (
                  <div className="text-xs text-text-3">No measurements yet.</div>
                ) : (
                  <Table>
                    <thead>
                      <tr>
                        <TH>When</TH>
                        <TH>Day</TH>
                        <TH>Type</TH>
                        <TH className="text-right">Value</TH>
                        <TH>Stage</TH>
                        <TH>Notes</TH>
                        <TH />
                      </tr>
                    </thead>
                    <tbody>
                      {[...view.measurements]
                        .sort((a, b) => b.measured_at.localeCompare(a.measured_at))
                        .map((m) => (
                          <TR key={m.id} className="cursor-pointer" onClick={() => { setEditMeasurement(m); setDlg('measurement') }}>
                            <TD>{fmtDateTime(m.measured_at)}</TD>
                            <TD className="font-mono">{daysBetween(batch.pitch_date ?? batch.batch_date, m.measured_at)}</TD>
                            <TD>
                              <Badge tone={m.type === 'sg' ? 'accent' : 'neutral'}>{m.type.toUpperCase()}</Badge>
                            </TD>
                            <TD className="text-right font-mono tabular text-fg">
                              {m.type === 'sg' ? formatGravity(m.value) : m.type === 'temp' ? formatTemp(m.value, m.unit as TempUnit, prefs.unit_system) : `${m.value} ${m.unit}`}
                            </TD>
                            <TD>{m.stage ?? '—'}</TD>
                            <TD>{m.notes ?? ''}</TD>
                            <TD className="text-right">
                              <button
                                className="text-text-3 hover:text-crit"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  remove('batch_measurements', m.id)
                                  const ev = data.batch_events.find((x) => x.id === m.event_id)
                                  if (ev && ['Gravity Reading', 'pH Reading', 'Temperature Reading'].includes(ev.type) && !view.measurements.some((o) => o.event_id === ev.id && o.id !== m.id)) remove('batch_events', ev.id)
                                }}
                                aria-label="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </TD>
                          </TR>
                        ))}
                    </tbody>
                  </Table>
                )}
              </CardBody>
            </Card>
          </div>
        )}

        {tab === 'transfers' && (
          <Card>
            <CardHeader>
              <CardTitle>Transfers</CardTitle>
              <Button size="sm" variant="secondary" onClick={() => openLog(batch.id, 'Racked')}>
                <Plus /> Rack
              </Button>
            </CardHeader>
            <CardBody className="pt-3">
              {view.transfers.length === 0 ? (
                <div className="text-xs text-text-3">No transfers recorded.</div>
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <TH>Date</TH>
                      <TH>From</TH>
                      <TH>To</TH>
                      <TH>Batch</TH>
                      <TH className="text-right">Before</TH>
                      <TH className="text-right">After</TH>
                      <TH className="text-right">Loss</TH>
                      <TH>Method</TH>
                      <TH>Reason</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {view.transfers.map((t) => {
                      const vn = (id: string | null) => data.vessels.find((v) => v.id === id)?.name ?? '—'
                      const loss = transferLoss(t.volume_before, t.volume_after)
                      return (
                        <TR key={t.id}>
                          <TD>{fmtDate(t.transferred_at)}</TD>
                          <TD>{vn(t.from_vessel_id)}</TD>
                          <TD className="text-fg">{vn(t.to_vessel_id)}</TD>
                          <TD>
                            {t.to_batch_id ? (
                              <Link href={`/batches/${t.to_batch_id}`} className="font-mono text-xs text-accent hover:underline">
                                {data.batches.find((b) => b.id === t.to_batch_id)?.batch_code ?? 'sub-lot'}
                              </Link>
                            ) : (
                              '—'
                            )}
                          </TD>
                          <TD className="text-right font-mono tabular">{t.volume_before ?? '—'} {t.volume_unit}</TD>
                          <TD className="text-right font-mono tabular">{t.volume_after ?? '—'} {t.volume_unit}</TD>
                          <TD className={cn('text-right font-mono tabular', loss && loss > 0 ? 'text-warn' : '')}>{loss != null ? `${loss} ${t.volume_unit}` : '—'}</TD>
                          <TD>{t.method ?? '—'}</TD>
                          <TD>{t.reason ?? '—'}</TD>
                        </TR>
                      )
                    })}
                  </tbody>
                </Table>
              )}
            </CardBody>
          </Card>
        )}

        {tab === 'additions' && (
          <div className="space-y-5">
            <IngredientTable
              view={view}
              title="Process additions"
              hint="Nutrients, finings, acids, tannins, stabilizers, oak, spices — anything added after the must was assembled."
              filter={(i) => ['Nutrient', 'Acid', 'Tannin', 'Spice', 'Herb', 'Tea', 'Fining Agent', 'Stabilizer', 'Oak', 'Flavoring'].includes(i.category) || i.addition_stage !== 'Primary'}
              onAdd={() => { setEditIng(null); setDlg('ingredient') }}
              onEdit={(i) => { setEditIng(i); setDlg('ingredient') }}
              showContact
            />
            <NutrientPlan view={view} />
            {view.stabilizations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Stabilization</CardTitle>
                </CardHeader>
                <CardBody className="pt-3">
                  <Table>
                    <thead>
                      <tr>
                        <TH>Date</TH>
                        <TH className="text-right">SG</TH>
                        <TH className="text-right">K-meta</TH>
                        <TH className="text-right">Sorbate</TH>
                        <TH>Method</TH>
                        <TH className="text-right">Wait</TH>
                      </tr>
                    </thead>
                    <tbody>
                      {view.stabilizations.map((s) => (
                        <TR key={s.id}>
                          <TD>{fmtDate(s.stabilized_at)}</TD>
                          <TD className="text-right font-mono">{formatGravity(s.sg)}</TD>
                          <TD className="text-right font-mono">{formatAmount(s.kmeta_amount, s.kmeta_unit)}</TD>
                          <TD className="text-right font-mono">{formatAmount(s.sorbate_amount, s.sorbate_unit)}</TD>
                          <TD>{s.method ?? '—'}</TD>
                          <TD className="text-right font-mono">{s.waiting_days != null ? `${s.waiting_days} d` : '—'}</TD>
                        </TR>
                      ))}
                    </tbody>
                  </Table>
                </CardBody>
              </Card>
            )}
            {view.backsweetenings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Backsweetening</CardTitle>
                </CardHeader>
                <CardBody className="pt-3">
                  <Table>
                    <thead>
                      <tr>
                        <TH>Date</TH>
                        <TH>Sweetener</TH>
                        <TH className="text-right">Amount</TH>
                        <TH className="text-right">Pre SG</TH>
                        <TH className="text-right">Post SG</TH>
                        <TH>Taste</TH>
                      </tr>
                    </thead>
                    <tbody>
                      {view.backsweetenings.map((s) => (
                        <TR key={s.id}>
                          <TD>{fmtDate(s.sweetened_at)}</TD>
                          <TD className="text-fg">{s.sweetener}</TD>
                          <TD className="text-right font-mono">{formatAmount(s.amount, s.unit)}</TD>
                          <TD className="text-right font-mono">{formatGravity(s.pre_sg)}</TD>
                          <TD className="text-right font-mono">{formatGravity(s.post_sg)}</TD>
                          <TD>{s.taste_result ?? '—'}</TD>
                        </TR>
                      ))}
                    </tbody>
                  </Table>
                </CardBody>
              </Card>
            )}
          </div>
        )}

        {tab === 'packaging' && (
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Packaging events</CardTitle>
                <Button size="sm" variant="secondary" onClick={() => setDlg('packaging')}>
                  <Package /> Package
                </Button>
              </CardHeader>
              <CardBody className="pt-3">
                {view.packagings.length === 0 ? (
                  <div className="text-xs text-text-3">Not packaged yet.</div>
                ) : (
                  <Table>
                    <thead>
                      <tr>
                        <TH>Date</TH>
                        <TH>Package</TH>
                        <TH className="text-right">Qty</TH>
                        <TH className="text-right">Volume</TH>
                        <TH className="text-right">Pre SG</TH>
                        <TH>Priming</TH>
                        <TH>Ready</TH>
                      </tr>
                    </thead>
                    <tbody>
                      {view.packagings.map((p) => (
                        <TR key={p.id}>
                          <TD>{fmtDate(p.packaged_at)}</TD>
                          <TD className="text-fg">
                            {p.container_size} {p.size_unit} {p.package_type}
                            <div className="text-xs text-text-3">{p.closure}</div>
                          </TD>
                          <TD className="text-right font-mono">{p.quantity ?? '—'}</TD>
                          <TD className="text-right font-mono">{p.packaged_volume != null ? formatVolume(p.packaged_volume, p.volume_unit, prefs.unit_system) : '—'}</TD>
                          <TD className="text-right font-mono">{formatGravity(p.pre_sg)}</TD>
                          <TD>{p.priming_sugar_grams != null ? `${p.priming_sugar_grams} g ${p.priming_sugar_type} → ${p.target_co2} vol @ ${p.conditioning_temp}°${p.temp_unit}` : 'Still'}</TD>
                          <TD>{fmtDate(p.expected_ready_at)}</TD>
                        </TR>
                      ))}
                    </tbody>
                  </Table>
                )}
              </CardBody>
            </Card>
            {batch.target_volume != null && (
              <Card>
                <CardHeader>
                  <CardTitle>Bottles needed</CardTitle>
                  <span className="text-xs text-text-3">from {formatVolume(batch.target_volume, batch.volume_unit, prefs.unit_system)}</span>
                </CardHeader>
                <CardBody className="grid grid-cols-2 gap-3 pt-3 sm:grid-cols-5">
                  {bottleBreakdown(batch.target_volume, batch.volume_unit).map((b) => (
                    <div key={b.label} className="rounded-xl border border-border bg-canvas p-3 text-center">
                      <div className="font-mono text-xl font-semibold text-fg">~{b.count}</div>
                      <div className="text-xs text-text-3">{b.label}</div>
                    </div>
                  ))}
                </CardBody>
              </Card>
            )}
          </div>
        )}

        {tab === 'tastings' && (
          <Card>
            <CardHeader>
              <CardTitle>Tastings</CardTitle>
              <Button size="sm" variant="secondary" onClick={() => { setEditTasting(null); setDlg('tasting') }}>
                <Wine /> Taste
              </Button>
            </CardHeader>
            <CardBody className="pt-3">
              {view.tastings.length === 0 ? (
                <div className="text-xs text-text-3">No tastings yet.</div>
              ) : (
                <ul className="divide-y divide-border">
                  {view.tastings.map((t) => (
                    <li key={t.id} className="cursor-pointer py-3 first:pt-0 hover:bg-surface-2/40" onClick={() => { setEditTasting(t); setDlg('tasting') }}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm text-fg">
                          {fmtDate(t.tasted_at)} <span className="text-text-3">· batch day {daysBetween(batch.pitch_date ?? batch.batch_date, t.tasted_at)}</span>
                        </div>
                        {t.rating != null && <Badge tone="accent">{t.rating}/10</Badge>}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                        {(
                          [
                            ['Clarity', t.clarity],
                            ['Sweet', t.sweetness],
                            ['Acid', t.acidity],
                            ['Tannin', t.tannin],
                            ['Body', t.body],
                            ['CO₂', t.carbonation],
                            ['Heat', t.alcohol_heat],
                            ['Fruit', t.fruit_character],
                          ] as [string, number | null][]
                        )
                          .filter(([, v]) => v != null)
                          .map(([k, v]) => (
                            <span key={k} className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-text-2">
                              {k} {v}
                            </span>
                          ))}
                      </div>
                      {t.overall_notes && <p className="mt-1.5 text-xs text-text-2">{t.overall_notes}</p>}
                      {t.next_batch_changes && <p className="mt-1 text-xs text-text-3">Next time: {t.next_batch_changes}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        )}
      </div>

      {/* Dialogs */}
      <EditBatchDialog view={view} open={dlg === 'edit'} onClose={close} />
      <IngredientDialog batchId={batch.id} existing={editIng} open={dlg === 'ingredient'} onClose={close} />
      <YeastDialog batchId={batch.id} existing={editYeast} open={dlg === 'yeast'} onClose={close} />
      <ConfirmFgDialog view={view} open={dlg === 'fg'} onClose={close} />
      <PackagingDialog view={view} open={dlg === 'packaging'} onClose={close} />
      <TastingDialog view={view} existing={editTasting} open={dlg === 'tasting'} onClose={close} />
      <MeasurementDialog measurement={editMeasurement} open={dlg === 'measurement'} onClose={close} />
      <EventDialog
        event={editEvent}
        open={dlg === 'event'}
        onClose={close}
        onEditYeast={(y) => {
          setEditYeast(y)
          setDlg('yeast')
        }}
      />
      <StabilizationDialog view={view} open={dlg === 'stabilize'} onClose={close} />
      <BacksweetenDialog view={view} open={dlg === 'backsweeten'} onClose={close} />
      <ReminderDialog batchId={batch.id} open={dlg === 'reminder'} onClose={close} />
      <DuplicateDialog view={view} mode="duplicate" open={dlg === 'duplicate'} onClose={close} />
      <DuplicateDialog view={view} mode="recipe" open={dlg === 'recipe'} onClose={close} />
      <Dialog
        open={dlg === 'delete'}
        onClose={close}
        title="Delete batch?"
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button variant="danger" onClick={deleteBatch} disabled={view.children.length > 0}>
              Delete permanently
            </Button>
          </>
        }
      >
        {view.children.length > 0 ? (
          <p className="text-sm text-text-2">
            <strong className="text-fg">{batch.name}</strong> has {view.children.length} sub-lots that inherit its history. Delete the sub-lots first, or set the stage to Archived.
          </p>
        ) : (
          <p className="text-sm text-text-2">
            This removes <strong className="text-fg">{batch.name}</strong> and all its events, measurements, transfers, packaging, and tastings. Consider archiving instead by setting the stage to Archived.
          </p>
        )}
      </Dialog>
    </>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="text-text-3">{k}</dt>
      <dd className="text-fg">{v}</dd>
    </>
  )
}

function Timeline({ view, limit, onEdit }: { view: ReturnType<typeof buildBatchView>; limit?: number; onEdit?: (e: BatchEvent) => void }) {
  const { remove, data } = useStore()
  const [showInherited, setShowInherited] = React.useState(false)
  const events = limit ? view.events.slice(0, limit) : view.events
  if (events.length === 0 && view.inheritedEvents.length === 0) return <div className="text-xs text-text-3">No activity yet.</div>
  return (
    <>
    {events.length === 0 && <div className="mb-3 text-xs text-text-3">No activity on this sub-lot yet.</div>}
    <ol className="relative ml-2 border-l border-border-2">
      {events.map((e) => {
        const measurements = view.measurements.filter((m) => m.event_id === e.id)
        const day = daysBetween(view.batch.pitch_date ?? view.batch.batch_date, e.occurred_at)
        return (
          <li key={e.id} className={cn('group relative pb-4 pl-5 last:pb-0', onEdit && 'cursor-pointer rounded-lg -ml-1 pl-6 transition-colors hover:bg-surface-2/40')} onClick={() => onEdit?.(e)}>
            <span className={cn('absolute -left-[5px] top-1.5 size-2.5 rounded-full border-2 border-surface', dotColor(e.type))} />
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <div className="text-sm font-medium text-fg">
                {e.type}
                {e.title && <span className="ml-2 font-mono text-xs font-normal text-text-2">{e.title}</span>}
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-text-3">
                <span>Day {day}</span>
                <span>·</span>
                <span>{fmtDateTime(e.occurred_at)}</span>
                <button className="opacity-40 transition-opacity hover:text-crit hover:opacity-100 group-hover:opacity-100" onClick={(ev) => { ev.stopPropagation(); remove('batch_events', e.id); measurements.forEach((m) => remove('batch_measurements', m.id)) }} aria-label="Delete event">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            {measurements.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {measurements.map((m) => (
                  <span key={m.id} className="inline-flex items-center gap-1 rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-text-2">
                    {m.type === 'temp' ? <Thermometer size={10} /> : <Droplets size={10} />}
                    {m.type === 'sg' ? formatGravity(m.value) : m.type === 'temp' ? `${m.value}°${m.unit}` : `${m.type} ${m.value}`}
                  </span>
                ))}
              </div>
            )}
            {e.notes && <p className="mt-1 text-xs text-text-2">{e.notes}</p>}
          </li>
        )
      })}
    </ol>
    {!limit && view.parent && view.inheritedEvents.length > 0 && (
      <div className="mt-4 border-t border-border pt-3">
        <button type="button" className="text-xs text-text-3 hover:text-fg" onClick={() => setShowInherited((s) => !s)}>
          {showInherited ? '▾' : '▸'} Inherited from {view.parent.batch_code} before the split ({view.inheritedEvents.length} events)
        </button>
        {showInherited && (
          <ol className="relative ml-2 mt-3 border-l border-dashed border-border opacity-70">
            {view.inheritedEvents.map((e) => {
              const ms = data.batch_measurements.filter((m) => m.event_id === e.id)
              return (
                <li key={e.id} className="relative pb-3 pl-5 last:pb-0">
                  <span className="absolute -left-[5px] top-1.5 size-2.5 rounded-full border-2 border-surface bg-text-3" />
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <div className="text-sm text-text-2">
                      {e.type}
                      {e.title && <span className="ml-2 font-mono text-xs text-text-3">{e.title}</span>}
                    </div>
                    <span className="font-mono text-[11px] text-text-3">{fmtDateTime(e.occurred_at)}</span>
                  </div>
                  {ms.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {ms.map((m) => (
                        <span key={m.id} className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-text-3">
                          {m.type === 'sg' ? formatGravity(m.value) : m.type === 'temp' ? `${m.value}°${m.unit}` : `${m.type} ${m.value}`}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </div>
    )}
    </>
  )
}

function dotColor(type: string): string {
  if (type === 'Gravity Reading' || type === 'pH Reading' || type === 'Temperature Reading') return 'bg-accent'
  if (type === 'Racked' || type === 'Bottled' || type === 'Kegged') return 'bg-info'
  if (type === 'Fermentation Complete') return 'bg-ok'
  if (type === 'Pasteurized' || type === 'Stabilized') return 'bg-warn'
  if (type === 'Problem / Deviation') return 'bg-crit'
  return 'bg-text-3'
}

function IngredientTable({
  view,
  title,
  hint,
  filter,
  onAdd,
  onEdit,
  showContact,
  inherited = [],
  parentCode,
}: {
  view: ReturnType<typeof buildBatchView>
  title: string
  hint?: string
  filter: (i: BatchIngredient) => boolean
  onAdd: () => void
  onEdit: (i: BatchIngredient) => void
  showContact?: boolean
  inherited?: BatchIngredient[]
  parentCode?: string
}) {
  const rows = view.ingredients.filter(filter).sort((a, b) => (a.added_at ?? '').localeCompare(b.added_at ?? ''))
  const inheritedRows = inherited.sort((a, b) => (a.added_at ?? '').localeCompare(b.added_at ?? ''))
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          {hint && <div className="text-xs text-text-3">{hint}</div>}
        </div>
        <Button size="sm" variant="secondary" onClick={onAdd}>
          <Plus /> Add
        </Button>
      </CardHeader>
      <CardBody className="pt-3">
        {rows.length === 0 && inheritedRows.length === 0 ? (
          <div className="text-xs text-text-3">Nothing recorded.</div>
        ) : (
          <Table>
            <thead>
              <tr>
                <TH>Category</TH>
                <TH>Ingredient</TH>
                <TH className="text-right">Amount</TH>
                <TH>Stage</TH>
                <TH>Added</TH>
                {showContact && <TH>Contact</TH>}
                <TH>Notes</TH>
              </tr>
            </thead>
            <tbody>
              {inheritedRows.map((i) => (
                <TR key={i.id} className="opacity-60" title={`Inherited from ${parentCode}`}>
                  <TD>
                    <Badge>{i.category}</Badge>
                  </TD>
                  <TD className="text-text-2">
                    {i.name} <span className="font-mono text-[10px] uppercase text-text-3">· {parentCode}</span>
                  </TD>
                  <TD className="text-right font-mono tabular">{formatAmount(i.amount, i.unit)}</TD>
                  <TD>{i.addition_stage ?? '—'}</TD>
                  <TD>{fmtDate(i.added_at)}</TD>
                  {showContact && <TD>—</TD>}
                  <TD className="max-w-[200px] truncate">{i.notes ?? ''}</TD>
                </TR>
              ))}
              {rows.map((i) => (
                <TR key={i.id} className="cursor-pointer" onClick={() => onEdit(i)}>
                  <TD>
                    <Badge>{i.category}</Badge>
                  </TD>
                  <TD className="text-fg">
                    {i.name}
                    {(i.brand || i.variety || i.oak_toast) && <div className="text-xs text-text-3">{[i.brand, i.variety, i.oak_toast, i.oak_form].filter(Boolean).join(' · ')}</div>}
                  </TD>
                  <TD className="text-right font-mono tabular">{formatAmount(i.amount, i.unit)}</TD>
                  <TD>{i.addition_stage ?? '—'}</TD>
                  <TD>{fmtDate(i.added_at)}</TD>
                  {showContact && (
                    <TD>
                      {i.added_at ? (i.removed_at ? `${daysBetween(i.added_at, i.removed_at)} d (removed ${fmtDate(i.removed_at, 'MMM d')})` : ['Oak', 'Spice', 'Herb', 'Tea', 'Flavoring', 'Fruit'].includes(i.category) ? `${daysBetween(i.added_at)} d, in contact` : '—') : '—'}
                    </TD>
                  )}
                  <TD className="max-w-[200px] truncate">{i.notes ?? ''}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </CardBody>
    </Card>
  )
}

// keep convertVolume referenced for future volume displays in this file
void convertVolume
