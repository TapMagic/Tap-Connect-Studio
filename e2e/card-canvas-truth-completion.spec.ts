import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const enabled = process.env.CARD_CANVAS_TRUTH_ACCEPTANCE === "1";
const evidence = path.join("tmp", "card-canvas-truth-completion");

async function openComposer(page: Page) {
  await page.goto("/dashboard/card/edit", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible({ timeout: 60_000 });
  if ((page.viewportSize()?.width ?? 1440) >= 1024) {
    await expect(page.getByTestId("card-composer-library")).toBeVisible();
    await expect(page.getByTestId("card-contextual-inspector")).toBeVisible();
  }
}

async function selectCard(page: Page) {
  await page.getByTestId("composer-selection-breadcrumb").getByRole("button", { name: "Card", exact: true }).click();
  await expect(page.getByTestId("card-contextual-inspector")).toHaveAttribute("data-selection-level", "card");
}

test.describe("Card canvas truth completion", () => {
  test.skip(!enabled, "Set CARD_CANVAS_TRUTH_ACCEPTANCE=1 with the authenticated local fixture");
  test.describe.configure({ timeout: 240_000 });

  test("constructs root Elements, optional Sections, groups and clean draft Preview through visible UI", async ({ page }) => {
    page.setDefaultTimeout(12_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openComposer(page);
    await selectCard(page);
    await page.getByTestId("composer-replace-blank").click();
    const root = page.getByTestId("card-root-canvas");
    const inspector = page.getByTestId("card-contextual-inspector");
    await expect(root).toBeVisible();
    await expect(root.locator("[data-composition-node]")).toHaveCount(0);
    await page.screenshot({ path: path.join(evidence, "01-blank-card-root.png") });

    await page.getByTestId("composer-add-element-heading").click();
    await page.getByTestId("composer-add-element-text").click();
    await expect(root.locator("[data-composition-node]")).toHaveCount(2);
    await expect(page.locator("[data-surface-kind]")).toHaveCount(0);
    const heading = root.locator('[data-composition-node][data-primitive="text"]').first();
    const text = root.locator('[data-composition-node][data-primitive="text"]').nth(1);
    const headingId = await heading.getAttribute("data-composition-node");
    const textId = await text.getAttribute("data-composition-node");
    expect(headingId).toBeTruthy();
    expect(textId).toBeTruthy();
    await expect(heading).toHaveAttribute("data-selected", "false");
    await expect(text).toHaveAttribute("data-selected", "true");
    await page.screenshot({ path: path.join(evidence, "02-root-level-heading-and-text.png") });

    await heading.click();
    await page.getByTestId("visual-font-picker").getByRole("button").first().click();
    await page.getByRole("option", { name: /Georgia/ }).click();
    await inspector.getByLabel("Text color", { exact: true }).fill("#ffcc33");
    await text.click();
    await page.getByTestId("visual-font-picker").getByRole("button").first().click();
    await page.getByRole("option", { name: /Courier/ }).click();
    await inspector.getByLabel("Text color", { exact: true }).fill("#66ddff");
    await expect(heading.locator('[data-testid^="composition-inline-text-"]')).toHaveCSS("font-family", /Georgia/);
    await expect(text.locator('[data-testid^="composition-inline-text-"]')).toHaveCSS("font-family", /Courier/);
    await page.screenshot({ path: path.join(evidence, "03-independent-root-text-styles.png") });

    const rootPlaneBox = await root.getByTestId("creative-composition-canvas").boundingBox();
    expect(rootPlaneBox).not.toBeNull();
    await page.mouse.move(rootPlaneBox!.x + 3, rootPlaneBox!.y + 3);
    await page.mouse.down();
    await page.mouse.move(rootPlaneBox!.x + rootPlaneBox!.width * .9, rootPlaneBox!.y + rootPlaneBox!.height * .52, { steps: 8 });
    await expect(page.getByTestId("composition-marquee")).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "03b-root-marquee-selection.png") });
    await page.mouse.up();
    await expect(page.getByTestId("composer-multi-selection")).toContainText("2 Elements selected");

    await page.getByTestId("composer-outline-toggle").click();
    const selectRootElement = async (id: string, shift = false) => {
      await page.getByTestId(`outline-element-${id}`).getByRole("button").first().click({ modifiers: shift ? ["Shift"] : [] });
    };

    const headingBefore = await heading.boundingBox();
    expect(headingBefore).not.toBeNull();
    await page.mouse.move(headingBefore!.x + 6, headingBefore!.y + 6);
    await page.mouse.down();
    await page.mouse.move(headingBefore!.x + 56, headingBefore!.y + 34, { steps: 10 });
    await page.mouse.up();
    const headingAfter = await heading.boundingBox();
    expect(headingAfter?.x).not.toBe(headingBefore?.x);
    const resize = root.locator('[data-testid^="composition-resize-"][data-testid$="-se"]').first();
    const handle = await resize.boundingBox();
    expect(handle).not.toBeNull();
    await page.mouse.move(handle!.x + handle!.width / 2, handle!.y + handle!.height / 2);
    await page.mouse.down();
    await page.mouse.move(handle!.x + 35, handle!.y + 22, { steps: 6 });
    await page.mouse.up();

    await selectCard(page);
    await page.getByTestId("composer-add-section-blank").click();
    const blank = page.locator('[data-surface-kind="blank"]').last();
    await expect(blank).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(blank).toHaveCSS("border-top-width", "0px");
    await inspector.getByLabel("Layout mode").selectOption("free");
    await inspector.getByLabel("Exact minimum height (px)").fill("40");
    await page.getByTestId("composer-add-element-button").click();
    const button = blank.locator('[data-composition-node][data-primitive="button"]');
    const buttonBefore = await button.evaluate((element) => ({
      top: (element as HTMLElement).style.top,
      height: (element as HTMLElement).style.height,
    }));
    await blank.getByTestId("creative-composition-canvas").click({ position: { x: 2, y: 2 } });
    await inspector.getByLabel("Exact minimum height (px)").fill("760");
    const buttonTall = await button.evaluate((element) => ({
      top: (element as HTMLElement).style.top,
      height: (element as HTMLElement).style.height,
    }));
    expect(buttonTall).toEqual(buttonBefore);
    await page.screenshot({ path: path.join(evidence, "04-tall-section-child-preserved.png") });
    await inspector.getByLabel("Exact minimum height (px)").fill("40");

    await button.click();
    await page.getByRole("button", { name: "Move to Card root" }).click();
    await expect(root.locator('[data-composition-node][data-primitive="button"]')).toHaveCount(1);
    await page.screenshot({ path: path.join(evidence, "05-element-moved-out-to-card.png") });
    await selectRootElement(headingId!);
    await page.getByRole("button", { name: /Move to Blank Section/ }).click();
    await expect(blank.locator('[data-composition-node][data-primitive="text"]')).toHaveCount(1);
    await page.getByRole("button", { name: "Move to Card root" }).click();
    await expect(root.locator('[data-composition-node][data-primitive="text"]')).toHaveCount(2);
    await page.screenshot({ path: path.join(evidence, "06-move-in-and-out-preserved.png") });

    await selectRootElement(headingId!);
    await selectRootElement(textId!, true);
    await page.getByRole("button", { name: "Group", exact: true }).click();
    const groupIds = await root.locator('[data-composition-node][data-primitive="text"]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-group")));
    expect(groupIds[0]).toBeTruthy();
    expect(groupIds[0]).toBe(groupIds[1]);
    await page.screenshot({ path: path.join(evidence, "07-grouped-root-elements.png") });
    await page.getByRole("button", { name: "Ungroup", exact: true }).click();
    await expect(root.locator('[data-composition-node][data-group]')).toHaveCount(0);
    await page.screenshot({ path: path.join(evidence, "08-ungrouped-no-container-style.png") });

    await root.getByTestId(`composition-more-${headingId}`).click();
    const contextMenu = page.getByTestId("composition-context-menu");
    await expect(contextMenu.getByRole("menuitem", { name: /Move to Section… Blank Section/ })).toBeVisible();
    await expect(contextMenu.getByRole("menuitem", { name: "Wrap in new Section" })).toBeVisible();
    await contextMenu.getByRole("menuitem", { name: /Move to Section… Blank Section/ }).click();
    await expect(blank.locator('[data-composition-node][data-primitive="text"]')).toHaveCount(1);
    await page.getByTestId(`outline-element-${headingId}`).getByRole("button").first().click();
    await page.getByRole("button", { name: "Move to Card root" }).click();

    await selectRootElement(headingId!);
    await selectRootElement(textId!, true);
    await page.getByRole("button", { name: "Wrap · blank" }).click();
    const wrapped = page.locator('[data-surface-kind="blank"]').last();
    await expect(wrapped.locator('[data-composition-node][data-primitive="text"]')).toHaveCount(2);
    await page.screenshot({ path: path.join(evidence, "09-wrapped-section.png") });
    await page.getByTestId("composer-selection-breadcrumb").getByRole("button", { name: /Blank Section/ }).click();
    await page.getByTestId("remove-section-keep-elements").click();
    await expect(root.locator('[data-composition-node][data-primitive="text"]')).toHaveCount(2);
    await page.screenshot({ path: path.join(evidence, "10-section-removed-elements-kept.png") });

    await selectCard(page);
    await inspector.getByLabel("Use selected background color").fill("#243b5a");
    await inspector.getByLabel("Overlay opacity").fill("0");
    await expect(page.getByTestId("color-truth").first()).toHaveAttribute("data-value", "#243b5a");
    const renderedCardColor = await page.locator(".tcc-shell").evaluate((element) => getComputedStyle(element).backgroundColor);
    expect(renderedCardColor).toMatch(/rgb\(36, 59, 90\)|color\(srgb 0\.141176 0\.231373 0\.352941\)/);
    await page.screenshot({ path: path.join(evidence, "11-exact-card-color-truth.png") });

    await page.getByTestId("composer-add-section-content").click();
    await page.getByTestId("composer-add-section-location").click();
    const content = page.locator('[data-surface-kind="content"]');
    const location = page.locator('[data-surface-kind="location"]');
    const contentGrip = content.getByTestId(/section-reorder-grip-/);
    const locationBox = await location.boundingBox();
    expect(locationBox).not.toBeNull();
    const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
    await contentGrip.dispatchEvent("dragstart", { dataTransfer });
    await location.dispatchEvent("dragover", { dataTransfer, clientX: locationBox!.x + 10, clientY: locationBox!.y + 10 });
    await expect(content).toHaveClass(/opacity-60/);
    await expect(location.getByTestId("section-drop-indicator")).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "12-section-ghost-and-insertion-line.png") });
    await location.dispatchEvent("drop", { dataTransfer });
    await contentGrip.dispatchEvent("dragend", { dataTransfer });

    await page.getByTestId("card-preview-as-customer").click();
    await expect(page.getByTestId("card-canvas-viewport")).toHaveAttribute("data-studio-mode", "preview");
    await expect(page.getByTestId("card-contextual-inspector")).toHaveCount(0);
    await expect(page.getByTestId("card-composer-library")).toHaveCount(0);
    await expect(page.locator('[data-edit-selects="true"]')).toHaveCount(0);
    await page.getByTestId("card-preview-canvas").evaluate((element) => { element.scrollTop = 0; });
    await page.screenshot({ path: path.join(evidence, "13-clean-preview-draft.png") });
    await page.getByTestId("preview-exit").click();

    await page.getByTestId("card-save").first().click();
    await expect(page.getByTestId("studio-save-state")).toHaveAttribute("data-saved", "true", { timeout: 30_000 });
    await page.screenshot({ path: path.join(evidence, "14-saved-root-canvas.png") });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("card-root-canvas").locator('[data-composition-node]')).toHaveCount(3, { timeout: 60_000 });
    await expect(page.getByTestId("color-truth").first()).toHaveAttribute("data-value", "#243b5a");
    await page.screenshot({ path: path.join(evidence, "15-reloaded-root-canvas.png") });

    for (const viewport of ["phone", "tablet", "desktop"] as const) {
      await page.getByTestId("card-viewport-toggle").getByRole("button", { name: new RegExp(viewport, "i") }).click();
      await expect(page.getByTestId("card-canvas-viewport")).toHaveAttribute("data-preview-viewport", viewport);
      await page.screenshot({ path: path.join(evidence, `16-${viewport}.png`) });
    }
    const a11y = await new AxeBuilder({ page }).analyze();
    expect(a11y.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical")).toEqual([]);
  });

  test("keeps root editing usable at 390px with keyboard focus", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openComposer(page);
    await expect(page.getByTestId("card-mobile-tool-rail")).toBeVisible();
    expect(await page.getByTestId("card-edit-workspace-host").evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe("BODY");
    await page.screenshot({ path: path.join(evidence, "17-phone-390.png") });
  });
});
