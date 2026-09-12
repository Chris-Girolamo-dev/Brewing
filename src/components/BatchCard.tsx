'use client'

import Link from 'next/link'
import { ArrowRight, Droplets, Thermometer } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { StatusPill } from '@/components/ui/Badge'
import { stageTone, type BatchView } from '@/lib/derive'
import { formatGravity, formatTemp, formatVolume } from '@/lib/calc/units'
import { fmtDate } from '@/lib/utils'
import { useStore } from '@/lib/store'
import type { TempUnit } from '@/lib/types'

export function BatchCard({ view }: { view: BatchView }) {
  const { prefs } = useStore()
  const b = view.batch
  return (
    <Link href={`/batches/${b.id}`} className="block">
      <Card className="h-full p-4 transition-colors hover:border-border-2 hover:bg-surface-2/40">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold text-fg">{b.name}</div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-text-3">
              {b.batch_code} · {b.beverage_type}
            </div>
            {view.parent && (
              <div className="mt-0.5 text-[11px] text-text-3">
                ↳ sub-lot of <span className="text-text-2">{view.parent.batch_code}</span>
              </div>
            )}
            {view.isSplitParent && <div className="mt-0.5 text-[11px] text-text-3">{view.children.length} sub-lots</div>}
          </div>
          <StatusPill tone={stageTone(b.stage)}>{b.stage}</StatusPill>
        </div>

        <div className="mt-3 flex items-baseline gap-2 font-mono text-sm tabular-nums">
          <span className="text-text-3">OG</span>
          <span className="text-fg">{formatGravity(view.og)}</span>
          <ArrowRight size={12} className="text-text-3" />
          <span className="text-text-3">SG</span>
          <span className="text-fg">{formatGravity(b.fg ?? view.latestSg?.value)}</span>
          {view.estAbv != null && (
            <span className="ml-auto rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] font-semibold text-accent">
              {view.finalAbv != null ? `${view.finalAbv}% ABV` : `~${view.estAbv}% ABV`}
            </span>
          )}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-[11.5px] text-text-3">
          <div>
            <div className="uppercase tracking-wider">Day</div>
            <div className="font-mono text-sm text-text-2">{view.dayNumber ?? '—'}</div>
          </div>
          <div>
            <div className="uppercase tracking-wider">Volume</div>
            <div className="font-mono text-sm text-text-2">{formatVolume(b.target_volume, b.volume_unit, prefs.unit_system)}</div>
          </div>
          <div>
            <div className="uppercase tracking-wider">Started</div>
            <div className="font-mono text-sm text-text-2">{fmtDate(b.pitch_date ?? b.batch_date, 'MMM d')}</div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3 text-xs">
          <span className="truncate text-text-2">
            {view.nextReminder ? (
              <>
                <span className="text-text-3">Next:</span> {view.nextReminder.title} · {fmtDate(view.nextReminder.due_at, 'MMM d')}
              </>
            ) : (
              <span className="text-text-3">{view.vessel?.name ?? 'No vessel'}</span>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-2 font-mono text-text-3">
            {view.latestTemp && (
              <span className="inline-flex items-center gap-1">
                <Thermometer size={11} />
                {formatTemp(view.latestTemp.value, view.latestTemp.unit as TempUnit, prefs.unit_system)}
              </span>
            )}
            {view.latestPh && (
              <span className="inline-flex items-center gap-1">
                <Droplets size={11} />
                {view.latestPh.value}
              </span>
            )}
          </span>
        </div>
      </Card>
    </Link>
  )
}
