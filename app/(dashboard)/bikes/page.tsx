import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { BIKE_CATEGORIES } from "@/lib/reference-data";
import type { Bike } from "@/lib/types";

export default async function BikesPage() {
  const supabase = createClient();
  const { data: bikes } = await supabase
    .from("bikes")
    .select("*")
    .order("created_at", { ascending: true })
    .returns<Bike[]>();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mes vélos</h1>
        <Button asChild>
          <Link href="/bikes/new">Ajouter un vélo</Link>
        </Button>
      </div>

      {!bikes || bikes.length === 0 ? (
        <Card>
          <CardHeader className="items-center text-center">
            <CardTitle>Aucun vélo pour l&apos;instant</CardTitle>
            <CardDescription>
              Ajoute ton premier vélo pour commencer à suivre son entretien.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {bikes.map((bike) => (
            <Link key={bike.id} href={`/bikes/${bike.id}`}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{bike.name}</CardTitle>
                    <Badge variant="secondary">
                      {BIKE_CATEGORIES[bike.category]}
                    </Badge>
                  </div>
                  <CardDescription>
                    {[bike.brand, bike.model].filter(Boolean).join(" ") ||
                      "Marque et modèle non renseignés"}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
