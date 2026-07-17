"use server";

import { revalidatePath } from "next/cache";

import { ANALYSIS_MODEL, createAnthropicClient } from "@/lib/anthropic";
import {
  BIKE_CATEGORIES,
  BIKE_SYSTEMS,
  CAUSE_TYPES,
  INTERVENTION_TYPES,
} from "@/lib/reference-data";
import { createClient } from "@/lib/supabase/server";
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

function formatEventsForPrompt(bike: Bike, events: MaintenanceEvent[]) {
  const ageLine = bike.purchase_date
    ? `Date d'achat : ${bike.purchase_date}`
    : "Date d'achat inconnue";

  const eventLines = events.map((e) => {
    const cost = e.cost !== null ? `${e.cost} €` : "coût inconnu";
    return `- ${e.date} · ${BIKE_SYSTEMS[e.system]} · ${e.title} · ${INTERVENTION_TYPES[e.intervention_type]} · ${CAUSE_TYPES[e.cause_type]} · ${cost}`;
  });

  return [
    `Vélo : ${bike.name} (${BIKE_CATEGORIES[bike.category]})`,
    [bike.brand, bike.model].filter(Boolean).join(" ") || "Marque/modèle non renseignés",
    ageLine,
    bike.mileage_km !== null ? `Kilométrage : ${bike.mileage_km} km` : "Kilométrage inconnu",
    "",
    "Cahier d'intervention (du plus ancien au plus récent) :",
    ...eventLines,
  ].join("\n");
}

const ANALYSIS_SYSTEM_PROMPT = `Tu es un mécanicien vélo professionnel expérimenté. On te fournit l'historique d'entretien complet d'un vélo (systèmes concernés, types d'intervention, causes). Analyse-le et donne un avis concret en français, structuré en deux parties avec ces titres exacts :

Ce qui interroge
Ce qu'il faudra probablement vérifier bientôt

Sois direct et concret : cite les systèmes ou pièces concernés et les dates si pertinent (usures prématurées répétées, pièces qui reviennent souvent, systèmes qui posent problème, entretiens préventifs à anticiper vu les fréquences observées). Pas de généralités, pas de disclaimer. Reste concis (200 mots maximum). Utilise des tirets pour les listes, pas de gras ni d'étoiles.`;

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
      error: "Ajoute au moins une intervention avant de lancer une analyse.",
      success: false,
    };
  }

  let analysisText: string;
  try {
    const anthropic = createAnthropicClient();
    const message = await anthropic.messages.create({
      model: ANALYSIS_MODEL,
      max_tokens: 1024,
      system: ANALYSIS_SYSTEM_PROMPT,
      messages: [
        { role: "user", content: formatEventsForPrompt(bike, events) },
      ],
    });
    const block = message.content[0];
    analysisText = block.type === "text" ? block.text : "";
    if (!analysisText) {
      return { error: "L'analyse n'a renvoyé aucun contenu.", success: false };
    }
  } catch (e) {
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
    return {
      error: "L'analyse a réussi mais n'a pas pu être enregistrée.",
      success: false,
    };
  }

  revalidatePath(`/bikes/${bikeId}`);
  return { error: null, success: true, analysis: analysisText, generatedAt };
}
