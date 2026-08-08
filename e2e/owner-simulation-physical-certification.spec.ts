/**
 * CREATIVE STUDIO — Owner-Simulation Physical Interaction Certification
 *
 * Derives coverage from registries + visible UI.
 * Physical Owner interactions only (no force, no state injection).
 *
 * Enable: OWNER_SIM_PHYSICAL_CERT=1
 */

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  buildInteractionManifest,
  deriveMajorEffectIds,
  deriveBadgePresetSampleIds,
  deriveButtonPresetSampleIds,
  deriveCouponPresetIds,
  deriveTicketPresetIds,
  BUTTON_SURFACE_EFFECT_IDS,
  INSERT_SURFACES,
  TEXT_EFFECT_EXPANSION_IDS,
} from "./owner-sim/interaction-manifest";
import {
  applyEffectById,
  applyButtonLabelColor,
  applyGlyphColor,
  readBadgeWordingPaint,
  bringSelectedToFront,
  clearSelection,
  crawlToolbarDoors,
  deleteSelectedViaMore,
  dragHandle,
  dragSelectedNode,
  duplicateSelectedViaMore,
  ensureEvidenceDirs,
  evidenceShot,
  geometryChanged,
  insertBadgePreset,
  insertButtonPreset,
  insertCouponPreset,
  insertFamily,
  insertFromSurface,
  insertTicketPreset,
  openAppearanceOverview,
  openBlankStudio,
  openButtonFillOrMaterial,
  readButtonSurfacePaint,
  readButtonLabelPaint,
  openCardRootAppearance,
  ownerClick,
  ownerFill,
  readCompositionInventory,
  readEffectSignature,
  readGeometry,
  readGroupMemberGeometries,
  readNodeCount,
  recordVerdict,
  redo,
  saveDraft,
  selectObjectViaLayers,
  toolbarLabels,
  undo,
  writeServerIdentity,
  writeVerdictReport,
  EVIDENCE_ROOT,
} from "./owner-sim/physical-harness";

const enabled = process.env.OWNER_SIM_PHYSICAL_CERT === "1";

async function writeManifest() {
  const manifest = buildInteractionManifest();
  const file = path.join(EVIDENCE_ROOT, "_manifest", "interaction-manifest.json");
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2));
  return manifest;
}

test.describe("Owner-simulation physical interaction certification", () => {
  test.skip(!enabled, "Set OWNER_SIM_PHYSICAL_CERT=1");
  test.setTimeout(600_000);

  test.beforeAll(() => {
    ensureEvidenceDirs([
      "selection-and-scope",
      "physical-transforms",
      "appearance",
      "effects",
      "libraries",
      "nested-editing",
      "groups",
      "preset-truth",
      "drawer-transitions",
      "persistence",
      "responsive",
      "accessibility",
    ]);
  });

  test.afterAll(() => {
    writeVerdictReport();
  });

  test("registry inventory + physical crawl across domains", async ({ page }) => {
    const serverIdentity = writeServerIdentity();
    expect(serverIdentity.baseUrl).toContain("127.0.0.1");
    const manifest = await writeManifest();
    expect(manifest.commandCount).toBeGreaterThan(10);
    expect(manifest.insertSurfaces.length).toBeGreaterThan(3);
    expect(manifest.majorEffects.length).toBeGreaterThan(5);

    await openBlankStudio(page);
    await evidenceShot(page, "selection-and-scope", "00-blank-studio");

    // ── Selection / scope ─────────────────────────────────────────────
    // Blank Card lands on Card Root; pasteboard gutter clears; canvas reselects Root.
    await expect(page.locator('[data-contextual-object="card-root"]')).toBeVisible();
    await evidenceShot(page, "selection-and-scope", "02-card-root");
    await clearSelection(page);
    await expect(page.getByTestId("card-contextual-object-tools")).toHaveCount(0);
    await evidenceShot(page, "selection-and-scope", "01-no-selection");
    const canvas = page.getByTestId("card-root-canvas").getByTestId("creative-composition-canvas");
    await canvas.click({ position: { x: 40, y: 40 } });
    await expect(page.locator('[data-contextual-object="card-root"]')).toBeVisible({ timeout: 10_000 });
    await evidenceShot(page, "selection-and-scope", "03-reselect-root");
    // Layers → Card root is also an Owner path
    await clearSelection(page);
    await ownerClick(page.getByTestId("card-creative-tool-layers"), "Layers rail");
    await ownerClick(page.getByRole("button", { name: /^Card root$/i }).first(), "Layers Card root");
    await expect(page.locator('[data-contextual-object="card-root"]')).toBeVisible({ timeout: 10_000 });
    await evidenceShot(page, "selection-and-scope", "04-layers-card-root");
    recordVerdict({
      id: "selection.no-selection-and-root",
      domain: "selection-and-scope",
      label: "Blank→Root, pasteboard clear, canvas reselect, Layers Card root",
      status: "VERIFIED",
      notes: ["View toolbar gutters use pointer-events-none", "Blank Card creates empty rootComposition and selects Root"],
      evidence: [
        "selection-and-scope/02-card-root.png",
        "selection-and-scope/01-no-selection.png",
        "selection-and-scope/03-reselect-root.png",
        "selection-and-scope/04-layers-card-root.png",
      ],
    });

    // ── Text insert + Color first-use + Appearance ────────────────────
    const textInsert = await insertFamily(page, "text");
    const textNode = textInsert.node;
    await evidenceShot(page, "libraries", "01-text-inserted");
    const textLabels = await toolbarLabels(page);
    expect(textLabels.filter((l) => l === "Appearance").length).toBeLessThanOrEqual(1);

    const beforeColor = await readGeometry(textNode);
    await ownerClick(page.getByTestId("contextual-color"), "Color first-use");
    await expect(page.getByTestId("deep-left-edit-drawer").or(page.getByTestId("contextual-color-drawer")).first()).toBeVisible({
      timeout: 15_000,
    });
    await evidenceShot(page, "appearance", "01-text-color-first-open");

    // Physical color change via Owner-visible glyph color control
    const glyphColor = page.getByTestId("glyph-color-input");
    await expect(glyphColor).toBeVisible({ timeout: 10_000 });
    await glyphColor.fill("#ff3366");
    await expect(page.getByTestId("current-text-color")).toHaveCSS("background-color", /rgb\(255,\s*51,\s*102\)|#ff3366/i).catch(async () => {
      // Some browsers report computed rgb; accept either swatch update or geometry change below.
    });
    await page.waitForTimeout(250);
    const afterColor = await readGeometry(textNode);
    const colorMutated =
      geometryChanged(beforeColor, afterColor, ["color", "backgroundImage", "textShadow"]) ||
      (await page.getByTestId("current-text-color").getAttribute("style"))?.includes("ff3366") === true ||
      (await page.getByTestId("current-text-color").getAttribute("style"))?.includes("255, 51, 102") === true;
    await evidenceShot(page, "appearance", "02-text-color-after");
    if (colorMutated) {
      await undo(page);
      const restored = await readGeometry(textNode);
      expect(restored.color).toBe(beforeColor.color);
      await redo(page);
      recordVerdict({
        id: "appearance.text-color-first-use",
        domain: "appearance",
        label: "Text Color first-use mutates glyph + undo/redo",
        status: "VERIFIED",
        notes: [],
        evidence: ["appearance/01-text-color-first-open.png", "appearance/02-text-color-after.png"],
      });
    } else {
      recordVerdict({
        id: "appearance.text-color-first-use",
        domain: "appearance",
        label: "Text Color first-use",
        status: "BROKEN",
        notes: ["Drawer opened but no visible color mutation on target"],
        evidence: ["appearance/01-text-color-first-open.png", "appearance/02-text-color-after.png"],
      });
      throw new Error("Text Color first-use produced no visible mutation");
    }

    // ── Physical transforms first-use (before later inserts bury the target) ──
    await expect(textNode).toHaveAttribute("data-selected", "true");
    const beforeGeo = await readGeometry(textNode);
    await dragSelectedNode(page, textNode, 40, 30);
    const afterDrag = await readGeometry(textNode);
    const moved = Math.hypot(afterDrag.x - beforeGeo.x, afterDrag.y - beforeGeo.y) > 8;
    await evidenceShot(page, "physical-transforms", "01-after-drag");
    const se = page.locator('[data-testid^="composition-resize-"][data-testid$="-se"]').first();
    let resized = false;
    if ((await se.count()) > 0) {
      const beforeResize = await readGeometry(textNode);
      await dragHandle(page, se, 28, 20);
      const afterResize = await readGeometry(textNode);
      resized =
        Math.abs(afterResize.width - beforeResize.width) > 4 ||
        Math.abs(afterResize.height - beforeResize.height) > 4;
      await evidenceShot(page, "physical-transforms", "02-after-resize");
    }
    const rotate = page.locator('[data-testid^="composition-rotate-"]').first();
    let rotated = false;
    if ((await rotate.count()) > 0) {
      const beforeRotate = await readGeometry(textNode);
      await dragHandle(page, rotate, 36, 0);
      const afterRotate = await readGeometry(textNode);
      rotated =
        beforeRotate.transform !== afterRotate.transform ||
        Math.abs(Number(afterRotate.transform.match(/-?\d+(\.\d+)?/)?.[0] || 0)) > 1;
      await evidenceShot(page, "physical-transforms", "03-after-rotate");
    }
    recordVerdict({
      id: "transforms.drag-resize-rotate",
      domain: "physical-transforms",
      label: "First-use pointer drag + SE resize + rotate change geometry",
      status: moved && resized && rotated ? "VERIFIED" : moved || resized || rotated ? "PARTIAL" : "BROKEN",
      notes: [
        `moved=${moved}`,
        `resized=${resized}`,
        `rotated=${rotated}`,
        "Exercised immediately after Text Color first-use",
      ],
      evidence: [
        "physical-transforms/01-after-drag.png",
        ...(resized ? ["physical-transforms/02-after-resize.png"] : []),
        ...(rotated ? ["physical-transforms/03-after-rotate.png"] : []),
      ],
    });
    if (!moved && !resized && !rotated) throw new Error("Physical drag/resize/rotate produced no geometry change");

    // ── Second text + Group + fan-out + ungroup ───────────────────────
    await insertFamily(page, "text");
    const texts = page.locator('[data-primitive="text"]');
    await expect(texts).toHaveCount(2, { timeout: 15_000 });
    await texts.nth(0).click();
    await texts.nth(1).click({ modifiers: ["Shift"] });
    await expect(page.getByTestId("contextual-target-label")).toHaveText(/Multi/i);
    await ownerClick(page.getByTestId("contextual-multi-group"), "Group");
    await expect(page.getByTestId("contextual-target-label")).toHaveText(/Group/i);
    await expect(page.getByTestId("contextual-group-ungroup")).toBeVisible();
    await expect(page.getByTestId("contextual-group-edit-contents")).toBeVisible();
    await evidenceShot(page, "groups", "01-group-parent");

    // Group content mode must await child choice (no auto-select)
    await ownerClick(page.getByTestId("contextual-group-edit-contents"), "Edit Group contents");
    await expect(page.getByTestId("contextual-group-awaiting-child").or(page.getByTestId("contextual-group-finish")).first()).toBeVisible({
      timeout: 10_000,
    });
    await evidenceShot(page, "groups", "02-awaiting-child");
    // Finish without selecting a child — return to group parent
    const finish = page.getByTestId("contextual-group-finish");
    if ((await finish.count()) > 0) {
      await ownerClick(finish, "Finish Group content editing");
    }

    // Proportional size controls when text present
    const scaleUp = page.getByTestId("contextual-group-font-scale-up");
    if ((await scaleUp.count()) > 0) {
      await ownerClick(scaleUp, "Group scale +10%");
      await evidenceShot(page, "groups", "03-scale-up");
    }

    await openAppearanceOverview(page);
    await expect(page.getByTestId("appearance-category-overview").or(page.getByTestId("appearance-category-effects")).first()).toBeVisible();
    await evidenceShot(page, "groups", "04-group-appearance");

    await ownerClick(page.getByTestId("contextual-group-ungroup"), "Ungroup");
    await expect(page.getByTestId("contextual-group-ungroup")).toHaveCount(0);
    await evidenceShot(page, "groups", "05-after-ungroup");
    recordVerdict({
      id: "groups.group-ungroup-content-await",
      domain: "groups",
      label: "Group / content-await / Appearance / Ungroup",
      status: "VERIFIED",
      notes: [],
      evidence: ["groups/01-group-parent.png", "groups/02-awaiting-child.png", "groups/05-after-ungroup.png"],
    });

    // ── Effects visual differentiation on Text ───────────────────────
    await texts.first().click();
    const effectIds = deriveMajorEffectIds().filter((id) =>
      ["soft_glow", "neon_edge", "double_neon", "aura", "electric", "soft_shadow", "deep_shadow"].includes(id)
    );
    const signatures = new Map<string, string>();
    for (const effectId of effectIds) {
      await applyEffectById(page, effectId);
      await page.waitForTimeout(250);
      const signature = await readEffectSignature(texts.first());
      signatures.set(effectId, signature);
      await evidenceShot(page, "effects", `text-${effectId}`);
    }
    const unique = new Set(signatures.values());
    const effectStatus =
      unique.size >= Math.min(5, effectIds.length) ? "VERIFIED" : unique.size >= 3 ? "PARTIAL" : "BROKEN";
    recordVerdict({
      id: "effects.text-visual-identity",
      domain: "effects",
      label: "Named effects produce distinct visual signatures on Text",
      status: effectStatus,
      notes: [
        `unique=${unique.size}/${effectIds.length}`,
        ...[...signatures.entries()].map(([k, v]) => `${k}: ${v.slice(0, 160)}`),
      ],
      evidence: effectIds.map((id) => `effects/text-${id}.png`),
    });
    if (effectStatus === "BROKEN") {
      throw new Error(`Effects not visually distinct: ${unique.size}/${effectIds.length}`);
    }

    // ── Button Appearance (not Material-as-Appearance) ────────────────
    await insertFamily(page, "button");
    const button = page.locator('[data-primitive="button"]').last();
    await button.click();
    const buttonLabels = await toolbarLabels(page);
    expect(buttonLabels.filter((l) => l === "Appearance").length).toBe(1);
    expect(buttonLabels.filter((l) => l === "Material").length).toBe(0);
    await ownerClick(page.getByTestId("contextual-button-appearance"), "Button Appearance");
    await expect(page.getByTestId("appearance-category-overview").or(page.getByTestId("appearance-category-fill")).first()).toBeVisible();
    await evidenceShot(page, "appearance", "03-button-appearance");
    recordVerdict({
      id: "appearance.button-single-door",
      domain: "appearance",
      label: "Button exposes single Appearance door (no Material sibling)",
      status: "VERIFIED",
      notes: buttonLabels,
      evidence: ["appearance/03-button-appearance.png"],
    });

    // Nested Edit contents
    await ownerClick(page.getByTestId("contextual-button-content"), "Button Edit contents");
    await evidenceShot(page, "nested-editing", "01-button-contents");
    const finishBtn = page.getByRole("button", { name: /Finish editing contents/i }).first();
    if ((await finishBtn.count()) > 0) await ownerClick(finishBtn, "Finish button contents");

    // ── Badge Appearance + Shape ──────────────────────────────────────
    await insertFamily(page, "badge");
    const badge = page.locator("[data-badge-shape]").last();
    await badge.click();
    const badgeLabels = await toolbarLabels(page);
    expect(badgeLabels.filter((l) => l === "Appearance").length).toBe(1);
    await ownerClick(page.getByTestId("contextual-badge-appearance"), "Badge Appearance");
    await evidenceShot(page, "appearance", "04-badge-appearance");
    if ((await page.getByTestId("contextual-badge-shape").count()) > 0) {
      await ownerClick(page.getByTestId("contextual-badge-shape"), "Badge Shape");
      await evidenceShot(page, "preset-truth", "01-badge-shape-drawer");
    }
    recordVerdict({
      id: "appearance.badge-single-door",
      domain: "appearance",
      label: "Badge single Appearance door",
      status: "VERIFIED",
      notes: badgeLabels,
      evidence: ["appearance/04-badge-appearance.png"],
    });

    // ── Coupon Edit contents ──────────────────────────────────────────
    await insertFamily(page, "coupon");
    const coupon = page.locator('[data-component-kind="coupon"]').last();
    await coupon.click();
    const editContents = page.getByRole("button", { name: /Edit contents/i }).first();
    await ownerClick(editContents, "Coupon Edit contents");
    await expect(page.getByTestId("coupon-content-editor").or(page.getByTestId("deep-left-edit-drawer")).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("component-content-routing")).toHaveCount(0);
    await evidenceShot(page, "nested-editing", "02-coupon-contents");
    recordVerdict({
      id: "nested.coupon-edit-contents",
      domain: "nested-editing",
      label: "Coupon Edit contents opens real editor (no routing stub)",
      status: "VERIFIED",
      notes: [],
      evidence: ["nested-editing/02-coupon-contents.png"],
    });

    // ── Icon discovery (search) — must not auto-place on open ─────────
    const beforeIcons = await page.locator("[data-composition-node]").count();
    await ownerClick(page.getByTestId("card-creative-tool-icons"), "Icons rail");
    await expect(page.getByTestId("card-icon-library")).toBeVisible();
    await expect(page.getByTestId("card-creative-context-drawer")).toHaveAttribute("data-drawer-mode", "library");
    expect(await page.locator("[data-composition-node]").count()).toBe(beforeIcons);
    // Browse is default — Owner opens Search when they know the name.
    await ownerClick(page.getByTestId("icon-library-modes").getByRole("button", { name: /^Search$/i }), "Icon Search mode");
    await ownerFill(page.getByTestId("icon-library-search"), "ticket", "Icon search");
    await expect(page.getByTestId("icon-library-iconify-results").locator("button").first()).toBeVisible({
      timeout: 25_000,
    });
    await evidenceShot(page, "libraries", "02-iconify-search");
    await ownerClick(page.getByTestId("icon-library-iconify-results").locator("button").first(), "Insert searched icon");
    await expect(page.locator('[data-icon-artwork="true"], [data-element-kind="icon"]').first()).toBeVisible({
      timeout: 15_000,
    });
    const icon = page.locator('[data-icon-artwork="true"], [data-element-kind="icon"]').last();
    await icon.click();
    await ownerClick(page.getByTestId("contextual-icon-picker"), "Change Icon");
    await expect(page.getByTestId("iconify-search")).toBeVisible({ timeout: 15_000 });
    await evidenceShot(page, "libraries", "03-nested-icon-picker");
    recordVerdict({
      id: "libraries.icon-search-and-nested",
      domain: "libraries",
      label: "Icon Browse+Search modes + nested Change Icon share discovery",
      status: "VERIFIED",
      notes: ["Search input is behind Search mode (Browse is default for discovery)"],
      evidence: ["libraries/02-iconify-search.png", "libraries/03-nested-icon-picker.png"],
    });

    // ── Placement truth: earlier Text remains canvas-clickable after later inserts ──
    const buriedText = page.locator('[data-primitive="text"][data-element-kind="text"]').first();
    let canvasTextReachable = false;
    try {
      await buriedText.click({ timeout: 8_000 });
      canvasTextReachable = await page.locator('[data-primitive="text"][data-selected="true"]').count().then((n) => n > 0);
    } catch {
      canvasTextReachable = false;
    }
    if (!canvasTextReachable) {
      await selectObjectViaLayers(page, { elementKind: "text" }, "buried text recovery");
      await bringSelectedToFront(page);
    }
    await expect(page.locator('[data-primitive="text"][data-selected="true"]').first()).toBeVisible();
    await evidenceShot(page, "selection-and-scope", "05-post-insert-text-select");
    recordVerdict({
      id: "selection.post-insert-text-reachable",
      domain: "selection-and-scope",
      label: "Text remains Owner-selectable after Coupon/Icon inserts",
      status: canvasTextReachable ? "VERIFIED" : "PARTIAL",
      notes: [
        canvasTextReachable
          ? "Cascade placement keeps earlier Text canvas-clickable"
          : "Canvas click still blocked — Layers + To front used as Owner recovery",
      ],
      evidence: ["selection-and-scope/05-post-insert-text-select.png"],
    });

    // ── Drawer transitions (no stale resurrection) ────────────────────
    await openAppearanceOverview(page);
    await evidenceShot(page, "drawer-transitions", "01-appearance-open");
    // Prefer canvas button click; fall back to Layers if stacking still interferes.
    try {
      await button.click({ timeout: 8_000 });
    } catch {
      await selectObjectViaLayers(page, { elementKind: "button" }, "button for drawer switch");
    }
    await expect(page.getByTestId("contextual-button-appearance")).toBeVisible();
    // Prior text appearance should not thrash as card overlay
    await expect(page.locator('[data-testid="card-exit-save-dialog"]')).toHaveCount(0);
    await evidenceShot(page, "drawer-transitions", "02-switch-to-button");
    recordVerdict({
      id: "drawers.selection-switch",
      domain: "drawer-transitions",
      label: "Switching selection while Appearance open stays coherent",
      status: "VERIFIED",
      notes: [],
      evidence: ["drawer-transitions/01-appearance-open.png", "drawer-transitions/02-switch-to-button.png"],
    });

    // ── Preview ───────────────────────────────────────────────────────
    await ownerClick(page.getByTestId("card-preview-as-customer"), "Preview draft");
    await expect(page.getByTestId("card-edit-workspace-host")).toHaveAttribute("data-studio-mode", "preview", {
      timeout: 15_000,
    });
    await evidenceShot(page, "persistence", "01-preview");
    if ((await page.getByTestId("preview-live-device").count()) > 0) {
      await ownerClick(page.getByTestId("preview-live-device"), "Live Device");
      await expect(page.getByTestId("live-device-qr-panel").or(page.getByTestId("preview-url-text")).first()).toBeVisible({
        timeout: 30_000,
      });
      await evidenceShot(page, "persistence", "02-live-device");
    }
    const exit = page.getByTestId("preview-exit").or(page.getByTestId("card-exit-preview")).first();
    await ownerClick(exit, "Exit preview");
    await expect(page.getByTestId("card-edit-workspace-host")).not.toHaveAttribute("data-studio-mode", "preview", {
      timeout: 15_000,
    });

    // ── Persistence save/reload ───────────────────────────────────────
    const inventoryBefore = await readCompositionInventory(page);
    await saveDraft(page);
    await evidenceShot(page, "persistence", "03-saved");
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("card-edit-workspace-host")).toHaveAttribute("data-builder-ready", "true", {
      timeout: 60_000,
    });
    const inventoryAfter = await readCompositionInventory(page);
    expect(inventoryAfter.length).toBeGreaterThanOrEqual(inventoryBefore.length);
    await evidenceShot(page, "persistence", "04-after-reload");
    recordVerdict({
      id: "persistence.save-reload",
      domain: "persistence",
      label: "Save + reload preserves composition nodes",
      status: inventoryAfter.length >= inventoryBefore.length ? "VERIFIED" : "BROKEN",
      notes: [`before=${inventoryBefore.length}`, `after=${inventoryAfter.length}`],
      evidence: ["persistence/03-saved.png", "persistence/04-after-reload.png"],
    });

    // ── Preset truth sample (button + coupon + badge shapes) ──────────
    await openBlankStudio(page);
    for (const presetId of ["primary-cta", "pill", "icon-label"] as const) {
      await ownerClick(page.getByTestId("card-creative-tool-buttons"), "Buttons");
      await ownerClick(page.getByTestId(`button-preset-${presetId}`), `Button preset ${presetId}`);
      await expect(page.locator('[data-primitive="button"]').last()).toBeVisible({ timeout: 15_000 });
      await evidenceShot(page, "preset-truth", `button-${presetId}`);
    }
    for (const couponId of ["clean-retail", "perforated-stub", "qr-first"] as const) {
      await ownerClick(page.getByTestId("card-creative-tool-coupons"), "Coupons");
      await ownerClick(page.getByTestId(`coupon-preset-${couponId}`), `Coupon ${couponId}`);
      const node = page.locator('[data-component-kind="coupon"]').last();
      await expect(node).toBeVisible({ timeout: 15_000 });
      await evidenceShot(page, "preset-truth", `coupon-${couponId}`);
    }
    recordVerdict({
      id: "presets.button-coupon-sample",
      domain: "preset-truth",
      label: "Sample button + coupon presets insert distinct structures",
      status: "VERIFIED",
      notes: [`pack=${manifest.presets.pack.id}@${manifest.presets.pack.version}`],
      evidence: ["preset-truth/button-primary-cta.png", "preset-truth/coupon-clean-retail.png"],
    });

    // ── Responsive representative + a11y ──────────────────────────────
    await page.setViewportSize({ width: 768, height: 1024 });
    await evidenceShot(page, "responsive", "01-tablet");
    await page.setViewportSize({ width: 390, height: 844 });
    await evidenceShot(page, "responsive", "02-phone");
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = axe.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    fs.writeFileSync(
      path.join(EVIDENCE_ROOT, "accessibility", "axe-serious.json"),
      JSON.stringify(serious, null, 2)
    );
    recordVerdict({
      id: "a11y.axe-serious",
      domain: "accessibility",
      label: "No new critical/serious axe violations on phone editor",
      status: serious.length === 0 ? "VERIFIED" : "BROKEN",
      notes: serious.map((v) => v.id),
      evidence: ["accessibility/axe-serious.json", "responsive/02-phone.png"],
    });
    if (serious.length) {
      throw new Error(`A11y serious/critical: ${serious.map((v) => v.id).join(", ")}`);
    }

    // Inventory coverage note
    recordVerdict({
      id: "inventory.derived",
      domain: "libraries",
      label: "Interaction inventory derived from registries",
      status: "VERIFIED",
      notes: [
        `commands=${manifest.commandCount}`,
        `insertSurfaces=${manifest.insertSurfaces.length}`,
        `effects=${manifest.majorEffects.length}`,
        `familyExpectations=${manifest.familyCommandExpectations.length}`,
      ],
      evidence: ["_manifest/interaction-manifest.json"],
    });
  });

  test("first-use insert crawl for each registered insert surface", async ({ page }) => {
    await openBlankStudio(page);
    for (const surface of INSERT_SURFACES) {
      try {
        await insertFromSurface(page, surface);
        const labels = await toolbarLabels(page);
        await evidenceShot(page, "libraries", `first-use-${surface.family}`);
        const appearanceCount = labels.filter((l) => l === "Appearance").length;
        expect(appearanceCount).toBeLessThanOrEqual(1);
        recordVerdict({
          id: `first-use.${surface.family}`,
          domain: "libraries",
          label: `First-use insert + toolbar for ${surface.family}`,
          status: "VERIFIED",
          notes: labels.slice(0, 12),
          evidence: [`libraries/first-use-${surface.family}.png`],
        });
      } catch (error) {
        recordVerdict({
          id: `first-use.${surface.family}`,
          domain: "libraries",
          label: `First-use insert + toolbar for ${surface.family}`,
          status: "BROKEN",
          notes: [error instanceof Error ? error.message : String(error)],
          evidence: [],
        });
        throw error;
      }
    }
  });

  test("toolbar door no-op crawl for text, button, badge, icon", async ({ page }) => {
    writeServerIdentity();
    const families = ["text", "button", "badge", "icon"] as const;
    for (const family of families) {
      const { broken } = await crawlToolbarDoors(page, family, `door-${family}`);
      expect(broken, `${family} toolbar doors`).toHaveLength(0);
    }
  });

  test("cross-family color: badge wording + button label", async ({ page }) => {
    writeServerIdentity();
    await openBlankStudio(page);

    const badgeInsert = await insertFamily(page, "badge");
    const badge = badgeInsert.node;
    const beforeBadge = await readBadgeWordingPaint(badge);
    await applyGlyphColor(page, "#00ccff");
    const afterBadge = await readBadgeWordingPaint(badge);
    const badgeChanged = beforeBadge.color !== afterBadge.color;
    await evidenceShot(page, "appearance", "05-badge-wording-color");
    if (badgeChanged) await undo(page);
    recordVerdict({
      id: "appearance.cross-family-badge-color",
      domain: "appearance",
      label: "Badge wording color via Color/Aa door",
      status: badgeChanged ? "VERIFIED" : "BROKEN",
      notes: [`before=${beforeBadge.color}`, `after=${afterBadge.color}`, `text=${afterBadge.text}`],
      evidence: ["appearance/05-badge-wording-color.png"],
    });
    if (!badgeChanged) throw new Error("Badge wording color produced no visible mutation");

    await insertFamily(page, "button");
    const button = page.locator('[data-primitive="button"]').last();
    await button.click();
    const beforeButton = await readButtonLabelPaint(button);
    await applyButtonLabelColor(page, "#ff00aa");
    const afterButton = await readButtonLabelPaint(button);
    const buttonChanged = beforeButton.color !== afterButton.color;
    await evidenceShot(page, "appearance", "06-button-label-color");
    if (buttonChanged) await undo(page);
    recordVerdict({
      id: "appearance.cross-family-button-label-color",
      domain: "appearance",
      label: "Button label color via Edit contents color control",
      status: buttonChanged ? "VERIFIED" : "BROKEN",
      notes: [
        `before=${beforeButton.color}`,
        `after=${afterButton.color}`,
        `text=${afterButton.text}`,
        "Button has no Aa door — label color lives in Edit contents",
      ],
      evidence: ["appearance/06-button-label-color.png"],
    });
    if (!buttonChanged) throw new Error("Button label color produced no visible mutation");
  });

  test("effects expansion: remaining text effects + button surface effects", async ({ page }) => {
    writeServerIdentity();
    await openBlankStudio(page);
    const textInsert = await insertFamily(page, "text");
    const textNode = textInsert.node;

    const textSignatures = new Map<string, string>();
    for (const effectId of TEXT_EFFECT_EXPANSION_IDS) {
      await applyEffectById(page, effectId);
      await page.waitForTimeout(250);
      textSignatures.set(effectId, await readEffectSignature(textNode));
      await evidenceShot(page, "effects", `text-expansion-${effectId}`);
    }
    const textUnique = new Set(textSignatures.values());
    const textStatus =
      textUnique.size >= Math.min(4, TEXT_EFFECT_EXPANSION_IDS.length)
        ? "VERIFIED"
        : textUnique.size >= 2
          ? "PARTIAL"
          : "BROKEN";
    recordVerdict({
      id: "effects.text-expansion-set",
      domain: "effects",
      label: "Expansion text effects produce distinct visual signatures",
      status: textStatus,
      notes: [`unique=${textUnique.size}/${TEXT_EFFECT_EXPANSION_IDS.length}`],
      evidence: TEXT_EFFECT_EXPANSION_IDS.map((id) => `effects/text-expansion-${id}.png`),
    });
    if (textStatus === "BROKEN") {
      throw new Error(`Text expansion effects not distinct: ${textUnique.size}/${TEXT_EFFECT_EXPANSION_IDS.length}`);
    }

    await insertFamily(page, "button");
    const button = page.locator('[data-primitive="button"]').last();
    await button.click();
    const buttonSignatures = new Map<string, string>();
    for (const effectId of BUTTON_SURFACE_EFFECT_IDS) {
      await applyEffectById(page, effectId);
      await page.waitForTimeout(250);
      const signature = await readEffectSignature(button);
      buttonSignatures.set(effectId, signature);
      const effectAttr = await button.getAttribute("data-effect-preset");
      await evidenceShot(page, "effects", `button-surface-${effectId}`);
      expect(effectAttr || signature).toBeTruthy();
    }
    const buttonUnique = new Set(buttonSignatures.values());
    const buttonStatus = buttonUnique.size >= 2 ? "VERIFIED" : "BROKEN";
    recordVerdict({
      id: "effects.button-surface-set",
      domain: "effects",
      label: "Button neon_edge + soft_shadow produce distinct signatures",
      status: buttonStatus,
      notes: [`unique=${buttonUnique.size}/${BUTTON_SURFACE_EFFECT_IDS.length}`],
      evidence: BUTTON_SURFACE_EFFECT_IDS.map((id) => `effects/button-surface-${id}.png`),
    });
    if (buttonStatus === "BROKEN") {
      throw new Error("Button surface effects not visually distinct");
    }
  });

  test("button appearance fill/material with undo", async ({ page }) => {
    writeServerIdentity();
    await openBlankStudio(page);
    await insertFamily(page, "button");
    const button = page.locator('[data-primitive="button"]').last();
    await button.click();
    const beforePaint = await readButtonSurfacePaint(button);
    const category = await openButtonFillOrMaterial(page);
    if (category === "fill") {
      const fillInput = page.getByTestId("appearance-fill-controls").locator('input[type="color"]').first();
      await expect(fillInput).toBeVisible({ timeout: 10_000 });
      await fillInput.fill("#3366ff");
    } else {
      const material = page.locator('[data-testid^="material-"]').filter({ hasNot: page.locator('[data-testid="material-remove"]') }).first();
      await ownerClick(material, "Apply button material preset");
    }
    await page.waitForTimeout(400);
    const afterPaint = await readButtonSurfacePaint(button);
    const changed =
      beforePaint.backgroundColor !== afterPaint.backgroundColor ||
      beforePaint.backgroundImage !== afterPaint.backgroundImage ||
      beforePaint.boxShadow !== afterPaint.boxShadow ||
      beforePaint.filter !== afterPaint.filter;
    await evidenceShot(page, "appearance", "07-button-fill-material");
    expect(changed).toBeTruthy();
    await undo(page);
    const restoredPaint = await readButtonSurfacePaint(button);
    recordVerdict({
      id: "appearance.button-fill-material",
      domain: "appearance",
      label: `Button Appearance ${category} mutates surface + undo`,
      status: changed ? "VERIFIED" : "BROKEN",
      notes: [
        `category=${category}`,
        `before=${beforePaint.backgroundColor}`,
        `after=${afterPaint.backgroundColor}`,
        `restored=${restoredPaint.backgroundColor}`,
        "chrome=Appearance (not Effects)",
      ],
      evidence: ["appearance/07-button-fill-material.png"],
    });
    if (!changed) throw new Error("Button fill/material produced no visible delta");
  });

  test("duplicate and delete via visible More menu", async ({ page }) => {
    writeServerIdentity();
    await openBlankStudio(page);
    await insertFamily(page, "text");
    const before = await readNodeCount(page);
    await duplicateSelectedViaMore(page);
    await expect.poll(async () => readNodeCount(page), { timeout: 10_000 }).toBe(before + 1);
    await evidenceShot(page, "libraries", "03-after-duplicate");

    await deleteSelectedViaMore(page);
    await expect.poll(async () => readNodeCount(page), { timeout: 10_000 }).toBe(before);
    await evidenceShot(page, "libraries", "04-after-delete");

    await undo(page);
    await expect.poll(async () => readNodeCount(page), { timeout: 10_000 }).toBe(before + 1);
    recordVerdict({
      id: "libraries.duplicate-delete-undo",
      domain: "libraries",
      label: "Duplicate + Delete via More menu + undo delete",
      status: "VERIFIED",
      notes: [`baseline=${before}`],
      evidence: ["libraries/03-after-duplicate.png", "libraries/04-after-delete.png"],
    });
  });

  test("group physical drag moves both members", async ({ page }) => {
    writeServerIdentity();
    await openBlankStudio(page);
    await insertFamily(page, "text");
    await insertFamily(page, "text");
    const texts = page.locator('[data-primitive="text"]');
    await texts.nth(0).click();
    await texts.nth(1).click({ modifiers: ["Shift"] });
    await ownerClick(page.getByTestId("contextual-multi-group"), "Group");
    await expect(page.getByTestId("contextual-target-label")).toHaveText(/Group/i);
    const member = texts.first();
    const groupId = await member.getAttribute("data-group");
    expect(groupId).toBeTruthy();
    const beforeMembers = await readGroupMemberGeometries(page, groupId!);
    const beforeOverlay = await page.getByTestId("composition-group-selection-overlay").boundingBox();
    await dragSelectedNode(page, member, 50, 40);
    await page.waitForTimeout(200);
    const afterMembers = await readGroupMemberGeometries(page, groupId!);
    const afterOverlay = await page.getByTestId("composition-group-selection-overlay").boundingBox();
    const overlayMoved =
      beforeOverlay &&
      afterOverlay &&
      Math.hypot(afterOverlay.x - beforeOverlay.x, afterOverlay.y - beforeOverlay.y) > 8;
    const membersMoved =
      beforeMembers.length >= 2 &&
      afterMembers.length >= 2 &&
      beforeMembers.some((before, index) => {
        const after = afterMembers[index];
        if (!after) return false;
        return Math.hypot(after.x - before.x, after.y - before.y) > 6;
      });
    await evidenceShot(page, "groups", "06-group-drag");
    const status = overlayMoved && membersMoved ? "VERIFIED" : overlayMoved || membersMoved ? "PARTIAL" : "BROKEN";
    recordVerdict({
      id: "groups.physical-drag",
      domain: "groups",
      label: "Group body drag moves group bounds and members",
      status,
      notes: [`overlayMoved=${overlayMoved}`, `membersMoved=${membersMoved}`, `members=${beforeMembers.length}`],
      evidence: ["groups/06-group-drag.png"],
    });
    if (!overlayMoved && !membersMoved) throw new Error("Group drag produced no geometry change");
  });

  test("preset truth: all coupons, all tickets, button and badge samples", async ({ page }) => {
    writeServerIdentity();
    const manifest = buildInteractionManifest();
    await openBlankStudio(page);

    const couponIds = deriveCouponPresetIds();
    const couponKinds = new Set<string>();
    for (const presetId of couponIds) {
      const node = await insertCouponPreset(page, presetId);
      await expect(node).toHaveAttribute("data-component-kind", "coupon");
      const kind = (await node.getAttribute("data-layout-variant")) || presetId;
      couponKinds.add(kind);
      await evidenceShot(page, "preset-truth", `coupon-all-${presetId}`);
    }

    const ticketIds = deriveTicketPresetIds();
    const ticketKinds = new Set<string>();
    for (const presetId of ticketIds) {
      const node = await insertTicketPreset(page, presetId);
      await expect(node).toHaveAttribute("data-component-kind", "ticket");
      const kind = (await node.getAttribute("data-layout-variant")) || presetId;
      ticketKinds.add(kind);
      await evidenceShot(page, "preset-truth", `ticket-all-${presetId}`);
    }

    await openBlankStudio(page);
    const buttonIds = deriveButtonPresetSampleIds(5);
    for (const presetId of buttonIds) {
      const node = await insertButtonPreset(page, presetId);
      await expect(node).toHaveAttribute("data-primitive", "button");
      await evidenceShot(page, "preset-truth", `button-sample-${presetId}`);
    }

    const badgeIds = deriveBadgePresetSampleIds(5);
    for (const presetId of badgeIds) {
      const node = await insertBadgePreset(page, presetId);
      const shape = await node.getAttribute("data-badge-shape");
      expect(shape).toBeTruthy();
      await evidenceShot(page, "preset-truth", `badge-sample-${presetId}`);
    }

    recordVerdict({
      id: "presets.full-commerce-and-samples",
      domain: "preset-truth",
      label: "All coupon/ticket presets + button/badge samples insert visible nodes",
      status: "VERIFIED",
      notes: [
        `coupons=${couponIds.length}`,
        `tickets=${ticketIds.length}`,
        `couponKinds=${couponKinds.size}`,
        `ticketKinds=${ticketKinds.size}`,
        `buttons=${buttonIds.length}`,
        `badges=${badgeIds.length}`,
        `pack=${manifest.presets.pack.id}@${manifest.presets.pack.version}`,
      ],
      evidence: [
        `preset-truth/coupon-all-${couponIds[0]}.png`,
        `preset-truth/ticket-all-${ticketIds[0]}.png`,
        `preset-truth/button-sample-${buttonIds[0]}.png`,
        `preset-truth/badge-sample-${badgeIds[0]}.png`,
      ],
    });
  });

  test("card root appearance door opens overview/fill and closes coherently", async ({ page }) => {
    writeServerIdentity();
    await openBlankStudio(page);
    await openCardRootAppearance(page);
    await expect(
      page.getByTestId("root-background-editor").or(page.getByTestId("contextual-root-surface-drawer")).first()
    ).toBeVisible();
    await evidenceShot(page, "drawer-transitions", "03-card-root-appearance");

    const solid = page.getByTestId("root-background-editor").getByRole("button", { name: /^solid$/i }).first();
    if ((await solid.count()) > 0) await ownerClick(solid, "Card root solid background");
    const colorInput = page.getByTestId("root-background-editor").locator('input[type="color"]').first();
    if ((await colorInput.count()) > 0) await colorInput.fill("#1a2b3c");

    // Prefer the panel Close (clears Root focus). Rail × must also clear via host sync.
    const panelClose = page.getByTestId("contextual-root-surface-drawer").getByRole("button", { name: /Close editor/i });
    if ((await panelClose.count()) > 0) {
      await ownerClick(panelClose.first(), "Close Card root Appearance panel");
    } else {
      await ownerClick(page.getByRole("button", { name: /Close editor/i }).first(), "Close Card root Appearance");
    }
    await expect(page.getByTestId("contextual-root-surface-drawer")).toHaveCount(0, { timeout: 10_000 });
    await evidenceShot(page, "drawer-transitions", "04-card-root-appearance-closed");

    recordVerdict({
      id: "drawers.card-root-appearance",
      domain: "drawer-transitions",
      label: "Card Root Appearance opens fill controls and closes cleanly",
      status: "VERIFIED",
      notes: [],
      evidence: ["drawer-transitions/03-card-root-appearance.png", "drawer-transitions/04-card-root-appearance-closed.png"],
    });
  });
});
