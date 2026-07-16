# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repository is currently **empty** — no code has been scaffolded yet. This file records the project's purpose and the technical decisions already agreed with the user, so that setup and implementation stay consistent across sessions. Update this file as soon as the project is scaffolded (add real build/lint/test commands, refine architecture notes based on what's actually built).

- GitHub repo: https://github.com/paullecomte07/maintenance-velo (public)
- GitHub Project board (10 build-order issues): https://github.com/users/paullecomte07/projects/1
- Vercel and Supabase accounts: not yet created (next setup step).

## Project purpose

A responsive web app for personal bike fleet maintenance tracking, with a data-analysis angle: for each bike, compare **cumulative maintenance cost** against an **estimated residual market value** (via a depreciation formula), to see whether a bike is costing more than it's worth.

- Single user (personal use), 1–3 mountain bikes (VTT) initially, but the data model should tolerate other bike categories later without migration pain.
- Must be accessible online, from multiple devices, behind a simple login (email + password).
- Hosting must use free tiers only.
- Market value: computed automatically via a depreciation formula (no manual override in v1).
- Maintenance detail tracked per event: intervention type + list of parts changed, each with its own cost. No labor cost, no odometer/km, no photos in v1 — but the schema (JSON for parts) should stay easy to extend later.
- User has existing maintenance history in an Excel/CSV file that needs to be imported.
- UI should be sober/functional, with automatic light/dark theme, mobile-first.

## Planned stack

- **Next.js 14 (App Router) + TypeScript** — single repo for front-end + API routes.
- **Tailwind CSS + shadcn/ui** — sober UI, accessible components, native light/dark theme.
- **Supabase** (Postgres + Auth + Storage) — hosted DB, email/password auth, row-level security to isolate the user's data. Free tier.
- **Recharts** — charts for cumulative maintenance cost vs. residual value over time, and KPIs.
- **Deployment**: Vercel (free tier) for the app, Supabase (free tier) for the database.

## Planned data model (Supabase Postgres)

- `bikes`: `id`, `user_id` (FK auth.users, RLS-scoped), `name`, `brand`, `model`, `category` (enum: `route`/`vtt`/`electrique`/`urbain`, default `vtt`), `purchase_date`, `purchase_price`, `depreciation_rate` (annual %, defaulted by category, editable), `photo_url` (nullable), `created_at`.
- `maintenance_events`: `id`, `bike_id` (FK bikes), `date`, `intervention_type`, `parts` (jsonb array of `{name, cost}`), `total_cost` (generated = sum of part costs), `created_at`.
- RLS enabled on both tables — a user only sees their own bikes and related maintenance events.

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
supabase/
  schema.sql                              # tables + RLS policies
.env.local.example
```

The full implementation plan (build order, verification steps) lives at `C:\Users\PaulLECOMTE\.claude\plans\effervescent-gliding-leaf.md`.
