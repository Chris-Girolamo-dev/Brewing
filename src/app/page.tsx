'use client'

import * as React from 'react'
import Link from 'next/link'
import { Activity, Bell, CheckCircle2, ClipboardList, FlaskConical, Plus } from 'lucide-react'
import { useStore } from '@/lib/store'
import { buildBatchView, isActive } from '@/lib/derive'
import { PageHeader, Loading } from '@/components/PageHeader'
import { BatchCard } from '@/components/BatchCard'
import { Card, CardBody, CardHeader, CardTitle, EmptyState, MetricCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusPill } from '@/components/ui/Badge'
import { useShell } from '@/components/AppShell'
import { ReminderDialog } from '@/components/batch/dialogs'
import type { Reminder } from '@/lib/types'
import { fmtDate, fmtRelative } from '@/lib/utils'
import { isPast, isToday } from 'date-fns'

export default function DashboardPage() {
  const { data, prefs, ready, update } = useStore()
  const { openLog } = useShell()
  const [editReminder, setEditReminder] = React.useState<Reminder | null>(null)

  const views = React.useMemo(
    () =>
      data.batches
        .filter(isActive)
        .map((b) => buildBatchView(data, b, prefs))
        .sort((a, b) => (b.lastActivityAt ?? '').localeCompare(a.lastActivityAt ?? '')),
    [data, prefs]
  )

  const reminders = React.useMemo(
    () =>
      data.reminders
        .filter((r) => !r.done)
        .sort((a, b) => a.due_at.localeCompare(b.due_at))
        .slice(0, 8),
    [data.reminders]
  )

  const recent = React.useMemo(
    () => [...data.batch_events].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)).slice(0, 6),
    [data.batch_events]
  )

  const stableCount = views.filter((v) => v.stability.stable && v.batch.fg == null).length
  const conditioning = views.filter((v) => v.batch.stage === 'Bottle Conditioning')
  const aging = views.filter((v) => v.batch.stage === 'Aging' || v.batch.stage === 'Packaged / Aging')
  const dueToday = reminders.filter((r) => isToday(new Date(r.due_at)) || isPast(new Date(r.due_at)))

  if (!ready) return <Loading />

  return (
    <>
      <PageHeader
        eyebrow="Today"
        title="Dashboard"
        subtitle="What needs attention across active fermentations."
        actions={
          <>
            <Button variant="secondary" onClick={() => openLog()}>
              <Activity /> Log activity
            </Button>
            <Link href="/batches/new">
              <Button>
                <Plus /> New batch
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Active fermentations" value={views.length} />
        <MetricCard label="Actions due" value={dueToday.length} trend={dueToday.length ? 'Due today or overdue' : 'Nothing overdue'} trendTone={dueToday.length ? 'warn' : 'ok'} />
        <MetricCard label="Gravity appears stable" value={stableCount} trend={stableCount ? 'Confirm FG on batch page' : undefined} trendTone="ok" />
        <MetricCard label="Conditioning / aging" value={conditioning.length + aging.length} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-fg">Active batches</h2>
            <Link href="/batches" className="text-xs text-text-3 hover:text-fg">
              View all →
            </Link>
          </div>
          {views.length === 0 ? (
            <EmptyState
              title="No active batches"
              hint="Create a batch to start logging gravity, additions, and transfers."
              action={
                <Link href="/batches/new">
                  <Button>
                    <Plus /> New batch
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {views.map((v) => (
                <BatchCard key={v.batch.id} view={v} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell size={14} className="text-accent" /> Upcoming
              </CardTitle>
              <Link href="/calendar" className="text-xs text-text-3 hover:text-fg">
                Calendar →
              </Link>
            </CardHeader>
            <CardBody className="pt-3">
              {reminders.length === 0 ? (
                <div className="text-xs text-text-3">No reminders. Add one from a batch page.</div>
              ) : (
                <ul className="divide-y divide-border">
                  {reminders.map((r) => {
                    const b = data.batches.find((x) => x.id === r.batch_id)
                    const overdue = isPast(new Date(r.due_at)) && !isToday(new Date(r.due_at))
                    return (
                      <li key={r.id} className="flex items-start gap-3 py-2 first:pt-0 last:pb-0">
                        <button
                          onClick={() => update('reminders', r.id, { done: true })}
                          className="mt-0.5 text-text-3 hover:text-ok"
                          aria-label="Mark done"
                        >
                          <CheckCircle2 size={16} />
                        </button>
                        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setEditReminder(r)}>
                          <div className="truncate text-sm text-fg">{r.title}</div>
                          <div className="text-xs text-text-3">
                            {b ? (
                              <Link href={`/batches/${b.id}`} className="hover:text-fg">
                                {b.name}
                              </Link>
                            ) : (
                              'General'
                            )}
                          </div>
                        </div>
                        <button onClick={() => setEditReminder(r)} aria-label="Edit reminder">
                          <StatusPill tone={overdue ? 'crit' : isToday(new Date(r.due_at)) ? 'warn' : 'neutral'}>{fmtDate(r.due_at, 'MMM d')}</StatusPill>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList size={14} className="text-accent" /> Recently updated
              </CardTitle>
            </CardHeader>
            <CardBody className="pt-3">
              {recent.length === 0 ? (
                <div className="text-xs text-text-3">No activity yet.</div>
              ) : (
                <ul className="divide-y divide-border">
                  {recent.map((e) => {
                    const b = data.batches.find((x) => x.id === e.batch_id)
                    return (
                      <li key={e.id} className="py-2 first:pt-0 last:pb-0">
                        <Link href={`/batches/${e.batch_id}`} className="block">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm text-fg">{e.type}</span>
                            <span className="shrink-0 text-[11px] text-text-3">{fmtRelative(e.occurred_at)}</span>
                          </div>
                          <div className="truncate text-xs text-text-3">
                            <FlaskConical size={10} className="mr-1 inline" />
                            {b?.name}
                            {e.title ? ` · ${e.title}` : ''}
                          </div>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
      <ReminderDialog batchId={null} existing={editReminder} open={editReminder !== null} onClose={() => setEditReminder(null)} />
    </>
  )
}
