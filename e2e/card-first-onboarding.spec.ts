import { mkdirSync } from "node:fs";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const evidence = path.resolve(
  process.cwd(),
  "tmp/card-first-onboarding-owner-evidence"
);

test.describe.serial("Card-first onboarding Owner walkthrough", () => {
  test.setTimeout(180_000);

  test("completes the visible draft-only journey on desktop and mobile", async ({
    page,
  }) => {
    mkdirSync(evidence, { recursive: true });

    await page.goto("/auth/continue", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/onboarding/);
    await expect(
      page.getByRole("heading", { name: "Your first living Card" })
    ).toBeVisible();

    const businessName = page.getByLabel("Business name");
    if (await businessName.isVisible()) {
      await businessName.fill("Northstar Workshop");
      await page.getByLabel("Website or domain").fill("https://northstar.example");
      await page.getByLabel("Business category").selectOption("HOME_LOCAL_SERVICES");
      await page.getByLabel("First customer outcome").selectOption("CONTACT");
      await page.getByRole("button", { name: "Create my first Card" }).click();
      await expect(
        page.getByRole("heading", { name: "Confirm what we found" })
      ).toBeVisible();
    }

    const knowledgeHeading = page.getByRole("heading", {
      name: "Confirm what we found",
    });
    if (await knowledgeHeading.isVisible()) {
      await expect(page.getByText("Northstar Workshop").last()).toBeVisible();
      await page.screenshot({
        path: path.join(evidence, "01-early-provisional-card-desktop.png"),
        fullPage: true,
      });

      await page.getByRole("button", { name: "Review homepage" }).click();
      await expect(
        page.getByRole("status").filter({ hasText: /remain Suggested/i })
      ).toBeVisible();
      await expect(page.getByText("northstar.example").first()).toBeVisible();
      await expect(page.getByText("Suggested").first()).toBeVisible();

      const suggested = page
        .locator("article")
        .filter({ hasText: "hello@northstar.example" })
        .first();
      const approveFact = suggested.getByRole("button", { name: "Approve fact" });
      if (await approveFact.isVisible()) await approveFact.click();
      await expect(suggested.getByText("APPROVED")).toBeVisible();

      await page.reload({ waitUntil: "networkidle" });
      await expect(page.getByText("hello@northstar.example").first()).toBeVisible();
      await expect(page.getByText("northstar.example").first()).toBeVisible();
      await page.screenshot({
        path: path.join(evidence, "02-governed-knowledge-desktop.png"),
        fullPage: true,
      });

      await page.getByRole("button", { name: "Continue to Brand" }).click();
      await expect(
        page.getByRole("heading", { name: "We found your Brand" })
      ).toBeVisible();
    }

    const brandHeading = page.getByRole("heading", { name: "We found your Brand" });
    if (await brandHeading.isVisible()) {
      const prepareKit = page.getByRole("button", {
        name: "Prepare Brand Starter Kit",
      });
      if (await prepareKit.isVisible()) await prepareKit.click();
      await expect(page.getByText("primaryColor", { exact: true }).first()).toBeVisible();
      await expect(page.getByText("accessibility", { exact: true }).first()).toBeVisible();

      const primaryColor = page
        .locator("article")
        .filter({ hasText: "primaryColor" })
        .first();
      const approveColor = primaryColor.getByRole("button", { name: "Approve" });
      if (await approveColor.isVisible()) await approveColor.click();
      const lockColor = primaryColor.getByRole("button", {
        name: "Lock",
        exact: true,
      });
      if ((await primaryColor.getByLabel("Locked").count()) === 0) {
        await expect(lockColor).toBeVisible();
        await lockColor.click();
      }
      await expect(primaryColor.getByLabel("Locked")).toBeVisible();

      await page.getByRole("button", { name: "Replace logo" }).click();
      await expect(page.getByText("Logo.dev availability")).toBeVisible();
      await page.getByTestId("media-browser-search").fill("northstar.example");
      await page.getByRole("button", { name: "Search" }).click();
      await page.getByTestId("media-browser-result").first().click();
      await page.getByTestId("media-browser-insert").click();
      const logoDecision = page.locator("article").filter({ hasText: "logo" }).last();
      await expect(logoDecision).toContainText("SUGGESTED");
      const approveRights = logoDecision.getByRole("button", {
        name: "Approve asset rights",
      });
      if ((await approveRights.count()) > 0 && (await approveRights.isEnabled())) {
        await approveRights.click();
      }
      const approveLogo = logoDecision.getByRole("button", {
        name: "Approve",
        exact: true,
      });
      if ((await approveLogo.count()) > 0 && (await approveLogo.isVisible())) {
        await approveLogo.click();
      }

      await page.getByRole("button", { name: "Browse Pexels imagery" }).click();
      await expect(page.getByText("Pexels availability")).toBeVisible();
      await page.getByTestId("media-browser-search").fill("workshop");
      await page.getByRole("button", { name: "Search" }).click();
      await page.getByTestId("media-browser-result").first().click();
      await page.getByTestId("media-browser-insert").click();
      await expect(
        page.locator("article").filter({ hasText: "imageryDirection" }).last()
      ).toContainText("SUGGESTED");

      await page.reload({ waitUntil: "networkidle" });
      await expect(
        page
          .locator("article")
          .filter({ hasText: "primaryColor" })
          .first()
          .getByLabel("Locked")
      ).toBeVisible();
      await page.screenshot({
        path: path.join(evidence, "03-brand-starter-kit-desktop.png"),
        fullPage: true,
      });

      await page.getByRole("button", { name: "Continue to first Card" }).click();
    }
    await expect(page.getByText("Draft changes not published").first()).toBeVisible();
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText(/Saved draft · Draft changes not published/).first()).toBeVisible();

    const brandBeforeStudio = await page.request.get("/api/brand");
    expect(brandBeforeStudio.ok()).toBeTruthy();
    const before = await brandBeforeStudio.json();
    expect(before.brandKit.tapCard).toEqual({});
    expect(before.brandKit.tapCardDraft.sections.length).toBeGreaterThan(0);

    await page.getByRole("link", { name: "Edit in Creative Studio" }).click();
    await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible();
    const draftSave = page.waitForResponse(
      (response) =>
        response.url().includes("/api/card/draft") &&
        response.request().method() === "PUT"
    );
    await page.getByTestId("card-save").first().click();
    expect((await draftSave).ok()).toBeTruthy();
    await expect(page.getByText(/Draft changes not published/).first()).toBeVisible();
    await page.getByTestId("card-edit-done-link").click();
    await expect(page).toHaveURL(/\/onboarding\?stage=card/);

    const brandAfterStudio = await page.request.get("/api/brand");
    const after = await brandAfterStudio.json();
    expect(after.brandKit.tapCard).toEqual({});
    expect(after.brandKit.tapCardDraftRevision).toBeGreaterThan(
      before.brandKit.tapCardDraftRevision
    );

    await page.getByRole("link", { name: "Preview as customer" }).click();
    await expect(page).toHaveURL(/\/dashboard\/card\/preview/);
    await expect(
      page.getByText("Customer preview · Draft changes not published")
    ).toBeVisible();
    await expect(page.getByText("Northstar Workshop").first()).toBeVisible();
    await page.screenshot({
      path: path.join(evidence, "04-customer-draft-preview.png"),
      fullPage: true,
    });
    await page.goto("/onboarding?stage=card", { waitUntil: "networkidle" });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Living Card preview" }).click();
    await expect(page.getByLabel("Living Card preview")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflow).toBe(false);
    await page.screenshot({
      path: path.join(evidence, "05-onboarding-mobile-390.png"),
      fullPage: true,
    });

    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations).toEqual([]);

    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe("BODY");

    await page.getByRole("button", { name: "Finish onboarding" }).click();
    await expect(page).toHaveURL(/\/dashboard\/card/);
  });
});
