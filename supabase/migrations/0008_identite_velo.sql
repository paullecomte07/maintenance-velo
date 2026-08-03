-- Numéro de série et marquage d'identification (issue #45).
--
-- Les deux seules données d'identité d'un vélo qui ne se retrouvent nulle part
-- si on ne les note pas : une marque et un modèle se relisent sur le cadre, un
-- numéro de série gravé sous le boîtier de pédalier devient inaccessible dès
-- que le vélo a disparu. C'est pourtant ce qu'on demande en cas de vol, de
-- garantie ou de revente.
--
--   - `serial_number`         : gravé par le constructeur sur le cadre.
--   - `identification_number` : marquage Bicycode / APIC, obligatoire à la
--                               vente en France depuis 2021.
--
-- Nullables et destinées à le rester : un vélo d'occasion peut n'avoir ni l'un
-- ni l'autre, et un vélo d'avant 2021 n'a pas de marquage. Les exiger
-- reviendrait à faire inventer une valeur — le défaut que la révision cause /
-- action / état a précisément corrigé.
--
-- Aucune contrainte d'unicité : deux vélos peuvent légitimement porter un
-- numéro vide, et rien ne garantit qu'une saisie manuelle soit exacte.
--
-- ADDITIVE. À exécuter dans le SQL Editor Supabase (après 0006). Rejouable.

alter table bikes
  add column if not exists serial_number text;

alter table bikes
  add column if not exists identification_number text;
