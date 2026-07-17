// Référentiels fixes du cahier d'intervention (repris du fichier Excel de suivi).

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

export const INTERVENTION_TYPES = {
  inspection: "Inspection",
  entretien: "Entretien",
  reparation: "Réparation",
  remise_a_neuf: "Remise à neuf",
} as const;

export type InterventionType = keyof typeof INTERVENTION_TYPES;

export const INTERVENTION_TYPE_DESCRIPTIONS: Record<InterventionType, string> =
  {
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
