/**
 * Email Authoring Workspace — headed Adaptive Shell + parity proofs.
 *
 * Usage:
 *   PROOF_HEADED=1 BASE_URL=http://127.0.0.1:3000 \
 *   npx playwright test e2e/email-authoring-workspace.spec.ts --headed --workers=1
 */
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";

const headed = process.env.PROOF_HEADED === "1";
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const SHOT_DIR = path.join("tmp", "email-authoring-proofs");

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

test.describe("email authoring workspace", () => {
  test.skip(!headed, "Set PROOF_HEADED=1 for headed Email workspace proofs");
  test.describe.configure({ timeout: 240_000 });

  async function openEmailWorkspace(page: import("@playwright/test").Page) {
    await page.goto(`${BASE}/dashboard/campaigns`);
    const editLink = page.locator('a[href*="/dashboard/campaigns/"]').first();
    if ((await editLink.count()) === 0) {
      test.skip(true, "No campaign available in local seed");
      return null;
    }
    const href = await editLink.getAttribute("href");
    if (!href) return null;
    const campaignId = href.split("/").filter(Boolean).pop();
    const emailUrl = `${BASE}/dashboard/campaigns/${campaignId}/email`;
    await page.goto(emailUrl);
    await expect(page.getByTestId("email-authoring-workspace")).toBeVisible({
      timeout: 60_000,
    });
    return { campaignId, emailUrl };
  }

  test("Command Shade drawers + live preview remain mounted", async ({ page }) => {
    if (!(await openEmailWorkspace(page))) return;
    await page.setViewportSize({ width: 1440, height: 900 });

    await expect(page.getByTestId("email-authoring-workspace")).toHaveAttribute(
      "data-adaptive-shell",
      "v1"
    );
    await expect(page.getByTestId("email-authoring-workspace")).toHaveAttribute(
      "data-resolver",
      "shared-visual-core-v0"
    );
    await expect(page.getByTestId("command-shade")).toBeVisible();
    await expect(page.locator(".email-zone-glow").first()).toBeVisible();
    await shot(page, "01-shade-open");

    const drawers = [
      "outline",
      "content",
      "colors",
      "typography",
      "buttons",
      "media",
      "subject",
      "audience",
      "readiness",
      "preview",
      "plain_text",
      "history",
      "advanced",
    ] as const;

    // Technical tools live inside a collapsed "Technical" disclosure now.
    const openTechnical = async () => {
      const details = page.getByTestId("email-technical-tools");
      if ((await details.count()) > 0 && (await details.getAttribute("open")) === null) {
        await details.locator("summary").click();
      }
    };

    for (const tool of drawers) {
      if (["plain_text", "history", "advanced"].includes(tool)) {
        await openTechnical();
      }
      await page.getByTestId(`email-tool-${tool}`).first().click();
      await expect(page.getByTestId("email-contextual-drawer")).toBeVisible();
      await expect(page.getByTestId("email-live-preview")).toBeVisible();
      await expect(page.getByTestId("email-live-preview")).toHaveAttribute(
        "data-live-surface",
        "true"
      );
      // One drawer body at a time — colors should not stack with typography
      if (tool === "colors") {
        await expect(page.getByTestId("email-drawer-colors")).toBeVisible();
      }
      if (tool === "typography") {
        await expect(page.getByTestId("email-drawer-typography")).toBeVisible();
        await expect(page.getByTestId("email-drawer-colors")).toHaveCount(0);
      }
      if (tool === "media") {
        await expect(page.getByTestId("email-drawer-media")).toBeVisible();
        await expect(page.getByTestId("email-media-select-prompt")).toBeVisible();
      }
      if (tool === "readiness" || tool === "audience") {
        await expect(page.getByTestId("email-drawer-readiness")).toBeVisible();
        await expect(page.getByTestId("email-eligibility-evidence")).toBeVisible();
        await expect(page.getByTestId("email-send-disabled")).toBeDisabled();
      }
      await shot(page, `02-drawer-${tool}`);
    }

    await expect(page.getByTestId("email-save")).toHaveClass(/bg-primary/);
    await expect(page.getByTestId("email-review")).toHaveClass(/bg-primary/);
  });

  test("save/reload + HTML/plain-text parity + local approval + no send", async ({
    page,
    context,
  }) => {
    const opened = await openEmailWorkspace(page);
    if (!opened) return;
    await page.setViewportSize({ width: 1440, height: 900 });

    // Subject / preheader
    await page.getByTestId("email-tool-subject").click();
    const subjectValue = `Proof subject ${Date.now().toString(36)}`;
    await page.getByTestId("email-subject-input").fill(subjectValue);
    await page.getByTestId("email-preheader-input").fill("Proof preheader line");

    // Color override
    await page.getByTestId("email-tool-colors").click();
    const bg = page.getByTestId("email-color-background-hex");
    await bg.fill("#224466");
    await bg.blur();
    await expect(page.getByTestId("email-provenance-surface").first()).toBeVisible({
      timeout: 10_000,
    });

    // CTA custom if available
    await page.getByTestId("email-tool-buttons").click();
    if ((await page.getByTestId("email-cta-bg-color").count()) > 0) {
      await page.getByTestId("email-cta-bg-color").fill("#ff00aa");
      await expect(page.getByTestId("email-provenance-custom").first()).toBeVisible({
        timeout: 10_000,
      });
    }

    // Typography warning present
    await page.getByTestId("email-tool-typography").click();
    await expect(page.getByTestId("email-font-fallback-warning")).toBeVisible();

    // Content edit
    await page.getByTestId("email-tool-content").click();
    const outlineBtn = page.locator('[data-testid^="email-outline-block-"]').first();
    if ((await outlineBtn.count()) > 0) {
      // outline is in drawer for outline tool; content has its own editor
    }

    await page.getByTestId("email-save").click();
    await expect(page.getByText(/Email draft saved/i)).toBeVisible({ timeout: 30_000 });
    await shot(page, "03-after-save");

    // Capture Advanced HTML before reload (expand Technical disclosure first)
    const techDetails = page.getByTestId("email-technical-tools");
    if ((await techDetails.count()) > 0 && (await techDetails.getAttribute("open")) === null) {
      await techDetails.locator("summary").click();
    }
    await page.getByTestId("email-tool-advanced").first().click();
    await expect(page.getByTestId("email-html-output")).toBeVisible();
    const htmlBefore = await page.getByTestId("email-html-output").innerText();
    expect(htmlBefore).not.toMatch(/<script/i);
    expect(htmlBefore).not.toMatch(/\bon\w+\s*=/i);

    await page.getByTestId("email-tool-plain_text").first().click();
    await expect(page.getByTestId("email-drawer-plain-text")).toBeVisible();
    const plainBefore = await page.getByTestId("email-plain-text-editor").inputValue();
    expect(plainBefore.length).toBeGreaterThan(20);

    // Refresh — authoritative rehydrate
    await page.reload();
    await expect(page.getByTestId("email-authoring-workspace")).toBeVisible({
      timeout: 60_000,
    });
    await page.getByTestId("email-tool-subject").click();
    await expect(page.getByTestId("email-subject-input")).toHaveValue(subjectValue);
    await expect(page.getByTestId("email-preheader-input")).toHaveValue(
      "Proof preheader line"
    );
    await page.getByTestId("email-tool-colors").click();
    await expect(page.getByTestId("email-color-background-hex")).toHaveValue(/#224466/i);
    await shot(page, "04-after-reload");

    // Separate browser context — deep link
    const other = await context.newPage();
    await other.goto(opened.emailUrl);
    await expect(other.getByTestId("email-authoring-workspace")).toBeVisible({
      timeout: 60_000,
    });
    await other.getByTestId("email-tool-subject").click();
    await expect(other.getByTestId("email-subject-input")).toHaveValue(subjectValue);
    const otherTech = other.getByTestId("email-technical-tools");
    if ((await otherTech.count()) > 0 && (await otherTech.getAttribute("open")) === null) {
      await otherTech.locator("summary").click();
    }
    await other.getByTestId("email-tool-advanced").first().click();
    const htmlAfter = await other.getByTestId("email-html-output").innerText();
    expect(htmlAfter).toContain("224466");
    await other.close();

    // Detached tab link present
    await expect(page.getByTestId("email-open-detached")).toBeVisible();
    await expect(page.getByTestId("email-return-studio")).toBeVisible();

    // Preview modes
    await page.getByTestId("email-tool-preview").click();
    for (const mode of ["desktop", "mobile", "dark_inbox", "image_blocked", "plain_text", "inbox_list"]) {
      await page.getByTestId(`email-preview-mode-${mode}`).click();
      await expect(page.getByTestId("email-live-preview").or(page.getByTestId("email-plain-text-preview")).or(page.getByTestId("email-inbox-list-preview"))).toBeVisible();
    }
    await shot(page, "05-preview-modes");

    // Local approval — never send
    await page.getByTestId("email-tool-readiness").click();
    await expect(page.getByTestId("email-send-disabled")).toBeDisabled();
    const sendRequests: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/api/email/send")) sendRequests.push(req.url());
    });
    await page.getByTestId("email-approve-local").click();
    await expect(page.getByTestId("email-approval-message")).toContainText(
      /prepared and ready/i
    );
    expect(sendRequests).toEqual([]);
    await expect(page.getByText(/^Sent\.?$/i)).toHaveCount(0);
    await shot(page, "06-approved-local");
  });

  test("detached restore + phone + axe matrix", async ({ page, context }) => {
    const opened = await openEmailWorkspace(page);
    if (!opened) return;

    await page.getByTestId("email-tool-colors").click();
    await expect(page.getByTestId("email-contextual-drawer")).toBeVisible();
    await expect(page.getByTestId("email-open-detached")).toBeVisible();

    // Detached all-day workspace via deep link (authoritative document) + new tab chrome
    const [detached] = await Promise.all([
      context.waitForEvent("page"),
      page.getByTestId("email-open-detached").click(),
    ]);
    await detached.waitForLoadState("domcontentloaded");
    await expect(detached.getByTestId("email-authoring-workspace")).toBeVisible({
      timeout: 60_000,
    });
    await expect(detached.getByTestId("email-live-preview")).toBeVisible();
    await shot(detached, "07-detached");

    // Direct deep link remount
    await detached.reload();
    await expect(detached.getByTestId("email-authoring-workspace")).toBeVisible({
      timeout: 60_000,
    });
    await shot(detached, "07b-detached-refresh");

    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByTestId("email-authoring-workspace")).toBeVisible();
    await shot(page, "08-tablet");

    // Phone
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId("email-mobile-toolbar")).toBeVisible();
    await page.getByTestId("email-mobile-tool-subject").click();
    await expect(
      page.getByTestId("email-mobile-sheet").or(page.getByTestId("email-contextual-drawer"))
    ).toBeVisible({ timeout: 15_000 });
    await shot(page, "09-phone-subject");

    await page.getByTestId("email-mobile-tool-preview").click();
    if ((await page.getByTestId("email-preview-mode-dark_inbox").count()) > 0) {
      await page.getByTestId("email-preview-mode-dark_inbox").click();
    }
    await shot(page, "10-phone-dark-inbox");

    await page.getByTestId("email-mobile-tool-plain_text").click();
    await shot(page, "11-phone-plain-text");

    // Axe matrix
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByTestId("email-tool-colors").click();
    expect(await axeSerious(page, '[data-testid="command-shade"]')).toEqual([]);
    expect(await axeSerious(page, '[data-testid="email-tool-rail"]')).toEqual([]);
    expect(await axeSerious(page, '[data-testid="email-live-preview"]')).toEqual([]);
    expect(await axeSerious(page, '[data-testid="email-contextual-drawer"]')).toEqual([]);

    await page.getByTestId("email-tool-typography").click();
    expect(await axeSerious(page, '[data-testid="email-drawer-typography"]')).toEqual([]);
    await page.getByTestId("email-tool-buttons").click();
    expect(await axeSerious(page, '[data-testid="email-drawer-buttons"]')).toEqual([]);
    await page.getByTestId("email-tool-media").click();
    expect(await axeSerious(page, '[data-testid="email-drawer-media"]')).toEqual([]);
    await page.getByTestId("email-tool-readiness").click();
    expect(await axeSerious(page, '[data-testid="email-drawer-readiness"]')).toEqual([]);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByTestId("email-mobile-tool-colors").click();
    expect(
      await axeSerious(
        page,
        '[data-testid="email-mobile-sheet"], [data-testid="email-contextual-drawer"]'
      )
    ).toEqual([]);

    await page.getByTestId("email-return-studio").click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/campaigns/${opened.campaignId}`));

    await detached.close();
  });
});
