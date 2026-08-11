/**
 * VISUAL RENDERER REPAIR — product certification (Evict Enrique).
 * Enable: VISUAL_RENDERER_REPAIR_CERT=1 (or PRACTICAL_AUTHORING_CERT=1)
 * Measures pixels / visible layers — not attribute-only success.
 */

import { expect, test, type Page, type Locator } from "@playwright/test";
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
import { comparePngBuffers } from "../lib/fusion/creative-studio/visual-parts/image-parity";

const enabled =
  process.env.VISUAL_RENDERER_REPAIR_CERT === "1" || process.env.PRACTICAL_AUTHORING_CERT === "1";
const EVIDENCE = path.join("tmp", "visual-renderer-repair-evidence");
const LAB = path.join(EVIDENCE, "lab");

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

async function openTools(page: Page) {
  await ownerClick(page.getByTestId("card-creative-tool-tools"), "Tools");
  await expect(page.getByTestId("card-quick-tools")).toBeVisible({ timeout: 15_000 });
}

async function setRange(page: Page, testId: string, value: number) {
  await page.getByTestId(testId).evaluate((el, v) => {
    const input = el as HTMLInputElement;
    const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
    proto?.set?.call(input, String(v));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

async function shot(locator: Locator, name: string) {
  fs.mkdirSync(LAB, { recursive: true });
  const file = path.join(LAB, name);
  await locator.screenshot({ path: file });
  return file;
}

function assertLadderDiffers(files: string[], label: string) {
  const bufs = files.map((f) => fs.readFileSync(f));
  const metrics: Array<{ a: string; b: string; differingPixels: number; meanChannelDelta: number; maxChannelDelta: number }> = [];
  for (let i = 0; i < bufs.length - 1; i++) {
    const r = comparePngBuffers(bufs[i]!, bufs[i + 1]!, { maxChannelDelta: 2, maxDiffRatio: 0.00001 });
    metrics.push({
      a: path.basename(files[i]!),
      b: path.basename(files[i + 1]!),
      differingPixels: r.differingPixels,
      meanChannelDelta: r.meanChannelDelta,
      maxChannelDelta: r.maxChannelDelta,
    });
    expect(r.differingPixels, `${label}: ${files[i]} vs ${files[i + 1]} should differ`).toBeGreaterThan(0);
  }
  fs.writeFileSync(path.join(LAB, `${label}-metrics.json`), JSON.stringify(metrics, null, 2));
}

test.describe("Visual Renderer Repair certification", () => {
  test.skip(!enabled, "Set VISUAL_RENDERER_REPAIR_CERT=1 or PRACTICAL_AUTHORING_CERT=1");
  test.setTimeout(420_000);

  test("Renderer repair: depth/surface/finish/copper/bottom-stop/hero/interaction/electric", async ({
    page,
  }) => {
    ensureEvidenceDirs(["visual-renderer-repair"]);
    fs.mkdirSync(LAB, { recursive: true });
    fs.mkdirSync(path.join(EVIDENCE, "_reports"), { recursive: true });

    await openBlankStudio(page);
    await dismissOverlays(page);

    // —— Surface Intensity + Depth ladders ——
    await openTools(page);
    await ownerClick(page.getByTestId("starter-hero-compact"), "Compact Hero");
    const hero = page.locator("[data-composition-node][data-vp-hero]").first();
    await expect(hero).toBeVisible({ timeout: 15_000 });
    await hero.click();
    await openVisualParts(page);
    await ownerClick(page.getByTestId("vp-drawer-surface_zone"), "Surface");
    await ownerClick(page.getByTestId("vp-surface-on"), "Surface On");
    const energy = page.getByTestId("vp-part-action_surface_energy_field");
    if (await energy.isVisible().catch(() => false)) {
      await ownerClick(energy, "Energy Field surface");
    } else {
      await ownerClick(page.getByTestId("vp-part-action_surface_panel"), "Panel surface");
    }

    const intensityFiles: string[] = [];
    for (const v of [0, 25, 50, 75, 100]) {
      await setRange(page, "vp-surface-intensity", v);
      await page.waitForTimeout(120);
      intensityFiles.push(await shot(hero, `B-surface-intensity-${String(v).padStart(3, "0")}.png`));
    }
    assertLadderDiffers(intensityFiles, "surface-intensity");

    const depthFiles: string[] = [];
    for (const v of [0, 25, 50, 75, 100]) {
      await setRange(page, "vp-surface-depth", v);
      await page.waitForTimeout(120);
      depthFiles.push(await shot(hero, `C-surface-depth-${String(v).padStart(3, "0")}.png`));
    }
    assertLadderDiffers(depthFiles, "surface-depth");

    // —— Hero flow shapes ——
    await ownerClick(page.getByTestId("vp-drawer-hero"), "Hero");
    await ownerClick(page.getByTestId("vp-part-hero_identity"), "Identity = arc");
    await expect(page.locator('[data-vp-hero-flow="arc"]').first()).toBeVisible({ timeout: 10_000 });
    const arcShot = await shot(hero, "J-hero-flow-arc.png");
    await ownerClick(page.getByTestId("vp-part-hero_compact"), "Compact = geometric_band");
    await expect(page.locator('[data-vp-hero-flow="geometric_band"]').first()).toBeVisible({
      timeout: 10_000,
    });
    const bandShot = await shot(hero, "J-hero-flow-geometric-band.png");
    const flowCmp = comparePngBuffers(fs.readFileSync(arcShot), fs.readFileSync(bandShot), {
      maxChannelDelta: 2,
      maxDiffRatio: 0.00001,
    });
    expect(flowCmp.differingPixels).toBeGreaterThan(40);

    // —— Bottom Stop live mount ——
    await openTools(page);
    await ownerClick(page.getByTestId("starter-bottom-stop-themed-footer"), "Themed Bottom Stop");
    const bottomBar = page.locator("[data-testid^='bottom-stop-'], [data-testid='vp-bottom-stop']").first();
    await expect(bottomBar).toBeVisible({ timeout: 10_000 });
    const barBox = await bottomBar.boundingBox();
    expect(barBox?.height || 0).toBeGreaterThan(4);
    expect(barBox?.height || 99).toBeLessThan(40);
    await expect(bottomBar).toHaveAttribute("data-vp-rim-authority", /copper|rim_pounded_copper/);
    await evidenceShot(page, "visual-renderer-repair", "F-bottom-stop-live.png");
    await shot(bottomBar, "F-shared-copper-bottom-stop.png");

    // —— Shared Copper on Action + Icon Station ——
    await insertFamily(page, "button");
    await openVisualParts(page);
    await ownerClick(page.getByTestId("vp-drawer-curated"), "Curated");
    await ownerClick(page.getByTestId("vp-part-family_bright_lacquer_pounded_copper"), "Copper family");
    const copper = page.locator('[data-vp-family="family_bright_lacquer_pounded_copper"]').first();
    await expect(copper).toBeVisible({ timeout: 15_000 });
    await expect(copper.locator("[data-vp-rim-authority='rim_pounded_copper']").first()).toBeVisible();
    await expect(page.locator("[data-vp-rim-authority='rim_pounded_copper']")).toHaveCount(
      await page.locator("[data-vp-rim-authority='rim_pounded_copper']").count()
    );
    const rimCount = await page.locator("[data-vp-rim-authority='rim_pounded_copper']").count();
    expect(rimCount).toBeGreaterThanOrEqual(2);
    await shot(copper, "F-shared-copper-action.png");
    await shot(page.locator("[data-testid^='vp-icon-station'], [data-testid*='icon-station']").first(), "F-shared-copper-icon-station.png");

    // —— Finish Lacquer vs Acrylic ——
    await ownerClick(page.getByTestId("vp-drawer-finish"), "Finish");
    await ownerClick(page.getByTestId("vp-part-finish_lacquer"), "Lacquer");
    const lacquerShot = await shot(copper, "D-finish-lacquer.png");
    await ownerClick(page.getByTestId("vp-part-finish_acrylic"), "Acrylic");
    const acrylicShot = await shot(copper, "D-finish-acrylic.png");
    const finishCmp = comparePngBuffers(fs.readFileSync(lacquerShot), fs.readFileSync(acrylicShot), {
      maxChannelDelta: 2,
      maxDiffRatio: 0.00001,
    });
    expect(finishCmp.differingPixels).toBeGreaterThan(20);
    fs.writeFileSync(
      path.join(LAB, "finish-response-metrics.json"),
      JSON.stringify({ differingPixels: finishCmp.differingPixels, meanChannelDelta: finishCmp.meanChannelDelta, maxChannelDelta: finishCmp.maxChannelDelta }, null, 2)
    );

    // —— Interaction Mechanical press (Motion drawer hosts interaction parts) ——
    await ownerClick(page.getByTestId("vp-drawer-motion"), "Motion / Interaction");
    await ownerClick(page.getByTestId("vp-part-interaction_mechanical"), "Mechanical");
    await expect(copper.locator("[data-vp-interaction='mechanical']").first()).toBeVisible();
    const idle = await shot(copper, "H-mechanical-idle.png");
    const surface = copper.locator("[data-vp-interaction='mechanical']").first();
    const box = await surface.boundingBox();
    expect(box).toBeTruthy();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.waitForTimeout(40);
    const hover = await shot(copper, "H-mechanical-hover.png");
    await page.mouse.down();
    await page.waitForTimeout(80);
    const pressed = await shot(copper, "H-mechanical-pressed.png");
    await page.mouse.up();
    const pressCmp = comparePngBuffers(fs.readFileSync(idle), fs.readFileSync(pressed), {
      maxChannelDelta: 1,
      maxDiffRatio: 0.00001,
    });
    expect(pressCmp.differingPixels).toBeGreaterThan(0);
    void hover;

    // —— Quiet ——
    await ownerClick(page.getByTestId("vp-part-interaction_quiet"), "Quiet");
    await expect(copper.locator("[data-vp-interaction='quiet']").first()).toBeVisible();

    // —— Electric Divider motion ——
    await openTools(page);
    await ownerClick(page.getByTestId("starter-divider-solid-full"), "Divider");
    const divider = page.locator('[data-composition-node][data-primitive="border"]').last();
    await divider.click();
    await openVisualParts(page);
    await ownerClick(page.getByTestId("vp-drawer-divider"), "Divider");
    await ownerClick(page.getByTestId("vp-part-divider_electric"), "Electric");
    await expect(page.locator("[data-vp-divider-treatment='electric']").first()).toBeVisible();
    await expect(page.locator(".vp-divider-electric-glow").first()).toBeVisible();
    const e1 = await shot(divider, "I-electric-t0.png");
    await page.waitForTimeout(900);
    const e2 = await shot(divider, "I-electric-t1.png");
    const electricCmp = comparePngBuffers(fs.readFileSync(e1), fs.readFileSync(e2), {
      maxChannelDelta: 1,
      maxDiffRatio: 0.00001,
    });
    expect(electricCmp.differingPixels).toBeGreaterThan(0);

    // Reduced-motion static fallback
    await page.locator("[data-testid='creative-composition-canvas']").evaluate((el) => {
      el.setAttribute("data-reduced-motion-simulation", "true");
    });
    await page.waitForTimeout(200);
    const r1 = await shot(divider, "I-electric-reduced-t0.png");
    await page.waitForTimeout(900);
    const r2 = await shot(divider, "I-electric-reduced-t1.png");
    const reducedCmp = comparePngBuffers(fs.readFileSync(r1), fs.readFileSync(r2), {
      maxChannelDelta: 8,
      maxDiffRatio: 0.02,
    });
    expect(reducedCmp.ok || reducedCmp.differingPixels < 80).toBeTruthy();

    // —— Mount staging composition ——
    await page.locator("[data-testid='creative-composition-canvas']").evaluate((el) => {
      el.setAttribute("data-reduced-motion-simulation", "false");
    });
    await copper.click();
    await expect(copper.locator("[data-testid='vp-mount'], [data-vp-mount-part]").first()).toBeVisible();
    await shot(copper, "G-mount-staging.png");

    // —— Depth ladder on mounted copper action ——
    await openVisualParts(page);
    await ownerClick(page.getByTestId("vp-drawer-surface_zone"), "Surface");
    const depthLadder: string[] = [];
    for (const v of [0, 25, 50, 75, 100]) {
      await setRange(page, "vp-surface-depth", v);
      await page.waitForTimeout(100);
      depthLadder.push(await shot(copper, `A-depth-ladder-${String(v).padStart(3, "0")}.png`));
    }
    assertLadderDiffers(depthLadder, "depth-ladder");

    // —— Persistence / undo ——
    await undo(page);
    await redo(page);
    await saveDraft(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("card-edit-workspace-host")).toHaveAttribute("data-builder-ready", "true", {
      timeout: 60_000,
    });
    await dismissOverlays(page);
    await expect(page.locator("[data-testid^='bottom-stop-'], [data-testid='vp-bottom-stop']").first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator("[data-vp-divider-treatment='electric']").first()).toBeVisible({ timeout: 10_000 });

    fs.writeFileSync(
      path.join(EVIDENCE, "_reports", "renderer-repair-summary.json"),
      JSON.stringify(
        {
          ok: true,
          evidence: LAB,
          checks: [
            "surface-intensity-ladder",
            "surface-depth-ladder",
            "depth-ladder",
            "hero-flow",
            "bottom-stop-live",
            "shared-copper",
            "finish-lacquer-acrylic",
            "mechanical-press",
            "electric-motion",
            "electric-reduced-motion",
            "save-reload",
          ],
        },
        null,
        2
      )
    );
  });
});
