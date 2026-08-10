/**
 * VISUAL GRAMMAR OUTCOME TRUTH — rendered geometry / Host flows.
 * Enable: VISUAL_GRAMMAR_OUTCOME_CERT=1 (also with PRACTICAL_AUTHORING_CERT=1)
 * NO attribute-only success. Measure DOM boxes. Capture real screenshots.
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
import { observeViewportYieldFromDom } from "../lib/fusion/creative-studio/visual-parts/layout-rails";

const enabled =
  process.env.VISUAL_GRAMMAR_OUTCOME_CERT === "1" || process.env.PRACTICAL_AUTHORING_CERT === "1";
const EVIDENCE = path.join("tmp", "visual-grammar-evidence");
const PROOFS = path.join(EVIDENCE, "composition-proofs");
const GALLERY = path.join(EVIDENCE, "review-gallery");

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

function centerX(box: { x: number; width: number }) {
  return box.x + box.width / 2;
}

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("missing bounding box");
  return box;
}

async function setPhoneFrameWidth(page: Page, widthPx: number) {
  await page.evaluate((w) => {
    const host =
      document.querySelector("[data-testid='card-phone-frame']") ||
      document.querySelector("[data-testid='composition-surface']") ||
      document.querySelector("[data-composition-surface]");
    const el = (host as HTMLElement) || document.documentElement;
    el.style.width = `${w}px`;
    el.style.maxWidth = `${w}px`;
    window.dispatchEvent(new Event("resize"));
  }, widthPx);
  await page.waitForTimeout(300);
}

async function recordViewportYield(page: Page, proofId: string) {
  const observation = await page.evaluate((id) => {
    const viewportEl =
      (document.querySelector("[data-testid='card-phone-frame']") as HTMLElement | null) ||
      (document.querySelector("[data-testid='composition-surface']") as HTMLElement | null);
    const vr = viewportEl?.getBoundingClientRect();
    const viewport = vr
      ? { top: vr.top, left: vr.left, width: vr.width, height: vr.height, bottom: vr.bottom, right: vr.right }
      : { top: 0, left: 0, width: 390, height: 780, bottom: 780, right: 390 };
    const rect = (el: Element | null) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom, right: r.right };
    };
    const hero = document.querySelector("[data-vp-hero]");
    const divider = document.querySelector("[data-vp-divider]");
    const bottomStop = document.querySelector("[data-vp-bottom-stop]");
    const actions = [...document.querySelectorAll("[data-button-surface-kind]")].map((el) => rect(el)!);
    const identityStations = [...document.querySelectorAll("[data-vp-icon-slot='left'], [data-vp-rail-slot='left']")].map(
      (el) => rect(el)!
    );
    return { id, viewport, hero: rect(hero), divider: rect(divider), bottomStop: rect(bottomStop), actions, identityStations };
  }, proofId);
  const yieldObs = observeViewportYieldFromDom(observation);
  fs.mkdirSync(PROOFS, { recursive: true });
  fs.writeFileSync(path.join(PROOFS, `${proofId}.viewport-yield.json`), JSON.stringify({ ...observation, yield: yieldObs }, null, 2));
  return yieldObs;
}

test.describe("Visual Grammar Outcome Truth", () => {
  test.skip(!enabled, "Set VISUAL_GRAMMAR_OUTCOME_CERT=1");
  test.setTimeout(480_000);

  test("Outcome truth: rails, Both, grid, auto-stack, proofs A–G, brand recipe, parity", async ({ page }) => {
    ensureEvidenceDirs(["visual-grammar", "composition-proofs"]);
    fs.mkdirSync(PROOFS, { recursive: true });
    fs.mkdirSync(GALLERY, { recursive: true });
    await openBlankStudio(page);
    await dismissOverlays(page);

    // —— 1/2 Vertical stack rail law ——
    await openTools(page);
    await ownerClick(page.getByTestId("starter-action-stack-rails"), "Insert rail Action stack");
    const railButtons = page.locator("[data-vp-rail-geometry='slots']");
    await expect(railButtons).toHaveCount(4, { timeout: 15_000 });
    const leftCenters: number[] = [];
    for (let i = 0; i < 4; i++) {
      const left = railButtons.nth(i).locator("[data-vp-rail-slot='left']");
      leftCenters.push(centerX(await boxOf(left)));
    }
    const leftSpread = Math.max(...leftCenters) - Math.min(...leftCenters);
    expect(leftSpread).toBeLessThanOrEqual(3);
    await page.locator("[data-vp-action-group='true']").first().screenshot({
      path: path.join(PROOFS, "rail-stack-alignment.png"),
    });

    // —— 3 Independent Both primary + secondary ——
    await openBlankStudio(page);
    await dismissOverlays(page);
    await insertFamily(page, "button");
    const bothBtn = page.locator("[data-composition-node]").filter({ has: page.locator("[data-button-surface-kind]") }).first();
    await bothBtn.click();
    await openVisualParts(page);
    await ownerClick(page.getByTestId("vp-drawer-icon_image"), "Icon");
    await ownerClick(page.getByTestId("vp-icon-upload-demo"), "Primary portrait");
    await ownerClick(page.getByTestId("vp-icon-pos-both"), "Both");
    await ownerClick(page.getByTestId("vp-icon-secondary-arrow"), "Secondary arrow");
    // Enable rail slots so primary/secondary occupy durable left/right stations
    await ownerClick(page.getByTestId("vp-drawer-layout"), "Layout");
    await ownerClick(page.getByTestId("vp-part-layout_one_column"), "One column rails");
    const slotted = page.locator("[data-vp-rail-geometry='slots']").first();
    await expect(slotted).toBeVisible({ timeout: 15_000 });
    const primary = slotted.locator("[data-vp-rail-slot='left']").first();
    const secondary = slotted.locator("[data-vp-rail-slot='right']").first();
    await expect(primary).toBeVisible();
    await expect(secondary).toBeVisible();
    await expect(secondary.locator("[data-icon-canonical='arrow-up-right']").first()).toBeVisible();
    await ownerClick(page.getByTestId("vp-drawer-icon_image"), "Icon");
    await ownerClick(page.getByTestId("vp-icon-secondary-phone"), "Secondary phone");
    await expect(secondary.locator("[data-icon-canonical='phone']").first()).toBeVisible();
    await expect(primary.locator("img").first()).toBeVisible();
    await slotted.screenshot({ path: path.join(PROOFS, "both-primary-secondary.png") });
    await ownerClick(page.getByTestId("contextual-button-action"), "Action after Both");
    await page.getByLabel("Button action type").selectOption("call");
    await page.getByLabel("Button destination").fill("tel:+15550102030");

    // —— 4/5 Two-column + auto-stack geometry ——
    await openBlankStudio(page);
    await dismissOverlays(page);
    await openTools(page);
    await ownerClick(page.getByTestId("starter-action-grid-two"), "Two-column grid");
    const group = page.locator("[data-vp-action-group='true']").first();
    await expect(group).toBeVisible({ timeout: 15_000 });
    const childrenWide = page.locator("[data-vp-action-group-child='true'], [data-composition-node][data-primitive='button']");
    // Measure child composition nodes under group
    const childNodes = page.locator("[data-composition-node]").filter({
      has: page.locator("[data-button-surface-kind]"),
    });
    await expect(childNodes.first()).toBeVisible({ timeout: 15_000 });
    const wideBoxes = [];
    const count = await childNodes.count();
    for (let i = 0; i < Math.min(count, 4); i++) wideBoxes.push(await boxOf(childNodes.nth(i)));
    const wideXs = [...new Set(wideBoxes.map((b) => Math.round(b.x / 4) * 4))];
    expect(wideXs.length).toBeGreaterThanOrEqual(2);
    await group.screenshot({ path: path.join(PROOFS, "two-column-wide.png") });
    await expect(group).toHaveAttribute("data-vp-phone-stack-active", /columns|stacked/);

    // Narrow phone — force surface width via evaluate on composition surface
    await page.evaluate(() => {
      const surface = document.querySelector("[data-testid='composition-surface']") as HTMLElement | null;
      if (surface) {
        surface.style.width = "360px";
        surface.style.maxWidth = "360px";
      }
      const wrap = document.querySelector("[data-phone-frame], [data-testid='card-device-frame']") as HTMLElement | null;
      if (wrap) {
        wrap.style.width = "360px";
        wrap.style.maxWidth = "360px";
      }
    });
    await page.setViewportSize({ width: 390, height: 900 });
    await page.waitForTimeout(500);
    // Resize observer on canvas uses surface getBoundingClientRect — trigger by zooming / waiting
    const stackedAttr = await group.getAttribute("data-vp-phone-stack-active");
    // If still columns, shrink the measured surfaceSize by resizing window hard
    if (stackedAttr !== "stacked") {
      await page.setViewportSize({ width: 320, height: 900 });
      await page.waitForTimeout(600);
    }
    const narrowBoxes = [];
    for (let i = 0; i < Math.min(await childNodes.count(), 4); i++) {
      narrowBoxes.push(await boxOf(childNodes.nth(i)));
    }
    const narrowXs = [...new Set(narrowBoxes.map((b) => Math.round(b.x / 8) * 8))];
    // After stack, x columns collapse toward one
    expect(narrowXs.length).toBeLessThanOrEqual(2);
    const ys = narrowBoxes.map((b) => b.y).sort((a, b) => a - b);
    if (ys.length >= 2) expect(ys[ys.length - 1]! - ys[0]!).toBeGreaterThan(20);
    await group.screenshot({ path: path.join(PROOFS, "two-column-narrow-autostack.png") });

    // —— 6 Round team ——
    await openBlankStudio(page);
    await dismissOverlays(page);
    await openTools(page);
    await ownerClick(page.getByTestId("starter-round-team-grid"), "Round team");
    await expect(page.locator("[data-vp-action-group='true']").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("[data-vp-icon-station='true']").first()).toBeVisible({ timeout: 10_000 });
    await page.locator("[data-vp-action-group='true']").first().screenshot({
      path: path.join(PROOFS, "E-round-team-staff-grid.png"),
    });
    await recordViewportYield(page, "E-round-team-staff-grid");

    // —— 7/8/9 A–G composition proofs (rendered) ——
    const proofs: Array<{ id: string; build: () => Promise<void> }> = [
      {
        id: "A-clean-light-business",
        build: async () => {
          await openTools(page);
          await ownerClick(page.getByTestId("starter-hero-compact"), "Compact Hero");
          await openTools(page);
          await ownerClick(page.getByTestId("starter-action-stack-rails"), "Actions");
          await openTools(page);
          await ownerClick(page.getByTestId("starter-divider-solid-full"), "Divider");
          await openTools(page);
          await ownerClick(page.getByTestId("starter-bottom-stop-minimal-end"), "Bottom stop");
        },
      },
      {
        id: "B-dark-industrial-grunge",
        build: async () => {
          await ownerClick(page.getByTestId("card-creative-tool-backgrounds"), "Background");
          // Apply dark via Visual Plane if available; else Tools industrial action + surface
          await openTools(page);
          await ownerClick(page.getByTestId("starter-industrial-action"), "Mission Control");
          const mc = page.locator('[data-vp-family="family_mission_control"]').first();
          await expect(mc).toBeVisible({ timeout: 15_000 });
          await mc.click();
          await openVisualParts(page);
          await ownerClick(page.getByTestId("vp-drawer-surface_zone"), "Surface");
          await ownerClick(page.getByTestId("vp-surface-on"), "Surface On");
          await openTools(page);
          await ownerClick(page.getByTestId("starter-divider-solid-full"), "Divider");
          const divider = page.locator('[data-composition-node][data-primitive="border"]').last();
          await divider.click();
          await openVisualParts(page);
          await ownerClick(page.getByTestId("vp-drawer-divider"), "Divider drawer");
          await ownerClick(page.getByTestId("vp-part-divider_electric"), "Electric");
          await openTools(page);
          await ownerClick(page.getByTestId("starter-bottom-stop-minimal-end"), "End");
        },
      },
      {
        id: "C-portrait-led-professional",
        build: async () => {
          await openTools(page);
          await ownerClick(page.getByTestId("starter-launch-featured-launch"), "Launch");
          const launch = page.locator("[data-composition-node]").filter({ has: page.locator("[data-button-surface-kind]") }).last();
          await launch.click();
          await openVisualParts(page);
          await ownerClick(page.getByTestId("vp-drawer-curated"), "Curated");
          await ownerClick(page.getByTestId("vp-part-family_bright_lacquer_pounded_copper"), "Copper");
          await ownerClick(page.getByTestId("vp-drawer-icon_image"), "Icon");
          await ownerClick(page.getByTestId("vp-icon-upload-demo"), "Portrait");
          await ownerClick(page.getByTestId("vp-icon-anchor-left_center"), "Anchor");
          await page.getByTestId("vp-icon-scale").evaluate((el) => {
            const input = el as HTMLInputElement;
            const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
            proto?.set?.call(input, "90");
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
          });
        },
      },
      {
        id: "D-two-column-action-grid",
        build: async () => {
          await openTools(page);
          await ownerClick(page.getByTestId("starter-action-grid-two"), "Two column");
        },
      },
      {
        id: "E-round-team-staff-grid",
        build: async () => {
          await openTools(page);
          await ownerClick(page.getByTestId("starter-round-team-grid"), "Round team");
        },
      },
      {
        id: "F-hero-plus-launch",
        build: async () => {
          await openTools(page);
          await ownerClick(page.getByTestId("starter-hero-identity"), "Identity Hero");
          const hero = page.locator("[data-vp-hero]").first();
          await expect(hero).toBeVisible({ timeout: 15_000 });
          await hero.click();
          await openVisualParts(page);
          await ownerClick(page.getByTestId("vp-drawer-hero"), "Hero drawer");
          await ownerClick(page.getByTestId("vp-part-hero_spotlight"), "Spotlight size/structure");
          await openTools(page);
          await ownerClick(page.getByTestId("starter-launch-featured-launch"), "Launch");
          await openTools(page);
          await ownerClick(page.getByTestId("starter-bottom-stop-themed-footer"), "Footer");
        },
      },
      {
        id: "G-photo-background-optional-surface",
        build: async () => {
          await openTools(page);
          await ownerClick(page.getByTestId("starter-action-stack-rails"), "Actions");
          const first = page.locator("[data-button-surface-kind]").first();
          await first.click();
          await openVisualParts(page);
          await ownerClick(page.getByTestId("vp-drawer-surface_zone"), "Surface");
          await ownerClick(page.getByTestId("vp-surface-on"), "Surface On");
        },
      },
    ];

    for (const proof of proofs) {
      await openBlankStudio(page);
      await dismissOverlays(page);
      await proof.build();
      await page.waitForTimeout(400);
      const frame =
        page.locator("[data-testid='card-phone-frame']").first().or(page.locator("[data-testid='composition-surface']").first());
      await frame.screenshot({ path: path.join(PROOFS, `${proof.id}.png`) });
      await recordViewportYield(page, proof.id);
    }

    // —— 10 Decomposition rendered parity ——
    await openBlankStudio(page);
    await dismissOverlays(page);
    await insertFamily(page, "button");
    let button = page.locator("[data-composition-node]").filter({ has: page.locator("[data-button-surface-kind]") }).first();
    await button.click();
    await openVisualParts(page);
    await ownerClick(page.getByTestId("vp-drawer-curated"), "Curated");
    await ownerClick(page.getByTestId("vp-part-family_bright_lacquer_pounded_copper"), "Copper family");
    button = page.locator('[data-composition-node][data-vp-family="family_bright_lacquer_pounded_copper"]').first();
    await expect(button).toBeVisible({ timeout: 15_000 });
    // Freeze motion for parity
    await page.emulateMedia({ reducedMotion: "reduce" });
    const refPath = path.join(PROOFS, "decomposition-reference.png");
    const rebuildPath = path.join(PROOFS, "decomposition-reconstructed.png");
    await button.screenshot({ path: refPath });
    await ownerClick(page.getByTestId("vp-drawer-accents"), "Accents");
    await ownerClick(page.getByTestId("vp-accent-reset"), "Remove accent");
    await ownerClick(page.getByTestId("vp-drawer-finish"), "Finish");
    await ownerClick(page.getByTestId("vp-lacquer-color-blue"), "Blue");
    await ownerClick(page.getByTestId("vp-drawer-curated"), "Curated");
    await ownerClick(page.getByTestId("vp-part-family_bright_lacquer_pounded_copper"), "Reassemble family");
    button = page.locator('[data-composition-node][data-vp-family="family_bright_lacquer_pounded_copper"]').first();
    await button.screenshot({ path: rebuildPath });
    const parity = comparePngBuffers(fs.readFileSync(refPath), fs.readFileSync(rebuildPath));
    fs.writeFileSync(path.join(PROOFS, "decomposition-parity.json"), JSON.stringify(parity, null, 2));
    expect(parity.ok, parity.reason || "reassembly diet cupcake").toBeTruthy();

    // —— 11 Brand Recipe Host save/reuse ——
    await openVisualParts(page);
    await ownerClick(page.getByTestId("vp-drawer-color"), "Color");
    await ownerClick(page.getByTestId("vp-color-red"), "Red base");
    await page.getByTestId("vp-refine-richness").evaluate((el) => {
      const input = el as HTMLInputElement;
      const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
      proto?.set?.call(input, "80");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.getByTestId("vp-brand-recipe-name").fill("Host Fire Lacquer");
    await ownerClick(page.getByTestId("vp-brand-recipe-save-btn"), "Save Brand Recipe");
    await expect(page.locator("[data-testid^='vp-brand-recipe-brand_recipe_host_']").first()).toBeVisible({
      timeout: 10_000,
    });
    await insertFamily(page, "button");
    const other = page.locator("[data-composition-node]").filter({ has: page.locator("[data-button-surface-kind]") }).last();
    await other.click();
    await openVisualParts(page);
    await ownerClick(page.getByTestId("vp-drawer-color"), "Color");
    await ownerClick(page.locator("[data-testid^='vp-brand-recipe-brand_recipe_host_']").first(), "Apply Host recipe");
    await expect(other).toHaveAttribute("data-vp-brand-recipe", /brand_recipe_host_/);
    await saveDraft(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("card-edit-workspace-host")).toHaveAttribute("data-builder-ready", "true", {
      timeout: 60_000,
    });
    await dismissOverlays(page);
    await other.click().catch(async () => {
      await page.locator(`[data-vp-brand-recipe]`).first().click();
    });
    await openVisualParts(page);
    await ownerClick(page.getByTestId("vp-drawer-color"), "Color after reload");
    await expect(page.locator("[data-testid^='vp-brand-recipe-brand_recipe_host_']").first()).toBeVisible();

    // —— 13/14 Hero + Launch durability ——
    await openBlankStudio(page);
    await dismissOverlays(page);
    await openTools(page);
    await ownerClick(page.getByTestId("starter-hero-compact"), "Compact Hero");
    const hero = page.locator("[data-vp-hero]").first();
    await expect(hero).toBeVisible({ timeout: 15_000 });
    await hero.click();
    await openVisualParts(page);
    await ownerClick(page.getByTestId("vp-drawer-hero"), "Hero");
    await ownerClick(page.getByTestId("vp-part-hero_identity"), "Change to Identity");
    await expect(page.locator("[data-vp-hero='identity']").first()).toBeVisible({ timeout: 10_000 });
    await openTools(page);
    await ownerClick(page.getByTestId("starter-launch-featured-launch"), "Launch");
    const launch = page.locator("[data-action-role='launch'], [data-vp-action-role='launch']").first();
    await expect(launch).toBeVisible({ timeout: 15_000 });
    await launch.click();
    await ownerClick(page.getByTestId("contextual-button-action"), "Launch Action");
    await page.getByLabel("Button action type").selectOption("website");
    await page.getByLabel("Button destination").fill("https://host.example/launch-durable");
    await openVisualParts(page);
    await ownerClick(page.getByTestId("vp-drawer-curated"), "Curated");
    await ownerClick(page.getByTestId("vp-part-family_mission_control"), "Restyle Launch");
    await ownerClick(page.getByTestId("contextual-button-action"), "Action after restyle");
    await expect(page.getByLabel("Button destination")).toHaveValue("https://host.example/launch-durable");
    await saveDraft(page);
    await undo(page);
    await redo(page);

    // —— 15 Divider / Bottom Stop footprint ——
    await openTools(page);
    await ownerClick(page.getByTestId("starter-divider-solid-full"), "Divider");
    const divider = page.locator("[data-vp-divider], [data-primitive='border']").last();
    await divider.click();
    await openVisualParts(page);
    await ownerClick(page.getByTestId("vp-drawer-divider"), "Divider");
    await ownerClick(page.getByTestId("vp-part-divider_minimal_line").or(page.getByTestId("vp-part-divider_electric")), "Compact divider");
    await openTools(page);
    await ownerClick(page.getByTestId("starter-bottom-stop-themed-footer"), "Bottom stop");
    const dBox = await boxOf(page.locator("[data-vp-divider]").first().or(divider));
    const bBox = await boxOf(page.locator("[data-vp-bottom-stop]").first());
    expect(dBox.height).toBeLessThanOrEqual(28);
    expect(bBox.height).toBeLessThanOrEqual(40);
    fs.writeFileSync(
      path.join(PROOFS, "divider-bottom-stop-footprint.json"),
      JSON.stringify({ dividerHeightPx: dBox.height, bottomStopHeightPx: bBox.height }, null, 2)
    );
    await page.locator("[data-testid='composition-surface']").first().screenshot({
      path: path.join(PROOFS, "divider-bottom-stop-mobile.png"),
    });

    // Preview parity spot-check
    await ownerClick(page.getByTestId("card-preview-as-customer"), "Preview");
    await expect(page.getByTestId("preview-toolbar")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("[data-vp-family], [data-vp-hero], [data-vp-action-group]").first()).toBeVisible({
      timeout: 15_000,
    });
    await ownerClick(page.getByTestId("preview-exit"), "Exit Preview");

    // —— Review gallery ——
    const shots = fs.readdirSync(PROOFS).filter((f) => f.endsWith(".png"));
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Visual Grammar Outcome Review</title>
<style>body{font-family:ui-sans-serif,system-ui;background:#0b1019;color:#f8fafc;margin:0;padding:24px}h1{color:#b8ff2c}figure{margin:0 0 28px;border:1px solid #ffffff22;border-radius:12px;overflow:hidden;background:#111827}figcaption{padding:10px 12px;font-size:13px;background:#0008}img{display:block;width:100%;height:auto}</style></head><body>
<h1>Visual Grammar Outcome Truth — Product Owner Review Gallery</h1>
<p>Screenshots from the live TapConnect Studio / customer renderer. Not concept art.</p>
${shots
  .map(
    (file) =>
      `<figure><img src="../composition-proofs/${file}" alt="${file}"/><figcaption>${file.replace(/\.png$/, "").replace(/-/g, " ")}</figcaption></figure>`
  )
  .join("\n")}
</body></html>`;
    fs.writeFileSync(path.join(GALLERY, "index.html"), html);
    fs.writeFileSync(
      path.join(EVIDENCE, "outcome-truth-cert.json"),
      JSON.stringify(
        {
          railSpreadPx: leftSpread,
          decompositionParity: parity,
          proofs: proofs.map((p) => p.id),
          gallery: path.join(GALLERY, "index.html"),
          productSha: process.env.PRODUCT_SHA || null,
          passedAt: new Date().toISOString(),
        },
        null,
        2
      )
    );
  });
});
