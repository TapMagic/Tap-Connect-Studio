import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const BASE = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";

test.describe("Owner experience compliance", () => {
  test("P-owner-public-retention-trust: one retention path and trust states", async ({
    page,
  }) => {
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    const retention = page.getByTestId("public-retention-path");
    await expect(retention).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("public-retention-choice-homescreen")).toBeVisible();
    await page.getByTestId("public-retention-choice-contact").click();
    await expect(page.getByTestId("public-trust-states")).toBeVisible();
    await expect(page.getByTestId("public-trust-states")).toContainText(/Source confirmed/i);

    const results = await new AxeBuilder({ page })
      .include('[data-testid="public-retention-path"]')
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test("P-owner-nav-same-tab: primary destinations stay in-tab", async ({ page }) => {
    await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
    const rail = page.getByTestId("studio-nav-rail");
    if (!(await rail.isVisible().catch(() => false))) {
      test.skip(true, "Dashboard nav requires authenticated Owner session");
    }
    await expect(rail).toHaveCSS("font-family", /sans|ui-|system|Inter|Geist/i);
    const experiences = page.getByTestId("nav-icon-experiences");
    await experiences.click();
    await expect(page).toHaveURL(/\/dashboard\/experiences/);
    await expect(page.getByTestId("experiences-primary-canvas")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Create and run experiences/i })).toBeVisible();
  });

  test("P-owner-ask-tapconnect-global: Ask entry opens proposal preview", async ({
    page,
  }) => {
    await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
    const ask = page.getByTestId("ask-tapconnect-global");
    if (!(await ask.isVisible().catch(() => false))) {
      test.skip(true, "Ask TapConnect requires authenticated Studio shell");
    }
    await ask.click();
    await expect(page.getByTestId("ask-tapconnect-global-dialog")).toBeVisible();
    await page.getByTestId("ask-tapconnect-prompt").fill("Publish this Card now");
    await page.getByTestId("ask-tapconnect-prepare").click();
    await expect(page.getByTestId("ask-tapconnect-blocked")).toBeVisible();
    await expect(page.getByTestId("ask-tapconnect-blocked")).toContainText(/cannot publish/i);
  });
});
