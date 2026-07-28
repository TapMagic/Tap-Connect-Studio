/**
 * Card-Centered Owner Experience + Zone Identity V1 — headed proofs + a11y.
 *
 * Usage:
 *   PROOF_HEADED=1 BASE_URL=http://127.0.0.1:3000 \
 *   npx playwright test e2e/card-centered-owner-experience.spec.ts --headed
 */
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import path from "node:path";
import { BASE } from "./proof-helpers";

const SHOT = path.join("tmp", "card-centered-owner-experience");
const headed = process.env.PROOF_HEADED === "1";

test.describe("Card-Centered Owner Experience V1", () => {
  test.skip(!headed, "Set PROOF_HEADED=1 for headed Card-centered owner proofs");
  test.describe.configure({ timeout: 180_000 });

  test("Home Card Command Center + one green next action", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
    await expect(page.getByTestId("home-card-command-center")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("home-card-name")).toBeVisible();
    await expect(page.getByTestId("home-card-state")).toBeVisible();
    await expect(page.getByTestId("home-card-tappoint-state")).toBeVisible();
    await expect(page.getByTestId("home-card-spotlight-state")).toBeVisible();
    await expect(page.getByTestId("home-card-tapsave-state")).toBeVisible();
    await expect(page.getByTestId("home-proof-strip")).toBeVisible();
    await expect(page.getByTestId("home-next-action-go")).toBeVisible();
    await expect(page.getByTestId("home-next-action-go")).toHaveCount(1);
    await page.screenshot({
      path: path.join(SHOT, "01-home-card-command-center.png"),
      fullPage: true,
    });
    await page.screenshot({
      path: path.join(SHOT, "02-home-needs-attention.png"),
      fullPage: true,
    });
  });

  test("Create flow is Card-first", async ({ page }) => {
    await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
    await page.getByTestId("studio-create-button").click();
    await expect(page.getByTestId("studio-create-menu")).toBeVisible();
    await expect(page.getByText(/Build my customer Card/i).first()).toBeVisible();
    await page.screenshot({ path: path.join(SHOT, "03-create-flow.png") });
  });

  test("Experiences primary ordering and labs collapsed", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${BASE}/dashboard/experiences`, { waitUntil: "networkidle" });
    await expect(page.getByTestId("experiences-primary")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("experiences-primary-card")).toBeVisible();
    const labs = page.getByTestId("experiences-labs");
    await expect(labs).toBeVisible();
    await expect(labs).not.toHaveAttribute("open", "");
    await page.screenshot({ path: path.join(SHOT, "04-experiences-primary.png"), fullPage: true });
    await labs.locator("summary").click();
    await expect(page.getByTestId("experiences-labs-list")).toBeVisible();
    await page.screenshot({
      path: path.join(SHOT, "05-experiences-labs-collapsed.png"),
      fullPage: true,
    });
  });

  test("Brand focused is default owner path", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/brand/edit`, { waitUntil: "networkidle" });
    await expect(page.getByTestId("brand-edit-workspace-host")).toHaveAttribute(
      "data-brand-default-owner-path",
      "true"
    );
    await page.screenshot({ path: path.join(SHOT, "06-brand-focused-default.png") });
    await page.goto(`${BASE}/dashboard/brand`, { waitUntil: "networkidle" });
    await expect(page.getByTestId("brand-kit-classic")).toBeVisible();
    await expect(page.getByText(/Legacy Brand administration/i).first()).toBeVisible();
  });

  test("Card workspace zone", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/card`, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SHOT, "07-card-workspace-zone.png"), fullPage: true });
  });

  test("Campaign and Email Card anchors", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/campaigns`, { waitUntil: "networkidle" });
    const first = page.locator('a[href^="/dashboard/campaigns/"]').first();
    if (await first.isVisible().catch(() => false)) {
      await first.click();
      await expect(page.getByTestId("card-relationship-anchor")).toBeVisible({ timeout: 60_000 });
      await expect(page.getByTestId("card-anchor-return")).toBeVisible();
      await expect(page.getByTestId("campaign-versions")).toHaveAttribute(
        "data-default-collapsed",
        "true"
      );
      await page.screenshot({ path: path.join(SHOT, "08-campaign-card-anchor.png") });
      await page.goto(`${BASE}/dashboard/campaigns`, { waitUntil: "networkidle" });
      const href = await first.getAttribute("href");
      if (href) {
        await page.goto(`${BASE}${href}/email`, { waitUntil: "networkidle" });
        await expect(page.getByTestId("card-relationship-anchor")).toBeVisible({
          timeout: 60_000,
        });
        await expect(page.getByTestId("email-technical-tools")).toBeVisible();
        await page.screenshot({ path: path.join(SHOT, "09-email-card-anchor.png") });
      }
    }
  });

  test("Audience / Inbox / Autopilot / Insights zones", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/audience`, { waitUntil: "networkidle" });
    await expect(page.locator(".zone-audience").first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("card-relationship-anchor")).toBeVisible();
    await page.screenshot({ path: path.join(SHOT, "10-audience-zone.png"), fullPage: true });
    await page.goto(`${BASE}/dashboard/audience/inbox`, { waitUntil: "networkidle" });
    await expect(page.locator(".zone-service").first()).toBeVisible();
    await page.screenshot({ path: path.join(SHOT, "11-tapinbox-zone.png"), fullPage: true });
    await page.goto(`${BASE}/dashboard/card?wire=offer`, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SHOT, "12-autopilot-zone.png"), fullPage: true });
    await page.goto(`${BASE}/dashboard/insights`, { waitUntil: "networkidle" });
    await expect(page.locator(".zone-insights").first()).toBeVisible();
    await page.screenshot({ path: path.join(SHOT, "13-insights-zone.png"), fullPage: true });
  });

  test("Integrations maturity groups", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${BASE}/dashboard/integrations`, { waitUntil: "networkidle" });
    await expect(page.getByTestId("integrations-group-works-now")).toBeVisible({
      timeout: 60_000,
    });
    await page.screenshot({ path: path.join(SHOT, "14-integrations-works-now.png"), fullPage: true });
    await expect(page.getByTestId("integrations-group-after-setup")).toBeVisible();
    await page.screenshot({
      path: path.join(SHOT, "15-integrations-after-setup.png"),
      fullPage: true,
    });
    await expect(page.getByTestId("integrations-group-local-test")).toBeVisible();
    await expect(page.getByTestId("integrations-group-planned")).toBeVisible();
    await page.screenshot({
      path: path.join(SHOT, "16-integrations-test-planned.png"),
      fullPage: true,
    });
  });

  test("Empty routing and insights", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/integrations#email-replies-section`, {
      waitUntil: "networkidle",
    });
    const viewActivity = page.getByTestId("email-replies-routing-activity");
    if (await viewActivity.isVisible().catch(() => false)) {
      await viewActivity.click();
    }
    await page.screenshot({ path: path.join(SHOT, "17-empty-routing.png"), fullPage: true });
    await page.goto(`${BASE}/dashboard/insights`, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SHOT, "18-empty-insights.png"), fullPage: true });
  });

  test("Phone Home / Experiences / Integrations", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
    await expect(page.getByTestId("home-card-command-center")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("home-next-action-go")).toBeVisible();
    const box = await page.getByTestId("home-next-action-go").boundingBox();
    expect(box && box.height >= 44).toBeTruthy();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2
    );
    expect(overflow).toBeFalsy();
    await page.screenshot({ path: path.join(SHOT, "19-home-phone.png"), fullPage: true });
    await page.goto(`${BASE}/dashboard/experiences`, { waitUntil: "networkidle" });
    await expect(page.getByTestId("experiences-primary")).toBeVisible();
    await page.screenshot({ path: path.join(SHOT, "20-experiences-phone.png"), fullPage: true });
    await page.goto(`${BASE}/dashboard/integrations`, { waitUntil: "networkidle" });
    await expect(page.getByTestId("integrations-group-works-now")).toBeVisible();
    await page.screenshot({ path: path.join(SHOT, "21-integrations-phone.png"), fullPage: true });
  });

  test("Zone system overview + nav restraint + axe", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
    // Redesigned nav marks the active route with aria-current instead of a class.
    await expect(
      page.getByTestId("studio-nav-rail").locator('[aria-current="page"]').first()
    ).toBeVisible({ timeout: 60_000 });
    await page.screenshot({ path: path.join(SHOT, "22-zone-system-overview.png"), fullPage: true });

    for (const [w, h] of [
      [1280, 900],
      [768, 1024],
      [390, 844],
    ] as const) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      const serious = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical"
      );
      expect(serious, `${w}x${h}: ${serious.map((v) => v.id).join(", ")}`).toEqual([]);
    }
  });
});
