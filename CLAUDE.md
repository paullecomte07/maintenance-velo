# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Code guidelines

Behavioral guidelines to reduce common LLM coding mistakes.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Project status

This repository is currently **empty** — no code has been scaffolded yet. This file records the project's purpose and the technical decisions already agreed with the user, so that setup and implementation stay consistent across sessions. Update this file as soon as the project is scaffolded (add real build/lint/test commands, refine architecture notes based on what's actually built).

- GitHub repo: https://github.com/paullecomte07/maintenance-velo (public)
- GitHub Project board (10 build-order issues): https://github.com/users/paullecomte07/projects/1
- Vercel account: created, linked via GitHub OAuth.
- Supabase account + project: created (project name `maintenance-velo`). DB password stored locally in `.env.local` (gitignored) — not yet retrieved into a full `.env.local` with API URL/anon key, that happens when the code is scaffolded (issue #1/#2).

## Project purpose

A responsive web app for personal bike fleet maintenance tracking, with a data-analysis angle: for each bike, compare **cumulative maintenance cost** against an **estimated residual market value** (via a depreciation formula), to see whether a bike is costing more than it's worth.

- Single user (personal use), 1–3 mountain bikes (VTT) initially, but the data model should tolerate other bike categories later without migration pain.
- Must be accessible online, from multiple devices, behind a simple login (email + password).
- Hosting must use free tiers only.
- Market value: computed automatically via a depreciation formula (no manual override in v1). Purchase price is entered manually per bike (not derivable from the user's existing tracking file).
- Bike identity also tracks total mileage (km, manual entry, bike-level only — not per event) and an optional link to the manufacturer's spec sheet.
- Maintenance detail tracked per event: date, free-text title, system affected (fixed reference list, see data model), intervention type (fixed reference: Inspection/Entretien/Réparation/Remise à neuf), cause type (fixed reference: Usure prématurée/Usure normale/Accident), and a single cost for the whole event. No per-part cost breakdown, no labor cost, no photos in v1. This mirrors the user's existing tracking spreadsheet exactly, with cost added as a new field (not present historically — linking to invoices may come later, out of scope for v1).
- User has existing maintenance history in an Excel file (`Suivi des travaux de maintenance d'un vélo.xlsx`, 5 sheets: fiche d'identité, référentiel des organes, cahier d'intervention, référentiel intervention, référentiel cause) that needs to be imported.
- UI should be sober/functional, with automatic light/dark theme, mobile-first.

## Planned stack

- **Next.js 14 (App Router) + TypeScript** — single repo for front-end + API routes.
- **Tailwind CSS + shadcn/ui** — sober UI, accessible components, native light/dark theme.
- **Supabase** (Postgres + Auth + Storage) — hosted DB, email/password auth, row-level security to isolate the user's data. Free tier.
- **Recharts** — charts for cumulative maintenance cost vs. residual value over time, and KPIs.
- **Deployment**: Vercel (free tier) for the app, Supabase (free tier) for the database.

## Planned data model (Supabase Postgres)

- `bikes`: `id`, `user_id` (FK auth.users, RLS-scoped), `name`, `brand`, `model`, `category` (enum: `route`/`vtt`/`electrique`/`urbain`, default `vtt`), `purchase_date`, `purchase_price` (manual entry, required for depreciation), `mileage_km` (manual entry), `spec_sheet_url` (nullable), `depreciation_rate` (annual %, defaulted by category, editable), `photo_url` (nullable), `created_at`.
- `maintenance_events`: `id`, `bike_id` (FK bikes), `date`, `title` (free text, e.g. "Cassette Shimano"), `system` (enum, fixed reference list — see below), `intervention_type` (enum: `inspection`/`entretien`/`reparation`/`remise_a_neuf`), `cause_type` (enum: `usure_prematuree`/`usure_normale`/`accident`), `cost` (numeric, single amount for the whole event), `created_at`.
- RLS enabled on both tables — a user only sees their own bikes and related maintenance events.

### Fixed reference lists (from the user's existing tracking spreadsheet)

- `system` ("Nature"): Cadre, Direction, Transmission, Roue avant, Roue arrière, Système de freinage avant, Système de freinage arrière, Assise, Équipement. Each system has a documented list of specific parts ("organes"), used as a naming reference/autocomplete helper for the event's free-text `title` — not a separate DB column in v1.
- `intervention_type`: Inspection (vérification de l'état des pièces d'usure), Entretien (changement de petites pièces d'usure, petits bricolages), Réparation (changement d'une pièce, < 50% de la valeur du module), Remise à neuf (changement de tout le module / restauration totale).
- `cause_type`: Usure prématurée (usure anormale), Usure normale (durée de vie respectée), Accident (casse due à un accident d'utilisation).

These are implemented as Postgres enums (fixed, code-level extendable) rather than editable DB tables — single-user app, low churn expected.

## Depreciation formula (v1)

Exponential decay based on age: `estimated_value = purchase_price * (1 - depreciation_rate)^age_in_years`, floored at ~10% of purchase price. Default rate proposed for VTT: 15%/year (editable per bike). Computed in a dedicated utility module (`lib/depreciation.ts`), recalculated on render — no cron job needed.

## Planned project structure

```
app/
  (auth)/login/page.tsx, signup/page.tsx
  (dashboard)/bikes/page.tsx              # bike list
  (dashboard)/bikes/[id]/page.tsx         # bike detail + maintenance history
  (dashboard)/bikes/[id]/import/page.tsx  # CSV import for this bike
  (dashboard)/analytics/page.tsx          # cost vs. value dashboard
  layout.tsx, middleware.ts               # route protection
components/                               # UI (cards, forms, charts)
lib/
  supabase/client.ts, server.ts
  depreciation.ts                         # depreciation formula
  csv-import.ts                           # CSV parsing + column mapping
  reference-data.ts                       # fixed lists: system/organes, intervention_type, cause_type
supabase/
  schema.sql                              # tables + RLS policies
.env.local.example
```

The full implementation plan (build order, verification steps) lives at `C:\Users\PaulLECOMTE\.claude\plans\effervescent-gliding-leaf.md`.
