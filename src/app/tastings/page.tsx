'use client'

import * as React from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import { PageHeader, Loading } from '@/components/PageHeader'
import { Card, CardBody, EmptyState } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Input'
import { daysBetween } from '@/lib/calc/fermentation'
import { fmtDate } from '@/lib/utils'

export default function TastingsPage() {
  const { data, ready } = useStore()
  const [batchId, setBatchId] = React.useState('')
  if (!ready) return <Loading />

  const tastings = [...data.tastings].filter((t) => !batchId || t.batch_id === batchId).sort((a, b) => b.tasted_at.localeCompare(a.tasted_at))

  return (
    <>
      <PageHeader
        eyebrow="Tastings"
        title="Sensory log"
        subtitle="Every tasting is timestamped and kept, so you can watch a batch evolve through aging."
        actions={
          <div className="w-56">
            <Select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
              <option value="">All batches</option>
              {data.batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </div>
        }
      />
      {tastings.length === 0 ? (
        <EmptyState title="No tastings yet" hint="Use the Taste quick action on a batch page." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {tastings.map((t) => {
            const b = data.batches.find((x) => x.id === t.batch_id)
            const pkg = data.packaging_events.filter((p) => p.batch_id === t.batch_id).sort((a, c) => a.packaged_at.localeCompare(c.packaged_at))[0]
            return (
              <Card key={t.id}>
                <CardBody className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/batches/${t.batch_id}`} className="text-sm font-semibold text-fg hover:underline">
                        {b?.name ?? 'Unknown batch'}
                      </Link>
                      <div className="text-xs text-text-3">
                        {fmtDate(t.tasted_at)} · batch day {b ? daysBetween(b.pitch_date ?? b.batch_date, t.tasted_at) : '—'}
                        {pkg && ` · package day ${daysBetween(pkg.packaged_at, t.tasted_at)}`}
                      </div>
                    </div>
                    {t.rating != null && <Badge tone="accent">{t.rating}/10</Badge>}
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
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
                    ).map(([k, v]) => (
                      <div key={k} className="rounded-lg bg-surface-2 py-1.5">
                        <div className="font-mono text-sm text-fg">{v ?? '—'}</div>
                        <div className="text-[10px] uppercase tracking-wider text-text-3">{k}</div>
                      </div>
                    ))}
                  </div>
                  {(t.aroma || t.appearance) && <p className="mt-3 text-xs text-text-2">{[t.appearance, t.aroma].filter(Boolean).join(' · ')}</p>}
                  {t.overall_notes && <p className="mt-1.5 text-sm text-text-2">{t.overall_notes}</p>}
                  {t.off_flavors && <p className="mt-1 text-xs text-warn">Off-flavors: {t.off_flavors}</p>}
                  {t.next_batch_changes && <p className="mt-1.5 text-xs text-text-3">Next time: {t.next_batch_changes}</p>}
                  {t.would_make_again != null && <div className="mt-2 text-[11px] text-text-3">{t.would_make_again ? 'Would make again' : 'Would not make again'}</div>}
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
