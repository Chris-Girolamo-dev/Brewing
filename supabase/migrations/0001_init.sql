-- Fermentation Batch Manager — initial schema.
-- Run in the Supabase SQL editor (or `supabase db push`). No auth in v1: tables are
-- readable/writable by the anon role via permissive RLS policies. Adding auth later
-- means adding a nullable user_id column + tightening these policies; no rebuild.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- vessels
create table if not exists vessels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text,
  capacity numeric,
  capacity_unit text not null default 'gal',
  material text,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- recipes
create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version integer not null default 1,
  beverage_type text not null,
  style text,
  target_volume numeric,
  volume_unit text not null default 'gal',
  goal text,
  ingredients jsonb not null default '[]'::jsonb,
  yeasts jsonb not null default '[]'::jsonb,
  notes text,
  source_batch_id uuid,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- batches
create table if not exists batches (
  id uuid primary key default gen_random_uuid(),
  batch_code text not null unique,
  name text not null,
  beverage_type text not null,
  style text,
  recipe_id uuid references recipes(id) on delete set null,
  batch_date date not null default current_date,
  pitch_date timestamptz,
  target_volume numeric,
  volume_unit text not null default 'gal',
  goal text,
  stage text not null default 'Planning',
  og numeric(6,4),
  fg numeric(6,4),
  fg_confirmed_at timestamptz,
  fermentation_complete_at timestamptz,
  current_vessel_id uuid references vessels(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists batches_stage_idx on batches(stage);
create index if not exists batches_type_idx on batches(beverage_type);

-- ---------------------------------------------------------------- ingredients
create table if not exists batch_ingredients (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches(id) on delete cascade,
  category text not null,
  name text not null,
  amount numeric,
  unit text,
  brand text,
  variety text,
  lot text,
  addition_stage text,
  added_at timestamptz,
  removed_at timestamptz,
  oak_toast text,
  oak_form text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists batch_ingredients_batch_idx on batch_ingredients(batch_id);
create index if not exists batch_ingredients_name_idx on batch_ingredients(lower(name));

-- ---------------------------------------------------------------- yeasts
create table if not exists yeasts (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches(id) on delete cascade,
  manufacturer text,
  strain text not null,
  amount numeric,
  unit text,
  pitched_at timestamptz,
  rehydrated boolean not null default false,
  rehydration_temp numeric,
  rehydration_temp_unit text,
  rehydration_minutes integer,
  rehydration_medium text,
  lot text,
  expiration date,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists yeasts_batch_idx on yeasts(batch_id);

-- ---------------------------------------------------------------- events (authoritative timeline)
create table if not exists batch_events (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  type text not null,
  stage text,
  vessel_id uuid references vessels(id) on delete set null,
  title text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists batch_events_batch_time_idx on batch_events(batch_id, occurred_at desc);

-- ---------------------------------------------------------------- measurements
create table if not exists batch_measurements (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches(id) on delete cascade,
  event_id uuid references batch_events(id) on delete set null,
  measured_at timestamptz not null default now(),
  type text not null check (type in ('sg','brix','ph','temp','volume')),
  value numeric not null,
  unit text not null,
  stage text,
  vessel_id uuid references vessels(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists batch_measurements_batch_time_idx on batch_measurements(batch_id, measured_at);

-- ---------------------------------------------------------------- transfers
create table if not exists batch_transfers (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches(id) on delete cascade,
  event_id uuid references batch_events(id) on delete set null,
  transferred_at timestamptz not null default now(),
  from_vessel_id uuid references vessels(id) on delete set null,
  to_vessel_id uuid references vessels(id) on delete set null,
  volume_before numeric,
  volume_after numeric,
  volume_unit text not null default 'oz',
  method text,
  reason text,
  headspace text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists batch_transfers_batch_idx on batch_transfers(batch_id);

-- ---------------------------------------------------------------- nutrient plan
create table if not exists nutrient_additions (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches(id) on delete cascade,
  nutrient text not null,
  addition_number integer not null default 1,
  planned_at timestamptz,
  planned_point text,
  planned_amount numeric,
  actual_at timestamptz,
  actual_amount numeric,
  unit text not null default 'g',
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists nutrient_additions_batch_idx on nutrient_additions(batch_id);

-- ---------------------------------------------------------------- stabilization
create table if not exists stabilizations (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches(id) on delete cascade,
  event_id uuid references batch_events(id) on delete set null,
  stabilized_at timestamptz not null default now(),
  sg numeric(6,4),
  kmeta_amount numeric,
  kmeta_unit text,
  sorbate_amount numeric,
  sorbate_unit text,
  volume numeric,
  volume_unit text not null default 'gal',
  method text,
  waiting_days integer,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- backsweetening
create table if not exists backsweetening_events (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches(id) on delete cascade,
  event_id uuid references batch_events(id) on delete set null,
  sweetened_at timestamptz not null default now(),
  pre_sg numeric(6,4),
  sweetener text not null,
  amount numeric,
  unit text,
  volume numeric,
  volume_unit text not null default 'gal',
  post_sg numeric(6,4),
  taste_result text,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- packaging
create table if not exists package_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  package_type text not null,
  container_size numeric,
  size_unit text not null default 'oz',
  closure text,
  created_at timestamptz not null default now()
);

create table if not exists packaging_events (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches(id) on delete cascade,
  event_id uuid references batch_events(id) on delete set null,
  packaged_at timestamptz not null default now(),
  pre_sg numeric(6,4),
  packaged_volume numeric,
  volume_unit text not null default 'oz',
  package_type text not null,
  container_size numeric,
  size_unit text not null default 'oz',
  quantity integer,
  closure text,
  priming_sugar_type text,
  priming_sugar_grams numeric,
  target_co2 numeric,
  conditioning_temp numeric,
  temp_unit text not null default 'F',
  conditioning_start timestamptz,
  expected_ready_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists packaging_events_batch_idx on packaging_events(batch_id);

-- ---------------------------------------------------------------- tastings
create table if not exists tastings (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches(id) on delete cascade,
  tasted_at timestamptz not null default now(),
  serving_temp numeric,
  temp_unit text not null default 'F',
  appearance text,
  clarity smallint check (clarity between 1 and 5),
  aroma text,
  sweetness smallint check (sweetness between 1 and 5),
  acidity smallint check (acidity between 1 and 5),
  tannin smallint check (tannin between 1 and 5),
  body smallint check (body between 1 and 5),
  carbonation smallint check (carbonation between 1 and 5),
  alcohol_heat smallint check (alcohol_heat between 1 and 5),
  fruit_character smallint check (fruit_character between 1 and 5),
  off_flavors text,
  overall_notes text,
  rating numeric(3,1) check (rating between 1 and 10),
  would_make_again boolean,
  next_batch_changes text,
  created_at timestamptz not null default now()
);
create index if not exists tastings_batch_idx on tastings(batch_id);

-- ---------------------------------------------------------------- reminders
create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references batches(id) on delete cascade,
  title text not null,
  due_at timestamptz not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists reminders_due_idx on reminders(done, due_at);

-- ---------------------------------------------------------------- updated_at trigger
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
drop trigger if exists batches_updated_at on batches;
create trigger batches_updated_at before update on batches
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------- RLS (open in v1; single user, no auth)
do $$
declare t text;
begin
  foreach t in array array[
    'vessels','recipes','batches','batch_ingredients','yeasts','batch_events','batch_measurements',
    'batch_transfers','nutrient_additions','stabilizations','backsweetening_events','package_profiles',
    'packaging_events','tastings','reminders'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_anon_all', t);
    execute format('create policy %I on %I for all to anon, authenticated using (true) with check (true)', t || '_anon_all', t);
  end loop;
end $$;
