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
      const showNav = page.getByRole("button", { name: "Show nav" });
      await expect(showNav).toBeVisible();
      await showNav.click();
    }
    await expect(rail).toBeVisible();
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

  test("P-owner-intelligent-prefill: visible control and source review", async ({
    page,
  }) => {
    await page.goto(`${BASE}/dashboard/card/edit`, {
      waitUntil: "domcontentloaded",
    });
    // Exit focus/canvas-only modes that hide the Task Drawer.
    const exitFocus = page.getByRole("button", { name: /Exit focus|Show tools|Expanded/i }).first();
    if (await exitFocus.isVisible().catch(() => false)) {
      await exitFocus.click().catch(() => undefined);
    }
    await expect(page.getByTestId("card-tool-rail")).toBeVisible({
      timeout: 25_000,
    });
    await expect(page.getByTestId("card-shell-outline-segments")).toBeVisible({
      timeout: 25_000,
    });
    const appearanceTool = page.getByTestId("card-tool-appearance");
    await expect(appearanceTool).toBeVisible({ timeout: 25_000 });
    const host = page.getByTestId("card-edit-workspace-host");
    await expect
      .poll(
        async () => {
          if ((await host.getAttribute("data-selected-tool")) !== "appearance") {
            await appearanceTool.click();
          }
          return host.getAttribute("data-selected-tool");
        },
        { timeout: 25_000 }
      )
      .toBe("appearance");
    await expect(host).toHaveAttribute("data-drawer-open", "true");
    const panel = page.getByTestId("appearance-panel-stack");
    await expect(panel).toBeVisible({ timeout: 25_000 });
    await page.getByTestId("appearance-open-brand").click();
    const bar = page.getByTestId("brand-inheritance-bar");
    await expect(bar).toBeVisible({ timeout: 25_000 });
    await expect(bar).toContainText(/Use saved business and Brand information/i);
    await expect(page.getByTestId("prefill-review-sources")).toBeVisible();
    await expect(page.getByTestId("prefill-fill-blanks")).toBeVisible();
    await expect(page.getByTestId("prefill-refresh")).toBeVisible();
    await expect(page.getByTestId("prefill-stop-automatic")).toBeVisible();
    await expect(page.getByTestId("prefill-reset-saved")).toBeVisible();
    await page.getByTestId("prefill-review-sources").click();
    await expect(page.getByTestId("prefill-sources-list")).toBeVisible();
    // Turning off must not erase the bar or require a reload.
    await page.getByTestId("brand-use-toggle").uncheck();
    await expect(bar).toContainText(/Off/i);
    await expect(page.getByTestId("prefill-fill-blanks")).toBeDisabled();
  });

  test("P-owner-website-discovery: Brand Kit homepage review control", async ({
    page,
  }) => {
    await page.goto(`${BASE}/dashboard/brand/edit`, { waitUntil: "domcontentloaded" });
    const websiteInput = page.getByTestId("intake-website-url");
    if (!(await websiteInput.isVisible().catch(() => false))) {
      // Discover topic may need opening from Brand overview.
      const discover = page.getByRole("button", { name: /Discover|Review Brand Starter/i }).first();
      if (await discover.isVisible().catch(() => false)) await discover.click();
    }
    await websiteInput.waitFor({ state: "visible", timeout: 15_000 }).catch(() => undefined);
    if (!(await websiteInput.isVisible().catch(() => false))) {
      test.skip(true, "Brand Kit Discover requires authenticated Owner session");
    }
    await expect(page.getByTestId("intake-website-submit")).toBeVisible();
    await expect(page.getByTestId("intake-website-submit")).toContainText(/Review homepage/i);
  });

  test("P-owner-website-failure: failed review stays honest and creates no fallback", async ({
    page,
  }) => {
    await page.route("**/api/business/knowledge/website", async (route) => {
      await route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({
          error: "The homepage could not be reached.",
          recovery: "Continue with manual entry.",
        }),
      });
    });
    await page.goto(`${BASE}/dashboard/brand/edit`, { waitUntil: "domcontentloaded" });
    const websiteInput = page.getByTestId("intake-website-url");
    if (!(await websiteInput.isVisible().catch(() => false))) {
      const discover = page.getByRole("button", { name: /Discover|Review Brand Starter/i }).first();
      await discover.click();
    }
    await expect(websiteInput).toBeVisible();
    const starterCount = await page.locator('[data-testid^="starter-item-"]').count();
    await websiteInput.fill("https://unreachable.example");
    await page.getByTestId("intake-website-submit").click();
    await expect(page.getByTestId("intake-message")).toContainText(
      /could not be reached.*No facts or Brand suggestions were created.*Retry.*manually/i
    );
    await expect(page.getByTestId("intake-message")).not.toContainText(
      /findings.*ready|suggestions.*ready/i
    );
    await expect(page.locator('[data-testid^="starter-item-"]')).toHaveCount(
      starterCount
    );
  });
});
