/**
 * VISUAL GRAMMAR + MOBILE COMPOSITION certification.
 * Enable: VISUAL_GRAMMAR_CERT=1 (also enabled with PRACTICAL_AUTHORING_CERT=1)
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

const enabled = process.env.VISUAL_GRAMMAR_CERT === "1" || process.env.PRACTICAL_AUTHORING_CERT === "1";
const EVIDENCE = path.join("tmp", "visual-grammar-evidence");

async function dismissOverlays(page: Page) {
  for (const id of ["card-recovery-keep-server", "card-exit-keep-editing", "card-exit-preview", "preview-exit"]) {
    const b = page.getByTestId(id);
    if (await b.isVisible().catch(() => false)) await b.click().catch(() => undefined);
  }
}

async function openVisualParts(page: Page) {
  const btn = page.getByTestId("contextual-button-visual-parts");
  const alt = page.getByTestId("contextual-visual-parts");
  if (await btn.isVisible().catch(() => false)) await ownerClick(btn, "Visual Parts");
  else await ownerClick(alt, "Visual Parts");
  await expect(page.getByTestId("visual-parts-cabinet")).toBeVisible({ timeout: 15_000 });
}

test.describe("Visual Grammar certification", () => {
  test.skip(!enabled, "Set VISUAL_GRAMMAR_CERT=1 or PRACTICAL_AUTHORING_CERT=1");
  test.setTimeout(360_000);

  test("Grammar: Hero, Launch, Mount, Surface, rails, Mission Control, persistence, Preview", async ({ page }) => {
    ensureEvidenceDirs(["visual-grammar"]);
    fs.mkdirSync(EVIDENCE, { recursive: true });
    await openBlankStudio(page);
    await dismissOverlays(page);

    // Compact Hero
    await ownerClick(page.getByTestId("card-creative-tool-tools"), "Tools");
    await expect(page.getByTestId("starter-hero-compact")).toBeVisible({ timeout: 15_000 });
    await ownerClick(page.getByTestId("starter-hero-compact"), "Insert Compact Hero");
    const hero = page.locator('[data-composition-node][data-vp-hero="compact"], [data-composition-node]').filter({
      has: page.locator('[data-component-kind="container"]'),
    }).last();
    await expect(hero).toBeVisible({ timeout: 15_000 });
    await hero.click();
    await openVisualParts(page);
    await ownerClick(page.getByTestId("vp-drawer-hero"), "Hero drawer");
    await expect(page.getByTestId("vp-part-hero_compact")).toBeVisible();
    await evidenceShot(page, "visual-grammar", "01-hero-compact.png");

    // Launch Block + Action preserve
    await ownerClick(page.getByTestId("card-creative-tool-tools"), "Tools");
    await ownerClick(page.getByTestId("starter-launch-featured-launch"), "Insert Launch");
    const launch = page.locator('[data-composition-node]').filter({ has: page.locator("[data-button-surface-kind]") }).last();
    await expect(launch).toBeVisible({ timeout: 15_000 });
    await launch.click();
    await ownerClick(page.getByTestId("contextual-button-action"), "Action");
    await page.getByLabel("Button action type").selectOption("website");
    await page.getByLabel("Button destination").fill("https://host.example/launch");
    await openVisualParts(page);
    await ownerClick(page.getByTestId("vp-drawer-curated"), "Curated");
    await ownerClick(page.getByTestId("vp-part-family_mission_control"), "Mission Control");
    await expect(launch).toHaveAttribute("data-vp-mount", "mount_mission_control", { timeout: 10_000 });
    await expect(launch).toHaveAttribute("data-vp-family", "family_mission_control");
    await ownerClick(page.getByTestId("contextual-button-action"), "Action after Mission Control");
    await expect(page.getByLabel("Button action type")).toHaveValue("website");
    await expect(page.getByLabel("Button destination")).toHaveValue("https://host.example/launch");
    await evidenceShot(page, "visual-grammar", "02-mission-control-launch.png");

    // Icon Station scale + anchor
    await openVisualParts(page);
    await ownerClick(page.getByTestId("vp-drawer-icon_image"), "Icon");
    await page.getByTestId("vp-icon-scale").evaluate((el) => {
      const input = el as HTMLInputElement;
      input.value = "85";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await ownerClick(page.getByTestId("vp-icon-anchor-left_center"), "Anchor left center");
    await ownerClick(page.getByTestId("vp-icon-upload-demo"), "Portrait upload");
    await expect(launch).toHaveAttribute("data-vp-icon-scale", /0\.8|0\.85|0\.9/);

    // Surface On + Mount proof via Copper family on a second Button
    await insertFamily(page, "button");
    const button = page.locator("[data-composition-node]").filter({ has: page.locator("[data-button-surface-kind]") }).first();
    await button.click();
    await openVisualParts(page);
    await ownerClick(page.getByTestId("vp-drawer-curated"), "Curated");
    await ownerClick(page.getByTestId("vp-part-family_bright_lacquer_pounded_copper"), "Copper family");
    await expect(button).toHaveAttribute("data-vp-mount", "mount_dark_plaque", { timeout: 10_000 });
    await expect(button).toHaveAttribute("data-vp-assembly", "family_bright_lacquer_pounded_copper");

    // Bottom Stop
    await ownerClick(page.getByTestId("card-creative-tool-tools"), "Tools");
    await ownerClick(page.getByTestId("starter-bottom-stop-themed-footer"), "Bottom Stop");
    await expect(page.locator("[data-vp-bottom-stop='bottom_stop_themed_border']").first()).toBeVisible({
      timeout: 10_000,
    });

    // Dividers: minimal + electric
    await ownerClick(page.getByTestId("card-creative-tool-tools"), "Tools");
    await ownerClick(page.getByTestId("starter-divider-solid-full"), "Divider");
    const divider = page.locator('[data-composition-node][data-primitive="border"]').last();
    await divider.click();
    await openVisualParts(page);
    await ownerClick(page.getByTestId("vp-drawer-divider"), "Divider drawer");
    await ownerClick(page.getByTestId("vp-part-divider_electric"), "Electric Divider");
    await expect(page.locator("[data-vp-divider='divider_electric']").first()).toBeVisible({ timeout: 10_000 });

    await undo(page);
    await redo(page);
    await saveDraft(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("card-edit-workspace-host")).toHaveAttribute("data-builder-ready", "true", {
      timeout: 60_000,
    });
    await dismissOverlays(page);

    await selectObjectViaLayers(page, { elementKind: "button" }, "Button after reload");
    await expect(page.locator('[data-vp-family="family_bright_lacquer_pounded_copper"], [data-vp-family="family_mission_control"]').first()).toBeVisible({
      timeout: 15_000,
    });

    await ownerClick(page.getByTestId("card-preview-as-customer"), "Preview");
    await expect(page.getByTestId("preview-toolbar")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("[data-vp-mount], [data-vp-family]").first()).toBeVisible({ timeout: 15_000 });
    await evidenceShot(page, "visual-grammar", "03-preview.png");
    await ownerClick(page.getByTestId("preview-exit"), "Exit Preview");

    fs.writeFileSync(
      path.join(EVIDENCE, "visual-grammar-cert.json"),
      JSON.stringify(
        {
          hero: true,
          launch: true,
          missionControl: true,
          copperMount: true,
          bottomStop: true,
          electricDivider: true,
          previewRequired: true,
          persistence: true,
          productSha: process.env.PRODUCT_SHA || null,
          passedAt: new Date().toISOString(),
        },
        null,
        2
      )
    );
  });
});
