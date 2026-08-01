-- Cycle de vie des interventions (issue #23), et rattachement obligatoire des
-- changements de pièces (reliquat de l'issue #20).
--
-- Une intervention n'est plus une date isolée mais un chantier qui traverse
-- trois états :
--   à venir   : started_at is null
--   en cours  : started_at is not null and closed_at is null
--   terminée  : closed_at is not null
--
-- Ajoute aussi le kilométrage relevé au moment de chaque changement de pièce
-- (issue #24) : sans lui, l'historique ne pourra jamais dire combien de
-- kilomètres une pièce a tenu, et cette donnée ne se rattrape pas après coup.
--
-- À exécuter dans le SQL Editor Supabase (après 0002). Le script est écrit
-- pour être rejouable sans dégât : chaque étape vérifie son propre état avant
-- d'agir, et le backfill ne crée pas de doublon s'il a déjà tourné.

-- ---------------------------------------------------------------------------
-- 1. Rattacher l'historique orphelin
-- ---------------------------------------------------------------------------
-- Les changements enregistrés avant la mise en place des interventions n'en ont
-- aucune. Ils basculent dans une unique intervention « Historique initial » par
-- vélo, datée du plus ancien d'entre eux. Aucun regroupement automatique n'est
-- tenté : c'est à l'utilisateur de les répartir ensuite.

insert into interventions (bike_id, title, date, note)
select
  e.bike_id,
  'Historique initial',
  min(e.date),
  'Changements enregistrés avant la mise en place des interventions. À répartir dans de vraies interventions.'
from maintenance_events e
where e.intervention_id is null
  and not exists (
    select 1 from interventions i
    where i.bike_id = e.bike_id
      and i.title = 'Historique initial'
  )
group by e.bike_id;

update maintenance_events e
set intervention_id = i.id
from interventions i
where e.intervention_id is null
  and i.bike_id = e.bike_id
  and i.title = 'Historique initial';

alter table maintenance_events
  alter column intervention_id set not null;

-- ---------------------------------------------------------------------------
-- 2. Cycle de vie des interventions
-- ---------------------------------------------------------------------------
-- `date` devient `started_at` : la date à laquelle le chantier a réellement
-- été ouvert, distincte de la date à laquelle il est prévu.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'interventions' and column_name = 'date'
  ) then
    alter table interventions rename column date to started_at;
  end if;
end $$;

alter table interventions
  alter column started_at drop not null;

alter table interventions
  add column if not exists date_prevue date,
  add column if not exists closed_at timestamptz;

-- Tout ce qui existait avant cette migration est du passé : ces interventions
-- sont terminées. Sans cette étape, l'index unique ci-dessous échouerait dès
-- qu'un vélo porte plus d'une intervention.
update interventions
set closed_at = coalesce(started_at::timestamptz, created_at)
where closed_at is null
  and started_at is not null;

-- Une intervention terminée a forcément été démarrée.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'interventions_etat_coherent'
  ) then
    alter table interventions
      add constraint interventions_etat_coherent
      check (closed_at is null or started_at is not null);
  end if;
end $$;

-- Un seul chantier ouvert par vélo à la fois : c'est cette contrainte qui rend
-- possible le rattachement automatique d'une pièce sans jamais poser de
-- question à la saisie.
create unique index if not exists interventions_un_chantier_ouvert_par_velo
  on interventions (bike_id)
  where started_at is not null and closed_at is null;

-- L'index de tri portait sur l'ancien nom de colonne ; il suit le renommage,
-- mais on ajoute celui dont la liste « à venir » a besoin.
create index if not exists interventions_bike_id_date_prevue_idx
  on interventions (bike_id, date_prevue);

-- ---------------------------------------------------------------------------
-- 3. Kilométrage relevé au moment du changement
-- ---------------------------------------------------------------------------
-- Au niveau de la pièce, et non du vélo : c'est ce qui permettra de dire
-- « cette chaîne a tenu 5 400 km ».

alter table maintenance_events
  add column if not exists mileage_km integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'maintenance_events_mileage_km_positif'
  ) then
    alter table maintenance_events
      add constraint maintenance_events_mileage_km_positif
      check (mileage_km is null or mileage_km >= 0);
  end if;
end $$;
