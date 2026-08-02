import { expect, type Locator, type Page } from "@playwright/test";

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
  /** La pièce sur laquelle porte l'action. */
  titre: string;
  /** L'action : Inspection, Entretien, Réparation, Remise à neuf. */
  nature?: string;
  /** L'état dans lequel la pièce a été trouvée. */
  etat?: string;
  cout?: string;
  date?: string;
  /** Nom du chantier à ouvrir, quand aucun n'est en cours. */
  nouveauChantier?: string;
  /**
   * Cause du chantier ouvert. N'a de sens qu'avec `nouveauChantier` : la cause
   * vaut pour toute l'intervention et n'est demandée qu'à son ouverture.
   */
  causeChantier?: string;
  /**
   * Système à choisir. Obligatoire dès que le titre n'appartient pas au
   * référentiel des organes — c'est le cas de tous nos titres préfixés
   * [TEST] — puisque le système ne peut alors pas être déduit.
   */
  systeme?: string;
};

/**
 * Choisit une puce dans le groupe nommé. Le passage par le groupe n'est pas
 * décoratif : « Accident » est proposé aussi bien comme cause d'un chantier que
 * comme cause d'une pièce, dans le même formulaire.
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

/** Crée une intervention planifiée depuis la fiche vélo. */
export async function planifierIntervention(
  page: Page,
  titre: string,
  { cause = "Prévention" }: { cause?: string } = {}
) {
  await page.getByRole("button", { name: "Planifier une intervention" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Nom de l.intervention/).fill(titre);
  await pickChip(dialog, "Pourquoi ce chantier ?", cause);
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

  await pickChip(dialog, "Qu'est-ce que tu as fait ?", piece.nature ?? "Entretien");

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
  if (piece.nouveauChantier) {
    await dialog
      .getByLabel(/Tu démarres un nouveau chantier/)
      .fill(piece.nouveauChantier);
    // Obligatoire à l'ouverture d'un chantier : le bouton reste inactif sans.
    await pickChip(
      dialog,
      "Pourquoi ce chantier ?",
      piece.causeChantier ?? "Prévention"
    );
  }

  await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 15000 });
}

/** Ouvre le formulaire depuis la fiche vélo ou la fiche d'un chantier. */
export async function addPiece(page: Page, piece: PieceInput) {
  await page.getByRole("button", { name: "Ajouter une action" }).click();
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
