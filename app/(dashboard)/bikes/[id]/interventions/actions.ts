"use server";

import { revalidatePath } from "next/cache";

import {
  CAUSE_MANQUANTE,
  parseInterventionCause,
} from "@/lib/reference-data";
import { createClient } from "@/lib/supabase/server";
import { nomDeSession, type Intervention } from "@/lib/types";

export type InterventionFormState = { error: string | null; success: boolean };

function today() {
  return new Date().toISOString().slice(0, 10);
}

function revalidateBike(bikeId: string) {
  revalidatePath(`/bikes/${bikeId}`);
  revalidatePath(`/bikes/${bikeId}/interventions`, "layout");
}

/**
 * La session ouverte d'un vélo, s'il y en a une. Il ne peut y en avoir qu'une :
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
 * Crée une session **à venir** : planifiée, pas encore démarrée. L'ouverture
 * passe soit par la saisie d'une première action, soit par `startIntervention`.
 */
export async function createIntervention(
  bikeId: string,
  _prevState: InterventionFormState,
  formData: FormData
): Promise<InterventionFormState> {
  const supabase = createClient();

  // Le nom n'est plus exigé : c'est ce champ obligatoire, page blanche et
  // premier de l'écran, qui poussait à y recopier l'action à venir. Une session
  // sans nom se lit par sa cause et sa date.
  const title = (formData.get("title") as string)?.trim();

  const cause = parseInterventionCause(formData.get("cause"));
  if (!cause) {
    return { error: CAUSE_MANQUANTE, success: false };
  }

  const datePrevue = (formData.get("date_prevue") as string)?.trim();
  const note = (formData.get("note") as string)?.trim();

  const { error } = await supabase.from("interventions").insert({
    bike_id: bikeId,
    title: title || null,
    cause,
    date_prevue: datePrevue || null,
    note: note || null,
    started_at: null,
    closed_at: null,
  });

  if (error) {
    return {
      error: "L'enregistrement de la session a échoué. Réessaie.",
      success: false,
    };
  }

  revalidateBike(bikeId);
  return { error: null, success: true };
}

/** Nommer ou renommer, changer la date prévue, modifier la note. */
export async function updateIntervention(
  interventionId: string,
  bikeId: string,
  _prevState: InterventionFormState,
  formData: FormData
): Promise<InterventionFormState> {
  const supabase = createClient();

  const title = (formData.get("title") as string)?.trim();

  // Une session importée n'a pas de cause. Ne pas l'exiger ici évite
  // d'obliger à en inventer une juste pour corriger un titre — mais une cause
  // déjà posée n'est jamais retirée.
  const cause = parseInterventionCause(formData.get("cause"));

  const datePrevue = (formData.get("date_prevue") as string)?.trim();
  const note = (formData.get("note") as string)?.trim();

  const { error } = await supabase
    .from("interventions")
    .update({
      title: title || null,
      ...(cause ? { cause } : {}),
      date_prevue: datePrevue || null,
      note: note || null,
    })
    .eq("id", interventionId);

  if (error) {
    return {
      error: "La modification de la session a échoué. Réessaie.",
      success: false,
    };
  }

  revalidateBike(bikeId);
  return { error: null, success: true };
}

/**
 * Le dernier relevé connu du vélo ne fait que monter. Un relevé plus bas est
 * accepté sur la session — compteur changé, remis à zéro — mais n'efface pas
 * les kilomètres déjà parcourus.
 */
async function releverKilometrage(
  supabase: ReturnType<typeof createClient>,
  bikeId: string,
  mileageKm: number | null
) {
  if (mileageKm === null) return;

  const { data: bike } = await supabase
    .from("bikes")
    .select("mileage_km")
    .eq("id", bikeId)
    .maybeSingle<{ mileage_km: number | null }>();

  if (bike && bike.mileage_km !== null && bike.mileage_km >= mileageKm) return;

  await supabase.from("bikes").update({ mileage_km: mileageKm }).eq("id", bikeId);
}

/** Le relevé saisi, ou `null` s'il n'a pas été renseigné. */
function parseKilometrage(valeur: unknown): number | null {
  const km = typeof valeur === "number" ? valeur : Number(valeur);
  return Number.isFinite(km) && km >= 0 ? Math.round(km) : null;
}

/**
 * Démarre une session prévue. Refusé si une autre session est déjà ouverte sur
 * ce vélo : le rattachement automatique deviendrait ambigu.
 *
 * C'est le moment où l'on est à côté du vélo, compteur sous les yeux : le
 * relevé se demande ici, une fois, plutôt qu'à chaque action.
 */
export async function startIntervention(
  interventionId: string,
  bikeId: string,
  mileageKm: number | null
): Promise<{ error: string | null }> {
  const supabase = createClient();

  const open = await getOpenIntervention(bikeId);
  if (open && open.id !== interventionId) {
    return {
      error: `« ${nomDeSession(open)} » est déjà en cours sur ce vélo. Clôture-la avant d'en démarrer une autre.`,
    };
  }

  const km = parseKilometrage(mileageKm);

  const { error } = await supabase
    .from("interventions")
    .update({
      started_at: today(),
      closed_at: null,
      // Le relevé ne s'efface jamais tout seul : démarrer sans compteur sous
      // les yeux ne doit pas perdre celui qu'on avait déjà noté.
      ...(km !== null ? { mileage_km: km } : {}),
    })
    .eq("id", interventionId);

  if (error) {
    return { error: "Le démarrage de la session a échoué. Réessaie." };
  }

  await releverKilometrage(supabase, bikeId, km);

  revalidateBike(bikeId);
  return { error: null };
}

/**
 * Corrige le relevé d'une session, dans n'importe lequel de ses trois états.
 * Une session démarrée sans compteur sous les yeux se complète par ici.
 */
export async function updateSessionMileage(
  interventionId: string,
  bikeId: string,
  mileageKm: number | null
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const km = parseKilometrage(mileageKm);

  const { error } = await supabase
    .from("interventions")
    .update({ mileage_km: km })
    .eq("id", interventionId);

  if (error) {
    return { error: "L'enregistrement du kilométrage a échoué. Réessaie." };
  }

  await releverKilometrage(supabase, bikeId, km);

  revalidateBike(bikeId);
  return { error: null };
}

/**
 * Clôture une session. C'est toujours une action explicite : rien ne se ferme
 * tout seul, une session peut dormir des semaines sans être finie.
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
    return { error: "La clôture de la session a échoué. Réessaie." };
  }

  revalidateBike(bikeId);
  return { error: null };
}

/**
 * Supprime une session **et ses actions**.
 *
 * Le refus précédent — « déplace d'abord tes actions » — rendait ineffaçable
 * toute session ouverte par erreur dès qu'on y avait consigné quelque
 * chose, c'est-à-dire le cas courant. La protection ne disparaît pas pour
 * autant : elle passe dans la confirmation, qui annonce combien d'actions
 * seront perdues. C'est le seul endroit de l'application où de l'historique de
 * maintenance disparaît sans supprimer le vélo entier.
 *
 * Renvoie l'erreur plutôt que de la lever : Next masque le message des
 * exceptions de server action en production.
 */
export async function deleteIntervention(
  interventionId: string,
  bikeId: string
): Promise<{ error: string | null }> {
  const supabase = createClient();

  const { error: eventsError } = await supabase
    .from("maintenance_events")
    .delete()
    .eq("intervention_id", interventionId);

  if (eventsError) {
    return { error: "La suppression des actions a échoué." };
  }

  const { error } = await supabase
    .from("interventions")
    .delete()
    .eq("id", interventionId);

  if (error) {
    return { error: "La suppression de la session a échoué." };
  }

  revalidateBike(bikeId);
  return { error: null };
}
