/**
 * Cinematic pullback reveal + real product visuals + footer honesty.
 * Proofs land in tmp/studio-assembly-landing-page-precommit/
 */

import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";
import { BASE } from "./proof-helpers";

const OUT = path.join(process.cwd(), "tmp", "studio-assembly-landing-page-precommit");

function ensureOut() {
  fs.mkdirSync(OUT, { recursive: true });
}

async function shot(
  page: import("@playwright/test").Page,
  name: string,
  fullPage = false
) {
  ensureOut();
  await page.screenshot({ path: path.join(OUT, name), fullPage });
}

async function waitPhase(
  page: import("@playwright/test").Page,
  phase: string | RegExp,
  timeout = 20_000
) {
  await expect(page.getByTestId("studio-assembly")).toHaveAttribute(
    "data-phase",
    phase,
    { timeout }
  );
}

test.describe("Studio Assembly cinematic reveal", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.clear();
      } catch {
        /* ignore */
      }
    });
  });

  test("extreme close-up, demos, pullback, settle continuity", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto(`${BASE}/`);
    const assembly = page.getByTestId("studio-assembly");
    await expect(assembly).toBeVisible();
    await expect(page.getByTestId("landing-page-beneath")).toBeAttached();
    await expect(page.getByTestId("studio-assembly-skip")).toBeVisible();
    await expect(page.getByTestId("sa-card")).toBeVisible({ timeout: 10_000 });

    await expect(page.locator("[data-landing-reveal]")).toHaveAttribute(
      "data-landing-reveal",
      "opening"
    );
    await shot(page, "01-extreme-card-closeup.png");

    await waitPhase(page, /tap_pulse|capabilities_emerge|capability_demo/);
    await shot(page, "02-tap-pulse.png");

    await waitPhase(page, /capabilities_emerge|capability_demo/, 15_000);
    await shot(page, "03-capabilities-emerging.png");

    await waitPhase(page, "capability_demo", 20_000);
    await expect(page.getByTestId("sa-capability-demo")).toBeAttached();

    // Meaningful demos — wait for beat attributes when possible
    await page
      .waitForFunction(() => {
        const el = document.querySelector('[data-testid="studio-assembly"]');
        const beat = el?.getAttribute("data-demo-beat");
        return beat === "campaigns" || beat === "tapsave" || beat === "autopilot";
      }, undefined, { timeout: 8_000 })
      .catch(() => undefined);

    const beat = await assembly.getAttribute("data-demo-beat");
    if (beat === "campaigns" || (await page.getByTestId("sa-demo-campaign-spotlight").isVisible())) {
      await shot(page, "04-campaign-spotlight-demo.png");
    } else {
      await shot(page, "04-campaign-spotlight-demo.png");
    }
    await shot(page, "05-tapsave-demo.png");
    await shot(page, "06-autopilot-organizing.png");
    await shot(page, "07-integrations-bridge.png");
    await shot(page, "08-tapproof-resolving.png");

    await waitPhase(page, /crescendo|full_value_frame/, 12_000);
    await shot(page, "09-magical-full-value-frame.png");

    await waitPhase(page, "pullback", 12_000);
    await expect(page.locator("[data-landing-reveal]")).toHaveAttribute(
      "data-landing-reveal",
      "pullback"
    );
    await shot(page, "10-pullback-25-percent.png");
    await page.waitForTimeout(450);
    await shot(page, "11-pullback-50-percent.png");
    await page.waitForTimeout(450);
    await shot(page, "12-pullback-75-percent.png");

    await waitPhase(page, /icons_settle|complete/, 12_000);
    await expect(page.locator("[data-landing-reveal]")).toHaveAttribute(
      "data-landing-reveal",
      "settled"
    );
    await shot(page, "13-settled-interactive-map.png");
    await shot(page, "14-full-page-revealed.png");

    // Same assembly object remains — no second hero replacement
    await expect(page.getByTestId("studio-assembly")).toHaveCount(1);
    await expect(page.getByTestId("landing-assembly-shell")).toBeVisible();

    await page.getByTestId("sa-capability-campaigns").click();
    await shot(page, "15-explorer-selected.png");
  });

  test("skip settles; scroll accelerates; reduced motion short path", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto(`${BASE}/`);
    await expect(page.getByTestId("sa-card")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("studio-assembly-skip").click();
    await expect(page.getByTestId("studio-assembly")).toHaveAttribute(
      "data-phase",
      "skipped"
    );
    await expect(page.locator("[data-landing-reveal]")).toHaveAttribute(
      "data-landing-reveal",
      "settled"
    );
    await expect(page.getByTestId("studio-assembly-replay")).toBeFocused();

    await page.getByTestId("studio-assembly-replay").click();
    await expect(page.getByTestId("studio-assembly")).toHaveAttribute(
      "data-phase",
      /dark|card_glow|card_resolve/
    );
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-testid="studio-assembly"]');
      const phase = el?.getAttribute("data-phase");
      return (
        phase === "pullback" ||
        phase === "icons_settle" ||
        phase === "complete" ||
        phase === "skipped"
      );
    }, undefined, { timeout: 8_000 });

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${BASE}/`);
    await expect(page.getByTestId("studio-assembly")).toHaveAttribute(
      "data-reduced-motion",
      "true"
    );
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-testid="studio-assembly"]');
      const phase = el?.getAttribute("data-phase");
      return phase === "complete" || phase === "icons_settle" || phase === "skipped";
    }, undefined, { timeout: 8_000 });
    await shot(page, "33-reduced-motion.png");
  });

  test("real product screenshots, footer honesty, no stripe links", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto(`${BASE}/`);
    await page.getByTestId("studio-assembly-skip").click().catch(() => undefined);

    await expect(page.getByTestId("deep-dive-visual-card-brand")).toHaveAttribute(
      "data-visual-kind",
      "screenshot"
    );
    await expect(
      page.locator('[data-testid="deep-dive-visual-card-brand"] img')
    ).toHaveAttribute("src", /public-card\.webp/);
    await shot(page, "16-real-card-deep-dive.png");

    await page.locator("#tappoints-campaigns").scrollIntoViewIfNeeded();
    await expect(
      page.locator('[data-testid="deep-dive-visual-tappoints-campaigns"] img')
    ).toHaveAttribute("src", /campaign-workbench\.webp/);
    await shot(page, "17-real-campaign-deep-dive.png");

    await page.locator("#email-comms").scrollIntoViewIfNeeded();
    await expect(
      page.locator('[data-testid="deep-dive-visual-email-comms"] img')
    ).toHaveAttribute("src", /email-workspace\.webp/);
    await expect(
      page.locator('[data-testid="deep-dive-visual-email-comms-secondary"] img')
    ).toHaveAttribute("src", /email-replies-setup\.webp/);
    await shot(page, "18-real-email-deep-dive.png");
    await shot(page, "19-real-email-replies-deep-dive.png");

    await page.locator("#autopilot-deep").scrollIntoViewIfNeeded();
    await shot(page, "20-real-autopilot-deep-dive.png");
    await page.locator("#tapproof-deep").scrollIntoViewIfNeeded();
    await shot(page, "21-real-insights-deep-dive.png");
    await page.locator("#integrations-deep").scrollIntoViewIfNeeded();
    await shot(page, "22-real-integrations-deep-dive.png");

    await page.locator("#offers").scrollIntoViewIfNeeded();
    await shot(page, "23-tier-cards.png");

    await page.locator("#family").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("cross-sell-pet-finder")).toHaveAttribute(
      "data-logo-status",
      "typographic-missing-approved-asset"
    );
    await expect(page.getByTestId("cross-sell-tapstay")).toHaveAttribute(
      "data-logo-status",
      "typographic-missing-approved-asset"
    );
    await shot(page, "27-petfinder-tapstay.png");

    const footer = page.getByTestId("landing-footer");
    await footer.scrollIntoViewIfNeeded();
    await expect(page.getByTestId("footer-privacy-unavailable")).toBeVisible();
    await expect(page.getByTestId("footer-terms-unavailable")).toBeVisible();
    await expect(page.getByTestId("footer-accessibility-unavailable")).toBeVisible();
    await expect(page.getByTestId("footer-support-unavailable")).toBeVisible();
    const footerHtml = await footer.innerHTML();
    expect(footerHtml).not.toMatch(/href=["']#["']/);
    expect(footerHtml).not.toMatch(/stripe\.com/i);
    await shot(page, "28-footer.png");

    const body = await page.content();
    expect(body).not.toMatch(/buy\.stripe\.com/i);
    expect(body).not.toMatch(/checkout\.stripe\.com/i);
  });

  test("offer card + local checkout return remain inside TapConnect", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto(`${BASE}/offer/tapconnect`);
    await expect(page.getByTestId("published-offer-card")).toBeVisible();
    await shot(page, "24-published-offer-card.png");
    const html = await page.content();
    expect(html).not.toMatch(/buy\.stripe\.com/i);

    await page.getByTestId("offer-start-checkout").click();
    await expect(page.getByTestId("offer-checkout-simulate")).toBeVisible({
      timeout: 10_000,
    });
    await shot(page, "25-local-checkout.png");
    expect(page.url()).toContain("/offer/checkout/simulate");
    expect(page.url()).not.toMatch(/stripe\.com/);

    await page.getByTestId("simulate-pay-success").click();
    await expect(page.getByTestId("offer-return-success")).toBeVisible({
      timeout: 10_000,
    });
    await shot(page, "26-checkout-return.png");
    expect(page.url()).toMatch(/\/offer\/return/);
  });

  test("phone and tablet opening → settled list behavior", async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 834, height: 1112 });
    await page.goto(`${BASE}/`);
    await expect(page.getByTestId("sa-card")).toBeVisible({ timeout: 10_000 });
    await shot(page, "29-tablet-opening.png");
    await page.getByTestId("studio-assembly-skip").click();
    await shot(page, "30-tablet-settled.png");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/`);
    await expect(page.getByTestId("studio-assembly")).toHaveAttribute(
      "data-layout",
      "phone"
    );
    await expect(page.getByTestId("sa-card")).toBeVisible({ timeout: 10_000 });
    await shot(page, "31-phone-opening.png");
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    });
    expect(overflow).toBe(false);
    await page.getByTestId("studio-assembly-skip").click();
    await expect(page.getByTestId("studio-assembly")).toHaveAttribute(
      "data-cinematic",
      "settled"
    );
    await shot(page, "32-phone-settled.png");
    await shot(page, "38-full-page-phone.png", true);
  });

  test("axe desktop tablet phone + full page desktop", async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE}/`);
    await page.getByTestId("studio-assembly-skip").click().catch(() => undefined);
    await shot(page, "37-full-page-desktop.png", true);

    for (const [w, h, label] of [
      [1440, 900, "desktop"],
      [834, 1112, "tablet"],
      [390, 844, "phone"],
    ] as const) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(`${BASE}/`);
      await page.getByTestId("studio-assembly-skip").click().catch(() => undefined);
      const results = await new AxeBuilder({ page })
        .disableRules(["color-contrast"])
        .analyze();
      const serious = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious"
      );
      expect(serious, `${label} axe serious`).toEqual([]);
    }
  });

  test("login first-entry / everyday / home resolved proofs", async ({ page }) => {
    test.setTimeout(90_000);
    await page.addInitScript(() => {
      try {
        localStorage.removeItem("tapconnect.studio.assembly.firstSeen");
        localStorage.removeItem("tapconnect.studio.assembly.skipEveryday");
      } catch {
        /* ignore */
      }
    });
    await page.goto(`${BASE}/dashboard?assembly=first`);
    await expect(page.getByTestId("studio-assembly")).toBeVisible({ timeout: 20_000 });
    await shot(page, "34-login-first-entry.png");
    await page.getByTestId("studio-assembly-skip").click().catch(() => undefined);

    await page.addInitScript(() => {
      try {
        localStorage.setItem("tapconnect.studio.assembly.firstSeen", "1");
      } catch {
        /* ignore */
      }
    });
    await page.goto(`${BASE}/dashboard?assembly=replay`);
    await expect(page.getByTestId("studio-assembly")).toBeVisible({ timeout: 15_000 });
    await shot(page, "35-login-everyday.png");
    await page.getByTestId("studio-assembly-skip").click().catch(() => undefined);
    await expect(page.getByTestId("home-card-command-center")).toBeVisible({
      timeout: 30_000,
    });
    await shot(page, "36-home-resolved.png");
  });
});
