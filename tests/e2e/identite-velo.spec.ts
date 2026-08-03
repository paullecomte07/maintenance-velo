import { expect, test } from "@playwright/test";

import {
  createBike,
  deleteBike,
  openBike,
  ouvrirFicheIdentite,
  testBikeName,
} from "./support";

// Tests E2E — US#45 (Enregistrer un vélo en ne saisissant que ce qu'on a sous les yeux)
// Scénario: La création ne demande ni décote ni kilométrage [US#45]
//   Étant donné que je crée un nouveau vélo
//   Quand j'ouvre le formulaire
//   Alors aucun champ ne me demande le taux de dépréciation
//   Et aucun champ ne me demande le kilométrage
// Scénario: Le taux par défaut s'applique tout seul [US#45]
//   Étant donné que je crée un vélo de catégorie "VTT"
//   Quand je l'enregistre
//   Alors sa fiche d'identité affiche une dépréciation annuelle de 15 %
// Scénario: Corriger le taux après coup [US#45]
//   Étant donné un vélo dont la dépréciation annuelle est de 15 %
//   Quand je la passe à 20 % depuis "Modifier le vélo"
//   Alors sa fiche d'identité affiche une dépréciation annuelle de 20 %
// Scénario: Noter le numéro de série et le marquage [US#45]
//   Étant donné que je crée un nouveau vélo
//   Quand je renseigne son numéro de série et son numéro d'identification
//   Alors sa fiche d'identité affiche les deux numéros
// Scénario: Les deux numéros restent facultatifs [US#45]
//   Étant donné que je crée un nouveau vélo
//   Quand je l'enregistre sans numéro de série ni numéro d'identification
//   Alors le vélo est enregistré
//   Et sa fiche d'identité affiche "—" pour ces deux numéros
//
// Parcours en série sur des vélos de test préfixés [TEST], supprimés à la fin.
test.describe.configure({ mode: "serial" });

const bikeNu = testBikeName("Identité nue");
const bikeNumerote = testBikeName("Identité numérotée");

const serie = "WTU123K4567";
const bicycode = "FR1234567890";

test("US#45 – La création ne demande ni décote ni kilométrage", async ({
  page,
}) => {
  await page.goto("/bikes");
  await page.getByRole("link", { name: "Ajouter un vélo" }).click();

  await expect(page.getByLabel(/Dépréciation annuelle/)).toHaveCount(0);
  await expect(page.getByLabel(/[Kk]ilométrage/)).toHaveCount(0);

  // À la place, les deux numéros qu'on ne retrouve nulle part ailleurs.
  await expect(page.getByLabel("Numéro de série")).toBeVisible();
  await expect(
    page.getByLabel(/Numéro d.identification/)
  ).toBeVisible();
});

test("US#45 – Les deux numéros restent facultatifs", async ({ page }) => {
  await createBike(page, bikeNu);
  await openBike(page, bikeNu);
  await ouvrirFicheIdentite(page);

  const identite = page.getByRole("definition");
  await expect(identite.filter({ hasText: "—" }).first()).toBeVisible();
  await expect(page.getByText("Numéro de série")).toBeVisible();
  await expect(page.getByText("Numéro d'identification")).toBeVisible();
});

test("US#45 – Le taux par défaut s'applique tout seul", async ({ page }) => {
  await openBike(page, bikeNu);
  await ouvrirFicheIdentite(page);

  // Rien n'a été demandé à la création : c'est le défaut de la catégorie VTT.
  await expect(page.getByText("15 %")).toBeVisible();
});

test("US#45 – Corriger le taux après coup", async ({ page }) => {
  await openBike(page, bikeNu);
  await ouvrirFicheIdentite(page);
  await page.getByRole("link", { name: "Modifier" }).click();

  const taux = page.getByLabel(/Dépréciation annuelle/);
  await expect(taux).toHaveValue("15");
  await taux.fill("20");
  await page.getByRole("button", { name: "Enregistrer" }).click();

  await expect(page).toHaveURL(/\/bikes\/[0-9a-f-]+$/, { timeout: 15000 });
  await ouvrirFicheIdentite(page);
  await expect(page.getByText("20 %")).toBeVisible();
});

test("US#45 – Noter le numéro de série et le marquage", async ({ page }) => {
  await page.goto("/bikes");
  await page.getByRole("link", { name: "Ajouter un vélo" }).click();

  await page.getByLabel("Nom *").fill(bikeNumerote);
  await page.getByLabel("Prix d'achat (€) *").fill("100");
  await page.getByLabel("Numéro de série").fill(serie);
  await page.getByLabel(/Numéro d.identification/).fill(bicycode);
  await page.getByRole("button", { name: "Ajouter le vélo" }).click();
  await expect(page).toHaveURL(/\/bikes$/, { timeout: 15000 });

  await openBike(page, bikeNumerote);
  await ouvrirFicheIdentite(page);
  await expect(page.getByText(serie)).toBeVisible();
  await expect(page.getByText(bicycode)).toBeVisible();
});

test("US#4 – Supprimer les vélos de test (identité)", async ({ page }) => {
  await deleteBike(page, bikeNumerote);
  await deleteBike(page, bikeNu);
});
