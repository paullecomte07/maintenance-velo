import type {
  BikeCategory,
  BikeSystem,
  EtatConstate,
  InterventionCause,
  NatureChangementType,
} from "@/lib/reference-data";

export type Bike = {
  id: string;
  user_id: string;
  name: string;
  brand: string | null;
  model: string | null;
  category: BikeCategory;
  purchase_date: string | null;
  purchase_price: number;
  mileage_km: number | null;
  spec_sheet_url: string | null;
  depreciation_rate: number;
  photo_url: string | null;
  ai_analysis: string | null;
  ai_analysis_generated_at: string | null;
  created_at: string;
};

// Une intervention est un chantier qui traverse trois états. L'état n'est pas
// stocké : il se déduit des deux dates, ce qui évite qu'il puisse diverger.
export type InterventionStatus = "a_venir" | "en_cours" | "terminee";

export type Intervention = {
  id: string;
  bike_id: string;
  title: string;
  /** Date d'ouverture réelle. `null` tant que le chantier n'a pas démarré. */
  started_at: string | null;
  /** Date à laquelle le chantier est prévu, pour les interventions à venir. */
  date_prevue: string | null;
  /** `null` tant que le chantier n'est pas clôturé. */
  closed_at: string | null;
  /**
   * Pourquoi ce chantier est ouvert. Obligatoire à la saisie, mais `null` sur
   * tout l'historique importé : la migration n'invente aucune cause.
   */
  cause: InterventionCause | null;
  note: string | null;
  created_at: string;
};

export function interventionStatus(
  intervention: Pick<Intervention, "started_at" | "closed_at">
): InterventionStatus {
  if (intervention.closed_at !== null) return "terminee";
  if (intervention.started_at !== null) return "en_cours";
  return "a_venir";
}

export const INTERVENTION_STATUS_LABELS: Record<InterventionStatus, string> = {
  a_venir: "À venir",
  en_cours: "En cours",
  terminee: "Terminée",
};

/** Une intervention à venir dont la date prévue est dépassée. */
export function isEnRetard(
  intervention: Pick<Intervention, "started_at" | "closed_at" | "date_prevue">,
  today = new Date()
): boolean {
  if (interventionStatus(intervention) !== "a_venir") return false;
  if (!intervention.date_prevue) return false;
  return intervention.date_prevue < today.toISOString().slice(0, 10);
}

/**
 * Une **action** menée sur une pièce : ce qu'on a fait, sur quoi, et dans quel
 * état on l'a trouvée. La table garde son nom historique — le renommer
 * casserait la production entre l'application manuelle d'une migration et le
 * déploiement, pour un gain purement cosmétique.
 */
export type MaintenanceEvent = {
  id: string;
  bike_id: string;
  intervention_id: string;
  date: string;
  /** La pièce concernée. */
  title: string;
  system: BikeSystem;
  /** L'action : inspection, entretien, réparation, remise à neuf. */
  nature_changement: NatureChangementType;
  /**
   * État de la pièce au moment de l'action. `null` sur l'historique migré
   * depuis un « accident », qui ne disait rien de l'état de la pièce.
   */
  etat_constate: EtatConstate | null;
  cost: number | null;
  /** Kilométrage du vélo relevé au moment de l'action. */
  mileage_km: number | null;
  created_at: string;
};
