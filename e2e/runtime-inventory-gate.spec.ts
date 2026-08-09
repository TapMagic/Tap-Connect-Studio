/**
 * Physical runtime inventory capture + baseline→final drift gate.
 * Enable: OWNER_SIM_INVENTORY_GATE=1
 *
 * Opens Preferences / Overflow / Background / Appearance through visible Host clicks only.
 */
import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  EVIDENCE_ROOT,
  dismissSaveDialogIfPresent,
  insertFamily,
  openBlankStudio,
  openCardRootAppearance,
  ownerClick,
  writeServerIdentity,
} from "./owner-sim/physical-harness";
import { INSERT_SURFACES } from "./owner-sim/interaction-manifest";
import {
  mergeRuntimeInventories,
  scrapeRuntimeControls,
  stableInventoryKey,
  writeRuntimeInventory,
  type RuntimeControl,
} from "./owner-sim/runtime-inventory";

const enabled = process.env.OWNER_SIM_INVENTORY_GATE === "1";
const PRODUCT_SHA = process.env.PRODUCT_CERT_SHA || "55e2955299ca49e04902b3c9e9d6818d7889c953";

function stableKey(control: RuntimeControl) {
  return stableInventoryKey(control);
}

function loadBaselineMerged(): {
  uniqueControls: number;
  enabledVisible: number;
  controls: Array<RuntimeControl & { contexts?: string[] }>;
} | null {
  const candidates = [
    path.join(EVIDENCE_ROOT, "_manifest", "runtime-inventory-baseline-b4d903c.json"),
    path.join(process.cwd(), "docs/product-reconstitution/creative-studio-platform/runtime-inventory-baseline-b4d903c.json"),
  ];
  for (const file of candidates) {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf8")) as {
        uniqueControls: number;
        enabledVisible: number;
        controls: Array<RuntimeControl & { contexts?: string[] }>;
      };
    }
  }
  return null;
}

async function openPreferencesPhysically(page: import("@playwright/test").Page) {
  const summary = page
    .getByTestId("editor-preferences-menu")
    .locator("summary")
    .or(page.getByRole("button", { name: /Editor theme and canvas assistance|Preferences|Canvas assistance/i }))
    .first();
  await expect(summary).toBeVisible({ timeout: 10_000 });
  await ownerClick(summary, "Open Preferences physically");
  await expect(page.getByTestId("editor-preferences-menu").locator("input[type='checkbox']").first()).toBeVisible({
    timeout: 5_000,
  });
}

test.describe("runtime inventory gate", () => {
  test.skip(!enabled, "Set OWNER_SIM_INVENTORY_GATE=1");
  test.setTimeout(300_000);

  test("capture final inventory and diff against baseline", async ({ page }) => {
    writeServerIdentity();
    await openBlankStudio(page);
    const snapshots = [await scrapeRuntimeControls(page, "blank-card-root")];
    writeRuntimeInventory(snapshots[0]!, `runtime-final-${PRODUCT_SHA.slice(0, 7)}-blank.json`);

    await openPreferencesPhysically(page);
    snapshots.push(
      await scrapeRuntimeControls(page, "editor-preferences", {
        withinSelector: '[data-testid="editor-preferences-menu"]',
      })
    );
    // Close prefs via summary toggle — blind Escape opens Exit Edit Mode.
    await ownerClick(
      page.getByTestId("editor-preferences-menu").locator("summary").first(),
      "Close Preferences"
    );
    await dismissSaveDialogIfPresent(page);

    const overflowSummary = page.getByTestId("card-overflow-menu").locator("summary").first();
    if ((await overflowSummary.count()) > 0 && (await overflowSummary.isVisible().catch(() => false))) {
      await ownerClick(overflowSummary, "Open overflow physically");
      snapshots.push(
        await scrapeRuntimeControls(page, "overflow-menu", {
          withinSelector: '[data-testid="card-overflow-menu"]',
        })
      );
      await ownerClick(overflowSummary, "Close overflow");
      await dismissSaveDialogIfPresent(page);
    }

    await openCardRootAppearance(page);
    snapshots.push(
      await scrapeRuntimeControls(page, "root-background", {
        withinSelector:
          '[data-testid="card-contextual-object-tools"], [data-testid="deep-left-edit-drawer"], [data-testid="card-creative-context-drawer"]',
      })
    );
    if (await page.getByTestId("deep-left-edit-drawer").isVisible().catch(() => false)) {
      await page.keyboard.press("Escape");
    }
    await dismissSaveDialogIfPresent(page);

    // Visual Plane door from rail
    await ownerClick(page.getByTestId("card-creative-tool-backgrounds"), "Background rail");
    await expect(page.getByTestId("visual-plane-studio-page")).toBeVisible({ timeout: 10_000 });
    snapshots.push(await scrapeRuntimeControls(page, "visual-plane-page"));
    const patternDoor = page.getByTestId("visual-plane-kind-pattern");
    if (await patternDoor.isVisible().catch(() => false)) {
      await ownerClick(patternDoor, "Visual Plane Pattern");
      snapshots.push(await scrapeRuntimeControls(page, "visual-plane-pattern"));
    }
    await dismissSaveDialogIfPresent(page);

    for (const surface of INSERT_SURFACES) {
      await openBlankStudio(page);
      await dismissSaveDialogIfPresent(page);
      const inserted = await insertFamily(page, surface.family);
      await inserted.node.click({ position: { x: 12, y: 12 } });
      snapshots.push(await scrapeRuntimeControls(page, `selected-${surface.family}`));
      const appearance = page
        .getByTestId("card-contextual-object-tools")
        .getByRole("button", { name: /^Appearance$/i })
        .first();
      if (await appearance.isVisible().catch(() => false)) {
        await ownerClick(appearance, `${surface.family} Appearance`);
        snapshots.push(await scrapeRuntimeControls(page, `appearance-${surface.family}`));
        if (await page.getByTestId("deep-left-edit-drawer").isVisible().catch(() => false)) {
          await page.keyboard.press("Escape");
        }
        await dismissSaveDialogIfPresent(page);
      }
    }

    const merged = mergeRuntimeInventories(snapshots);
    const enabled = merged.filter((c) => c.enabled);
    const finalReport = {
      capturedAt: new Date().toISOString(),
      productSha: PRODUCT_SHA,
      contexts: snapshots.length,
      uniqueControls: merged.length,
      enabledVisible: enabled.length,
      withTestId: enabled.filter((c) => c.testId).length,
      withoutTestId: enabled.filter((c) => !c.testId).length,
      controls: merged,
      physicalDisclosures: true,
    };
    const finalPath = path.join(EVIDENCE_ROOT, "_manifest", `runtime-inventory-final-${PRODUCT_SHA.slice(0, 7)}.json`);
    fs.mkdirSync(path.dirname(finalPath), { recursive: true });
    fs.writeFileSync(finalPath, JSON.stringify(finalReport, null, 2));
    writeRuntimeInventory(
      {
        capturedAt: finalReport.capturedAt,
        contextLabel: "merged-final",
        totalDiscovered: merged.length,
        enabledVisible: enabled.length,
        disabledOrHidden: merged.length - enabled.length,
        controls: merged,
      },
      "runtime-inventory-merged.json"
    );

    const baseline = loadBaselineMerged();
    expect(baseline, "Baseline runtime inventory JSON missing — capture baseline before diff").toBeTruthy();

    const baselineKeys = new Set((baseline!.controls || []).map(stableKey));
    const finalKeys = new Set(merged.map(stableKey));
    const added = [...finalKeys].filter((k) => !baselineKeys.has(k));
    const removed = [...baselineKeys].filter((k) => !finalKeys.has(k));

    const explanationsPath = path.join(
      process.cwd(),
      "docs/product-reconstitution/creative-studio-platform/RUNTIME_INVENTORY_DRIFT_EXPLANATIONS.json"
    );
    const explanations = fs.existsSync(explanationsPath)
      ? (JSON.parse(fs.readFileSync(explanationsPath, "utf8")) as {
          added?: Record<string, string>;
          removed?: Record<string, string>;
          renamed?: Record<string, string>;
        })
      : { added: {}, removed: {}, renamed: {} };

    const unexplainedAdded = added.filter((k) => !explanations.added?.[k] && !explanations.renamed?.[k]);
    const unexplainedRemoved = removed.filter(
      (k) => !explanations.removed?.[k] && !Object.values(explanations.renamed || {}).includes(k)
    );

    const diffReport = {
      capturedAt: new Date().toISOString(),
      baselineSha: "b4d903c92884cff68d6122dc7cc8dff4942a0023",
      finalSha: PRODUCT_SHA,
      baselineUnique: baseline!.uniqueControls,
      finalUnique: finalReport.uniqueControls,
      baselineEnabled: baseline!.enabledVisible,
      finalEnabled: finalReport.enabledVisible,
      added,
      removed,
      unexplainedAdded,
      unexplainedRemoved,
      unexplainedDrift: unexplainedAdded.length + unexplainedRemoved.length,
    };
    fs.writeFileSync(
      path.join(EVIDENCE_ROOT, "_manifest", "runtime-inventory-baseline-final-diff.json"),
      JSON.stringify(diffReport, null, 2)
    );

    expect(
      diffReport.unexplainedDrift,
      `Unexplained drift added=${unexplainedAdded.slice(0, 12).join(" || ")} removed=${unexplainedRemoved
        .slice(0, 12)
        .join(" || ")}`
    ).toBe(0);
  });
});
