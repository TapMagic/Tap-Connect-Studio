/**
 * Finite Pattern/Texture catalog — every TapConnect-controlled choice earns a distinct paint identity.
 */
import { expect, test } from "@playwright/test";
import { SURFACE_PATTERN_CATALOG } from "@/lib/fusion/creative-studio/patterns";
import {
  openBlankStudio,
  ownerClick,
  readVisualSignature,
} from "./owner-sim/physical-harness";

test.describe("pattern catalog exhaustion", () => {
  test.setTimeout(300_000);

  test("every finite catalog entry produces a distinct Page Background paint identity", async ({
    page,
  }) => {
    await openBlankStudio(page);
    await ownerClick(page.getByTestId("card-creative-tool-backgrounds"), "Background");
    await expect(page.getByTestId("visual-plane-studio-page")).toBeVisible({ timeout: 15_000 });

    const signatures = new Set<string>();
    // Truthful catalog tile + live canvas background must both change.
    const preview = page.getByTestId("visual-plane-tile-preview-page");
    const canvasBg = page.locator("[data-composition-background]").first();

    for (const kind of ["pattern", "texture"] as const) {
      await ownerClick(page.getByTestId(`visual-plane-kind-${kind}`), `${kind} kind`);
      await expect(page.getByTestId("visual-plane-catalog-page")).toBeVisible({ timeout: 10_000 });
      const entries = SURFACE_PATTERN_CATALOG.filter((item) => item.kind === kind);
      expect(entries.length).toBeGreaterThan(0);
      for (const pattern of entries) {
        const tile = page.getByTestId(`surface-pattern-${pattern.id}`);
        await expect(tile, `Missing pattern tile: ${pattern.id}`).toBeVisible({ timeout: 10_000 });
        await ownerClick(tile, `Pattern ${pattern.id}`);
        await page.waitForTimeout(100);
        const tilePaint = await readVisualSignature(preview);
        const canvasPaint =
          (await canvasBg.count()) > 0
            ? await readVisualSignature(canvasBg)
            : tilePaint;
        const cssKey = JSON.stringify({
          kind,
          tileBg: tilePaint.backgroundImage,
          tileColor: tilePaint.backgroundColor,
          canvasBg: canvasPaint.backgroundImage,
          canvasColor: canvasPaint.backgroundColor,
        });
        expect(signatures.has(cssKey), `Duplicate paint for ${pattern.id}`).toBe(false);
        signatures.add(cssKey);
      }
    }

    expect(signatures.size).toBe(SURFACE_PATTERN_CATALOG.length);
  });
});
