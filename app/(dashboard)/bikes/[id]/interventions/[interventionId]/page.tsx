import Link from "next/link";
import { notFound } from "next/navigation";

import { closeIntervention, startIntervention } from "../actions";
import { CauseBadge } from "@/components/cause-badge";
import { InterventionHeaderActions } from "@/components/intervention-header-actions";
import { MaintenanceSection } from "@/components/maintenance-section";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import {
  INTERVENTION_STATUS_LABELS,
  interventionStatus,
  isEnRetard,
  type Bike,
  type Intervention,
  type MaintenanceEvent,
} from "@/lib/types";

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("fr-FR");
}

function formatCost(cost: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cost);
}

export default async function InterventionPage({
  params,
}: {
  params: { id: string; interventionId: string };
}) {
  const supabase = createClient();

  const { data: bike } = await supabase
    .from("bikes")
    .select("*")
    .eq("id", params.id)
    .single<Bike>();

  if (!bike) notFound();

  const { data: intervention } = await supabase
    .from("interventions")
    .select("*")
    .eq("id", params.interventionId)
    .eq("bike_id", bike.id)
    .single<Intervention>();

  if (!intervention) notFound();

  const { data: events } = await supabase
    .from("maintenance_events")
    .select("*")
    .eq("intervention_id", intervention.id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<MaintenanceEvent[]>();

  // Toutes les interventions du vélo : nécessaires pour proposer une
  // destination lorsqu'on déplace une pièce.
  const { data: siblings } = await supabase
    .from("interventions")
    .select("*")
    .eq("bike_id", bike.id)
    .returns<Intervention[]>();

  const pieces = events ?? [];
  const status = interventionStatus(intervention);
  const enRetard = isEnRetard(intervention);
  const totalCost = pieces.reduce((sum, e) => sum + (e.cost ?? 0), 0);

  const dates = pieces.map((e) => e.date).sort();
  const range =
    dates.length > 0
      ? dates[0] === dates[dates.length - 1]
        ? formatDate(dates[0])
        : `${formatDate(dates[0])} – ${formatDate(dates[dates.length - 1])}`
      : null;

  const subtitle =
    status === "terminee"
      ? range ?? "Aucune pièce"
      : status === "en_cours"
        ? `Ouvert le ${formatDate(intervention.started_at!)}`
        : intervention.date_prevue
          ? `Prévu le ${formatDate(intervention.date_prevue)}`
          : "Sans date prévue";

  const startAction = startIntervention.bind(
    null,
    intervention.id,
    bike.id
  );
  const closeAction = closeIntervention.bind(
    null,
    intervention.id,
    bike.id
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href={`/bikes/${bike.id}`}
          className="text-sm text-muted-foreground underline underline-offset-4"
        >
          ← {bike.name}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{intervention.title}</h1>
          <Badge variant={status === "en_cours" ? "secondary" : "outline"}>
            {INTERVENTION_STATUS_LABELS[status]}
          </Badge>
          {enRetard && <Badge variant="destructive">En retard</Badge>}
          <CauseBadge cause={intervention.cause} />
        </div>
        <p className="text-sm text-muted-foreground">
          {subtitle} · {pieces.length} pièce{pieces.length > 1 ? "s" : ""}
          {totalCost > 0 && ` · ${formatCost(totalCost)}`}
        </p>
      </div>

      <InterventionHeaderActions
        bikeId={bike.id}
        intervention={intervention}
        status={status}
        lastMileageKm={bike.mileage_km}
        onStart={startAction}
        onClose={closeAction}
      />

      {intervention.note && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Note</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{intervention.note}</p>
          </CardContent>
        </Card>
      )}

      <MaintenanceSection
        bikeId={bike.id}
        events={pieces}
        interventions={siblings ?? [intervention]}
        fixedInterventionId={intervention.id}
        lastMileageKm={bike.mileage_km}
      />
    </div>
  );
}
