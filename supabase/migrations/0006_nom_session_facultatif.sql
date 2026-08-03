-- Le nom d'une session d'atelier devient facultatif (issue #47).
--
-- Au test utilisateur du 3 août 2026, l'utilisateur a nommé sa session
-- « Changer ma chaîne », puis y a saisi l'action « Réparation · Chaîne · HS » :
-- la même phrase aux deux étages. Le champ obligatoire, page blanche et premier
-- de l'écran, est précisément ce qui poussait à y recopier l'action à venir.
--
-- Le nom reste saisissable et modifiable à tout moment ; il n'est plus exigé.
-- Une session sans nom se lit par sa cause et sa date — « Prévention · 3 août ».
--
-- Ceci revient sur une décision de l'issue #23 (« le titre est saisi par
-- l'utilisateur à l'ouverture, jamais généré automatiquement »). L'argument
-- tenait — « Session du 15 mars » est illisible six mois plus tard — mais rien
-- n'est généré ici : le nom est simplement absent, et l'affichage retombe sur
-- deux informations qui, elles, disent quelque chose.
--
-- RELÂCHANTE, comme 0005 sur `cause_type` : elle retire une contrainte, elle
-- n'en pose aucune. L'ancien code, qui envoie toujours un titre, continue de
-- fonctionner sur ce schéma pendant la fenêtre entre l'application manuelle de
-- la migration et le déploiement.
--
-- À exécuter dans le SQL Editor Supabase (après 0005). Rejouable sans dégât.

-- `null` plutôt que la chaîne vide : c'est déjà ce que fait `cause` pour
-- l'historique importé, et une chaîne vide se faufilerait dans les affichages
-- sans que rien ne la distingue d'un nom légitime.
alter table interventions
  alter column title drop not null;
