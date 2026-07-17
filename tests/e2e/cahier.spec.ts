import { expect, test } from "@playwright/test";

// Parcours complet : création d'un vélo de test, gestion du cahier
// d'intervention, puis nettoyage (suppression du vélo). Les données créées
// sont préfixées [TEST] et supprimées en fin de parcours — les données
// réelles ne sont jamais touchées. L'encart Analyse n'est jamais déclenché
// (appel API payant).
test.describe.configure({ mode: "serial" });

const bikeName = `[TEST] Vélo Playwright ${Date.now()}`;
const eventTitle = "[TEST] Plaquettes de frein";
const eventTitleEdited = "[TEST] Plaquettes de frein avant";

test("créer un vélo de test", async ({ page }) => {
  await page.goto("/bikes");
  await page.getByRole("link", { name: "Ajouter un vélo" }).click();
  await expect(page).toHaveURL(/\/bikes\/new/);

  await page.getByLabel("Nom *").fill(bikeName);
  await page.getByLabel("Prix d'achat (€) *").fill("100");
  await page.getByRole("button", { name: "Ajouter le vélo" }).click();

  await expect(page).toHaveURL(/\/bikes$/, { timeout: 15000 });
  await expect(page.getByText(bikeName)).toBeVisible();
});

test("ajouter une intervention au cahier", async ({ page }) => {
  await page.goto("/bikes");
  await page.getByText(bikeName).click();
  await expect(page).toHaveURL(/\/bikes\/[0-9a-f-]+$/);

  await page.getByRole("button", { name: "Ajouter une intervention" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Titre *").fill(eventTitle);
  await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();

  await expect(
    page.getByRole("row").filter({ hasText: eventTitle })
  ).toBeVisible({ timeout: 15000 });
});

test("modifier l'intervention", async ({ page }) => {
  await page.goto("/bikes");
  await page.getByText(bikeName).click();

  await page
    .getByRole("row")
    .filter({ hasText: eventTitle })
    .getByRole("button", { name: "Modifier" })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Titre *").fill(eventTitleEdited);
  await dialog.getByRole("button", { name: "Enregistrer" }).click();

  await expect(
    page.getByRole("row").filter({ hasText: eventTitleEdited })
  ).toBeVisible({ timeout: 15000 });
});

test("supprimer l'intervention", async ({ page }) => {
  await page.goto("/bikes");
  await page.getByText(bikeName).click();

  await page
    .getByRole("row")
    .filter({ hasText: eventTitleEdited })
    .getByRole("button", { name: "Supprimer" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Supprimer", exact: true })
    .click();

  await expect(
    page.getByText("Aucune intervention enregistrée pour ce vélo.")
  ).toBeVisible({ timeout: 15000 });
});

test("supprimer le vélo de test (nettoyage)", async ({ page }) => {
  await page.goto("/bikes");
  await page.getByText(bikeName).click();
  await expect(page).toHaveURL(/\/bikes\/[0-9a-f-]+$/);

  await page.getByRole("button", { name: "Supprimer", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Supprimer définitivement" })
    .click();

  await expect(page).toHaveURL(/\/bikes$/, { timeout: 15000 });
  await expect(page.getByText(bikeName)).toBeHidden();
});
