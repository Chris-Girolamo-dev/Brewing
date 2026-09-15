'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Slider, Textarea, UnitInput } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/components/ui/Toast'
import { useStore } from '@/lib/store'
import { newId } from '@/lib/data'
import type { BatchView } from '@/lib/derive'
import { bumpVersionName, nextBatchCode } from '@/lib/derive'
import {
  ACTIVITY_TYPES,
  ADDITION_STAGES,
  BATCH_STAGES,
  BEVERAGE_TYPES,
  FERMENTATION_GOALS,
  INGREDIENT_CATEGORIES,
  INGREDIENT_UNITS,
  PACKAGE_TYPES,
  SUGAR_TYPES,
  VOLUME_UNITS,
  type Batch,
  type BatchEvent,
  type BatchIngredient,
  type Measurement,
  type Packaging,
  type Recipe,
  type RecipeIngredient,
  type Reminder,
  type RecipeYeast,
  type Tasting,
  type Yeast,
} from '@/lib/types'
import { estimatedAbv } from '@/lib/calc/fermentation'
import { bottlesFromVolume, gramsToOunces, primingSugarGrams, residualCo2 } from '@/lib/calc/packaging'
import { convertTemp, formatGravity, preferredTempUnit, preferredVolumeUnit, toFluidOunces } from '@/lib/calc/units'
import { fromLocalInput, num, str, todayInput, toLocalInput } from '@/lib/utils'
import { addDays } from 'date-fns'
import { YeastStrainPicker } from '@/components/YeastStrainPicker'
import { yeastLabel } from '@/lib/yeasts'

// ---------------------------------------------------------------- Edit batch

export function EditBatchDialog({ view, open, onClose }: { view: BatchView; open: boolean; onClose: () => void }) {
  const { data, touchBatch } = useStore()
  const toast = useToast()
  const b = view.batch
  const [f, setF] = React.useState(b)
  React.useEffect(() => setF(b), [b, open])
  const set = <K extends keyof Batch>(k: K, v: Batch[K]) => setF((x) => ({ ...x, [k]: v }))

  async function save() {
    await touchBatch(b.id, {
      name: f.name.trim() || b.name,
      batch_code: f.batch_code.trim() || b.batch_code,
      beverage_type: f.beverage_type,
      style: str(f.style),
      batch_date: f.batch_date,
      pitch_date: f.pitch_date,
      target_volume: f.target_volume,
      volume_unit: f.volume_unit,
      goal: f.goal,
      stage: f.stage,
      og: f.og,
      current_vessel_id: f.current_vessel_id,
      notes: str(f.notes),
    })
    toast({ tone: 'ok', title: 'Batch updated' })
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Edit batch"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Name">
            <Input value={f.name} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label="Batch ID">
            <Input value={f.batch_code} onChange={(e) => set('batch_code', e.target.value)} className="font-mono" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Beverage type">
            <Select value={f.beverage_type} onChange={(e) => set('beverage_type', e.target.value as Batch['beverage_type'])}>
              {BEVERAGE_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Style">
            <Input value={f.style ?? ''} onChange={(e) => set('style', e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Stage">
            <Select value={f.stage} onChange={(e) => set('stage', e.target.value as Batch['stage'])}>
              {BATCH_STAGES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="Goal">
            <Select value={f.goal ?? ''} onChange={(e) => set('goal', (e.target.value || null) as Batch['goal'])}>
              <option value="">—</option>
              {FERMENTATION_GOALS.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Batch date">
            <Input type="date" value={f.batch_date} onChange={(e) => set('batch_date', e.target.value)} />
          </Field>
          <Field label="Pitch date/time">
            <Input
              type="datetime-local"
              value={f.pitch_date ? toLocalInput(f.pitch_date) : ''}
              onChange={(e) => set('pitch_date', e.target.value ? fromLocalInput(e.target.value) : null)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Target volume">
            <UnitInput
              value={f.target_volume?.toString() ?? ''}
              onChange={(v) => set('target_volume', num(v))}
              unit={f.volume_unit}
              units={VOLUME_UNITS}
              onUnitChange={(u) => set('volume_unit', u as Batch['volume_unit'])}
            />
          </Field>
          <Field label="Original gravity" hint="Leave blank to use the first SG reading">
            <UnitInput value={f.og?.toString() ?? ''} onChange={(v) => set('og', num(v))} unit="SG" step={0.001} placeholder="1.050" />
          </Field>
        </div>
        <Field label="Current vessel">
          <Select value={f.current_vessel_id ?? ''} onChange={(e) => set('current_vessel_id', e.target.value || null)}>
            <option value="">—</option>
            {data.vessels.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Notes">
          <Textarea value={f.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
        </Field>
      </div>
    </Dialog>
  )
}

// ---------------------------------------------------------------- Ingredient

export function IngredientDialog({
  batchId,
  existing,
  open,
  onClose,
}: {
  batchId: string
  existing?: BatchIngredient | null
  open: boolean
  onClose: () => void
}) {
  const { insert, update, remove, touchBatch, logEvent, data } = useStore()
  const toast = useToast()
  const blank = (): Omit<BatchIngredient, 'id' | 'created_at'> => ({
    batch_id: batchId,
    category: 'Fruit',
    name: '',
    amount: null,
    unit: 'lb',
    brand: null,
    variety: null,
    lot: null,
    addition_stage: 'Primary',
    added_at: null,
    removed_at: null,
    oak_toast: null,
    oak_form: null,
    notes: null,
  })
  const [f, setF] = React.useState<Omit<BatchIngredient, 'id' | 'created_at'>>(blank())
  const [logIt, setLogIt] = React.useState(true)
  React.useEffect(() => {
    setF(existing ? { ...existing } : blank())
    setLogIt(!existing)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing, open, batchId])
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }))

  async function save() {
    if (!f.name.trim()) return
    const row = { ...f, name: f.name.trim(), brand: str(f.brand), variety: str(f.variety), lot: str(f.lot), notes: str(f.notes), oak_toast: str(f.oak_toast), oak_form: str(f.oak_form) }
    if (existing) {
      await update('batch_ingredients', existing.id, row)
    } else {
      await insert('batch_ingredients', row)
      if (logIt) {
        const batch = data.batches.find((b) => b.id === batchId)
        await logEvent({
          batch_id: batchId,
          occurred_at: row.added_at ?? new Date().toISOString(),
          type: f.category === 'Nutrient' ? 'Nutrient Addition' : f.category === 'Oak' ? 'Oak Added' : f.category === 'Fining Agent' ? 'Fining Added' : 'Ingredient Added',
          stage: batch?.stage ?? null,
          vessel_id: batch?.current_vessel_id ?? null,
          title: `${row.name}${row.amount != null ? ` ${row.amount} ${row.unit ?? ''}` : ''}`.trim(),
          notes: row.notes,
        })
      }
    }
    await touchBatch(batchId)
    toast({ tone: 'ok', title: existing ? 'Ingredient updated' : 'Ingredient added' })
    onClose()
  }

  async function del() {
    if (!existing) return
    await remove('batch_ingredients', existing.id)
    onClose()
  }

  const isOak = f.category === 'Oak'
  const isFlavor = ['Oak', 'Spice', 'Herb', 'Tea', 'Flavoring', 'Fruit'].includes(f.category)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={existing ? 'Edit ingredient' : 'Add ingredient'}
      footer={
        <>
          {existing && (
            <Button variant="danger" onClick={del} className="mr-auto">
              Delete
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!f.name.trim()}>
            Save
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Category">
            <Select value={f.category} onChange={(e) => set('category', e.target.value as BatchIngredient['category'])}>
              {INGREDIENT_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Ingredient">
            <Input autoFocus value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Wildflower honey" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount">
            <UnitInput
              value={f.amount?.toString() ?? ''}
              onChange={(v) => set('amount', num(v))}
              unit={f.unit ?? 'g'}
              units={INGREDIENT_UNITS}
              onUnitChange={(u) => set('unit', u as BatchIngredient['unit'])}
            />
          </Field>
          <Field label="Addition stage">
            <Select value={f.addition_stage ?? ''} onChange={(e) => set('addition_stage', (e.target.value || null) as BatchIngredient['addition_stage'])}>
              <option value="">—</option>
              {ADDITION_STAGES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Brand / source">
            <Input value={f.brand ?? ''} onChange={(e) => set('brand', e.target.value)} />
          </Field>
          <Field label="Variety">
            <Input value={f.variety ?? ''} onChange={(e) => set('variety', e.target.value)} />
          </Field>
        </div>
        {isOak && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Toast level">
              <Input value={f.oak_toast ?? ''} onChange={(e) => set('oak_toast', e.target.value)} placeholder="Medium" />
            </Field>
            <Field label="Form">
              <Input value={f.oak_form ?? ''} onChange={(e) => set('oak_form', e.target.value)} placeholder="Spiral" />
            </Field>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date added">
            <Input
              type="datetime-local"
              value={f.added_at ? toLocalInput(f.added_at) : ''}
              onChange={(e) => set('added_at', e.target.value ? fromLocalInput(e.target.value) : null)}
            />
          </Field>
          {isFlavor && (
            <Field label="Date removed" hint="Contact time is computed">
              <Input
                type="datetime-local"
                value={f.removed_at ? toLocalInput(f.removed_at) : ''}
                onChange={(e) => set('removed_at', e.target.value ? fromLocalInput(e.target.value) : null)}
              />
            </Field>
          )}
          {!isFlavor && (
            <Field label="Lot">
              <Input value={f.lot ?? ''} onChange={(e) => set('lot', e.target.value)} />
            </Field>
          )}
        </div>
        <Field label="Notes">
          <Textarea value={f.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
        </Field>
        {!existing && (
          <label className="flex items-center gap-3 text-sm text-text-2">
            <Switch checked={logIt} onCheckedChange={setLogIt} /> Also log to timeline
          </label>
        )}
      </div>
    </Dialog>
  )
}

// ---------------------------------------------------------------- Yeast

export function YeastDialog({ batchId, existing, open, onClose }: { batchId: string; existing?: Yeast | null; open: boolean; onClose: () => void }) {
  const { insert, update, remove, touchBatch, logEvent, data, prefs } = useStore()
  const toast = useToast()
  const tempUnit = preferredTempUnit(prefs.unit_system)
  const blank = (): Omit<Yeast, 'id' | 'created_at'> => ({
    batch_id: batchId,
    manufacturer: 'Lalvin',
    strain: '',
    amount: 5,
    unit: 'g',
    pitched_at: new Date().toISOString(),
    rehydrated: false,
    rehydration_temp: null,
    rehydration_temp_unit: tempUnit,
    rehydration_minutes: null,
    rehydration_medium: null,
    lot: null,
    expiration: null,
    notes: null,
  })
  const [f, setF] = React.useState(blank())
  const [logIt, setLogIt] = React.useState(true)
  React.useEffect(() => {
    setF(existing ? { ...existing } : blank())
    setLogIt(!existing)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing, open, batchId])
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }))

  async function save() {
    if (!f.strain.trim()) return
    const row = { ...f, strain: f.strain.trim(), manufacturer: str(f.manufacturer), rehydration_medium: str(f.rehydration_medium), lot: str(f.lot), expiration: str(f.expiration), notes: str(f.notes) }
    if (existing) {
      await update('yeasts', existing.id, row)
      // Keep the timeline in step: rename any "Yeast Pitched" event that named the old strain.
      const oldName = `${existing.manufacturer ?? ''} ${existing.strain}`.trim()
      const newName = `${row.manufacturer ?? ''} ${row.strain}`.trim()
      const title = yeastLabel(row, row.rehydrated ? 'rehydrated' : undefined)
      for (const e of data.batch_events.filter((e) => e.batch_id === batchId && e.type === 'Yeast Pitched')) {
        const notes = e.notes?.includes(oldName) ? e.notes.replace(oldName, newName) : e.notes
        if (title !== e.title || notes !== e.notes) await update('batch_events', e.id, { title, notes })
      }
      await touchBatch(batchId)
    } else {
      await insert('yeasts', row)
      const batch = data.batches.find((b) => b.id === batchId)
      const patch: Partial<Batch> = {}
      if (batch && !batch.pitch_date && row.pitched_at) patch.pitch_date = row.pitched_at
      if (batch && (batch.stage === 'Planning' || batch.stage === 'Prepared')) patch.stage = 'Primary Fermentation'
      await touchBatch(batchId, patch)
      if (logIt)
        await logEvent({
          batch_id: batchId,
          occurred_at: row.pitched_at ?? new Date().toISOString(),
          type: 'Yeast Pitched',
          stage: 'Primary Fermentation',
          vessel_id: batch?.current_vessel_id ?? null,
          title: yeastLabel(row, row.rehydrated ? 'rehydrated' : undefined),
          notes: row.notes,
        })
    }
    toast({ tone: 'ok', title: existing ? 'Yeast updated' : 'Yeast pitched' })
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={existing ? 'Edit yeast' : 'Pitch yeast'}
      footer={
        <>
          {existing && (
            <Button variant="danger" className="mr-auto" onClick={() => remove('yeasts', existing.id).then(onClose)}>
              Delete
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!f.strain.trim()}>
            Save
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3">
        <Field label="Yeast">
          <YeastStrainPicker
            autoFocus
            manufacturer={f.manufacturer}
            strain={f.strain}
            onChange={(v) => setF((x) => ({ ...x, manufacturer: v.manufacturer, strain: v.strain }))}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount">
            <UnitInput value={f.amount?.toString() ?? ''} onChange={(v) => set('amount', num(v))} unit={f.unit ?? 'g'} units={['g', 'packet']} onUnitChange={(u) => set('unit', u as Yeast['unit'])} />
          </Field>
          <Field label="Pitch date/time">
            <Input type="datetime-local" value={f.pitched_at ? toLocalInput(f.pitched_at) : ''} onChange={(e) => set('pitched_at', e.target.value ? fromLocalInput(e.target.value) : null)} />
          </Field>
        </div>
        <label className="flex items-center gap-3 text-sm text-text-2">
          <Switch checked={f.rehydrated} onCheckedChange={(v) => set('rehydrated', v)} /> Rehydrated
        </label>
        {f.rehydrated && (
          <div className="grid grid-cols-3 gap-3">
            <Field label="Temp">
              <UnitInput value={f.rehydration_temp?.toString() ?? ''} onChange={(v) => set('rehydration_temp', num(v))} unit={`°${tempUnit}`} />
            </Field>
            <Field label="Minutes">
              <Input type="number" inputMode="numeric" value={f.rehydration_minutes ?? ''} onChange={(e) => set('rehydration_minutes', num(e.target.value))} />
            </Field>
            <Field label="Medium">
              <Select value={f.rehydration_medium ?? ''} onChange={(e) => set('rehydration_medium', e.target.value || null)}>
                <option value="">—</option>
                <option>Water</option>
                <option>Go-Ferm</option>
                <option>Other</option>
              </Select>
            </Field>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Lot">
            <Input value={f.lot ?? ''} onChange={(e) => set('lot', e.target.value)} />
          </Field>
          <Field label="Expiration">
            <Input type="date" value={f.expiration ?? ''} onChange={(e) => set('expiration', e.target.value || null)} />
          </Field>
        </div>
        <Field label="Notes">
          <Textarea value={f.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
        </Field>
        {!existing && (
          <label className="flex items-center gap-3 text-sm text-text-2">
            <Switch checked={logIt} onCheckedChange={setLogIt} /> Log “Yeast Pitched” to timeline
          </label>
        )}
      </div>
    </Dialog>
  )
}

// ---------------------------------------------------------------- Confirm FG

export function ConfirmFgDialog({ view, open, onClose }: { view: BatchView; open: boolean; onClose: () => void }) {
  const { touchBatch, logEvent } = useStore()
  const toast = useToast()
  const [fg, setFg] = React.useState('')
  const [when, setWhen] = React.useState(toLocalInput(null))
  React.useEffect(() => {
    setFg(view.latestSg?.value.toString() ?? '')
    setWhen(toLocalInput(view.latestSg?.measured_at ?? null))
  }, [open, view.latestSg])
  const fgN = num(fg)
  const finalAbv = fgN != null ? estimatedAbv(view.og, fgN) : null

  async function save() {
    if (fgN == null) return
    const at = fromLocalInput(when)
    await touchBatch(view.batch.id, {
      fg: fgN,
      fg_confirmed_at: at,
      fermentation_complete_at: at,
      stage: view.batch.stage === 'Primary Fermentation' ? 'Secondary / Clearing' : view.batch.stage,
    })
    await logEvent({
      batch_id: view.batch.id,
      occurred_at: at,
      type: 'Fermentation Complete',
      stage: view.batch.stage,
      vessel_id: view.batch.current_vessel_id,
      title: `FG ${formatGravity(fgN)} confirmed${finalAbv != null ? ` · ${finalAbv}% ABV` : ''}`,
      notes: null,
    })
    toast({ tone: 'ok', title: 'Fermentation marked complete', message: `FG ${formatGravity(fgN)}` })
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Mark fermentation complete"
      subtitle="Stores final gravity, confirmation date, and final ABV."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={fgN == null}>
            Confirm FG
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3">
        {view.stability.stable ? (
          <div className="rounded-lg border border-[color-mix(in_oklab,var(--ok)_35%,transparent)] bg-[color-mix(in_oklab,var(--ok)_10%,transparent)] px-3 py-2 text-xs text-ok">
            Gravity appears stable: {formatGravity(view.stability.compared?.value)} → {formatGravity(view.stability.latest?.value)} over {view.stability.spanDays} days.
          </div>
        ) : (
          <div className="rounded-lg border border-[color-mix(in_oklab,var(--warn)_35%,transparent)] bg-[color-mix(in_oklab,var(--warn)_10%,transparent)] px-3 py-2 text-xs text-warn">
            Gravity has not yet been stable across the configured interval. Confirm only if you are sure.
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Final gravity" hint={finalAbv != null ? `Final ABV ${finalAbv}%` : undefined}>
            <UnitInput autoFocus value={fg} onChange={setFg} unit="SG" step={0.001} />
          </Field>
          <Field label="Confirmed on">
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </Field>
        </div>
      </div>
    </Dialog>
  )
}

// ---------------------------------------------------------------- Packaging (+ priming calculator)

export function PackagingDialog({ view, open, onClose }: { view: BatchView; open: boolean; onClose: () => void }) {
  const { data, prefs, insert, touchBatch, logEvent } = useStore()
  const toast = useToast()
  const tempUnit = preferredTempUnit(prefs.unit_system)
  const volUnit = preferredVolumeUnit(prefs.unit_system)

  const [profileId, setProfileId] = React.useState('')
  const [f, setF] = React.useState<Omit<Packaging, 'id' | 'created_at'>>(() => blankPack())
  const [carbonate, setCarbonate] = React.useState(view.batch.goal === 'Sparkling')

  function blankPack(): Omit<Packaging, 'id' | 'created_at'> {
    return {
      batch_id: view.batch.id,
      event_id: null,
      packaged_at: new Date().toISOString(),
      pre_sg: view.batch.fg ?? view.latestSg?.value ?? null,
      packaged_volume: view.batch.target_volume,
      volume_unit: view.batch.volume_unit,
      package_type: 'Crown-cap beer bottle',
      container_size: 22,
      size_unit: 'oz',
      quantity: null,
      closure: '26 mm crown cap',
      priming_sugar_type: 'sucrose',
      priming_sugar_grams: null,
      target_co2: 2.5,
      conditioning_temp: tempUnit === 'F' ? 68 : 20,
      temp_unit: tempUnit,
      conditioning_start: new Date().toISOString(),
      expected_ready_at: addDays(new Date(), 14).toISOString(),
      notes: null,
    }
  }
  React.useEffect(() => {
    if (open) {
      setF(blankPack())
      setProfileId('')
      setCarbonate(view.batch.goal === 'Sparkling')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }))

  function applyProfile(id: string) {
    setProfileId(id)
    const p = data.package_profiles.find((x) => x.id === id)
    if (!p) return
    setF((x) => ({ ...x, package_type: p.package_type, container_size: p.container_size, size_unit: p.size_unit, closure: p.closure }))
  }

  const sizeOz = f.container_size != null ? toFluidOunces(f.container_size, f.size_unit) : null
  const estBottles = f.packaged_volume != null && sizeOz ? bottlesFromVolume(f.packaged_volume, f.volume_unit, sizeOz) : null
  const tempF = f.conditioning_temp != null ? convertTemp(f.conditioning_temp, f.temp_unit, 'F') : null
  const sugarG =
    carbonate && f.packaged_volume != null && tempF != null && f.target_co2 != null && f.priming_sugar_type
      ? primingSugarGrams(f.packaged_volume, f.volume_unit, tempF, f.target_co2, f.priming_sugar_type)
      : null

  async function save() {
    const row: Omit<Packaging, 'id' | 'created_at'> = {
      ...f,
      quantity: f.quantity ?? estBottles,
      priming_sugar_type: carbonate ? f.priming_sugar_type : null,
      priming_sugar_grams: carbonate ? sugarG : null,
      target_co2: carbonate ? f.target_co2 : null,
      closure: str(f.closure),
      notes: str(f.notes),
    }
    const ev = await logEvent({
      batch_id: view.batch.id,
      occurred_at: row.packaged_at,
      type: row.package_type === 'Keg' ? 'Kegged' : 'Bottled',
      stage: carbonate ? 'Bottle Conditioning' : 'Packaged / Aging',
      vessel_id: null,
      title: `${row.quantity ?? '?'} × ${row.container_size ?? ''} ${row.size_unit} ${row.package_type}${sugarG != null ? ` · ${sugarG} g ${row.priming_sugar_type}` : ''}`,
      notes: row.notes,
    })
    await insert('packaging_events', { ...row, event_id: ev.id })
    await touchBatch(view.batch.id, { stage: carbonate ? 'Bottle Conditioning' : 'Packaged / Aging', current_vessel_id: null })
    if (carbonate && row.expected_ready_at) {
      await insert('reminders', { batch_id: view.batch.id, title: 'Check bottle carbonation', due_at: row.expected_ready_at, done: false })
    }
    toast({ tone: 'ok', title: 'Packaging recorded' })
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Package batch"
      subtitle={`${view.batch.name} · pre-packaging SG ${formatGravity(f.pre_sg)}`}
      className="sm:max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={f.packaged_volume == null}>
            Record packaging
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Package profile">
            <Select value={profileId} onChange={(e) => applyProfile(e.target.value)}>
              <option value="">Custom…</option>
              {data.package_profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Packaging date">
            <Input type="datetime-local" value={toLocalInput(f.packaged_at)} onChange={(e) => set('packaged_at', fromLocalInput(e.target.value))} />
          </Field>
          <Field label="Pre-packaging SG">
            <UnitInput value={f.pre_sg?.toString() ?? ''} onChange={(v) => set('pre_sg', num(v))} unit="SG" step={0.001} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Packaged volume" hint="Actual, not batch size">
            <UnitInput value={f.packaged_volume?.toString() ?? ''} onChange={(v) => set('packaged_volume', num(v))} unit={f.volume_unit} units={VOLUME_UNITS} onUnitChange={(u) => set('volume_unit', u as Packaging['volume_unit'])} />
          </Field>
          <Field label="Package type">
            <Select value={f.package_type} onChange={(e) => set('package_type', e.target.value as Packaging['package_type'])}>
              {PACKAGE_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Container size">
            <UnitInput value={f.container_size?.toString() ?? ''} onChange={(v) => set('container_size', num(v))} unit={f.size_unit} units={['oz', 'mL', 'L', 'gal']} onUnitChange={(u) => set('size_unit', u as Packaging['size_unit'])} />
          </Field>
          <Field label="Quantity" hint={estBottles != null ? `≈ ${estBottles} from volume` : undefined}>
            <Input type="number" inputMode="numeric" value={f.quantity ?? ''} onChange={(e) => set('quantity', num(e.target.value))} placeholder={estBottles?.toString() ?? ''} />
          </Field>
        </div>
        <Field label="Closure">
          <Input value={f.closure ?? ''} onChange={(e) => set('closure', e.target.value)} placeholder="26 mm crown cap / cork / swing top" />
        </Field>

        <div className="rounded-xl border border-border bg-canvas p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-fg">Priming calculator</div>
              <div className="text-xs text-text-3">Based on actual packaged volume and current temperature.</div>
            </div>
            <label className="flex items-center gap-2 text-xs text-text-2">
              Carbonate <Switch checked={carbonate} onCheckedChange={setCarbonate} />
            </label>
          </div>
          {carbonate && (
            <>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <Field label="Temperature">
                  <UnitInput value={f.conditioning_temp?.toString() ?? ''} onChange={(v) => set('conditioning_temp', num(v))} unit={`°${f.temp_unit}`} />
                </Field>
                <Field label="Target CO₂">
                  <UnitInput value={f.target_co2?.toString() ?? ''} onChange={(v) => set('target_co2', num(v))} unit="vol" step={0.1} />
                </Field>
                <Field label="Sugar">
                  <Select value={f.priming_sugar_type ?? 'sucrose'} onChange={(e) => set('priming_sugar_type', e.target.value as Packaging['priming_sugar_type'])}>
                    {SUGAR_TYPES.map((s) => (
                      <option key={s} value={s}>
                        {s === 'sucrose' ? 'Table sugar (sucrose)' : 'Corn sugar (dextrose)'}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1 font-mono text-sm">
                <span>
                  <span className="text-text-3">Sugar </span>
                  <span className="text-lg font-semibold text-accent">{sugarG != null ? `${sugarG} g` : '—'}</span>
                  {sugarG != null && <span className="text-text-3"> ({gramsToOunces(sugarG)} oz)</span>}
                </span>
                {tempF != null && (
                  <span className="text-text-3">
                    Residual CO₂ {residualCo2(tempF).toFixed(2)} vol
                  </span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Field label="Conditioning start">
                  <Input type="datetime-local" value={f.conditioning_start ? toLocalInput(f.conditioning_start) : ''} onChange={(e) => set('conditioning_start', e.target.value ? fromLocalInput(e.target.value) : null)} />
                </Field>
                <Field label="Expected ready" hint="Creates a reminder">
                  <Input type="datetime-local" value={f.expected_ready_at ? toLocalInput(f.expected_ready_at) : ''} onChange={(e) => set('expected_ready_at', e.target.value ? fromLocalInput(e.target.value) : null)} />
                </Field>
              </div>
            </>
          )}
        </div>
        <Field label="Notes">
          <Textarea value={f.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
        </Field>
        <div className="text-[11px] text-text-3">Display unit preference: {volUnit}. Values are stored in the units entered.</div>
      </div>
    </Dialog>
  )
}

// ---------------------------------------------------------------- Tasting

export function TastingDialog({ view, open, onClose, existing }: { view: BatchView; open: boolean; onClose: () => void; existing?: Tasting | null }) {
  const { insert, update, remove, logEvent, prefs } = useStore()
  const toast = useToast()
  const tempUnit = preferredTempUnit(prefs.unit_system)
  const blank = (): Omit<Tasting, 'id' | 'created_at'> => ({
    batch_id: view.batch.id,
    tasted_at: new Date().toISOString(),
    serving_temp: null,
    temp_unit: tempUnit,
    appearance: null,
    clarity: null,
    aroma: null,
    sweetness: null,
    acidity: null,
    tannin: null,
    body: null,
    carbonation: null,
    alcohol_heat: null,
    fruit_character: null,
    off_flavors: null,
    overall_notes: null,
    rating: null,
    would_make_again: null,
    next_batch_changes: null,
  })
  const [f, setF] = React.useState(blank())
  React.useEffect(() => {
    setF(existing ? { ...existing } : blank())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existing])
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }))

  async function save() {
    const row = { ...f, appearance: str(f.appearance), aroma: str(f.aroma), off_flavors: str(f.off_flavors), overall_notes: str(f.overall_notes), next_batch_changes: str(f.next_batch_changes) }
    if (existing) await update('tastings', existing.id, row)
    else {
      await insert('tastings', row)
      await logEvent({
        batch_id: view.batch.id,
        occurred_at: row.tasted_at,
        type: 'Taste Test',
        stage: view.batch.stage,
        vessel_id: view.batch.current_vessel_id,
        title: row.rating != null ? `Rated ${row.rating}/10` : null,
        notes: row.overall_notes,
      })
    }
    toast({ tone: 'ok', title: 'Tasting saved' })
    onClose()
  }

  type SliderKey = 'clarity' | 'sweetness' | 'acidity' | 'tannin' | 'body' | 'carbonation' | 'alcohol_heat' | 'fruit_character'
  const sliders: [SliderKey, string, string, string][] = [
    ['clarity', 'Clarity', 'Hazy', 'Brilliant'],
    ['sweetness', 'Sweetness', 'Bone dry', 'Sweet'],
    ['acidity', 'Acidity', 'Flat', 'Sharp'],
    ['tannin', 'Tannin', 'None', 'Grippy'],
    ['body', 'Body', 'Thin', 'Full'],
    ['carbonation', 'Carbonation', 'Still', 'Lively'],
    ['alcohol_heat', 'Alcohol heat', 'Hidden', 'Hot'],
    ['fruit_character', 'Fruit character', 'Faint', 'Intense'],
  ]

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={existing ? 'Edit tasting' : 'Taste'}
      subtitle={`${view.batch.name} · day ${view.dayNumber ?? '—'}`}
      className="sm:max-w-2xl"
      footer={
        <>
          {existing && (
            <Button variant="danger" className="mr-auto" onClick={() => remove('tastings', existing.id).then(onClose)}>
              Delete
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tasting date">
            <Input type="datetime-local" value={toLocalInput(f.tasted_at)} onChange={(e) => set('tasted_at', fromLocalInput(e.target.value))} />
          </Field>
          <Field label="Serving temp">
            <UnitInput value={f.serving_temp?.toString() ?? ''} onChange={(v) => set('serving_temp', num(v))} unit={`°${f.temp_unit}`} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Appearance">
            <Input value={f.appearance ?? ''} onChange={(e) => set('appearance', e.target.value)} placeholder="Deep ruby" />
          </Field>
          <Field label="Aroma">
            <Input value={f.aroma ?? ''} onChange={(e) => set('aroma', e.target.value)} placeholder="Blueberry, honey, faint yeast" />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          {sliders.map(([k, label, lo, hi]) => (
            <Slider key={k} label={label} low={lo} high={hi} value={f[k]} onChange={(v) => set(k, v)} />
          ))}
        </div>
        <Field label="Off-flavors">
          <Input value={f.off_flavors ?? ''} onChange={(e) => set('off_flavors', e.target.value)} placeholder="None / sulfur / acetaldehyde…" />
        </Field>
        <Field label="Overall notes">
          <Textarea value={f.overall_notes ?? ''} onChange={(e) => set('overall_notes', e.target.value)} />
        </Field>
        <Slider label="Overall rating" min={1} max={10} value={f.rating} onChange={(v) => set('rating', v)} low="1" high="10" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr] sm:items-start">
          <label className="flex items-center gap-3 pt-6 text-sm text-text-2">
            <Switch checked={!!f.would_make_again} onCheckedChange={(v) => set('would_make_again', v)} /> Would make again
          </label>
          <Field label="Next batch changes">
            <Textarea value={f.next_batch_changes ?? ''} onChange={(e) => set('next_batch_changes', e.target.value)} className="min-h-[60px]" />
          </Field>
        </div>
      </div>
    </Dialog>
  )
}

// ---------------------------------------------------------------- Stabilization

export function StabilizationDialog({ view, open, onClose }: { view: BatchView; open: boolean; onClose: () => void }) {
  const { insert, touchBatch, logEvent } = useStore()
  const toast = useToast()
  const [when, setWhen] = React.useState(toLocalInput(null))
  const [sg, setSg] = React.useState('')
  const [kmeta, setKmeta] = React.useState('')
  const [sorbate, setSorbate] = React.useState('')
  const [unit, setUnit] = React.useState('g')
  const [method, setMethod] = React.useState('Dissolved in small volume, stirred in')
  const [waiting, setWaiting] = React.useState('3')
  const [notes, setNotes] = React.useState('')
  React.useEffect(() => {
    if (open) {
      setWhen(toLocalInput(null))
      setSg(view.latestSg?.value.toString() ?? '')
    }
  }, [open, view.latestSg])

  async function save() {
    const at = fromLocalInput(when)
    const title = [num(kmeta) != null ? `K-meta ${kmeta} ${unit}` : null, num(sorbate) != null ? `Sorbate ${sorbate} ${unit}` : null].filter(Boolean).join(' · ')
    const ev = await logEvent({ batch_id: view.batch.id, occurred_at: at, type: 'Stabilized', stage: 'Stabilizing', vessel_id: view.batch.current_vessel_id, title, notes: str(notes) })
    await insert('stabilizations', {
      batch_id: view.batch.id,
      event_id: ev.id,
      stabilized_at: at,
      sg: num(sg),
      kmeta_amount: num(kmeta),
      kmeta_unit: unit as never,
      sorbate_amount: num(sorbate),
      sorbate_unit: unit as never,
      volume: view.batch.target_volume,
      volume_unit: view.batch.volume_unit,
      method: str(method),
      waiting_days: num(waiting),
      notes: str(notes),
    })
    await touchBatch(view.batch.id, { stage: 'Stabilizing' })
    const w = num(waiting)
    if (w) await insert('reminders', { batch_id: view.batch.id, title: 'Stabilization waiting period over — safe to backsweeten', due_at: addDays(new Date(at), w).toISOString(), done: false })
    toast({ tone: 'ok', title: 'Stabilization recorded', message: 'Stabilizing does not by itself guarantee fermentation has stopped.' })
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Stabilize"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Record</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </Field>
          <Field label="SG at stabilization">
            <UnitInput value={sg} onChange={setSg} unit="SG" step={0.001} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Potassium metabisulfite">
            <UnitInput value={kmeta} onChange={setKmeta} unit={unit} units={['g', 'tsp', 'each']} onUnitChange={setUnit} placeholder="0.4" />
          </Field>
          <Field label="Potassium sorbate">
            <UnitInput value={sorbate} onChange={setSorbate} unit={unit} placeholder="2.5" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Addition method">
            <Input value={method} onChange={(e) => setMethod(e.target.value)} />
          </Field>
          <Field label="Waiting period (days)" hint="Creates a reminder">
            <Input type="number" inputMode="numeric" value={waiting} onChange={(e) => setWaiting(e.target.value)} />
          </Field>
        </div>
        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  )
}

// ---------------------------------------------------------------- Backsweetening

export function BacksweetenDialog({ view, open, onClose }: { view: BatchView; open: boolean; onClose: () => void }) {
  const { insert, touchBatch, logEvent } = useStore()
  const toast = useToast()
  const [when, setWhen] = React.useState(toLocalInput(null))
  const [pre, setPre] = React.useState('')
  const [post, setPost] = React.useState('')
  const [sweetener, setSweetener] = React.useState('Honey')
  const [amount, setAmount] = React.useState('')
  const [unit, setUnit] = React.useState('oz')
  const [taste, setTaste] = React.useState('')
  const [notes, setNotes] = React.useState('')
  React.useEffect(() => {
    if (open) {
      setWhen(toLocalInput(null))
      setPre(view.latestSg?.value.toString() ?? '')
    }
  }, [open, view.latestSg])

  async function save() {
    const at = fromLocalInput(when)
    const ev = await logEvent({
      batch_id: view.batch.id,
      occurred_at: at,
      type: 'Backsweetened',
      stage: view.batch.stage,
      vessel_id: view.batch.current_vessel_id,
      title: `${sweetener}${num(amount) != null ? ` ${amount} ${unit}` : ''}${num(post) != null ? ` → SG ${formatGravity(num(post))}` : ''}`,
      notes: str(notes),
    })
    await insert('backsweetening_events', {
      batch_id: view.batch.id,
      event_id: ev.id,
      sweetened_at: at,
      pre_sg: num(pre),
      sweetener,
      amount: num(amount),
      unit: unit as never,
      volume: view.batch.target_volume,
      volume_unit: view.batch.volume_unit,
      post_sg: num(post),
      taste_result: str(taste),
      notes: str(notes),
    })
    if (num(post) != null) {
      await insert('batch_measurements', {
        batch_id: view.batch.id,
        event_id: ev.id,
        measured_at: at,
        type: 'sg',
        value: num(post)!,
        unit: 'SG',
        stage: view.batch.stage,
        vessel_id: view.batch.current_vessel_id,
        notes: 'Post-backsweetening',
      })
    }
    await touchBatch(view.batch.id)
    toast({ tone: 'ok', title: 'Backsweetening recorded' })
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Backsweeten"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!sweetener.trim()}>
            Record
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </Field>
          <Field label="Pre-backsweetening SG">
            <UnitInput value={pre} onChange={setPre} unit="SG" step={0.001} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sweetener">
            <Input value={sweetener} onChange={(e) => setSweetener(e.target.value)} />
          </Field>
          <Field label="Amount">
            <UnitInput value={amount} onChange={setAmount} unit={unit} units={INGREDIENT_UNITS} onUnitChange={setUnit} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Post-backsweetening SG" hint="Also logged as a gravity reading">
            <UnitInput value={post} onChange={setPost} unit="SG" step={0.001} />
          </Field>
          <Field label="Taste result">
            <Input value={taste} onChange={(e) => setTaste(e.target.value)} placeholder="Semi-sweet, balanced" />
          </Field>
        </div>
        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  )
}

// ---------------------------------------------------------------- Reminder

export function ReminderDialog({
  batchId,
  existing,
  open,
  onClose,
}: {
  batchId: string | null
  existing?: Reminder | null
  open: boolean
  onClose: () => void
}) {
  const { insert, update, remove, data } = useStore()
  const toast = useToast()
  const [title, setTitle] = React.useState('')
  const [due, setDue] = React.useState(todayInput())
  const [bid, setBid] = React.useState(batchId ?? '')
  const [done, setDone] = React.useState(false)
  React.useEffect(() => {
    if (!open) return
    if (existing) {
      setTitle(existing.title)
      setDue(existing.due_at.slice(0, 10))
      setBid(existing.batch_id ?? '')
      setDone(existing.done)
    } else {
      setTitle('')
      setDue(todayInput())
      setBid(batchId ?? '')
      setDone(false)
    }
  }, [open, batchId, existing])
  async function save() {
    if (!title.trim()) return
    const row = { batch_id: bid || null, title: title.trim(), due_at: new Date(`${due}T09:00:00`).toISOString(), done }
    if (existing) {
      await update('reminders', existing.id, row)
      toast({ tone: 'ok', title: 'Reminder updated' })
    } else {
      await insert('reminders', row)
      toast({ tone: 'ok', title: 'Reminder added' })
    }
    onClose()
  }
  async function del() {
    if (!existing) return
    await remove('reminders', existing.id)
    toast({ tone: 'ok', title: 'Reminder deleted' })
    onClose()
  }
  const presets = ['Check gravity', 'Add Fermaid-O', 'Taste oak', 'Check bottle carbonation', 'Rack off lees', 'Taste']
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={existing ? 'Edit reminder' : 'Add reminder'}
      footer={
        <>
          {existing && (
            <Button variant="danger" className="mr-auto" onClick={del}>
              Delete
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!title.trim()}>
            {existing ? 'Save' : 'Add'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3">
        <Field label="What">
          <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Check gravity" />
        </Field>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <Button key={p} size="xs" variant="pill" onClick={() => setTitle(p)}>
              {p}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Due">
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </Field>
          <Field label="Batch">
            <Select value={bid} onChange={(e) => setBid(e.target.value)}>
              <option value="">General</option>
              {data.batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {existing && (
          <label className="flex items-center gap-3 text-sm text-text-2">
            <Switch checked={done} onCheckedChange={setDone} /> Done
          </label>
        )}
      </div>
    </Dialog>
  )
}

// ---------------------------------------------------------------- Duplicate / Save as recipe

export function DuplicateDialog({ view, open, onClose, mode }: { view: BatchView; open: boolean; onClose: () => void; mode: 'duplicate' | 'recipe' }) {
  const { data, insert, logEvent } = useStore()
  const toast = useToast()
  const router = useRouter()
  const [name, setName] = React.useState('')
  React.useEffect(() => {
    if (open) setName(mode === 'duplicate' ? bumpVersionName(view.batch.name) : view.batch.name)
  }, [open, mode, view.batch.name])

  const recipeIngredients = (): RecipeIngredient[] =>
    [...view.inheritedIngredients, ...view.ingredients]
      .filter((i) => i.addition_stage !== 'Packaging')
      .map((i) => ({ category: i.category, name: i.name, amount: i.amount, unit: i.unit, brand: i.brand, variety: i.variety, addition_stage: i.addition_stage, notes: i.notes }))
  const recipeYeasts = (): RecipeYeast[] => [...view.inheritedYeasts, ...view.yeasts].map((y) => ({ manufacturer: y.manufacturer, strain: y.strain, amount: y.amount, unit: y.unit, notes: y.notes }))

  async function saveRecipe(): Promise<Recipe> {
    const existing = data.recipes.filter((r) => r.name.toLowerCase() === name.trim().toLowerCase())
    const version = existing.length ? Math.max(...existing.map((r) => r.version)) + 1 : 1
    return insert('recipes', {
      name: name.trim(),
      version,
      beverage_type: view.batch.beverage_type,
      style: view.batch.style,
      target_volume: view.batch.target_volume,
      volume_unit: view.batch.volume_unit,
      goal: view.batch.goal,
      ingredients: recipeIngredients(),
      yeasts: recipeYeasts(),
      notes: view.batch.notes,
      source_batch_id: view.batch.id,
    })
  }

  async function go() {
    if (!name.trim()) return
    if (mode === 'recipe') {
      const r = await saveRecipe()
      toast({ tone: 'ok', title: 'Recipe saved', message: `${r.name} v${r.version}` })
      onClose()
      router.push('/recipes')
      return
    }
    const today = todayInput()
    const nb = await insert('batches', {
      id: newId(),
      batch_code: nextBatchCode(data, view.batch.beverage_type),
      name: name.trim(),
      beverage_type: view.batch.beverage_type,
      style: view.batch.style,
      recipe_id: view.batch.recipe_id,
      batch_date: today,
      pitch_date: null,
      target_volume: view.batch.target_volume,
      volume_unit: view.batch.volume_unit,
      goal: view.batch.goal,
      stage: 'Planning',
      og: null,
      fg: null,
      fg_confirmed_at: null,
      fermentation_complete_at: null,
      current_vessel_id: null,
      notes: `Duplicated from ${view.batch.batch_code}`,
      parent_batch_id: null,
      lot_label: null,
      split_at: null,
      updated_at: new Date().toISOString(),
    })
    for (const i of recipeIngredients()) {
      await insert('batch_ingredients', { ...i, batch_id: nb.id, lot: null, added_at: null, removed_at: null, oak_toast: null, oak_form: null })
    }
    for (const y of recipeYeasts()) {
      await insert('yeasts', {
        ...y,
        batch_id: nb.id,
        pitched_at: null,
        rehydrated: false,
        rehydration_temp: null,
        rehydration_temp_unit: null,
        rehydration_minutes: null,
        rehydration_medium: null,
        lot: null,
        expiration: null,
      })
    }
    await logEvent({ batch_id: nb.id, occurred_at: new Date().toISOString(), type: 'Batch Created', stage: 'Planning', vessel_id: null, title: `Duplicated from ${view.batch.batch_code}`, notes: null })
    toast({ tone: 'ok', title: 'Batch duplicated', message: nb.batch_code })
    onClose()
    router.push(`/batches/${nb.id}`)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={mode === 'duplicate' ? 'Duplicate batch' : 'Save as recipe'}
      subtitle="Copies ingredients and yeast as defaults. Event history is not copied."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={go} disabled={!name.trim()}>
            {mode === 'duplicate' ? 'Create batch' : 'Save recipe'}
          </Button>
        </>
      }
    >
      <Field label={mode === 'duplicate' ? 'New batch name' : 'Recipe name'} hint={mode === 'recipe' ? 'Saving the same name again bumps the version.' : undefined}>
        <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="mt-3 text-xs text-text-3">
        {view.inheritedIngredients.length + view.ingredients.length} ingredients · {view.inheritedYeasts.length + view.yeasts.length} yeast
        {view.parent ? ` (includes inherited from ${view.parent.batch_code})` : ''}
      </div>
    </Dialog>
  )
}

// ---------------------------------------------------------------- Measurement (edit / delete)

export function MeasurementDialog({ measurement, open, onClose }: { measurement: Measurement | null; open: boolean; onClose: () => void }) {
  const { data, update, remove, touchBatch } = useStore()
  const toast = useToast()
  const [value, setValue] = React.useState('')
  const [when, setWhen] = React.useState(toLocalInput(null))
  const [notes, setNotes] = React.useState('')
  React.useEffect(() => {
    if (!open || !measurement) return
    setValue(String(measurement.value))
    setWhen(toLocalInput(measurement.measured_at))
    setNotes(measurement.notes ?? '')
  }, [open, measurement])
  if (!measurement) return null
  const label = measurement.type === 'sg' ? 'Specific gravity' : measurement.type === 'temp' ? 'Temperature' : measurement.type === 'ph' ? 'pH' : measurement.type === 'brix' ? 'Brix' : 'Volume'
  const unit = measurement.type === 'sg' ? 'SG' : measurement.type === 'temp' ? `°${measurement.unit}` : measurement.unit
  const n = num(value)

  async function save() {
    if (!measurement || n == null) return
    await update('batch_measurements', measurement.id, { value: n, measured_at: fromLocalInput(when), notes: str(notes) })
    await touchBatch(measurement.batch_id)
    toast({ tone: 'ok', title: 'Reading updated' })
    onClose()
  }
  async function del() {
    if (!measurement) return
    await remove('batch_measurements', measurement.id)
    // A reading event with nothing left attached is just noise on the timeline.
    if (measurement.event_id) {
      const ev = data.batch_events.find((e) => e.id === measurement.event_id)
      const others = data.batch_measurements.filter((m) => m.event_id === measurement.event_id && m.id !== measurement.id)
      if (ev && others.length === 0 && ['Gravity Reading', 'pH Reading', 'Temperature Reading'].includes(ev.type)) await remove('batch_events', ev.id)
    }
    await touchBatch(measurement.batch_id)
    toast({ tone: 'ok', title: 'Reading deleted' })
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Edit ${label.toLowerCase()} reading`}
      footer={
        <>
          <Button variant="danger" className="mr-auto" onClick={del}>
            Delete
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={n == null}>
            Save
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label={label}>
            <UnitInput autoFocus value={value} onChange={setValue} unit={unit} step={measurement.type === 'sg' ? 0.001 : measurement.type === 'ph' ? 0.01 : 'any'} />
          </Field>
          <Field label="When">
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </Field>
        </div>
        <Field label="Notes">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  )
}

// ---------------------------------------------------------------- Event (edit / delete any timeline entry)

export function EventDialog({
  event,
  open,
  onClose,
  onEditYeast,
}: {
  event: BatchEvent | null
  open: boolean
  onClose: () => void
  onEditYeast?: (yeast: Yeast) => void
}) {
  const { data, update, remove, touchBatch } = useStore()
  const toast = useToast()
  const [type, setType] = React.useState<BatchEvent['type']>('Other')
  const [when, setWhen] = React.useState(toLocalInput(null))
  const [title, setTitle] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [values, setValues] = React.useState<Record<string, string>>({})
  const linked = React.useMemo(() => (event ? data.batch_measurements.filter((m) => m.event_id === event.id) : []), [data.batch_measurements, event])
  const yeast = React.useMemo(() => {
    if (!event || event.type !== 'Yeast Pitched') return null
    const ys = data.yeasts.filter((y) => y.batch_id === event.batch_id)
    return ys.sort((a, b) => Math.abs(new Date(a.pitched_at ?? 0).getTime() - new Date(event.occurred_at).getTime()) - Math.abs(new Date(b.pitched_at ?? 0).getTime() - new Date(event.occurred_at).getTime()))[0] ?? null
  }, [data.yeasts, event])

  React.useEffect(() => {
    if (!open || !event) return
    setType(event.type)
    setWhen(toLocalInput(event.occurred_at))
    setTitle(event.title ?? '')
    setNotes(event.notes ?? '')
    setValues(Object.fromEntries(linked.map((m) => [m.id, String(m.value)])))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, event])
  if (!event) return null

  async function save() {
    if (!event) return
    const at = fromLocalInput(when)
    await update('batch_events', event.id, { type, occurred_at: at, title: str(title), notes: str(notes) })
    for (const m of linked) {
      const v = num(values[m.id])
      const patch: Partial<Measurement> = { measured_at: at }
      if (v != null && v !== m.value) patch.value = v
      await update('batch_measurements', m.id, patch)
    }
    await touchBatch(event.batch_id)
    toast({ tone: 'ok', title: 'Activity updated' })
    onClose()
  }
  async function del() {
    if (!event) return
    for (const m of linked) await remove('batch_measurements', m.id)
    await remove('batch_events', event.id)
    await touchBatch(event.batch_id)
    toast({ tone: 'ok', title: 'Activity deleted', message: linked.length ? `${linked.length} linked reading${linked.length > 1 ? 's' : ''} removed too` : undefined })
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Edit activity"
      subtitle={data.batches.find((b) => b.id === event.batch_id)?.name}
      footer={
        <>
          <Button variant="danger" className="mr-auto" onClick={del}>
            Delete
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Activity">
            <Select value={type} onChange={(e) => setType(e.target.value as BatchEvent['type'])}>
              {ACTIVITY_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="When">
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </Field>
        </div>
        {yeast && onEditYeast && (
          <button
            type="button"
            onClick={() => onEditYeast(yeast)}
            className="flex items-center justify-between rounded-xl border border-dashed border-border-2 px-3 py-2 text-left text-sm text-text-2 hover:border-accent hover:text-fg"
          >
            <span>
              Yeast record: <span className="text-fg">{`${yeast.manufacturer ?? ''} ${yeast.strain}`.trim()}</span>
            </span>
            <span className="text-xs text-accent">Edit strain →</span>
          </button>
        )}
        {linked.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {linked.map((m) => (
              <Field key={m.id} label={m.type === 'sg' ? 'Specific gravity' : m.type === 'temp' ? 'Temperature' : m.type === 'ph' ? 'pH' : m.type}>
                <UnitInput
                  value={values[m.id] ?? ''}
                  onChange={(v) => setValues((x) => ({ ...x, [m.id]: v }))}
                  unit={m.type === 'sg' ? 'SG' : m.type === 'temp' ? `°${m.unit}` : m.unit}
                  step={m.type === 'sg' ? 0.001 : m.type === 'ph' ? 0.01 : 'any'}
                />
              </Field>
            ))}
          </div>
        )}
        <Field label="Summary" hint="Short text shown next to the activity type">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  )
}
