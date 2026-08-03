import { expect, test, type Page } from "@playwright/test";

import {
  addPiece,
  createBike,
  deleteBike,
  openBike,
  openIntervention,
  planifierIntervention,
  testBikeName,
} from "./support";

// Tests E2E — US#28 (Donner à l'application une identité visuelle)
// Scénario: La police du projet est réellement appliquée [US#28]
//   Étant donné que je suis sur n'importe quelle page de l'application
//   Quand j'inspecte la police effective du corps de page
//   Alors c'est la police Geist chargée par le projet
//   Et ce n'est plus Arial
// Scénario: L'action principale se distingue des actions secondaires [US#28]
//   Étant donné que je suis sur la fiche d'un vélo
//   Quand je compare le bouton principal aux boutons secondaires
//   Alors le bouton principal porte la couleur d'accent
//   Et les boutons secondaires restent neutres
// Scénario: Les états constatés sont visuellement distincts [US#28]
//   Étant donné qu'un chantier contient une action par état possible
//   Quand je consulte la fiche de ce chantier
//   Alors les pastilles des états ont des couleurs différentes
//   Et chaque pastille affiche aussi son libellé en toutes lettres
// Scénario: Le texte reste lisible partout [US#28]
//   Étant donné que je suis sur la fiche d'un vélo
//   Quand je mesure le contraste de chaque texte face à son fond
//   Alors tous atteignent le seuil WCAG AA
//
// Ce que ces tests NE couvrent PAS : l'équilibre visuel, la justesse des
// teintes, l'harmonie de l'ensemble. Ça relève du jugement, se regarde sur la
// planche `00-fondations` et pas dans une assertion.
test.describe.configure({ mode: "serial" });

const bikeName = testBikeName("Identité");
const chantier = "[TEST] Révision palette";

/** Mesure le contraste de chaque texte de la page face à son fond réel. */
async function contrastesInsuffisants(page: Page) {
  return page.evaluate(() => {
    const parse = (s: string) => {
      const m = s.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
      return [p[0], p[1], p[2], p[3] === undefined ? 1 : p[3]] as const;
    };
    const lum = ([r, g, b]: readonly number[]) => {
      const f = (v: number) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const over = (fg: readonly number[], bg: readonly number[]) => {
      const a = fg[3];
      return [
        fg[0] * a + bg[0] * (1 - a),
        fg[1] * a + bg[1] * (1 - a),
        fg[2] * a + bg[2] * (1 - a),
        1,
      ] as const;
    };
    const pageBg = parse(getComputedStyle(document.body).backgroundColor) ?? [
      255, 255, 255, 1,
    ];
    const bgOf = (el: Element) => {
      let n: Element | null = el;
      const pile: (readonly number[])[] = [];
      while (n) {
        const c = parse(getComputedStyle(n).backgroundColor);
        if (c && c[3] > 0) pile.push(c);
        n = n.parentElement;
      }
      let acc: readonly number[] = [pageBg[0], pageBg[1], pageBg[2], 1];
      for (let i = pile.length - 1; i >= 0; i--) acc = over(pile[i], acc);
      return acc;
    };

    const echecs: { texte: string; px: number; ratio: number; seuil: number }[] =
      [];
    for (const el of Array.from(document.querySelectorAll("body *"))) {
      const texte = Array.from(el.childNodes)
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent?.trim() ?? "")
        .join("");
      if (!texte) continue;
      const cs = getComputedStyle(el);
      if (
        cs.display === "none" ||
        cs.visibility === "hidden" ||
        parseFloat(cs.opacity) === 0
      )
        continue;
      const fg = parse(cs.color);
      if (!fg) continue;
      const bg = bgOf(el);
      const c = over(fg, bg);
      const l1 = lum(c);
      const l2 = lum(bg);
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      const px = parseFloat(cs.fontSize);
      const grand = px >= 24 || (px >= 18.66 && parseInt(cs.fontWeight, 10) >= 700);
      const seuil = grand ? 3 : 4.5;
      if (ratio < seuil)
        echecs.push({ texte: texte.slice(0, 40), px, ratio: +ratio.toFixed(2), seuil });
    }
    return echecs;
  });
}

test("US#4 – Créer un vélo de test (identité)", async ({ page }) => {
  await createBike(page, bikeName, { mileageKm: 4795 });
});

test("US#28 – La police du projet est réellement appliquée", async ({
  page,
}) => {
  await openBike(page, bikeName);

  const police = await page.evaluate(
    () => getComputedStyle(document.body).fontFamily
  );
  // Next renomme la police locale : on cherche sa racine, pas un nom exact.
  expect(police.toLowerCase()).toContain("geist");
  expect(police.toLowerCase()).not.toContain("arial");
  expect(police.toLowerCase()).not.toContain("times");
});

test("US#28 – L'action principale se distingue des actions secondaires", async ({
  page,
}) => {
  await openBike(page, bikeName);
  await planifierIntervention(page, chantier);
  await openIntervention(page, chantier);

  const fond = (nom: string) =>
    page
      .getByRole("button", { name: nom })
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor);

  // L'accent du projet : #1c5cab.
  expect(await fond("Ajouter une action")).toBe("rgb(28, 92, 171)");
  // Les gestes secondaires restent neutres, pour ne pas diluer l'attention.
  // Depuis US#46, « Renommer » et « Supprimer » ne sont plus des boutons : le
  // geste secondaire visible de cet écran est le menu des réglages.
  expect(await fond("Réglages de l'intervention")).not.toBe(
    "rgb(28, 92, 171)"
  );
});

test("US#28 – Les états constatés sont visuellement distincts", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await openBike(page, bikeName);
  await openIntervention(page, chantier);

  const etats = ["Neuf", "Usure normale", "Usure prématurée", "HS"];
  const pieces = ["[TEST] Selle", "[TEST] Chaîne", "[TEST] Pneus", "[TEST] Cintre"];
  const systemes = ["Assise", "Transmission", "Roue avant", "Direction"];

  for (let i = 0; i < etats.length; i++) {
    await addPiece(page, {
      titre: pieces[i],
      systeme: systemes[i],
      etat: etats[i],
      nature: "Inspection",
    });
  }

  const couleurs = new Set<string>();
  for (const etat of etats) {
    const badge = page.getByText(etat, { exact: true }).first();
    // Le libellé est écrit en toutes lettres : la couleur ne porte jamais
    // le sens seule.
    await expect(badge).toBeVisible();
    couleurs.add(
      await badge.evaluate(
        (el) => `${getComputedStyle(el).color}|${getComputedStyle(el).backgroundColor}`
      )
    );
  }
  expect(couleurs.size).toBe(etats.length);
});

test("US#28 – Le texte reste lisible partout", async ({ page }) => {
  // La fiche du chantier porte le plus de pastilles colorées de toute
  // l'application : c'est là que le risque est le plus élevé.
  await openBike(page, bikeName);
  await openIntervention(page, chantier);
  expect(await contrastesInsuffisants(page)).toEqual([]);

  // Puis la fiche vélo, avec ses causes et ses états d'intervention.
  await openBike(page, bikeName);
  expect(await contrastesInsuffisants(page)).toEqual([]);
});

test("US#4 – Supprimer le vélo de test (identité)", async ({ page }) => {
  await deleteBike(page, bikeName);
});
