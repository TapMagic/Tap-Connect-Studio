import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- package.json declares @types/pngjs; this local install omits that dev type folder.
import { PNG } from "pngjs";
import {
  dismissTransientStudioChrome,
  insertFamily,
  openBlankStudio,
  ownerClick,
  saveDraft,
} from "./owner-sim/physical-harness";

const enabled = process.env.ARC_EMBER_MASTER_HOSTING === "1";
const out = path.join("tmp", "arc-ember-pristine-master-hosting-test");
const proof = path.join(out, "01-arc-ember-pristine-master-hosting-proof.png");

async function openVisualParts(page: Page) {
  const primary = page.getByTestId("contextual-button-visual-parts");
  const fallback = page.getByTestId("contextual-visual-parts");
  await ownerClick(await primary.isVisible().catch(() => false) ? primary : fallback, "Visual Parts");
  await expect(page.getByTestId("visual-parts-cabinet")).toBeVisible({ timeout: 15_000 });
}

function composeProof(panels: Buffer[]) {
  const decoded = panels.map((panel) => PNG.sync.read(panel));
  const gap = 12;
  const cellWidth = Math.max(...decoded.map((panel) => panel.width));
  const cellHeight = Math.max(...decoded.map((panel) => panel.height));
  const canvas = new PNG({ width: cellWidth * 2 + gap, height: cellHeight * 2 + gap, fill: true });
  canvas.data.fill(5);
  decoded.forEach((panel, index) => {
    const x = (index % 2) * (cellWidth + gap);
    const y = Math.floor(index / 2) * (cellHeight + gap);
    PNG.bitblt(panel, canvas, 0, 0, panel.width, panel.height, x, y);
  });
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(proof, PNG.sync.write(canvas));
}

test.describe("Arc Ember pristine-master hosting test", () => {
  test.skip(!enabled, "Set ARC_EMBER_MASTER_HOSTING=1");
  test.setTimeout(180_000);

  test("hosts the immutable master through drawer, save/reload, phone, and Preview/Public", async ({ page }) => {
    const panels: Buffer[] = [];
    await openBlankStudio(page);
    await dismissTransientStudioChrome(page);
    await insertFamily(page, "button");
    const button = page.locator("[data-composition-node][data-element-kind='button'], [data-composition-node] a[data-button-presentation]").first();
    await expect(button).toBeVisible({ timeout: 20_000 });
    await button.click();

    await openVisualParts(page);
    await ownerClick(page.getByTestId("vp-drawer-curated"), "Curated");
    const tile = page.getByTestId("vp-part-action_surface_arc_ember_pristine_master");
    await expect(tile).toBeVisible();
    await expect(tile).toHaveAttribute("draggable", "true");
    await tile.dragTo(page.getByTestId("card-preview-phone"));
    const master = page.locator("[data-vp-arc-ember-pristine-master='true']").first();
    await expect(master).toBeVisible({ timeout: 15_000 });
    await master.click();
    await ownerClick(page.getByTestId("contextual-button-content"), "Button Content");
    await page.getByTestId("button-label-input").fill("Ember Vault");
    await page.getByLabel("Button description").fill("Private member access");
    await master.click();
    await ownerClick(page.getByTestId("contextual-button-action"), "Button Action");
    await page.getByLabel("Button action type").selectOption("website");
    await page.getByLabel("Button destination").fill("https://example.com/ember-vault");
    await master.click();
    await ownerClick(page.getByTestId("contextual-size"), "Size");
    await page.getByTestId("quick-size-w").fill("340");
    await page.getByTestId("quick-size-h").fill("113");
    await master.click();
    await ownerClick(page.getByTestId("contextual-position"), "Position");
    await ownerClick(page.getByTestId("align-center"), "Center on Card");
    await master.click();
    await openVisualParts(page);
    await ownerClick(page.getByTestId("vp-drawer-curated"), "Curated");
    await ownerClick(page.getByTestId("vp-arc-ember-cue-launch"), "Launch cue");
    await page.getByTestId("vp-curated-pristine-masters").scrollIntoViewIfNeeded();
    panels.push(await page.screenshot());

    await expect(master).toContainText("Ember Vault");
    await expect(master).toContainText("Private member access");
    await expect(master).toHaveAttribute("data-action-href", "https://example.com/ember-vault");
    await expect(master.locator(".ae-master-cue")).toHaveAttribute("data-ae-action-cue", "launch");

    await ownerClick(page.getByTestId("vp-drawer-icon_image"), "Icon / Image");
    await ownerClick(page.getByTestId("vp-icon-upload-demo"), "User logo");
    await expect(master.locator(".ae-master-identity img")).toBeVisible();
    const assetTruth = await master.locator(".ae-master-asset").evaluate((image) => {
      const img = image as HTMLImageElement;
      const style = getComputedStyle(img);
      return {
        src: img.getAttribute("src"),
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        objectFit: style.objectFit,
        filter: style.filter,
      };
    });
    expect(assetTruth).toEqual({
      src: "/visual-parts/arc-ember/pristine-master-button.png",
      naturalWidth: 2172,
      naturalHeight: 724,
      objectFit: "contain",
      filter: "none",
    });

    await saveDraft(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await dismissTransientStudioChrome(page);
    const reloaded = page.locator("[data-vp-arc-ember-pristine-master='true']").first();
    await expect(reloaded).toBeVisible({ timeout: 30_000 });
    await expect(reloaded).toContainText("Ember Vault");
    await expect(reloaded.locator(".ae-master-identity img")).toBeVisible();
    await expect(reloaded.locator(".ae-master-cue")).toHaveAttribute("data-ae-action-cue", "launch");
    await expect(reloaded).toHaveAttribute("data-action-href", "https://example.com/ember-vault");
    panels.push(await page.screenshot());

    await page.goto("/dashboard/card/preview", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("card-preview-workspace")).toBeVisible({ timeout: 60_000 });
    const publicMaster = page.locator("[data-vp-arc-ember-pristine-master='true']").first();
    await expect(publicMaster).toBeVisible({ timeout: 30_000 });
    await expect(publicMaster).toContainText("Ember Vault");
    await expect(publicMaster).toHaveAttribute("data-action-href", "https://example.com/ember-vault");
    await page.getByTestId("card-preview-viewport").getByText("Desktop").click();
    await expect(page.getByTestId("card-preview-frame")).toHaveAttribute("data-viewport", "desktop");
    panels.push(await page.screenshot());

    await page.getByTestId("card-preview-viewport").getByText("Phone").click();
    await expect(page.getByTestId("card-preview-frame")).toHaveAttribute("data-viewport", "phone");
    await expect(publicMaster).toBeVisible();
    const stage = await publicMaster.locator(".ae-master-stage").boundingBox();
    expect(stage).toBeTruthy();
    expect(Math.abs(stage!.width / stage!.height - 3)).toBeLessThan(.02);
    panels.push(await page.screenshot());

    composeProof(panels);
    expect(fs.existsSync(proof)).toBeTruthy();
  });
});
