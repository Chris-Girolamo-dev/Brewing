'use client'

import * as React from 'react'
import Link from 'next/link'
import { Plus, Trash2 } from 'lucide-react'
import { useStore } from '@/lib/store'
import { PageHeader, Loading } from '@/components/PageHeader'
import { Card, CardBody, CardHeader, CardTitle, EmptyState } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Table, TD, TH, TR } from '@/components/ui/Table'
import { Field, Input, Select, UnitInput } from '@/components/ui/Input'
import { Dialog } from '@/components/ui/Dialog'
import { PACKAGE_TYPES, SUGAR_TYPES, VOLUME_UNITS, type PackageProfile, type SugarType, type VolumeUnit } from '@/lib/types'
import { formatGravity, formatVolume, preferredTempUnit, preferredVolumeUnit, convertTemp } from '@/lib/calc/units'
import { bottleBreakdown, gramsToOunces, primingSugarGrams, residualCo2 } from '@/lib/calc/packaging'
import { fmtDate, num, str } from '@/lib/utils'

export default function PackagingPage() {
  const { data, prefs, ready, insert, remove } = useStore()
  const [add, setAdd] = React.useState(false)
  if (!ready) return <Loading />

  const events = [...data.packaging_events].sort((a, b) => b.packaged_at.localeCompare(a.packaged_at))

  return (
    <>
      <PageHeader eyebrow="Packaging" title="Bottles & kegs" subtitle="Package records across batches, reusable package profiles, and a standalone priming calculator." />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Packaging events</CardTitle>
            </CardHeader>
            <CardBody className="pt-3">
              {events.length === 0 ? (
                <EmptyState title="Nothing packaged yet" hint="Use the Package quick action on a batch page." />
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <TH>Date</TH>
                      <TH>Batch</TH>
                      <TH>Package</TH>
                      <TH className="text-right">Qty</TH>
                      <TH className="text-right">Volume</TH>
                      <TH className="text-right">SG</TH>
                      <TH>Priming</TH>
                      <TH>Ready</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((p) => {
                      const b = data.batches.find((x) => x.id === p.batch_id)
                      return (
                        <TR key={p.id}>
                          <TD>{fmtDate(p.packaged_at)}</TD>
                          <TD>
                            <Link href={`/batches/${p.batch_id}`} className="text-fg hover:underline">
                              {b?.name}
                            </Link>
                          </TD>
                          <TD>
                            {p.container_size} {p.size_unit} {p.package_type}
                            <div className="text-xs text-text-3">{p.closure}</div>
                          </TD>
                          <TD className="text-right font-mono">{p.quantity ?? '—'}</TD>
                          <TD className="text-right font-mono">{p.packaged_volume != null ? formatVolume(p.packaged_volume, p.volume_unit, prefs.unit_system) : '—'}</TD>
                          <TD className="text-right font-mono">{formatGravity(p.pre_sg)}</TD>
                          <TD>{p.priming_sugar_grams != null ? `${p.priming_sugar_grams} g ${p.priming_sugar_type} → ${p.target_co2} vol` : 'Still'}</TD>
                          <TD>{fmtDate(p.expected_ready_at)}</TD>
                        </TR>
                      )
                    })}
                  </tbody>
                </Table>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Package profiles</CardTitle>
              <Button size="sm" variant="secondary" onClick={() => setAdd(true)}>
                <Plus /> Profile
              </Button>
            </CardHeader>
            <CardBody className="pt-3">
              <Table>
                <thead>
                  <tr>
                    <TH>Name</TH>
                    <TH>Type</TH>
                    <TH>Size</TH>
                    <TH>Closure</TH>
                    <TH />
                  </tr>
                </thead>
                <tbody>
                  {data.package_profiles.map((p) => (
                    <TR key={p.id}>
                      <TD className="text-fg">{p.name}</TD>
                      <TD>{p.package_type}</TD>
                      <TD className="font-mono">
                        {p.container_size} {p.size_unit}
                      </TD>
                      <TD>{p.closure ?? '—'}</TD>
                      <TD className="text-right">
                        <button className="text-text-3 hover:text-crit" onClick={() => remove('package_profiles', p.id)} aria-label="Delete">
                          <Trash2 size={14} />
                        </button>
                      </TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            </CardBody>
          </Card>
        </div>

        <PrimingCalculator />
      </div>

      <ProfileDialog open={add} onClose={() => setAdd(false)} onSave={(p) => insert('package_profiles', p)} />
    </>
  )
}

function PrimingCalculator() {
  const { prefs } = useStore()
  const tempUnit = preferredTempUnit(prefs.unit_system)
  const [vol, setVol] = React.useState('5')
  const [unit, setUnit] = React.useState<VolumeUnit>(preferredVolumeUnit(prefs.unit_system))
  const [temp, setTemp] = React.useState(tempUnit === 'F' ? '68' : '20')
  const [co2, setCo2] = React.useState('2.5')
  const [sugar, setSugar] = React.useState<SugarType>('sucrose')
  const v = num(vol)
  const t = num(temp)
  const c = num(co2)
  const grams = v != null && t != null && c != null ? primingSugarGrams(v, unit, convertTemp(t, tempUnit, 'F'), c, sugar) : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Priming calculator</CardTitle>
      </CardHeader>
      <CardBody className="grid grid-cols-1 gap-3 pt-3">
        <Field label="Packaged volume">
          <UnitInput value={vol} onChange={setVol} unit={unit} units={VOLUME_UNITS} onUnitChange={(u) => setUnit(u as VolumeUnit)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Temperature">
            <UnitInput value={temp} onChange={setTemp} unit={`°${tempUnit}`} />
          </Field>
          <Field label="Target CO₂">
            <UnitInput value={co2} onChange={setCo2} unit="vol" step={0.1} />
          </Field>
        </div>
        <Field label="Sugar">
          <Select value={sugar} onChange={(e) => setSugar(e.target.value as SugarType)}>
            {SUGAR_TYPES.map((s) => (
              <option key={s} value={s}>
                {s === 'sucrose' ? 'Table sugar (sucrose)' : 'Corn sugar (dextrose)'}
              </option>
            ))}
          </Select>
        </Field>
        <div className="rounded-xl border border-border bg-canvas p-4 text-center">
          <div className="font-mono text-3xl font-semibold text-accent">{grams != null ? `${grams} g` : '—'}</div>
          <div className="mt-1 text-xs text-text-3">
            {grams != null && `${gramsToOunces(grams)} oz · `}
            {t != null && `residual ${residualCo2(convertTemp(t, tempUnit, 'F')).toFixed(2)} vol`}
          </div>
        </div>
        {v != null && (
          <div>
            <div className="mb-1 font-mono text-[10.5px] uppercase tracking-wider text-text-3">Bottles from this volume</div>
            <div className="grid grid-cols-5 gap-1 text-center">
              {bottleBreakdown(v, unit).map((b) => (
                <div key={b.label} className="rounded-lg bg-surface-2 py-1.5">
                  <div className="font-mono text-sm text-fg">{b.count}</div>
                  <div className="text-[10px] text-text-3">{b.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="text-[11px] text-text-3">Guide: still 0–1.0 · petillant 1.5–2.0 · sparkling cider 2.5–3.0 vol.</div>
      </CardBody>
    </Card>
  )
}

function ProfileDialog({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (p: Omit<PackageProfile, 'id' | 'created_at'>) => Promise<unknown> }) {
  const [name, setName] = React.useState('')
  const [type, setType] = React.useState<PackageProfile['package_type']>('Crown-cap beer bottle')
  const [size, setSize] = React.useState('22')
  const [unit, setUnit] = React.useState<VolumeUnit>('oz')
  const [closure, setClosure] = React.useState('26 mm crown cap')
  React.useEffect(() => {
    if (open) {
      setName('')
    }
  }, [open])
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New package profile"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim()}
            onClick={async () => {
              await onSave({ name: name.trim(), package_type: type, container_size: num(size), size_unit: unit, closure: str(closure) })
              onClose()
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3">
        <Field label="Name">
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="22 oz amber bomber" />
        </Field>
        <Field label="Package type">
          <Select value={type} onChange={(e) => setType(e.target.value as PackageProfile['package_type'])}>
            {PACKAGE_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Container size">
            <UnitInput value={size} onChange={setSize} unit={unit} units={['oz', 'mL', 'L', 'gal']} onUnitChange={(u) => setUnit(u as VolumeUnit)} />
          </Field>
          <Field label="Closure">
            <Input value={closure} onChange={(e) => setClosure(e.target.value)} />
          </Field>
        </div>
      </div>
    </Dialog>
  )
}
