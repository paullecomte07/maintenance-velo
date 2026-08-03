import { expect, test } from "@playwright/test";

import {
  addPiece,
  choisirDansLeMenuChantier,
  createBike,
  deleteBike,
  openBike,
  openIntervention,
  ouvrirChantier,
  testBikeName,
} from "./support";

// Tests E2E — US#46 (Mettre en avant l'action du moment sur la fiche d'un chantier)
// Scénario: L'action du moment reste au premier plan [US#46]
//   Étant donné un chantier en cours sur mon vélo
//   Quand je consulte sa fiche
//   Alors le bouton "Clôturer" est directement visible
//   Et aucun bouton "Supprimer" n'est directement visible
// Scénario: Renommer depuis le menu [US#46]
//   Étant donné un chantier en cours sur mon vélo
//   Quand j'ouvre le menu des réglages du chantier et que je choisis "Renommer"
//   Alors le formulaire de modification s'ouvre
// Scénario: Supprimer reste protégé par sa confirmation [US#46]
//   Étant donné un chantier contenant deux actions
//   Quand j'ouvre le menu des réglages du chantier et que je choisis "Supprimer"
//   Alors une confirmation m'annonce que ses deux actions seront supprimées avec lui
// Scénario: Un chantier terminé n'a plus d'action principale [US#46]
//   Étant donné un chantier terminé sur mon vélo
//   Quand je consulte sa fiche
//   Alors aucun bouton "Démarrer ce chantier" ni "Clôturer" n'est proposé
//   Et le menu des réglages du chantier reste accessible
// Scénario: Le menu est utilisable au clavier [US#46]
//   Étant donné un chantier en cours sur mon vélo
//   Quand j'ouvre le menu des réglages du chantier au clavier
//   Alors ses entrées sont parcourables au clavier
//   Et la touche Échap le referme
//
// Parcours en série sur un vélo de test préfixé [TEST], supprimé à la fin.
test.describe.configure({ mode: "serial" });

const bikeName = testBikeName("Menu");
const chantier = "[TEST] Révision de printemps";

const reglages = "Réglages de l'intervention";

test("US#4 – Créer un vélo de test (menu)", async ({ page }) => {
  await createBike(page, bikeName);
});

test("US#46 – L'action du moment reste au premier plan", async ({ page }) => {
  test.setTimeout(90_000);
  await openBike(page, bikeName);
  await ouvrirChantier(page, chantier, {
    titre: "[TEST] Chaîne",
    systeme: "Transmission",
    cout: "30",
  });

  await expect(page.getByRole("button", { name: "Clôturer" })).toBeVisible();

  // Ni « Renommer » ni « Supprimer » ne sont des boutons de premier niveau.
  // On vise l'entête : chaque ligne d'action porte, elle, son propre bouton.
  await expect(page.getByRole("button", { name: "Renommer" })).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Supprimer l'intervention" })
  ).toBeHidden();
  await expect(page.getByRole("button", { name: reglages })).toBeVisible();
});

test("US#46 – Renommer depuis le menu", async ({ page }) => {
  await openBike(page, bikeName);
  await openIntervention(page, chantier);

  await choisirDansLeMenuChantier(page, "Renommer");

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel(/Nom de l.intervention/)).toHaveValue(
    chantier
  );
});

test("US#46 – Supprimer reste protégé par sa confirmation", async ({
  page,
}) => {
  await openBike(page, bikeName);
  await openIntervention(page, chantier);

  // Une seconde action, pour que la confirmation ait deux à annoncer.
  await addPiece(page, {
    titre: "[TEST] Cassette",
    systeme: "Transmission",
    nature: "Réparation",
    cout: "52",
  });

  await choisirDansLeMenuChantier(page, "Supprimer l'intervention");

  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("2 actions");

  // On renonce : le chantier sert encore aux scénarios suivants.
  await dialog.getByRole("button", { name: "Annuler" }).click();
  await expect(dialog).toBeHidden();
});

test("US#46 – Le menu est utilisable au clavier", async ({ page }) => {
  await openBike(page, bikeName);
  await openIntervention(page, chantier);

  const trigger = page.getByRole("button", { name: reglages });
  await trigger.focus();
  await page.keyboard.press("Enter");

  const renommer = page.getByRole("menuitem", { name: "Renommer" });
  await expect(renommer).toBeVisible();
  await expect(renommer).toBeFocused();

  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("menuitem", { name: "Supprimer l'intervention" })
  ).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(renommer).toBeHidden();
});

test("US#46 – Un chantier terminé n'a plus d'action principale", async ({
  page,
}) => {
  await openBike(page, bikeName);
  await openIntervention(page, chantier);

  await page.getByRole("button", { name: "Clôturer" }).click();
  await expect(page.getByRole("button", { name: "Clôturer" })).toBeHidden({
    timeout: 15000,
  });

  await expect(
    page.getByRole("button", { name: "Démarrer ce chantier" })
  ).toBeHidden();
  // Le menu, lui, reste : on doit pouvoir corriger un chantier clôturé.
  await expect(page.getByRole("button", { name: reglages })).toBeVisible();
  await choisirDansLeMenuChantier(page, "Renommer");
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("US#4 – Supprimer le vélo de test (menu)", async ({ page }) => {
  await deleteBike(page, bikeName);
});
