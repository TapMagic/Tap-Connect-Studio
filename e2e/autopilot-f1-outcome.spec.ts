/**
 * Autopilot F1 outcome experience — multi-viewport headed proofs + screenshots + axe.
 * Requires PROOF_HEADED=1 and local server + isolated DB.
 *
 *   PROOF_HEADED=1 BASE_URL=http://127.0.0.1:3000 \
 *   npx playwright test e2e/autopilot-f1-outcome.spec.ts --headed
 */
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";

const headed = process.env.PROOF_HEADED === "1";
const OUT = path.join(process.cwd(), "tmp", "f1-outcome-proofs");

const VIEWPORTS = [
  { id: "desktop", width: 1400, height: 900 },
  { id: "tablet", width: 768, height: 1024 },
  { id: "phone", width: 390, height: 844 },
] as const;

async function noHorizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-testid="autopilot-outcome-experience"]');
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
  const results = await new AxeBuilder({ page })
    .include('[data-testid="autopilot-outcome-experience"]')
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

async function prepareReview(page: Page) {
  await page.goto("/dashboard/card?wire=offer", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("autopilot-outcome-experience")).toBeVisible({
    timeout: 60_000,
  });
  await waitForAutopilotReady(page);
  const prepare = page.getByTestId("autopilot-prepare-plan");
  await prepare.click();
  await expect(page.getByTestId("autopilot-outcome-review")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("autopilot-review-heading")).toBeFocused();

  // Answer required free-text if present
  const valueInput = page.getByTestId("autopilot-answer-input-missing_offer.value");
  if (await valueInput.isVisible().catch(() => false)) {
    await valueInput.fill("Free dessert with any entrée");
  }
  // Non-blocking email choice if present
  const emailChoice = page.getByTestId("autopilot-answer-email_not_connected-card_only");
  if (await emailChoice.isVisible().catch(() => false)) {
    await emailChoice.click();
  }
}

test.describe("autopilot F1 outcome experience", () => {
  test.skip(!headed, "Set PROOF_HEADED=1 for headed Autopilot F1 proofs");

  test.beforeAll(() => {
    fs.mkdirSync(OUT, { recursive: true });
  });

  test("Create recipe opens Card Autopilot outcome intake at phone width", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard");
    const recipe = page.getByRole("link", {
      name: /Create a measurable offer on my Card/i,
    });
    if (await recipe.count()) {
      await recipe.first().click();
    } else {
      await page.goto("/dashboard/card?wire=offer");
    }

    await expect(page.getByTestId("autopilot-outcome-experience")).toBeVisible({
      timeout: 60_000,
    });
    await waitForAutopilotReady(page);
    await expect(page.getByTestId("autopilot-outcome-intake")).toBeVisible();
    await expect(page.getByTestId("autopilot-prepare-plan")).toBeVisible();

    const overflow = await noHorizontalOverflow(page);
    expect(overflow.overflow || overflow.docOverflow).toBe(false);

    await page.screenshot({
      path: path.join(OUT, "phone-intake.png"),
      fullPage: true,
    });
  });

  test("Primary flow across desktop / tablet / phone with screenshots + axe", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const axeNotes: string[] = [];

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await prepareReview(page);

      await expect(page.getByTestId("autopilot-section-goal")).toBeVisible();
      await expect(page.getByTestId("autopilot-section-prepared")).toBeVisible();
      await expect(page.getByTestId("autopilot-unified-preview")).toBeVisible();
      await expect(page.getByTestId("autopilot-section-needs-you")).toBeVisible();
      await expect(page.getByTestId("autopilot-section-ready")).toBeVisible();

      // Advanced collapsed by default
      await expect(page.getByTestId("autopilot-advanced-panel")).toHaveCount(0);
      await expect(page.getByTestId("card-offer-manual-wire")).toBeVisible();

      // Primary copy must not expose contract terms
      const primaryText = await page.getByTestId("autopilot-outcome-experience").innerText();
      for (const term of [
        "recipeId",
        "objectMutations",
        "review_before_publish",
        "KnowledgeFact",
        "schemaVersion",
        "interventionCode",
      ]) {
        expect(primaryText.includes(term)).toBe(false);
      }

      const overflow = await noHorizontalOverflow(page);
      expect(overflow.overflow, `${vp.id} overflow`).toBe(false);

      await page.screenshot({
        path: path.join(OUT, `${vp.id}-review.png`),
        fullPage: true,
      });

      const serious = await axeSeriousCritical(page);
      axeNotes.push(`${vp.id}:serious=${serious.length}`);
      expect(serious, `${vp.id} axe ${JSON.stringify(serious)}`).toEqual([]);
    }

    // Persist axe summary
    fs.writeFileSync(path.join(OUT, "axe-summary.txt"), axeNotes.join("\n") + "\n");
  });

  test("Keyboard, focus, approve/reject/edit/start-over/manual/advanced", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard/card?wire=offer", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("autopilot-outcome-experience")).toBeVisible({
      timeout: 60_000,
    });
    await waitForAutopilotReady(page);

    // Focus prepare via keyboard path
    await page.getByTestId("autopilot-prepare-plan").focus();
    await expect(page.getByTestId("autopilot-prepare-plan")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("autopilot-outcome-review")).toBeVisible();
    await expect(page.getByTestId("autopilot-review-heading")).toBeFocused();

    // Focus should be able to reach review controls (no trap)
    const valueInput = page.getByTestId("autopilot-answer-input-missing_offer.value");
    if (await valueInput.isVisible().catch(() => false)) {
      await valueInput.focus();
      await expect(valueInput).toBeFocused();
      await valueInput.fill("Weekend coffee for returning guests");
      // Tab onward
      await page.keyboard.press("Tab");
    }

    const emailChoice = page.getByTestId("autopilot-answer-email_not_connected-card_only");
    if (await emailChoice.isVisible().catch(() => false)) {
      await emailChoice.focus();
      await expect(emailChoice).toBeFocused();
      await page.keyboard.press("Enter");
    }

    const approve = page.getByTestId("autopilot-approve-plan");
    await approve.focus();
    await expect(approve).toBeFocused();
    if (await approve.isEnabled()) {
      await page.keyboard.press("Enter");
      await expect(page.getByTestId("autopilot-outcome-state")).toHaveAttribute(
        "data-state",
        "approved_locally"
      );
    }

    // Reject
    await page.getByTestId("autopilot-reject-plan").click();
    await expect(page.getByTestId("autopilot-outcome-rejected")).toBeVisible();

    // Edit goal returns to intake
    await page.getByTestId("autopilot-edit-goal").click();
    await expect(page.getByTestId("autopilot-outcome-intake")).toBeVisible();
    await page.getByTestId("autopilot-prepare-plan").click();
    await expect(page.getByTestId("autopilot-outcome-review")).toBeVisible();

    // Advanced toggle aria-expanded
    const adv = page.getByTestId("autopilot-advanced-toggle");
    await expect(adv).toHaveAttribute("aria-expanded", "false");
    await adv.click();
    await expect(adv).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByTestId("autopilot-advanced-panel")).toBeVisible();
    await page.screenshot({
      path: path.join(OUT, "phone-advanced-open.png"),
      fullPage: true,
    });
    await adv.click();
    await expect(page.getByTestId("autopilot-advanced-panel")).toHaveCount(0);

    // Manual control link
    await expect(page.getByTestId("autopilot-manual-control")).toHaveAttribute(
      "href",
      "/dashboard/card/edit"
    );

    // Start over
    await page.getByTestId("autopilot-start-over").click();
    await expect(page.getByTestId("autopilot-outcome-intake")).toBeVisible();

    // Honesty: no live execution claim in primary UI
    await page.getByTestId("autopilot-prepare-plan").click();
    const copy = await page.getByTestId("autopilot-section-ready").innerText();
    expect(copy.toLowerCase()).toMatch(/local|does not publish|not published|not sent/);
  });
});
