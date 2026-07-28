/**
 * Studio Assembly + Card-centered landing — Playwright proofs.
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

async function shot(page: import("@playwright/test").Page, name: string) {
  ensureOut();
  await page.screenshot({
    path: path.join(OUT, name),
    fullPage: false,
  });
}

test.describe("Studio Assembly landing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.clear();
      } catch {
        /* ignore */
      }
    });
  });

  test("landing renders without requiring animation; SEO headings present", async ({
    page,
  }) => {
    await page.goto(`${BASE}/`);
    await expect(page.getByTestId("card-centered-landing")).toBeVisible();
    await expect(page.getByTestId("landing-hero").getByRole("heading", { level: 1 })).toContainText(
      /Card/i
    );
    await expect(page.getByTestId("operating-ideas")).toBeVisible();
    await expect(page.getByTestId("product-explorer")).toBeVisible();
    await expect(page.getByTestId("tapconnect-studio-selector")).toBeVisible();
    await expect(page.getByTestId("integrations-section")).toBeVisible();
    await expect(page.getByTestId("autopilot-section")).toBeVisible();
    await expect(page.getByTestId("tapproof-section")).toBeVisible();
    await expect(page.getByTestId("use-case-small-business")).toBeVisible();
    await expect(page.getByTestId("use-case-established-monday")).toBeVisible();
    await expect(page.getByTestId("final-cta")).toBeVisible();
    await expect(page.getByTestId("landing-primary-cta")).toBeVisible();
    await expect(page.getByAltText(/Tap Connect|TapConnect/i).first()).toBeVisible();
    await expect(page.getByText(/Powered by Tap The Magic/i).first()).toBeVisible();
  });

  test("Card appears first; skip and replay work; no uniqueness claims", async ({
    page,
  }) => {
    await page.goto(`${BASE}/`);
    const assembly = page.getByTestId("studio-assembly");
    await expect(assembly).toBeVisible();
    await expect(page.getByTestId("studio-assembly-skip")).toBeVisible();
    // Card should resolve early
    await expect(page.getByTestId("sa-card")).toBeVisible({ timeout: 8000 });
    await page.getByTestId("studio-assembly-skip").click();
    await expect(page.getByTestId("studio-assembly-replay")).toBeVisible();
    await page.getByTestId("studio-assembly-replay").click();
    await expect(assembly).toHaveAttribute("data-phase", /dark|card_glow|card_resolve/);

    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/the first platform/i);
    expect(body).not.toMatch(/the only platform/i);
    expect(body).not.toMatch(/unique in the world/i);
    expect(body).not.toMatch(/impossible to copy/i);
  });

  test("full sequence reaches explorer and capabilities", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`${BASE}/`);
    await expect(page.getByTestId("sa-card")).toBeVisible({ timeout: 8000 });
    await shot(page, "01-landing-card-alone.png");
    // Wait for tap pulse / capabilities
    await page.waitForTimeout(2500);
    await shot(page, "02-landing-tap-pulse.png");
    await page.waitForTimeout(3500);
    await shot(page, "03-landing-capabilities-emerging.png");
    await expect(page.getByTestId("sa-capability-brand")).toBeVisible({ timeout: 15_000 });
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-testid="studio-assembly"]');
      const phase = el?.getAttribute("data-phase");
      return (
        phase === "complete" ||
        phase === "icons_settle" ||
        phase === "pullback" ||
        phase === "full_value_frame" ||
        phase === "crescendo"
      );
    }, undefined, { timeout: 25_000 });
    await shot(page, "04-landing-full-studio.png");
    await expect(page.getByTestId("sa-full-value-frame")).toBeVisible();
    await expect(page.getByTestId("sa-full-value-frame")).toContainText(/One Card/i);
  });

  test("product explorer selection, keyboard, hash, selector modes", async ({
    page,
  }) => {
    await page.goto(`${BASE}/#explorer`);
    await expect(page.getByTestId("product-explorer")).toBeVisible();
    await shot(page, "05-landing-interactive-explorer.png");

    await page.getByTestId("explorer-cap-brand").click();
    await expect(page.getByTestId("product-explorer-detail")).toContainText(/Brand Kit/i);
    await shot(page, "06-landing-brand-selected.png");

    await page.getByTestId("explorer-cap-campaigns").click();
    await expect(page.getByTestId("product-explorer-detail")).toContainText(/Campaign/i);
    await shot(page, "07-landing-campaign-selected.png");

    await page.getByTestId("explorer-cap-autopilot").click();
    await expect(page.getByTestId("product-explorer-detail")).toContainText(/Autopilot/i);
    await shot(page, "08-landing-autopilot-selected.png");

    await page.getByTestId("explorer-cap-integrations").click();
    await expect(page.getByTestId("product-explorer-detail")).toContainText(/Integrations/i);
    await shot(page, "09-landing-integrations-selected.png");

    await page.getByTestId("explorer-feature-monday").click();
    await expect(page.getByTestId("product-explorer-feature-detail")).toBeVisible();

    await page.goto(`${BASE}/#explorer-insights`);
    await expect(page.getByTestId("product-explorer-detail")).toContainText(/Insights/i);

    await page.getByTestId("selector-tapconnect").click();
    await expect(page.getByTestId("selector-panel")).toHaveAttribute("data-mode", "tapconnect");
    await shot(page, "10-landing-tapconnect-mode.png");
    await expect(page.getByTestId("explorer-cap-brand")).toBeVisible();
    await expect(page.getByTestId("explorer-cap-autopilot")).toHaveCount(0);

    await page.getByTestId("selector-studio").click();
    await expect(page.getByTestId("selector-panel")).toHaveAttribute("data-mode", "studio");
    await shot(page, "11-landing-studio-mode.png");
    await expect(page.getByTestId("explorer-cap-autopilot")).toBeVisible();

    // Keyboard
    await page.getByTestId("explorer-cap-brand").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("product-explorer-detail")).toContainText(/Brand/i);

    // No pricing / entitlement enforcement language
    const body = await page.locator("body").innerText();
    expect(body).toMatch(/varies by plan/i);
    expect(body).not.toMatch(/you must upgrade to unlock/i);
  });

  test("mobile layout has no horizontal overflow; phone explorer usable", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/`);
    await expect(page.getByTestId("card-centered-landing")).toBeVisible();
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
    });
    expect(overflow).toBe(false);
    await page.getByTestId("explorer-cap-tapsave").click();
    await expect(page.getByTestId("product-explorer-detail")).toContainText(/TapSave/i);
    await shot(page, "12-landing-mobile.png");
  });

  test("tablet assembly usable", async ({ page }) => {
    await page.setViewportSize({ width: 834, height: 1112 });
    await page.goto(`${BASE}/`);
    await expect(page.getByTestId("studio-assembly")).toBeVisible();
    await expect(page.getByTestId("sa-card")).toBeVisible({ timeout: 8000 });
  });

  test("reduced motion path", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${BASE}/`);
    await expect(page.getByTestId("studio-assembly")).toHaveAttribute(
      "data-reduced-motion",
      "true"
    );
    await expect(page.getByTestId("sa-card")).toBeVisible({ timeout: 5000 });
    await page.getByTestId("studio-assembly-skip").click();
    await expect(page.getByTestId("product-explorer")).toBeVisible();
  });

  test("axe desktop / tablet / phone — no serious or critical", async ({ page }) => {
    for (const size of [
      { w: 1280, h: 800, name: "desktop" },
      { w: 834, h: 1112, name: "tablet" },
      { w: 390, h: 844, name: "phone" },
    ]) {
      await page.setViewportSize({ width: size.w, height: size.h });
      await page.goto(`${BASE}/`);
      await page.getByTestId("studio-assembly-skip").click().catch(() => undefined);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      const bad = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical"
      );
      expect(bad, `${size.name}: ${bad.map((b) => b.id).join(",")}`).toEqual([]);
    }
  });

  test("metadata present", async ({ page }) => {
    await page.goto(`${BASE}/`);
    const title = await page.title();
    expect(title.toLowerCase()).toMatch(/tapconnect/);
    const desc = await page.locator('meta[name="description"]').getAttribute("content");
    expect(desc ?? "").toMatch(/Card/i);
  });
});

test.describe("Studio Assembly authenticated entry", () => {
  test("Home remains reachable; assembly can replay; failure-safe Home", async ({
    page,
  }) => {
    // Pref clear + force everyday skip path then replay
    await page.addInitScript(() => {
      try {
        localStorage.setItem("tapconnect.studio.assembly.firstSeen", String(Date.now()));
        localStorage.setItem("tapconnect.studio.assembly.skipEveryday", "1");
      } catch {
        /* ignore */
      }
    });
    await page.goto(`${BASE}/dashboard`);
    await expect(page.getByTestId("home-card-command-center")).toBeVisible({
      timeout: 30_000,
    });
    await shot(page, "18-home-after-assembly.png");

    await page.goto(`${BASE}/dashboard?assembly=replay`);
    await expect(page.getByTestId("studio-assembly")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("sa-card")).toBeVisible();
    await shot(page, "13-login-card-alone.png");
    await page.waitForTimeout(2000);
    await shot(page, "14-login-icons-settling.png");
    await page.getByTestId("studio-assembly-skip").click();
    await expect(page.getByTestId("home-card-command-center")).toBeVisible();
  });

  test("reduced motion login assembly", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => {
      try {
        localStorage.removeItem("tapconnect.studio.assembly.firstSeen");
        localStorage.removeItem("tapconnect.studio.assembly.skipEveryday");
      } catch {
        /* ignore */
      }
    });
    await page.goto(`${BASE}/dashboard?assembly=first`);
    await expect(page.getByTestId("studio-assembly")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("studio-assembly")).toHaveAttribute(
      "data-reduced-motion",
      "true"
    );
    await shot(page, "17-login-reduced-motion.png");
    await page.getByTestId("studio-assembly-skip").click();
    await expect(page.getByTestId("home-card-command-center")).toBeVisible();
  });

  test("first entry unfolds toward Home", async ({ page }) => {
    test.setTimeout(45_000);
    await page.addInitScript(() => {
      try {
        localStorage.clear();
      } catch {
        /* ignore */
      }
    });
    await page.goto(`${BASE}/dashboard?assembly=first`);
    await expect(page.getByTestId("studio-assembly")).toBeVisible({ timeout: 15_000 });
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="studio-assembly"]');
        const phase = el?.getAttribute("data-phase");
        return phase === "card_forward" || phase === "card_unfold" || phase === "complete" || phase === "skipped";
      },
      undefined,
      { timeout: 20_000 }
    );
    await shot(page, "15-login-card-forward.png");
    // Skip remaining if still running
    const skip = page.getByTestId("studio-assembly-skip");
    if (await skip.isVisible().catch(() => false)) await skip.click();
    await expect(page.getByTestId("home-card-command-center")).toBeVisible();
    await shot(page, "16-login-home-resolved.png");
  });
});
