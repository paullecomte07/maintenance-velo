import { expect, test } from "@playwright/test";

import {
  addPiece,
  choisirDansLeMenuChantier,
  createBike,
  deleteBike,
  group,
  openBike,
  openIntervention,
  ouvrirFicheIdentite,
  planifierIntervention,
  testBikeName,
} from "./support";

// Tests E2E — US#34 (Recentrer la fiche vélo sur ses interventions)
// Scénario: La fiche vélo ne propose plus d'ajouter une action [US#34]
//   Étant donné que je suis sur la fiche d'un vélo
//   Quand j'examine l'entête
//   Alors aucun bouton ne propose d'ajouter une action
//   Et aucun bouton ne propose de modifier ou supprimer le vélo
// Scénario: Modifier et supprimer vivent dans la fiche d'identité [US#34]
//   Étant donné que je suis sur la fiche d'un vélo
//   Quand je déplie sa fiche d'identité
//   Alors je peux y modifier le vélo
//   Et je peux y supprimer le vélo
// Scénario: On ajoute une action depuis l'intervention [US#34]
//   Étant donné qu'une intervention est planifiée sur mon vélo
//   Quand je l'ouvre et que j'y ajoute une action
//   Alors l'action est enregistrée dans cette intervention
//   Et aucune question ne m'est posée sur le titre ou la cause du chantier
// Scénario: Consigner du travail fait démarre le chantier [US#34]
//   Étant donné qu'une intervention à venir n'a encore aucune action
//   Quand j'y ajoute une première action
//   Alors cette intervention passe en cours
//
// Tests E2E — US#35 (Supprimer une intervention depuis sa fiche)
// Scénario: Supprimer une intervention vide [US#35]
//   Étant donné qu'une intervention planifiée ne contient aucune action
//   Quand je la supprime et que je confirme
//   Alors je reviens sur la fiche du vélo
//   Et cette intervention n'apparaît plus
// Scénario: La confirmation annonce ce qui sera perdu [US#35]
//   Étant donné qu'une intervention contient deux actions
//   Quand je demande sa suppression
//   Alors la confirmation nomme l'intervention
//   Et elle annonce que deux actions seront supprimées
// Scénario: Renoncer à la suppression [US#35]
//   Étant donné que j'ai ouvert la confirmation de suppression
//   Quand j'annule
//   Alors l'intervention est toujours là avec ses actions
// Scénario: Supprimer une intervention emporte ses actions [US#35]
//   Étant donné qu'une intervention en cours contient deux actions
//   Quand je la supprime et que je confirme
//   Alors cette intervention n'apparaît plus sur la fiche du vélo
//   Et ses actions ne sont plus comptées
//
// Parcours en série sur un vélo de test préfixé [TEST], supprimé à la fin.
test.describe.configure({ mode: "serial" });

const bikeName = testBikeName("Épurée");
const chantier = "[TEST] Révision de printemps";
const chantierVide = "[TEST] Chantier jamais commencé";

test("US#4 – Créer un vélo de test (épurée)", async ({ page }) => {
  await createBike(page, bikeName, { mileageKm: 4795 });
});

test("US#34 – La fiche vélo ne propose plus d'ajouter une action", async ({
  page,
}) => {
  await openBike(page, bikeName);

  // L'entête ne porte plus aucun geste : ni saisie, ni réglages du vélo.
  await expect(
    page.getByRole("button", { name: "Ajouter une action" })
  ).toBeHidden();
  await expect(page.getByRole("link", { name: "Modifier" })).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Supprimer", exact: true })
  ).toBeHidden();

  // Seule l'entrée par l'intervention subsiste.
  await expect(
    page.getByRole("button", { name: "Planifier une intervention" })
  ).toBeVisible();
});

test("US#34 – Modifier et supprimer vivent dans la fiche d'identité", async ({
  page,
}) => {
  await openBike(page, bikeName);
  await ouvrirFicheIdentite(page);

  await expect(page.getByRole("link", { name: "Modifier" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Supprimer", exact: true })
  ).toBeVisible();
});

test("US#34 – On ajoute une action depuis l'intervention", async ({ page }) => {
  await openBike(page, bikeName);
  await planifierIntervention(page, chantier);
  await openIntervention(page, chantier);

  // Le chantier est encore « à venir » : rien n'y a été consigné.
  await expect(page.getByText("À venir").first()).toBeVisible();

  await page.getByRole("button", { name: "Ajouter une action" }).click();
  const dialog = page.getByRole("dialog");
  // L'intervention est connue : plus une seule question à son sujet.
  await expect(
    dialog.getByLabel(/Tu démarres un nouveau chantier/)
  ).toBeHidden();
  await expect(
    dialog.getByRole("group", { name: "Pourquoi ce chantier ?" })
  ).toBeHidden();
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();
});

test("US#34 – Consigner du travail fait démarre le chantier", async ({
  page,
}) => {
  await openBike(page, bikeName);
  await openIntervention(page, chantier);

  await addPiece(page, {
    titre: "[TEST] Chaîne",
    systeme: "Transmission",
    cout: "30",
  });

  // Une intervention ne peut pas rester « à venir » alors qu'elle porte du
  // travail réalisé : la première action la fait démarrer.
  await openBike(page, bikeName);
  await expect(group(page, "En cours").getByText(chantier)).toBeVisible();
  await expect(group(page, "À venir").getByText(chantier)).toBeHidden();
});

test("US#35 – Supprimer une intervention vide", async ({ page }) => {
  await openBike(page, bikeName);
  await planifierIntervention(page, chantierVide);
  await openIntervention(page, chantierVide);

  await choisirDansLeMenuChantier(page, "Supprimer l'intervention");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("aucune action");
  await dialog
    .getByRole("button", { name: "Supprimer définitivement" })
    .click();

  await expect(page).toHaveURL(/\/bikes\/[0-9a-f-]+$/, { timeout: 15000 });
  await expect(page.getByText(chantierVide)).toBeHidden();
});

test("US#35 – La confirmation annonce ce qui sera perdu", async ({ page }) => {
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
  await expect(dialog).toContainText(chantier);
  await expect(dialog).toContainText("2 actions");
});

test("US#35 – Renoncer à la suppression", async ({ page }) => {
  await openBike(page, bikeName);
  await openIntervention(page, chantier);

  await choisirDansLeMenuChantier(page, "Supprimer l'intervention");
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Annuler" }).click();
  await expect(dialog).toBeHidden();

  await expect(page.getByTestId("action")).toHaveCount(2);
});

test("US#35 – Supprimer une intervention emporte ses actions", async ({
  page,
}) => {
  await openBike(page, bikeName);
  await openIntervention(page, chantier);

  await choisirDansLeMenuChantier(page, "Supprimer l'intervention");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Supprimer définitivement" })
    .click();

  await expect(page).toHaveURL(/\/bikes\/[0-9a-f-]+$/, { timeout: 15000 });
  await expect(page.getByText(chantier)).toBeHidden();
  // Le chantier était le seul du vélo : plus rien n'est en cours.
  await expect(group(page, "En cours").getByRole("link")).toHaveCount(0);
});

test("US#4 – Supprimer le vélo de test (épurée)", async ({ page }) => {
  await deleteBike(page, bikeName);
});
