'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, UnitInput } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/components/ui/Toast'
import { useStore } from '@/lib/store'
import { newId } from '@/lib/data'
import { buildBatchView, nextSublotCode } from '@/lib/derive'
import { BATCH_STAGES, INGREDIENT_CATEGORIES, INGREDIENT_UNITS, VOLUME_UNITS, type Batch, type BatchStage, type VolumeUnit } from '@/lib/types'
import { formatGravity, trim } from '@/lib/calc/units'
import { fromLocalInput, num, str, toLocalInput } from '@/lib/utils'
import { round } from '@/lib/calc/fermentation'

interface LotRow {
  label: string
  vessel_id: string
  volume: string
  add_name: string
  add_amount: string
  add_unit: string
  add_category: string
}

const blankRow = (): LotRow => ({ label: '', vessel_id: '', volume: '', add_name: '', add_amount: '', add_unit: 'g', add_category: 'Spice' })

/**
 * Split a batch into sub-lots at racking. Creates one child batch per row, a transfer into
 * each, an optional first addition per child (e.g. ginger), and turns the parent into an
 * aggregate record in stage "Split" unless a remainder stays behind.
 */
export function SplitDialog({ batchId, open, onClose }: { batchId: string | null; open: boolean; onClose: () => void }) {
  const { data, prefs, insert, touchBatch } = useStore()
  const toast = useToast()
  const router = useRouter()
  const batch = data.batches.find((b) => b.id === batchId) ?? null
  const view = React.useMemo(() => (batch ? buildBatchView(data, batch, prefs) : null), [data, batch, prefs])

  const [when, setWhen] = React.useState(toLocalInput(null))
  const [volBefore, setVolBefore] = React.useState('')
  const [unit, setUnit] = React.useState<string>('gal')
  const [rows, setRows] = React.useState<LotRow[]>([blankRow(), blankRow(), blankRow()])
  const [stage, setStage] = React.useState<BatchStage>('Secondary / Clearing')
  const [remainder, setRemainder] = React.useState(false)
  const [method, setMethod] = React.useState('Auto-siphon')
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open || !batch) return
    setWhen(toLocalInput(null))
    setUnit(batch.volume_unit)
    setVolBefore(batch.target_volume?.toString() ?? '')
    setStage('Secondary / Clearing')
    setRemainder(false)
    setMethod('Auto-siphon')
    const n = 3
    const even = batch.target_volume != null ? trim(Math.floor((batch.target_volume / n) * 1000) / 1000, 3) : ''
    setRows(Array.from({ length: n }, () => ({ ...blankRow(), volume: even })))
  }, [open, batch])

  if (!batch || !view) return null

  const before = num(volBefore)
  const sum = rows.reduce((a, r) => a + (num(r.volume) ?? 0), 0)
  const rawLeftover = before != null ? round(before - sum, 3) : null
  // Rounding noise from even splits (5 / 3 = 1.667) is not a real loss or overflow.
  const leftover = rawLeftover != null && Math.abs(rawLeftover) < 0.005 ? 0 : rawLeftover
  const valid = rows.length >= 2 && rows.every((r) => num(r.volume) != null && num(r.volume)! > 0) && (leftover == null || leftover >= -1e-9)

  const patch = (i: number, p: Partial<LotRow>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...p } : r)))
  const evenOut = () => {
    if (before == null) return
    const each = trim(Math.floor((before / rows.length) * 1000) / 1000, 3)
    setRows((rs) => rs.map((r) => ({ ...r, volume: each })))
  }

  async function save() {
    if (!batch || !view || !valid) return
    setSaving(true)
    try {
      const at = fromLocalInput(when)
      const parentVessel = batch.current_vessel_id
      const latestSg = view.latestSg?.value ?? null
      const created: Batch[] = []

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]
        const code = nextSublotCode(data, batch, i)
        const label = str(r.label)
        const childId = newId()
        const child = await insert('batches', {
          id: childId,
          batch_code: code,
          name: label ? `${batch.name} · ${label}` : `${batch.name} · Lot ${i + 1}`,
          beverage_type: batch.beverage_type,
          style: batch.style,
          recipe_id: batch.recipe_id,
          batch_date: at.slice(0, 10),
          pitch_date: batch.pitch_date,
          target_volume: num(r.volume),
          volume_unit: unit as VolumeUnit,
          goal: batch.goal,
          stage,
          og: view.og,
          fg: null,
          fg_confirmed_at: null,
          fermentation_complete_at: null,
          current_vessel_id: r.vessel_id || null,
          notes: null,
          parent_batch_id: batch.id,
          lot_label: label,
          split_at: at,
          updated_at: at,
        })
        created.push(child)
        const ev = await insert('batch_events', {
          batch_id: childId,
          occurred_at: at,
          type: 'Batch Created',
          stage,
          vessel_id: r.vessel_id || null,
          title: `Split from ${batch.batch_code} · ${r.volume} ${unit}${latestSg != null ? ` · SG ${formatGravity(latestSg)}` : ''}`,
          notes: null,
        })
        await insert('batch_transfers', {
          batch_id: batch.id,
          event_id: ev.id,
          transferred_at: at,
          from_vessel_id: parentVessel,
          to_vessel_id: r.vessel_id || null,
          to_batch_id: childId,
          volume_before: null,
          volume_after: num(r.volume),
          volume_unit: unit as VolumeUnit,
          method: str(method),
          reason: 'Split into sub-lot',
          headspace: null,
          notes: null,
        })
        if (latestSg != null) {
          await insert('batch_measurements', {
            batch_id: childId,
            event_id: ev.id,
            measured_at: at,
            type: 'sg',
            value: latestSg,
            unit: 'SG',
            stage,
            vessel_id: r.vessel_id || null,
            notes: 'Carried from parent at split',
          })
        }
        if (str(r.add_name)) {
          await insert('batch_ingredients', {
            batch_id: childId,
            category: r.add_category as never,
            name: r.add_name.trim(),
            amount: num(r.add_amount),
            unit: r.add_unit as never,
            brand: null,
            variety: null,
            lot: null,
            addition_stage: 'Secondary',
            added_at: at,
            removed_at: null,
            oak_toast: null,
            oak_form: null,
            notes: null,
          })
          await insert('batch_events', {
            batch_id: childId,
            occurred_at: at,
            type: 'Ingredient Added',
            stage,
            vessel_id: r.vessel_id || null,
            title: `${r.add_name.trim()}${num(r.add_amount) != null ? ` ${r.add_amount} ${r.add_unit}` : ''}`,
            notes: null,
          })
        }
      }

      const lossText = leftover != null && !remainder && leftover > 0 ? ` · loss ${trim(leftover, 3)} ${unit}` : ''
      await insert('batch_events', {
        batch_id: batch.id,
        occurred_at: at,
        type: 'Split into Sub-lots',
        stage: remainder ? batch.stage : 'Split',
        vessel_id: parentVessel,
        title: `${rows.length} sub-lots: ${created.map((c) => c.batch_code.slice(batch.batch_code.length)).join(', ')}${lossText}`,
        notes: remainder && leftover != null ? `${trim(leftover, 3)} ${unit} remains in parent` : null,
      })
      await touchBatch(batch.id, {
        split_at: at,
        stage: remainder ? batch.stage : 'Split',
        current_vessel_id: remainder ? parentVessel : null,
      })
      toast({ tone: 'ok', title: `Split into ${rows.length} sub-lots`, message: created.map((c) => c.batch_code).join(', ') })
      onClose()
      router.push(`/batches/${batch.id}`)
    } catch (e) {
      toast({ tone: 'crit', title: 'Split failed', message: e instanceof Error ? e.message : String(e) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Split into sub-lots"
      subtitle={`${batch.name} · ${batch.batch_code}${view.latestSg ? ` · SG ${formatGravity(view.latestSg.value)} carried to each lot` : ''}`}
      className="sm:max-w-3xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!valid} loading={saving}>
            Create {rows.length} sub-lots
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Split date">
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </Field>
          <Field label="Volume before" hint={view.vessel ? `From ${view.vessel.name}` : undefined}>
            <UnitInput value={volBefore} onChange={setVolBefore} unit={unit} units={VOLUME_UNITS} onUnitChange={setUnit} />
          </Field>
          <Field label="Sub-lot stage">
            <Select value={stage} onChange={(e) => setStage(e.target.value as BatchStage)}>
              {BATCH_STAGES.filter((s) => s !== 'Split' && s !== 'Planning' && s !== 'Prepared').map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="Method">
            <Input value={method} onChange={(e) => setMethod(e.target.value)} />
          </Field>
        </div>

        <div className="rounded-xl border border-border bg-canvas">
          <div className="hidden grid-cols-[1fr_1.2fr_110px_1.4fr_auto] gap-2 border-b border-border px-3 py-2 font-mono text-[10.5px] uppercase tracking-wider text-text-3 sm:grid">
            <div>Label</div>
            <div>Vessel type</div>
            <div>Volume</div>
            <div>First addition (optional)</div>
            <div />
          </div>
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 border-b border-border p-3 last:border-b-0 sm:grid-cols-[1fr_1.2fr_110px_1.4fr_auto] sm:items-center">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-text-3">-{nextSublotCode(data, batch, i).split('-').pop()}</span>
                <Input value={r.label} onChange={(e) => patch(i, { label: e.target.value })} placeholder={i === rows.length - 1 ? 'Control' : 'Ginger'} />
              </div>
              <Select value={r.vessel_id} onChange={(e) => patch(i, { vessel_id: e.target.value })}>
                <option value="">Vessel…</option>
                {data.vessels.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </Select>
              <UnitInput value={r.volume} onChange={(v) => patch(i, { volume: v })} unit={unit} />
              <div className="col-span-2 grid grid-cols-[1fr_auto] gap-1 sm:col-span-1">
                <div className="grid grid-cols-[auto_1fr] gap-1">
                  <Select value={r.add_category} onChange={(e) => patch(i, { add_category: e.target.value })} className="w-24 px-2 text-xs">
                    {INGREDIENT_CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </Select>
                  <Input value={r.add_name} onChange={(e) => patch(i, { add_name: e.target.value })} placeholder="Ginger" />
                </div>
                <UnitInput value={r.add_amount} onChange={(v) => patch(i, { add_amount: v })} unit={r.add_unit} units={INGREDIENT_UNITS} onUnitChange={(u) => patch(i, { add_unit: u })} className="w-36" />
              </div>
              <button className="justify-self-end text-text-3 hover:text-crit disabled:opacity-30" disabled={rows.length <= 2} onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} aria-label="Remove lot">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2 px-3 py-2">
            <Button size="sm" variant="secondary" onClick={() => setRows((rs) => [...rs, blankRow()])}>
              <Plus /> Lot
            </Button>
            <Button size="sm" variant="ghost" onClick={evenOut} disabled={before == null}>
              Split evenly
            </Button>
            <div className="ml-auto font-mono text-xs text-text-2">
              {trim(sum, 3)} / {before ?? '—'} {unit}
              {leftover != null && (
                <span className={leftover < 0 ? 'text-crit' : leftover > 0 ? 'text-warn' : 'text-ok'}>
                  {' '}
                  · {leftover < 0 ? `over by ${trim(-leftover, 3)}` : remainder ? `${trim(leftover, 3)} stays in parent` : `loss ${trim(leftover, 3)}`}
                </span>
              )}
            </div>
          </div>
        </div>

        <label className="flex items-center gap-3 text-sm text-text-2">
          <Switch checked={remainder} onCheckedChange={setRemainder} /> Remainder stays in parent (parent stays active instead of becoming an aggregate record)
        </label>
        <div className="text-xs text-text-3">
          Each sub-lot inherits OG, pitch date, yeast, and primary ingredients from {batch.batch_code}. Its own gravity log, additions, packaging, and tastings start here.
        </div>
      </div>
    </Dialog>
  )
}
