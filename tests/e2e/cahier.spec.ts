import { expect, test } from "@playwright/test";

// Tests E2E — US#4 (Vélos) & US#5 (Cahier d'intervention)
// Scénario: Créer un vélo de test [US#4]
//   Étant donné que je suis connecté
//   Quand j'ajoute un vélo avec un nom et un prix d'achat
//   Alors le vélo apparaît dans ma liste
// Scénario: Ajouter une intervention au cahier [US#5]
//   Étant donné qu'un vélo existe
//   Quand j'ajoute une intervention avec un titre
//   Alors elle apparaît dans le cahier d'intervention
// Scénario: Modifier l'intervention [US#5]
//   Étant donné qu'une intervention existe
//   Quand je modifie son titre
//   Alors le nouveau titre apparaît dans le cahier
// Scénario: Supprimer l'intervention [US#5]
//   Étant donné qu'une intervention existe
//   Quand je la supprime et confirme
//   Alors le cahier n'affiche plus aucune intervention
// Scénario: Supprimer le vélo de test (nettoyage) [US#4]
//   Étant donné qu'un vélo de test existe
//   Quand je le supprime et confirme
//   Alors il n'apparaît plus dans ma liste
//
// Parcours complet : création d'un vélo de test, gestion du cahier
// d'intervention, puis nettoyage (suppression du vélo). Les données créées
// sont préfixées [TEST] et supprimées en fin de parcours — les données
// réelles ne sont jamais touchées. L'encart Analyse n'est jamais déclenché
// (appel API payant).
test.describe.configure({ mode: "serial" });

const bikeName = `[TEST] Vélo Playwright ${Date.now()}`;
const eventTitle = "[TEST] Plaquettes de frein";
const eventTitleEdited = "[TEST] Plaquettes de frein avant";

test("US#4 – Créer un vélo de test", async ({ page }) => {
  await page.goto("/bikes");
  await page.getByRole("link", { name: "Ajouter un vélo" }).click();
  await expect(page).toHaveURL(/\/bikes\/new/);

  await page.getByLabel("Nom *").fill(bikeName);
  await page.getByLabel("Prix d'achat (€) *").fill("100");
  await page.getByRole("button", { name: "Ajouter le vélo" }).click();

  await expect(page).toHaveURL(/\/bikes$/, { timeout: 15000 });
  await expect(page.getByText(bikeName)).toBeVisible();
});

test("US#5 – Ajouter une intervention au cahier", async ({ page }) => {
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

test("US#5 – Modifier l'intervention", async ({ page }) => {
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

test("US#5 – Supprimer l'intervention", async ({ page }) => {
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

test("US#4 – Supprimer le vélo de test (nettoyage)", async ({ page }) => {
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
