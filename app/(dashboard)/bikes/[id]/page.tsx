import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteBike } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteBikeButton } from "@/components/delete-bike-button";
import { MaintenanceAnalysis } from "@/components/maintenance-analysis";
import {
  InterventionsList,
  type InterventionStats,
} from "@/components/interventions-list";
import { QuickAddEvent } from "@/components/quick-add-event";
import { createClient } from "@/lib/supabase/server";
import { BIKE_CATEGORIES } from "@/lib/reference-data";
import {
  interventionStatus,
  type Bike,
  type Intervention,
  type MaintenanceEvent,
} from "@/lib/types";

function formatDate(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR");
}

function formatPrice(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export default async function BikePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: bike } = await supabase
    .from("bikes")
    .select("*")
    .eq("id", params.id)
    .single<Bike>();

  if (!bike) notFound();

  const { data: events } = await supabase
    .from("maintenance_events")
    .select("*")
    .eq("bike_id", bike.id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<MaintenanceEvent[]>();

  const { data: interventions } = await supabase
    .from("interventions")
    .select("*")
    .eq("bike_id", bike.id)
    .returns<Intervention[]>();

  const allEvents = events ?? [];
  const allInterventions = interventions ?? [];

  // Coût, nombre de pièces et plage de dates réelle, par intervention.
  const stats: InterventionStats = {};
  const ranges: Record<string, { first: string | null; last: string | null }> =
    {};
  for (const event of allEvents) {
    const key = event.intervention_id;
    if (!key) continue;
    const stat = (stats[key] ??= { count: 0, totalCost: 0 });
    stat.count += 1;
    stat.totalCost += event.cost ?? 0;
    const range = (ranges[key] ??= { first: null, last: null });
    if (!range.first || event.date < range.first) range.first = event.date;
    if (!range.last || event.date > range.last) range.last = event.date;
  }

  const enCours = allInterventions.filter(
    (i) => interventionStatus(i) === "en_cours"
  );
  const aVenir = allInterventions
    .filter((i) => interventionStatus(i) === "a_venir")
    .sort((a, b) =>
      (a.date_prevue ?? "9999-99-99").localeCompare(b.date_prevue ?? "9999-99-99")
    );
  const terminees = allInterventions
    .filter((i) => interventionStatus(i) === "terminee")
    .sort((a, b) => (b.closed_at ?? "").localeCompare(a.closed_at ?? ""));

  const openIntervention = enCours[0] ?? null;
  const deleteAction = deleteBike.bind(null, bike.id);

  const identity: [string, React.ReactNode][] = [
    ["Marque", bike.brand ?? "—"],
    ["Modèle", bike.model ?? "—"],
    ["Date d'achat", formatDate(bike.purchase_date)],
    ["Prix d'achat", formatPrice(bike.purchase_price)],
    ["Kilométrage", bike.mileage_km !== null ? `${bike.mileage_km} km` : "—"],
    ["Dépréciation annuelle", `${bike.depreciation_rate} %`],
    [
      "Fiche technique",
      bike.spec_sheet_url ? (
        <a
          key="spec"
          href={bike.spec_sheet_url}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-4"
        >
          Ouvrir le lien
        </a>
      ) : (
        "—"
      ),
    ],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{bike.name}</h1>
          <Badge variant="secondary">{BIKE_CATEGORIES[bike.category]}</Badge>
        </div>
        <div className="flex gap-2">
          <QuickAddEvent
            bikeId={bike.id}
            interventions={allInterventions}
            openIntervention={openIntervention}
            lastMileageKm={bike.mileage_km}
          />
          <Button variant="outline" size="sm" asChild>
            <Link href={`/bikes/${bike.id}/edit`}>Modifier</Link>
          </Button>
          <DeleteBikeButton bikeName={bike.name} onDelete={deleteAction} />
        </div>
      </div>

      <InterventionsList
        bikeId={bike.id}
        enCours={enCours}
        aVenir={aVenir}
        terminees={terminees}
        stats={stats}
        ranges={ranges}
      />

      {/* Repliée par défaut : la fiche vélo sert d'abord à voir où en sont les
          chantiers, pas à relire les caractéristiques de la machine. */}
      <Card>
        <CardContent className="p-0">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 text-lg font-semibold">
              Fiche d&apos;identité
              <span className="text-sm font-normal text-muted-foreground group-open:hidden">
                Afficher
              </span>
              <span className="hidden text-sm font-normal text-muted-foreground group-open:inline">
                Masquer
              </span>
            </summary>
            <div className="px-6 pb-6">
              <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {identity.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex justify-between gap-4 text-sm"
                  >
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="text-right font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </details>
        </CardContent>
      </Card>

      <MaintenanceAnalysis
        bikeId={bike.id}
        hasEvents={allEvents.length > 0}
        initialAnalysis={bike.ai_analysis}
        initialGeneratedAt={bike.ai_analysis_generated_at}
      />
    </div>
  );
}
