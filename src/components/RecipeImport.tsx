'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Camera, FileText, Plus, Trash2, Upload } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea, UnitInput } from '@/components/ui/Input'
import { YeastStrainPicker } from '@/components/YeastStrainPicker'
import { useToast } from '@/components/ui/Toast'
import { useStore } from '@/lib/store'
import { toRecipe, type ExtractedRecipe } from '@/lib/recipeImport'
import {
  ADDITION_STAGES,
  BEVERAGE_TYPES,
  FERMENTATION_GOALS,
  INGREDIENT_CATEGORIES,
  INGREDIENT_UNITS,
  VOLUME_UNITS,
  type AdditionStage,
  type BeverageType,
  type FermentationGoal,
  type IngredientCategory,
  type IngredientUnit,
  type Recipe,
  type VolumeUnit,
} from '@/lib/types'

type Draft = Omit<Recipe, 'id' | 'created_at'>
type Stage = 'pick' | 'reading' | 'review'

const MAX_EDGE = 2000
const MAX_BYTES = 12 * 1024 * 1024

/** Downscale an image to ≤2000px on the long edge and re-encode as JPEG so phone photos upload fast. */
async function prepareImage(file: File): Promise<{ media_type: string; data: string }> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Could not decode this image'))
      el.src = url
    })
    const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.max(1, Math.round(img.naturalWidth * scale))
    const h = Math.max(1, Math.round(img.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas unavailable')
    ctx.drawImage(img, 0, 0, w, h)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.86)
    return { media_type: 'image/jpeg', data: dataUrl.split(',')[1] }
  } finally {
    URL.revokeObjectURL(url)
  }
}

function readBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = () => reject(new Error('Could not read file'))
    r.readAsDataURL(file)
  })
}

export function RecipeImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { insert } = useStore()
  const toast = useToast()
  const router = useRouter()
  const fileRef = React.useRef<HTMLInputElement>(null)
  const [stage, setStage] = React.useState<Stage>('pick')
  const [file, setFile] = React.useState<File | null>(null)
  const [preview, setPreview] = React.useState<string | null>(null)
  const [hint, setHint] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState<Draft | null>(null)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open) {
      setStage('pick')
      setFile(null)
      setPreview(null)
      setHint('')
      setError(null)
      setDraft(null)
      setSaving(false)
    }
  }, [open])

  React.useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const pick = (f: File | null) => {
    setError(null)
    if (!f) return
    if (f.size > MAX_BYTES) {
      setError('File is over 12 MB. Take a smaller photo or export a lighter PDF.')
      return
    }
    setFile(f)
  }

  const read = async () => {
    if (!file) return
    setStage('reading')
    setError(null)
    try {
      const payload = file.type === 'application/pdf' ? { media_type: 'application/pdf', data: await readBase64(file) } : await prepareImage(file)
      const res = await fetch('/api/recipe-import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...payload, hint: hint.trim() || undefined }),
      })
      const json = (await res.json().catch(() => ({}))) as { recipe?: ExtractedRecipe; error?: string }
      if (!res.ok || !json.recipe) throw new Error(json.error ?? `Import failed (${res.status})`)
      setDraft(toRecipe(json.recipe))
      setStage('review')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
      setStage('pick')
    }
  }

  const save = async (startBatch: boolean) => {
    if (!draft) return
    if (!draft.name.trim()) {
      setError('Give the recipe a name.')
      return
    }
    setSaving(true)
    try {
      const row = await insert('recipes', {
        ...draft,
        name: draft.name.trim(),
        style: draft.style?.trim() || null,
        ingredients: draft.ingredients.filter((i) => i.name.trim()),
        yeasts: draft.yeasts.filter((y) => y.strain.trim()),
      })
      toast({ tone: 'ok', title: 'Recipe imported', message: row.name })
      onClose()
      if (startBatch) router.push(`/batches/new?recipe=${row.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save recipe')
    } finally {
      setSaving(false)
    }
  }

  const upd = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d))

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Import recipe"
      subtitle={stage === 'review' ? 'Check what was read, then save it as a recipe template.' : 'Photo or PDF of a recipe page or SOP.'}
      className={stage === 'review' ? 'sm:max-w-2xl' : undefined}
      footer={
        stage === 'review' ? (
          <>
            <Button variant="ghost" onClick={() => setStage('pick')} disabled={saving}>
              Back
            </Button>
            <Button variant="secondary" onClick={() => save(false)} loading={saving}>
              Save recipe
            </Button>
            <Button onClick={() => save(true)} loading={saving}>
              Save &amp; start batch
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose} disabled={stage === 'reading'}>
              Cancel
            </Button>
            <Button onClick={read} disabled={!file} loading={stage === 'reading'}>
              <Upload /> Read recipe
            </Button>
          </>
        )
      }
    >
      {stage !== 'review' && (
        <div className="grid grid-cols-1 gap-4">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={stage === 'reading'}
            className="flex min-h-[160px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-2 bg-surface-2 p-4 text-center transition-colors hover:border-accent hover:bg-elevated"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Selected recipe page" className="max-h-64 w-auto max-w-full rounded-lg object-contain" />
            ) : file ? (
              <>
                <FileText size={28} className="text-accent" />
                <div className="text-sm text-fg">{file.name}</div>
              </>
            ) : (
              <>
                <Camera size={28} className="text-accent" />
                <div className="text-sm text-fg">Tap to take a photo or choose a file</div>
                <div className="text-xs text-text-3">JPEG, PNG, WebP, or PDF · one page works best</div>
              </>
            )}
          </button>
          {file && (
            <div className="flex items-center justify-between text-xs text-text-3">
              <span className="truncate">
                {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
              </span>
              <button type="button" className="hover:text-fg" onClick={() => fileRef.current?.click()} disabled={stage === 'reading'}>
                Change
              </button>
            </div>
          )}
          <Field label="Anything the page doesn't say?" hint="Optional. E.g. “this is a 1 gal batch” or “ignore the shopping list”.">
            <Input value={hint} onChange={(e) => setHint(e.target.value)} placeholder="Optional context" disabled={stage === 'reading'} />
          </Field>
          {stage === 'reading' && <div className="text-xs text-text-3">Reading the page… this usually takes 15–40 seconds.</div>}
          {error && <div className="rounded-lg border border-crit/40 bg-crit/10 px-3 py-2 text-xs text-crit">{error}</div>}
        </div>
      )}

      {stage === 'review' && draft && (
        <div className="grid grid-cols-1 gap-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Recipe name">
              <Input value={draft.name} onChange={(e) => upd({ name: e.target.value })} autoFocus />
            </Field>
            <Field label="Style / subtype">
              <Input value={draft.style ?? ''} onChange={(e) => upd({ style: e.target.value || null })} placeholder="Elderberry melomel" />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Beverage type">
              <Select value={draft.beverage_type} onChange={(e) => upd({ beverage_type: e.target.value as BeverageType })}>
                {BEVERAGE_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </Field>
            <Field label="Target volume">
              <UnitInput
                value={draft.target_volume == null ? '' : String(draft.target_volume)}
                onChange={(v) => upd({ target_volume: v === '' ? null : Number(v) })}
                unit={draft.volume_unit}
                units={VOLUME_UNITS}
                onUnitChange={(u) => upd({ volume_unit: u as VolumeUnit })}
                placeholder="—"
              />
            </Field>
            <Field label="Goal">
              <Select value={draft.goal ?? ''} onChange={(e) => upd({ goal: (e.target.value || null) as FermentationGoal | null })}>
                <option value="">—</option>
                {FERMENTATION_GOALS.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </Select>
            </Field>
          </div>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-fg">Ingredients</h3>
              <Button
                size="xs"
                variant="outline"
                onClick={() =>
                  upd({
                    ingredients: [
                      ...draft.ingredients,
                      { category: 'Other', name: '', amount: null, unit: 'g', brand: null, variety: null, addition_stage: 'Primary', notes: null },
                    ],
                  })
                }
              >
                <Plus /> Add
              </Button>
            </div>
            {draft.ingredients.length === 0 && <div className="text-xs text-text-3">No ingredients were read. Add them by hand.</div>}
            <div className="grid grid-cols-1 gap-3">
              {draft.ingredients.map((ing, idx) => {
                const set = (patch: Partial<Draft['ingredients'][number]>) =>
                  upd({ ingredients: draft.ingredients.map((x, i) => (i === idx ? { ...x, ...patch } : x)) })
                return (
                  <div key={idx} className="rounded-lg border border-border bg-surface-2 p-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                      <Input value={ing.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ingredient" />
                      <div className="flex items-center gap-2">
                        <UnitInput
                          value={ing.amount == null ? '' : String(ing.amount)}
                          onChange={(v) => set({ amount: v === '' ? null : Number(v) })}
                          unit={ing.unit ?? 'g'}
                          units={INGREDIENT_UNITS}
                          onUnitChange={(u) => set({ unit: u as IngredientUnit })}
                          placeholder="—"
                          className="w-full sm:w-44"
                        />
                        <button type="button" className="shrink-0 text-text-3 hover:text-crit" aria-label="Remove ingredient" onClick={() => upd({ ingredients: draft.ingredients.filter((_, i) => i !== idx) })}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Select value={ing.category} onChange={(e) => set({ category: e.target.value as IngredientCategory })}>
                        {INGREDIENT_CATEGORIES.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </Select>
                      <Select value={ing.addition_stage ?? 'Primary'} onChange={(e) => set({ addition_stage: e.target.value as AdditionStage })}>
                        {ADDITION_STAGES.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </Select>
                    </div>
                    {ing.notes && <div className="mt-1.5 text-xs text-text-3">{ing.notes}</div>}
                  </div>
                )
              })}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-fg">Yeast</h3>
              <Button size="xs" variant="outline" onClick={() => upd({ yeasts: [...draft.yeasts, { manufacturer: null, strain: '', amount: null, unit: 'g', notes: null }] })}>
                <Plus /> Add
              </Button>
            </div>
            {draft.yeasts.length === 0 && <div className="text-xs text-text-3">No yeast was read.</div>}
            <div className="grid grid-cols-1 gap-3">
              {draft.yeasts.map((y, idx) => {
                const set = (patch: Partial<Draft['yeasts'][number]>) => upd({ yeasts: draft.yeasts.map((x, i) => (i === idx ? { ...x, ...patch } : x)) })
                return (
                  <div key={idx} className="rounded-lg border border-border bg-surface-2 p-3">
                    <YeastStrainPicker manufacturer={y.manufacturer} strain={y.strain} onChange={(v) => set(v)} />
                    <div className="mt-2 flex items-center gap-2">
                      <UnitInput
                        value={y.amount == null ? '' : String(y.amount)}
                        onChange={(v) => set({ amount: v === '' ? null : Number(v) })}
                        unit={y.unit ?? 'g'}
                        units={['g', 'packet']}
                        onUnitChange={(u) => set({ unit: u as 'g' | 'packet' })}
                        placeholder="Amount"
                        className="w-full sm:w-44"
                      />
                      <button type="button" className="shrink-0 text-text-3 hover:text-crit" aria-label="Remove yeast" onClick={() => upd({ yeasts: draft.yeasts.filter((_, i) => i !== idx) })}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <Field label="Notes" hint="Reference gravities, procedure, and author notes read from the page. Edit freely.">
            <Textarea rows={8} value={draft.notes ?? ''} onChange={(e) => upd({ notes: e.target.value || null })} className="font-mono text-xs" />
          </Field>
          {error && <div className="rounded-lg border border-crit/40 bg-crit/10 px-3 py-2 text-xs text-crit">{error}</div>}
        </div>
      )}
    </Dialog>
  )
}
