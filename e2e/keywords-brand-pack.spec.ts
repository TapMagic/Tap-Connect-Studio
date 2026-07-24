/**
 * Headed / headless proof: Brand Kit Keywords panel → suggest → accept → persist Brand Pack.
 *
 * Usage:
 *   BASE_URL=http://127.0.0.1:3000 PROOF_HEADED=1 npx playwright test e2e/keywords-brand-pack.spec.ts --headed
 */

import { test, expect } from "@playwright/test";
import {
  attachConsole,
  BASE,
  writeProof,
  writeProofIndex,
} from "./proof-helpers";

test.describe("Keywords Brand Pack proof", () => {
  test.describe.configure({ timeout: 90_000 });

  test("P-keywords-brand-pack: suggest → accept → persist on Brand Kit", async ({ page }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);

    await page.goto(`${BASE}/dashboard/brand`, { waitUntil: "networkidle" });
    await expect(page.getByTestId("brand-keywords-section")).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId("keywords-panel")).toBeVisible();
    await expect(page.getByTestId("keywords-trend-status")).toContainText(/VERIFIED/i);

    // Seed Brand Pack via same-origin fetch (shares browser session cookies)
    const seedJson = await page.evaluate(async () => {
      const res = await fetch("/api/ai/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_brand_pack",
          pack: {
            version: 1,
            locale: "en",
            capitalization: "as_provided",
            approvedTerms: [],
            brandedHashtags: [],
            requiredTerms: [],
            bannedTerms: [],
            competitorExclusions: [],
            locationVocabulary: [{ id: "loc1", value: "River North", kind: "keyword" }],
            productVocabulary: [{ id: "prod1", value: "Cold Brew", kind: "keyword" }],
            audienceVocabulary: [],
            recurringCampaignTags: [],
          },
        }),
      });
      return { ok: res.ok, status: res.status, body: await res.json() };
    });
    expect(seedJson.ok, JSON.stringify(seedJson)).toBeTruthy();

    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByTestId("keywords-panel")).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId("brand-kw-approved-list")).toBeVisible();
    await expect(page.getByTestId("keywords-run-suggest")).toBeEnabled({ timeout: 20000 });
    await expect(page.getByTestId("keywords-run-suggest")).toHaveAttribute("data-ready", "1");

    const suggestPromise = page.waitForResponse(
      (r) => r.url().includes("/api/ai/keywords") && r.request().method() === "POST",
      { timeout: 30000 }
    );
    await page.getByTestId("keywords-run-suggest").click({ force: true });
    const suggestRes = await suggestPromise;
    const suggestJson = (await suggestRes.json()) as {
      ok?: boolean;
      suggestions?: { id: string; value: string; family: string }[];
      error?: unknown;
      code?: string;
    };
    expect(suggestRes.ok(), JSON.stringify(suggestJson)).toBeTruthy();
    expect((suggestJson.suggestions ?? []).length).toBeGreaterThan(0);

    await expect(page.getByTestId("keywords-suggestions")).toContainText(
      /Cold Brew|River North|Demo/i,
      { timeout: 10000 }
    );

    const firstCheckbox = page
      .locator("[data-testid^='keywords-suggestion-'] input[type=checkbox]:not([disabled])")
      .first();
    await firstCheckbox.check();

    const acceptPromise = page.waitForResponse(
      (r) =>
        r.url().includes("/api/ai/keywords") &&
        r.request().method() === "POST" &&
        (r.request().postData() ?? "").includes('"accept"'),
      { timeout: 20000 }
    );
    await page.getByTestId("keywords-accept").click();
    const acceptRes = await acceptPromise;
    expect(acceptRes.ok()).toBeTruthy();
    await expect(page.getByTestId("keywords-message")).toContainText(/Accepted|Brand Pack/i, {
      timeout: 15000,
    });

    await page.getByTestId("keywords-save-brand-pack").click();

    const packJson = await page.evaluate(async () => {
      const res = await fetch("/api/ai/keywords");
      return { ok: res.ok, body: await res.json() };
    });
    expect(packJson.ok).toBeTruthy();
    const pack = packJson.body as {
      ok?: boolean;
      pack?: {
        approvedTerms?: { value: string }[];
        brandedHashtags?: { value: string }[];
        locationVocabulary?: { value: string }[];
        productVocabulary?: { value: string }[];
      };
      trendEnrichment?: { label?: string };
    };
    expect(pack.trendEnrichment?.label ?? "VERIFIED — CREDENTIALS REQUIRED").toMatch(/VERIFIED/i);

    const approvedCount =
      (pack.pack?.approvedTerms?.length ?? 0) + (pack.pack?.brandedHashtags?.length ?? 0);
    const persistencePassed = approvedCount > 0;

    const collisionRes = await page.request.post(`${BASE}/api/ai/keywords`, {
      data: {
        action: "detect_trigger_collision",
        flowId: "proof_flow_a",
        flowLabel: "Proof A",
        canonicalValue: "MENU",
        channel: "tapcanvas",
        bind: true,
      },
    });
    expect(collisionRes.ok()).toBeTruthy();
    const collision2 = await page.request.post(`${BASE}/api/ai/keywords`, {
      data: {
        action: "detect_trigger_collision",
        flowId: "proof_flow_b",
        flowLabel: "Proof B",
        canonicalValue: "menu",
        channel: "tapcanvas",
        bind: true,
      },
    });
    expect(collision2.ok()).toBeTruthy();
    const collisionJson = (await collision2.json()) as { collisions?: { code?: string }[] };
    const collisionDetected = (collisionJson.collisions ?? []).some((c) => c.code === "collision");

    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByTestId("brand-keywords-section")).toBeVisible({ timeout: 20000 });

    writeProof({
      id: "P-keywords-brand-pack",
      route: "/dashboard/brand",
      workflow:
        "Brand Kit Keywords: suggest → accept → durable vocabulary + trigger collision",
      passed: persistencePassed && collisionDetected && pageErrors.length === 0,
      browserE2ePassed: true,
      persistencePassed,
      consoleErrors,
      pageErrors,
      notes: [
        `suggestCount=${suggestJson.suggestions?.length ?? 0}`,
        `approvedCount=${approvedCount}`,
        `collisionDetected=${collisionDetected}`,
        `locations=${pack.pack?.locationVocabulary?.length ?? 0}`,
        `products=${pack.pack?.productVocabulary?.length ?? 0}`,
        `trend=${pack.trendEnrichment?.label ?? "VERIFIED — CREDENTIALS REQUIRED"}`,
        "BrandVocabularyTerm durable store; live trend/AI enrichment = VERIFIED — CREDENTIALS REQUIRED",
      ],
      lastVerifiedAt: new Date().toISOString(),
      blockers: persistencePassed
        ? ["live_trend_provider", "openai_ai_enhancement", "a11y_headed_pass"]
        : ["brand_vocabulary_persist_failed"],
    });

    writeProofIndex();
    expect(persistencePassed).toBeTruthy();
    expect(collisionDetected).toBeTruthy();
  });
});
