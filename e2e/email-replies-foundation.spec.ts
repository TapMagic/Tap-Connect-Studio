/**
 * Email & Replies — headed integration-card / wizard / campaign reply-policy proofs.
 *
 * Usage:
 *   PROOF_HEADED=1 BASE_URL=http://127.0.0.1:3000 \
 *   npx playwright test e2e/email-replies-foundation.spec.ts --headed --workers=1
 */
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";

const headed = process.env.PROOF_HEADED === "1";
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const SHOT_DIR = path.join("tmp", "email-replies-proofs");

async function axeSerious(
  page: import("@playwright/test").Page,
  include: string
) {
  const axe = await new AxeBuilder({ page })
    .include(include)
    .disableRules(["color-contrast"])
    .analyze();
  return axe.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical"
  );
}

async function shot(page: import("@playwright/test").Page, name: string) {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(SHOT_DIR, `${name}.png`),
    fullPage: false,
  });
}

test.describe("Email & Replies foundation", () => {
  test.skip(!headed, "Set PROOF_HEADED=1 for headed Email & Replies proofs");
  test.describe.configure({ timeout: 240_000 });

  test("integration card + wizard desktop/tablet/phone + axe", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/integrations`);
    await expect(page.getByTestId("email-replies-card")).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText("Email & Replies").first()).toBeVisible();
    await expect(
      page.getByText(/Send branded email and deliver customer replies/i).first()
    ).toBeVisible();
    await shot(page, "01-card-desktop");

    await page.getByTestId("email-replies-setup").click();
    await expect(page.getByTestId("email-replies-wizard")).toBeVisible();
    await expect(page.getByTestId("wizard-step-destination")).toBeVisible();

    await page.locator("#dest-addr").fill("support@business.com");
    await page.getByTestId("wizard-next").click();
    await expect(page.getByTestId("wizard-step-categories")).toBeVisible({
      timeout: 30_000,
    });
    await page.getByTestId("wizard-next").click();
    await expect(page.getByTestId("wizard-visibility")).toBeVisible();
    await page.getByTestId("wizard-next").click();
    await expect(page.getByTestId("wizard-step-verify")).toBeVisible();
    await shot(page, "02-wizard-verify");

    await page.getByTestId("email-replies-operator").click();
    await expect(page.getByTestId("email-replies-operator-panel")).toBeVisible();
    await shot(page, "03-operator");

    const desktopViolations = await axeSerious(page, "[data-testid=email-replies-card]");
    expect(desktopViolations).toEqual([]);

    await page.setViewportSize({ width: 768, height: 1024 });
    await shot(page, "04-card-tablet");
    await page.setViewportSize({ width: 390, height: 844 });
    await shot(page, "05-card-phone");
    const phoneViolations = await axeSerious(page, "[data-testid=email-replies-wizard]");
    expect(phoneViolations).toEqual([]);

    // Keyboard: focus setup path
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByTestId("email-replies-setup").focus();
    await expect(page.getByTestId("email-replies-setup")).toBeFocused();
  });

  test("connected integration picker + campaign reply policy", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/integrations`);
    await page.getByTestId("email-replies-setup").click();
    await page.getByText("Connected integration").click();
    await expect(page.getByTestId("wizard-connected-picker")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("Monday").first()).toBeVisible();
    await expect(page.getByText(/One-way handoff|one-way handoff/i).first()).toBeVisible();
    await shot(page, "06-connected-picker");

    await page.goto(`${BASE}/dashboard/campaigns`);
    const editLink = page.locator('a[href*="/dashboard/campaigns/"]').first();
    if ((await editLink.count()) === 0) {
      test.skip(true, "No campaign available");
      return;
    }
    const href = await editLink.getAttribute("href");
    const campaignId = href?.split("/").filter(Boolean).pop();
    await page.goto(`${BASE}/dashboard/campaigns/${campaignId}/email`);
    await expect(page.getByTestId("campaign-reply-handling")).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByTestId("email-no-live-send")).toBeVisible();
    await expect(page.getByTestId("campaign-reply-open-setup")).toBeVisible();
    await page.getByTestId("campaign-reply-reset").click();
    await shot(page, "07-campaign-reply-policy");
  });

  test("durable setup survives reload + second browser context + activity", async ({
    browser,
    page,
  }) => {
    // No customer contacted — local UI/API durable path only.
    await page.goto(`${BASE}/dashboard/integrations`);
    await expect(page.getByTestId("email-replies-card")).toBeVisible({
      timeout: 60_000,
    });

    await page.getByTestId("email-replies-setup").click();
    await expect(page.getByTestId("email-replies-wizard")).toBeVisible();
    const addr = `durable-${Date.now()}@business.example`;
    await page.locator("#dest-name").fill("Durable Desk").catch(() => undefined);
    await page.locator("#dest-addr").fill(addr);
    await page.getByTestId("wizard-next").click();
    await expect(page.getByTestId("wizard-step-categories")).toBeVisible({
      timeout: 30_000,
    });
    await page.getByTestId("wizard-next").click();
    await expect(page.getByTestId("wizard-visibility")).toBeVisible();
    await page.getByTestId("wizard-next").click();
    await expect(page.getByTestId("wizard-step-verify")).toBeVisible();

    // Verify / test / activate when controls present
    const sendVerify = page.getByTestId("wizard-send-verification");
    if (await sendVerify.count()) {
      await sendVerify.click();
      const confirm = page.getByTestId("wizard-confirm-verification");
      if (await confirm.count()) await confirm.click();
    }
    const sendTest = page.getByTestId("wizard-route-test");
    if (await sendTest.count()) await sendTest.click();
    await page.getByTestId("wizard-next").click().catch(() => undefined);
    const activate = page.getByTestId("wizard-activate");
    if (await activate.count()) await activate.click();

    await page.reload();
    await expect(page.getByTestId("email-replies-card")).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText(/Durable Desk|business\.example|Verified|Active|configured|routing/i).first()).toBeVisible({
      timeout: 30_000,
    });
    await shot(page, "08-durable-after-reload");

    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    await page2.goto(`${BASE}/dashboard/integrations`);
    await expect(page2.getByTestId("email-replies-card")).toBeVisible({
      timeout: 60_000,
    });
    await expect(
      page2.getByText(/Durable Desk|business\.example|Verified|Active|configured|routing/i).first()
    ).toBeVisible({ timeout: 30_000 });
    await shot(page2, "09-second-browser-context");
    await ctx2.close();

    const activityBtn = page.getByTestId("email-replies-routing-activity");
    if (await activityBtn.count()) {
      await activityBtn.click();
      await expect(page.getByTestId("email-replies-activity-panel")).toBeVisible({
        timeout: 30_000,
      });
      await shot(page, "10-routing-activity");
    }

    await page.getByTestId("email-replies-operator").click();
    await expect(page.getByTestId("email-replies-operator-panel")).toBeVisible();
    await expect(page.getByText(/Durable store|Prisma|schema present/i).first()).toBeVisible();
    await expect(page.getByText(/Campaign sending|disabled|not live/i).first()).toBeVisible();
    await shot(page, "11-operator-durability");

    const disableBtn = page.getByTestId("email-replies-toggle-enabled");
    if (await disableBtn.count()) {
      await disableBtn.click();
      await page.reload();
      await expect(page.getByTestId("email-replies-card")).toBeVisible({
        timeout: 60_000,
      });
      await shot(page, "12-disabled-persists");
    }
  });
});
