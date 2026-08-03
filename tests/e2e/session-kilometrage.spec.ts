import { expect, test } from "@playwright/test";

import {
  addPiece,
  cloturerSession,
  createBike,
  deleteBike,
  openBike,
  ouvrirFicheIdentite,
  ouvrirFicheSession,
  planifierSession,
  testBikeName,
} from "./support";

// Tests E2E — US#44 (Relever le kilométrage une fois par passage à l'atelier)
// Scénario: La saisie d'une action ne parle plus de kilométrage [US#44]
//   Étant donné qu'un chantier est en cours sur mon vélo
//   Quand j'ouvre la saisie d'une action
//   Alors aucun champ ne me demande de kilométrage
// Scénario: Démarrer un chantier demande le compteur du vélo [US#44]
//   Étant donné un chantier à venir sur mon vélo
//   Quand je le démarre
//   Alors on me demande le kilométrage du vélo au compteur
//   Et le champ est pré-rempli avec le dernier relevé connu
// Scénario: Démarrer un chantier sans connaître son kilométrage [US#44]
//   Étant donné un chantier à venir sur mon vélo
//   Quand je le démarre en laissant le kilométrage vide
//   Alors le chantier démarre sans erreur
//   Et sa fiche indique "Kilométrage non relevé"
// Scénario: Compléter le relevé après coup [US#44]
//   Étant donné un chantier en cours sans kilométrage relevé
//   Quand je saisis un kilométrage depuis sa fiche
//   Alors sa fiche affiche ce kilométrage
// Scénario: Le vélo retient le dernier relevé [US#44]
//   Étant donné un vélo dont le dernier relevé connu est 4 000 km
//   Quand je démarre un chantier en relevant 5 400 km
//   Alors la fiche d'identité du vélo affiche 5 400 km
// Scénario: Un relevé plus bas n'abaisse pas le compteur du vélo [US#44]
//   Étant donné un vélo dont le dernier relevé connu est 5 400 km
//   Quand je démarre un chantier en relevant 200 km
//   Alors le chantier enregistre 200 km
//   Et la fiche d'identité du vélo affiche toujours 5 400 km
//
// Parcours en série sur un vélo de test préfixé [TEST], supprimé à la fin.
test.describe.configure({ mode: "serial" });

const bikeName = testBikeName("Kilométrage");
const sansReleve = "[TEST] Session sans relevé";
const avecReleve = "[TEST] Session relevée";
const compteurRemplace = "[TEST] Session compteur remplacé";

const champKm = "Kilométrage du vélo au compteur";

test("US#4 – Créer un vélo de test (kilométrage)", async ({ page }) => {
  await createBike(page, bikeName);
});

test("US#44 – Démarrer un chantier sans connaître son kilométrage", async ({
  page,
}) => {
  await openBike(page, bikeName);
  await planifierSession(page, sansReleve);
  await ouvrirFicheSession(page, sansReleve);

  await page.getByRole("button", { name: "Démarrer cette session" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(champKm).fill("");
  await dialog.getByRole("button", { name: "Démarrer" }).click();
  await expect(dialog).toBeHidden({ timeout: 15000 });

  await expect(page.getByText("Kilométrage non relevé")).toBeVisible();
});

test("US#44 – La saisie d'une action ne parle plus de kilométrage", async ({
  page,
}) => {
  await openBike(page, bikeName);
  await ouvrirFicheSession(page, sansReleve);

  await page.getByRole("button", { name: "Ajouter une action" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel(/[Kk]ilométrage/)).toHaveCount(0);

  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();
});

test("US#44 – Compléter le relevé après coup", async ({ page }) => {
  await openBike(page, bikeName);
  await ouvrirFicheSession(page, sansReleve);

  await page.getByRole("button", { name: "Relever" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(champKm).fill("4000");
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(dialog).toBeHidden({ timeout: 15000 });

  await expect(page.getByText(/4\s?000 km au compteur/)).toBeVisible();
  await expect(page.getByText("Kilométrage non relevé")).toBeHidden();

  // Une action y reste enregistrable, et sa ligne ne porte aucun kilométrage.
  await addPiece(page, {
    titre: "[TEST] Chaîne",
    systeme: "Transmission",
    cout: "30",
  });
  await expect(
    page.getByTestId("action").filter({ hasText: "[TEST] Chaîne" })
  ).not.toContainText("km");

  // Une session ouverte à la fois : celle-ci doit être clôturée avant la suite.
  await cloturerSession(page);
});

test("US#44 – Démarrer un chantier demande le compteur du vélo", async ({
  page,
}) => {
  await openBike(page, bikeName);
  await planifierSession(page, avecReleve);
  await ouvrirFicheSession(page, avecReleve);

  await page.getByRole("button", { name: "Démarrer cette session" }).click();
  const dialog = page.getByRole("dialog");

  // Le libellé dit « du vélo » : c'est toute l'ambiguïté que ce champ traînait
  // quand il vivait au milieu des questions portant sur la pièce.
  const champ = dialog.getByLabel(champKm);
  await expect(champ).toBeVisible();
  await expect(champ).toHaveValue("4000");

  await champ.fill("5400");
  await dialog.getByRole("button", { name: "Démarrer" }).click();
  await expect(dialog).toBeHidden({ timeout: 15000 });

  await expect(page.getByText(/5\s?400 km au compteur/)).toBeVisible();
});

test("US#44 – Le vélo retient le dernier relevé", async ({ page }) => {
  await openBike(page, bikeName);
  await ouvrirFicheIdentite(page);

  await expect(page.getByText(/5\s?400 km/)).toBeVisible();
});

test("US#44 – Un relevé plus bas n'abaisse pas le compteur du vélo", async ({
  page,
}) => {
  await openBike(page, bikeName);
  await ouvrirFicheSession(page, avecReleve);
  await cloturerSession(page);

  // Compteur remplacé : le relevé repart de zéro, l'historique parcouru non.
  await openBike(page, bikeName);
  await planifierSession(page, compteurRemplace);
  await ouvrirFicheSession(page, compteurRemplace);

  await page.getByRole("button", { name: "Démarrer cette session" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(champKm).fill("200");
  await dialog.getByRole("button", { name: "Démarrer" }).click();
  await expect(dialog).toBeHidden({ timeout: 15000 });

  await expect(page.getByText("200 km au compteur")).toBeVisible();

  await openBike(page, bikeName);
  await ouvrirFicheIdentite(page);
  await expect(page.getByText(/5\s?400 km/)).toBeVisible();
});

test("US#4 – Supprimer le vélo de test (kilométrage)", async ({ page }) => {
  await deleteBike(page, bikeName);
});
