import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const enabled = process.env.STUDIO_SLICE3_TEXT_ACCEPTANCE === "1";
const evidence = path.join("docs", "product-reconstitution", "creative-studio-platform", "proofs", "studio-slice3-text-north-star");

async function openAdd(page: Page) {
  await page.getByTestId("studio-rail-add").click();
  await expect(page.getByTestId("studio-add-home")).toBeVisible();
}

test.describe("Slice 3 Text North Star", () => {
  test.skip(!enabled, "Set STUDIO_SLICE3_TEXT_ACCEPTANCE=1 for the isolated Rich review runtime");
  test.describe.configure({ timeout: 240_000 });

  test("authors six-role Text Boxes, protects inline input ownership, and exposes Card Surface", async ({ page }) => {
    page.setDefaultTimeout(12_000);
    mkdirSync(evidence, { recursive: true });
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto("/review/studio", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/dashboard\/card\/edit$/);
    const baselineResponse = await page.request.get("/api/card/draft");
    expect(baselineResponse.ok()).toBeTruthy();
    const baseline = await baselineResponse.json() as { draft: Record<string, unknown> };

    try {
      await openAdd(page);
      await page.getByTestId("studio-add-text").click();
      for (const role of ["heading", "subheading", "body", "label", "quote", "free"]) await expect(page.getByTestId(`studio-add-resource-text-${role}`)).toBeVisible();
      await page.screenshot({ path: path.join(evidence, "01-six-real-text-box-roles.png") });
      await page.getByTestId("studio-add-resource-text-body").click();
      const selected = page.locator('[data-composition-kind="module"][data-primitive="text"][data-selected="true"]');
      await expect(selected).toBeVisible();
      const textNodeId = await selected.getAttribute("data-composition-node");
      expect(textNodeId).toBeTruthy();
      const textNode = page.locator(`[data-composition-node="${textNodeId}"]`);
      await expect(page.getByTestId("studio-composition-inspector")).toBeVisible();
      await expect(page.getByTestId("studio-text-role-body")).toHaveAttribute("aria-pressed", "true");

      const inspectorText = page.getByTestId("studio-text-content");
      await inspectorText.fill("Space and Enter stay in this Text");
      await inspectorText.press("Enter");
      await inspectorText.type("Second line with spaces");
      await expect(inspectorText).toHaveValue(/Space and Enter stay in this Text\nSecond line with spaces/);
      await page.getByRole("button", { name: "Close Inspector" }).click();

      const inline = textNode.locator('[data-testid^="composition-inline-text-"]');
      await textNode.click();
      await expect(inline).toHaveAttribute("data-inline-editing", "true");
      await inline.press("End");
      await inline.type(" — inline");
      await inline.press(" ");
      await inline.press("Enter");
      await inline.type("still editing");
      await expect(inline).toHaveAttribute("data-inline-editing", "true");
      await expect(inline).toContainText("still editing");
      await inline.press("Escape");
      await expect(inline).toContainText("Space and Enter stay in this Text");

      await textNode.click();
      await inline.press("End");
      await inline.type(" committed");
      await page.keyboard.press("Tab");
      await expect(inline).toContainText("committed");
      await page.getByRole("button", { name: "Undo", exact: true }).click();
      await expect(inline).not.toContainText("committed");
      await page.getByRole("button", { name: "Redo", exact: true }).click();
      await expect(inline).toContainText("committed");

      await textNode.click();
      await page.getByRole("button", { name: /Edit ·/ }).click();
      await page.getByTestId("studio-text-font-browser").click();
      await expect(page.getByTestId("studio-font-browser")).toBeVisible();
      await page.getByPlaceholder("Search open-source fonts").fill("Playfair");
      await page.getByTestId("studio-font-browser").getByRole("button", { name: /Playfair Display/ }).click();
      await expect(inline).toHaveCSS("font-family", /Playfair Display/);
      await page.screenshot({ path: path.join(evidence, "02-text-refine-font-brand-accessibility.png") });
      await page.getByRole("button", { name: "Close Inspector" }).click();

      await page.getByTestId("creative-composition-canvas").first().click({ position: { x: 4, y: 4 } });
      await expect(page.getByTestId("studio-card-surface-toolbar")).toBeVisible();
      await page.getByRole("button", { name: "Refine surface" }).click();
      await expect(page.getByTestId("studio-card-surface-inspector")).toBeVisible();
      await page.getByTestId("studio-card-surface-color").fill("#173124");
      await expect(page.getByTestId("composition-background-renderer").first()).toHaveCSS("background-color", "rgb(23, 49, 36)");
      await page.screenshot({ path: path.join(evidence, "03-card-surface-authoring-presence.png") });

      await page.getByTestId("studio-preview").click();
      await expect(page.getByTestId("studio-editor-rail")).toHaveCount(0);
      await expect(page.locator(`[data-testid="composition-inline-text-${textNodeId}"]`)).toContainText("committed");
      await page.getByTestId("studio-preview").click();
      const a11y = await new AxeBuilder({ page }).analyze();
      expect(a11y.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical")).toEqual([]);

      const save = page.getByTestId("studio-save");
      if (await save.isEnabled()) await save.click();
      await expect(save).toBeDisabled();
      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("studio-phone-toolbar")).toBeVisible();
      await page.getByTestId("creative-composition-canvas").first().click({ position: { x: 4, y: 4 } });
      await page.getByTestId("studio-phone-toolbar").getByText("Edit", { exact: true }).click();
      await expect(page.getByTestId("studio-card-surface-inspector")).toBeVisible();
      await page.screenshot({ path: path.join(evidence, "04-phone-card-surface-refine.png") });
      await page.getByTestId("studio-card-surface-inspector").getByRole("button", { name: "Close Inspector" }).click();
      const phoneTextNode = page.locator(`[data-composition-node="${textNodeId}"]`);
      await phoneTextNode.scrollIntoViewIfNeeded();
      await phoneTextNode.click();
      await page.getByTestId("studio-phone-toolbar").getByText("Edit", { exact: true }).click();
      await expect(page.getByTestId("studio-composition-inspector")).toBeVisible();
      await page.screenshot({ path: path.join(evidence, "05-phone-text-refine.png") });
      await page.getByTestId("studio-composition-inspector").getByRole("button", { name: "Close Inspector" }).click();
      await phoneTextNode.click();
      const phoneInline = phoneTextNode.locator('[data-testid^="composition-inline-text-"]');
      await expect(phoneInline).toHaveAttribute("data-inline-editing", "true");
      await phoneInline.press("End");
      await phoneInline.type(" phone space");
      await phoneInline.press("Enter");
      await phoneInline.type("phone line");
      await expect(phoneInline).toContainText("phone line");
      await phoneInline.press("Escape");

      writeFileSync(path.join(evidence, "acceptance.json"), `${JSON.stringify({ contract: "studioTextAuthoring@1.0.0", roles: ["heading", "subheading", "body", "label", "quote", "free"], editableInputOwnership: true, canonicalHistory: true, desktopAndPhoneText: true, cardSurfaceAuthoringPresence: true, productOwnerAcceptance: "pending" }, null, 2)}\n`);
    } finally {
      const current = await page.request.get("/api/card/draft");
      if (current.ok()) {
        const state = await current.json() as { revision: number };
        await page.request.put("/api/card/draft", { data: { draft: baseline.draft, expectedRevision: state.revision } });
      }
    }
  });
});
