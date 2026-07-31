-- Introduit la notion d'intervention : un regroupement de plusieurs changements
-- de pièces réalisés au cours d'une même session (issue #20).
-- Le champ « type d'intervention » d'un changement est renommé en « nature du
-- changement » pour lever l'ambiguïté avec cette nouvelle entité.
-- À exécuter dans le SQL Editor Supabase (une seule fois, sur une base déjà
-- initialisée avec schema.sql).

alter type intervention_type rename to nature_changement;
alter table maintenance_events rename column intervention_type to nature_changement;

create table interventions (
  id uuid primary key default gen_random_uuid(),
  bike_id uuid not null references bikes (id) on delete cascade,
  title text not null,
  date date not null,
  note text,
  created_at timestamptz not null default now()
);

create index interventions_bike_id_date_idx on interventions (bike_id, date desc);

alter table interventions enable row level security;

create policy "interventions_select_own" on interventions
  for select using (
    exists (
      select 1 from bikes
      where bikes.id = interventions.bike_id
        and bikes.user_id = auth.uid()
    )
  );
create policy "interventions_insert_own" on interventions
  for insert with check (
    exists (
      select 1 from bikes
      where bikes.id = interventions.bike_id
        and bikes.user_id = auth.uid()
    )
  );
create policy "interventions_update_own" on interventions
  for update using (
    exists (
      select 1 from bikes
      where bikes.id = interventions.bike_id
        and bikes.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from bikes
      where bikes.id = interventions.bike_id
        and bikes.user_id = auth.uid()
    )
  );
create policy "interventions_delete_own" on interventions
  for delete using (
    exists (
      select 1 from bikes
      where bikes.id = interventions.bike_id
        and bikes.user_id = auth.uid()
    )
  );

-- Colonne nullable pour l'instant : les changements déjà enregistrés restent
-- sans intervention jusqu'à la migration de l'historique (bascule vers une
-- intervention « Historique initial »), traitée séparément.
alter table maintenance_events
  add column intervention_id uuid references interventions (id);

create index maintenance_events_intervention_id_idx
  on maintenance_events (intervention_id);
