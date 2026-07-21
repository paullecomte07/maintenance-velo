import { expect, test } from "@playwright/test";

// Tests E2E — US#3 (Connexion)
// Scénario: Un visiteur non connecté est redirigé vers le login
//   Étant donné que je ne suis pas connecté
//   Quand j'ouvre une page protégée
//   Alors je suis redirigé vers la page de connexion
// Scénario: Un mauvais mot de passe affiche une erreur claire
//   Étant donné que je suis sur la page de connexion
//   Quand je saisis un email valide et un mauvais mot de passe
//   Alors un message d'erreur clair s'affiche

// Ces tests vérifient les accès NON connectés : on ignore la session
// sauvegardée par le setup.
test.use({ storageState: { cookies: [], origins: [] } });

test("US#3 – Un visiteur non connecté est redirigé vers le login", async ({
  page,
}) => {
  await page.goto("/bikes");
  await expect(page).toHaveURL(/\/login/);
});

test("US#3 – Un mauvais mot de passe affiche une erreur claire", async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL!;
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill("mauvais-mot-de-passe");
  await page.getByRole("button", { name: "Se connecter" }).click();

  await expect(
    page.getByText("Email ou mot de passe incorrect.")
  ).toBeVisible({ timeout: 15000 });
});
