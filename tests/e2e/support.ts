import { expect, type Page } from "@playwright/test";

// Helpers partagés par les parcours US#23 / US#24 / US#25. Chaque spec crée son
// propre vélo préfixé [TEST] et le supprime en fin de parcours : les données
// réelles ne sont jamais touchées.

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

export async function deleteBike(page: Page, name: string) {
  await openBike(page, name);
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
  titre: string;
  nature?: string;
  cause?: string;
  cout?: string;
  date?: string;
  /** Nom du chantier à ouvrir, quand aucun n'est en cours. */
  nouveauChantier?: string;
  /** Système à préciser quand la pièce existe sur plusieurs systèmes. */
  systeme?: string;
};

/**
 * Remplit le formulaire de saisie rapide, déjà ouvert, et valide.
 * Nature et cause n'ont aucune valeur par défaut : il faut toujours les
 * choisir pour que l'enregistrement soit possible.
 */
export async function fillPiece(page: Page, piece: PieceInput) {
  const dialog = page.getByRole("dialog");

  await dialog.getByLabel(/Qu.est-ce que tu as changé/).fill(piece.titre);

  if (piece.systeme) {
    await dialog.getByRole("button", { name: piece.systeme }).click();
  }

  await dialog
    .getByRole("button", { name: piece.nature ?? "Entretien", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: piece.cause ?? "Usure normale", exact: true })
    .click();

  if (piece.date) await dialog.getByLabel("Date *").fill(piece.date);
  if (piece.cout) await dialog.getByLabel("Coût (€)").fill(piece.cout);
  if (piece.nouveauChantier) {
    await dialog
      .getByLabel(/Tu démarres un nouveau chantier/)
      .fill(piece.nouveauChantier);
  }

  await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 15000 });
}

/** Ouvre le formulaire depuis la fiche vélo ou la fiche d'un chantier. */
export async function addPiece(page: Page, piece: PieceInput) {
  await page.getByRole("button", { name: "Ajouter une pièce" }).click();
  await fillPiece(page, piece);
}

/** Ouvre la fiche d'une intervention depuis la liste de la fiche vélo. */
export async function openIntervention(page: Page, title: string) {
  await page.getByRole("link").filter({ hasText: title }).first().click();
  await expect(page).toHaveURL(/\/interventions\/[0-9a-f-]+$/);
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
