import Link from "next/link";
import { notFound } from "next/navigation";

import { MaintenanceSection } from "@/components/maintenance-section";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { Bike, Intervention, MaintenanceEvent } from "@/lib/types";

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("fr-FR");
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

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href={`/bikes/${bike.id}/interventions`}
          className="text-sm text-muted-foreground underline underline-offset-4"
        >
          ← Interventions de {bike.name}
        </Link>
        <h1 className="text-2xl font-bold">{intervention.title}</h1>
        <p className="text-sm text-muted-foreground">
          {formatDate(intervention.date)}
        </p>
      </div>

      {intervention.note && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Note</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{intervention.note}</p>
          </CardContent>
        </Card>
      )}

      <MaintenanceSection
        bikeId={bike.id}
        events={events ?? []}
        interventions={[intervention]}
        fixedInterventionId={intervention.id}
      />
    </div>
  );
}
