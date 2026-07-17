"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type EventFormState = { error: string | null; success: boolean };

function eventPayload(formData: FormData) {
  const cost = (formData.get("cost") as string)?.trim();
  return {
    date: formData.get("date") as string,
    title: (formData.get("title") as string).trim(),
    system: formData.get("system") as string,
    intervention_type: formData.get("intervention_type") as string,
    cause_type: formData.get("cause_type") as string,
    cost: cost ? Number(cost) : null,
  };
}

export async function createEvent(
  bikeId: string,
  _prevState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const supabase = createClient();

  const { error } = await supabase
    .from("maintenance_events")
    .insert({ ...eventPayload(formData), bike_id: bikeId });

  if (error) {
    return {
      error: "L'enregistrement de l'intervention a échoué. Réessaie.",
      success: false,
    };
  }

  revalidatePath(`/bikes/${bikeId}`);
  return { error: null, success: true };
}

export async function updateEvent(
  eventId: string,
  bikeId: string,
  _prevState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const supabase = createClient();

  const { error } = await supabase
    .from("maintenance_events")
    .update(eventPayload(formData))
    .eq("id", eventId);

  if (error) {
    return {
      error: "La modification de l'intervention a échoué. Réessaie.",
      success: false,
    };
  }

  revalidatePath(`/bikes/${bikeId}`);
  return { error: null, success: true };
}

export async function deleteEvent(eventId: string, bikeId: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from("maintenance_events")
    .delete()
    .eq("id", eventId);

  if (error) {
    throw new Error("La suppression de l'intervention a échoué.");
  }

  revalidatePath(`/bikes/${bikeId}`);
}
