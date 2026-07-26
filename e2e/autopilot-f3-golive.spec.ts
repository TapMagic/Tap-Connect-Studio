/**
 * Autopilot F3 one-tap go-live + observation — multi-viewport headed proofs + axe.
 * Requires PROOF_HEADED=1 and local server + isolated DB.
 *
 *   PROOF_HEADED=1 BASE_URL=http://127.0.0.1:3000 \
 *   npx playwright test e2e/autopilot-f3-golive.spec.ts --headed
 */
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";

const headed = process.env.PROOF_HEADED === "1";
const OUT = path.join(process.cwd(), "tmp", "f3-golive-proofs");

async function noHorizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const root =
      document.querySelector('[data-testid="autopilot-live-outcome"]') ||
      document.querySelector('[data-testid="autopilot-prepared-outcome"]') ||
      document.querySelector('[data-testid="autopilot-outcome-experience"]');
    const doc = document.documentElement;
    const target = root ?? doc;
    return {
      overflow: target.scrollWidth > target.clientWidth + 2,
      scrollW: target.scrollWidth,
      clientW: target.clientWidth,
      docOverflow: doc.scrollWidth > doc.clientWidth + 2,
    };
  });
}

async function axeSeriousCritical(page: Page) {
  const include = (await page.getByTestId("autopilot-live-outcome").count())
    ? '[data-testid="autopilot-live-outcome"]'
    : (await page.getByTestId("autopilot-prepared-outcome").count())
      ? '[data-testid="autopilot-prepared-outcome"]'
      : '[data-testid="autopilot-outcome-experience"]';
  const results = await new AxeBuilder({ page })
    .include(include)
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  return results.violations.filter((v) =>
    ["serious", "critical"].includes(v.impact || "")
  );
}

async function clearLiveIfPresent(page: Page) {
  const live = page.getByTestId("autopilot-live-outcome");
  if (!(await live.isVisible().catch(() => false))) return;

  // Prefer Undo — Stop alone leaves a focused Stopped shell that blocks a new prepare.
  const undo = page.getByTestId("autopilot-undo-golive");
  const stop = page.getByTestId("autopilot-stop-live");
  const action =
    (await undo.isEnabled().catch(() => false))
      ? undo
      : (await stop.isEnabled().catch(() => false))
        ? stop
        : null;

  if (action) {
    await action.scrollIntoViewIfNeeded();
    await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes("/api/autopilot/live/interrupt") &&
          r.request().method() === "POST",
        { timeout: 45_000 }
      ),
      action.click(),
    ]);
  }

  const ret = page.getByTestId("autopilot-return-studio");
  if (await ret.isVisible().catch(() => false)) {
    await ret.click();
  }
}

async function waitForAutopilotReady(page: Page) {
  // Focused live escape replaces the intake shell — wait for either surface.
  await expect(
    page
      .getByTestId("autopilot-prepare-plan")
      .or(page.getByTestId("autopilot-live-outcome"))
      .or(page.getByTestId("autopilot-prepared-outcome"))
  ).toBeVisible({ timeout: 60_000 });

  // Allow authoritative live GET to settle before deciding intake vs live.
  await Promise.race([
    page
      .waitForResponse(
        (r) =>
          r.url().includes("/api/autopilot/live") &&
          r.request().method() === "GET",
        { timeout: 8_000 }
      )
      .catch(() => null),
    page.waitForTimeout(800),
  ]);

  for (let attempt = 0; attempt < 3; attempt++) {
    if (await page.getByTestId("autopilot-live-outcome").isVisible().catch(() => false)) {
      await clearLiveIfPresent(page);
      await page.goto("/dashboard/card?wire=offer", {
        waitUntil: "domcontentloaded",
      });
      await expect(
        page
          .getByTestId("autopilot-prepare-plan")
          .or(page.getByTestId("autopilot-live-outcome"))
          .or(page.getByTestId("autopilot-prepared-outcome"))
      ).toBeVisible({ timeout: 60_000 });
      await Promise.race([
        page
          .waitForResponse(
            (r) =>
              r.url().includes("/api/autopilot/live") &&
              r.request().method() === "GET",
            { timeout: 8_000 }
          )
          .catch(() => null),
        page.waitForTimeout(800),
      ]);
      continue;
    }
    break;
  }

  await expect(page.getByTestId("autopilot-prepare-plan")).toBeEnabled({
    timeout: 30_000,
  });
}

async function answerPlanQuestions(page: Page) {
  const valueInput = page.getByTestId("autopilot-answer-input-missing_offer.value");
  if (await valueInput.isVisible().catch(() => false)) {
    await valueInput.fill("Free dessert with any entrée");
  }
  const emailChoice = page.getByTestId("autopilot-answer-email_not_connected-card_only");
  if (await emailChoice.isVisible().catch(() => false)) {
    await emailChoice.click();
  }
}

async function approvePlan(page: Page) {
  const approve = page.getByTestId("autopilot-approve-plan");
  if (await approve.isVisible().catch(() => false)) {
    await expect(approve).toBeEnabled({ timeout: 15_000 });
    await approve.click();
  }
}

async function prepareThroughOutcome(page: Page) {
  await page.goto("/dashboard/card?wire=offer", { waitUntil: "domcontentloaded" });
  await waitForAutopilotReady(page);
  await page.getByTestId("autopilot-prepare-plan").click();
  await expect(page.getByTestId("autopilot-outcome-review")).toBeVisible({
    timeout: 30_000,
  });
  await answerPlanQuestions(page);
  await approvePlan(page);
  await page.getByTestId("autopilot-prepare-outcome").click();
  await expect(page.getByTestId("autopilot-prepared-outcome")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("autopilot-prepared-state")).toHaveAttribute(
    "data-state",
    "prepared",
    { timeout: 30_000 }
  );
}

async function makeLive(page: Page) {
  const makeLiveBtn = page.getByTestId("autopilot-make-live");
  await expect(makeLiveBtn).toBeVisible({ timeout: 15_000 });
  const blocked = page.getByTestId("autopilot-golive-blocked");
  if (await blocked.isVisible().catch(() => false)) {
    test.info().annotations.push({
      type: "note",
      description: await blocked.innerText(),
    });
  }
  await page.getByTestId("autopilot-final-approval-input").check();
  await expect(makeLiveBtn).toBeEnabled({ timeout: 10_000 });
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes("/api/autopilot/live") &&
        r.request().method() === "POST" &&
        !r.url().includes("interrupt"),
      { timeout: 45_000 }
    ),
    makeLiveBtn.click(),
  ]);
  const json = (await response.json().catch(() => null)) as {
    ok?: boolean;
    error?: string;
    code?: string;
  } | null;
  if (!response.ok() || !json?.ok) {
    throw new Error(
      `Make it live API failed: status=${response.status()} code=${json?.code || "?"} error=${json?.error || "?"}`
    );
  }
  await expect(page.getByTestId("autopilot-live-outcome")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("autopilot-live-heading")).toContainText(
    /Your offer is live|Scheduled/i
  );
}

test.describe("autopilot F3 one-tap go-live", () => {
  test.skip(!headed, "Set PROOF_HEADED=1 for headed Autopilot F3 proofs");

  test.beforeAll(() => {
    fs.mkdirSync(OUT, { recursive: true });
  });

  test("desktop prepare → approve → Make it live + axe", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await prepareThroughOutcome(page);
    await expect(page.getByTestId("autopilot-external-boundary")).toContainText(
      /Email and social/i
    );
    await expect(page.getByTestId("autopilot-make-live")).toBeVisible();
    await makeLive(page);
    await expect(page.getByTestId("autopilot-live-state")).toHaveAttribute(
      "role",
      "status"
    );
    await expect(page.getByTestId("autopilot-live-honesty")).toContainText(
      /have not been sent/i
    );
    await expect(page.getByTestId("autopilot-live-observation")).toBeVisible();
    await expect(page.getByTestId("autopilot-stop-live")).toBeVisible();
    await expect(page.getByTestId("autopilot-undo-golive")).toBeVisible();

    // Wiring stays in Advanced
    await expect(page.getByTestId("autopilot-prepared-advanced")).toHaveCount(0);
    const overflow = await noHorizontalOverflow(page);
    expect(overflow.overflow || overflow.docOverflow).toBeFalsy();
    const violations = await axeSeriousCritical(page);
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
    await page.screenshot({
      path: path.join(OUT, "f3-live-desktop.png"),
      fullPage: true,
    });
  });

  test("tablet live result + axe", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await prepareThroughOutcome(page);
    await makeLive(page);
    const overflow = await noHorizontalOverflow(page);
    expect(overflow.overflow || overflow.docOverflow).toBeFalsy();
    const violations = await axeSeriousCritical(page);
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
    await page.screenshot({
      path: path.join(OUT, "f3-live-tablet.png"),
      fullPage: true,
    });
  });

  test("phone one-hand Make it live + Stop + axe", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await prepareThroughOutcome(page);
    await makeLive(page);
    await expect(page.getByTestId("autopilot-live-heading")).toBeFocused();
    await page.getByTestId("autopilot-stop-live").click();
    await expect(page.getByTestId("autopilot-live-state")).toHaveAttribute(
      "data-state",
      "stopped"
    );
    const overflow = await noHorizontalOverflow(page);
    expect(overflow.overflow || overflow.docOverflow).toBeFalsy();
    const violations = await axeSeriousCritical(page);
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
    await page.screenshot({
      path: path.join(OUT, "f3-stopped-phone.png"),
      fullPage: true,
    });
  });

  test("keyboard focus after Make it live", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await prepareThroughOutcome(page);
    await page.getByTestId("autopilot-final-approval-input").focus();
    await page.keyboard.press("Space");
    await page.getByTestId("autopilot-make-live").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("autopilot-live-heading")).toBeFocused({
      timeout: 15_000,
    });
  });

  test("Undo go-live returns to prepared", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await prepareThroughOutcome(page);
    await makeLive(page);
    await page.getByTestId("autopilot-undo-golive").click();
    // Undo restores prepared outcome surface (not a permanent Live destination)
    await expect(page.getByTestId("autopilot-prepared-outcome")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("autopilot-prepared-heading")).toContainText(
      /prepared and ready to go live|Undone|undone/i
    );
    await expect(page.getByTestId("autopilot-make-live")).toBeVisible();
  });
});
