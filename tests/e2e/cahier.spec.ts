import { expect, test } from "@playwright/test";

import {
  addPiece,
  createBike,
  deleteBike,
  openBike,
  openIntervention,
  testBikeName,
} from "./support";

// Tests E2E — US#4 (Vélos) & US#5 (Changements de pièces)
// Scénario: Créer un vélo de test [US#4]
//   Étant donné que je suis connecté
//   Quand j'ajoute un vélo avec un nom et un prix d'achat
//   Alors le vélo apparaît dans ma liste
// Scénario: Ajouter un changement de pièce [US#5]
//   Étant donné qu'un vélo existe
//   Quand j'ajoute un changement de pièce avec un titre
//   Alors il apparaît dans les pièces du chantier
// Scénario: Modifier le changement [US#5]
//   Étant donné qu'un changement existe
//   Quand je modifie son titre
//   Alors le nouveau titre apparaît dans le chantier
// Scénario: Supprimer le changement [US#5]
//   Étant donné qu'un changement existe
//   Quand je le supprime et confirme
//   Alors le chantier n'affiche plus aucune pièce
// Scénario: Supprimer le vélo de test (nettoyage) [US#4]
//   Étant donné qu'un vélo de test existe
//   Quand je le supprime et confirme
//   Alors il n'apparaît plus dans ma liste
//
// Version adaptée au parcours introduit par US#23/#24/#25 : les pièces vivent
// sur la fiche du chantier, plus dans un cahier à plat sur la fiche vélo.
// Les données créées sont préfixées [TEST] et supprimées en fin de parcours.
// L'encart Analyse n'est jamais déclenché (appel API payant).
test.describe.configure({ mode: "serial" });

const bikeName = testBikeName("Vélo Playwright");
const chantier = "[TEST] Chantier cahier";
const eventTitle = "[TEST] Plaquettes";
const eventTitleEdited = "[TEST] Plaquettes de frein avant";

test("US#4 – Créer un vélo de test", async ({ page }) => {
  await createBike(page, bikeName);
});

test("US#5 – Ajouter un changement de pièce", async ({ page }) => {
  await openBike(page, bikeName);

  await addPiece(page, {
    titre: eventTitle,
    systeme: "Système de freinage avant",
    cout: "25",
    nouveauChantier: chantier,
  });

  await openIntervention(page, chantier);
  await expect(page.getByText(eventTitle)).toBeVisible();
});

test("US#5 – Modifier le changement", async ({ page }) => {
  await openBike(page, bikeName);
  await openIntervention(page, chantier);

  await page
    .getByTestId("action")
    .filter({ hasText: eventTitle })
    .getByRole("button", { name: "Modifier" })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel(/Sur quelle pièce/)
    .fill(eventTitleEdited);
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(dialog).toBeHidden({ timeout: 15000 });

  await expect(page.getByText(eventTitleEdited)).toBeVisible();
});

test("US#5 – Supprimer le changement", async ({ page }) => {
  await openBike(page, bikeName);
  await openIntervention(page, chantier);

  await page
    .getByTestId("action")
    .filter({ hasText: eventTitleEdited })
    .getByRole("button", { name: "Supprimer" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Supprimer", exact: true })
    .click();

  await expect(
    page.getByText("Aucune action enregistrée dans ce chantier.")
  ).toBeVisible({ timeout: 15000 });
});

test("US#4 – Supprimer le vélo de test", async ({ page }) => {
  await deleteBike(page, bikeName);
});
