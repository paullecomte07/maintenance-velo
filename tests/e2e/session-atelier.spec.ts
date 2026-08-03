import { expect, test } from "@playwright/test";

import {
  choisirDansLeMenuSession,
  createBike,
  deleteBike,
  group,
  openBike,
  pickChip,
  testBikeName,
} from "./support";

// Tests E2E — US#47 (Ne plus confondre le passage à l'atelier et ce qu'on y a fait)
// Scénario: L'interface parle de sessions d'atelier [US#47]
//   Étant donné que je consulte la fiche d'un vélo
//   Alors aucun libellé ne mentionne "intervention" ni "chantier"
//   Et la liste s'intitule "Sessions d'atelier"
// Scénario: La cause est la première question posée [US#47]
//   Étant donné que j'ouvre une nouvelle session d'atelier
//   Quand le formulaire s'affiche
//   Alors la première question porte sur la raison de mon passage à l'atelier
//   Et aucune cause n'est pré-cochée
// Scénario: Ouvrir une session sans la nommer [US#47]
//   Étant donné que j'ouvre une nouvelle session d'atelier
//   Quand je choisis la cause "Prévention" sans saisir de nom
//   Alors la session est enregistrée
//   Et la fiche du vélo l'affiche par sa cause et sa date
// Scénario: Nommer une session à partir d'une proposition [US#47]
//   Étant donné que j'ouvre une nouvelle session d'atelier
//   Quand je clique sur la proposition "Révision de printemps"
//   Alors le champ de nom contient "Révision de printemps"
//   Et je peux encore le modifier
// Scénario: Nommer une session par une pièce déclenche une aide [US#47]
//   Étant donné que j'ouvre une nouvelle session d'atelier
//   Quand je saisis le nom "Changer ma chaîne"
//   Alors un message m'indique que "Chaîne" est une pièce
//   Et il m'explique ce qu'on attend comme nom de session
// Scénario: L'aide n'empêche pas d'enregistrer [US#47]
//   Étant donné que j'ai saisi le nom "Changer ma chaîne" et choisi une cause
//   Quand j'enregistre sans rien changer
//   Alors la session est enregistrée sous ce nom
// Scénario: Un nom de session normal ne déclenche aucune aide [US#47]
//   Étant donné que j'ouvre une nouvelle session d'atelier
//   Quand je saisis le nom "Entretien annuel"
//   Alors aucun message d'aide ne s'affiche
// Scénario: Nommer une session après coup [US#47]
//   Étant donné une session d'atelier enregistrée sans nom
//   Quand je la renomme "Révision de printemps"
//   Alors la fiche du vélo affiche ce nom à la place de sa cause
//
// Parcours en série sur un vélo de test préfixé [TEST], supprimé à la fin.
test.describe.configure({ mode: "serial" });

const bikeName = testBikeName("Session");
const nomAvecPiece = "[TEST] Changer ma chaîne";
const nomApresCoup = "[TEST] Révision de printemps";

const questionCause = "Pourquoi tu passes à l'atelier ?";

/** Ouvre le formulaire de planification depuis la fiche vélo. */
async function ouvrirFormulaire(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Planifier une session" }).click();
  return page.getByRole("dialog");
}

test("US#4 – Créer un vélo de test (session)", async ({ page }) => {
  await createBike(page, bikeName);
});

test("US#47 – L'interface parle de sessions d'atelier", async ({ page }) => {
  await openBike(page, bikeName);

  await expect(page.getByText("Sessions d'atelier")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Planifier une session" })
  ).toBeVisible();

  // Le vélo est vierge : tout ce qui s'affiche vient de l'application.
  await expect(page.getByText(/chantier/i)).toHaveCount(0);
  await expect(page.getByText(/intervention/i)).toHaveCount(0);
});

test("US#47 – La cause est la première question posée", async ({ page }) => {
  await openBike(page, bikeName);
  const dialog = await ouvrirFormulaire(page);

  const cause = dialog.getByRole("group", { name: questionCause });
  const nom = dialog.getByLabel(/Nom de la session/);

  const boiteCause = await cause.boundingBox();
  const boiteNom = await nom.boundingBox();
  expect(boiteCause!.y).toBeLessThan(boiteNom!.y);

  // Aucune valeur par défaut : une cause pré-cochée falsifierait la donnée.
  for (const chip of await cause.getByRole("button").all()) {
    await expect(chip).toHaveAttribute("aria-pressed", "false");
  }
});

test("US#47 – Nommer une session à partir d'une proposition", async ({
  page,
}) => {
  await openBike(page, bikeName);
  const dialog = await ouvrirFormulaire(page);

  const nom = dialog.getByLabel(/Nom de la session/);
  await expect(nom).toHaveValue("");

  await dialog
    .getByRole("group", { name: "Noms proposés" })
    .getByRole("button", { name: "Révision de printemps" })
    .click();
  await expect(nom).toHaveValue("Révision de printemps");

  // La proposition remplit le champ, elle ne le verrouille pas.
  await nom.fill("Entretien annuel");
  await expect(nom).toHaveValue("Entretien annuel");
});

test("US#47 – Un nom de session normal ne déclenche aucune aide", async ({
  page,
}) => {
  await openBike(page, bikeName);
  const dialog = await ouvrirFormulaire(page);

  await dialog.getByLabel(/Nom de la session/).fill("Entretien annuel");
  await expect(dialog.getByText(/est une pièce/)).toBeHidden();
  await expect(dialog.getByText(/décrit un geste/)).toBeHidden();
});

test("US#47 – Nommer une session par une pièce déclenche une aide", async ({
  page,
}) => {
  await openBike(page, bikeName);
  const dialog = await ouvrirFormulaire(page);

  await dialog.getByLabel(/Nom de la session/).fill(nomAvecPiece);

  const aide = dialog.getByText(/est une pièce/);
  await expect(aide).toBeVisible();
  // Le message cite la pièce reconnue et dit ce qu'on attend à la place.
  await expect(aide).toContainText("chaîne");
  await expect(aide).toContainText("Révision de printemps");
});

test("US#47 – L'aide n'empêche pas d'enregistrer", async ({ page }) => {
  await openBike(page, bikeName);
  const dialog = await ouvrirFormulaire(page);

  await dialog.getByLabel(/Nom de la session/).fill(nomAvecPiece);
  await pickChip(dialog, questionCause, "Dysfonctionnement");
  await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 15000 });

  await expect(group(page, "À venir").getByText(nomAvecPiece)).toBeVisible();
});

test("US#47 – Ouvrir une session sans la nommer", async ({ page }) => {
  await openBike(page, bikeName);
  const dialog = await ouvrirFormulaire(page);

  await pickChip(dialog, questionCause, "Prévention");
  await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 15000 });

  // Faute de nom, la session se lit par sa cause et sa date — jamais par un
  // libellé vide ni par un identifiant.
  const aVenir = group(page, "À venir");
  await expect(aVenir.getByText(/^Prévention · /)).toBeVisible();
});

test("US#47 – Nommer une session après coup", async ({ page }) => {
  await openBike(page, bikeName);

  await group(page, "À venir")
    .getByRole("link")
    .filter({ hasText: /^Prévention · / })
    .first()
    .click();
  await expect(page).toHaveURL(/\/interventions\/[0-9a-f-]+$/);

  await choisirDansLeMenuSession(page, "Renommer");
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Nom de la session/).fill(nomApresCoup);
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(dialog).toBeHidden({ timeout: 15000 });

  await expect(page.getByRole("heading", { name: nomApresCoup })).toBeVisible();

  await openBike(page, bikeName);
  const aVenir = group(page, "À venir");
  await expect(aVenir.getByText(nomApresCoup)).toBeVisible();
  await expect(aVenir.getByText(/^Prévention · /)).toBeHidden();
});

test("US#4 – Supprimer le vélo de test (session)", async ({ page }) => {
  await deleteBike(page, bikeName);
});
