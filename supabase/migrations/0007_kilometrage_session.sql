-- Le kilométrage remonte de l'action à la session d'atelier (issue #44).
--
-- Le champ vivait sur `maintenance_events`, entre le coût et la date, juste
-- après « Sur quelle pièce ? » et « Dans quel état tu l'as trouvée ? ». Tout le
-- formulaire parlant de la pièce, on ne savait plus si on relevait le compteur
-- du vélo ou le kilométrage de la pièce. Les deux lectures étaient défendables.
--
-- La réponse attendue est le compteur du vélo, et il vaut pour toutes les
-- actions d'une même session — 1 à 4 pièces, 2 en moyenne, faites d'affilée.
-- On le relève donc une seule fois, sur la session.
--
-- Ce que ça ne coûte pas : la durée de vie d'une pièce (issue #24) reste
-- calculable, entre le relevé de la session qui l'a changée et celui de la
-- précédente. Une session étalée sur plusieurs jours (issue #23) peut voir le
-- compteur bouger de quelques dizaines de kilomètres entre sa première et sa
-- dernière action — négligeable devant les milliers qu'on mesure, et le
-- pré-remplissage écrasait déjà cette nuance.
--
-- ADDITIVE. `maintenance_events.mileage_km` n'est pas supprimée : les
-- migrations s'appliquant à la main *avant* le merge, l'ancien code tourne
-- encore un moment sur ce schéma et continue de l'écrire. Sa suppression fera
-- l'objet d'un passage de ménage, comme `cause_type` en #31.
--
-- À exécuter dans le SQL Editor Supabase (après 0005). Rejouable sans dégât.

-- ---------------------------------------------------------------------------
-- 1. Le relevé, au niveau de la session
-- ---------------------------------------------------------------------------
-- Nullable, et pas seulement pour l'historique : le relevé est facultatif à la
-- saisie. Quelqu'un qui démarre une session sans son compteur sous les yeux ne
-- doit pas être bloqué, quitte à compléter plus tard.

alter table interventions
  add column if not exists mileage_km integer;

-- ---------------------------------------------------------------------------
-- 2. Reprise de l'existant
-- ---------------------------------------------------------------------------
-- Le relevé de la session est le plus haut de ses actions. Le maximum plutôt
-- que le minimum ou la moyenne : sur une session étalée, c'est le relevé le
-- plus récent, donc le plus proche de l'état du vélo à la clôture. Les sessions
-- dont aucune action ne portait de kilométrage restent à null — aucune valeur
-- n'est inventée.

update interventions i
set mileage_km = sub.km
from (
  select intervention_id, max(mileage_km) as km
  from maintenance_events
  where mileage_km is not null
  group by intervention_id
) sub
where sub.intervention_id = i.id
  and i.mileage_km is null;

-- ---------------------------------------------------------------------------
-- 3. Le dernier relevé connu du vélo
-- ---------------------------------------------------------------------------
-- `bikes.mileage_km` change de sens : il n'est plus une saisie de la fiche
-- d'identité (issue #45 l'y retire) mais le dernier relevé connu, entretenu par
-- les sessions. On le remonte au plus haut relevé constaté, sans jamais
-- l'abaisser — un compteur changé ou remis à zéro ne doit pas effacer
-- l'historique parcouru.

update bikes b
set mileage_km = sub.km
from (
  select bike_id, max(mileage_km) as km
  from interventions
  where mileage_km is not null
  group by bike_id
) sub
where sub.bike_id = b.id
  and (b.mileage_km is null or b.mileage_km < sub.km);
