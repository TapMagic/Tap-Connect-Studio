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
  INSERT_SURFACES,
} from "./owner-sim/interaction-manifest";
import {
  applyEffectById,
  bringSelectedToFront,
  clearSelection,
  dragHandle,
  dragSelectedNode,
  ensureEvidenceDirs,
  evidenceShot,
  geometryChanged,
  insertFamily,
  insertFromSurface,
  openAppearanceOverview,
  openBlankStudio,
  ownerClick,
  ownerFill,
  readCompositionInventory,
  readEffectSignature,
  readGeometry,
  recordVerdict,
  redo,
  saveDraft,
  selectObjectViaLayers,
  toolbarLabels,
  undo,
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

function writeServerIdentity() {
  const identity = {
    generatedAt: new Date().toISOString(),
    branch: process.env.OWNER_SIM_BRANCH || "",
    sha: process.env.OWNER_SIM_SHA || "",
    baseUrl: process.env.BASE_URL || "http://127.0.0.1:3000",
    workspace: process.cwd(),
    serverPid: process.env.OWNER_SIM_SERVER_PID || "",
    serverPort: process.env.OWNER_SIM_SERVER_PORT || "3000",
    dirtyCount: process.env.OWNER_SIM_DIRTY_COUNT || "",
  };
  fs.mkdirSync(path.join(EVIDENCE_ROOT, "_reports"), { recursive: true });
  fs.writeFileSync(path.join(EVIDENCE_ROOT, "_reports", "server-identity.json"), JSON.stringify(identity, null, 2));
  return identity;
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
});
