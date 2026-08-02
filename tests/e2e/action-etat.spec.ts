import { expect, test } from "@playwright/test";

import {
  addPiece,
  createBike,
  deleteBike,
  group,
  openBike,
  openIntervention,
  pickChip,
  planifierIntervention,
  pickSystem,
  testBikeName,
} from "./support";

// Tests E2E — US#30 (Saisir une action et l'état d'une pièce)
// Scénario: On ajoute une action, plus une pièce [US#30]
//   Étant donné que je suis sur la fiche d'un vélo
//   Quand j'ouvre la saisie
//   Alors le bouton s'intitule "Ajouter une action"
//   Et la première question porte sur ce que j'ai fait
// Scénario: Impossible d'enregistrer sans action ni état [US#30]
//   Étant donné que je suis sur le formulaire de saisie
//   Quand j'ai renseigné la pièce mais ni l'action ni l'état constaté
//   Alors aucune valeur n'est pré-cochée pour ces deux champs
//   Et l'enregistrement est refusé
// Scénario: Enchaîner plusieurs actions sur le même chantier [US#30]
//   Étant donné qu'un chantier est en cours sur mon vélo
//   Quand j'enregistre une action en choisissant "Enregistrer et ajouter une autre action"
//   Alors le formulaire se rouvre vide sur le même chantier
//   Et aucune question ne m'est posée sur le rattachement
// Scénario: La cause n'est plus demandée à la pièce [US#30]
//   Étant donné qu'un chantier est en cours sur mon vélo
//   Quand j'ouvre la saisie d'une action
//   Alors aucun champ ne me demande la cause
// Scénario: Enregistrer une inspection qui ne change rien [US#30]
//   Étant donné qu'un chantier est en cours sur mon vélo
//   Quand j'enregistre une action "Inspection" sur la pièce "Chaîne" en "Usure normale", sans coût
//   Alors l'action est enregistrée
//   Et la fiche du chantier l'affiche avec son état constaté et son kilométrage
//   Et son coût apparaît comme non renseigné
// Scénario: L'état constaté apparaît sur chaque ligne [US#30]
//   Étant donné un chantier contenant une action par état possible
//   Quand je consulte la fiche de ce chantier
//   Alors chaque ligne affiche son action, sa pièce et son état constaté en toutes lettres
// Scénario: La fiche vélo compte des actions [US#30]
//   Étant donné un chantier contenant trois actions
//   Quand je consulte la fiche du vélo
//   Alors ce chantier est décrit comme contenant trois actions
//
// Parcours en série sur un vélo de test préfixé [TEST], supprimé à la fin.
test.describe.configure({ mode: "serial" });

const bikeName = testBikeName("Action");
const chantier = "[TEST] Révision de printemps";
// Un chantier vide, qui sert aux scénarios n'enregistrant rien.
const preparatoire = "[TEST] Contrôle avant sortie";

const ACTION_GROUP = "Qu'est-ce que tu as fait ?";
const ETAT_GROUP = "Dans quel état tu l'as trouvée ?";

test("US#4 – Créer un vélo de test (action)", async ({ page }) => {
  await createBike(page, bikeName, { mileageKm: 4795 });
});

test("US#30 – On ajoute une action, plus une pièce", async ({ page }) => {
  await openBike(page, bikeName);
  await planifierIntervention(page, preparatoire);
  await openIntervention(page, preparatoire);

  // Le vocabulaire suit le modèle : on ajoute une action, pas une pièce.
  await expect(
    page.getByRole("button", { name: "Ajouter une pièce" })
  ).toBeHidden();
  await page.getByRole("button", { name: "Ajouter une action" }).click();

  const dialog = page.getByRole("dialog");
  // La première question porte sur l'action. C'est ce qui lève la
  // contradiction de l'inspection : on ne décrit plus un changement.
  await expect(dialog.getByRole("group", { name: ACTION_GROUP })).toBeVisible();
  await expect(dialog.getByLabel(/Sur quelle pièce/)).toBeVisible();
});

test("US#30 – Impossible d'enregistrer sans action ni état", async ({
  page,
}) => {
  await openBike(page, bikeName);
  await openIntervention(page, preparatoire);
  await page.getByRole("button", { name: "Ajouter une action" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Sur quelle pièce/).fill("[TEST] Chaîne");

  const action = dialog.getByRole("group", { name: ACTION_GROUP });
  for (const label of ["Inspection", "Entretien", "Réparation", "Remise à neuf"]) {
    await expect(
      action.getByRole("button", { name: label, exact: true })
    ).toHaveAttribute("aria-pressed", "false");
  }
  const etat = dialog.getByRole("group", { name: ETAT_GROUP });
  for (const label of ["Neuf", "Usure normale", "Usure prématurée", "HS"]) {
    await expect(
      etat.getByRole("button", { name: label, exact: true })
    ).toHaveAttribute("aria-pressed", "false");
  }

  await expect(
    dialog.getByRole("button", { name: "Ajouter", exact: true })
  ).toBeDisabled();
});

test("US#30 – Enchaîner plusieurs actions sur le même chantier", async ({
  page,
}) => {
  await openBike(page, bikeName);
  await planifierIntervention(page, chantier);
  await openIntervention(page, chantier);

  await page.getByRole("button", { name: "Ajouter une action" }).click();
  const dialog = page.getByRole("dialog");
  const encore = dialog.getByRole("button", {
    name: "Enregistrer et ajouter une autre action",
  });

  // Première action : elle fait passer le chantier « en cours ».
  await pickChip(dialog, ACTION_GROUP, "Entretien");
  await dialog.getByLabel(/Sur quelle pièce/).fill("[TEST] Chaîne");
  await pickSystem(page, dialog, "Transmission");
  await pickChip(dialog, ETAT_GROUP, "Usure normale");
  await dialog.getByLabel("Coût (€)").fill("30");
  await encore.click();

  // Le formulaire reste ouvert et vidé, sur le même chantier.
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel(/Sur quelle pièce/)).toHaveValue("");
  await expect(
    dialog.getByRole("group", { name: ACTION_GROUP }).getByRole("button", {
      name: "Entretien",
      exact: true,
    })
  ).toHaveAttribute("aria-pressed", "false");

  // Seconde action, enregistrée pour de bon cette fois.
  await pickChip(dialog, ACTION_GROUP, "Réparation");
  await dialog.getByLabel(/Sur quelle pièce/).fill("[TEST] Cassette");
  await pickSystem(page, dialog, "Transmission");
  await pickChip(dialog, ETAT_GROUP, "Usure prématurée");
  await dialog.getByLabel("Coût (€)").fill("52");
  await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 15000 });

  // Les deux actions sont bien dans un seul et même chantier, désormais ouvert.
  await expect(page.getByTestId("action")).toHaveCount(2);
  await openBike(page, bikeName);
  await expect(group(page, "En cours").getByRole("link")).toHaveCount(1);
});

test("US#30 – La cause n'est plus demandée à la pièce", async ({ page }) => {
  await openBike(page, bikeName);
  await openIntervention(page, chantier);
  await page.getByRole("button", { name: "Ajouter une action" }).click();

  const dialog = page.getByRole("dialog");
  // Ni la cause de la pièce (supprimée), ni celle du chantier (déjà connue).
  await expect(dialog.getByRole("group", { name: "Type de cause" })).toBeHidden();
  await expect(
    dialog.getByRole("group", { name: "Pourquoi ce chantier ?" })
  ).toBeHidden();
});

test("US#30 – Enregistrer une inspection qui ne change rien", async ({
  page,
}) => {
  await openBike(page, bikeName);
  await openIntervention(page, chantier);

  // Rien n'est remplacé, rien n'est dépensé — et c'est pourtant la donnée la
  // plus utile : cette pièce allait bien à ce kilométrage.
  await addPiece(page, {
    titre: "[TEST] Plaquettes",
    systeme: "Système de freinage avant",
    nature: "Inspection",
    etat: "Neuf",
  });

  const ligne = page
    .getByTestId("action")
    .filter({ hasText: "[TEST] Plaquettes" });
  await expect(ligne).toContainText("Inspection");
  await expect(ligne).toContainText("Neuf");
  await expect(ligne).toContainText("4 795 km");
  await expect(ligne).toContainText("—");
});

test("US#30 – L'état constaté apparaît sur chaque ligne", async ({ page }) => {
  await openBike(page, bikeName);
  await openIntervention(page, chantier);

  // Le libellé est toujours écrit : la couleur ne porte jamais le sens seule.
  for (const [piece, action, etat] of [
    ["[TEST] Chaîne", "Entretien", "Usure normale"],
    ["[TEST] Cassette", "Réparation", "Usure prématurée"],
    ["[TEST] Plaquettes", "Inspection", "Neuf"],
  ]) {
    const ligne = page.getByTestId("action").filter({ hasText: piece });
    await expect(ligne).toContainText(action);
    await expect(ligne).toContainText(etat);
  }
});

test("US#30 – La fiche vélo compte des actions", async ({ page }) => {
  await openBike(page, bikeName);

  await expect(group(page, "En cours")).toContainText("3 actions");
  await expect(group(page, "En cours")).not.toContainText("3 pièces");
});

test("US#4 – Supprimer le vélo de test (action)", async ({ page }) => {
  await deleteBike(page, bikeName);
});
