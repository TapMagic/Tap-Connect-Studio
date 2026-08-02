import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import path from "node:path";

const enabled = process.env.CARD_CANVAS_COMPOSER_ACCEPTANCE === "1";
const evidence = path.join("tmp", "card-canvas-first-composer");

async function openComposer(page: Page) {
  await page.goto("/dashboard/card/edit", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible({ timeout: 60_000 });
  if ((page.viewportSize()?.width ?? 1440) >= 1024) {
    await expect(page.getByTestId("card-composer-library")).toBeVisible();
    await expect(page.getByTestId("card-contextual-inspector")).toBeVisible();
  }
}

async function dragCenter(page: Page, source: Locator, target: Locator) {
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  expect(from).not.toBeNull();
  expect(to).not.toBeNull();
  await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
  await page.mouse.down();
  await page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height / 2, { steps: 12 });
  await page.mouse.up();
}

test.describe("canvas-first Card composer visible acceptance", () => {
  test.skip(!enabled, "Set CARD_CANVAS_COMPOSER_ACCEPTANCE=1 with an authenticated local fixture");
  test.describe.configure({ timeout: 120_000 });

  test("builds nested Sections and Elements through pointer and keyboard interaction", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openComposer(page);
    await expect(page.getByTestId("card-composer-library")).toBeVisible();
    await expect(page.getByTestId("card-canvas-viewport")).toBeVisible();
    await expect(page.getByTestId("card-contextual-inspector")).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "01-three-column-composer.png") });

    await page.getByTestId("composer-selection-breadcrumb").getByRole("button", { name: "Card" }).click();
    await page.getByTestId("composer-replace-blank").click();
    await expect(page.getByTestId("blank-card-composer")).toContainText("Your Card is ready to build");
    await page.screenshot({ path: path.join(evidence, "02-blank-composer.png") });

    await page.getByTestId("composer-add-section-identity").click();
    const identity = page.locator('[data-surface-kind="identity"]');
    await expect(identity).toBeVisible();
    await page.getByTestId("composer-add-element-logo").dragTo(identity);
    await page.getByTestId("composer-add-element-business_name").dragTo(identity);
    await page.getByTestId("composer-add-element-address").dragTo(identity);
    await expect(identity.locator("[data-composition-node]")).toHaveCount(3);

    const businessName = identity.locator('[data-primitive="text"]').first();
    await businessName.click();
    const inlineText = businessName.locator('[contenteditable="true"]');
    await inlineText.fill("The Monkey Cage");
    await inlineText.press("Enter");
    await inlineText.type("Ocala");
    await expect(identity).toContainText("The Monkey Cage");
    await page.screenshot({ path: path.join(evidence, "03-direct-text-edit.png") });

    await page.getByTestId("composer-selection-breadcrumb").getByRole("button").nth(1).click();
    await expect(page.getByTestId("card-contextual-inspector")).toHaveAttribute("data-selection-level", "section");
    await page.getByLabel("Layout mode").selectOption("free");
    const movable = identity.locator("[data-composition-node]").nth(1);
    const before = await movable.boundingBox();
    await dragCenter(page, movable, identity.locator("[data-testid=creative-composition-canvas]"));
    const after = await movable.boundingBox();
    expect(after?.x).not.toBe(before?.x);
    await movable.focus();
    await movable.press("ArrowRight");
    await movable.press("Alt+ArrowDown");

    const resizeHandle = identity.locator('[data-testid*="composition-resize-"]').last();
    const handleBox = await resizeHandle.boundingBox();
    expect(handleBox).not.toBeNull();
    await page.mouse.move(handleBox!.x + 3, handleBox!.y + 3);
    await page.mouse.down();
    await page.mouse.move(handleBox!.x + 45, handleBox!.y + 30, { steps: 8 });
    await page.mouse.up();
    await page.screenshot({ path: path.join(evidence, "04-element-resize-guides.png") });

    await page.getByTestId("composer-selection-breadcrumb").getByRole("button").nth(1).click();
    await page.getByLabel("Background color").fill("#24324a");
    await page.getByLabel("Padding").fill("32");
    await page.getByLabel("Exact minimum height (px)").fill("380");
    await page.getByLabel("Overlay opacity").fill("35");
    await page.getByTestId("composer-open-brand").click();
    await expect(page.getByTestId("composer-brand-panel")).toBeVisible();
    await page.getByRole("button", { name: "Use Brand palette" }).click();
    await page.getByTestId("composer-open-assets").click();
    await expect(page.getByTestId("composer-asset-panel")).toBeVisible();

    await page.getByTestId("composer-add-section-offer").click();
    const offer = page.locator('[data-surface-kind="offer"]');
    await page.getByTestId("composer-add-element-image").dragTo(offer);
    await page.getByTestId("composer-add-element-heading").dragTo(offer);
    await page.getByTestId("composer-add-element-text").dragTo(offer);
    await page.getByTestId("composer-add-element-button").dragTo(offer);
    await expect(offer.locator("[data-composition-node]")).toHaveCount(4);

    await page.getByTestId("composer-add-section-actions").click();
    const actions = page.locator('[data-surface-kind="actions"]');
    await page.getByTestId("composer-add-element-button").dragTo(actions);
    await page.getByTestId("composer-add-element-button").dragTo(actions);

    await page.getByTestId("composer-selection-breadcrumb").getByRole("button", { name: "Card" }).click();
    await page.getByTestId("persistent-action-support").getByRole("checkbox").uncheck();
    await page.getByTestId("persistent-action-keep").getByRole("checkbox").check();
    await expect(page.getByTestId("card-utility-support")).toHaveCount(0);

    await page.getByTestId("composer-outline-toggle").click();
    await expect(page.getByTestId("composer-nested-outline")).toBeVisible();
    const nestedName = page.locator('[data-testid^="outline-element-"]').first();
    await nestedName.click();
    await expect(page.getByTestId("card-contextual-inspector")).toHaveAttribute("data-selection-level", "element");
    await expect(page.getByTestId("composer-selection-breadcrumb")).toContainText("›");

    await page.getByTestId("card-undo").click();
    await page.getByTestId("card-redo").click();
    await page.getByTestId("card-save").first().click();
    await expect(page.getByTestId("studio-save-state")).toHaveAttribute("data-saved", "true", { timeout: 30_000 });
    await page.reload();
    await expect(page.locator('[data-surface-kind="identity"]')).toContainText("The Monkey Cage", { timeout: 60_000 });
    await page.screenshot({ path: path.join(evidence, "05-reloaded-state.png") });

    for (const viewport of ["desktop", "tablet", "phone"] as const) {
      await page.getByTestId("card-viewport-toggle").getByRole("button", { name: new RegExp(viewport, "i") }).click();
      await expect(page.getByTestId("card-canvas-viewport")).toHaveAttribute("data-preview-viewport", viewport);
      await page.screenshot({ path: path.join(evidence, `06-${viewport}.png`) });
    }

    const a11y = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(a11y.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical")).toEqual([]);
  });

  test("remains usable at 390px with keyboard focus", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openComposer(page);
    await expect(page.getByTestId("card-mobile-tool-rail")).toBeVisible();
    const host = page.getByTestId("card-edit-workspace-host");
    expect(await host.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe("BODY");
    await page.screenshot({ path: path.join(evidence, "07-mobile-390.png") });
  });

  test("proves reselection, Section resize law, direct reorder, compact chrome and Guide retrieval", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openComposer(page);

    const shade = page.getByTestId("command-shade");
    expect((await shade.boundingBox())!.height).toBeLessThanOrEqual(56);
    await expect(page.getByTestId("composition-zoom-controls")).toHaveCount(0);
    const toolbar = page.getByTestId("card-zoom-fit").locator("..");
    const phone = page.getByTestId("card-preview-phone");
    expect((await toolbar.boundingBox())!.y + (await toolbar.boundingBox())!.height).toBeLessThanOrEqual((await phone.boundingBox())!.y);
    await page.screenshot({ path: path.join(evidence, "08-compact-header-external-zoom.png") });

    await page.getByTestId("composer-selection-breadcrumb").getByRole("button", { name: "Card" }).click();
    await page.getByTestId("composer-replace-blank").click();
    await page.getByTestId("composer-add-section-identity").click();
    const identity = page.locator('[data-surface-kind="identity"]');
    await page.getByTestId("composer-add-element-business_name").dragTo(identity);
    await page.getByTestId("composer-add-element-address").dragTo(identity);
    const business = identity.locator('[data-composition-node]').first();
    const address = identity.locator('[data-composition-node]').nth(1);

    await business.click();
    await expect(business).toHaveAttribute("data-selected", "true");
    await page.screenshot({ path: path.join(evidence, "09-selected-business-name.png") });
    await page.getByTestId("composer-selection-breadcrumb").getByRole("button").nth(1).click();
    await business.click();
    await expect(business).toHaveAttribute("data-selected", "true");
    await page.screenshot({ path: path.join(evidence, "10-reselected-after-click-away.png") });
    await page.getByLabel("Font family").fill("Georgia, serif");
    await page.getByTestId("card-contextual-inspector").getByRole("slider", { name: /Size/ }).fill("28");
    await page.getByTestId("card-contextual-inspector").locator('input[type="color"]').first().fill("#facc15");
    await page.screenshot({ path: path.join(evidence, "11-typography-controls.png") });
    await page.getByTestId("composer-selection-breadcrumb").getByRole("button").nth(1).click();
    await page.getByLabel("Layout mode").selectOption("free");
    await business.click();
    const handle = business.locator('[data-testid*="composition-resize-"]').first();
    await expect(handle).toBeVisible();
    const handleMetrics = await handle.evaluate((element) => ({
      hit: element.getBoundingClientRect().width,
      visible: Number.parseFloat(getComputedStyle(element, "::after").width),
    }));
    expect(handleMetrics.visible).toBeGreaterThanOrEqual(8);
    expect(handleMetrics.visible).toBeLessThanOrEqual(12);
    expect(handleMetrics.hit).toBeGreaterThan(handleMetrics.visible);
    await page.screenshot({ path: path.join(evidence, "12-small-proportional-handles.png") });
    await page.getByTestId("composer-selection-breadcrumb").getByRole("button").nth(1).click();
    const before = await Promise.all([business, address].map((node) => node.evaluate((element) => ({ left: (element as HTMLElement).style.left, top: (element as HTMLElement).style.top, width: (element as HTMLElement).style.width, height: (element as HTMLElement).style.height }))));
    const canvas = identity.getByTestId("creative-composition-canvas");
    const canvasBox = await canvas.boundingBox();
    await page.mouse.click(canvasBox!.x + canvasBox!.width - 6, canvasBox!.y + canvasBox!.height - 6);
    await expect(page.getByTestId("card-contextual-inspector")).toHaveAttribute("data-selection-level", "section");
    await page.screenshot({ path: path.join(evidence, "13-section-selected-by-background.png") });
    await page.screenshot({ path: path.join(evidence, "14-section-before-height.png") });
    await page.getByLabel("Exact minimum height (px)").fill("520");
    const after = await Promise.all([business, address].map((node) => node.evaluate((element) => ({ left: (element as HTMLElement).style.left, top: (element as HTMLElement).style.top, width: (element as HTMLElement).style.width, height: (element as HTMLElement).style.height }))));
    expect(after).toEqual(before);
    await page.screenshot({ path: path.join(evidence, "15-section-after-height-children-stable.png") });
    await page.getByRole("button", { name: "Fit content" }).click();

    await page.getByTestId("composer-add-section-offer").click();
    const offer = page.locator('[data-surface-kind="offer"]');
    await dragCenter(page, offer.getByTestId(/section-reorder-grip-/), identity.getByTestId(/section-reorder-grip-/));
    await expect(page.locator('[data-surface-kind]').first()).toHaveAttribute("data-surface-kind", "offer");
    await page.screenshot({ path: path.join(evidence, "16-direct-section-reorder.png") });
    await page.getByTestId("composer-outline-toggle").click();
    await page.getByRole("button", { name: "Move Section down" }).first().click();
    await expect(page.locator('[data-surface-kind]').nth(1)).toHaveAttribute("data-surface-kind", "offer");
    await page.screenshot({ path: path.join(evidence, "17-outline-reorder-synchronized.png") });

    await page.getByRole("button", { name: "Dismiss build guide" }).click();
    await expect(page.getByTestId("composer-help-guide")).toHaveCount(0);
    await page.getByTestId("composer-reopen-help").click();
    await expect(page.getByTestId("composer-help-guide")).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "18-guide-retrieved.png") });

    await page.getByTestId("composer-selection-breadcrumb").getByRole("button", { name: "Card" }).click();
    await expect(page.getByTestId("persistent-card-actions")).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "19-utility-action-controls.png") });
    await page.getByTestId("card-save").first().click();
    await expect(page.getByTestId("studio-save-state")).toHaveAttribute("data-saved", "true", { timeout: 30_000 });
    await page.screenshot({ path: path.join(evidence, "20-saved-state.png") });
    for (const [viewport, number] of [["phone", 21], ["tablet", 22], ["desktop", 23]] as const) {
      await page.getByTestId("card-viewport-toggle").getByRole("button", { name: new RegExp(viewport, "i") }).click();
      await page.screenshot({ path: path.join(evidence, `${number}-${viewport}-final.png`) });
    }
  });
});
