"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { Intervention } from "@/lib/types";

export type InterventionFormState = { error: string | null; success: boolean };

function today() {
  return new Date().toISOString().slice(0, 10);
}

function revalidateBike(bikeId: string) {
  revalidatePath(`/bikes/${bikeId}`);
  revalidatePath(`/bikes/${bikeId}/interventions`, "layout");
}

/**
 * Le chantier ouvert d'un vélo, s'il y en a un. Il ne peut y en avoir qu'un :
 * un index unique partiel le garantit en base, et c'est cette contrainte qui
 * permet de rattacher une pièce sans jamais poser de question à la saisie.
 */
export async function getOpenIntervention(
  bikeId: string
): Promise<Intervention | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("interventions")
    .select("*")
    .eq("bike_id", bikeId)
    .not("started_at", "is", null)
    .is("closed_at", null)
    .maybeSingle<Intervention>();

  return data ?? null;
}

/**
 * Crée une intervention **à venir** : un chantier planifié, pas encore démarré.
 * L'ouverture d'un chantier passe soit par la saisie d'une première pièce,
 * soit par `startIntervention`.
 */
export async function createIntervention(
  bikeId: string,
  _prevState: InterventionFormState,
  formData: FormData
): Promise<InterventionFormState> {
  const supabase = createClient();

  const title = (formData.get("title") as string)?.trim();
  if (!title) {
    return { error: "Donne un nom à cette intervention.", success: false };
  }

  const datePrevue = (formData.get("date_prevue") as string)?.trim();
  const note = (formData.get("note") as string)?.trim();

  const { error } = await supabase.from("interventions").insert({
    bike_id: bikeId,
    title,
    date_prevue: datePrevue || null,
    note: note || null,
    started_at: null,
    closed_at: null,
  });

  if (error) {
    return {
      error: "L'enregistrement de l'intervention a échoué. Réessaie.",
      success: false,
    };
  }

  revalidateBike(bikeId);
  return { error: null, success: true };
}

/** Renommer, changer la date prévue, modifier la note. */
export async function updateIntervention(
  interventionId: string,
  bikeId: string,
  _prevState: InterventionFormState,
  formData: FormData
): Promise<InterventionFormState> {
  const supabase = createClient();

  const title = (formData.get("title") as string)?.trim();
  if (!title) {
    return { error: "Donne un nom à cette intervention.", success: false };
  }

  const datePrevue = (formData.get("date_prevue") as string)?.trim();
  const note = (formData.get("note") as string)?.trim();

  const { error } = await supabase
    .from("interventions")
    .update({
      title,
      date_prevue: datePrevue || null,
      note: note || null,
    })
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

/**
 * Démarre un chantier prévu. Refusé si un autre chantier est déjà ouvert sur
 * ce vélo : le rattachement automatique deviendrait ambigu.
 */
export async function startIntervention(
  interventionId: string,
  bikeId: string
): Promise<{ error: string | null }> {
  const supabase = createClient();

  const open = await getOpenIntervention(bikeId);
  if (open && open.id !== interventionId) {
    return {
      error: `« ${open.title} » est déjà en cours sur ce vélo. Clôture-la avant d'en démarrer une autre.`,
    };
  }

  const { error } = await supabase
    .from("interventions")
    .update({ started_at: today(), closed_at: null })
    .eq("id", interventionId);

  if (error) {
    return { error: "Le démarrage du chantier a échoué. Réessaie." };
  }

  revalidateBike(bikeId);
  return { error: null };
}

/**
 * Clôture un chantier. C'est toujours une action explicite : rien ne se ferme
 * tout seul, un chantier peut dormir des semaines sans être fini.
 */
export async function closeIntervention(
  interventionId: string,
  bikeId: string
): Promise<{ error: string | null }> {
  const supabase = createClient();

  const { error } = await supabase
    .from("interventions")
    .update({ closed_at: new Date().toISOString() })
    .eq("id", interventionId)
    .not("started_at", "is", null);

  if (error) {
    return { error: "La clôture de l'intervention a échoué. Réessaie." };
  }

  revalidateBike(bikeId);
  return { error: null };
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
