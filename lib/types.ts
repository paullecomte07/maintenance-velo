import {
  INTERVENTION_CAUSES,
  type BikeCategory,
  type BikeSystem,
  type EtatConstate,
  type InterventionCause,
  type NatureChangementType,
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

// Une session d'atelier traverse trois états. L'état n'est pas stocké : il se
// déduit des deux dates, ce qui évite qu'il puisse diverger.
export type InterventionStatus = "a_venir" | "en_cours" | "terminee";

export type Intervention = {
  id: string;
  bike_id: string;
  /**
   * Nom donné par l'utilisateur. `null` quand il n'en a pas donné : l'exiger
   * était précisément ce qui poussait à y recopier le nom de l'action à venir
   * — « Changer ma chaîne » plutôt que « Révision de printemps ».
   */
  title: string | null;
  /** Date d'ouverture réelle. `null` tant que la session n'a pas démarré. */
  started_at: string | null;
  /** Date à laquelle la session est prévue, pour celles à venir. */
  date_prevue: string | null;
  /** `null` tant que la session n'est pas clôturée. */
  closed_at: string | null;
  /**
   * Pourquoi cette session est ouverte. Obligatoire à la saisie, mais `null` sur
   * tout l'historique importé : la migration n'invente aucune cause.
   */
  cause: InterventionCause | null;
  /**
   * Kilométrage du vélo au compteur, relevé une fois pour toute la session.
   * Il vivait sur l'action, où plus rien ne disait s'il parlait du vélo ou de
   * la pièce — tout le reste du formulaire parlant de la pièce. Facultatif :
   * on ne bloque pas quelqu'un qui n'a pas son compteur sous les yeux.
   */
  mileage_km: number | null;
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

/**
 * Ce qu'on affiche pour désigner une session. Une session sans nom se lit par
 * sa cause et sa date — « Prévention · 3 août » — ce qui, contrairement à un
 * « Session du 15 mars », dit encore quelque chose six mois plus tard.
 *
 * Jamais de libellé vide ni d'identifiant technique : une session doit rester
 * reconnaissable dans une liste.
 */
export function nomDeSession(
  session: Pick<
    Intervention,
    "title" | "cause" | "started_at" | "date_prevue" | "created_at"
  >
): string {
  const nom = session.title?.trim();
  if (nom) return nom;

  const cause = session.cause
    ? INTERVENTION_CAUSES[session.cause]
    : "Session d'atelier";
  const date = session.started_at ?? session.date_prevue ?? session.created_at;

  return `${cause} · ${new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  })}`;
}

/** Une session à venir dont la date prévue est dépassée. */
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
  /**
   * @deprecated Le relevé est passé sur la session. La colonne reste le temps
   * que l'ancien code cesse de tourner, elle n'est plus ni lue ni écrite.
   */
  mileage_km: number | null;
  created_at: string;
};
