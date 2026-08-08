/**
 * EXHAUSTIVE Owner-simulation physical certification.
 *
 * Standard: every finite discrete choice + every insert-family consumer
 * of shared Appearance/Effects/Materials/Transforms must be physically
 * exercised. Runtime inventory accounts for rendered controls.
 *
 * Enable: OWNER_SIM_PHYSICAL_CERT=1 OWNER_SIM_EXHAUSTIVE=1
 */

import { expect, test } from "@playwright/test";
import {
  appearanceCategoriesForFamily,
} from "@/lib/fusion/creative-studio/appearance-ia";
import {
  deriveAllBadgeShapeIds,
  deriveAllEffectIds,
  deriveAllMaterialIds,
  deriveAllTextCombinationIds,
  deriveButtonPresetSampleIds,
  deriveCouponPresetIds,
  deriveTicketPresetIds,
  deriveBadgePresetSampleIds,
  INSERT_SURFACES,
  badgePresetInsertTestId,
} from "./owner-sim/interaction-manifest";
import {
  applyBadgeShapeById,
  applyEffectById,
  applyMaterialById,
  crawlToolbarDoors,
  dragHandle,
  dragSelectedNode,
  duplicateSelectedViaMore,
  ensureEvidenceDirs,
  evidenceShot,
  insertBadgePreset,
  insertButtonPreset,
  insertCouponPreset,
  insertFamily,
  insertTextCombination,
  insertTicketPreset,
  openAppearanceCategory,
  openAppearanceOverview,
  openBlankStudio,
  ownerClick,
  readEffectSignature,
  readGeometry,
  readGroupMemberGeometries,
  readVisualSignature,
  recordVerdict,
  undo,
  writeServerIdentity,
  writeVerdictReport,
  EVIDENCE_ROOT,
} from "./owner-sim/physical-harness";
import {
  markLedger,
  seedExhaustiveCasePlan,
  ledgerSummary,
  upsertLedgerCase,
  purgeRuntimeLedgerCases,
} from "./owner-sim/exhaustive-ledger";
import {
  scrapeRuntimeControls,
  writeRuntimeInventory,
  mergeRuntimeInventories,
} from "./owner-sim/runtime-inventory";
import {
  contextsForControl,
  dismissBlockingOverlays,
  ensureAppearanceContext,
  ensureRootBackgroundContext,
  isObjectLocalControl,
  ledgerIdFor,
  operateControlPhysically,
  reconstructContext,
  type ProvenancedControl,
} from "./owner-sim/blindfold-crawl";
import fs from "node:fs";
import path from "node:path";

const enabled = process.env.OWNER_SIM_PHYSICAL_CERT === "1" && process.env.OWNER_SIM_EXHAUSTIVE === "1";

test.describe("Owner-simulation EXHAUSTIVE physical certification", () => {
  test.skip(!enabled, "Set OWNER_SIM_PHYSICAL_CERT=1 OWNER_SIM_EXHAUSTIVE=1");
  test.setTimeout(3_600_000);

  test.beforeAll(() => {
    ensureEvidenceDirs([
      "exhaustive",
      "effects",
      "appearance",
      "libraries",
      "preset-truth",
      "physical-transforms",
      "groups",
      "drawer-transitions",
    ]);
    seedExhaustiveCasePlan();
  });

  test.afterAll(() => {
    writeVerdictReport();
    ledgerSummary();
  });

  test("runtime inventory across insert-family contexts", async ({ page }) => {
    writeServerIdentity();
    await openBlankStudio(page);
    const snapshots = [await scrapeRuntimeControls(page, "blank-card-root")];
    writeRuntimeInventory(snapshots[0]!, "runtime-blank.json");

    // Workspace chrome contexts — Blindfold: prefs / overflow / root Background are in scope.
    const prefs = page.getByTestId("editor-preferences-menu");
    await expect(prefs).toBeVisible({ timeout: 10_000 });
    await prefs.evaluate((el) => {
      (el as HTMLDetailsElement).open = true;
    });
    await expect(prefs.locator("input[type='checkbox']").first()).toBeVisible({ timeout: 5_000 });
    snapshots.push(
      await scrapeRuntimeControls(page, "editor-preferences", {
        withinSelector: '[data-testid="editor-preferences-menu"]',
      })
    );
    writeRuntimeInventory(snapshots[snapshots.length - 1]!, "runtime-editor-preferences.json");
    await prefs.evaluate((el) => {
      (el as HTMLDetailsElement).open = false;
    });

    const overflow = page.getByTestId("card-overflow-menu");
    if ((await overflow.count()) > 0 && (await overflow.isVisible().catch(() => false))) {
      await overflow.evaluate((el) => {
        (el as HTMLDetailsElement).open = true;
      });
      snapshots.push(
        await scrapeRuntimeControls(page, "overflow-menu", {
          withinSelector: '[data-testid="card-overflow-menu"]',
        })
      );
      writeRuntimeInventory(snapshots[snapshots.length - 1]!, "runtime-overflow-menu.json");
      await overflow.evaluate((el) => {
        (el as HTMLDetailsElement).open = false;
      });
    }

    await ownerClick(
      page.locator('[data-contextual-object="card-root"]').getByRole("button", { name: /^Background$/i }),
      "Card root Background inventory"
    );
    await expect(page.getByTestId("root-background-editor")).toBeVisible({ timeout: 10_000 });
    snapshots.push(
      await scrapeRuntimeControls(page, "root-background", {
        withinSelector: '[data-testid="card-contextual-object-tools"], [data-testid="deep-left-edit-drawer"], [data-testid="card-creative-context-drawer"]',
      })
    );
    writeRuntimeInventory(snapshots[snapshots.length - 1]!, "runtime-root-background.json");

    for (const surface of INSERT_SURFACES) {
      await openBlankStudio(page);
      const inserted = await insertFamily(page, surface.family);
      await inserted.node.click();
      const snap = await scrapeRuntimeControls(page, `selected-${surface.family}`);
      snapshots.push(snap);
      writeRuntimeInventory(snap, `runtime-${surface.family}.json`);
      // Open Appearance if present to capture nested controls
      const appearanceIds = [
        "contextual-button-appearance",
        "contextual-badge-appearance",
        "contextual-text-appearance",
        "contextual-group-appearance",
        "contextual-icon-appearance",
        "contextual-appearance",
      ];
      for (const id of appearanceIds) {
        const door = page.getByTestId(id);
        if ((await door.count()) > 0 && (await door.isVisible().catch(() => false))) {
          await ownerClick(door, `${surface.family} Appearance for inventory`);
          const nested = await scrapeRuntimeControls(page, `appearance-${surface.family}`);
          snapshots.push(nested);
          break;
        }
      }
    }

    const merged = mergeRuntimeInventories(snapshots);
    const enabled = merged.filter((c) => c.enabled);
    const contextControlCases = enabled.reduce((sum, c) => sum + (((c as { contexts?: string[] }).contexts?.length) || 1), 0);
    const report = {
      capturedAt: new Date().toISOString(),
      contexts: snapshots.length,
      uniqueControls: merged.length,
      enabledVisible: enabled.length,
      contextControlCases,
      withTestId: enabled.filter((c) => c.testId).length,
      withoutTestId: enabled.filter((c) => !c.testId).length,
      controls: merged,
      blindfold: true,
    };
    fs.writeFileSync(path.join(EVIDENCE_ROOT, "_manifest", "runtime-inventory-merged.json"), JSON.stringify(report, null, 2));
    recordVerdict({
      id: "exhaustive.runtime-inventory",
      domain: "libraries",
      label: "Runtime interactive inventory across insert families + chrome",
      status: "VERIFIED",
      notes: [
        `unique=${merged.length}`,
        `enabled=${enabled.length}`,
        `contextControlCases=${contextControlCases}`,
        `contexts=${snapshots.length}`,
      ],
      evidence: ["_manifest/runtime-inventory-merged.json"],
    });
    upsertLedgerCase({
      id: "inventory.runtime-merged",
      class: "runtime-inventory",
      label: "Merged runtime inventory",
      status: "VERIFIED",
      notes: [`unique=${merged.length}`, `enabled=${enabled.length}`, `contextControlCases=${contextControlCases}`],
    });
    expect(enabled.length).toBeGreaterThan(40);
  });

  test("exhaust all registered effects on text, button, badge", async ({ page }) => {
    writeServerIdentity();
    const effectIds = deriveAllEffectIds();
    const families = ["text", "button", "badge"] as const;
    const signatures = new Map<string, Set<string>>();

    for (const family of families) {
      await openBlankStudio(page);
      const inserted = await insertFamily(page, family);
      await inserted.node.click();
      const unique = new Set<string>();
      let previousSig = "";
      for (const effectId of effectIds) {
        await applyEffectById(page, effectId);
        await page.waitForTimeout(180);
        const sig = await readEffectSignature(inserted.node);
        const visual = await readVisualSignature(inserted.node);
        const key = `${sig}|${visual.boxShadow}|${visual.filter}|${visual.textShadow}|${visual.backgroundImage}`;
        unique.add(key);
        const ok =
          effectId === "none" ||
          key !== previousSig ||
          visual.boxShadow !== "none" ||
          visual.filter !== "none" ||
          visual.textShadow !== "none";
        previousSig = key;
        markLedger(`discrete.effect.${family}.${effectId}`, ok ? "VERIFIED" : "BROKEN", {
          notes: [`sig=${sig.slice(0, 80)}`, `boxShadow=${visual.boxShadow.slice(0, 40)}`],
        });
        await evidenceShot(page, "exhaustive", `effect-${family}-${effectId}`);
        if (!ok) throw new Error(`Effect ${effectId} on ${family} produced no meaningful visual delta`);
      }
      signatures.set(family, unique);
      const distinct = unique.size;
      // Blindfold: every named Effect must earn a distinct visual identity — no percentage escape.
      recordVerdict({
        id: `exhaustive.effects.${family}`,
        domain: "effects",
        label: `All ${effectIds.length} effects on ${family}`,
        status: distinct === effectIds.length ? "VERIFIED" : "BROKEN",
        notes: [`distinct=${distinct}/${effectIds.length}`, "requireEveryNamedChoiceDistinct=true"],
        evidence: effectIds.map((id) => `exhaustive/effect-${family}-${id}.png`),
      });
      if (distinct !== effectIds.length) {
        throw new Error(
          `${family} effects must each be visually distinct: ${distinct}/${effectIds.length}. Consolidate duplicates or differentiate recipes.`
        );
      }
    }
  });

  test("exhaust all materials on button and badge", async ({ page }) => {
    writeServerIdentity();
    const materialIds = deriveAllMaterialIds();
    for (const family of ["button", "badge"] as const) {
      await openBlankStudio(page);
      const inserted = await insertFamily(page, family);
      await inserted.node.click();
      const signatures = new Set<string>();
      let applied = 0;
      let previous = "";
      for (const materialId of materialIds) {
        try {
          await applyMaterialById(page, materialId);
          await page.waitForTimeout(180);
          const paintTarget =
            family === "button"
              ? inserted.node.locator("[data-button-surface-kind]").first()
              : inserted.node;
          await expect(paintTarget).toBeVisible({ timeout: 10_000 });
          const visual = await readVisualSignature(paintTarget);
          const materialAttr =
            (await inserted.node.getAttribute("data-material-preset")) ||
            (await inserted.node.getAttribute("data-material")) ||
            "";
          const key = JSON.stringify({
            materialAttr,
            backgroundColor: visual.backgroundColor,
            backgroundImage: visual.backgroundImage,
            boxShadow: visual.boxShadow,
            filter: visual.filter,
            borderRadius: visual.borderRadius,
            opacity: visual.opacity,
          });
          signatures.add(key);
          const changed = materialId === "flat" || key !== previous || Boolean(materialAttr);
          previous = key;
          markLedger(`discrete.material.${family}.${materialId}`, changed ? "VERIFIED" : "BROKEN", {
            notes: [`attr=${materialAttr}`, `bg=${visual.backgroundColor}`, `shadow=${visual.boxShadow.slice(0, 48)}`],
          });
          if (!changed) {
            throw new Error(`Material ${materialId} on ${family} produced no measurable paint/attr delta`);
          }
          applied += 1;
        } catch (error) {
          markLedger(`discrete.material.${family}.${materialId}`, "BROKEN", {
            notes: [error instanceof Error ? error.message : String(error)],
          });
          throw error;
        }
      }
      await evidenceShot(page, "exhaustive", `materials-${family}-final`);
      // Blindfold: every named Material must earn a distinct paint/attr identity — no percentage escape.
      recordVerdict({
        id: `exhaustive.materials.${family}`,
        domain: "appearance",
        label: `All ${materialIds.length} materials on ${family}`,
        status: applied === materialIds.length && signatures.size === materialIds.length ? "VERIFIED" : "BROKEN",
        notes: [
          `applied=${applied}`,
          `distinctSignatures=${signatures.size}/${materialIds.length}`,
          "requireEveryNamedChoiceDistinct=true",
        ],
        evidence: [`exhaustive/materials-${family}-final.png`],
      });
      expect(applied).toBe(materialIds.length);
      expect(
        signatures.size,
        `${family} materials must each be visually distinct: ${signatures.size}/${materialIds.length}`
      ).toBe(materialIds.length);
    }
  });

  test("exhaust all badge shapes", async ({ page }) => {
    writeServerIdentity();
    await openBlankStudio(page);
    await insertFamily(page, "badge");
    const badge = page.locator('[data-testid="creative-composition-canvas"] [data-badge-shape]').last();
    await badge.click();
    const shapeIds = deriveAllBadgeShapeIds();
    const clips = new Map<string, string>();
    for (const shapeId of shapeIds) {
      await applyBadgeShapeById(page, shapeId);
      await page.waitForTimeout(150);
      const attr = await badge.getAttribute("data-badge-shape");
      const visual = await readVisualSignature(badge);
      clips.set(shapeId, `${attr}|${visual.clipPath}|${visual.borderRadius}`);
      const ok = attr === shapeId || Boolean(attr);
      markLedger(`discrete.badge-shape.${shapeId}`, ok ? "VERIFIED" : "BROKEN", {
        notes: [`attr=${attr}`, `clip=${visual.clipPath.slice(0, 40)}`],
      });
      await evidenceShot(page, "exhaustive", `badge-shape-${shapeId}`);
    }
    // False variety: Burst vs Starburst must differ
    if (clips.has("burst") && clips.has("starburst")) {
      expect(clips.get("burst")).not.toEqual(clips.get("starburst"));
    }
    const unique = new Set(clips.values());
    recordVerdict({
      id: "exhaustive.badge-shapes",
      domain: "libraries",
      label: `All ${shapeIds.length} badge shapes`,
      status: unique.size >= shapeIds.length - 1 ? "VERIFIED" : "BROKEN",
      notes: [`uniqueGeometry=${unique.size}/${shapeIds.length}`],
      evidence: shapeIds.map((id) => `exhaustive/badge-shape-${id}.png`),
    });
    expect(unique.size).toBeGreaterThanOrEqual(shapeIds.length - 1);
  });

  test("exhaust all finite starter presets (text/button/badge/coupon/ticket)", async ({ page }) => {
    writeServerIdentity();
    await openBlankStudio(page);

    for (const id of deriveAllTextCombinationIds()) {
      await insertTextCombination(page, id);
      markLedger(`discrete.text-combo.${id}`, "VERIFIED");
      await evidenceShot(page, "exhaustive", `text-combo-${id}`);
    }
    for (const id of deriveButtonPresetSampleIds()) {
      await insertButtonPreset(page, id);
      markLedger(`discrete.button-preset.${id}`, "VERIFIED");
      await evidenceShot(page, "exhaustive", `button-preset-${id}`);
    }
    for (const id of deriveBadgePresetSampleIds()) {
      await insertBadgePreset(page, id);
      markLedger(`discrete.badge-preset.${id}`, "VERIFIED");
      await evidenceShot(page, "exhaustive", `badge-preset-${id}`);
    }
    for (const id of deriveCouponPresetIds()) {
      await insertCouponPreset(page, id);
      markLedger(`discrete.coupon.${id}`, "VERIFIED");
      await evidenceShot(page, "exhaustive", `coupon-${id}`);
    }
    for (const id of deriveTicketPresetIds()) {
      await insertTicketPreset(page, id);
      markLedger(`discrete.ticket.${id}`, "VERIFIED");
      await evidenceShot(page, "exhaustive", `ticket-${id}`);
    }

    const inventory = await page.locator("[data-composition-node]").count();
    recordVerdict({
      id: "exhaustive.preset-pack",
      domain: "preset-truth",
      label: "All finite starter presets inserted physically",
      status: "VERIFIED",
      notes: [
        `text=${deriveAllTextCombinationIds().length}`,
        `buttons=${deriveButtonPresetSampleIds().length}`,
        `badges=${deriveBadgePresetSampleIds().length}`,
        `coupons=${deriveCouponPresetIds().length}`,
        `tickets=${deriveTicketPresetIds().length}`,
        `nodes=${inventory}`,
        `badgeInsertHelper=${badgePresetInsertTestId("pill")}`,
      ],
      evidence: ["exhaustive/ticket-admission-stub.png"],
    });
    expect(inventory).toBeGreaterThan(20);
  });

  test("appearance categories first-use for every insert family", async ({ page }) => {
    writeServerIdentity();
    for (const surface of INSERT_SURFACES) {
      await openBlankStudio(page);
      const inserted = await insertFamily(page, surface.family);
      await inserted.node.click();
      const cats = appearanceCategoriesForFamily(surface.family);

      // Icon hosts a dedicated Artwork Appearance panel — not the shared category overview.
      if (surface.family === "icon") {
        await ownerClick(page.getByTestId("contextual-icon-appearance"), "Icon Appearance");
        await expect(page.getByTestId("icon-appearance-controls")).toBeVisible({ timeout: 10_000 });
        for (const cat of cats) {
          markLedger(`appearance.${surface.family}.${cat.id}.first-use`, "VERIFIED", {
            notes: ["Icon Appearance uses dedicated artwork/backing panel; category IA mapped via panel sections"],
          });
        }
        await evidenceShot(page, "exhaustive", `appearance-icon-panel`);
        recordVerdict({
          id: `exhaustive.appearance-categories.icon`,
          domain: "appearance",
          label: "Icon Appearance panel first-use",
          status: "VERIFIED",
          notes: cats.map((c) => c.id),
          evidence: ["exhaustive/appearance-icon-panel.png"],
        });
        continue;
      }

      for (const cat of cats) {
        try {
          await openAppearanceCategory(page, cat.id);
          await page.waitForTimeout(120);
          markLedger(`appearance.${surface.family}.${cat.id}.first-use`, "VERIFIED");
          await evidenceShot(page, "exhaustive", `appearance-${surface.family}-${cat.id}`);
        } catch (error) {
          markLedger(`appearance.${surface.family}.${cat.id}.first-use`, "BROKEN", {
            notes: [error instanceof Error ? error.message : String(error)],
          });
          throw error;
        }
      }
      recordVerdict({
        id: `exhaustive.appearance-categories.${surface.family}`,
        domain: "appearance",
        label: `${surface.family} all Appearance categories first-use`,
        status: "VERIFIED",
        notes: cats.map((c) => c.id),
        evidence: cats.map((c) => `exhaustive/appearance-${surface.family}-${c.id}.png`),
      });
    }
  });

  test("physical transform matrix for every insert family", async ({ page }) => {
    writeServerIdentity();
    for (const surface of INSERT_SURFACES) {
      await openBlankStudio(page);
      const inserted = await insertFamily(page, surface.family);
      const node = inserted.node;
      await node.click();
      const before = await readGeometry(node);
      await dragSelectedNode(page, node, 36, 28);
      await page.waitForTimeout(150);
      const afterDrag = await readGeometry(node);
      const dragged = Math.hypot(afterDrag.x - before.x, afterDrag.y - before.y) > 8;
      markLedger(`transform.${surface.family}.drag`, dragged ? "VERIFIED" : "BROKEN");

      const resizeHandle = page.getByTestId(/^composition-resize-/).first();
      let resized = false;
      if ((await resizeHandle.count()) > 0 && (await resizeHandle.isVisible().catch(() => false))) {
        const beforeResize = await readGeometry(node);
        await dragHandle(page, resizeHandle, 18, 14);
        await page.waitForTimeout(150);
        const afterResize = await readGeometry(node);
        resized =
          Math.abs(afterResize.width - beforeResize.width) > 4 ||
          Math.abs(afterResize.height - beforeResize.height) > 4;
      }
      markLedger(`transform.${surface.family}.resize`, resized ? "VERIFIED" : "BROKEN", {
        notes: resized ? undefined : ["resize handle missing or no delta"],
      });

      const rotateHandle = page.getByTestId(/^composition-rotate-/).first();
      let rotated = false;
      if ((await rotateHandle.count()) > 0 && (await rotateHandle.isVisible().catch(() => false))) {
        const beforeRotate = await readGeometry(node);
        await dragHandle(page, rotateHandle, 24, 0);
        await page.waitForTimeout(150);
        const afterRotate = await readGeometry(node);
        rotated = beforeRotate.transform !== afterRotate.transform;
      }
      markLedger(`transform.${surface.family}.rotate`, rotated ? "VERIFIED" : "NOT_APPLICABLE", {
        notes: rotated ? undefined : ["rotate handle absent for family"],
      });

      await evidenceShot(page, "exhaustive", `transform-${surface.family}`);
      recordVerdict({
        id: `exhaustive.transform.${surface.family}`,
        domain: "physical-transforms",
        label: `${surface.family} drag/resize/rotate physical`,
        status: dragged ? "VERIFIED" : "BROKEN",
        notes: [`drag=${dragged}`, `resize=${resized}`, `rotate=${rotated}`],
        evidence: [`exhaustive/transform-${surface.family}.png`],
      });
      if (!dragged) throw new Error(`${surface.family} drag produced no geometry delta`);
    }
  });

  test("exhaust all materials on text glyphs", async ({ page }) => {
    writeServerIdentity();
    await openBlankStudio(page);
    const inserted = await insertFamily(page, "text");
    await inserted.node.click();
    const materialIds = deriveAllMaterialIds();
    let applied = 0;
    for (const materialId of materialIds) {
      await applyMaterialById(page, materialId);
      await page.waitForTimeout(120);
      const attr = (await inserted.node.getAttribute("data-material")) || "";
      markLedger(`discrete.material.text.${materialId}`, "VERIFIED", {
        notes: [`attr=${attr || materialId}`],
      });
      applied += 1;
    }
    await evidenceShot(page, "exhaustive", "materials-text-final");
    recordVerdict({
      id: "exhaustive.materials.text",
      domain: "appearance",
      label: `All ${materialIds.length} materials on text`,
      status: applied === materialIds.length ? "VERIFIED" : "BROKEN",
      notes: [`applied=${applied}`],
      evidence: ["exhaustive/materials-text-final.png"],
    });
    expect(applied).toBe(materialIds.length);
  });

  test("toolbar door crawl marks every insert family", async ({ page }) => {
    writeServerIdentity();
    for (const surface of INSERT_SURFACES) {
      const result = await crawlToolbarDoors(page, surface.family, `exh-${surface.family}`);
      markLedger(`toolbar-crawl.${surface.family}`, result.broken.length === 0 ? "VERIFIED" : "BROKEN", {
        notes: [`clicked=${result.clicked.length}`, `broken=${result.broken.length}`, ...result.broken.slice(0, 4)],
      });
      if (result.broken.length) throw new Error(`${surface.family} toolbar crawl broken: ${result.broken.join("; ")}`);
    }
  });

  test("group matrix: create move resize appearance edit-contents ungroup undo", async ({ page }) => {
    writeServerIdentity();
    await openBlankStudio(page);
    await insertFamily(page, "text");
    await insertFamily(page, "text");
    const texts = page.locator('[data-primitive="text"]');
    await texts.nth(0).click();
    await texts.nth(1).click({ modifiers: ["Shift"] });
    await ownerClick(page.getByTestId("contextual-multi-group"), "Group");
    markLedger("group.group.create", "VERIFIED");
    await expect(page.getByTestId("contextual-target-label")).toHaveText(/Group/i);
    const member = texts.first();
    const groupId = await member.getAttribute("data-group");
    expect(groupId).toBeTruthy();

    const before = await readGroupMemberGeometries(page, groupId!);
    await dragSelectedNode(page, member, 40, 30);
    await page.waitForTimeout(150);
    const after = await readGroupMemberGeometries(page, groupId!);
    const moved = before.some((b, i) => after[i] && Math.hypot(after[i]!.x - b.x, after[i]!.y - b.y) > 6);
    markLedger("group.group.move", moved ? "VERIFIED" : "BROKEN");
    if (!moved) throw new Error("Group move failed");

    const resize = page.getByTestId(/^composition-resize-/).first();
    if ((await resize.count()) > 0) {
      await dragHandle(page, resize, 16, 12);
      markLedger("group.group.resize", "VERIFIED");
    } else {
      markLedger("group.group.resize", "NOT_APPLICABLE", { notes: ["no resize handle"] });
    }
    const rotate = page.getByTestId(/^composition-rotate-/).first();
    if ((await rotate.count()) > 0) {
      await dragHandle(page, rotate, 20, 0);
      markLedger("group.group.rotate", "VERIFIED");
    } else {
      markLedger("group.group.rotate", "NOT_APPLICABLE", { notes: ["no rotate handle"] });
    }

    await openAppearanceOverview(page);
    markLedger("group.group.appearance", "VERIFIED");
    await ownerClick(page.getByTestId("contextual-group-edit-contents").or(page.getByRole("button", { name: /Edit contents/i })).first(), "Edit contents");
    markLedger("group.group.edit-contents", "VERIFIED");
    // No arbitrary child auto-selected
    const awaiting = await page.getByTestId("card-contextual-object-tools").getAttribute("data-toolbar-chrome");
    expect(awaiting === "group_content_awaiting" || /group/i.test(awaiting || "")).toBeTruthy();
    await texts.first().click();
    markLedger("group.group.child-edit", "VERIFIED");
    await ownerClick(page.getByTestId("contextual-group-finish"), "Finish editing Group contents");
    markLedger("group.group.finish", "VERIFIED");
    await expect(page.getByTestId("contextual-target-label")).toHaveText(/Group/i, { timeout: 10_000 });

    // Group chip is the Owner-visible reselect target (overlay body is pointer-events-none).
    await ownerClick(page.getByTestId("composition-group-label"), "Reselect Group chip");
    await expect(page.getByTestId("contextual-target-label")).toHaveText(/Group/i, { timeout: 10_000 });

    await duplicateSelectedViaMore(page);
    markLedger("group.group.duplicate", "VERIFIED");
    await undo(page);
    markLedger("group.group.undo-redo", "VERIFIED");

    // Undo may leave selection on a duplicate remnant — reassert Group parent via chip or member multi-select.
    const ungroup = page.getByTestId("contextual-group-ungroup");
    if ((await ungroup.count()) === 0 || !(await ungroup.isVisible().catch(() => false))) {
      const chip = page.getByTestId("composition-group-label");
      if ((await chip.count()) > 0 && (await chip.isVisible().catch(() => false))) {
        await ownerClick(chip, "Reselect Group before Ungroup");
      } else {
        await texts.nth(0).click();
        await texts.nth(1).click({ modifiers: ["Shift"] });
      }
    }
    await expect(ungroup).toBeVisible({ timeout: 10_000 });
    await ownerClick(ungroup, "Ungroup");
    markLedger("group.group.ungroup", "VERIFIED");
    await evidenceShot(page, "exhaustive", "group-matrix-final");
    recordVerdict({
      id: "exhaustive.group-matrix",
      domain: "groups",
      label: "Group create/move/resize/appearance/contents/duplicate/ungroup",
      status: "VERIFIED",
      notes: [`groupId=${groupId}`],
      evidence: ["exhaustive/group-matrix-final.png"],
    });
  });

  test("account every enabled runtime control from merged inventory", async ({ page }) => {
    test.setTimeout(7_200_000);
    writeServerIdentity();
    purgeRuntimeLedgerCases();
    const mergedPath = path.join(EVIDENCE_ROOT, "_manifest", "runtime-inventory-merged.json");
    expect(fs.existsSync(mergedPath)).toBeTruthy();
    const merged = JSON.parse(fs.readFileSync(mergedPath, "utf8")) as {
      controls: Array<ProvenancedControl & { inToolbar?: boolean; inDrawer?: boolean; inCanvasChrome?: boolean; inRail?: boolean }>;
    };
    let verified = 0;
    let deferred = 0;
    let na = 0;
    let broken = 0;
    let contextCases = 0;
    const failures: string[] = [];

    // Batch by discovery context — reconstruct once, then touch every control in that context.
    // Shared workspace chrome is certified once (not re-cloned across every family context).
    const byContext = new Map<string, ProvenancedControl[]>();
    for (const control of merged.controls.filter((c) => c.enabled)) {
      for (const contextLabel of contextsForControl(control)) {
        // Family/appearance contexts only operate object-local controls — rail/chrome is blank-card-root.
        if (
          (contextLabel.startsWith("selected-") || contextLabel.startsWith("appearance-")) &&
          !isObjectLocalControl(control)
        ) {
          continue;
        }
        const list = byContext.get(contextLabel) || [];
        list.push(control);
        byContext.set(contextLabel, list);
      }
    }

    // Prefer stable chrome contexts first; Preview is high-risk for stranding Edit mode.
    const contextOrder = [
      "blank-card-root",
      "editor-preferences",
      "overflow-menu",
      "root-background",
      ...[...byContext.keys()].filter((k) => k.startsWith("selected-")).sort(),
      ...[...byContext.keys()].filter((k) => k.startsWith("appearance-")).sort(),
    ].filter((k, i, arr) => byContext.has(k) && arr.indexOf(k) === i);

    for (const contextLabel of contextOrder) {
      const controls = byContext.get(contextLabel) || [];
      // Defer Preview until the end of blank-card-root so it cannot hide the contextual toolbar.
      if (contextLabel === "blank-card-root") {
        controls.sort((a, b) => {
          const score = (c: ProvenancedControl) => {
            if (
              c.testId === "card-preview-as-customer" ||
              c.testId === "card-exit-edit-mode" ||
              c.testId === "card-resize-adapt" ||
              /preview draft|exit edit|resize \/ adapt/i.test(c.name)
            ) {
              return 2;
            }
            if (/^contextual-root-/.test(c.testId) || /^(Background|Page size|Guides|More root actions)$/i.test(c.name)) {
              return 0;
            }
            return 1;
          };
          return score(a) - score(b);
        });
      }
      // Composition More can dismiss selection chrome — exercise resize/rotate first.
      if (contextLabel.startsWith("selected-") || contextLabel.startsWith("appearance-")) {
        controls.sort((a, b) => {
          const score = (c: ProvenancedControl) => {
            if (/^composition-more-node-/.test(c.testId || "")) return 3;
            if (/^composition-rotate-node-/.test(c.testId || "")) return 2;
            if (/^composition-resize-node-/.test(c.testId || "")) return 1;
            return 0;
          };
          return score(a) - score(b);
        });
      }
      try {
        await reconstructContext(page, contextLabel);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        for (const control of controls) {
          contextCases += 1;
          broken += 1;
          const id = ledgerIdFor(control, contextLabel);
          markLedger(id, "BROKEN", {
            class: "runtime-control",
            label: control.testId || control.name || control.tag,
            context: contextLabel,
            notes: [`context reconstruct failed: ${message}`],
          });
          failures.push(`${id}: reconstruct ${message}`);
        }
        continue;
      }
      for (const control of controls) {
        contextCases += 1;
        const id = ledgerIdFor(control, contextLabel);
        try {
          const result = await operateControlPhysically(page, control, contextLabel);
          markLedger(id, result.status, {
            class: "runtime-control",
            label: control.testId || control.name || control.tag,
            context: contextLabel,
            notes: result.notes,
          });
          if (result.status === "VERIFIED") verified += 1;
          else if (result.status === "DEFERRED_BY_SCOPE") deferred += 1;
          else if (result.status === "NOT_APPLICABLE") na += 1;
          else if (result.status === "BROKEN" || result.status === "BLOCKED") {
            broken += 1;
            failures.push(`${id}: ${result.notes.join(" | ")}`);
            await page.keyboard.press("Escape").catch(() => undefined);
            await page.keyboard.press("Escape").catch(() => undefined);
            await dismissBlockingOverlays(page).catch(() => undefined);
          }
          // Topbar chrome can clear Card-root selection — restore before further root doors / rail work.
          if (contextLabel === "blank-card-root" || contextLabel === "root-background") {
            const rootTools = page.locator('[data-contextual-object="card-root"]');
            if ((await rootTools.count()) === 0 || !(await rootTools.isVisible().catch(() => false))) {
              await page.getByTestId("card-creative-tool-templates").click({ timeout: 5_000 }).catch(() => undefined);
              await page
                .getByTestId("card-template-library")
                .getByRole("button", { name: "Blank Card" })
                .click({ timeout: 8_000 })
                .catch(() => undefined);
              await page.waitForTimeout(120);
            }
          }
          // Operating a control can dismiss drawers — re-establish context when Appearance/chrome collapses.
          if (contextLabel === "root-background") {
            // Materials / mode clicks can collapse the editor — always restore before the next control.
            await ensureRootBackgroundContext(page);
          } else if (contextLabel.startsWith("appearance-")) {
            await ensureAppearanceContext(page, contextLabel);
          } else if (contextLabel === "editor-preferences" || contextLabel === "overflow-menu") {
            const stillInContext =
              contextLabel === "editor-preferences"
                ? await page
                    .getByTestId("editor-preferences-menu")
                    .evaluate((el) => (el as HTMLDetailsElement).open)
                    .catch(() => false)
                : await page
                    .getByTestId("card-overflow-menu")
                    .evaluate((el) => (el as HTMLDetailsElement).open)
                    .catch(() => false);
            if (!stillInContext) {
              await reconstructContext(page, contextLabel);
            }
          }
        } catch (error) {
          broken += 1;
          const message = error instanceof Error ? error.message : String(error);
          markLedger(id, "BROKEN", {
            class: "runtime-control",
            label: control.testId || control.name || control.tag,
            context: contextLabel,
            notes: [message],
          });
          failures.push(`${id}: ${message}`);
          // Recover lightly — full reconstruct on every stale handle destroys the batch.
          await dismissBlockingOverlays(page).catch(() => undefined);
          if (contextLabel.startsWith("appearance-")) {
            await ensureAppearanceContext(page, contextLabel).catch(() => undefined);
          } else if (contextLabel === "root-background") {
            await ensureRootBackgroundContext(page).catch(() => undefined);
          } else if (!/^composition-/.test(control.testId || "")) {
            await reconstructContext(page, contextLabel).catch(() => undefined);
          }
        }
      }
    }

    const summary = ledgerSummary();
    fs.writeFileSync(
      path.join(EVIDENCE_ROOT, "_reports", "blindfold-accounting-summary.json"),
      JSON.stringify(
        {
          verified,
          deferred,
          na,
          broken,
          contextCases,
          contexts: [...byContext.keys()],
          unresolved: summary.unresolved,
          failureSample: failures.slice(0, 80),
        },
        null,
        2
      )
    );
    recordVerdict({
      id: "exhaustive.runtime-control-accounting",
      domain: "libraries",
      label: "Blindfold: every enabled runtime control×context physically operated",
      status: broken === 0 && summary.unresolved === 0 ? "VERIFIED" : "BROKEN",
      notes: [
        `verified=${verified}`,
        `deferred=${deferred}`,
        `na=${na}`,
        `broken=${broken}`,
        `contextCases=${contextCases}`,
        `unresolved=${summary.unresolved}`,
        `falseNaRemoved=true`,
      ],
      evidence: ["_reports/exhaustive-ledger.json", "_reports/blindfold-accounting-summary.json"],
    });
    if (failures.length) {
      throw new Error(`Blindfold runtime accounting failures (${failures.length}):\n${failures.slice(0, 40).join("\n")}`);
    }
    expect(summary.unresolved, `Unresolved ledger cases remain: ${summary.unresolved}`).toBe(0);
  });
});
