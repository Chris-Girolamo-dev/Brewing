# Ferment — Fermentation Batch Manager

Batch-centric tracking for cider, mead, wine, beer, and kombucha. Every batch has one master
record; every reading, addition, transfer, tasting, and packaging event is a timestamped event
attached to it. Key metrics (estimated and final ABV, attenuation, batch age, transfer loss,
bottle counts, priming sugar) are calculated automatically.

UI components, tokens, and layout are ported from the OPFOR design system with an amber accent.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v4 · Recharts · framer-motion ·
Supabase Postgres (via `@supabase/supabase-js`) · PWA manifest · Vitest.

## Run locally

```bash
npm install
npm run dev
```

Without Supabase environment variables the app runs in **demo mode**: data is stored in the
browser (localStorage) and seeded with the three reference batches (MEAD-2026-001,
CIDER-2026-001, CIDER-2026-002). Seed values marked PLACEHOLDER should be replaced with the
paper notes; everything is editable in-app.

## Connect Supabase

1. Create a Supabase project.
2. In the SQL editor, run `supabase/migrations/0001_init.sql`, then optionally `supabase/seed.sql`.
3. Copy `.env.example` to `.env.local` and fill in:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

4. Restart `npm run dev`. The sidebar badge switches from “Demo · local” to “Supabase”.

### Recipe import from a photo (optional)

Recipes → “Import from photo” sends a photo or PDF of a recipe/SOP page to Claude and returns an
editable recipe template. It needs a server-side `ANTHROPIC_API_KEY` (not `NEXT_PUBLIC_`). On
Vercel add it under Project → Settings → Environment Variables and redeploy. Without it the button
still shows but reports that import is not configured.

v1 has no authentication: RLS is enabled with permissive policies for the anon role. Adding
auth later means a nullable `user_id` column per table and tightening those policies; no
schema rebuild.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest — calculation library |
| `npm run seed:sql` | Regenerate `supabase/seed.sql` from `src/lib/data/seed.ts` |

## Layout

```
src/app/                 routes: / (dashboard), /batches, /batches/new, /batches/[id],
                         /recipes, /calendar, /tastings, /packaging, /vessels, /analytics, /settings
src/components/ui/       ported OPFOR primitives (Card, Button, Tabs, Table, Input, Badge, Switch, Dialog, Toast)
src/components/          AppShell (sidebar / mobile header / bottom nav), LogActivityDialog, charts, batch dialogs
src/lib/types.ts         domain types + controlled vocabularies (snake_case = Postgres columns)
src/lib/calc/            ABV, attenuation, gravity stability, units, priming sugar, bottle counts (+ tests)
src/lib/data/            Repository interface, Supabase adapter, browser-local demo adapter, seed
src/lib/store.tsx        React context: loads the snapshot once, optimistic row-level writes
supabase/migrations/     schema
supabase/seed.sql        generated seed
```

## Logging in 5–15 seconds

Open app → batch → **Log gravity** → `1.014` → Save. The app fills in timestamp, stage,
vessel, previous SG, and estimated ABV, and redraws the fermentation curve. On phones the
same flow is behind the floating **Log** button in the bottom nav.

Final gravity is never declared automatically. When two SG readings at least N days apart
(Settings → Final gravity detection) agree within tolerance, the batch shows “Gravity appears
stable” with a **Mark fermentation complete** action that stores FG, confirmation date, and
final ABV.
