/**
 * Physical media placement: OS drop, clipboard paste, replace, multi-file, SVG safety.
 * Requires local durable media (TAPCONNECT_DEV_AUTH + optional CREATIVE_PROVIDER_MODE=fixture).
 */
import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  dismissTransientStudioChrome,
  dropFilesOnCanvas,
  dropFilesOnNode,
  insertFamily,
  openBlankStudio,
  ownerClick,
  pasteImageOntoCanvas,
  redo,
  undo,
} from "./owner-sim/physical-harness";

const FIX = path.join(process.cwd(), "e2e/fixtures/media");

function filePayload(name: string, mime: string) {
  const base64 = fs.readFileSync(path.join(FIX, name)).toString("base64");
  return { name, mime, base64 };
}

test.describe("media direct placement", () => {
  test.setTimeout(240_000);

  test("OS drop, multi-file, replace, paste, safe SVG, reject unsafe SVG", async ({
    page,
  }) => {
    await openBlankStudio(page);
    const canvas = page.getByTestId("creative-composition-canvas");
    await expect(canvas).toHaveAttribute("data-media-drop", "ready", { timeout: 20_000 });

    // Studio node Copy/Paste first — before the canvas becomes image-dense
    const inserted = await insertFamily(page, "text");
    await expect(page.getByTestId("card-contextual-object-tools")).toBeVisible({ timeout: 10_000 });
    await ownerClick(
      page.getByTestId("card-contextual-object-tools").getByRole("button", { name: /More actions/i }),
      "More"
    );
    await ownerClick(page.getByTestId("more-copy"), "Copy to composition clipboard");
    // Toggle More closed so paste targets the canvas, not the menu.
    await ownerClick(
      page.getByTestId("card-contextual-object-tools").getByRole("button", { name: /More actions/i }),
      "Close More"
    );
    await expect(page.getByTestId("common-more-menu")).toHaveCount(0);
    const textCount = await page.locator("[data-composition-node][data-primitive='text']").count();
    // Composition clipboard is in-memory; Host paste listens for the window `paste` event.
    await page.evaluate(() => {
      const dt = new DataTransfer();
      window.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: dt }));
    });
    await expect
      .poll(async () => page.locator("[data-composition-node][data-primitive='text']").count(), {
        timeout: 15_000,
      })
      .toBeGreaterThan(textCount);
    await undo(page);
    await redo(page);
    await page.keyboard.press("Escape");
    await dismissTransientStudioChrome(page);
    void inserted;

    // Single OS-like drop → durable Image
    await dropFilesOnCanvas(page, [filePayload("product.png", "image/png")], { x: 40, y: 120 });
    await expect
      .poll(async () => page.locator("[data-composition-node][data-primitive='image']").count(), {
        timeout: 20_000,
      })
      .toBeGreaterThanOrEqual(1);
    const image = page.locator("[data-composition-node][data-primitive='image']").last();
    const firstAsset = (await image.getAttribute("data-media-asset-id")) || "";
    expect(firstAsset).toBeTruthy();
    const src = await image.locator("img").first().getAttribute("src");
    expect(String(src || "")).not.toMatch(/^blob:/);

    // Replace-on-drop with a different durable asset (SVG logo)
    await dropFilesOnNode(page, image, [filePayload("safe-logo.svg", "image/svg+xml")]);
    await expect
      .poll(async () => {
        const next = (await image.getAttribute("data-media-asset-id")) || "";
        return Boolean(next) && next !== firstAsset;
      }, { timeout: 15_000 })
      .toBeTruthy();

    // Multi-file → place individually (offset grid)
    const beforeMulti = await page.locator("[data-composition-node][data-primitive='image']").count();
    await dropFilesOnCanvas(page, [
      filePayload("product.png", "image/png"),
      filePayload("product-b.png", "image/png"),
    ], { x: 200, y: 200 });
    await expect
      .poll(async () => page.locator("[data-composition-node][data-primitive='image']").count(), {
        timeout: 25_000,
      })
      .toBe(beforeMulti + 2);

    // Clipboard image paste
    const countBeforePaste = await page.locator("[data-composition-node][data-primitive='image']").count();
    await pasteImageOntoCanvas(page, filePayload("product-b.png", "image/png"));
    await expect
      .poll(async () => page.locator("[data-composition-node][data-primitive='image']").count(), {
        timeout: 20_000,
      })
      .toBe(countBeforePaste + 1);

    // Unsafe SVG: sanitize may retain a safe silhouette, but scripting must never execute.
    await page.evaluate(() => {
      (window as unknown as { __BADGER_SVG_EXECUTED?: boolean }).__BADGER_SVG_EXECUTED = false;
    });
    const countBeforeUnsafe = await page.locator("[data-composition-node][data-primitive='image']").count();
    await dropFilesOnCanvas(page, [filePayload("unsafe-script.svg", "image/svg+xml")], {
      x: 80,
      y: 260,
    });
    await page.waitForTimeout(1200);
    const executed = await page.evaluate(
      () => (window as unknown as { __BADGER_SVG_EXECUTED?: boolean }).__BADGER_SVG_EXECUTED === true
    );
    expect(executed, "unsafe SVG script must not execute").toBe(false);
    const afterUnsafe = await page.locator("[data-composition-node][data-primitive='image']").count();
    expect(afterUnsafe === countBeforeUnsafe || afterUnsafe === countBeforeUnsafe + 1).toBeTruthy();
    if (afterUnsafe === countBeforeUnsafe + 1) {
      const unsafeNode = page.locator("[data-composition-node][data-primitive='image']").last();
      const unsafeSrc = await unsafeNode.locator("img").first().getAttribute("src");
      expect(String(unsafeSrc || "")).toMatch(/\/api\/media\//);
      if (unsafeSrc?.startsWith("/")) {
        const res = await page.request.get(unsafeSrc);
        const body = await res.text();
        expect(body.toLowerCase()).not.toContain("<script");
        expect(body.toLowerCase()).not.toContain("onclick=");
      }
    }
  });

  test("Media Browser stacks above contextual object toolbar", async ({ page }) => {
    await openBlankStudio(page);
    await insertFamily(page, "text");
    await expect(page.getByTestId("card-contextual-object-tools")).toBeVisible({ timeout: 10_000 });
    await ownerClick(page.getByTestId("card-creative-tool-assets"), "Assets rail");
    await ownerClick(page.getByRole("button", { name: /Browse media & assets/i }), "Browse media");
    await expect(page.getByTestId("shared-media-browser")).toBeVisible({ timeout: 10_000 });
    const stacking = await page.evaluate(() => {
      const overlay = document.querySelector('[data-testid="shared-media-browser-overlay"]');
      const toolbar = document.querySelector('[data-testid="card-contextual-object-tools"]');
      if (!overlay) return { ok: false, overlayZ: 0, toolbarZ: 0 };
      const oz = Number.parseInt(getComputedStyle(overlay).zIndex || "0", 10);
      const tz = toolbar ? Number.parseInt(getComputedStyle(toolbar).zIndex || "0", 10) : 0;
      return { ok: oz > tz, overlayZ: oz, toolbarZ: tz };
    });
    expect(stacking.ok, `media overlay z (${stacking.overlayZ}) must exceed toolbar z (${stacking.toolbarZ})`).toBe(
      true
    );
    await ownerClick(page.getByRole("tab", { name: /Pexels/i }), "Pexels tab above toolbar");
    await expect(page.getByRole("tab", { name: /Pexels/i })).toHaveAttribute("aria-selected", "true");
    await ownerClick(page.getByRole("button", { name: /Close Media and Asset Browser/i }), "Close media");
  });
});
