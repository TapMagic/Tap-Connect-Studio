/**
 * Physical runtime inventory capture (baseline or final).
 * OWNER_SIM_INVENTORY_CAPTURE=baseline|final
 */
import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  EVIDENCE_ROOT,
  dismissSaveDialogIfPresent,
  insertFamily,
  openBlankStudio,
  ownerClick,
  writeServerIdentity,
} from "./owner-sim/physical-harness";
import { INSERT_SURFACES } from "./owner-sim/interaction-manifest";
import {
  mergeRuntimeInventories,
  scrapeRuntimeControls,
  writeRuntimeInventory,
} from "./owner-sim/runtime-inventory";

const mode = process.env.OWNER_SIM_INVENTORY_CAPTURE; // baseline | final
const enabled = mode === "baseline" || mode === "final";
const labelSha =
  mode === "baseline"
    ? "b4d903c"
    : (process.env.PRODUCT_CERT_SHA || "55e2955299ca49e04902b3c9e9d6818d7889c953").slice(0, 7);

test.describe("runtime inventory capture", () => {
  test.skip(!enabled, "Set OWNER_SIM_INVENTORY_CAPTURE=baseline|final");
  test.setTimeout(300_000);

  test(`capture ${mode} inventory physically`, async ({ page }) => {
    writeServerIdentity();
    await openBlankStudio(page);
    const snapshots = [await scrapeRuntimeControls(page, "blank-card-root")];

    const prefsSummary = page
      .getByTestId("editor-preferences-menu")
      .locator("summary")
      .or(page.getByRole("button", { name: /Editor theme and canvas assistance|Canvas assistance/i }))
      .first();
    if (await prefsSummary.isVisible().catch(() => false)) {
      await ownerClick(prefsSummary, "Preferences");
      snapshots.push(
        await scrapeRuntimeControls(page, "editor-preferences", {
          withinSelector: '[data-testid="editor-preferences-menu"]',
        })
      );
      await page.keyboard.press("Escape");
      await dismissSaveDialogIfPresent(page);
    }

    const overflowSummary = page.getByTestId("card-overflow-menu").locator("summary").first();
    if ((await overflowSummary.count()) > 0 && (await overflowSummary.isVisible().catch(() => false))) {
      await ownerClick(overflowSummary, "Overflow");
      snapshots.push(
        await scrapeRuntimeControls(page, "overflow-menu", {
          withinSelector: '[data-testid="card-overflow-menu"]',
        })
      );
      await page.keyboard.press("Escape");
      await dismissSaveDialogIfPresent(page);
    }

    // Contextual Card-root Background (surface materials / legacy root paint)
    await dismissSaveDialogIfPresent(page);
    const rootBg = page.locator('[data-contextual-object="card-root"]').getByRole("button", { name: /^Background$/i });
    if (await rootBg.isVisible().catch(() => false)) {
      await ownerClick(rootBg, "Card root Background");
      snapshots.push(await scrapeRuntimeControls(page, "root-contextual-background"));
      await page.keyboard.press("Escape");
      await dismissSaveDialogIfPresent(page);
    }

    // Rail Background → Visual Plane (Page) when present on this SHA
    if (await page.getByTestId("card-creative-tool-backgrounds").isVisible().catch(() => false)) {
      await ownerClick(page.getByTestId("card-creative-tool-backgrounds"), "Backgrounds rail");
      const plane = page.getByTestId("visual-plane-studio-page");
      if (await plane.isVisible().catch(() => false)) {
        snapshots.push(await scrapeRuntimeControls(page, "visual-plane-page"));
        const pattern = page.getByTestId("visual-plane-kind-pattern");
        if (await pattern.isVisible().catch(() => false)) {
          await ownerClick(pattern, "Visual Plane Pattern");
          snapshots.push(await scrapeRuntimeControls(page, "visual-plane-pattern-catalog"));
        }
      } else {
        snapshots.push(await scrapeRuntimeControls(page, "backgrounds-rail-legacy"));
      }
      await page.keyboard.press("Escape");
      await dismissSaveDialogIfPresent(page);
    }

    for (const surface of INSERT_SURFACES) {
      try {
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
          await page.keyboard.press("Escape");
          await dismissSaveDialogIfPresent(page);
        }
      } catch (error) {
        // Baseline SHA may lack some insert surfaces — record unavailable, do not invent controls.
        snapshots.push({
          capturedAt: new Date().toISOString(),
          contextLabel: `unavailable-${surface.family}`,
          totalDiscovered: 0,
          enabledVisible: 0,
          disabledOrHidden: 0,
          controls: [],
          note: String(error instanceof Error ? error.message : error),
        } as Awaited<ReturnType<typeof scrapeRuntimeControls>> & { note?: string });
      }
    }

    const merged = mergeRuntimeInventories(snapshots);
    const enabledControls = merged.filter((c) => c.enabled);
    const report = {
      capturedAt: new Date().toISOString(),
      mode,
      labelSha,
      contexts: snapshots.length,
      uniqueControls: merged.length,
      enabledVisible: enabledControls.length,
      controls: merged,
      physicalDisclosures: true,
    };
    const outName =
      mode === "baseline"
        ? "runtime-inventory-baseline-b4d903c.json"
        : `runtime-inventory-final-${labelSha}.json`;
    const outPath = path.join(EVIDENCE_ROOT, "_manifest", outName);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
    // Also copy baseline into docs for permanence when capturing baseline.
    if (mode === "baseline") {
      const docsPath = path.join(
        process.cwd(),
        "docs/product-reconstitution/creative-studio-platform/runtime-inventory-baseline-b4d903c.json"
      );
      fs.writeFileSync(docsPath, JSON.stringify(report, null, 2));
    }
    // Snapshot alias must not overwrite the full capture report above.
    writeRuntimeInventory(
      {
        capturedAt: report.capturedAt,
        contextLabel: `capture-${mode}`,
        totalDiscovered: merged.length,
        enabledVisible: enabledControls.length,
        disabledOrHidden: merged.length - enabledControls.length,
        controls: merged,
      },
      `runtime-inventory-capture-${mode}-snapshot.json`
    );
    // Re-assert the authoritative report path after any secondary writes.
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
    expect(merged.length).toBeGreaterThan(20);
  });
});
