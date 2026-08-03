import { expect, test, type Page } from "@playwright/test";

import {
  ouvrirSession,
  addPiece,
  createBike,
  deleteBike,
  group,
  openBike,
  ouvrirFicheSession,
  planifierSession,
  testBikeName,
} from "./support";

// Tests E2E — US#25 (Fiche vélo organisée par interventions)
// Scénario: Les trois groupes d'interventions sont visibles ensemble [US#25]
//   Étant donné que mon vélo a une intervention en cours, une à venir et deux terminées
//   Quand je consulte la fiche de ce vélo
//   Alors je vois les trois groupes "En cours", "À venir" et "Terminées"
//   Et chacun affiche les interventions qui lui correspondent
// Scénario: Un chantier ouvert ne masque pas le reste [US#25]
//   Étant donné qu'une intervention est en cours sur mon vélo
//   Quand je consulte la fiche de ce vélo
//   Alors les interventions à venir restent visibles
//   Et les interventions terminées restent visibles
// Scénario: Ouvrir la fiche d'un chantier en cours depuis la liste [US#25]
//   Étant donné que je suis sur la fiche d'un vélo ayant une intervention en cours
//   Quand j'ouvre cette intervention
//   Alors j'arrive sur sa fiche
//   Et je vois la liste de ses pièces changées
// Scénario: Revenir à la fiche du vélo depuis une intervention [US#25]
//   Étant donné que je suis sur la fiche d'une intervention
//   Quand j'utilise le retour arrière
//   Alors je reviens sur la fiche du vélo
// Scénario retiré par US#44 : « Le kilométrage apparaît sur chaque pièce ». Le
// relevé appartient à la session, qui l'affiche une fois dans son entête ; les
// lignes d'action n'en portent plus. Couvert par `session-kilometrage.spec.ts`.
// Scénario: La liste des pièces à plat n'est plus proposée [US#25]
//   Étant donné que je suis sur la fiche d'un vélo
//   Quand j'examine la page
//   Alors aucune liste de changements de pièces à plat n'est affichée
//   Et les pièces ne sont accessibles qu'en ouvrant une intervention
//
// Parcours en série sur un vélo de test préfixé [TEST], supprimé à la fin.
test.describe.configure({ mode: "serial" });

const bikeName = testBikeName("Fiche");
const termine1 = "[TEST] Remise en état hiver";
const termine2 = "[TEST] Réglage transmission";
const aVenir = "[TEST] Révision complète";
const enCours = "[TEST] Révision de printemps";
const piece = "[TEST] Chaîne";

/** Ouvre un chantier avec une pièce, puis le clôture. */
async function chantierTermine(page: Page, titre: string) {
  await openBike(page, bikeName);
  await ouvrirSession(page, titre, {
    titre: `${piece} ${titre}`,
    systeme: "Transmission",
    cout: "10",
  });
  await page.getByRole("button", { name: "Clôturer" }).click();
  await expect(page.getByRole("button", { name: "Clôturer" })).toBeHidden({
    timeout: 15000,
  });
}

test("US#4 – Créer un vélo de test (fiche)", async ({ page }) => {
  await createBike(page, bikeName, { mileageKm: 4795 });
});

test("US#25 – Les trois groupes d'interventions sont visibles ensemble", async ({
  page,
}) => {
  // Ce scénario monte quatre interventions de bout en bout par l'interface :
  // la limite par défaut de 30 s ne suffit plus.
  test.setTimeout(120_000);

  // Deux interventions terminées…
  await chantierTermine(page, termine1);
  await chantierTermine(page, termine2);

  // …une à venir…
  await openBike(page, bikeName);
  await planifierSession(page, aVenir);

  // …et une en cours : la première action la fait passer de « à venir »
  // à « en cours ».
  await ouvrirSession(page, enCours, {
    titre: piece,
    systeme: "Transmission",
    cout: "30",
  });
  await openBike(page, bikeName);

  await expect(group(page, "En cours").getByText(enCours)).toBeVisible();
  await expect(group(page, "À venir").getByText(aVenir)).toBeVisible();
  await expect(group(page, "Terminées").getByText(termine1)).toBeVisible();
  await expect(group(page, "Terminées").getByText(termine2)).toBeVisible();
});

test("US#25 – Un chantier ouvert ne masque pas le reste", async ({ page }) => {
  await openBike(page, bikeName);

  // Le chantier en cours prend la première place, il ne remplace rien.
  await expect(group(page, "En cours").getByText(enCours)).toBeVisible();
  await expect(group(page, "À venir").getByText(aVenir)).toBeVisible();
  await expect(group(page, "Terminées").getByText(termine1)).toBeVisible();
  await expect(group(page, "Terminées").getByText(termine2)).toBeVisible();
});

test("US#25 – Ouvrir la fiche d'un chantier en cours depuis la liste", async ({
  page,
}) => {
  await openBike(page, bikeName);
  await ouvrirFicheSession(page, enCours);

  await expect(page.getByRole("heading", { name: enCours })).toBeVisible();
  await expect(page.getByText("Actions réalisées")).toBeVisible();
  await expect(page.getByText(piece).first()).toBeVisible();
});

test("US#25 – Revenir à la fiche du vélo depuis une intervention", async ({
  page,
}) => {
  await openBike(page, bikeName);
  await ouvrirFicheSession(page, enCours);

  await page.getByRole("link", { name: `← ${bikeName}` }).click();
  await expect(page).toHaveURL(/\/bikes\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: bikeName })).toBeVisible();
});

test("US#25 – La liste des pièces à plat n'est plus proposée", async ({
  page,
}) => {
  await openBike(page, bikeName);

  // L'ancien cahier à plat a disparu de la fiche vélo…
  await expect(page.getByText("Cahier de changement de pièces")).toBeHidden();
  await expect(page.getByText("Actions réalisées")).toBeHidden();

  // …les pièces ne sont accessibles qu'en ouvrant une intervention.
  await ouvrirFicheSession(page, enCours);
  await expect(page.getByText("Actions réalisées")).toBeVisible();
});

test("US#4 – Supprimer le vélo de test (fiche)", async ({ page }) => {
  await deleteBike(page, bikeName);
});
