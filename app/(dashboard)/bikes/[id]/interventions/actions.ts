"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type InterventionFormState = { error: string | null; success: boolean };

function interventionPayload(formData: FormData) {
  const note = (formData.get("note") as string)?.trim();
  return {
    title: (formData.get("title") as string).trim(),
    date: formData.get("date") as string,
    note: note || null,
  };
}

function revalidateBike(bikeId: string) {
  revalidatePath(`/bikes/${bikeId}`);
  revalidatePath(`/bikes/${bikeId}/interventions`, "layout");
}

export async function createIntervention(
  bikeId: string,
  _prevState: InterventionFormState,
  formData: FormData
): Promise<InterventionFormState> {
  const supabase = createClient();

  const { error } = await supabase
    .from("interventions")
    .insert({ ...interventionPayload(formData), bike_id: bikeId });

  if (error) {
    return {
      error: "L'enregistrement de l'intervention a échoué. Réessaie.",
      success: false,
    };
  }

  revalidateBike(bikeId);
  return { error: null, success: true };
}

export async function updateIntervention(
  interventionId: string,
  bikeId: string,
  _prevState: InterventionFormState,
  formData: FormData
): Promise<InterventionFormState> {
  const supabase = createClient();

  const { error } = await supabase
    .from("interventions")
    .update(interventionPayload(formData))
    .eq("id", interventionId);

  if (error) {
    return {
      error: "La modification de l'intervention a échoué. Réessaie.",
      success: false,
    };
  }

  revalidateBike(bikeId);
  return { error: null, success: true };
}

// Renvoie l'erreur plutôt que de la lever : le refus de suppression est un cas
// métier attendu dont le message doit atteindre l'utilisateur (Next masque le
// message des exceptions de server action en production).
export async function deleteIntervention(
  interventionId: string,
  bikeId: string
): Promise<{ error: string | null }> {
  const supabase = createClient();

  // Une intervention qui porte encore des changements n'est pas supprimable :
  // l'historique de maintenance ne doit pas disparaître silencieusement.
  const { count } = await supabase
    .from("maintenance_events")
    .select("id", { count: "exact", head: true })
    .eq("intervention_id", interventionId);

  if (count && count > 0) {
    return {
      error:
        "Cette intervention contient encore des changements de pièces. Déplace-les ou supprime-les d'abord.",
    };
  }

  const { error } = await supabase
    .from("interventions")
    .delete()
    .eq("id", interventionId);

  if (error) {
    return { error: "La suppression de l'intervention a échoué." };
  }

  revalidateBike(bikeId);
  return { error: null };
}
