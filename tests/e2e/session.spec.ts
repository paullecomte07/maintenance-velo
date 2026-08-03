import { expect, test } from "@playwright/test";

// Tests E2E — US#42 (Rester connecté sans être déconnecté au hasard)
// Scénario: Être renvoyé depuis la page de connexion sans perdre sa session
//   Étant donné que je suis connecté
//   Quand j'ouvre la page de connexion
//   Alors je suis renvoyé vers mes vélos
//   Et une page protégée reste accessible juste après
// Scénario: Naviguer entre pages protégées ne déconnecte pas
//   Étant donné que je suis connecté
//   Quand j'enchaîne plusieurs pages protégées
//   Alors je reste connecté sur chacune d'elles
// Scénario: Un visiteur non connecté reste renvoyé vers le login
//   Étant donné que je ne suis pas connecté
//   Quand j'ouvre la page Mon compte
//   Alors je suis redirigé vers la page de connexion

// Ce que ces tests attrapent : une redirection du middleware qui jetterait les
// cookies de session au lieu de les reporter. Ce qu'ils n'attrapent pas : le
// moment précis où le jeton se rafraîchit, qui dépend de son expiration et ne
// se provoque pas depuis un test. La perte de session n'était visible qu'à cet
// instant-là — d'où un symptôme intermittent, et une couverture partielle
// assumée sur cette US.

test("US#42 – Être renvoyé depuis la page de connexion sans perdre sa session", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(page).toHaveURL(/\/bikes/, { timeout: 15000 });

  // C'est l'étape qui compte : si la redirection avait perdu les cookies, la
  // requête suivante repartirait vers /login.
  await page.goto("/account");
  await expect(page).toHaveURL(/\/account/);
  await expect(page.getByRole("heading", { name: "Mon compte" })).toBeVisible();
});

test("US#42 – Naviguer entre pages protégées ne déconnecte pas", async ({
  page,
}) => {
  for (const path of ["/bikes", "/account", "/bikes"]) {
    await page.goto(path);
    await expect(page).not.toHaveURL(/\/login/);
  }

  await expect(page.getByRole("heading", { name: "Mes vélos" })).toBeVisible();
});

test.describe("Visiteur non connecté", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("US#42 – Un visiteur non connecté reste renvoyé vers le login", async ({
    page,
  }) => {
    await page.goto("/account");
    await expect(page).toHaveURL(/\/login/);
  });
});
