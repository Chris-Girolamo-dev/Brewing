'use client'

import * as React from 'react'
import Link from 'next/link'
import { CheckCircle2, ChevronLeft, ChevronRight, Plus, RotateCcw } from 'lucide-react'
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek } from 'date-fns'
import { useStore } from '@/lib/store'
import { PageHeader, Loading } from '@/components/PageHeader'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ReminderDialog } from '@/components/batch/dialogs'
import { cn, fmtDate } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'

export default function CalendarPage() {
  const { data, ready, update, remove } = useStore()
  const [month, setMonth] = React.useState(startOfMonth(new Date()))
  const [add, setAdd] = React.useState(false)
  const [showDone, setShowDone] = React.useState(false)
  if (!ready) return <Loading />

  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) })
  const reminders = data.reminders.filter((r) => showDone || !r.done)
  const eventsOn = (d: Date) => data.batch_events.filter((e) => isSameDay(new Date(e.occurred_at), d))
  const remindersOn = (d: Date) => reminders.filter((r) => isSameDay(new Date(r.due_at), d))
  const upcoming = [...data.reminders].filter((r) => !r.done).sort((a, b) => a.due_at.localeCompare(b.due_at))

  return (
    <>
      <PageHeader
        eyebrow="Calendar"
        title={format(month, 'MMMM yyyy')}
        subtitle="Milestones, logged activity, and reminders."
        actions={
          <>
            <Button variant="outline" size="icon" onClick={() => setMonth((m) => addMonths(m, -1))} aria-label="Previous month">
              <ChevronLeft />
            </Button>
            <Button variant="outline" onClick={() => setMonth(startOfMonth(new Date()))}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Next month">
              <ChevronRight />
            </Button>
            <Button onClick={() => setAdd(true)}>
              <Plus /> Reminder
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <div className="grid grid-cols-7 border-b border-border bg-surface-2 font-mono text-[10px] uppercase tracking-wider text-text-3">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="px-2 py-1.5 text-center">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const evs = eventsOn(d)
              const rems = remindersOn(d)
              return (
                <div key={d.toISOString()} className={cn('min-h-[72px] border-b border-r border-border p-1.5 sm:min-h-[96px]', !isSameMonth(d, month) && 'opacity-40')}>
                  <div className={cn('mb-1 inline-flex size-5 items-center justify-center rounded-full font-mono text-[11px]', isToday(d) ? 'bg-accent text-[#0a0c11]' : 'text-text-3')}>{format(d, 'd')}</div>
                  <div className="space-y-0.5">
                    {rems.slice(0, 2).map((r) => {
                      const b = data.batches.find((x) => x.id === r.batch_id)
                      return (
                        <Link key={r.id} href={b ? `/batches/${b.id}` : '#'} className={cn('block truncate rounded px-1 text-[10.5px]', r.done ? 'bg-surface-2 text-text-3 line-through' : 'bg-accent-soft text-accent')} title={`${r.title}${b ? ` · ${b.name}` : ''}`}>
                          {r.title}
                        </Link>
                      )
                    })}
                    {evs.slice(0, 2).map((e) => {
                      const b = data.batches.find((x) => x.id === e.batch_id)
                      return (
                        <Link key={e.id} href={`/batches/${e.batch_id}`} className="block truncate rounded bg-surface-2 px-1 text-[10.5px] text-text-2" title={`${e.type} · ${b?.name}`}>
                          {e.type}
                        </Link>
                      )
                    })}
                    {evs.length + rems.length > 4 && <div className="px-1 text-[10px] text-text-3">+{evs.length + rems.length - 4}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming reminders</CardTitle>
            <button className="text-xs text-text-3 hover:text-fg" onClick={() => setShowDone((s) => !s)}>
              {showDone ? 'Hide done' : 'Show done'}
            </button>
          </CardHeader>
          <CardBody className="pt-3">
            {upcoming.length === 0 ? (
              <div className="text-xs text-text-3">Nothing scheduled.</div>
            ) : (
              <ul className="divide-y divide-border">
                {(showDone ? [...data.reminders].sort((a, b) => a.due_at.localeCompare(b.due_at)) : upcoming).map((r) => {
                  const b = data.batches.find((x) => x.id === r.batch_id)
                  const overdue = !r.done && new Date(r.due_at) < new Date() && !isToday(new Date(r.due_at))
                  return (
                    <li key={r.id} className="flex items-start gap-3 py-2 first:pt-0 last:pb-0">
                      <button className={cn('mt-0.5', r.done ? 'text-ok' : 'text-text-3 hover:text-ok')} onClick={() => update('reminders', r.id, { done: !r.done })} aria-label="Toggle done">
                        {r.done ? <RotateCcw size={15} /> : <CheckCircle2 size={16} />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className={cn('text-sm', r.done ? 'text-text-3 line-through' : 'text-fg')}>{r.title}</div>
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
                      <Badge tone={overdue ? 'crit' : isToday(new Date(r.due_at)) ? 'warn' : 'neutral'}>{fmtDate(r.due_at, 'MMM d')}</Badge>
                      <button className="text-text-3 hover:text-crit" onClick={() => remove('reminders', r.id)} aria-label="Delete">
                        ×
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <ReminderDialog batchId={null} open={add} onClose={() => setAdd(false)} />
    </>
  )
}
