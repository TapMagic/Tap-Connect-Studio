/**
 * VISUAL PARTS CABINET — integrity closeout certification.
 * Enable: VISUAL_PARTS_CABINET_CERT=1
 * Uses normal Owner UI paths (no document injection).
 * Required: Action preservation · save/reload · Preview · Divider UI · cross-object same part ID.
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
  selectObjectViaLayers,
  undo,
  redo,
} from "./owner-sim/physical-harness";

const enabled = process.env.VISUAL_PARTS_CABINET_CERT === "1" || process.env.PRACTICAL_AUTHORING_CERT === "1";
const EVIDENCE = path.join("tmp", "visual-parts-cabinet-evidence");
const ACTION_DESTINATION = "tel:+15559876543";

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

async function selectCopperButton(page: Page) {
  // Layers path — canvas may be covered by later Container / Divider inserts.
  await selectObjectViaLayers(page, { elementKind: "button" }, "Button with Visual Parts");
  const button = page
    .locator('[data-composition-node][data-vp-rim="rim_pounded_copper"]')
    .filter({ has: page.locator("[data-button-surface-kind]") })
    .first();
  await expect(button).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("card-contextual-object-tools")).toHaveAttribute(
    "data-selection-target",
    /button/i,
    { timeout: 10_000 }
  );
  return button;
}

test.describe("Visual Parts Cabinet certification", () => {
  test.skip(!enabled, "Set VISUAL_PARTS_CABINET_CERT=1 or PRACTICAL_AUTHORING_CERT=1");
  test.setTimeout(360_000);

  test("Cabinet integrity: Action preserve, persistence, Preview, Divider, cross-object", async ({ page }) => {
    ensureEvidenceDirs(["visual-parts"]);
    fs.mkdirSync(EVIDENCE, { recursive: true });
    await openBlankStudio(page);
    await dismissOverlays(page);

    // A — insert Button
    await insertFamily(page, "button");
    const button = page
      .locator("[data-composition-node]")
      .filter({ has: page.locator("[data-button-surface-kind]") })
      .first();
    await expect(button).toBeVisible({ timeout: 15_000 });
    await button.click();

    // D (early) — deliberately configured non-default Call Action before visual family
    await ownerClick(page.getByTestId("contextual-button-action"), "Action");
    await page.getByLabel("Button action type").selectOption("call");
    await page.getByLabel("Button destination").fill(ACTION_DESTINATION);
    await expect(page.getByLabel("Button action type")).toHaveValue("call");
    await expect(page.getByLabel("Button destination")).toHaveValue(ACTION_DESTINATION);

    // B — Apply Bright Lacquer + Pounded Copper
    await openVisualParts(page);
    await ownerClick(page.getByTestId("vp-drawer-curated"), "Curated drawer");
    await ownerClick(page.getByTestId("vp-part-family_bright_lacquer_pounded_copper"), "Apply curated family");
    await expect(button).toHaveAttribute("data-vp-rim", "rim_pounded_copper", { timeout: 10_000 });
    await expect(button).toHaveAttribute("data-vp-finish", "finish_lacquer");
    await expect(button).toHaveAttribute("data-vp-family", "family_bright_lacquer_pounded_copper");
    await expect(page.getByTestId("vp-customize-ingredients")).toBeVisible();
    await expect(page.getByTestId("vp-ingredient-rim")).toHaveAttribute("data-part-id", "rim_pounded_copper");
    await expect(page.getByTestId("vp-ingredient-iconStationBacking")).toHaveAttribute(
      "data-part-id",
      "icon_station_backing_dark"
    );

    // Action must survive curated visual family
    await ownerClick(page.getByTestId("contextual-button-action"), "Action after family");
    await expect(page.getByLabel("Button action type")).toHaveValue("call");
    await expect(page.getByLabel("Button destination")).toHaveValue(ACTION_DESTINATION);
    await openVisualParts(page);

    // Rim tile preview parity (Chrome vs Copper) from shared descriptor
    await ownerClick(page.getByTestId("vp-drawer-frame_ring"), "Frame & Ring");
    await expect(page.getByTestId("vp-part-rim_simple_chrome")).toHaveAttribute("data-vp-preview-kind", "rim-chrome");
    await expect(page.getByTestId("vp-part-rim_pounded_copper")).toHaveAttribute("data-vp-preview-kind", "rim-copper");
    await evidenceShot(page, "visual-parts", "01-curated-applied-action-preserved.png");

    // C — Change base Color, Icon Station position, Accent (reusable part)
    await ownerClick(page.getByTestId("vp-drawer-finish"), "Finish drawer");
    await ownerClick(page.getByTestId("vp-lacquer-color-blue"), "Electric blue lacquer base");
    await expect(button).toHaveAttribute("data-vp-finish", "finish_lacquer");
    await expect(button).toHaveAttribute("data-vp-base-color", "#155eef");
    await expect(button).toHaveAttribute("data-vp-rim", "rim_pounded_copper");

    await ownerClick(page.getByTestId("vp-drawer-icon_image"), "Icon/Image drawer");
    await ownerClick(page.getByTestId("vp-icon-pos-right"), "Icon Right");
    await expect(button).toHaveAttribute("data-vp-icon-position", "right");
    await expect(button).toHaveAttribute("data-vp-icon-station", "icon_station_round");

    await ownerClick(page.getByTestId("vp-drawer-accents"), "Accents drawer");
    await ownerClick(page.getByTestId("vp-accent-reset"), "Remove accent");
    await ownerClick(page.getByTestId("vp-part-accent_copper_leaves"), "Re-apply Copper Leaves");
    await expect(button).toHaveAttribute("data-vp-accent", "accent_copper_leaves");
    await evidenceShot(page, "visual-parts", "02-visual-parts-edited.png");

    // Action still exact after visual edits
    await ownerClick(page.getByTestId("contextual-button-action"), "Action after visual edits");
    await expect(page.getByLabel("Button action type")).toHaveValue("call");
    await expect(page.getByLabel("Button destination")).toHaveValue(ACTION_DESTINATION);

    // E — Save
    await saveDraft(page);
    await evidenceShot(page, "visual-parts", "03-after-save.png");

    // F — Reload / reopen Studio through normal Owner path
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("card-edit-workspace-host")).toHaveAttribute("data-builder-ready", "true", {
      timeout: 60_000,
    });
    await dismissOverlays(page);
    expect(page.url()).toContain("/dashboard/card/edit");

    // G — Re-select the same Button
    const reloaded = await selectCopperButton(page);

    // H — Durable Visual Parts state survived
    await expect(reloaded).toHaveAttribute("data-vp-family", "family_bright_lacquer_pounded_copper");
    await expect(reloaded).toHaveAttribute("data-vp-finish", "finish_lacquer");
    await expect(reloaded).toHaveAttribute("data-vp-base-color", "#155eef");
    await expect(reloaded).toHaveAttribute("data-vp-rim", "rim_pounded_copper");
    await expect(reloaded).toHaveAttribute("data-vp-icon-station", "icon_station_round");
    await expect(reloaded).toHaveAttribute("data-vp-icon-position", "right");
    await expect(reloaded).toHaveAttribute("data-vp-accent", "accent_copper_leaves");
    await expect(reloaded).toHaveAttribute("data-vp-icon-station-backing", "icon_station_backing_dark");

    // I — Exact Action/destination survived
    await ownerClick(page.getByTestId("contextual-button-action"), "Action after reload");
    await expect(page.getByLabel("Button action type")).toHaveValue("call");
    await expect(page.getByLabel("Button destination")).toHaveValue(ACTION_DESTINATION);
    await evidenceShot(page, "visual-parts", "04-after-reload.png");

    // J/K — Required Preview proof (not optional)
    await ownerClick(page.getByTestId("card-preview-as-customer"), "Preview as customer");
    await expect(page.getByTestId("preview-toolbar")).toBeVisible({ timeout: 20_000 });
    const previewButton = page
      .locator('[data-vp-rim="rim_pounded_copper"]')
      .filter({ has: page.locator("[data-button-surface-kind], [data-element-action]") })
      .first();
    await expect(previewButton).toBeVisible({ timeout: 15_000 });
    await expect(previewButton).toHaveAttribute("data-vp-finish", "finish_lacquer");
    await expect(previewButton).toHaveAttribute("data-vp-base-color", "#155eef");
    await expect(previewButton).toHaveAttribute("data-vp-icon-station", "icon_station_round");
    await expect(
      page.locator(`[data-element-action="call"], a[href="${ACTION_DESTINATION}"]`).first()
    ).toBeVisible({ timeout: 10_000 });
    await evidenceShot(page, "visual-parts", "05-preview-visual-parts.png");
    await ownerClick(page.getByTestId("preview-exit"), "Exit Preview");
    await dismissOverlays(page);

    // Required Divider UI path — Tools → Starter Dividers → Visual Parts drawer
    await ownerClick(page.getByTestId("card-creative-tool-tools"), "Tools rail");
    await expect(page.getByTestId("card-quick-tools")).toBeVisible({ timeout: 15_000 });
    const dividerTile = page.getByTestId("starter-divider-solid-full");
    await dividerTile.scrollIntoViewIfNeeded();
    await expect(dividerTile).toBeVisible({ timeout: 10_000 });
    await ownerClick(dividerTile, "Insert Divider");
    const divider = page.locator('[data-composition-node][data-primitive="border"]').last();
    await expect(divider).toBeVisible({ timeout: 10_000 });
    await divider.click();
    await openVisualParts(page);
    await ownerClick(page.getByTestId("vp-drawer-divider"), "Divider drawer");
    await ownerClick(page.getByTestId("vp-part-divider_copper_botanical"), "Copper Botanical Divider");
    await expect(page.locator("[data-vp-divider='divider_copper_botanical']").first()).toBeVisible({
      timeout: 10_000,
    });
    await evidenceShot(page, "visual-parts", "06-divider-ui.png");

    // Cross-object: same rim_pounded_copper ID on Button AND Container Action Surface edge
    await ownerClick(page.getByTestId("card-creative-tool-tools"), "Tools rail");
    await expect(page.getByTestId("starter-container-stack-card")).toBeVisible({ timeout: 15_000 });
    await ownerClick(page.getByTestId("starter-container-stack-card"), "Insert Container");
    const container = page
      .locator("[data-composition-node]")
      .filter({ has: page.locator('[data-component-kind="container"]') })
      .last();
    await expect(container).toBeVisible({ timeout: 15_000 });
    await container.click();
    await openVisualParts(page);
    await ownerClick(page.getByTestId("vp-drawer-surface_zone"), "Surface/Zone");
    await ownerClick(page.getByTestId("vp-part-action_surface_copper_harmonized"), "Copper Harmonized Surface");
    await expect(
      page.locator("[data-vp-action-surface='action_surface_copper_harmonized']").first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-vp-rim="rim_pounded_copper"]').first()).toBeVisible();
    const copperCount = await page.locator('[data-vp-rim="rim_pounded_copper"]').count();
    expect(copperCount).toBeGreaterThanOrEqual(2);
    await evidenceShot(page, "visual-parts", "07-cross-object-rim.png");

    // Undo/Redo representative
    await undo(page);
    await redo(page);

    // Re-assert Button Action after cross-object work
    await selectCopperButton(page);
    await ownerClick(page.getByTestId("contextual-button-action"), "Final Action check");
    await expect(page.getByLabel("Button action type")).toHaveValue("call");
    await expect(page.getByLabel("Button destination")).toHaveValue(ACTION_DESTINATION);

    await saveDraft(page);

    fs.writeFileSync(
      path.join(EVIDENCE, "cabinet-integrity-cert.json"),
      JSON.stringify(
        {
          curatedFamily: "family_bright_lacquer_pounded_copper",
          poundedCopperPartId: "rim_pounded_copper",
          actionPreserved: { actionType: "call", href: ACTION_DESTINATION },
          persistence: true,
          previewRequired: true,
          dividerUiRequired: true,
          crossObjectSameRimId: true,
          productSha: process.env.PRODUCT_SHA || null,
          passedAt: new Date().toISOString(),
        },
        null,
        2
      )
    );
  });
});
