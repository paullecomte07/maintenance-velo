-- Ajoute le stockage de l'analyse IA du cahier d'intervention sur les vélos existants.
-- À exécuter dans le SQL Editor Supabase (une seule fois, sur une base déjà initialisée avec schema.sql).

alter table bikes
  add column if not exists ai_analysis text,
  add column if not exists ai_analysis_generated_at timestamptz;
