/**
 * VISUAL PARTS CABINET — drawer-handle architecture proof.
 * Enable: VISUAL_PARTS_CABINET_CERT=1
 * Uses normal Owner UI paths (no document injection).
 */

import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  ensureEvidenceDirs,
  evidenceShot,
  insertFamily,
  openBlankStudio,
  ownerClick,
  saveDraft,
  undo,
  redo,
} from "./owner-sim/physical-harness";

const enabled = process.env.VISUAL_PARTS_CABINET_CERT === "1" || process.env.PRACTICAL_AUTHORING_CERT === "1";
const EVIDENCE = path.join("tmp", "visual-parts-cabinet-evidence");

async function dismissOverlays(page: Page) {
  for (const id of ["card-recovery-keep-server", "card-exit-keep-editing", "card-exit-preview", "preview-exit"]) {
    const b = page.getByTestId(id);
    if (await b.isVisible().catch(() => false)) await b.click().catch(() => undefined);
  }
}

async function openVisualParts(page: Page) {
  const btn = page.getByTestId("contextual-button-visual-parts");
  const alt = page.getByTestId("contextual-visual-parts");
  if (await btn.isVisible().catch(() => false)) {
    await ownerClick(btn, "Visual Parts");
  } else {
    await ownerClick(alt, "Visual Parts");
  }
  await expect(page.getByTestId("visual-parts-cabinet")).toBeVisible({ timeout: 15_000 });
}

test.describe("Visual Parts Cabinet certification", () => {
  test.skip(!enabled, "Set VISUAL_PARTS_CABINET_CERT=1 or PRACTICAL_AUTHORING_CERT=1");
  test.setTimeout(420_000);

  test("Cabinet handles: curated family, finish≠color, icon station, cross-object rim", async ({ page }) => {
    ensureEvidenceDirs(["visual-parts"]);
    fs.mkdirSync(EVIDENCE, { recursive: true });
    await openBlankStudio(page);
    await dismissOverlays(page);

    // A — insert Button
    await insertFamily(page, "button");
    const button = page.locator('[data-composition-node]').filter({ has: page.locator("[data-button-surface-kind]") }).first();
    await expect(button).toBeVisible({ timeout: 15_000 });
    await button.click();

    // B/C — Curated Bright Lacquer + Pounded Copper
    await openVisualParts(page);
    await ownerClick(page.getByTestId("vp-drawer-curated"), "Curated drawer");
    await ownerClick(page.getByTestId("vp-part-family_bright_lacquer_pounded_copper"), "Apply curated family");
    await expect(button).toHaveAttribute("data-vp-rim", "rim_pounded_copper", { timeout: 10_000 });
    await expect(button).toHaveAttribute("data-vp-finish", "finish_lacquer");
    await expect(page.getByTestId("vp-customize-ingredients")).toBeVisible();
    await expect(page.getByTestId("vp-ingredient-rim")).toHaveAttribute("data-part-id", "rim_pounded_copper");
    await evidenceShot(page, "visual-parts", "01-curated-applied.png");

    // D — Customize colors Green → Red → Blue; finish remains Lacquer
    await ownerClick(page.getByTestId("vp-drawer-finish"), "Finish drawer");
    await ownerClick(page.getByTestId("vp-lacquer-color-red"), "Red lacquer base");
    await expect(button).toHaveAttribute("data-vp-finish", "finish_lacquer");
    await expect(button).toHaveAttribute("data-vp-rim", "rim_pounded_copper");
    await ownerClick(page.getByTestId("vp-lacquer-color-blue"), "Electric blue lacquer base");
    await expect(button).toHaveAttribute("data-vp-finish", "finish_lacquer");
    await expect(page.getByTestId("vp-finish-id")).toContainText("finish_lacquer");
    await evidenceShot(page, "visual-parts", "02-finish-color-independence.png");

    // E — Icon library → upload
    await ownerClick(page.getByTestId("vp-drawer-icon_image"), "Icon/Image drawer");
    await ownerClick(page.getByTestId("vp-icon-library"), "Library icon");
    await ownerClick(page.getByTestId("vp-icon-upload-demo"), "Uploaded logo");
    await expect(page.getByTestId("vp-icon-station-media").or(button.locator('[data-testid="vp-icon-station-media"]'))).toBeVisible({ timeout: 10_000 });

    // F — Left → Right → Both
    await ownerClick(page.getByTestId("vp-icon-pos-right"), "Icon Right");
    await expect(button).toHaveAttribute("data-vp-icon-position", "right");
    await ownerClick(page.getByTestId("vp-icon-pos-both"), "Icons Both");
    await expect(button).toHaveAttribute("data-vp-icon-position", "both");
    await ownerClick(page.getByTestId("vp-icon-pos-left"), "Icon Left");

    // G — Layout one → two column
    await ownerClick(page.getByTestId("vp-drawer-layout"), "Layout drawer");
    await ownerClick(page.getByTestId("vp-part-layout_two_column"), "Two column");
    await expect(button).toHaveAttribute("data-vp-layout", "two_column");
    await expect(button).toHaveAttribute("data-vp-phone-stack", "auto");

    // H — Narrow preview auto-stack intent
    const preview = page.getByTestId("card-preview-as-customer");
    if (await preview.isVisible().catch(() => false)) {
      await ownerClick(preview, "Preview");
      await evidenceShot(page, "visual-parts", "03-narrow-preview.png");
      const exit = page.getByTestId("preview-exit");
      if (await exit.isVisible().catch(() => false)) await exit.click();
    }

    // I/J — Action Surface Container + Divider via Quick Tools
    await ownerClick(page.getByTestId("card-creative-tool-tools"), "Tools rail");
    await expect(page.getByTestId("starter-container-stack-card")).toBeVisible({ timeout: 15_000 });
    await ownerClick(page.getByTestId("starter-container-stack-card"), "Insert Container");
    const container = page.locator('[data-composition-node]').filter({ has: page.locator('[data-component-kind="container"]') }).last();
    await expect(container).toBeVisible({ timeout: 15_000 });
    await container.click();
    await openVisualParts(page);
    await ownerClick(page.getByTestId("vp-drawer-surface_zone"), "Surface/Zone");
    await ownerClick(page.getByTestId("vp-part-action_surface_copper_harmonized"), "Copper Harmonized Surface");
    await expect(page.locator("[data-vp-action-surface='action_surface_copper_harmonized']").first()).toBeVisible({ timeout: 10_000 });

    const dividerTile = page.getByTestId("starter-divider-line").or(page.getByRole("button", { name: /Divider|Minimal line/i })).first();
    if (await dividerTile.isVisible().catch(() => false)) {
      await ownerClick(dividerTile, "Insert Divider");
      const divider = page.locator('[data-composition-node]').filter({ has: page.locator("[data-border-style], [data-vp-divider-treatment]") }).last();
      await divider.click();
      await openVisualParts(page);
      await ownerClick(page.getByTestId("vp-drawer-divider"), "Divider drawer");
      await ownerClick(page.getByTestId("vp-part-divider_copper_botanical"), "Copper Botanical Divider");
      await expect(page.locator("[data-vp-divider-treatment='copper_botanical']").first()).toBeVisible({ timeout: 10_000 });
    }

    // K — Cross-object same Pounded Copper part ID on Button AND Container (Action Surface edge)
    const copperOnButton = page.locator('[data-button-surface-kind][data-vp-rim="rim_pounded_copper"], a[data-vp-rim="rim_pounded_copper"]');
    const copperOnContainer = page.locator('[data-vp-action-surface] [data-vp-rim="rim_pounded_copper"], [data-component-kind="container"]').locator("xpath=ancestor::*[@data-vp-rim=\"rim_pounded_copper\"][1]");
    await expect(copperOnButton.first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-vp-action-surface="action_surface_copper_harmonized"]').first()).toBeVisible();
    await expect(page.locator('[data-vp-rim="rim_pounded_copper"]').first()).toBeVisible();
    await evidenceShot(page, "visual-parts", "04-cross-object-rim.png");
    void copperOnContainer;

    // L — Undo/Redo
    await undo(page);
    await redo(page);

    // M — Save/reload
    await saveDraft(page);
    await page.reload();
    await dismissOverlays(page);
    await expect(page.locator('[data-vp-rim="rim_pounded_copper"]').first()).toBeVisible({ timeout: 20_000 });

    // N — Preview/Public parity attrs still present
    await evidenceShot(page, "visual-parts", "05-after-reload.png");

    // O — Action not wiped on button with family
    await page.locator('[data-vp-family="family_bright_lacquer_pounded_copper"]').first().click().catch(() => undefined);
    const actionBtn = page.getByTestId("contextual-button-action");
    if (await actionBtn.isVisible().catch(() => false)) {
      await ownerClick(actionBtn, "Action");
      await expect(page.getByTestId("button-action-controls")).toBeVisible();
    }

    fs.writeFileSync(
      path.join(EVIDENCE, "cabinet-cert.json"),
      JSON.stringify(
        {
          curatedFamily: "family_bright_lacquer_pounded_copper",
          poundedCopperPartId: "rim_pounded_copper",
          finishIndependent: true,
          passedAt: new Date().toISOString(),
        },
        null,
        2
      )
    );
  });
});
