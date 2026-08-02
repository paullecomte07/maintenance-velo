-- L'état constaté descend au niveau de la pièce (issue #30).
--
-- Second volet de la refonte ouverte par 0004. La moitié « motif » de
-- `cause_type` est déjà remontée sur `interventions.cause` ; sa moitié
-- « observation » descend ici en `etat_constate`.
--
-- C'est cette colonne qui rend le kilométrage exploitable : « chaîne changée à
-- 4 800 km » n'est pas un signal, « chaîne en usure prématurée à 4 800 km » en
-- est un. Et elle rend l'inspection enfin enregistrable — jusqu'ici il fallait
-- inventer une cause à une pièce qu'on n'avait pas changée.
--
-- ADDITIVE ET RELÂCHANTE, jamais destructive. `cause_type` perd seulement son
-- NOT NULL : les migrations étant appliquées à la main *avant* le merge,
-- l'ancien code tourne encore un moment sur ce schéma et continue de l'écrire.
-- Sa suppression fait l'objet de l'issue #31, dans son propre passage.
--
-- À exécuter dans le SQL Editor Supabase (après 0004). Rejouable sans dégât.

-- ---------------------------------------------------------------------------
-- 1. Le référentiel des états
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'etat_constate') then
    create type etat_constate as enum (
      'neuf',              -- pièce en parfait état, souvent après un changement récent
      'usure_normale',     -- durée de vie respectée
      'usure_prematuree',  -- usure anormale au regard du kilométrage
      'hs'                 -- hors service : la pièce ne remplit plus son rôle
    );
  end if;
end $$;

-- Nullable pour DEUX raisons distinctes, à ne pas confondre :
--   - une action *prévue* n'a pas encore d'état, on ne sait pas d'avance ce
--     qu'on va trouver (issue #26) — celle-là se remplira ;
--   - une ancienne ligne `cause_type = 'accident'` n'en a jamais eu — celle-là
--     ne se remplira jamais.
alter table maintenance_events
  add column if not exists etat_constate etat_constate;

-- ---------------------------------------------------------------------------
-- 2. Bascule de l'existant
-- ---------------------------------------------------------------------------
-- Les deux valeurs d'usure décrivent bien l'état d'une pièce : elles
-- descendent telles quelles.

update maintenance_events
set etat_constate = 'usure_normale'
where etat_constate is null
  and cause_type = 'usure_normale';

update maintenance_events
set etat_constate = 'usure_prematuree'
where etat_constate is null
  and cause_type = 'usure_prematuree';

-- `accident` ne devient PAS `hs`. « Accident » dit pourquoi on est à l'atelier,
-- pas dans quel état était la pièce — la supposer hors service serait inventer
-- une donnée. Cette valeur a été remontée sur l'intervention par 0004 ; ici
-- elle laisse l'état vide, et il le restera.

-- ---------------------------------------------------------------------------
-- 3. Relâcher l'ancienne colonne
-- ---------------------------------------------------------------------------
-- Le nouveau formulaire ne la renseigne plus. Sans ce drop, ses insertions
-- échoueraient dès le déploiement.

alter table maintenance_events
  alter column cause_type drop not null;
