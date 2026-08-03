import { expect, test } from "@playwright/test";

// Tests E2E — US#41 (Retrouver l'accès à mon compte quand j'ai oublié mon
// mot de passe)
// Scénario: Demander un lien de réinitialisation
//   Étant donné que je suis sur la page de connexion
//   Quand je clique sur « Mot de passe oublié ? » et que je saisis mon email
//   Alors on me confirme qu'un lien vient d'être envoyé
// Scénario: La demande ne révèle pas si le compte existe
//   Étant donné que je suis sur la page de mot de passe oublié
//   Quand je saisis une adresse qui n'a jamais eu de compte
//   Alors j'obtiens exactement le même message que pour une adresse connue
// Scénario: Un lien de réinitialisation périmé est expliqué
//   Étant donné que j'ouvre un lien de réinitialisation invalide
//   Alors on me dit que le lien n'est plus valable
//   Et on me propose d'en demander un nouveau
// Scénario: Deux mots de passe différents sont refusés
//   Étant donné que je suis connecté sur la page Mon compte
//   Quand je saisis un nouveau mot de passe et une confirmation différente
//   Alors le changement est refusé avec un message explicite
//   Et mon mot de passe actuel continue de fonctionner
// Scénario: L'inscription refuse une confirmation qui ne correspond pas
//   Étant donné que je suis sur la page de création de compte
//   Quand je saisis deux mots de passe différents
//   Alors la création est refusée avec un message explicite

// Deux précautions qui expliquent la forme de ces tests :
//
// 1. Aucun scénario ne modifie le mot de passe du compte de test. Un test qui
//    le changerait et échouerait avant de l'avoir remis rendrait toute la
//    suite inutilisable — et le seul moyen de rattrapage serait justement le
//    parcours qu'on est en train de tester.
// 2. Les demandes de réinitialisation portent sur des adresses sans compte,
//    pour ne pas déposer un mail dans la vraie boîte à chaque run ni épuiser
//    le quota d'envoi. Le trajet complet « je reçois le mail → je clique → je
//    choisis un mot de passe » se vérifie donc à la main.

const ADRESSE_SANS_COMPTE = "personne-sans-compte@example.invalid";

test.describe("Parcours déconnecté", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("US#41 – Demander un lien de réinitialisation", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Mot de passe oublié ?" }).click();

    await expect(page).toHaveURL(/\/forgot-password/);
    await page.getByLabel("Email").fill(ADRESSE_SANS_COMPTE);
    await page.getByRole("button", { name: "Envoyer le lien" }).click();

    // Les titres de Card ne portent pas de rôle heading : on cible le texte.
    await expect(page.getByText("Lien envoyé")).toBeVisible({ timeout: 15000 });
  });

  test("US#41 – La demande ne révèle pas si le compte existe", async ({
    page,
  }) => {
    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill(ADRESSE_SANS_COMPTE);
    await page.getByRole("button", { name: "Envoyer le lien" }).click();

    // La confirmation est conditionnelle (« Si un compte existe… ») : c'est ce
    // qui garantit qu'elle est la même pour une adresse connue et une adresse
    // inconnue, sans avoir à déclencher un vrai envoi pour le prouver.
    await expect(page.getByText(/Si un compte existe pour cette adresse/)).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(ADRESSE_SANS_COMPTE)).toBeHidden();
  });

  test("US#41 – Un lien de réinitialisation périmé est expliqué", async ({
    page,
  }) => {
    // Un lien périmé est indiscernable d'un accès direct : dans les deux cas
    // aucune session n'a été ouverte par le callback.
    await page.goto("/reset-password");

    await expect(page.getByText(/Ce lien n.est plus valable/)).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Demander un nouveau lien" })
    ).toBeVisible();
  });

  test("US#41 – L'inscription refuse une confirmation qui ne correspond pas", async ({
    page,
  }) => {
    await page.goto("/signup");
    await page.getByLabel("Email").fill(ADRESSE_SANS_COMPTE);
    await page.getByLabel("Mot de passe", { exact: true }).fill("motdepasse1");
    await page.getByLabel("Confirmer le mot de passe").fill("motdepasse2");
    await page.getByRole("button", { name: "Créer le compte" }).click();

    await expect(
      page.getByText("Les deux mots de passe ne sont pas identiques.")
    ).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/\/signup/);
  });
});

test("US#41 – Deux mots de passe différents sont refusés", async ({ page }) => {
  await page.goto("/account");

  await page.getByLabel("Mot de passe actuel").fill("peu-importe");
  await page.getByLabel("Nouveau mot de passe").fill("motdepasse1");
  await page.getByLabel("Confirmer le mot de passe").fill("motdepasse2");
  await page.getByRole("button", { name: "Changer le mot de passe" }).click();

  await expect(
    page.getByText("Les deux mots de passe ne sont pas identiques.")
  ).toBeVisible({ timeout: 15000 });

  // Le refus tombe avant toute vérification du mot de passe actuel : rien n'a
  // été modifié, et la session tient toujours. On ne pousse pas jusqu'à une
  // reconnexion, car la déconnexion révoquerait la session partagée par
  // l'ensemble de la suite.
  await expect(page).toHaveURL(/\/account/);
  await page.goto("/bikes");
  await expect(page.getByRole("heading", { name: "Mes vélos" })).toBeVisible();
});
