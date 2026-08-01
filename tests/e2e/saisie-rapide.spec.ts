import { expect, test } from "@playwright/test";

import {
  addPiece,
  createBike,
  deleteBike,
  openBike,
  openIntervention,
  pickSystem,
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
// Scénario: Impossible d'enregistrer sans nature ni cause [US#24]
//   Étant donné que je suis sur le formulaire de saisie
//   Quand j'ai renseigné la pièce mais ni la nature ni la cause
//   Alors aucune valeur n'est pré-cochée pour ces deux champs
//   Et l'enregistrement est refusé
// Scénario: Le kilométrage est pré-rempli avec le dernier relevé [US#24]
//   Étant donné que le dernier kilométrage connu de mon vélo est 4795
//   Quand j'ouvre le formulaire de saisie
//   Alors le champ kilométrage affiche 4795
//   Et je peux le corriger avant d'enregistrer
// Scénario: Enregistrer une pièce sans en connaître le coût [US#24]
//   Étant donné que je suis sur le formulaire de saisie
//   Quand je renseigne la pièce, la nature et la cause mais laisse le coût vide
//   Alors la pièce est enregistrée
//   Et son coût apparaît comme non renseigné
// Scénario: Corriger le rattachement proposé [US#24]
//   Étant donné qu'une intervention "Révision de printemps" est en cours
//   Quand je saisis une pièce et que je change l'intervention proposée
//   Alors la pièce est rattachée à l'intervention que j'ai choisie
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
  await page.getByRole("button", { name: "Ajouter une pièce" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Kilométrage")).toHaveValue("4795");

  // Corrigeable avant enregistrement.
  await dialog.getByLabel("Kilométrage").fill("4820");
  await expect(dialog.getByLabel("Kilométrage")).toHaveValue("4820");
});

test("US#24 – Impossible d'enregistrer sans nature ni cause", async ({
  page,
}) => {
  await openBike(page, bikeName);
  await page.getByRole("button", { name: "Ajouter une pièce" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Qu.est-ce que tu as changé/).fill("[TEST] Chaîne");

  // Aucune valeur pré-cochée : toutes les puces de nature et de cause sont
  // dans l'état non sélectionné.
  for (const nature of [
    "Inspection",
    "Entretien",
    "Réparation",
    "Remise à neuf",
  ]) {
    await expect(
      dialog.getByRole("button", { name: nature, exact: true })
    ).toHaveAttribute("aria-pressed", "false");
  }
  for (const cause of ["Usure normale", "Usure prématurée", "Accident"]) {
    await expect(
      dialog.getByRole("button", { name: cause, exact: true })
    ).toHaveAttribute("aria-pressed", "false");
  }

  // Et l'enregistrement reste impossible.
  await expect(
    dialog.getByRole("button", { name: "Ajouter", exact: true })
  ).toBeDisabled();
});

test("US#24 – Le système se déduit de la pièce choisie", async ({ page }) => {
  await openBike(page, bikeName);
  await page.getByRole("button", { name: "Ajouter une pièce" }).click();

  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel(/Qu.est-ce que tu as changé/)
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
  await page.getByRole("button", { name: "Ajouter une pièce" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Qu.est-ce que tu as changé/).fill("Plaquettes");

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

  await addPiece(page, {
    titre: "[TEST] Chaîne",
    systeme: "Transmission",
    cout: "30",
    nouveauChantier: chantier,
  });

  await openIntervention(page, chantier);
  await expect(page.getByText("[TEST] Chaîne")).toBeVisible();
  await expect(page.getByText("En cours").first()).toBeVisible();
});

test("US#24 – Enregistrer une pièce quand un chantier est ouvert", async ({
  page,
}) => {
  await openBike(page, bikeName);
  await page.getByRole("button", { name: "Ajouter une pièce" }).click();

  const dialog = page.getByRole("dialog");
  // Aucune question sur l'intervention, mais le rattachement est annoncé.
  await expect(
    dialog.getByLabel(/Tu démarres un nouveau chantier/)
  ).toBeHidden();
  await expect(dialog.getByText(chantier)).toBeVisible();
});

test("US#24 – Enregistrer une pièce sans en connaître le coût", async ({
  page,
}) => {
  await openBike(page, bikeName);

  await addPiece(page, {
    titre: "[TEST] Câbles et gaines de vitesses",
    systeme: "Transmission",
  });

  await openIntervention(page, chantier);
  const ligne = page
    .getByTestId("piece")
    .filter({ hasText: "[TEST] Câbles et gaines de vitesses" });
  await expect(ligne).toContainText("—");
});

test("US#24 – Corriger le rattachement proposé", async ({ page }) => {
  await openBike(page, bikeName);

  // Une intervention de destination, planifiée.
  await page.getByRole("button", { name: "Planifier une intervention" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Nom de l.intervention/).fill(autreChantier);
  await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 15000 });

  await page.getByRole("button", { name: "Ajouter une pièce" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Qu.est-ce que tu as changé/).fill("[TEST] Pneus");
  await pickSystem(page, dialog, "Roue arrière");
  await dialog.getByRole("button", { name: "Entretien", exact: true }).click();
  await dialog
    .getByRole("button", { name: "Usure normale", exact: true })
    .click();

  // On corrige le rattachement proposé.
  await dialog.getByRole("button", { name: "Changer" }).click();
  await dialog.getByRole("combobox", { name: "Rattacher à" }).click();
  await page.getByRole("option", { name: autreChantier }).click();
  await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 15000 });

  await openIntervention(page, autreChantier);
  await expect(page.getByText("[TEST] Pneus")).toBeVisible();
});

test("US#4 – Supprimer le vélo de test (saisie)", async ({ page }) => {
  await deleteBike(page, bikeName);
});
