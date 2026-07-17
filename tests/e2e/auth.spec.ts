import { expect, test } from "@playwright/test";

// Ces tests vérifient les accès NON connectés : on ignore la session
// sauvegardée par le setup.
test.use({ storageState: { cookies: [], origins: [] } });

test("un visiteur non connecté est redirigé vers le login", async ({
  page,
}) => {
  await page.goto("/bikes");
  await expect(page).toHaveURL(/\/login/);
});

test("un mauvais mot de passe affiche une erreur claire", async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL!;
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill("mauvais-mot-de-passe");
  await page.getByRole("button", { name: "Se connecter" }).click();

  await expect(
    page.getByText("Email ou mot de passe incorrect.")
  ).toBeVisible({ timeout: 15000 });
});
