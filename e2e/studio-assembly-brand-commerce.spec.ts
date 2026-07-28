/**
 * Brand / commercial journey completion proofs for Studio Assembly landing.
 */

import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";
import { BASE } from "./proof-helpers";

const OUT = path.join(process.cwd(), "tmp", "studio-assembly-landing-page");

function ensureOut() {
  fs.mkdirSync(OUT, { recursive: true });
}

async function shot(page: import("@playwright/test").Page, name: string, fullPage = false) {
  ensureOut();
  await page.screenshot({ path: path.join(OUT, name), fullPage });
}

test.describe("Brand system + commercial journey completion", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.clear();
      } catch {
        /* ignore */
      }
    });
  });

  test("landing content, static map, deep dives, tiers, family, no Stripe links", async ({
    page,
  }) => {
    await page.goto(`${BASE}/`);
    await expect(page.getByTestId("card-centered-landing")).toBeVisible();
    await page.getByTestId("studio-assembly-skip").click().catch(() => undefined);

    await expect(page.getByTestId("landing-static-map-section")).toBeVisible();
    await expect(page.getByTestId("static-platform-map")).toBeVisible();
    await expect(page.getByTestId("map-central-card")).toBeVisible();
    await expect(page.getByTestId("map-trust-underlay")).toBeVisible();
    await shot(page, "03-landing-static-platform-map.png");

    await expect(page.getByTestId("operating-ideas")).toBeVisible();
    await shot(page, "06-landing-create-connect-keep-operate-prove.png");

    await expect(page.getByTestId("landing-deep-dives")).toBeVisible();
    await expect(page.getByTestId("deep-dive-card-brand")).toBeVisible();
    await shot(page, "07-landing-card-brand-deep-dive.png");
    await shot(page, "08-landing-campaign-deep-dive.png");
    await page.locator("#tapsave-relationships").scrollIntoViewIfNeeded();
    await shot(page, "09-landing-tapsave-relationships.png");
    await page.locator("#email-comms").scrollIntoViewIfNeeded();
    await shot(page, "10-landing-email-communications.png");
    await page.locator("#autopilot-deep").scrollIntoViewIfNeeded();
    await shot(page, "11-landing-autopilot.png");
    await page.locator("#integrations-deep").scrollIntoViewIfNeeded();
    await shot(page, "12-landing-integrations.png");
    await page.locator("#tapproof-deep").scrollIntoViewIfNeeded();
    await shot(page, "13-landing-tapproof.png");

    await page.getByTestId("selector-tapconnect").click();
    await shot(page, "14-landing-tapconnect-selector.png");
    await page.getByTestId("selector-studio").click();
    await shot(page, "15-landing-studio-selector.png");

    await expect(page.getByTestId("landing-tier-cards")).toBeVisible();
    await expect(page.getByTestId("tier-card-tapconnect")).toBeVisible();
    await expect(page.getByTestId("tier-cta-tapconnect")).toHaveAttribute(
      "href",
      "/offer/tapconnect"
    );
    await expect(page.getByTestId("tier-cta-studio")).toHaveAttribute("href", "/offer/studio");
    await shot(page, "16-landing-tier-cards.png");

    await expect(page.getByTestId("landing-family-cross-sell")).toBeVisible();
    await expect(page.getByTestId("cross-sell-pet-finder-cta")).toBeVisible();
    await expect(page.getByTestId("cross-sell-tapstay-cta")).toBeVisible();
    const pet = await page.getByTestId("cross-sell-pet-finder-cta").getAttribute("href");
    const stay = await page.getByTestId("cross-sell-tapstay-cta").getAttribute("href");
    expect(pet ?? "").not.toMatch(/stripe\.com|buy\.stripe/i);
    expect(stay ?? "").not.toMatch(/stripe\.com|buy\.stripe/i);
    await shot(page, "20-landing-pet-finder-tapstay.png");

    await expect(page.getByTestId("landing-footer")).toBeVisible();
    await shot(page, "21-landing-footer.png");

    const html = await page.content();
    expect(html).not.toMatch(/https?:\/\/(buy\.)?stripe\.com/i);
    expect(html).not.toMatch(/payment.?link/i);

    await page.getByTestId("explorer-cap-brand").click();
    await shot(page, "04-landing-explorer-brand.png");
    await page.getByTestId("explorer-cap-campaigns").click();
    await shot(page, "05-landing-explorer-campaign.png");

    await shot(page, "full-page-desktop.png", true);
  });

  test("published offer Card owns checkout; return verifies locally", async ({ page }) => {
    await page.goto(`${BASE}/offer/tapconnect`);
    await expect(page.getByTestId("published-offer-card")).toBeVisible();
    await expect(page.getByTestId("offer-display-name")).toContainText(/TapConnect/i);
    await expect(page.getByTestId("offer-price-placeholder")).toBeVisible();
    await shot(page, "17-published-offer-card.png");

    await page.getByTestId("offer-start-checkout").click();
    await expect(page.getByTestId("offer-checkout-simulate")).toBeVisible({ timeout: 10_000 });
    await shot(page, "18-local-checkout-initiation.png");
    expect(page.url()).toContain("/offer/checkout/simulate");
    expect(page.url()).not.toMatch(/stripe\.com/);

    await page.getByTestId("simulate-pay-success").click();
    await expect(page.getByTestId("offer-return-success")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("offer-return-continue")).toBeVisible();
    await shot(page, "19-checkout-return.png");
  });

  test("cancel returns to offer Card", async ({ page }) => {
    await page.goto(`${BASE}/offer/studio`);
    await page.getByTestId("offer-start-checkout").click();
    await page.getByTestId("simulate-pay-cancel").click();
    await expect(page.getByTestId("published-offer-card")).toBeVisible();
    await expect(page.getByTestId("offer-canceled-notice")).toBeVisible();
  });

  test("responsive + branded nav icons + reduced motion", async ({ page }) => {
    await page.setViewportSize({ width: 834, height: 1112 });
    await page.goto(`${BASE}/`);
    await page.getByTestId("studio-assembly-skip").click().catch(() => undefined);
    await shot(page, "22-landing-tablet.png");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/`);
    await page.getByTestId("studio-assembly-skip").click().catch(() => undefined);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
    );
    expect(overflow).toBe(false);
    await shot(page, "23-landing-phone.png");
    await shot(page, "full-page-phone.png", true);

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${BASE}/`);
    await expect(page.getByTestId("studio-assembly")).toHaveAttribute(
      "data-reduced-motion",
      "true"
    );
    await shot(page, "27-reduced-motion.png");

    await page.addInitScript(() => {
      try {
        localStorage.setItem("tapconnect.studio.assembly.skipEveryday", "1");
        localStorage.setItem("tapconnect.studio.assembly.firstSeen", "1");
      } catch {
        /* ignore */
      }
    });
    await page.goto(`${BASE}/dashboard`);
    await expect(page.getByTestId("home-card-command-center")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("nav-icon-home")).toBeVisible();
    await shot(page, "26-nav-branded-icons.png");
    await shot(page, "25-login-home-resolved.png");

    await page.goto(`${BASE}/dashboard?assembly=replay`);
    await expect(page.getByTestId("studio-assembly")).toBeVisible({ timeout: 15_000 });
    await shot(page, "24-login-assembly-icons.png");
  });

  test("hero assembly frames + axe", async ({ page }) => {
    await page.goto(`${BASE}/`);
    await expect(page.getByTestId("sa-card")).toBeVisible({ timeout: 8000 });
    await shot(page, "01-landing-hero-card-alone.png");
    await page.waitForTimeout(5000);
    await shot(page, "02-landing-assembly-full.png");

    for (const size of [
      { w: 1280, h: 800 },
      { w: 834, h: 1112 },
      { w: 390, h: 844 },
    ]) {
      await page.setViewportSize({ width: size.w, height: size.h });
      await page.goto(`${BASE}/`);
      await page.getByTestId("studio-assembly-skip").click().catch(() => undefined);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      const bad = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical"
      );
      expect(bad, bad.map((b) => b.id).join(",")).toEqual([]);
    }
  });
});
