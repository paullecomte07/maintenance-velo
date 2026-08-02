import { expect, test } from "@playwright/test";

import {
  addPiece,
  createBike,
  deleteBike,
  group,
  openBike,
  openIntervention,
  pickChip,
  pickSystem,
  testBikeName,
} from "./support";

// Tests E2E — US#29 (La cause au niveau de l'intervention)
// Scénario: Ouvrir un chantier demande sa cause [US#29]
//   Étant donné qu'aucune intervention n'est en cours sur mon vélo
//   Quand je saisis une première action et que je nomme le chantier
//   Alors on me demande aussi sa cause
//   Et aucune cause n'est pré-cochée
// Scénario: Impossible d'enregistrer sans cause [US#29]
//   Étant donné que j'ouvre un nouveau chantier
//   Quand j'ai tout renseigné sauf la cause
//   Alors l'enregistrement est refusé
// Scénario: La cause n'est demandée qu'une fois par chantier [US#29]
//   Étant donné qu'une intervention de cause "Prévention" est en cours
//   Quand je saisis une deuxième action sur ce chantier
//   Alors aucune cause ne m'est demandée
// Scénario: La cause est visible sur la fiche du vélo [US#29]
//   Étant donné qu'une intervention de cause "Accident" existe sur mon vélo
//   Quand je consulte la fiche de ce vélo
//   Alors cette intervention affiche sa cause en toutes lettres
// Scénario: Corriger la cause d'une intervention [US#29]
//   Étant donné qu'une intervention porte la cause "Prévention"
//   Quand je la modifie en "Dysfonctionnement"
//   Alors la fiche du vélo affiche la nouvelle cause
//
// Le sixième scénario du ticket — « Une intervention importée n'a pas de cause
// inventée » — n'est PAS automatisé ici, volontairement. Il demande une
// intervention sans cause, or l'application n'offre plus aucun chemin pour en
// créer une : c'est précisément ce que cette US garantit. Le vérifier
// supposerait d'écrire en base, ce que cette suite ne fait pas (elle tourne
// contre le déploiement). Il se vérifie à l'œil sur les interventions
// « Historique initial » des vrais vélos.
//
// Parcours en série sur un vélo de test préfixé [TEST], supprimé à la fin.
test.describe.configure({ mode: "serial" });

const bikeName = testBikeName("Cause");
const chantier = "[TEST] Chute sur le chemin des Crêtes";

test("US#4 – Créer un vélo de test (cause)", async ({ page }) => {
  await createBike(page, bikeName);
});

test("US#29 – Ouvrir un chantier demande sa cause", async ({ page }) => {
  await openBike(page, bikeName);
  await page.getByRole("button", { name: "Planifier une intervention" }).click();

  const dialog = page.getByRole("dialog");
  const cause = dialog.getByRole("group", { name: "Pourquoi ce chantier ?" });
  await expect(cause).toBeVisible();

  // Aucune valeur pré-cochée : une cause par défaut falsifierait exactement la
  // donnée que cette US existe pour fiabiliser.
  for (const label of [
    "Accident",
    "Casse d'usure",
    "Dysfonctionnement",
    "Prévention",
  ]) {
    await expect(
      cause.getByRole("button", { name: label, exact: true })
    ).toHaveAttribute("aria-pressed", "false");
  }
});

test("US#29 – Impossible d'enregistrer sans cause", async ({ page }) => {
  await openBike(page, bikeName);
  await page.getByRole("button", { name: "Planifier une intervention" }).click();

  const dialog = page.getByRole("dialog");
  const ajouter = dialog.getByRole("button", { name: "Ajouter", exact: true });

  // Tout est renseigné sauf la cause.
  await dialog.getByLabel(/Nom de l.intervention/).fill(chantier);
  await expect(ajouter).toBeDisabled();

  // Elle seule débloque l'enregistrement.
  await pickChip(dialog, "Pourquoi ce chantier ?", "Accident");
  await expect(ajouter).toBeEnabled();

  await ajouter.click();
  await expect(dialog).toBeHidden({ timeout: 15000 });

  // Puis une action, qui fait passer le chantier « en cours ».
  await openIntervention(page, chantier);
  await addPiece(page, {
    titre: "[TEST] Cintre",
    systeme: "Direction",
    nature: "Réparation",
    etat: "HS",
  });
});

test("US#29 – La cause est visible sur la fiche du vélo", async ({ page }) => {
  await openBike(page, bikeName);

  const ligne = group(page, "En cours").getByRole("link", {
    name: new RegExp(chantier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  });
  await expect(ligne).toContainText("Accident");
});

test("US#29 – La cause n'est demandée qu'une fois par chantier", async ({
  page,
}) => {
  await openBike(page, bikeName);
  await openIntervention(page, chantier);
  await page.getByRole("button", { name: "Ajouter une action" }).click();

  const dialog = page.getByRole("dialog");
  // Le chantier porte déjà sa cause : le formulaire d'action ne la redemande
  // jamais, ni pour le chantier ni pour la pièce.
  await expect(
    dialog.getByRole("group", { name: "Pourquoi ce chantier ?" })
  ).toBeHidden();

  await dialog.getByLabel(/Sur quelle pièce/).fill("[TEST] Potence");
  await pickSystem(page, dialog, "Direction");
  await pickChip(dialog, "Qu'est-ce que tu as fait ?", "Réparation");
  await pickChip(dialog, "Dans quel état tu l'as trouvée ?", "HS");
  await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 15000 });
});

test("US#29 – Corriger la cause d'une intervention", async ({ page }) => {
  await openBike(page, bikeName);
  await openIntervention(page, chantier);

  await expect(page.getByText("Accident").first()).toBeVisible();

  await page.getByRole("button", { name: "Renommer" }).click();
  const dialog = page.getByRole("dialog");
  await pickChip(dialog, "Pourquoi ce chantier ?", "Dysfonctionnement");
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(dialog).toBeHidden({ timeout: 15000 });

  await openBike(page, bikeName);
  await expect(group(page, "En cours")).toContainText("Dysfonctionnement");
});

test("US#4 – Supprimer le vélo de test (cause)", async ({ page }) => {
  // Les pièces bloquent la suppression de l'intervention, pas celle du vélo :
  // on passe par le vélo, qui emporte tout.
  await deleteBike(page, bikeName);
});
