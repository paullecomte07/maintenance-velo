import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BikeForm } from "@/components/bike-form";
import { createClient } from "@/lib/supabase/server";
import { updateBike } from "../../actions";
import type { Bike } from "@/lib/types";

export default async function EditBikePage({
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

  const action = updateBike.bind(null, bike.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modifier « {bike.name} »</CardTitle>
      </CardHeader>
      <CardContent>
        <BikeForm action={action} bike={bike} />
      </CardContent>
    </Card>
  );
}
