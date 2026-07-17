import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BikeForm } from "@/components/bike-form";
import { createBike } from "../actions";

export default function NewBikePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ajouter un vélo</CardTitle>
        <CardDescription>
          Le taux de dépréciation est pré-rempli selon la catégorie, tu peux
          l&apos;ajuster.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <BikeForm action={createBike} />
      </CardContent>
    </Card>
  );
}
