"use server";

import { revalidatePath } from "next/cache";

import { ANALYSIS_MODEL, createAnthropicClient } from "@/lib/anthropic";
import { ANALYSIS_SYSTEM_PROMPT } from "@/lib/prompts/analysis-prompt";
import {
  BIKE_CATEGORIES,
  BIKE_SYSTEMS,
  ETATS_CONSTATES,
  NATURE_CHANGEMENT_TYPES,
} from "@/lib/reference-data";
import { createClient } from "@/lib/supabase/server";
import { nomDeSession, type Intervention } from "@/lib/types";
import type { Bike, MaintenanceEvent } from "@/lib/types";

export type EventFormState = { error: string | null; success: boolean };

export type AnalysisState = {
  error: string | null;
  success: boolean;
  analysis?: string;
  generatedAt?: string;
};

function eventPayload(formData: FormData) {
  const cost = (formData.get("cost") as string)?.trim();
  const etat = (formData.get("etat_constate") as string)?.trim();
  return {
    date: formData.get("date") as string,
    title: (formData.get("title") as string).trim(),
    system: formData.get("system") as string,
    nature_changement: formData.get("nature_changement") as string,
    // L'état est obligatoire à la saisie mais la colonne est nullable :
    // l'historique migré depuis un « accident » n'en a pas, et une action
    // seulement *prévue* n'en aura pas non plus (#26).
    etat_constate: etat && etat in ETATS_CONSTATES ? etat : null,
    cost: cost ? Number(cost) : null,
  };
}

/**
 * La session est toujours connue : on n'entre dans la saisie que depuis sa
 * fiche. Consigner du travail fait la fait donc **démarrer** si elle était
 * seulement prévue — une session ne peut pas rester « à venir » alors qu'elle
 * porte des actions réalisées.
 *
 * Le refus reprend mot pour mot celui de « Démarrer cette session » : l'index
 * unique n'autorise qu'une seule session ouverte par vélo, et un message clair
 * vaut mieux qu'une erreur de contrainte.
 */
async function ensureStarted(
  supabase: ReturnType<typeof createClient>,
  bikeId: string,
  interventionId: string,
  date: string
): Promise<{ error: string } | null> {
  const { data: target } = await supabase
    .from("interventions")
    .select("id, started_at")
    .eq("id", interventionId)
    .eq("bike_id", bikeId)
    .maybeSingle<{ id: string; started_at: string | null }>();

  if (!target) {
    return { error: "Cette session est introuvable." };
  }
  // Déjà démarrée, ou terminée : on ne touche à rien. Compléter après coup une
  // session clôturée reste possible.
  if (target.started_at !== null) return null;

  const { data: open } = await supabase
    .from("interventions")
    .select("title, cause, started_at, date_prevue, created_at")
    .eq("bike_id", bikeId)
    .not("started_at", "is", null)
    .is("closed_at", null)
    .maybeSingle<
      Pick<
        Intervention,
        "title" | "cause" | "started_at" | "date_prevue" | "created_at"
      >
    >();

  if (open) {
    return {
      error: `« ${nomDeSession(open)} » est déjà en cours sur ce vélo. Clôture-la avant d'en démarrer une autre.`,
    };
  }

  const { error } = await supabase
    .from("interventions")
    .update({ started_at: date })
    .eq("id", interventionId);

  if (error) {
    return { error: "Le démarrage de la session a échoué. Réessaie." };
  }
  return null;
}

function readInterventionId(formData: FormData): string | null {
  const id = (formData.get("intervention_id") as string | null)?.trim();
  return id || null;
}

export async function createEvent(
  bikeId: string,
  _prevState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const supabase = createClient();

  const interventionId = readInterventionId(formData);
  if (!interventionId) {
    return { error: "Aucune session sélectionnée.", success: false };
  }

  const payload = eventPayload(formData);

  const started = await ensureStarted(
    supabase,
    bikeId,
    interventionId,
    payload.date
  );
  if (started) {
    return { error: started.error, success: false };
  }

  const { error } = await supabase.from("maintenance_events").insert({
    ...payload,
    bike_id: bikeId,
    intervention_id: interventionId,
  });

  if (error) {
    return {
      error: "L'enregistrement de l'action a échoué. Réessaie.",
      success: false,
    };
  }

  revalidatePath(`/bikes/${bikeId}`);
  revalidatePath(`/bikes/${bikeId}/interventions`);
  revalidatePath(`/bikes/${bikeId}/interventions/${interventionId}`);
  return { error: null, success: true };
}

export async function updateEvent(
  eventId: string,
  bikeId: string,
  _prevState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const supabase = createClient();

  const interventionId = readInterventionId(formData);
  if (!interventionId) {
    return { error: "Aucune session sélectionnée.", success: false };
  }

  const { error } = await supabase
    .from("maintenance_events")
    .update({ ...eventPayload(formData), intervention_id: interventionId })
    .eq("id", eventId);

  if (error) {
    return {
      error: "La modification de l'action a échoué. Réessaie.",
      success: false,
    };
  }

  revalidatePath(`/bikes/${bikeId}`);
  revalidatePath(`/bikes/${bikeId}/interventions`);
  revalidatePath(`/bikes/${bikeId}/interventions/${interventionId}`);
  return { error: null, success: true };
}

/**
 * Déplace une action d'une session vers une autre. Sans cela, une erreur de
 * rattachement automatique deviendrait définitive.
 */
export async function moveEvent(
  eventId: string,
  targetInterventionId: string,
  bikeId: string
): Promise<{ error: string | null }> {
  const supabase = createClient();

  const { error } = await supabase
    .from("maintenance_events")
    .update({ intervention_id: targetInterventionId })
    .eq("id", eventId);

  if (error) {
    return { error: "Le déplacement de l'action a échoué. Réessaie." };
  }

  revalidatePath(`/bikes/${bikeId}`);
  revalidatePath(`/bikes/${bikeId}/interventions`, "layout");
  return { error: null };
}

export async function deleteEvent(eventId: string, bikeId: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from("maintenance_events")
    .delete()
    .eq("id", eventId);

  if (error) {
    throw new Error("La suppression de l'action a échoué.");
  }

  revalidatePath(`/bikes/${bikeId}`);
  revalidatePath(`/bikes/${bikeId}/interventions`, "layout");
}

function formatEventsForPrompt(bike: Bike, events: MaintenanceEvent[]) {
  const ageLine = bike.purchase_date
    ? `Date d'achat : ${bike.purchase_date}`
    : "Date d'achat inconnue";

  const eventLines = events.map((e) => {
    const cost = e.cost !== null ? `${e.cost} €` : "coût inconnu";
    const etat = e.etat_constate
      ? ETATS_CONSTATES[e.etat_constate]
      : "état non renseigné";
    const km = e.mileage_km !== null ? ` · ${e.mileage_km} km` : "";
    return `- ${e.date} · ${BIKE_SYSTEMS[e.system]} · ${e.title} · ${NATURE_CHANGEMENT_TYPES[e.nature_changement]} · ${etat}${km} · ${cost}`;
  });

  return [
    `Vélo : ${bike.name} (${BIKE_CATEGORIES[bike.category]})`,
    [bike.brand, bike.model].filter(Boolean).join(" ") || "Marque/modèle non renseignés",
    ageLine,
    bike.mileage_km !== null ? `Kilométrage : ${bike.mileage_km} km` : "Kilométrage inconnu",
    "",
    "Actions menées sur ce vélo (de la plus ancienne à la plus récente) :",
    ...eventLines,
  ].join("\n");
}

async function callAnthropic(bike: Bike, events: MaintenanceEvent[]) {
  const anthropic = createAnthropicClient();
  const message = await anthropic.messages.create({
    model: ANALYSIS_MODEL,
    max_tokens: 1024,
    system: ANALYSIS_SYSTEM_PROMPT,
    messages: [{ role: "user", content: formatEventsForPrompt(bike, events) }],
  });
  // Le modèle peut renvoyer un bloc "thinking" avant le bloc "text" :
  // on cherche le premier bloc texte quelle que soit sa position.
  const textBlock = message.content.find((b) => b.type === "text");
  return textBlock?.type === "text" ? textBlock.text : "";
}

async function mockAnalysis() {
  // Simule la latence et le format réels, sans appeler l'API (tests gratuits).
  await new Promise((resolve) => setTimeout(resolve, 600));
  return [
    "[SIMULATION - ANTHROPIC_MOCK activé, aucun appel API réel]",
    "",
    "Ce qui interroge",
    "- La transmission revient très souvent (chaîne, cassette, dérailleur) sur une période courte.",
    "- Plusieurs usures classées « prématurées » sur le même système en peu de temps.",
    "",
    "Ce qu'il faudra probablement vérifier bientôt",
    "- Vérifier l'alignement et la tension de la chaîne pour éviter une usure accélérée récurrente.",
    "- Contrôler les freins avant/arrière, sujets à des remises à neuf rapprochées.",
  ].join("\n");
}

export async function generateAnalysis(
  bikeId: string
): Promise<AnalysisState> {
  const supabase = createClient();

  const { data: bike } = await supabase
    .from("bikes")
    .select("*")
    .eq("id", bikeId)
    .single<Bike>();

  if (!bike) {
    return { error: "Vélo introuvable.", success: false };
  }

  const { data: events } = await supabase
    .from("maintenance_events")
    .select("*")
    .eq("bike_id", bikeId)
    .order("date", { ascending: true })
    .returns<MaintenanceEvent[]>();

  if (!events || events.length === 0) {
    return {
      error: "Ajoute au moins une action avant de lancer une analyse.",
      success: false,
    };
  }

  let analysisText: string;
  try {
    analysisText = process.env.ANTHROPIC_MOCK === "true"
      ? await mockAnalysis()
      : await callAnthropic(bike, events);
    if (!analysisText) {
      return { error: "L'analyse n'a renvoyé aucun contenu.", success: false };
    }
  } catch (e) {
    console.error("generateAnalysis: appel Anthropic échoué", e);
    const isConfigError =
      e instanceof Error && e.message.includes("ANTHROPIC_API_KEY");
    return {
      error: isConfigError
        ? "L'analyse IA n'est pas configurée (clé API manquante)."
        : "L'analyse a échoué. Réessaie dans un instant.",
      success: false,
    };
  }

  const generatedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("bikes")
    .update({ ai_analysis: analysisText, ai_analysis_generated_at: generatedAt })
    .eq("id", bikeId);

  if (updateError) {
    console.error("generateAnalysis: échec de l'enregistrement", updateError);
    return {
      error: "L'analyse a réussi mais n'a pas pu être enregistrée.",
      success: false,
    };
  }

  revalidatePath(`/bikes/${bikeId}`);
  return { error: null, success: true, analysis: analysisText, generatedAt };
}
