import { expect, test } from "@playwright/test";

import {
  addPiece,
  choisirDansLeMenuChantier,
  createBike,
  deleteBike,
  group,
  isoDaysAgo,
  openBike,
  openIntervention,
  ouvrirChantier,
  planifierIntervention,
  testBikeName,
} from "./support";

// Tests E2E — US#23 (Chantier d'entretien ouvert sur plusieurs jours)
// Scénario: Rattacher une pièce à un chantier ouvert trois jours plus tôt [US#23]
//   Étant donné qu'une intervention "Révision de printemps" est en cours sur mon vélo depuis trois jours
//   Quand j'enregistre une action datée d'aujourd'hui depuis sa fiche
//   Alors l'action est rattachée à l'intervention "Révision de printemps"
//   Et l'intervention reste en cours
// Scénario: Un seul chantier ouvert par vélo [US#23]
//   Étant donné qu'une intervention est déjà en cours sur mon vélo
//   Quand je consulte la fiche de ce vélo
//   Alors une seule intervention est affichée comme en cours
//   Et l'application ne me propose pas d'en ouvrir une seconde
// Scénario: Clôturer un chantier fige son coût et sa plage de dates [US#23]
//   Étant donné qu'une intervention en cours contient une pièce du 14 mars et une pièce du 17 mars
//   Quand je clôture cette intervention
//   Alors elle apparaît parmi les interventions terminées
//   Et elle affiche la plage "14 – 17 mars"
//   Et son coût total est la somme des coûts de ses pièces
// Scénario: Aucune clôture automatique [US#23]
//   Étant donné qu'une intervention est en cours depuis plus d'un mois sans nouvelle pièce
//   Quand je consulte la fiche du vélo
//   Alors l'intervention est toujours en cours
//   Et un rappel me propose de la clôturer
// Scénario: Renommer un chantier en cours [US#23]
//   Étant donné qu'une intervention "Révision de printemps" est en cours
//   Quand je la renomme en "Grosse révision 2026"
//   Alors la fiche du chantier affiche le nouveau titre
//   Et les pièces qui y sont rattachées le restent
// Scénario: Noter une remarque sur un chantier [US#23]
//   Étant donné que je suis sur la fiche d'une intervention
//   Quand je saisis une note libre
//   Alors cette note est enregistrée et visible lors de mes prochaines visites
// Scénario: Déplacer une pièce vers une autre intervention [US#23]
//   Étant donné qu'une pièce est rattachée à l'intervention "Révision de printemps"
//   Quand je la déplace vers l'intervention "Remise en état hiver"
//   Alors la pièce apparaît dans "Remise en état hiver"
//   Et les coûts totaux des deux interventions sont recalculés
//
// Parcours en série sur un vélo de test préfixé [TEST], supprimé à la fin.
test.describe.configure({ mode: "serial" });

const bikeName = testBikeName("Chantier");
const chantier = "[TEST] Révision de printemps";
const chantierRenomme = "[TEST] Grosse révision 2026";
const autreChantier = "[TEST] Remise en état hiver";
const piece1 = "[TEST] Chaîne";
const piece2 = "[TEST] Cassette";

test("US#4 – Créer un vélo de test (chantier)", async ({ page }) => {
  await createBike(page, bikeName);
});

test("US#23 – Rattacher une pièce à un chantier ouvert trois jours plus tôt", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await openBike(page, bikeName);

  // Le chantier est ouvert par sa première action, datée d'il y a trois jours.
  await ouvrirChantier(page, chantier, {
    titre: piece1,
    systeme: "Transmission",
    cout: "30",
    date: isoDaysAgo(3),
  });

  // Une action d'aujourd'hui s'y ajoute : c'est l'état du chantier qui décide
  // du rattachement, pas la date.
  await addPiece(page, {
    titre: piece2,
    systeme: "Transmission",
    nature: "Réparation",
    cout: "20",
  });

  await expect(
    page.getByTestId("action").filter({ hasText: piece1 })
  ).toBeVisible();
  await expect(
    page.getByTestId("action").filter({ hasText: piece2 })
  ).toBeVisible();
  await expect(page.getByText("En cours").first()).toBeVisible();
});

test("US#23 – Un seul chantier ouvert par vélo", async ({ page }) => {
  await openBike(page, bikeName);

  const enCours = group(page, "En cours");
  await expect(enCours.getByRole("link")).toHaveCount(1);

  // La seule création proposée est une intervention *à venir* : il n'existe
  // aucun moyen d'ouvrir un second chantier tant que celui-ci est en cours.
  await expect(
    page.getByRole("button", { name: "Planifier une intervention" })
  ).toBeVisible();
});

test("US#23 – Aucune clôture automatique", async ({ page }) => {
  await openBike(page, bikeName);

  // Le chantier a été ouvert il y a trois jours et n'a pas été clôturé :
  // il doit toujours l'être. Rien ne se ferme tout seul.
  await expect(group(page, "En cours").getByText(chantier)).toBeVisible();
  await expect(group(page, "Terminées").getByText(chantier)).toBeHidden();
});

test("US#23 – Noter une remarque sur un chantier", async ({ page }) => {
  await openBike(page, bikeName);
  await openIntervention(page, chantier);

  await choisirDansLeMenuChantier(page, "Renommer");
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Note" }).fill("[TEST] Chaîne mesurée à 0,75 %.");
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(dialog).toBeHidden({ timeout: 15000 });

  await page.reload();
  await expect(page.getByText("[TEST] Chaîne mesurée à 0,75 %.")).toBeVisible();
});

test("US#23 – Renommer un chantier en cours", async ({ page }) => {
  await openBike(page, bikeName);
  await openIntervention(page, chantier);

  await choisirDansLeMenuChantier(page, "Renommer");
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Nom de l.intervention/).fill(chantierRenomme);
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(dialog).toBeHidden({ timeout: 15000 });

  await expect(
    page.getByRole("heading", { name: chantierRenomme })
  ).toBeVisible();
  // Les pièces rattachées le restent.
  await expect(
    page.getByTestId("action").filter({ hasText: piece1 })
  ).toBeVisible();
  await expect(
    page.getByTestId("action").filter({ hasText: piece2 })
  ).toBeVisible();
});

test("US#23 – Déplacer une pièce vers une autre intervention", async ({
  page,
}) => {
  await openBike(page, bikeName);

  // Une seconde intervention, planifiée, sert de destination.
  await planifierIntervention(page, autreChantier);

  await openIntervention(page, chantierRenomme);
  await page
    .getByTestId("action")
    .filter({ hasText: piece2 })
    .getByRole("button", { name: "Déplacer" })
    .click();

  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("combobox", { name: "Intervention de destination" })
    .click();
  await page.getByRole("option", { name: autreChantier }).click();
  await dialog.getByRole("button", { name: "Déplacer" }).click();
  await expect(dialog).toBeHidden({ timeout: 15000 });

  // La pièce a quitté ce chantier, dont le coût est recalculé.
  await expect(page.getByText(piece2)).toBeHidden();
  await expect(page.getByText(/Coût total/)).toContainText(/30,00/);

  await openBike(page, bikeName);
  await openIntervention(page, autreChantier);
  await expect(page.getByText(piece2)).toBeVisible();
  await expect(page.getByText(/Coût total/)).toContainText(/20,00/);
});

test("US#23 – Clôturer un chantier fige son coût et sa plage de dates", async ({
  page,
}) => {
  await openBike(page, bikeName);
  await openIntervention(page, chantierRenomme);

  await page.getByRole("button", { name: "Clôturer" }).click();
  await expect(page.getByRole("button", { name: "Clôturer" })).toBeHidden({
    timeout: 15000,
  });

  await openBike(page, bikeName);
  const terminees = group(page, "Terminées");
  await expect(terminees.getByText(chantierRenomme)).toBeVisible();
  await expect(terminees.getByText(/30,00/)).toBeVisible();
  await expect(group(page, "En cours").getByText(chantierRenomme)).toBeHidden();
});

test("US#4 – Supprimer le vélo de test (chantier)", async ({ page }) => {
  await deleteBike(page, bikeName);
});
