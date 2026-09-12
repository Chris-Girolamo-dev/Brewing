'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea, UnitInput } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { ACTIVITY_TYPES, BATCH_STAGES, INGREDIENT_UNITS, VOLUME_UNITS, type ActivityType, type Batch, type Measurement, type Transfer } from '@/lib/types'
import { estimatedAbv, brixToSg } from '@/lib/calc/fermentation'
import { buildBatchView, isActive } from '@/lib/derive'
import { formatGravity, preferredTempUnit, preferredSmallVolumeUnit } from '@/lib/calc/units'
import { fromLocalInput, num, str, toLocalInput } from '@/lib/utils'
import { newId } from '@/lib/data'
import { useShell } from '@/components/AppShell'
import { Split } from 'lucide-react'

/**
 * The 5–15 second logging flow. Pick a batch (pre-filled when opened from a batch page),
 * pick an activity type, fill the one or two fields that matter, save. Everything else
 * (timestamp, stage, vessel, previous SG, estimated ABV) is filled in automatically.
 */
export function LogActivityDialog({
  open,
  onClose,
  batchId,
  preset,
}: {
  open: boolean
  onClose: () => void
  batchId?: string
  preset?: string
}) {
  const { data, prefs, insert, touchBatch } = useStore()
  const toast = useToast()
  const router = useRouter()
  const { openSplit } = useShell()

  const activeBatches = React.useMemo(() => data.batches.filter(isActive).concat(data.batches.filter((b) => !isActive(b))), [data.batches])

  const [bid, setBid] = React.useState(batchId ?? '')
  const [type, setType] = React.useState<ActivityType>((preset as ActivityType) ?? 'Gravity Reading')
  const [when, setWhen] = React.useState(toLocalInput(null))
  const [notes, setNotes] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  // Measurement fields
  const [sg, setSg] = React.useState('')
  const [gravityMode, setGravityMode] = React.useState<'SG' | 'Brix'>('SG')
  const [temp, setTemp] = React.useState('')
  const [ph, setPh] = React.useState('')
  // Transfer fields
  const [fromV, setFromV] = React.useState('')
  const [toV, setToV] = React.useState('')
  const [volBefore, setVolBefore] = React.useState('')
  const [volAfter, setVolAfter] = React.useState('')
  const [volUnit, setVolUnit] = React.useState<string>(preferredSmallVolumeUnit(prefs.unit_system))
  const [method, setMethod] = React.useState('')
  const [reason, setReason] = React.useState('')
  // Addition fields
  const [addName, setAddName] = React.useState('')
  const [addAmount, setAddAmount] = React.useState('')
  const [addUnit, setAddUnit] = React.useState<string>('g')
  // Stage change
  const [newStage, setNewStage] = React.useState<string>('')
  // Pasteurization
  const [pastTemp, setPastTemp] = React.useState('')
  const [pastMinutes, setPastMinutes] = React.useState('')
  const [pastMethod, setPastMethod] = React.useState('Stovetop water bath')

  React.useEffect(() => {
    if (!open) return
    setBid(batchId ?? (activeBatches[0]?.id ?? ''))
    setType((preset as ActivityType) ?? 'Gravity Reading')
    setWhen(toLocalInput(null))
    setNotes('')
    setSg('')
    setTemp('')
    setPh('')
    setFromV('')
    setToV('')
    setVolBefore('')
    setVolAfter('')
    setMethod('')
    setReason('')
    setAddName('')
    setAddAmount('')
    setNewStage('')
    setPastTemp('')
    setPastMinutes('')
    setPastMethod('Stovetop water bath')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, batchId, preset])

  const batch: Batch | undefined = data.batches.find((b) => b.id === bid)
  const view = React.useMemo(() => (batch ? buildBatchView(data, batch, prefs) : null), [data, batch, prefs])
  const tempUnit = preferredTempUnit(prefs.unit_system)

  React.useEffect(() => {
    if (view?.vessel) setFromV(view.vessel.id)
  }, [view?.vessel])

  const sgValue = React.useMemo(() => {
    const n = num(sg)
    if (n == null) return null
    return gravityMode === 'Brix' ? brixToSg(n) : n
  }, [sg, gravityMode])
  const previewAbv = view && sgValue != null ? estimatedAbv(view.og, sgValue) : null

  const showGravity = type === 'Gravity Reading'
  const showTemp = type === 'Gravity Reading' || type === 'Temperature Reading' || type === 'Cold Crash Started'
  const showPh = type === 'pH Reading' || type === 'Acid Adjustment'
  const showTransfer = type === 'Racked'
  const showAddition = [
    'Ingredient Added',
    'Nutrient Addition',
    'Acid Adjustment',
    'Tannin Adjustment',
    'Oak Added',
    'Fining Added',
    'Backsweetened',
    'Stabilized',
  ].includes(type)
  const showStage = type === 'Stage Changed'
  const showPasteurize = type === 'Pasteurized'
  const needsNotesOnly = !showGravity && !showTemp && !showPh && !showTransfer && !showAddition && !showStage && !showPasteurize

  const canSave =
    !!batch &&
    (showGravity ? sgValue != null : true) &&
    (type === 'Temperature Reading' ? num(temp) != null : true) &&
    (type === 'pH Reading' ? num(ph) != null : true) &&
    (showStage ? !!newStage : true)

  async function save() {
    if (!batch || !view) return
    setSaving(true)
    try {
      const occurred_at = fromLocalInput(when)
      const eventId = newId()
      const parts: string[] = []
      const vessel_id = batch.current_vessel_id

      const measurements: Omit<Measurement, 'id' | 'created_at'>[] = []
      if (showGravity && sgValue != null) {
        measurements.push({ batch_id: batch.id, event_id: eventId, measured_at: occurred_at, type: 'sg', value: sgValue, unit: 'SG', stage: batch.stage, vessel_id, notes: null })
        parts.push(`SG ${formatGravity(sgValue)}`)
      }
      const t = num(temp)
      if (showTemp && t != null) {
        measurements.push({ batch_id: batch.id, event_id: eventId, measured_at: occurred_at, type: 'temp', value: t, unit: tempUnit, stage: batch.stage, vessel_id, notes: null })
        parts.push(`${t}°${tempUnit}`)
      }
      const p = num(ph)
      if (showPh && p != null) {
        measurements.push({ batch_id: batch.id, event_id: eventId, measured_at: occurred_at, type: 'ph', value: p, unit: 'pH', stage: batch.stage, vessel_id, notes: null })
        parts.push(`pH ${p}`)
      }

      let transfer: Omit<Transfer, 'id' | 'created_at'> | null = null
      if (showTransfer) {
        transfer = {
          batch_id: batch.id,
          event_id: eventId,
          transferred_at: occurred_at,
          from_vessel_id: str(fromV),
          to_vessel_id: str(toV),
          to_batch_id: null,
          volume_before: num(volBefore),
          volume_after: num(volAfter),
          volume_unit: volUnit as Transfer['volume_unit'],
          method: str(method),
          reason: str(reason),
          headspace: null,
          notes: null,
        }
        const fn = data.vessels.find((v) => v.id === fromV)?.name
        const tn = data.vessels.find((v) => v.id === toV)?.name
        if (fn || tn) parts.push(`${fn ?? '?'} → ${tn ?? '?'}`)
        const vb = num(volBefore)
        const va = num(volAfter)
        if (vb != null && va != null) parts.push(`${vb} → ${va} ${volUnit}`)
      }

      if (showAddition && str(addName)) {
        const amt = num(addAmount)
        parts.push(`${addName}${amt != null ? ` ${amt} ${addUnit}` : ''}`)
      }
      if (showStage && newStage) parts.push(`→ ${newStage}`)
      if (showPasteurize) {
        const pt = num(pastTemp)
        const pm = num(pastMinutes)
        if (pt != null) parts.push(`${pt}°${tempUnit}`)
        if (pm != null) parts.push(`${pm} min hold`)
        if (str(pastMethod)) parts.push(pastMethod.trim())
      }

      const title = parts.length ? parts.join(' · ') : null

      await insert('batch_events', {
        id: eventId,
        batch_id: batch.id,
        occurred_at,
        type,
        stage: showStage ? (newStage as Batch['stage']) : batch.stage,
        vessel_id,
        title,
        notes: str(notes),
      })
      for (const m of measurements) await insert('batch_measurements', m)
      if (transfer) await insert('batch_transfers', transfer)
      if (showAddition && str(addName)) {
        const category =
          type === 'Nutrient Addition'
            ? 'Nutrient'
            : type === 'Acid Adjustment'
              ? 'Acid'
              : type === 'Tannin Adjustment'
                ? 'Tannin'
                : type === 'Oak Added'
                  ? 'Oak'
                  : type === 'Fining Added'
                    ? 'Fining Agent'
                    : type === 'Stabilized'
                      ? 'Stabilizer'
                      : type === 'Backsweetened'
                        ? 'Sugar'
                        : 'Other'
        await insert('batch_ingredients', {
          batch_id: batch.id,
          category,
          name: addName.trim(),
          amount: num(addAmount),
          unit: addUnit as never,
          brand: null,
          variety: null,
          lot: null,
          addition_stage: stageToAdditionStage(batch.stage),
          added_at: occurred_at,
          removed_at: null,
          oak_toast: null,
          oak_form: null,
          notes: str(notes),
        })
      }

      const patch: Partial<Batch> = {}
      if (transfer?.to_vessel_id) patch.current_vessel_id = transfer.to_vessel_id
      if (showStage && newStage) patch.stage = newStage as Batch['stage']
      if (type === 'Bottled' || type === 'Kegged') patch.stage = 'Bottle Conditioning'
      if (showGravity && view.og == null && sgValue != null) patch.og = sgValue
      await touchBatch(batch.id, patch)

      toast({ tone: 'ok', title: `${type} logged`, message: `${batch.name}${title ? ` · ${title}` : ''}` })
      onClose()
      router.push(`/batches/${batch.id}`)
    } catch (e) {
      toast({ tone: 'crit', title: 'Could not save', message: e instanceof Error ? e.message : String(e) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Log activity"
      subtitle={batch ? `${batch.name} · ${batch.batch_code}` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!canSave} loading={saving}>
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Batch">
            <Select value={bid} onChange={(e) => setBid(e.target.value)}>
              {activeBatches.length === 0 && <option value="">No batches yet</option>}
              {activeBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} · {b.batch_code}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Activity">
            <Select value={type} onChange={(e) => setType(e.target.value as ActivityType)}>
              {ACTIVITY_TYPES.filter((t) => t !== 'Batch Created').map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {showGravity && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label={gravityMode === 'SG' ? 'Specific gravity' : 'Brix'}
              hint={
                view?.latestSg
                  ? `Previous: ${formatGravity(view.latestSg.value)}${previewAbv != null ? ` · Est. ABV ${previewAbv}%` : ''}`
                  : view?.og
                    ? `OG ${formatGravity(view.og)}${previewAbv != null ? ` · Est. ABV ${previewAbv}%` : ''}`
                    : 'First reading becomes OG'
              }
            >
              <UnitInput
                autoFocus
                value={sg}
                onChange={setSg}
                unit={gravityMode}
                units={['SG', 'Brix']}
                onUnitChange={(u) => setGravityMode(u as 'SG' | 'Brix')}
                step={gravityMode === 'SG' ? 0.001 : 0.1}
                placeholder={gravityMode === 'SG' ? '1.014' : '12.0'}
              />
            </Field>
            <Field label="Temperature (optional)">
              <UnitInput value={temp} onChange={setTemp} unit={`°${tempUnit}`} placeholder="68" />
            </Field>
          </div>
        )}

        {!showGravity && showTemp && (
          <Field label="Temperature">
            <UnitInput autoFocus value={temp} onChange={setTemp} unit={`°${tempUnit}`} placeholder="68" />
          </Field>
        )}

        {showPh && (
          <Field label="pH">
            <UnitInput autoFocus={!showGravity} value={ph} onChange={setPh} unit="pH" step={0.01} placeholder="3.4" />
          </Field>
        )}

        {showTransfer && batch && !batch.parent_batch_id && batch.stage !== 'Split' && (
          <button
            type="button"
            onClick={() => openSplit(batch.id)}
            className="flex items-center justify-between rounded-xl border border-dashed border-border-2 px-3 py-2 text-left text-sm text-text-2 hover:border-accent hover:text-fg"
          >
            <span>
              <Split size={14} className="mr-2 inline text-accent" />
              Splitting into multiple vessels? <span className="text-text-3">Create sub-lots instead.</span>
            </span>
            <span className="text-xs text-accent">Split →</span>
          </button>
        )}
        {showTransfer && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="From vessel">
                <Select value={fromV} onChange={(e) => setFromV(e.target.value)}>
                  <option value="">—</option>
                  {data.vessels.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="To vessel">
                <Select value={toV} onChange={(e) => setToV(e.target.value)}>
                  <option value="">—</option>
                  {data.vessels.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Volume before">
                <UnitInput value={volBefore} onChange={setVolBefore} unit={volUnit} units={VOLUME_UNITS} onUnitChange={setVolUnit} placeholder="128" />
              </Field>
              <Field
                label="Volume after"
                hint={
                  num(volBefore) != null && num(volAfter) != null
                    ? `Loss: ${Math.round((num(volBefore)! - num(volAfter)!) * 100) / 100} ${volUnit}`
                    : undefined
                }
              >
                <UnitInput value={volAfter} onChange={setVolAfter} unit={volUnit} placeholder="125" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Method">
                <Input value={method} onChange={(e) => setMethod(e.target.value)} placeholder="Auto-siphon" />
              </Field>
              <Field label="Reason">
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Remove from lees / fruit" />
              </Field>
            </div>
          </>
        )}

        {showAddition && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="What">
              <Input
                autoFocus
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder={type === 'Nutrient Addition' ? 'Fermaid-O' : type === 'Stabilized' ? 'Potassium sorbate' : 'Ingredient'}
              />
            </Field>
            <Field label="Amount">
              <UnitInput value={addAmount} onChange={setAddAmount} unit={addUnit} units={INGREDIENT_UNITS} onUnitChange={setAddUnit} placeholder="2.0" />
            </Field>
          </div>
        )}

        {showPasteurize && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="Temperature" hint="Liquid or bottle core temp">
              <UnitInput autoFocus value={pastTemp} onChange={setPastTemp} unit={`°${tempUnit}`} placeholder={tempUnit === 'F' ? '165' : '74'} />
            </Field>
            <Field label="Hold time">
              <UnitInput value={pastMinutes} onChange={setPastMinutes} unit="min" inputMode="numeric" placeholder="10" />
            </Field>
            <Field label="Method" className="col-span-2 sm:col-span-1">
              <Select value={pastMethod} onChange={(e) => setPastMethod(e.target.value)}>
                {['Stovetop water bath', 'Sous vide', 'Bottle pasteurization', 'Bulk in vessel', 'Other'].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
            </Field>
          </div>
        )}

        {showStage && (
          <Field label="New stage">
            <Select value={newStage} onChange={(e) => setNewStage(e.target.value)}>
              <option value="">Choose…</option>
              {BATCH_STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="When">
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </Field>
          {view && (
            <div className="rounded-lg border border-border bg-canvas px-3 py-2 text-xs text-text-3">
              <div>
                Day {view.dayNumber ?? '—'} · {batch?.stage}
              </div>
              <div>{view.vessel ? view.vessel.name : 'No vessel assigned'}</div>
            </div>
          )}
        </div>

        <Field label={needsNotesOnly ? 'Notes' : 'Notes (optional)'}>
          <Textarea autoFocus={needsNotesOnly} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Still slightly sweet…" />
        </Field>
      </div>
    </Dialog>
  )
}

function stageToAdditionStage(stage: Batch['stage']) {
  switch (stage) {
    case 'Primary Fermentation':
    case 'Prepared':
    case 'Planning':
      return 'Primary' as const
    case 'Secondary / Clearing':
      return 'Secondary' as const
    case 'Stabilizing':
      return 'Stabilization' as const
    case 'Aging':
    case 'Packaged / Aging':
      return 'Aging' as const
    case 'Ready to Package':
    case 'Bottle Conditioning':
      return 'Packaging' as const
    default:
      return 'Other' as const
  }
}
