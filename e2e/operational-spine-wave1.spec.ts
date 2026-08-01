import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const evidence = path.join("docs", "product-reconstitution", "wave-1", "evidence");

async function expectNoSeriousAccessibilityViolations(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = result.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
}

async function capture(page: Page, name: string, fullPage = true) {
  await page.screenshot({ path: path.join(evidence, name), fullPage });
}

test.describe("Wave 1 operational spine", () => {
  test.describe.configure({ timeout: 240_000 });

  test("desktop Owner surfaces, Card publication, and direct navigation", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dashboard/card/edit", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("card-status-next")).toContainText(/Saved draft|Unsaved changes/);
    await expect(page.getByTestId("card-publication-state")).toContainText(/Published revision|Not published/);
    await capture(page, "01-card-draft-lifecycle-desktop.png", false);

    await expect
      .poll(
        () =>
          page
            .getByTestId("card-save")
            .evaluate((element) => Object.keys(element).some((key) => key.startsWith("__reactProps$"))),
        { timeout: 60_000, message: "Card controls should be hydrated before mutation" },
      )
      .toBe(true);

    if ((await page.getByTestId("card-publication-state").textContent())?.includes("Not published")) {
      const saveResponse = page.waitForResponse(
        (response) => response.url().endsWith("/api/card/draft") && response.request().method() === "PUT",
      );
      await page.getByTestId("card-save").click();
      expect((await saveResponse).ok()).toBe(true);
      await expect(page.getByRole("status")).toContainText("Saved draft", { timeout: 30_000 });
    }
    const publish = page.getByTestId("card-publish");
    await expect(publish).toBeVisible();
    await expect(publish).toBeEnabled();
    if (await publish.isEnabled()) {
      const publicationResponse = page.waitForResponse(
        (response) =>
          response.url().endsWith("/api/card/publication") &&
          response.request().method() === "POST",
      );
      await publish.click();
      expect((await publicationResponse).ok()).toBe(true);
      await expect(page.getByTestId("card-publication-state")).toContainText("Published revision", {
        timeout: 30_000,
      });
      await expect(page.getByTestId("card-status-next")).toContainText("Saved draft · Published");
    }
    await capture(page, "02-card-published-state-desktop.png", false);

    await page.goto("/dashboard/card/preview", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("card-preview-workspace")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("card-save")).toHaveCount(0);
    await capture(page, "03-card-saved-preview-desktop.png", false);

    await page.goto("/dashboard/schedule", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Scheduled Campaigns" })).toBeVisible();
    await expect(page.getByText(/why it wins/i)).toBeVisible();
    await capture(page, "04-schedule-explanation-desktop.png");

    await page.goto("/dashboard/tap-trace", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Tap Trace" })).toBeVisible();
    await expect(page.getByTestId("tap-trace-list")).toBeVisible();
    await capture(page, "05-tap-trace-list-desktop.png");

    await page.goto("/dashboard/email", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Email", exact: true })).toBeVisible();
    await expect(page.getByText(/Real sending is disabled/i)).toBeVisible();
    await capture(page, "06-email-lifecycle-desktop.png");
    await expectNoSeriousAccessibilityViolations(page);

    await page.goto("/control?section=demo", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Demo Studio" })).toBeVisible({ timeout: 60_000 });
    await capture(page, "07-control-room-demo-return-desktop.png");
  });

  test("390px spine and reduced-motion state", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });

    for (const [route, testId, shot] of [
      ["/dashboard/card/edit", "card-edit-workspace-host", "08-card-mobile-390-reduced-motion.png"],
      ["/dashboard/schedule", "schedule-page", "09-schedule-mobile-390.png"],
      ["/dashboard/tap-trace", "tap-trace-page", "10-tap-trace-mobile-390.png"],
      ["/dashboard/email", "email-page", "11-email-mobile-390.png"],
    ] as const) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId(testId)).toBeVisible({ timeout: 60_000 });
      const overflow = await page.getByTestId(testId).evaluate(
        (element) => element.scrollWidth - element.clientWidth,
      );
      expect(overflow, `${route} horizontal overflow`).toBeLessThanOrEqual(1);
      await capture(page, shot, false);
    }

    await expectNoSeriousAccessibilityViolations(page);
  });
});
