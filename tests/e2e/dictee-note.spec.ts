import { expect, test, type Page } from "@playwright/test";

import {
  createBike,
  deleteBike,
  openBike,
  openIntervention,
  pickChip,
  testBikeName,
} from "./support";

// Tests E2E — US#38 (Dicter la note d'une intervention au micro)
// Scénario: Dicter une note [US#38]
//   Étant donné que je planifie une intervention
//   Quand je démarre la dictée et que la reconnaissance renvoie du texte
//   Alors ce texte apparaît dans la note
// Scénario: La dictée complète la note au lieu de l'écraser [US#38]
//   Étant donné que j'ai déjà écrit du texte dans la note
//   Quand je dicte une phrase supplémentaire
//   Alors la note contient mon texte initial suivi de la phrase dictée
// Scénario: La note reste modifiable au clavier [US#38]
//   Étant donné que je viens de dicter une note
//   Quand je corrige le texte au clavier
//   Alors ma correction est conservée
// Scénario: Le bouton disparaît quand le navigateur ne sait pas écouter [US#38]
//   Étant donné un navigateur sans reconnaissance vocale
//   Quand j'ouvre le formulaire d'intervention
//   Alors aucun bouton micro n'est proposé
//   Et je peux saisir la note au clavier
// Scénario: Un micro refusé ne bloque rien [US#38]
//   Étant donné que je démarre la dictée
//   Quand l'accès au micro est refusé
//   Alors un message m'explique ce qui s'est passé
//   Et je peux toujours enregistrer l'intervention
//
// L'API Web Speech demande un micro réel et un service de reconnaissance
// distant : elle est donc remplacée par un double. Ces tests vérifient le
// CÂBLAGE — que le texte reconnu atterrit au bon endroit — et rien de la
// qualité de transcription, qui se juge à la main sur un vrai téléphone.
test.describe.configure({ mode: "serial" });

const bikeName = testBikeName("Dictée");
const chantier = "[TEST] Révision dictée";

/** Installe une reconnaissance vocale factice, avant tout script de la page. */
async function stubSpeech(page: Page, { erreur }: { erreur?: string } = {}) {
  await page.addInitScript(
    ({ erreur }) => {
      class FauxSpeechRecognition {
        lang = "";
        continuous = false;
        interimResults = false;
        onresult: ((e: unknown) => void) | null = null;
        onerror: ((e: unknown) => void) | null = null;
        onend: (() => void) | null = null;

        start() {
          setTimeout(() => {
            if (erreur) {
              this.onerror?.({ error: erreur });
              return;
            }
            const phrase =
              (window as unknown as { __dictee?: string }).__dictee ??
              "chaîne mesurée à zéro virgule sept cinq";
            const resultat = Object.assign([{ transcript: phrase }], {
              isFinal: true,
            });
            this.onresult?.({ resultIndex: 0, results: [resultat] });
            this.onend?.();
          }, 30);
        }

        stop() {
          this.onend?.();
        }
      }
      Object.defineProperty(window, "SpeechRecognition", {
        value: FauxSpeechRecognition,
        configurable: true,
      });
      Object.defineProperty(window, "webkitSpeechRecognition", {
        value: FauxSpeechRecognition,
        configurable: true,
      });
    },
    { erreur }
  );
}

/** Un navigateur qui ne sait pas écouter — Firefox, par exemple. */
async function stubSansSpeech(page: Page) {
  await page.addInitScript(() => {
    for (const nom of ["SpeechRecognition", "webkitSpeechRecognition"]) {
      Object.defineProperty(window, nom, {
        value: undefined,
        configurable: true,
      });
    }
  });
}

async function ouvrirFormulaire(page: Page) {
  await openBike(page, bikeName);
  await page.getByRole("button", { name: "Planifier une intervention" }).click();
  return page.getByRole("dialog");
}

test("US#4 – Créer un vélo de test (dictée)", async ({ page }) => {
  await createBike(page, bikeName);
});

test("US#38 – Dicter une note", async ({ page }) => {
  await stubSpeech(page);
  const dialog = await ouvrirFormulaire(page);

  await dialog.getByRole("button", { name: "Dicter la note" }).click();
  await expect(dialog.getByRole("textbox", { name: "Note" })).toHaveValue(
    /chaîne mesurée à zéro virgule sept cinq/
  );

  // La note dictée est bien celle qui part en base.
  await dialog.getByLabel(/Nom de l.intervention/).fill(chantier);
  await pickChip(dialog, "Pourquoi ce chantier ?", "Prévention");
  await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 15000 });

  await openIntervention(page, chantier);
  await expect(
    page.getByText(/chaîne mesurée à zéro virgule sept cinq/)
  ).toBeVisible();
});

test("US#38 – La dictée complète la note au lieu de l'écraser", async ({
  page,
}) => {
  await stubSpeech(page);
  const dialog = await ouvrirFormulaire(page);

  const note = dialog.getByRole("textbox", { name: "Note" });
  await note.fill("Constaté au démontage :");
  await dialog.getByRole("button", { name: "Dicter la note" }).click();

  await expect(note).toHaveValue(
    /^Constaté au démontage : chaîne mesurée à zéro virgule sept cinq$/
  );
});

test("US#38 – La note reste modifiable au clavier", async ({ page }) => {
  await stubSpeech(page);
  const dialog = await ouvrirFormulaire(page);

  const note = dialog.getByRole("textbox", { name: "Note" });
  await dialog.getByRole("button", { name: "Dicter la note" }).click();
  await expect(note).not.toHaveValue("");

  await note.fill("Texte corrigé à la main.");
  await expect(note).toHaveValue("Texte corrigé à la main.");
});

test("US#38 – Le bouton disparaît quand le navigateur ne sait pas écouter", async ({
  page,
}) => {
  await stubSansSpeech(page);
  const dialog = await ouvrirFormulaire(page);

  await expect(dialog.getByRole("button", { name: /Dicter/ })).toBeHidden();

  // Le champ reste utilisable : la dictée n'a jamais été un passage obligé.
  const note = dialog.getByRole("textbox", { name: "Note" });
  await note.fill("Saisie au clavier.");
  await expect(note).toHaveValue("Saisie au clavier.");
});

test("US#38 – Un micro refusé ne bloque rien", async ({ page }) => {
  await stubSpeech(page, { erreur: "not-allowed" });
  const dialog = await ouvrirFormulaire(page);

  await dialog.getByRole("button", { name: "Dicter la note" }).click();
  await expect(page.getByText(/Accès au micro refusé/)).toBeVisible();

  // Le formulaire fonctionne toujours.
  await dialog.getByLabel(/Nom de l.intervention/).fill("[TEST] Malgré tout");
  await pickChip(dialog, "Pourquoi ce chantier ?", "Prévention");
  await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 15000 });
});

test("US#4 – Supprimer le vélo de test (dictée)", async ({ page }) => {
  await deleteBike(page, bikeName);
});
