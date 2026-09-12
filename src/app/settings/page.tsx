'use client'

import * as React from 'react'
import { Download, RotateCcw } from 'lucide-react'
import { useStore } from '@/lib/store'
import { PageHeader, Loading } from '@/components/PageHeader'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Input'
import { SegmentedControl } from '@/components/ui/Tabs'
import { StatusPill } from '@/components/ui/Badge'
import { exportBatchesCsv, downloadText } from '@/lib/csv'
import { ACTIVITY_TYPES, BATCH_STAGES, BEVERAGE_TYPES, INGREDIENT_CATEGORIES, type UnitSystem } from '@/lib/types'
import { Dialog } from '@/components/ui/Dialog'

export default function SettingsPage() {
  const { data, prefs, setPrefs, ready, mode, resetDemo } = useStore()
  const [confirm, setConfirm] = React.useState(false)
  if (!ready) return <Loading />

  return (
    <>
      <PageHeader eyebrow="Settings" title="Preferences" subtitle="Units, gravity-stability rule, data, and the controlled vocabularies." />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Units</CardTitle>
          </CardHeader>
          <CardBody className="grid gap-4 pt-3">
            <Field label="Display system" hint="Values are stored as entered and converted for display. You can always type “2.5 lb honey” regardless of this setting.">
              <SegmentedControl<UnitSystem>
                size="md"
                value={prefs.unit_system}
                onChange={(v) => setPrefs({ unit_system: v })}
                options={[
                  { value: 'us', label: 'US customary (gal · oz · lb · °F)' },
                  { value: 'metric', label: 'Metric (L · mL · g · °C)' },
                ]}
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Final gravity detection</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-2 gap-3 pt-3">
            <Field label="Stable across (days)" hint="Two readings this far apart…">
              <Input type="number" inputMode="numeric" min={1} value={prefs.stable_gravity_days} onChange={(e) => setPrefs({ stable_gravity_days: Math.max(1, Number(e.target.value) || 1) })} />
            </Field>
            <Field label="Tolerance (SG)" hint="…within this difference flag “gravity appears stable”.">
              <ToleranceInput value={prefs.stable_gravity_tolerance} onChange={(v) => setPrefs({ stable_gravity_tolerance: v })} />
            </Field>
            <div className="col-span-2 text-xs text-text-3">Fermentation is never marked complete automatically. You confirm FG from the batch page.</div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data</CardTitle>
            <StatusPill tone={mode === 'supabase' ? 'ok' : 'warn'}>{mode === 'supabase' ? 'Supabase' : 'Demo · browser storage'}</StatusPill>
          </CardHeader>
          <CardBody className="grid gap-3 pt-3">
            <p className="text-sm text-text-2">
              {mode === 'supabase'
                ? 'Connected to Supabase Postgres via NEXT_PUBLIC_SUPABASE_URL.'
                : 'No Supabase environment variables found. Data lives in this browser only. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and run the migration to persist to Postgres.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => exportBatchesCsv(data, prefs)}>
                <Download /> Batches CSV
              </Button>
              <Button variant="secondary" onClick={() => downloadText(`ferment-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), 'application/json')}>
                <Download /> Full JSON backup
              </Button>
              {mode === 'demo' && (
                <Button variant="danger" onClick={() => setConfirm(true)}>
                  <RotateCcw /> Reset demo data
                </Button>
              )}
            </div>
            <div className="text-xs text-text-3">
              {data.batches.length} batches · {data.batch_events.length} events · {data.batch_measurements.length} measurements · {data.tastings.length} tastings
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Controlled vocabularies</CardTitle>
          </CardHeader>
          <CardBody className="grid gap-3 pt-3 text-xs">
            <Vocab label="Beverage types" items={BEVERAGE_TYPES} />
            <Vocab label="Stages" items={BATCH_STAGES} />
            <Vocab label="Ingredient categories" items={INGREDIENT_CATEGORIES} />
            <Vocab label="Activity types" items={ACTIVITY_TYPES} />
            <div className="text-text-3">Defined in <code className="font-mono">src/lib/types.ts</code>. Editing dropdown values in-app is a planned follow-up.</div>
          </CardBody>
        </Card>
      </div>

      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Reset demo data?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                await resetDemo()
                setConfirm(false)
              }}
            >
              Reset
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-2">This wipes browser-local data and reloads the three seed batches. Export a JSON backup first if you want to keep anything.</p>
      </Dialog>
    </>
  )
}

function ToleranceInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [text, setText] = React.useState(String(value))
  React.useEffect(() => {
    if (Number(text) !== value) setText(String(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return (
    <Input
      type="number"
      inputMode="decimal"
      step={0.001}
      min={0}
      value={text}
      onChange={(e) => {
        setText(e.target.value)
        const n = Number(e.target.value)
        if (e.target.value !== '' && Number.isFinite(n)) onChange(Math.max(0, n))
      }}
    />
  )
}

function Vocab({ label, items }: { label: string; items: readonly string[] }) {
  return (
    <div>
      <div className="mb-1 font-mono text-[10.5px] uppercase tracking-wider text-text-3">{label}</div>
      <div className="flex flex-wrap gap-1">
        {items.map((i) => (
          <span key={i} className="rounded bg-surface-2 px-1.5 py-0.5 text-text-2">
            {i}
          </span>
        ))}
      </div>
    </div>
  )
}
