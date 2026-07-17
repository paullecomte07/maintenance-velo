-- Schéma de la base maintenance-velo.
-- À exécuter dans le SQL Editor du dashboard Supabase (une seule fois).

-- Enums (listes fixes, tirées du référentiel du cahier d'intervention)
create type bike_category as enum ('route', 'vtt', 'electrique', 'urbain');

create type bike_system as enum (
  'cadre',
  'direction',
  'transmission',
  'roue_avant',
  'roue_arriere',
  'freinage_avant',
  'freinage_arriere',
  'assise',
  'equipement'
);

create type intervention_type as enum (
  'inspection',
  'entretien',
  'reparation',
  'remise_a_neuf'
);

create type cause_type as enum (
  'usure_prematuree',
  'usure_normale',
  'accident'
);

-- Vélos (fiche d'identité)
create table bikes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  brand text,
  model text,
  category bike_category not null default 'vtt',
  purchase_date date,
  purchase_price numeric(10, 2) not null check (purchase_price >= 0),
  mileage_km integer check (mileage_km >= 0),
  spec_sheet_url text,
  depreciation_rate numeric(5, 2) not null default 15 check (depreciation_rate between 0 and 100),
  photo_url text,
  ai_analysis text,
  ai_analysis_generated_at timestamptz,
  created_at timestamptz not null default now()
);

-- Cahier d'intervention (une ligne = une intervention)
create table maintenance_events (
  id uuid primary key default gen_random_uuid(),
  bike_id uuid not null references bikes (id) on delete cascade,
  date date not null,
  title text not null,
  system bike_system not null,
  intervention_type intervention_type not null,
  cause_type cause_type not null,
  cost numeric(10, 2) check (cost >= 0),
  created_at timestamptz not null default now()
);

create index maintenance_events_bike_id_date_idx
  on maintenance_events (bike_id, date desc);

-- Row Level Security : chaque utilisateur ne voit que ses propres données
alter table bikes enable row level security;
alter table maintenance_events enable row level security;

create policy "bikes_select_own" on bikes
  for select using (auth.uid() = user_id);
create policy "bikes_insert_own" on bikes
  for insert with check (auth.uid() = user_id);
create policy "bikes_update_own" on bikes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "bikes_delete_own" on bikes
  for delete using (auth.uid() = user_id);

create policy "events_select_own" on maintenance_events
  for select using (
    exists (
      select 1 from bikes
      where bikes.id = maintenance_events.bike_id
        and bikes.user_id = auth.uid()
    )
  );
create policy "events_insert_own" on maintenance_events
  for insert with check (
    exists (
      select 1 from bikes
      where bikes.id = maintenance_events.bike_id
        and bikes.user_id = auth.uid()
    )
  );
create policy "events_update_own" on maintenance_events
  for update using (
    exists (
      select 1 from bikes
      where bikes.id = maintenance_events.bike_id
        and bikes.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from bikes
      where bikes.id = maintenance_events.bike_id
        and bikes.user_id = auth.uid()
    )
  );
create policy "events_delete_own" on maintenance_events
  for delete using (
    exists (
      select 1 from bikes
      where bikes.id = maintenance_events.bike_id
        and bikes.user_id = auth.uid()
    )
  );
