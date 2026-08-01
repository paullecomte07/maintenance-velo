-- La cause remonte au niveau de l'intervention (issue #29).
--
-- Issue des tests utilisateur du 1er août 2026 : `maintenance_events.cause_type`
-- répondait à deux questions à la fois — *pourquoi je suis à l'atelier*
-- (accident) et *dans quel état j'ai trouvé la pièce* (usure). Cette migration
-- remonte la moitié « motif » sur l'intervention. L'autre moitié descendra sur
-- la pièce en `etat_constate` dans la migration suivante (issue #30).
--
-- Le référentiel s'élargit au passage : « Casse d'usure » et « Dysfonctionnement »
-- n'étaient pas exprimables jusqu'ici.
--
-- STRICTEMENT ADDITIVE. `cause_type` n'est ni supprimée ni contrainte : les
-- migrations étant appliquées à la main *avant* le merge, l'ancien code tourne
-- un moment sur le nouveau schéma et continue de l'écrire. Sa suppression fait
-- l'objet de l'issue #31, dans son propre passage.
--
-- À exécuter dans le SQL Editor Supabase (après 0003). Rejouable sans dégât.

-- ---------------------------------------------------------------------------
-- 1. Le référentiel des causes
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'intervention_cause') then
    create type intervention_cause as enum (
      'accident',           -- casse due à un accident d'utilisation
      'casse_usure',        -- une pièce a lâché en usage normal
      'dysfonctionnement',  -- ça saute, ça grince, ça frotte : rien de cassé
      'prevention'          -- entretien planifié, avant que ça pose problème
    );
  end if;
end $$;

-- Nullable, et ce n'est pas un oubli. La rendre NOT NULL obligerait cette
-- migration à inventer une cause sur tout l'historique importé du fichier
-- Excel — exactement le défaut qu'on corrige. La contrainte vit dans le
-- formulaire, pas dans le schéma : l'interface affiche « Cause non renseignée »
-- plutôt que de mentir.
alter table interventions
  add column if not exists cause intervention_cause;

-- ---------------------------------------------------------------------------
-- 2. Bascule de l'existant
-- ---------------------------------------------------------------------------
-- Seul `accident` remonte. `usure_normale` et `usure_prematuree` décrivent
-- l'état d'une pièce, pas le motif d'un chantier : elles descendront en
-- `etat_constate` (issue #30) et laissent ici la cause vide.
--
-- HYPOTHÈSE ASSUMÉE : une intervention mélangeant plusieurs sortes de
-- `cause_type` reçoit `accident` dès qu'une seule de ses pièces l'était — on ne
-- va pas à l'atelier pour de l'usure quand on vient de casser quelque chose.
-- C'est une reconstitution, pas une donnée. Compter avant d'exécuter :
--
--   select count(*) from (
--     select intervention_id from maintenance_events
--     group by intervention_id having count(distinct cause_type) > 1) t;
--
-- Si ce compte vaut 0, la bascule est sans perte et l'hypothèse ne s'applique
-- à personne.

update interventions i
set cause = 'accident'
where i.cause is null
  and exists (
    select 1
    from maintenance_events e
    where e.intervention_id = i.id
      and e.cause_type = 'accident'
  );
