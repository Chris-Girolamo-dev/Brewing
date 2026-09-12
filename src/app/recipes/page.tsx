'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpen, Trash2 } from 'lucide-react'
import { useStore } from '@/lib/store'
import { PageHeader, Loading } from '@/components/PageHeader'
import { Card, CardBody, CardHeader, CardTitle, EmptyState } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatAmount, formatVolume } from '@/lib/calc/units'
import { fmtDate } from '@/lib/utils'

export default function RecipesPage() {
  const { data, prefs, ready, remove } = useStore()
  if (!ready) return <Loading />

  const recipes = [...data.recipes].sort((a, b) => a.name.localeCompare(b.name) || b.version - a.version)

  return (
    <>
      <PageHeader eyebrow="Recipes" title="Recipe templates" subtitle="Saved from batches. Start a new batch from any version." />
      {recipes.length === 0 ? (
        <EmptyState
          title="No recipes yet"
          hint="Open a batch and choose “Save as recipe” from the ··· menu. Ingredient quantities and yeast become defaults for the next batch."
          action={
            <Link href="/batches">
              <Button variant="secondary">
                <BookOpen /> Go to batches
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {recipes.map((r) => {
            const src = data.batches.find((b) => b.id === r.source_batch_id)
            const uses = data.batches.filter((b) => b.recipe_id === r.id).length
            return (
              <Card key={r.id}>
                <CardHeader>
                  <div>
                    <CardTitle>
                      {r.name} <span className="font-mono text-xs text-text-3">v{r.version}</span>
                    </CardTitle>
                    <div className="text-xs text-text-3">
                      {r.beverage_type}
                      {r.style ? ` · ${r.style}` : ''} · {formatVolume(r.target_volume, r.volume_unit, prefs.unit_system)}
                    </div>
                  </div>
                  <button className="text-text-3 hover:text-crit" onClick={() => remove('recipes', r.id)} aria-label="Delete recipe">
                    <Trash2 size={14} />
                  </button>
                </CardHeader>
                <CardBody className="pt-3">
                  <ul className="space-y-1 text-sm">
                    {r.ingredients.slice(0, 6).map((i, idx) => (
                      <li key={idx} className="flex justify-between gap-3">
                        <span className="truncate text-text-2">{i.name}</span>
                        <span className="shrink-0 font-mono text-xs text-text-3">{formatAmount(i.amount, i.unit)}</span>
                      </li>
                    ))}
                    {r.ingredients.length > 6 && <li className="text-xs text-text-3">+{r.ingredients.length - 6} more</li>}
                  </ul>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {r.yeasts.map((y, idx) => (
                      <Badge key={idx} tone="accent">
                        {y.manufacturer} {y.strain}
                      </Badge>
                    ))}
                    {r.goal && <Badge>{r.goal}</Badge>}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-text-3">
                    <span>
                      {src ? (
                        <>
                          From{' '}
                          <Link href={`/batches/${src.id}`} className="hover:text-fg">
                            {src.batch_code}
                          </Link>
                        </>
                      ) : (
                        fmtDate(r.created_at)
                      )}
                      {uses > 0 && ` · used ${uses}×`}
                    </span>
                    <Link href={`/batches/new?recipe=${r.id}`}>
                      <Button size="sm">
                        New batch <ArrowRight />
                      </Button>
                    </Link>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
