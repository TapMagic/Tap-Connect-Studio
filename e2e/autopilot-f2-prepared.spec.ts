/**
 * Autopilot F2 prepared outcome — multi-viewport headed proofs + screenshots + axe.
 * Requires PROOF_HEADED=1 and local server + isolated DB.
 *
 *   PROOF_HEADED=1 BASE_URL=http://127.0.0.1:3000 \
 *   npx playwright test e2e/autopilot-f2-prepared.spec.ts --headed
 */
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";

const headed = process.env.PROOF_HEADED === "1";
const OUT = path.join(process.cwd(), "tmp", "f2-prepared-proofs");

async function noHorizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const root =
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
  const include = (await page.getByTestId("autopilot-prepared-outcome").count())
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

async function waitForAutopilotReady(page: Page) {
  await expect(page.getByTestId("autopilot-outcome-experience")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 60_000 }
  );
  await expect(page.getByTestId("autopilot-prepare-plan")).toBeEnabled();
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

async function prepareThroughOutcome(page: Page, opts?: { capturePreparing?: string }) {
  await page.goto("/dashboard/card?wire=offer", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("autopilot-outcome-experience")).toBeVisible({
    timeout: 60_000,
  });
  await waitForAutopilotReady(page);
  await page.getByTestId("autopilot-prepare-plan").click();
  await expect(page.getByTestId("autopilot-outcome-review")).toBeVisible({
    timeout: 30_000,
  });
  await answerPlanQuestions(page);
  await approvePlan(page);

  const prepareOutcome = page.getByTestId("autopilot-prepare-outcome");
  await expect(prepareOutcome).toBeVisible({ timeout: 15_000 });

  if (opts?.capturePreparing) {
    await Promise.all([
      page.waitForSelector('[data-testid="autopilot-prepared-state"][data-state="preparing"]', {
        timeout: 10_000,
      }),
      prepareOutcome.click(),
    ]);
    await page.screenshot({
      path: path.join(OUT, opts.capturePreparing),
      fullPage: true,
    });
  } else {
    await prepareOutcome.click();
  }

  await expect(page.getByTestId("autopilot-prepared-outcome")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("autopilot-prepared-state")).toHaveAttribute(
    "data-state",
    "prepared",
    { timeout: 30_000 }
  );
}

test.describe("autopilot F2 prepared outcome", () => {
  test.skip(!headed, "Set PROOF_HEADED=1 for headed Autopilot F2 proofs");

  test.beforeAll(() => {
    fs.mkdirSync(OUT, { recursive: true });
  });

  test("desktop preparing → prepared + axe + preview from prepared drafts", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await prepareThroughOutcome(page, {
      capturePreparing: "f2-preparing-desktop.png",
    });

    await expect(page.getByTestId("autopilot-prepared-heading")).toBeFocused();
    await expect(page.getByTestId("autopilot-prepared-heading")).toContainText(
      /prepared and ready to go live/i
    );
    await expect(page.getByTestId("autopilot-prepared-result")).toBeVisible();
    await expect(page.getByTestId("autopilot-unified-preview-prepared")).toBeVisible();
    // Preview must come from prepared refs (Card Spotlight + email draft surfaces)
    await expect(page.getByTestId("autopilot-unified-preview-prepared")).toContainText(
      /Card Spotlight|Email draft|TapCast|Insights/i
    );
    await expect(page.getByTestId("autopilot-make-live")).toBeDisabled();
    await expect(page.getByTestId("autopilot-final-approval")).toBeVisible();
    await expect(page.getByTestId("autopilot-honesty")).toContainText(/Prepared locally/i);
    await expect(page.getByTestId("autopilot-prepared-state")).toHaveAttribute(
      "role",
      "status"
    );

    // Advanced collapsed by default
    await expect(page.getByTestId("autopilot-prepared-advanced")).toHaveCount(0);
    await page.getByTestId("autopilot-prepared-advanced-toggle").click();
    await expect(page.getByTestId("autopilot-prepared-advanced")).toBeVisible();
    await expect(page.getByTestId("autopilot-prepared-advanced")).toContainText(
      /preparedObjects|livePublish=false/i
    );
    await page.getByTestId("autopilot-prepared-advanced-toggle").click();
    await expect(page.getByTestId("autopilot-prepared-advanced")).toHaveCount(0);

    const overflow = await noHorizontalOverflow(page);
    expect(overflow.overflow || overflow.docOverflow).toBeFalsy();
    const violations = await axeSeriousCritical(page);
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);

    await page.screenshot({
      path: path.join(OUT, "f2-prepared-desktop.png"),
      fullPage: true,
    });
  });

  test("tablet prepared result + axe", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await prepareThroughOutcome(page);
    await expect(page.getByTestId("autopilot-prepared-result")).toBeVisible();
    const overflow = await noHorizontalOverflow(page);
    expect(overflow.overflow || overflow.docOverflow).toBeFalsy();
    const violations = await axeSeriousCritical(page);
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
    await page.screenshot({
      path: path.join(OUT, "f2-prepared-tablet.png"),
      fullPage: true,
    });
  });

  test("phone prepared + preview + advanced + rollback + reprepare", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await prepareThroughOutcome(page);

    await expect(page.getByTestId("autopilot-prepared-heading")).toBeFocused();
    await page.screenshot({
      path: path.join(OUT, "f2-prepared-phone.png"),
      fullPage: true,
    });

    await page.getByTestId("autopilot-prepared-preview").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(OUT, "f2-preview-phone.png"),
      fullPage: true,
    });

    await page.getByTestId("autopilot-prepared-advanced-toggle").click();
    await expect(page.getByTestId("autopilot-prepared-advanced")).toBeVisible();
    await expect(page.getByTestId("autopilot-prepared-heading")).not.toContainText(
      "objectMutations"
    );
    await page.screenshot({
      path: path.join(OUT, "f2-advanced-phone.png"),
      fullPage: true,
    });
    await page.getByTestId("autopilot-prepared-advanced-toggle").click();

    // Undo — focus should land on rolled-back heading
    await page.getByTestId("autopilot-undo-preparation").click();
    await expect(page.getByTestId("autopilot-prepared-state")).toHaveAttribute(
      "data-state",
      "rolled_back"
    );
    await expect(page.getByTestId("autopilot-prepared-heading")).toContainText(/undone/i);
    await expect(page.getByTestId("autopilot-prepared-heading")).toBeFocused();
    await page.screenshot({
      path: path.join(OUT, "f2-rolled-back-phone.png"),
      fullPage: true,
    });

    const overflow = await noHorizontalOverflow(page);
    expect(overflow.overflow || overflow.docOverflow).toBeFalsy();
    const violations = await axeSeriousCritical(page);
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);

    await page.getByTestId("autopilot-reprepare").click();
    await expect(page.getByTestId("autopilot-prepared-state")).toHaveAttribute(
      "data-state",
      "prepared",
      { timeout: 30_000 }
    );
  });

  test("phone stale after edit goal + re-prepare", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await prepareThroughOutcome(page);

    const onCardBefore = await page
      .getByTestId("autopilot-prepared-result")
      .innerText();

    await page.getByTestId("autopilot-prepared-edit-goal").click();
    await expect(page.getByTestId("autopilot-outcome-intake")).toBeVisible();
    await page.getByTestId("autopilot-outcome-brief").fill(
      "Bring returning customers back this weekend with a clearer Card offer"
    );
    // Cancel returns to prepared — should be marked stale
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByTestId("autopilot-prepared-outcome")).toBeVisible();
    await expect(page.getByTestId("autopilot-prepared-outcome")).toHaveAttribute(
      "data-stale",
      "true"
    );
    await expect(page.getByTestId("autopilot-prepared-state")).toHaveAttribute(
      "data-readiness",
      "stale_prepare_again"
    );
    await expect(page.getByTestId("autopilot-prepared-heading")).toContainText(
      /goal or plan changed|out of date|prepare again/i
    );

    await page.getByTestId("autopilot-reprepare").click();
    await expect(page.getByTestId("autopilot-prepared-state")).toHaveAttribute(
      "data-state",
      "prepared",
      { timeout: 30_000 }
    );
    await expect(page.getByTestId("autopilot-prepared-outcome")).toHaveAttribute(
      "data-stale",
      "false"
    );
    // Presentation / prepared result still coherent (not a mutation dump)
    await expect(page.getByTestId("autopilot-prepared-result")).toBeVisible();
    const onCardAfter = await page.getByTestId("autopilot-prepared-result").innerText();
    expect(onCardAfter.length).toBeGreaterThan(20);
    expect(onCardBefore.length).toBeGreaterThan(20);

    await page.screenshot({
      path: path.join(OUT, "f2-stale-reprepare-phone.png"),
      fullPage: true,
    });
  });

  test("phone manual control freezes Autopilot and opens editor", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await prepareThroughOutcome(page);

    await page.getByTestId("autopilot-prepared-manual").click();
    await expect(page).toHaveURL(/\/dashboard\/card\/edit/);
    await page.screenshot({
      path: path.join(OUT, "f2-manual-control-phone.png"),
      fullPage: true,
    });
  });

  test("return to Studio from prepared escape", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await prepareThroughOutcome(page);
    await page.getByTestId("autopilot-return-studio").click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("keyboard path: Tab reaches Undo without trap", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await prepareThroughOutcome(page);
    await expect(page.getByTestId("autopilot-prepared-heading")).toBeFocused();
    let reachedUndo = false;
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press("Tab");
      const focused = await page.evaluate(
        () => document.activeElement?.getAttribute("data-testid") || ""
      );
      if (focused === "autopilot-undo-preparation") {
        reachedUndo = true;
        break;
      }
    }
    expect(reachedUndo).toBeTruthy();
  });
});
