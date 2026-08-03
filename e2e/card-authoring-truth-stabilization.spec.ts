import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const enabled = process.env.AUTHORING_TRUTH_STABILIZATION_ACCEPTANCE === "1";
const evidence = path.join("tmp", "card-authoring-truth-stabilization");

async function expectPreviewCentered(page: Page, viewport: "phone" | "tablet" | "desktop") {
  await page.getByTestId(`preview-viewport-${viewport}`).click();
  const bounds = await page.evaluate(() => {
    const frame = document.querySelector<HTMLElement>('[data-testid="card-canvas-viewport"]');
    const card = document.querySelector<HTMLElement>('[data-testid="card-preview-phone"]');
    if (!frame || !card) return null;
    const f = frame.getBoundingClientRect();
    const c = card.getBoundingClientRect();
    return {
      frameLeft: f.left,
      frameRight: f.right,
      frameCenter: f.left + f.width / 2,
      cardLeft: c.left,
      cardRight: c.right,
      cardCenter: c.left + c.width / 2,
      horizontalOverflow: frame.scrollWidth > frame.clientWidth + 1,
    };
  });
  expect(bounds).not.toBeNull();
  expect(bounds!.cardLeft).toBeGreaterThanOrEqual(bounds!.frameLeft - 1);
  expect(bounds!.cardRight).toBeLessThanOrEqual(bounds!.frameRight + 1);
  expect(Math.abs(bounds!.cardCenter - bounds!.frameCenter)).toBeLessThanOrEqual(3);
  expect(bounds!.horizontalOverflow).toBe(false);
}

test.describe("Card creative editor authoring-truth stabilization", () => {
  test.skip(!enabled, "Set AUTHORING_TRUTH_STABILIZATION_ACCEPTANCE=1 with the authenticated local fixture");
  test.setTimeout(300_000);

  test("keeps natural text order and editor identity through autosave, effects, and Preview", async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto("/dashboard/card/edit", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("card-document-name")).toBeEnabled({ timeout: 60_000 });
    await expect(page.getByTestId("card-exit-edit-mode")).toContainText("Exit Edit Mode");

    const textTool = page.getByTestId("card-creative-tool-text");
    await textTool.click();
    await expect(page.getByTestId("card-creative-context-drawer")).toHaveAttribute("data-creative-tool", "text", { timeout: 15_000 });
    await page.getByRole("button", { name: "Add heading" }).click();
    const selected = page.locator('[data-composition-node][data-selected="true"]').last();
    const nodeId = await selected.getAttribute("data-composition-node");
    expect(nodeId).toBeTruthy();
    const inline = page.getByTestId(`composition-inline-text-${nodeId}`);
    await selected.dblclick();
    await expect(inline).toHaveAttribute("data-inline-editing", "true");
    await inline.press(process.platform === "darwin" ? "Meta+a" : "Control+a");
    await inline.pressSequentially("Chad Test 123!\nFriday 😊", { delay: 65 });

    const identityBefore = await page.evaluate(() => ({
      route: location.pathname,
      editor: document.querySelector('[data-testid="tap-card-builder"]')?.getAttribute("data-instance-id"),
      pasteboard: document.querySelector('[data-testid="card-pasteboard"]')?.getAttribute("data-instance-id"),
      card: document.querySelector('[data-testid="card-preview-phone"]')?.getAttribute("data-instance-id"),
      selected: document.querySelector('[data-composition-node][data-selected="true"]')?.getAttribute("data-composition-node"),
    }));

    await expect(page.getByTestId("studio-save-state").first()).toContainText(/Saving|Saved/, { timeout: 30_000 });
    await expect(inline).toHaveText("Chad Test 123!\nFriday 😊");
    await inline.press("End");
    await inline.pressSequentially(" O'Neil", { delay: 60 });
    await expect(inline).toHaveText("Chad Test 123!\nFriday 😊 O'Neil");
    await page.waitForTimeout(1800);

    const identityAfter = await page.evaluate(() => ({
      route: location.pathname,
      editor: document.querySelector('[data-testid="tap-card-builder"]')?.getAttribute("data-instance-id"),
      pasteboard: document.querySelector('[data-testid="card-pasteboard"]')?.getAttribute("data-instance-id"),
      card: document.querySelector('[data-testid="card-preview-phone"]')?.getAttribute("data-instance-id"),
      selected: document.querySelector('[data-composition-node][data-selected="true"]')?.getAttribute("data-composition-node"),
    }));
    expect(identityAfter).toEqual(identityBefore);
    await page.screenshot({ path: path.join(evidence, "01-natural-order-stable-autosave.png") });

    await page.getByTestId("contextual-effects").click();
    const effectDrawer = page.getByTestId("contextual-effects-drawer");
    await expect(effectDrawer).toBeVisible();
    for (const label of ["Neon tube", "Gold foil", "Polished chrome"] as const) {
      await effectDrawer.getByRole("button", { name: new RegExp(label) }).click();
      const styles = await inline.evaluate((element) => {
        const wrapper = element.parentElement!;
        return {
          wrapperBackground: getComputedStyle(wrapper).backgroundImage,
          glyphBackground: getComputedStyle(element).backgroundImage,
          boxTruth: wrapper.getAttribute("data-text-box-background"),
        };
      });
      expect(styles.wrapperBackground).toBe("none");
      expect(styles.glyphBackground).not.toBe("none");
      expect(styles.boxTruth).toBe("transparent");
    }
    await effectDrawer.getByRole("button", { name: "Remove effects" }).click();
    await expect(inline).toHaveCSS("background-image", "none");
    await page.screenshot({ path: path.join(evidence, "02-glyph-effects-transparent-box.png") });

    await page.getByLabel("Close effects").click();
    await expect(page.getByTestId("card-creative-context-drawer")).toHaveAttribute("data-creative-tool", "text");
    await page.getByRole("button", { name: "Curved text" }).click();
    await page.getByTestId("contextual-content").click();
    await page.getByTestId("contextual-content-input").fill("Friday Night");
    const curvedTextNode = page.locator('[data-composition-node][data-selected="true"]').last();
    await expect(curvedTextNode.locator("textPath")).toHaveText("Friday Night");
    await page.screenshot({ path: path.join(evidence, "03-curved-text-natural-order.png") });

    await page.getByTestId("card-preview-as-customer").click();
    await expect(page.getByTestId("preview-toolbar")).toBeVisible();
    await expectPreviewCentered(page, "phone");
    await page.screenshot({ path: path.join(evidence, "04-phone-preview-centered.png") });
    await expectPreviewCentered(page, "tablet");
    await page.screenshot({ path: path.join(evidence, "05-tablet-preview-centered.png") });
    await expectPreviewCentered(page, "desktop");
    await page.screenshot({ path: path.join(evidence, "06-desktop-preview-centered.png") });

    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical")).toEqual([]);
  });

  test("preserves image geometry while resizing, rotating, wrapping, and unwrapping a Section", async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto("/dashboard/card/edit", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("card-document-name")).toBeEnabled({ timeout: 60_000 });

    await page.getByTestId("card-creative-tool-brand").click();
    await page.getByAltText("Primary logo preview").click();
    const logo = page.locator('[data-composition-node][data-selected="true"]').last();
    const logoId = await logo.getAttribute("data-composition-node");
    expect(logoId).toBeTruthy();
    const rotateHandle = page.getByTestId(`composition-rotate-${logoId}`);
    await expect(rotateHandle).toBeVisible();

    await page.getByTestId("card-contextual-object-tools").getByRole("button", { name: "More" }).click();
    const inspector = page.getByTestId("card-contextual-inspector");
    await expect(inspector).toBeVisible();
    const aspectToggle = inspector.getByRole("checkbox", { name: "Maintain aspect ratio" });
    await expect(aspectToggle).toBeChecked();

    const beforeCorner = await logo.boundingBox();
    expect(beforeCorner).toBeTruthy();
    const corner = page.getByTestId(`composition-resize-${logoId}-se`);
    const cornerBox = await corner.boundingBox();
    expect(cornerBox).toBeTruthy();
    await page.mouse.move(cornerBox!.x + cornerBox!.width / 2, cornerBox!.y + cornerBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(cornerBox!.x + 48, cornerBox!.y + 36, { steps: 5 });
    await page.mouse.up();
    const afterCorner = await logo.boundingBox();
    expect(afterCorner).toBeTruthy();
    expect(Math.abs(afterCorner!.width / afterCorner!.height - beforeCorner!.width / beforeCorner!.height)).toBeLessThan(.08);

    await aspectToggle.uncheck();
    const beforeStretchRatio = afterCorner!.width / afterCorner!.height;
    const side = page.getByTestId(`composition-resize-${logoId}-w`);
    const sideBox = await side.boundingBox();
    expect(sideBox).toBeTruthy();
    await page.mouse.move(sideBox!.x + sideBox!.width / 2, sideBox!.y + sideBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(sideBox!.x + 55, sideBox!.y + sideBox!.height / 2, { steps: 5 });
    await page.mouse.up();
    const afterStretch = await logo.boundingBox();
    expect(afterStretch).toBeTruthy();
    expect(Math.abs(afterStretch!.width / afterStretch!.height - beforeStretchRatio)).toBeGreaterThan(.1);
    await aspectToggle.check();

    const rotation = inspector.getByLabel("Rotation °");
    await rotation.fill("30");
    await expect(logo).toHaveCSS("transform", /matrix/);
    await page.screenshot({ path: path.join(evidence, "07-image-ratio-and-rotation.png") });
    await rotation.fill("0");

    const geometryBeforeWrap = await logo.evaluate((element) => ({
      left: (element as HTMLElement).style.left,
      top: (element as HTMLElement).style.top,
      width: (element as HTMLElement).style.width,
      height: (element as HTMLElement).style.height,
    }));
    await inspector.getByRole("button", { name: "Wrap · blank" }).click();
    const selectedSection = page.locator('[data-section-id][data-selected="true"]');
    await selectedSection.getByRole("button", { name: "Reorder Blank Section" }).click();
    await expect(page.getByTestId("card-contextual-object-tools")).toHaveAttribute("data-contextual-object", "section");
    await expect(selectedSection).toBeVisible();
    const sectionBefore = await selectedSection.boundingBox();
    expect(sectionBefore).toBeTruthy();
    const wrappedLogo = page.locator(`[data-composition-node="${logoId}"]`);
    const wrappedGeometry = await wrappedLogo.evaluate((element) => ({
      left: (element as HTMLElement).style.left,
      top: (element as HTMLElement).style.top,
      width: (element as HTMLElement).style.width,
      height: (element as HTMLElement).style.height,
    }));
    expect(wrappedGeometry).toEqual(geometryBeforeWrap);
    await page.getByRole("spinbutton", { name: "Section height" }).fill(String(Math.round(sectionBefore!.height + 160)));
    await expect.poll(async () => (await selectedSection.boundingBox())?.height ?? 0).toBeGreaterThan(sectionBefore!.height + 100);
    const resizedGeometry = await wrappedLogo.evaluate((element) => ({
      left: (element as HTMLElement).style.left,
      top: (element as HTMLElement).style.top,
      width: (element as HTMLElement).style.width,
      height: (element as HTMLElement).style.height,
    }));
    expect(resizedGeometry).toEqual(geometryBeforeWrap);
    await page.screenshot({ path: path.join(evidence, "08-section-resize-preserves-child.png") });

    await page.getByRole("button", { name: "More Section controls" }).click();
    await page.getByTestId("remove-section-keep-elements").click();
    await expect(page.locator(`[data-composition-node="${logoId}"]`)).toBeVisible();
    await expect(page.locator('[data-section-id][data-selected="true"]')).toHaveCount(0);
  });
});
