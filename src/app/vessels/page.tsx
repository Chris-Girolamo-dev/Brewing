'use client'

import * as React from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { useStore } from '@/lib/store'
import { PageHeader, Loading } from '@/components/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusPill } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import { Field, Input, Select, UnitInput } from '@/components/ui/Input'
import { VOLUME_UNITS, type Vessel, type VolumeUnit } from '@/lib/types'
import { formatVolume } from '@/lib/calc/units'
import { num, str } from '@/lib/utils'
import { isActive } from '@/lib/derive'

export default function VesselsPage() {
  const { data, prefs, ready, insert, update, remove } = useStore()
  const [edit, setEdit] = React.useState<Vessel | null | 'new'>(null)
  if (!ready) return <Loading />

  const vessels = [...data.vessels].sort((a, b) => (b.capacity ?? 0) - (a.capacity ?? 0) || a.name.localeCompare(b.name))

  return (
    <>
      <PageHeader
        eyebrow="Vessels"
        title="Equipment"
        subtitle="Vessel types you own. Several batches can sit in the same type; pick it when racking or splitting."
        actions={
          <Button onClick={() => setEdit('new')}>
            <Plus /> Vessel
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {vessels.map((v) => {
          const inType = data.batches.filter((b) => b.current_vessel_id === v.id && isActive(b))
          return (
            <Card key={v.id} className="cursor-pointer p-4 hover:border-border-2" onClick={() => setEdit(v)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-fg">{v.name}</div>
                  <div className="text-xs text-text-3">
                    {[v.type, v.material].filter(Boolean).join(' · ')} · {formatVolume(v.capacity, v.capacity_unit, prefs.unit_system)}
                  </div>
                </div>
                <StatusPill tone={inType.length ? 'accent' : 'neutral'}>{inType.length ? `${inType.length} batch${inType.length > 1 ? 'es' : ''}` : 'Empty'}</StatusPill>
              </div>
              {inType.length > 0 && (
                <ul className="mt-3 space-y-0.5">
                  {inType.map((batch) => (
                    <li key={batch.id}>
                      <Link href={`/batches/${batch.id}`} className="block text-xs text-text-2 hover:text-fg" onClick={(e) => e.stopPropagation()}>
                        {batch.name} · {batch.stage}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {v.notes && <p className="mt-2 text-xs text-text-3">{v.notes}</p>}
            </Card>
          )
        })}
      </div>
      <VesselDialog
        vessel={edit === 'new' ? null : edit}
        open={edit !== null}
        onClose={() => setEdit(null)}
        onSave={async (row) => {
          if (edit && edit !== 'new') await update('vessels', edit.id, row)
          else await insert('vessels', row)
        }}
        onDelete={edit && edit !== 'new' ? () => remove('vessels', edit.id) : undefined}
      />
    </>
  )
}

function VesselDialog({
  vessel,
  open,
  onClose,
  onSave,
  onDelete,
}: {
  vessel: Vessel | null
  open: boolean
  onClose: () => void
  onSave: (v: Omit<Vessel, 'id' | 'created_at'>) => Promise<void>
  onDelete?: () => Promise<void>
}) {
  const [name, setName] = React.useState('')
  const [type, setType] = React.useState('Carboy')
  const [cap, setCap] = React.useState('')
  const [unit, setUnit] = React.useState<VolumeUnit>('gal')
  const [material, setMaterial] = React.useState('Glass')
  const [notes, setNotes] = React.useState('')
  React.useEffect(() => {
    if (!open) return
    setName(vessel?.name ?? '')
    setType(vessel?.type ?? 'Carboy')
    setCap(vessel?.capacity?.toString() ?? '')
    setUnit(vessel?.capacity_unit ?? 'gal')
    setMaterial(vessel?.material ?? 'Glass')
    setNotes(vessel?.notes ?? '')
  }, [open, vessel])
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={vessel ? 'Edit vessel' : 'New vessel'}
      footer={
        <>
          {onDelete && (
            <Button variant="danger" className="mr-auto" onClick={() => onDelete().then(onClose)}>
              Delete
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim()}
            onClick={async () => {
              await onSave({ name: name.trim(), type: str(type), capacity: num(cap), capacity_unit: unit, material: str(material), notes: str(notes) })
              onClose()
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <Field label="Name">
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="1-Gallon Glass Jar" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {['Jar', 'Carboy', 'Bucket', 'Demijohn', 'Conical', 'Keg', 'Barrel', 'Other'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Capacity">
            <UnitInput value={cap} onChange={setCap} unit={unit} units={VOLUME_UNITS} onUnitChange={(u) => setUnit(u as VolumeUnit)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Material">
            <Select value={material} onChange={(e) => setMaterial(e.target.value)}>
              {['Glass', 'HDPE', 'PET', 'Stainless', 'Oak', 'Other'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Notes">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
      </div>
    </Dialog>
  )
}
