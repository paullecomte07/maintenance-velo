import { expect, type Locator, type Page } from "@playwright/test";

// Helpers partagés par les parcours. Chaque spec crée son propre vélo préfixé
// [TEST] et le supprime en fin de parcours : les données réelles ne sont
// jamais touchées.

export function testBikeName(suffix: string) {
  return `[TEST] ${suffix} ${Date.now()}`;
}

export async function createBike(
  page: Page,
  name: string,
  { mileageKm }: { mileageKm?: number } = {}
) {
  await page.goto("/bikes");
  await page.getByRole("link", { name: "Ajouter un vélo" }).click();

  await page.getByLabel("Nom *").fill(name);
  await page.getByLabel("Prix d'achat (€) *").fill("100");
  if (mileageKm !== undefined) {
    await page.getByLabel(/Kilométrage/).fill(String(mileageKm));
  }
  await page.getByRole("button", { name: "Ajouter le vélo" }).click();

  await expect(page).toHaveURL(/\/bikes$/, { timeout: 15000 });
  await expect(page.getByText(name)).toBeVisible();
}

export async function openBike(page: Page, name: string) {
  await page.goto("/bikes");
  await page.getByText(name).click();
  await expect(page).toHaveURL(/\/bikes\/[0-9a-f-]+$/);
}

/**
 * Déplie la fiche d'identité, où vivent désormais « Modifier » et
 * « Supprimer » : l'entête du vélo ne porte plus aucun bouton.
 */
export async function ouvrirFicheIdentite(page: Page) {
  await page.getByText("Fiche d'identité").click();
}

export async function deleteBike(page: Page, name: string) {
  await openBike(page, name);
  await ouvrirFicheIdentite(page);
  await page
    .getByRole("button", { name: "Supprimer", exact: true })
    .first()
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Supprimer définitivement" })
    .click();

  await expect(page).toHaveURL(/\/bikes$/, { timeout: 15000 });
  await expect(page.getByText(name)).toBeHidden();
}

export type PieceInput = {
  /** La pièce sur laquelle porte l'action. */
  titre: string;
  /** L'action : Inspection, Entretien, Réparation, Remise à neuf. */
  nature?: string;
  /** L'état dans lequel la pièce a été trouvée. */
  etat?: string;
  cout?: string;
  date?: string;
  /**
   * Système à choisir. Obligatoire dès que le titre n'appartient pas au
   * référentiel des organes — c'est le cas de tous nos titres préfixés
   * [TEST] — puisque le système ne peut alors pas être déduit.
   */
  systeme?: string;
};

/**
 * Choisit une puce dans le groupe nommé. Le passage par le groupe évite les
 * collisions de libellés entre deux référentiels d'un même écran.
 */
export async function pickChip(
  scope: Locator,
  groupe: string,
  valeur: string
) {
  await scope
    .getByRole("group", { name: groupe })
    .getByRole("button", { name: valeur, exact: true })
    .click();
}

/** Crée une session d'atelier planifiée depuis la fiche vélo. */
export async function planifierSession(
  page: Page,
  titre: string,
  { cause = "Prévention" }: { cause?: string } = {}
) {
  await page.getByRole("button", { name: "Planifier une session" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Nom de la session/).fill(titre);
  await pickChip(dialog, "Pourquoi tu passes à l'atelier ?", cause);
  await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 15000 });
}

/**
 * Choisit le système, que le formulaire l'affiche en puces (organe ambigu,
 * présent sur plusieurs systèmes) ou en liste déroulante (cas général).
 */
export async function pickSystem(page: Page, dialog: Locator, label: string) {
  const chip = dialog.getByRole("button", { name: label, exact: true });
  if ((await chip.count()) > 0) {
    await chip.click();
    return;
  }
  await dialog.getByRole("combobox", { name: "Système" }).click();
  await page.getByRole("option", { name: label, exact: true }).click();
}

/**
 * Remplit le formulaire de saisie, déjà ouvert, et valide.
 * L'action et l'état n'ont aucune valeur par défaut : il faut toujours les
 * choisir pour que l'enregistrement soit possible.
 */
export async function fillPiece(page: Page, piece: PieceInput) {
  const dialog = page.getByRole("dialog");

  await pickChip(
    dialog,
    "Qu'est-ce que tu as fait ?",
    piece.nature ?? "Entretien"
  );

  await dialog.getByLabel(/Sur quelle pièce/).fill(piece.titre);

  if (piece.systeme) {
    await pickSystem(page, dialog, piece.systeme);
  }

  await pickChip(
    dialog,
    "Dans quel état tu l'as trouvée ?",
    piece.etat ?? "Usure normale"
  );

  if (piece.date) await dialog.getByLabel("Date *").fill(piece.date);
  if (piece.cout) await dialog.getByLabel("Coût (€)").fill(piece.cout);

  await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 15000 });
}

/**
 * Ouvre le formulaire depuis la fiche d'une session — le seul endroit d'où
 * l'on saisit désormais : la fiche vélo ne propose plus d'ajouter une action.
 */
export async function addPiece(page: Page, piece: PieceInput) {
  await page.getByRole("button", { name: "Ajouter une action" }).click();
  await fillPiece(page, piece);
}

/**
 * Ouvre le menu ⋯ de la fiche d'une session et y choisit une entrée. Renommer
 * et supprimer n'y sont plus des boutons de premier niveau : seul le geste du
 * jour en est un.
 */
export async function choisirDansLeMenuSession(
  page: Page,
  entree: string | RegExp
) {
  await page.getByRole("button", { name: "Réglages de la session" }).click();
  await page.getByRole("menuitem", { name: entree }).click();
}

/** Ouvre la fiche d'une session depuis la liste de la fiche vélo. */
export async function ouvrirFicheSession(page: Page, title: string) {
  await page.getByRole("link").filter({ hasText: title }).first().click();
  await expect(page).toHaveURL(/\/interventions\/[0-9a-f-]+$/);
}

/**
 * Parcours complet d'une session : la planifier depuis la fiche vélo, l'ouvrir,
 * puis y saisir une première action — ce qui la fait passer « en cours ».
 * C'est devenu le seul chemin pour démarrer une session.
 */
export async function ouvrirSession(
  page: Page,
  titre: string,
  piece: PieceInput,
  { cause = "Prévention" }: { cause?: string } = {}
) {
  await planifierSession(page, titre, { cause });
  await ouvrirFicheSession(page, titre);
  await addPiece(page, piece);
}

/** Le groupe « En cours », « À venir » ou « Terminées » de la fiche vélo. */
export function group(page: Page, label: string) {
  return page.getByRole("region", { name: label });
}

export function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
