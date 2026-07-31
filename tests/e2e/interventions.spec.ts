import { expect, test, type Locator, type Page } from "@playwright/test";

// Tests E2E — US#20 (Regroupement des changements de pièces en interventions)
// Scénario: Créer une intervention avec plusieurs changements de pièces [US#20]
//   Étant donné que je suis sur la page d'un vélo
//   Quand je crée une nouvelle intervention "Révision de printemps" datée du jour
//   Et que j'ajoute deux changements de pièces rattachés à cette intervention
//   Alors l'intervention "Révision de printemps" liste bien ces deux changements
//   Et son coût total affiché est la somme des coûts des deux changements
// Scénario: Ajouter un changement de pièce depuis la fiche d'une intervention [US#20]
//   Étant donné que je suis sur la fiche d'une intervention existante
//   Quand j'ajoute un nouveau changement de pièce depuis cette fiche
//   Alors ce changement apparaît dans la liste des changements rattachés
//   Et le coût total de l'intervention est mis à jour en conséquence
// Scénario: Impossible de créer un changement de pièce sans intervention [US#20]
//   Étant donné que je suis sur le formulaire d'ajout d'un changement de pièce
//   Quand je ne sélectionne ni ne crée d'intervention
//   Alors le formulaire refuse l'enregistrement
//   Et un message m'indique qu'une intervention est requise
// Scénario: Le libellé "Nature du changement" remplace "Intervention" [US#20]
//   Étant donné que je suis sur le formulaire d'ajout d'un changement de pièce
//   Quand j'affiche le formulaire
//   Alors le champ précédemment nommé "Intervention" s'appelle "Nature du changement"
// Scénario: Le cahier de changement de pièces affiche l'intervention rattachée [US#20]
//   Étant donné qu'un changement est rattaché à une intervention "Révision de printemps"
//   Quand je consulte le cahier de changement de pièces du vélo
//   Alors la ligne de ce changement affiche un lien vers cette intervention
//
// Le scénario de migration de l'historique (bascule vers une intervention
// « Historique initial ») n'est pas couvert ici : cette migration de données
// est traitée séparément.
//
// Parcours complet sur un vélo de test préfixé [TEST], supprimé en fin de
// parcours — les données réelles ne sont jamais touchées.
test.describe.configure({ mode: "serial" });

const bikeName = `[TEST] Vélo interventions ${Date.now()}`;
const interventionName = "[TEST] Révision de printemps";
const firstChange = "[TEST] Chaîne";
const secondChange = "[TEST] Cassette";
const thirdChange = "[TEST] Plaquettes de frein";

// Le Select shadcn/Radix n'est pas relié à son Label : on le cible par le
// texte affiché sur son déclencheur, et les options sont rendues en portail
// (donc hors du dialog).
async function pickIntervention(page: Page, dialog: Locator, option: string) {
  await dialog
    .getByRole("combobox")
    .filter({ hasText: "Sélectionner une intervention" })
    .click();
  await page.getByRole("option", { name: option }).click();
}

async function openBike(page: Page) {
  await page.goto("/bikes");
  await page.getByText(bikeName).click();
  await expect(page).toHaveURL(/\/bikes\/[0-9a-f-]+$/);
}

test("US#4 – Créer un vélo de test (interventions)", async ({ page }) => {
  await page.goto("/bikes");
  await page.getByRole("link", { name: "Ajouter un vélo" }).click();

  await page.getByLabel("Nom *").fill(bikeName);
  await page.getByLabel("Prix d'achat (€) *").fill("100");
  await page.getByRole("button", { name: "Ajouter le vélo" }).click();

  await expect(page).toHaveURL(/\/bikes$/, { timeout: 15000 });
  await expect(page.getByText(bikeName)).toBeVisible();
});

test("US#20 – Impossible de créer un changement de pièce sans intervention", async ({
  page,
}) => {
  await openBike(page);

  await page.getByRole("button", { name: "Ajouter un changement" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Titre *").fill("[TEST] Sans intervention");
  await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();

  await expect(
    dialog.getByText("Sélectionne une intervention de rattachement.")
  ).toBeVisible({ timeout: 15000 });
});

test("US#20 – Le libellé Nature du changement remplace Intervention", async ({
  page,
}) => {
  await openBike(page);

  await page.getByRole("button", { name: "Ajouter un changement" }).click();
  const dialog = page.getByRole("dialog");

  await expect(dialog.getByText("Nature du changement *")).toBeVisible();
  await expect(dialog.getByText("Type d'intervention *")).toBeHidden();
});

test("US#20 – Créer une intervention avec plusieurs changements de pièces", async ({
  page,
}) => {
  await openBike(page);

  // Premier changement : l'intervention est créée à la volée.
  await page.getByRole("button", { name: "Ajouter un changement" }).click();
  let dialog = page.getByRole("dialog");
  await pickIntervention(page, dialog, "Créer une nouvelle intervention");
  await dialog.getByLabel("Nom de la nouvelle intervention *").fill(interventionName);
  await dialog.getByLabel("Titre *").fill(firstChange);
  await dialog.getByLabel("Coût (€)").fill("30");
  await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();

  await expect(
    page.getByRole("row").filter({ hasText: firstChange })
  ).toBeVisible({ timeout: 15000 });

  // Second changement : rattaché à l'intervention existante.
  await page.getByRole("button", { name: "Ajouter un changement" }).click();
  dialog = page.getByRole("dialog");
  await pickIntervention(page, dialog, interventionName);
  await dialog.getByLabel("Titre *").fill(secondChange);
  await dialog.getByLabel("Coût (€)").fill("20");
  await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();

  await expect(
    page.getByRole("row").filter({ hasText: secondChange })
  ).toBeVisible({ timeout: 15000 });

  // La page des interventions agrège les deux changements et leur coût.
  await page.getByRole("link", { name: "Interventions" }).click();
  await expect(page).toHaveURL(/\/interventions$/);

  const row = page.getByRole("row").filter({ hasText: interventionName });
  await expect(row).toContainText("2");
  await expect(row).toContainText(/50,00/);
});

test("US#20 – Le cahier de changement de pièces affiche l'intervention rattachée", async ({
  page,
}) => {
  await openBike(page);

  const row = page.getByRole("row").filter({ hasText: firstChange });
  await expect(row.getByRole("link", { name: interventionName })).toBeVisible();
});

test("US#20 – Ajouter un changement de pièce depuis la fiche d'une intervention", async ({
  page,
}) => {
  await openBike(page);
  await page.getByRole("link", { name: "Interventions" }).click();
  await expect(page).toHaveURL(/\/interventions$/);

  await page.getByRole("link", { name: interventionName }).click();
  await expect(page).toHaveURL(/\/interventions\/[0-9a-f-]+$/);

  await page.getByRole("button", { name: "Ajouter un changement" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Titre *").fill(thirdChange);
  await dialog.getByLabel("Coût (€)").fill("15");
  await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();

  await expect(
    page.getByRole("row").filter({ hasText: thirdChange })
  ).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/Coût total/)).toContainText(/65,00/);
});

test("US#4 – Supprimer le vélo de test des interventions (nettoyage)", async ({
  page,
}) => {
  await openBike(page);

  // Les lignes du cahier portent aussi un bouton « Supprimer » : celui de
  // l'en-tête (suppression du vélo) est le premier de la page.
  await page
    .getByRole("button", { name: "Supprimer", exact: true })
    .first()
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Supprimer définitivement" })
    .click();

  await expect(page).toHaveURL(/\/bikes$/, { timeout: 15000 });
  await expect(page.getByText(bikeName)).toBeHidden();
});
