"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  DEFAULT_DEPRECIATION_RATES,
  type BikeCategory,
} from "@/lib/reference-data";
import { createClient } from "@/lib/supabase/server";

export type BikeFormState = { error: string | null; success: boolean };

function bikePayload(formData: FormData) {
  const optional = (name: string) => {
    const value = (formData.get(name) as string)?.trim();
    return value ? value : null;
  };

  const category = formData.get("category") as BikeCategory;

  // Le taux ne figure plus au formulaire de création : on demandait de valider
  // un chiffre financier que personne n'a de moyen de juger, avant même
  // d'avoir enregistré son premier vélo. Le défaut de la catégorie s'applique,
  // et « Modifier le vélo » permet de le corriger.
  const taux = Number(formData.get("depreciation_rate"));

  return {
    name: (formData.get("name") as string).trim(),
    brand: optional("brand"),
    model: optional("model"),
    category,
    purchase_date: optional("purchase_date"),
    purchase_price: Number(formData.get("purchase_price")),
    serial_number: optional("serial_number"),
    identification_number: optional("identification_number"),
    spec_sheet_url: optional("spec_sheet_url"),
    depreciation_rate: Number.isFinite(taux)
      ? taux
      : DEFAULT_DEPRECIATION_RATES[category],
    // Le kilométrage est entretenu par les sessions d'atelier. La clé n'est
    // reprise que si le formulaire la porte — sinon une création l'écraserait
    // à null alors qu'aucun écran ne l'a demandé.
    ...(formData.has("mileage_km")
      ? {
          mileage_km: optional("mileage_km")
            ? Number(formData.get("mileage_km"))
            : null,
        }
      : {}),
  };
}

export async function createBike(
  _prevState: BikeFormState,
  formData: FormData
): Promise<BikeFormState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("bikes")
    .insert({ ...bikePayload(formData), user_id: user.id });

  if (error) {
    return { error: "L'enregistrement du vélo a échoué. Réessaie.", success: false };
  }

  revalidatePath("/bikes");
  return { error: null, success: true };
}

export async function updateBike(
  bikeId: string,
  _prevState: BikeFormState,
  formData: FormData
): Promise<BikeFormState> {
  const supabase = createClient();

  const { error } = await supabase
    .from("bikes")
    .update(bikePayload(formData))
    .eq("id", bikeId);

  if (error) {
    return { error: "La modification du vélo a échoué. Réessaie.", success: false };
  }

  revalidatePath("/bikes");
  revalidatePath(`/bikes/${bikeId}`);
  return { error: null, success: true };
}

export async function deleteBike(bikeId: string) {
  const supabase = createClient();

  const { error } = await supabase.from("bikes").delete().eq("id", bikeId);

  if (error) {
    throw new Error("La suppression du vélo a échoué.");
  }

  revalidatePath("/bikes");
}
