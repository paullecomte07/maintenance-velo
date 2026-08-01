// Référentiels fixes du cahier de changement de pièces (repris du fichier Excel de suivi).

export const BIKE_CATEGORIES = {
  route: "Route",
  vtt: "VTT",
  electrique: "Électrique",
  urbain: "Urbain",
} as const;

export type BikeCategory = keyof typeof BIKE_CATEGORIES;

// Taux de dépréciation annuel par défaut (%), selon la catégorie.
export const DEFAULT_DEPRECIATION_RATES: Record<BikeCategory, number> = {
  route: 12,
  vtt: 15,
  electrique: 20,
  urbain: 10,
};

export const BIKE_SYSTEMS = {
  cadre: "Cadre",
  direction: "Direction",
  transmission: "Transmission",
  roue_avant: "Roue avant",
  roue_arriere: "Roue arrière",
  freinage_avant: "Système de freinage avant",
  freinage_arriere: "Système de freinage arrière",
  assise: "Assise",
  equipement: "Équipement",
} as const;

export type BikeSystem = keyof typeof BIKE_SYSTEMS;

export const NATURE_CHANGEMENT_TYPES = {
  inspection: "Inspection",
  entretien: "Entretien",
  reparation: "Réparation",
  remise_a_neuf: "Remise à neuf",
} as const;

export type NatureChangementType = keyof typeof NATURE_CHANGEMENT_TYPES;

export const NATURE_CHANGEMENT_DESCRIPTIONS: Record<
  NatureChangementType,
  string
> = {
  inspection: "Vérification de l'état des pièces d'usure",
  entretien: "Changement de petites pièces d'usure, petits bricolages",
  reparation:
    "Changement d'une pièce (moins de 50 % de la valeur du module), réparation",
  remise_a_neuf:
    "Changement de tout le module, changement de 90 % des pièces, restauration totale",
};

export const CAUSE_TYPES = {
  usure_prematuree: "Usure prématurée",
  usure_normale: "Usure normale",
  accident: "Accident",
} as const;

export type CauseType = keyof typeof CAUSE_TYPES;

export const CAUSE_TYPE_DESCRIPTIONS: Record<CauseType, string> = {
  usure_prematuree: "L'élément à changer présente une usure anormale",
  usure_normale: "Durée de vie respectée",
  accident: "Casse due à un accident d'utilisation",
};

// Organes ("Référentiel des organes") par système — aide à la saisie du titre.
export const SYSTEM_PARTS: Record<BikeSystem, string[]> = {
  cadre: ["Cadre", "Fourche", "Pattes de dérailleur"],
  direction: [
    "Jeu de direction / roulements de direction",
    "Cintre / guidon",
    "Potence",
    "Poignées ou ruban de cintre",
  ],
  transmission: [
    "Manettes de vitesses",
    "Chaîne (usure à mesurer)",
    "Cassette / roue libre",
    "Plateaux / pédalier",
    "Dérailleur arrière",
    "Dérailleur avant (si présent)",
    "Galets de dérailleur",
    "Câbles et gaines de vitesses",
    "Boîtier de pédalier (roulements)",
  ],
  roue_avant: [
    "Jantes",
    "Rayons et écrous (tension)",
    "Moyeux et roulements",
    "Pneus",
    "Chambres à air",
    "Fond de jante",
    "Axes / blocages rapides",
  ],
  roue_arriere: [
    "Jantes",
    "Rayons et écrous (tension)",
    "Moyeux et roulements",
    "Pneus",
    "Chambres à air",
    "Fond de jante",
    "Axes / blocages rapides",
    "Corps de cassette",
  ],
  freinage_avant: [
    "Leviers de frein",
    "Plaquettes",
    "Disques de frein",
    "Durites hydrauliques",
    "Étriers",
    "Liquide de frein (systèmes hydrauliques)",
  ],
  freinage_arriere: [
    "Leviers de frein",
    "Plaquettes",
    "Disques de frein",
    "Durites hydrauliques",
    "Étriers",
    "Liquide de frein (systèmes hydrauliques)",
  ],
  assise: ["Selle", "Tige de selle", "Collier de selle"],
  equipement: [
    "Feu avant",
    "Feu arrière",
    "Sonnette",
    "Béquille",
    "Garde-boue",
    "Porte-bagages",
  ],
};

// Index inverse du référentiel : à partir du nom d'un organe, retrouver le ou
// les systèmes auxquels il appartient. Le référentiel ne servait jusqu'ici qu'à
// suggérer des titres une fois le système choisi ; l'utiliser dans ce sens-là
// supprime un champ à la saisie.
const partIndex = new Map<string, BikeSystem[]>();
for (const [system, parts] of Object.entries(SYSTEM_PARTS) as [
  BikeSystem,
  string[],
][]) {
  for (const part of parts) {
    partIndex.set(part, [...(partIndex.get(part) ?? []), system]);
  }
}

/** Tous les organes du référentiel, dédoublonnés, pour l'aide à la saisie. */
export const ALL_PARTS: string[] = Array.from(partIndex.keys()).sort((a, b) =>
  a.localeCompare(b, "fr")
);

/**
 * Les systèmes auxquels appartient un organe. Renvoie plusieurs candidats pour
 * les organes ambigus (« Plaquettes » existe à l'avant et à l'arrière) : on les
 * propose côte à côte plutôt que d'en deviner un, et un tableau vide pour un
 * titre libre hors référentiel.
 */
export function systemsForPart(part: string): BikeSystem[] {
  return partIndex.get(part.trim()) ?? [];
}
