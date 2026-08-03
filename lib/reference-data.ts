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

// Cause d'une session : *pourquoi* on passe à l'atelier. À ne pas confondre
// avec l'état constaté d'une pièce, qui répond à une autre question — voir la
// planche `parcours/03-cause-action-etat` du projet Claude Design.
export const INTERVENTION_CAUSES = {
  accident: "Accident",
  casse_usure: "Casse d'usure",
  dysfonctionnement: "Dysfonctionnement",
  prevention: "Prévention",
} as const;

export type InterventionCause = keyof typeof INTERVENTION_CAUSES;

export const INTERVENTION_CAUSE_DESCRIPTIONS: Record<InterventionCause, string> =
  {
    accident: "Casse due à un accident d'utilisation",
    casse_usure: "Une pièce a lâché en usage normal",
    dysfonctionnement: "Ça saute, ça grince, ça frotte — rien de cassé",
    prevention: "Entretien planifié, avant que ça pose problème",
  };

export const CAUSE_MANQUANTE = "Indique pourquoi tu passes à l'atelier.";

/**
 * La cause est **obligatoire à la saisie mais nullable en base** : l'historique
 * importé du fichier Excel n'en a pas, et lui en inventer une falsifierait
 * exactement la donnée que cette refonte corrige. La contrainte vit donc dans
 * les server actions, pas dans le schéma — d'où ce garde-fou partagé.
 */
export function parseInterventionCause(
  value: FormDataEntryValue | null
): InterventionCause | null {
  const cause = typeof value === "string" ? value.trim() : "";
  return cause in INTERVENTION_CAUSES ? (cause as InterventionCause) : null;
}

// État dans lequel la pièce a été trouvée au moment de l'action. C'est une
// **observation**, pas une intention : elle n'existe qu'une fois l'action
// faite, et ne se déduit jamais de la cause de l'intervention.
export const ETATS_CONSTATES = {
  neuf: "Neuf",
  usure_normale: "Usure normale",
  usure_prematuree: "Usure prématurée",
  hs: "HS",
} as const;

export type EtatConstate = keyof typeof ETATS_CONSTATES;

export const ETAT_CONSTATE_DESCRIPTIONS: Record<EtatConstate, string> = {
  neuf: "En parfait état, rien à signaler",
  usure_normale: "Durée de vie respectée",
  usure_prematuree: "Usure anormale au regard du kilométrage",
  hs: "Hors service : la pièce ne remplit plus son rôle",
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

// ---------------------------------------------------------------------------
// Nommer une session d'atelier
// ---------------------------------------------------------------------------

/**
 * Noms proposés à l'ouverture d'une session. Ils ne servent pas à gagner de la
 * frappe mais à **montrer la bonne altitude** : au test du 3 août, l'utilisateur
 * a nommé sa session « Changer ma chaîne », c'est-à-dire du nom de l'action
 * qu'il allait saisir juste après. Une page blanche ne dit rien de ce qu'on
 * attend ; cinq exemples le disent sans un mot d'explication.
 */
export const NOMS_SESSION_SUGGERES = [
  "Révision de printemps",
  "Entretien annuel",
  "Remise en état",
  "Après une chute",
  "Préparation de sortie",
] as const;

/** Minuscules sans accents : les deux côtés de la comparaison y passent. */
function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Forme de comparaison d'un mot : normalisé, et sans sa marque de pluriel. */
function racine(mot: string): string {
  return normaliser(mot).replace(/[sx]$/, "");
}

/**
 * Mots du référentiel des organes trop courants pour signaler une pièce à eux
 * seuls. « Feu avant » et « Porte-bagages » livrent « avant » et « porte », qui
 * apparaissent dans quantité de noms parfaitement légitimes.
 */
const MOTS_TROP_COURANTS = new Set([
  "avant",
  "arriere",
  "garde",
  "porte",
  "libre",
  "usure",
  "mesurer",
  "present",
  "systeme",
  "hydraulique",
  "rapide",
]);

/**
 * Les mots qui désignent une pièce, tirés du référentiel des organes. Cinq
 * lettres minimum : en dessous, on attrape surtout des articles.
 */
const RACINES_DE_PIECE = new Set<string>();
for (const part of ALL_PARTS) {
  for (const mot of normaliser(part).split(/[^a-z]+/)) {
    if (mot.length < 5) continue;
    const r = racine(mot);
    if (!MOTS_TROP_COURANTS.has(r)) RACINES_DE_PIECE.add(r);
  }
}

/**
 * Verbes qui décrivent un geste sur une pièce. Volontairement restreint aux
 * formes sans ambiguïté : « réparer » et « réparation » en sont absents, parce
 * qu'ils nomment aussi un type d'action du référentiel et qu'une session
 * « Réparation suite à chute » est un nom parfaitement correct.
 */
const RACINES_DE_GESTE = new Set(
  [
    "changer",
    "change",
    "changement",
    "remplacer",
    "remplace",
    "remplacement",
    "demonter",
    "demonte",
    "remonter",
    "remonte",
    "graisser",
    "nettoyer",
    "nettoye",
    "purger",
    "regler",
    "reglage",
  ].map(racine)
);

export type IndiceDeGeste = {
  /** Ce qui a été reconnu : une pièce du référentiel, ou un verbe de geste. */
  type: "piece" | "verbe";
  /** Le mot tel que l'utilisateur l'a écrit, pour le lui citer. */
  mot: string;
};

/**
 * Reconnaît un nom de session qui décrit en réalité une action — « Changer ma
 * chaîne » plutôt que « Révision de printemps ». Sert à **informer**, jamais à
 * refuser : quelqu'un peut légitimement appeler sa session « Chaîne et
 * cassette ».
 *
 * La pièce l'emporte sur le verbe : elle permet un message plus précis.
 */
export function detecterNomDAction(nom: string): IndiceDeGeste | null {
  // Pas de `\p{L}` : le drapeau `u` demande une cible ES6, que le projet ne
  // vise pas. La plage latine couvre le vocabulaire du cycle.
  const mots = nom.split(/[^A-Za-zÀ-ɏ]+/).filter(Boolean);

  for (const mot of mots) {
    if (RACINES_DE_PIECE.has(racine(mot))) return { type: "piece", mot };
  }
  for (const mot of mots) {
    if (RACINES_DE_GESTE.has(racine(mot))) return { type: "verbe", mot };
  }
  return null;
}
