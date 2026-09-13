'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from 'lucide-react'
import { useStore } from '@/lib/store'
import { nextBatchCode } from '@/lib/derive'
import { PageHeader, Loading } from '@/components/PageHeader'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea, UnitInput } from '@/components/ui/Input'
import { SegmentedControl } from '@/components/ui/Tabs'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/components/ui/Toast'
import { newId } from '@/lib/data'
import {
  BEVERAGE_TYPES,
  FERMENTATION_GOALS,
  INGREDIENT_CATEGORIES,
  INGREDIENT_UNITS,
  VOLUME_UNITS,
  type BeverageType,
  type FermentationGoal,
  type RecipeIngredient,
  type RecipeYeast,
  type VolumeUnit,
} from '@/lib/types'
import { preferredVolumeUnit } from '@/lib/calc/units'
import { fromLocalInput, num, str, todayInput, toLocalInput } from '@/lib/utils'
import { YeastStrainPicker } from '@/components/YeastStrainPicker'
import { yeastLabel } from '@/lib/yeasts'

type Step = 1 | 2 | 3 | 4

function NewBatchForm() {
  const { data, prefs, ready, insert, logEvent } = useStore()
  const toast = useToast()
  const router = useRouter()
  const params = useSearchParams()
  const recipeParam = params.get('recipe')

  const [step, setStep] = React.useState<Step>(1)
  const [name, setName] = React.useState('')
  const [beverage, setBeverage] = React.useState<BeverageType>('Cider')
  const [code, setCode] = React.useState('')
  const [codeTouched, setCodeTouched] = React.useState(false)
  const [style, setStyle] = React.useState('')
  const [recipeId, setRecipeId] = React.useState(recipeParam ?? '')
  const [date, setDate] = React.useState(todayInput())
  const [volume, setVolume] = React.useState('1')
  const [volUnit, setVolUnit] = React.useState<VolumeUnit>(preferredVolumeUnit(prefs.unit_system))
  const [goal, setGoal] = React.useState<FermentationGoal | ''>('')
  const [vesselId, setVesselId] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [ingredients, setIngredients] = React.useState<RecipeIngredient[]>([])
  const [yeasts, setYeasts] = React.useState<RecipeYeast[]>([])
  const [pitchNow, setPitchNow] = React.useState(false)
  const [pitchAt, setPitchAt] = React.useState(toLocalInput(null))
  const [og, setOg] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!codeTouched && ready) setCode(nextBatchCode(data, beverage))
  }, [beverage, data, codeTouched, ready])

  const applyRecipe = React.useCallback(
    (id: string) => {
      setRecipeId(id)
      const r = data.recipes.find((x) => x.id === id)
      if (!r) return
      setName((n) => n || `${r.name} v${r.version + 1}`)
      setBeverage(r.beverage_type)
      setStyle(r.style ?? '')
      if (r.target_volume != null) setVolume(String(r.target_volume))
      setVolUnit(r.volume_unit)
      setGoal(r.goal ?? '')
      setIngredients(r.ingredients)
      setYeasts(r.yeasts)
    },
    [data.recipes]
  )
  React.useEffect(() => {
    if (recipeParam && ready) applyRecipe(recipeParam)
  }, [recipeParam, ready, applyRecipe])

  if (!ready) return <Loading />

  const canNext = step === 1 ? name.trim().length > 0 && code.trim().length > 0 : true

  async function create() {
    setSaving(true)
    try {
      const id = newId()
      const pitch = pitchNow ? fromLocalInput(pitchAt) : null
      await insert('batches', {
        id,
        batch_code: code.trim(),
        name: name.trim(),
        beverage_type: beverage,
        style: str(style),
        recipe_id: recipeId || null,
        batch_date: date,
        pitch_date: pitch,
        target_volume: num(volume),
        volume_unit: volUnit,
        goal: goal || null,
        stage: pitch ? 'Primary Fermentation' : 'Planning',
        og: num(og),
        fg: null,
        fg_confirmed_at: null,
        fermentation_complete_at: null,
        current_vessel_id: vesselId || null,
        notes: str(notes),
        parent_batch_id: null,
        lot_label: null,
        split_at: null,
        updated_at: new Date().toISOString(),
      })
      const created = new Date(`${date}T12:00:00`).toISOString()
      await logEvent({ batch_id: id, occurred_at: created, type: 'Batch Created', stage: 'Planning', vessel_id: vesselId || null, title: null, notes: null })
      for (const i of ingredients) {
        if (!i.name.trim()) continue
        await insert('batch_ingredients', {
          batch_id: id,
          category: i.category,
          name: i.name.trim(),
          amount: i.amount,
          unit: i.unit,
          brand: str(i.brand),
          variety: str(i.variety),
          lot: null,
          addition_stage: i.addition_stage ?? 'Primary',
          added_at: i.addition_stage === 'Primary' || !i.addition_stage ? (pitch ?? created) : null,
          removed_at: null,
          oak_toast: null,
          oak_form: null,
          notes: str(i.notes),
        })
      }
      for (const y of yeasts) {
        if (!y.strain.trim()) continue
        await insert('yeasts', {
          batch_id: id,
          manufacturer: str(y.manufacturer),
          strain: y.strain.trim(),
          amount: y.amount,
          unit: y.unit,
          pitched_at: pitch,
          rehydrated: false,
          rehydration_temp: null,
          rehydration_temp_unit: null,
          rehydration_minutes: null,
          rehydration_medium: null,
          lot: null,
          expiration: null,
          notes: str(y.notes),
        })
        if (pitch)
          await logEvent({ batch_id: id, occurred_at: pitch, type: 'Yeast Pitched', stage: 'Primary Fermentation', vessel_id: vesselId || null, title: yeastLabel(y), notes: null })
      }
      const ogN = num(og)
      if (ogN != null) {
        const at = pitch ?? created
        const ev = await logEvent({ batch_id: id, occurred_at: at, type: 'Gravity Reading', stage: pitch ? 'Primary Fermentation' : 'Prepared', vessel_id: vesselId || null, title: `OG ${ogN.toFixed(3)}`, notes: null })
        await insert('batch_measurements', { batch_id: id, event_id: ev.id, measured_at: at, type: 'sg', value: ogN, unit: 'SG', stage: pitch ? 'Primary Fermentation' : 'Prepared', vessel_id: vesselId || null, notes: 'Original gravity' })
      }
      toast({ tone: 'ok', title: 'Batch created', message: code })
      router.push(`/batches/${id}`)
    } catch (e) {
      toast({ tone: 'crit', title: 'Could not create batch', message: e instanceof Error ? e.message : String(e) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader eyebrow="New batch" title={name.trim() || 'Create a batch'} subtitle={<span className="font-mono">{code}</span>} />

      <SegmentedControl<string>
        fullWidth
        size="md"
        value={String(step)}
        onChange={(v) => setStep(Number(v) as Step)}
        options={[
          { value: '1', label: '1 · Basics', dot: name.trim().length > 0 },
          { value: '2', label: '2 · Ingredients', dot: ingredients.length > 0 },
          { value: '3', label: '3 · Yeast', dot: yeasts.length > 0 },
          { value: '4', label: '4 · Review' },
        ]}
        className="mb-5"
      />

      <Card>
        <CardBody>
          {step === 1 && (
            <div className="grid gap-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Batch name">
                  <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Blueberry Mead" />
                </Field>
                <Field label="Batch ID" hint="Auto-generated, editable">
                  <Input
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value)
                      setCodeTouched(true)
                    }}
                    className="font-mono"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Beverage type">
                  <Select value={beverage} onChange={(e) => setBeverage(e.target.value as BeverageType)}>
                    {BEVERAGE_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Style / subtype">
                  <Input value={style} onChange={(e) => setStyle(e.target.value)} placeholder="Blueberry melomel" />
                </Field>
                <Field label="Recipe" hint="Pre-fills ingredients and yeast">
                  <Select value={recipeId} onChange={(e) => applyRecipe(e.target.value)}>
                    <option value="">Blank</option>
                    {data.recipes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} v{r.version}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field label="Batch date">
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </Field>
                <Field label="Target volume">
                  <UnitInput value={volume} onChange={setVolume} unit={volUnit} units={VOLUME_UNITS} onUnitChange={(u) => setVolUnit(u as VolumeUnit)} />
                </Field>
                <Field label="Fermentation goal">
                  <Select value={goal} onChange={(e) => setGoal(e.target.value as FermentationGoal | '')}>
                    <option value="">—</option>
                    {FERMENTATION_GOALS.map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Vessel">
                  <Select value={vesselId} onChange={(e) => setVesselId(e.target.value)}>
                    <option value="">—</option>
                    {data.vessels.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Notes">
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-3">
              <div className="text-xs text-text-3">Each ingredient is its own record. Add nutrients, finings, and later additions from the batch page as they happen.</div>
              {ingredients.map((i, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 rounded-xl border border-border bg-canvas p-3 sm:grid-cols-[140px_1fr_160px_120px_auto]">
                  <Select value={i.category} onChange={(e) => patchIng(idx, { category: e.target.value as RecipeIngredient['category'] })}>
                    {INGREDIENT_CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </Select>
                  <Input value={i.name} onChange={(e) => patchIng(idx, { name: e.target.value })} placeholder="Wildflower honey" />
                  <UnitInput
                    value={i.amount?.toString() ?? ''}
                    onChange={(v) => patchIng(idx, { amount: num(v) })}
                    unit={i.unit ?? 'lb'}
                    units={INGREDIENT_UNITS}
                    onUnitChange={(u) => patchIng(idx, { unit: u as RecipeIngredient['unit'] })}
                    className="col-span-2 sm:col-span-1"
                  />
                  <Input value={i.brand ?? ''} onChange={(e) => patchIng(idx, { brand: e.target.value })} placeholder="Brand" className="hidden sm:block" />
                  <button className="text-text-3 hover:text-crit" onClick={() => setIngredients((xs) => xs.filter((_, j) => j !== idx))} aria-label="Remove">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setIngredients((xs) => [...xs, blankIng('Honey')])}>
                  <Plus /> Add ingredient
                </Button>
                {['Juice', 'Fruit', 'Honey', 'Sugar', 'Water', 'Nutrient'].map((c) => (
                  <Button key={c} size="sm" variant="pill" onClick={() => setIngredients((xs) => [...xs, blankIng(c as RecipeIngredient['category'])])}>
                    + {c}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-4">
              {yeasts.map((y, idx) => (
                <div key={idx} className="grid grid-cols-1 gap-2 rounded-xl border border-border bg-canvas p-3 sm:grid-cols-[2fr_160px_auto] sm:items-start">
                  <YeastStrainPicker manufacturer={y.manufacturer} strain={y.strain} onChange={(v) => patchYeast(idx, v)} />
                  <UnitInput value={y.amount?.toString() ?? ''} onChange={(v) => patchYeast(idx, { amount: num(v) })} unit={y.unit ?? 'g'} units={['g', 'packet']} onUnitChange={(u) => patchYeast(idx, { unit: u as RecipeYeast['unit'] })} />
                  <button className="justify-self-end text-text-3 hover:text-crit" onClick={() => setYeasts((xs) => xs.filter((_, j) => j !== idx))} aria-label="Remove">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <div>
                <Button variant="secondary" onClick={() => setYeasts((xs) => [...xs, { manufacturer: 'Lalvin', strain: '', amount: 5, unit: 'g', notes: null }])}>
                  <Plus /> Add yeast
                </Button>
              </div>
              <div className="rounded-xl border border-border bg-canvas p-4">
                <label className="flex items-center gap-3 text-sm text-fg">
                  <Switch checked={pitchNow} onCheckedChange={setPitchNow} /> Pitched already — start the fermentation clock
                </label>
                {pitchNow && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Field label="Pitch date/time">
                      <Input type="datetime-local" value={pitchAt} onChange={(e) => setPitchAt(e.target.value)} />
                    </Field>
                    <Field label="Original gravity" hint="Logged as the first reading">
                      <UnitInput value={og} onChange={setOg} unit="SG" step={0.001} placeholder="1.120" />
                    </Field>
                  </div>
                )}
                {!pitchNow && (
                  <div className="mt-3 max-w-xs">
                    <Field label="Original gravity (optional)">
                      <UnitInput value={og} onChange={setOg} unit="SG" step={0.001} placeholder="1.120" />
                    </Field>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="grid gap-4 text-sm">
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5">
                <R k="Name" v={name} />
                <R k="Batch ID" v={code} />
                <R k="Type" v={`${beverage}${style ? ` · ${style}` : ''}`} />
                <R k="Date" v={date} />
                <R k="Volume" v={`${volume} ${volUnit}`} />
                <R k="Goal" v={goal || '—'} />
                <R k="Vessel" v={data.vessels.find((v) => v.id === vesselId)?.name ?? '—'} />
                <R k="Pitch" v={pitchNow ? pitchAt.replace('T', ' ') : 'Not yet'} />
                <R k="OG" v={og || '—'} />
              </dl>
              <div>
                <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-text-3">Ingredients ({ingredients.filter((i) => i.name.trim()).length})</div>
                <ul className="text-text-2">
                  {ingredients
                    .filter((i) => i.name.trim())
                    .map((i, idx) => (
                      <li key={idx}>
                        {i.name} {i.amount != null ? `· ${i.amount} ${i.unit ?? ''}` : ''} <span className="text-text-3">({i.category})</span>
                      </li>
                    ))}
                </ul>
              </div>
              <div>
                <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-text-3">Yeast ({yeasts.filter((y) => y.strain.trim()).length})</div>
                <ul className="text-text-2">
                  {yeasts
                    .filter((y) => y.strain.trim())
                    .map((y, idx) => (
                      <li key={idx}>
                        {y.manufacturer} {y.strain} {y.amount != null ? `· ${y.amount} ${y.unit}` : ''}
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
            <Button variant="ghost" disabled={step === 1} onClick={() => setStep((s) => (s - 1) as Step)}>
              <ArrowLeft /> Back
            </Button>
            {step < 4 ? (
              <Button disabled={!canNext} onClick={() => setStep((s) => (s + 1) as Step)}>
                Next <ArrowRight />
              </Button>
            ) : (
              <Button onClick={create} loading={saving} disabled={!name.trim() || !code.trim()}>
                <Check /> Create batch
              </Button>
            )}
          </div>
        </CardBody>
      </Card>
    </>
  )

  function patchIng(idx: number, p: Partial<RecipeIngredient>) {
    setIngredients((xs) => xs.map((x, j) => (j === idx ? { ...x, ...p } : x)))
  }
  function patchYeast(idx: number, p: Partial<RecipeYeast>) {
    setYeasts((xs) => xs.map((x, j) => (j === idx ? { ...x, ...p } : x)))
  }
}

function blankIng(category: RecipeIngredient['category']): RecipeIngredient {
  const unit: RecipeIngredient['unit'] = category === 'Juice' || category === 'Water' ? 'gal' : category === 'Nutrient' ? 'g' : 'lb'
  return { category, name: '', amount: null, unit, brand: null, variety: null, addition_stage: 'Primary', notes: null }
}

function R({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="text-text-3">{k}</dt>
      <dd className="text-fg">{v}</dd>
    </>
  )
}

export default function NewBatchPage() {
  return (
    <React.Suspense fallback={<Loading />}>
      <NewBatchForm />
    </React.Suspense>
  )
}
