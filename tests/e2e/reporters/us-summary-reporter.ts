import type {
  Reporter,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import fs from "node:fs";
import path from "node:path";

// Reporter maison : à partir des titres de tests préfixés « US#N – … »,
// produit un tableau récapitulatif « US → scénario → état » injecté dans le
// résumé du run GitHub Actions ($GITHUB_STEP_SUMMARY) et écrit en local
// (playwright-report/us-summary.md) pour vérification hors CI.

type Row = {
  us: number;
  scenario: string;
  status: TestResult["status"];
  order: number;
};

const GLYPH: Record<string, string> = {
  passed: "✓",
  failed: "✗",
  timedOut: "✗",
  interrupted: "✗",
  skipped: "⊘",
};

class USSummaryReporter implements Reporter {
  private rows = new Map<string, Row>();
  private counter = 0;

  onTestEnd(test: TestCase, result: TestResult) {
    const match = test.title.match(/US#(\d+)/);
    if (!match) return; // on ignore les tests non rattachés à une US
    const us = Number(match[1]);
    const scenario = test.title.replace(/^US#\d+\s*[–-]\s*/, "").trim();
    // clé = test.id : en cas de retry, la dernière tentative écrase.
    this.rows.set(test.id, { us, scenario, status: result.status, order: this.counter++ });
  }

  onEnd() {
    if (this.rows.size === 0) return;

    const rows = Array.from(this.rows.values()).sort(
      (a, b) => a.us - b.us || a.order - b.order
    );

    const usLink = (n: number) => {
      const server = process.env.GITHUB_SERVER_URL;
      const repo = process.env.GITHUB_REPOSITORY;
      return server && repo ? `[#${n}](${server}/${repo}/issues/${n})` : `#${n}`;
    };

    const passed = rows.filter((r) => r.status === "passed").length;
    const failed = rows.length - passed;

    const md = [
      "## Couverture des tests E2E par US",
      "",
      "| US | Scénario | État |",
      "| --- | --- | --- |",
      ...rows.map(
        (r) => `| ${usLink(r.us)} | ${r.scenario} | ${GLYPH[r.status] ?? r.status} |`
      ),
      "",
      `**${passed} ✓ / ${failed} ✗ sur ${rows.length} scénarios**`,
      "",
    ].join("\n");

    if (process.env.GITHUB_STEP_SUMMARY) {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + "\n");
    }
    fs.mkdirSync("playwright-report", { recursive: true });
    fs.writeFileSync(path.join("playwright-report", "us-summary.md"), md + "\n");
    console.log("\n" + md);
  }
}

export default USSummaryReporter;
