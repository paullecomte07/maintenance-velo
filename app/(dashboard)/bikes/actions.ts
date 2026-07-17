"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type BikeFormState = { error: string | null; success: boolean };

function bikePayload(formData: FormData) {
  const optional = (name: string) => {
    const value = (formData.get(name) as string)?.trim();
    return value ? value : null;
  };

  return {
    name: (formData.get("name") as string).trim(),
    brand: optional("brand"),
    model: optional("model"),
    category: formData.get("category") as string,
    purchase_date: optional("purchase_date"),
    purchase_price: Number(formData.get("purchase_price")),
    mileage_km: optional("mileage_km") ? Number(formData.get("mileage_km")) : null,
    spec_sheet_url: optional("spec_sheet_url"),
    depreciation_rate: Number(formData.get("depreciation_rate")),
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
