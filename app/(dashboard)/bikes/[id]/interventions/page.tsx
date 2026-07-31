import Link from "next/link";
import { notFound } from "next/navigation";

import {
  InterventionSection,
  type InterventionStats,
} from "@/components/intervention-section";
import { createClient } from "@/lib/supabase/server";
import type { Bike, Intervention, MaintenanceEvent } from "@/lib/types";

export default async function InterventionsPage({
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

  const { data: interventions } = await supabase
    .from("interventions")
    .select("*")
    .eq("bike_id", bike.id)
    .order("date", { ascending: false })
    .returns<Intervention[]>();

  const { data: events } = await supabase
    .from("maintenance_events")
    .select("*")
    .eq("bike_id", bike.id)
    .returns<MaintenanceEvent[]>();

  const stats: InterventionStats = {};
  for (const event of events ?? []) {
    if (!event.intervention_id) continue;
    const stat = (stats[event.intervention_id] ??= { count: 0, totalCost: 0 });
    stat.count += 1;
    stat.totalCost += event.cost ?? 0;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href={`/bikes/${bike.id}`}
          className="text-sm text-muted-foreground underline underline-offset-4"
        >
          ← Retour au vélo
        </Link>
        <h1 className="text-2xl font-bold">{bike.name}</h1>
        <p className="text-sm text-muted-foreground">
          Chaque intervention regroupe les changements de pièces réalisés au
          cours d&apos;une même session.
        </p>
      </div>

      <InterventionSection
        bikeId={bike.id}
        interventions={interventions ?? []}
        stats={stats}
      />
    </div>
  );
}
