import { expect, test as setup } from "@playwright/test";

const authFile = "playwright/.auth/user.json";

// Tests E2E — US#3 (Connexion)
// Scénario: Connexion réussie avec des identifiants valides
//   Étant donné que je suis sur la page de connexion
//   Quand je saisis un email et un mot de passe valides
//   Alors j'accède à la liste de mes vélos
//
// Se connecte une fois avec le compte de test et sauvegarde la session,
// réutilisée ensuite par tous les tests authentifiés.
setup("US#3 – Connexion réussie avec des identifiants valides", async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "TEST_USER_EMAIL et TEST_USER_PASSWORD doivent être définis dans .env.local"
    );
  }

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();

  await expect(page).toHaveURL(/\/bikes/, { timeout: 15000 });

  await page.context().storageState({ path: authFile });
});
