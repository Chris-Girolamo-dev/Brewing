'use client'

import * as React from 'react'
import { Check, Plus, Trash2 } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Table, TD, TH, TR } from '@/components/ui/Table'
import { Input } from '@/components/ui/Input'
import { useStore } from '@/lib/store'
import type { BatchView } from '@/lib/derive'
import { fmtDate, num } from '@/lib/utils'
import { addHours } from 'date-fns'
import { StatusPill } from '@/components/ui/Badge'

/** Staggered nutrient schedule (SNA). Planned rows become actual with one tap. */
export function NutrientPlan({ view }: { view: BatchView }) {
  const { insert, update, remove, logEvent } = useStore()
  const [nutrient, setNutrient] = React.useState('Fermaid-O')
  const [amount, setAmount] = React.useState('')
  const [point, setPoint] = React.useState('')

  const start = view.batch.pitch_date ?? `${view.batch.batch_date}T12:00:00.000Z`

  async function addRow() {
    const n = view.nutrients.length + 1
    const hours = point.match(/^(\d+)\s*h/i) ? Number(point.match(/^(\d+)\s*h/i)![1]) : point.toLowerCase() === 'pitch' ? 0 : null
    await insert('nutrient_additions', {
      batch_id: view.batch.id,
      nutrient: nutrient.trim() || 'Nutrient',
      addition_number: n,
      planned_at: hours != null ? addHours(new Date(start), hours).toISOString() : null,
      planned_point: point.trim() || null,
      planned_amount: num(amount),
      actual_at: null,
      actual_amount: null,
      unit: 'g',
      notes: null,
    })
    setAmount('')
    setPoint('')
  }

  async function quickPlan() {
    const plan: [string, number, number][] = [
      ['Pitch', 0, 1.5],
      ['24 hr', 24, 2.0],
      ['48 hr', 48, 1.5],
    ]
    let n = view.nutrients.length
    for (const [label, h, g] of plan) {
      n += 1
      await insert('nutrient_additions', {
        batch_id: view.batch.id,
        nutrient: 'Fermaid-O',
        addition_number: n,
        planned_at: addHours(new Date(start), h).toISOString(),
        planned_point: label,
        planned_amount: g,
        actual_at: null,
        actual_amount: null,
        unit: 'g',
        notes: null,
      })
    }
  }

  async function markDone(id: string) {
    const row = view.nutrients.find((x) => x.id === id)
    if (!row) return
    const at = new Date().toISOString()
    await update('nutrient_additions', id, { actual_at: at, actual_amount: row.planned_amount })
    await logEvent({
      batch_id: view.batch.id,
      occurred_at: at,
      type: 'Nutrient Addition',
      stage: view.batch.stage,
      vessel_id: view.batch.current_vessel_id,
      title: `${row.nutrient} ${row.planned_amount ?? ''} ${row.unit} (#${row.addition_number}${row.planned_point ? ` · ${row.planned_point}` : ''})`.trim(),
      notes: null,
    })
  }

  const total = view.nutrients.reduce((a, n) => a + (n.actual_amount ?? n.planned_amount ?? 0), 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nutrient schedule</CardTitle>
        <div className="flex gap-2">
          {view.nutrients.length === 0 && (
            <Button size="sm" variant="secondary" onClick={quickPlan}>
              Quick SNA plan
            </Button>
          )}
        </div>
      </CardHeader>
      <CardBody className="pt-3">
        {view.nutrients.length > 0 && (
          <Table>
            <thead>
              <tr>
                <TH>#</TH>
                <TH>Nutrient</TH>
                <TH>Point</TH>
                <TH>Planned</TH>
                <TH className="text-right">Amount</TH>
                <TH>Actual</TH>
                <TH />
              </tr>
            </thead>
            <tbody>
              {view.nutrients.map((n) => (
                <TR key={n.id}>
                  <TD className="font-mono">{n.addition_number}</TD>
                  <TD className="text-fg">{n.nutrient}</TD>
                  <TD>{n.planned_point ?? '—'}</TD>
                  <TD>{fmtDate(n.planned_at, 'MMM d, h:mm a')}</TD>
                  <TD className="text-right font-mono tabular">
                    {n.actual_amount ?? n.planned_amount ?? '—'} {n.unit}
                  </TD>
                  <TD>
                    {n.actual_at ? (
                      <StatusPill tone="ok">{fmtDate(n.actual_at, 'MMM d, h:mm a')}</StatusPill>
                    ) : (
                      <Button size="xs" variant="secondary" onClick={() => markDone(n.id)}>
                        <Check /> Done now
                      </Button>
                    )}
                  </TD>
                  <TD className="text-right">
                    <button className="text-text-3 hover:text-crit" onClick={() => remove('nutrient_additions', n.id)} aria-label="Remove">
                      <Trash2 size={14} />
                    </button>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="w-32">
            <Input value={nutrient} onChange={(e) => setNutrient(e.target.value)} placeholder="Fermaid-O" />
          </div>
          <div className="w-24">
            <Input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="g" />
          </div>
          <div className="w-24">
            <Input value={point} onChange={(e) => setPoint(e.target.value)} placeholder="24 hr" />
          </div>
          <Button size="md" variant="secondary" onClick={addRow}>
            <Plus /> Add
          </Button>
          {view.nutrients.length > 0 && <div className="ml-auto font-mono text-xs text-text-3">Total {Math.round(total * 10) / 10} g</div>}
        </div>
      </CardBody>
    </Card>
  )
}
