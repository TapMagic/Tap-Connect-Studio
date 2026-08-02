import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import path from "node:path";

const enabled = process.env.CARD_DESIGNER_CANVAS_ACCEPTANCE === "1";
const evidence = path.join("tmp", "card-designer-canvas-completion");

async function openComposer(page: Page) {
  await page.goto("/dashboard/card/edit", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("card-composer-library")).toBeVisible();
  await expect(page.getByTestId("card-contextual-inspector")).toBeVisible();
}

async function selectSectionBackground(page: Page, section: Locator) {
  const canvas = section.getByTestId("creative-composition-canvas");
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.click(box!.x + box!.width - 5, box!.y + box!.height - 5);
  await expect(page.getByTestId("card-contextual-inspector")).toHaveAttribute("data-selection-level", "section");
}

test.describe("designer Card canvas completion", () => {
  test.skip(!enabled, "Set CARD_DESIGNER_CANVAS_ACCEPTANCE=1 with the authenticated local fixture");
  test.describe.configure({ timeout: 180_000 });

  test("proves Maps, universal Buttons, identity, layers, fonts and deletion through visible UI", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openComposer(page);
    await page.getByTestId("composer-selection-breadcrumb").getByRole("button", { name: "Card" }).click();
    await page.getByTestId("composer-replace-blank").click();

    await page.getByTestId("composer-add-section-location").click();
    const location = page.locator('[data-surface-kind="location"]');
    await page.getByTestId("composer-add-element-map").click();
    const map = location.locator('[data-composition-node][data-primitive="image"]');
    await expect(map).toHaveAttribute("data-selected", "true");
    await expect(page.getByTestId("card-contextual-inspector").getByRole("heading", { level: 2 })).toHaveText("Map");
    await expect(page.getByTestId("composer-map-setup")).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "01-map-setup.png") });

    const locationPicker = page.getByTestId("map-workspace-location-picker");
    await expect(locationPicker).toBeVisible();
    const optionCount = await locationPicker.locator("option").count();
    if (optionCount > 1) await locationPicker.selectOption({ index: 1 });
    else {
      await page.getByLabel("Location source").selectOption("custom_address");
      await page.getByLabel("Location name").fill("Main entrance");
      await page.getByRole("textbox", { name: "Address", exact: true }).fill("10 Magnolia Ave, Ocala, FL");
    }
    await expect(map.locator('[data-map-presentation="location_card"]')).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "02-workspace-location-card.png") });

    const mapSetup = page.getByTestId("composer-map-setup");
    await mapSetup.getByLabel("Presentation").selectOption("static");
    await expect(map.locator('[data-map-presentation="static"]')).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "03-static-map-preview.png") });
    await mapSetup.getByLabel("Presentation").selectOption("directions_only");
    await expect(map.locator('[data-map-presentation="directions_only"]')).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "04-directions-only-map.png") });
    for (const app of ["google", "apple", "waze", "default"]) await mapSetup.getByLabel("Open with").selectOption(app);

    await page.getByTestId("composer-add-section-identity").click();
    const identity = page.locator('[data-surface-kind="identity"]');
    await page.getByTestId("composer-add-element-business_name").click();
    await page.getByTestId("composer-add-element-button").click();
    const directions = identity.locator('[data-composition-node][data-primitive="button"]').last();
    const directionsId = await directions.getAttribute("data-composition-node");
    const directionsNode = identity.locator(`[data-composition-node="${directionsId}"]`);
    const inspector = page.getByTestId("card-contextual-inspector");
    await expect(directions).toHaveAttribute("data-selected", "true");
    await inspector.getByLabel("Action type").selectOption("directions");
    await inspector.getByRole("textbox", { name: "Label", exact: true }).fill("Get directions");
    await inspector.getByLabel("Supporting description").fill("Main entrance on Magnolia Ave.");
    await inspector.getByLabel("Presentation").first().selectOption("icon_description");
    await expect(directions.locator('[data-button-presentation="icon_description"]')).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "05-free-floating-circular-directions-button.png") });

    await selectSectionBackground(page, identity);
    await page.getByLabel("Layout mode").selectOption("free");
    await page.getByTestId("composer-add-element-button").click();
    const call = identity.locator('[data-composition-node][data-primitive="button"]').last();
    const callId = await call.getAttribute("data-composition-node");
    const callNode = identity.locator(`[data-composition-node="${callId}"]`);
    await inspector.getByLabel("Action type").selectOption("call");
    await inspector.getByRole("textbox", { name: "Label", exact: true }).fill("Call");
    await inspector.getByLabel("Icon", { exact: true }).fill("phone");
    await inspector.getByLabel("Supporting description").fill("Speak with our team");
    await inspector.getByLabel("Presentation").first().selectOption("icon_description");
    await expect(callNode.locator('[data-button-presentation="icon_description"]')).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "06-circular-call-button.png") });

    await inspector.getByLabel("X %").fill("12");
    await inspector.getByLabel("Y %").fill("20");
    await expect(identity.getByTestId(`composition-select-beneath-${callId}`)).toBeVisible();
    await identity.getByTestId(`composition-select-beneath-${callId}`).click();
    await expect(directionsNode).toHaveAttribute("data-selected", "true");
    await identity.getByTestId(`composition-select-beneath-${directionsId}`).click();
    await expect(callNode).toHaveAttribute("data-selected", "true");
    await identity.getByTestId(`composition-more-${callId}`).click();
    await expect(page.getByTestId("composition-context-menu")).toBeVisible();
    await page.getByTestId("composition-context-menu").getByRole("menuitem", { name: "Bring to front" }).click();
    await page.screenshot({ path: path.join(evidence, "07-layer-order-select-beneath.png") });
    await expect(callNode).toHaveAttribute("data-selected", "true");
    await expect(identity.locator(`[data-testid^="composition-resize-${callId}-"]`)).toHaveCount(8);

    const business = identity.locator('[data-composition-node][data-primitive="text"]').first();
    await business.click();
    await expect(page.getByTestId("card-contextual-inspector").getByRole("heading", { level: 2 })).toHaveText("Business name");
    await page.getByTestId("composer-outline-toggle").click();
    await page.getByTestId(`outline-element-${callId}`).getByRole("button").first().click();
    await expect(callNode).toHaveAttribute("data-selected", "true");
    await expect(page.getByTestId("card-contextual-inspector").getByRole("heading", { level: 2 })).toHaveText("Button");
    await map.click();
    await expect(page.getByTestId("card-contextual-inspector").getByRole("heading", { level: 2 })).toHaveText("Map");

    await business.click();
    await callNode.click({ modifiers: ["Shift"] });
    await expect(page.getByTestId("composer-multi-selection")).toContainText("2 Elements selected");
    await page.getByRole("button", { name: "left", exact: true }).click();
    await page.screenshot({ path: path.join(evidence, "08-multi-selection-alignment.png") });

    await business.click();
    await page.getByTestId("visual-font-picker").getByRole("button").first().click();
    await expect(page.getByRole("listbox", { name: "Available fonts" })).toBeVisible();
    await page.getByRole("option", { name: /Georgia/ }).click();
    await expect(business.locator('[data-testid^="composition-inline-text-"]')).toHaveCSS("font-family", /Georgia/);
    await page.screenshot({ path: path.join(evidence, "09-visual-font-picker-applied.png") });

    await page.getByTestId(`outline-element-${callId}`).getByRole("button").first().click();
    await expect(callNode).toHaveAttribute("data-selected", "true");
    await page.getByTitle("Lock").click();
    await page.getByTitle("Delete").click();
    await expect(page.getByText(/locked.*unlock/i)).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "10-locked-delete-explanation.png") });
    await page.getByTitle("Unlock").click();
    await page.getByTitle("Delete").click();
    await expect(identity.locator(`[data-composition-node="${callId}"]`)).toHaveCount(0);
    await page.getByTestId("card-undo").click();

    await selectSectionBackground(page, identity);
    await page.getByTitle("Delete").click();
    await expect(page.getByTestId("section-delete-confirmation")).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "11-section-delete-confirmation.png") });
    await page.getByTestId("section-delete-confirmation").getByRole("button", { name: "Cancel" }).click();

    await page.getByTestId("card-save").first().click();
    await expect(page.getByTestId("studio-save-state")).toHaveAttribute("data-saved", "true", { timeout: 30_000 });
    await page.reload();
    await expect(page.locator('[data-surface-kind="location"] [data-map-presentation]')).toBeVisible({ timeout: 60_000 });
    await page.screenshot({ path: path.join(evidence, "12-reloaded-designer-state.png") });

    const a11y = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(a11y.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical")).toEqual([]);
  });

  test("keeps the designer reachable at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard/card/edit", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("card-mobile-tool-rail")).toBeVisible();
    expect(await page.getByTestId("card-edit-workspace-host").evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe("BODY");
    await page.screenshot({ path: path.join(evidence, "13-phone-390.png") });
  });

  test("autoscrolls a long Card and long Build / Outline panel during drag", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 720 });
    await openComposer(page);
    await page.getByTestId("composer-selection-breadcrumb").getByRole("button", { name: "Card" }).click();
    await page.getByTestId("composer-replace-blank").click();
    for (let index = 0; index < 10; index += 1) await page.getByTestId("composer-add-section-content").click();

    const firstSection = page.locator('[data-surface-kind="content"]').first();
    await firstSection.evaluate((element) => {
      let current = element.parentElement;
      while (current) {
        const style = getComputedStyle(current);
        if ((style.overflowY === "auto" || style.overflowY === "scroll") && current.scrollHeight > current.clientHeight) {
          current.dataset.autoscrollProbe = "card";
          current.scrollTop = 0;
          break;
        }
        current = current.parentElement;
      }
    });
    const canvasViewport = page.locator('[data-autoscroll-probe="card"]');
    await expect(canvasViewport).toHaveCount(1);
    const firstGrip = firstSection.getByTestId(/section-reorder-grip-/);
    const gripBox = await firstGrip.boundingBox();
    const canvasBox = await canvasViewport.boundingBox();
    expect(gripBox).not.toBeNull();
    expect(canvasBox).not.toBeNull();
    await page.mouse.move(gripBox!.x + gripBox!.width / 2, gripBox!.y + gripBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(gripBox!.x + 8, gripBox!.y + 24, { steps: 4 });
    for (let step = 0; step < 18; step += 1) {
      await page.mouse.move(canvasBox!.x + canvasBox!.width / 2, canvasBox!.y + canvasBox!.height - 8);
      await page.waitForTimeout(20);
    }
    await page.mouse.up();
    expect(await canvasViewport.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await page.screenshot({ path: path.join(evidence, "14-card-autoscroll.png") });

    const library = page.getByTestId("card-composer-library");
    await library.evaluate((element) => {
      let current = element.parentElement;
      while (current) {
        const style = getComputedStyle(current);
        if ((style.overflowY === "auto" || style.overflowY === "scroll") && current.scrollHeight > current.clientHeight) {
          current.dataset.autoscrollProbe = "build-outline";
          current.scrollTop = 0;
          break;
        }
        current = current.parentElement;
      }
    });
    const panelScroller = page.locator('[data-autoscroll-probe="build-outline"]');
    await expect(panelScroller).toHaveCount(1);
    const libraryItem = page.getByTestId("composer-add-section-blank");
    const itemBox = await libraryItem.boundingBox();
    const panelBox = await panelScroller.boundingBox();
    expect(itemBox).not.toBeNull();
    expect(panelBox).not.toBeNull();
    await page.mouse.move(itemBox!.x + 12, itemBox!.y + itemBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(itemBox!.x + 20, itemBox!.y + 24, { steps: 4 });
    for (let step = 0; step < 18; step += 1) {
      await page.mouse.move(panelBox!.x + panelBox!.width / 2, panelBox!.y + panelBox!.height - 8);
      await page.waitForTimeout(20);
    }
    await page.mouse.up();
    expect(await panelScroller.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);

    await panelScroller.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await page.getByTestId("composer-outline-toggle").click();
    await expect(page.getByTestId("composer-nested-outline")).toBeVisible();
    await panelScroller.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    const beforeOutline = await panelScroller.evaluate((element) => element.scrollTop);
    const outlineGrip = page.getByTestId("composer-nested-outline").getByTestId(/outline-reorder-/).last();
    await outlineGrip.scrollIntoViewIfNeeded();
    const outlineGripBox = await outlineGrip.boundingBox();
    expect(outlineGripBox).not.toBeNull();
    await page.mouse.move(outlineGripBox!.x + outlineGripBox!.width / 2, outlineGripBox!.y + outlineGripBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(outlineGripBox!.x + 4, outlineGripBox!.y - 18, { steps: 4 });
    for (let step = 0; step < 18; step += 1) {
      await page.mouse.move(panelBox!.x + panelBox!.width / 2, panelBox!.y + 8);
      await page.waitForTimeout(20);
    }
    await page.mouse.up();
    if (await panelScroller.evaluate((element) => element.scrollTop) === beforeOutline) {
      await page.evaluate(({ x, y }) => {
        const grips = document.querySelectorAll('[data-testid^="outline-reorder-"]');
        const grip = grips.item(grips.length - 1);
        if (!(grip instanceof HTMLElement)) return;
        const transfer = new DataTransfer();
        grip.dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer: transfer }));
        for (let index = 0; index < 28; index += 1) {
          grip.dispatchEvent(new DragEvent("drag", { bubbles: true, cancelable: true, clientX: x, clientY: y, dataTransfer: transfer }));
          document.elementFromPoint(x, y)?.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, clientX: x, clientY: y, dataTransfer: transfer }));
        }
        grip.dispatchEvent(new DragEvent("dragend", { bubbles: true, dataTransfer: transfer }));
      }, { x: panelBox!.x + panelBox!.width / 2, y: panelBox!.y + 8 });
    }
    expect(await panelScroller.evaluate((element) => element.scrollTop)).toBeLessThan(beforeOutline);
    await page.screenshot({ path: path.join(evidence, "15-outline-autoscroll.png") });
  });
});
