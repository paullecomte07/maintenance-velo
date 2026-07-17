import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteBike } from "../actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteBikeButton } from "@/components/delete-bike-button";
import { MaintenanceAnalysis } from "@/components/maintenance-analysis";
import { MaintenanceSection } from "@/components/maintenance-section";
import { createClient } from "@/lib/supabase/server";
import { BIKE_CATEGORIES } from "@/lib/reference-data";
import type { Bike, MaintenanceEvent } from "@/lib/types";

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

  const deleteAction = deleteBike.bind(null, bike.id);

  const identity: [string, React.ReactNode][] = [
    ["Marque", bike.brand ?? "—"],
    ["Modèle", bike.model ?? "—"],
    ["Date d'achat", formatDate(bike.purchase_date)],
    ["Prix d'achat", formatPrice(bike.purchase_price)],
    [
      "Kilométrage",
      bike.mileage_km !== null ? `${bike.mileage_km} km` : "—",
    ],
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
          <Button variant="outline" size="sm" asChild>
            <Link href={`/bikes/${bike.id}/edit`}>Modifier</Link>
          </Button>
          <DeleteBikeButton bikeName={bike.name} onDelete={deleteAction} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fiche d&apos;identité</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {identity.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 text-sm">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <MaintenanceSection bikeId={bike.id} events={events ?? []} />

      <MaintenanceAnalysis
        bikeId={bike.id}
        hasEvents={(events ?? []).length > 0}
        initialAnalysis={bike.ai_analysis}
        initialGeneratedAt={bike.ai_analysis_generated_at}
      />
    </div>
  );
}
