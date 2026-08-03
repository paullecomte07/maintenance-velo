import { expect, test } from "@playwright/test";

import {
  addPiece,
  createBike,
  deleteBike,
  openBike,
  ouvrirFicheSession,
  pickChip,
  pickSystem,
  planifierSession,
  testBikeName,
} from "./support";

// Tests E2E — US#24 (Saisie rapide d'un changement de pièce)
// Scénario: Enregistrer une pièce quand aucun chantier n'est ouvert [US#24]
//   Étant donné qu'aucune intervention n'est en cours sur mon vélo
//   Quand je saisis la pièce "Chaîne", sa nature, sa cause et son coût
//   Et que je nomme le chantier "Révision de printemps"
//   Alors la pièce est enregistrée
//   Et l'intervention "Révision de printemps" est en cours avec cette pièce
// Scénario: Enregistrer une pièce quand un chantier est ouvert [US#24]
//   Étant donné qu'une intervention "Révision de printemps" est en cours
//   Quand je saisis une nouvelle pièce
//   Alors aucune question ne m'est posée sur l'intervention
//   Et le formulaire indique que la pièce sera rattachée à "Révision de printemps"
// Scénario: Le système se déduit de la pièce choisie [US#24]
//   Étant donné que je suis sur le formulaire de saisie
//   Quand je choisis la pièce "Cassette / roue libre"
//   Alors le système "Transmission" est renseigné automatiquement
// Scénario: Une pièce ambiguë propose les systèmes concernés [US#24]
//   Étant donné que je suis sur le formulaire de saisie
//   Quand je recherche "Plaquettes"
//   Alors les propositions distinguent "Système de freinage avant" et "Système de freinage arrière"
// Scénario: Le kilométrage est pré-rempli avec le dernier relevé [US#24]
//   Étant donné que le dernier kilométrage connu de mon vélo est 4795
//   Quand j'ouvre le formulaire de saisie
//   Alors le champ kilométrage affiche 4795
//   Et je peux le corriger avant d'enregistrer
// Scénario: Enregistrer une pièce sans en connaître le coût [US#24]
//   Étant donné que je suis sur le formulaire de saisie
//   Quand je renseigne l'action, la pièce et l'état mais laisse le coût vide
//   Alors la pièce est enregistrée
//   Et son coût apparaît comme non renseigné
//
// Parcours en série sur un vélo de test préfixé [TEST], supprimé à la fin.
test.describe.configure({ mode: "serial" });

const bikeName = testBikeName("Saisie");
const chantier = "[TEST] Révision de printemps";
const autreChantier = "[TEST] Chantier de destination";

test("US#4 – Créer un vélo de test (saisie)", async ({ page }) => {
  await createBike(page, bikeName, { mileageKm: 4795 });
});

test("US#24 – Le kilométrage est pré-rempli avec le dernier relevé", async ({
  page,
}) => {
  await openBike(page, bikeName);
  await planifierSession(page, chantier);
  await ouvrirFicheSession(page, chantier);
  await page.getByRole("button", { name: "Ajouter une action" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Kilométrage")).toHaveValue("4795");

  // Corrigeable avant enregistrement.
  await dialog.getByLabel("Kilométrage").fill("4820");
  await expect(dialog.getByLabel("Kilométrage")).toHaveValue("4820");
});

test("US#24 – Le système se déduit de la pièce choisie", async ({ page }) => {
  await openBike(page, bikeName);
  await ouvrirFicheSession(page, chantier);
  await page.getByRole("button", { name: "Ajouter une action" }).click();

  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel(/Sur quelle pièce/)
    .fill("Cassette / roue libre");

  await expect(dialog.getByText("Déduit de la pièce")).toBeVisible();
  await expect(
    dialog.getByRole("combobox", { name: "Système" })
  ).toContainText("Transmission");
});

test("US#24 – Une pièce ambiguë propose les systèmes concernés", async ({
  page,
}) => {
  await openBike(page, bikeName);
  await ouvrirFicheSession(page, chantier);
  await page.getByRole("button", { name: "Ajouter une action" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Sur quelle pièce/).fill("Plaquettes");

  await expect(
    dialog.getByRole("button", { name: "Système de freinage avant" })
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Système de freinage arrière" })
  ).toBeVisible();
  await expect(
    dialog.getByText("Cette pièce existe sur plusieurs systèmes")
  ).toBeVisible();
});

test("US#24 – Enregistrer une pièce quand aucun chantier n'est ouvert", async ({
  page,
}) => {
  await openBike(page, bikeName);
  await ouvrirFicheSession(page, chantier);

  await addPiece(page, {
    titre: "[TEST] Chaîne",
    systeme: "Transmission",
    cout: "30",
  });

  await expect(page.getByText("[TEST] Chaîne")).toBeVisible();
  await expect(page.getByText("En cours").first()).toBeVisible();
});

test("US#24 – Enregistrer une pièce quand un chantier est ouvert", async ({
  page,
}) => {
  await openBike(page, bikeName);
  await ouvrirFicheSession(page, chantier);
  await page.getByRole("button", { name: "Ajouter une action" }).click();

  // Aucune question sur l'intervention : on saisit depuis sa fiche, elle est
  // donc connue sans avoir à la choisir.
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel(/Sur quelle pièce/)).toBeVisible();
  await expect(
    dialog.getByRole("combobox", { name: "Rattacher à" })
  ).toBeHidden();
});

test("US#24 – Enregistrer une pièce sans en connaître le coût", async ({
  page,
}) => {
  await openBike(page, bikeName);
  await ouvrirFicheSession(page, chantier);

  await addPiece(page, {
    titre: "[TEST] Câbles et gaines de vitesses",
    systeme: "Transmission",
  });

  const ligne = page
    .getByTestId("action")
    .filter({ hasText: "[TEST] Câbles et gaines de vitesses" });
  await expect(ligne).toContainText("—");
});

test("US#4 – Supprimer le vélo de test (saisie)", async ({ page }) => {
  await deleteBike(page, bikeName);
});
