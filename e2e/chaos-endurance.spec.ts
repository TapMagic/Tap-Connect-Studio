/**
 * Deterministic chaos + endurance Owner sequences.
 * Enable: OWNER_SIM_CHAOS=1
 */
import { expect, test } from "@playwright/test";
import {
  dismissTransientStudioChrome,
  insertFamily,
  openBlankStudio,
  ownerClick,
  redo,
  undo,
} from "./owner-sim/physical-harness";

const enabled = process.env.OWNER_SIM_CHAOS === "1";

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

async function safe(label: string, fn: () => Promise<void>) {
  try {
    await Promise.race([
      fn(),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error(`timeout:${label}`)), 8_000)
      ),
    ]);
  } catch {
    // Chaos continues — timeouts are recorded via path, not fatal unless invariants break.
  }
}

const ACTIONS = [
  "select-text",
  "appearance",
  "escape",
  "duplicate",
  "undo",
  "layers",
  "background",
  "tools",
] as const;

test.describe("chaos + endurance", () => {
  test.skip(!enabled, "Set OWNER_SIM_CHAOS=1");
  test.setTimeout(180_000);

  for (const seed of [7, 42, 99]) {
    test(`deterministic chaos seed=${seed}`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(String(err)));

      await openBlankStudio(page);
      await insertFamily(page, "text");
      await insertFamily(page, "button");
      const rand = mulberry32(seed);
      const path: string[] = [];

      for (let i = 0; i < 12; i += 1) {
        const action = ACTIONS[Math.floor(rand() * ACTIONS.length)]!;
        path.push(action);
        await safe(action, async () => {
          switch (action) {
            case "select-text": {
              const text = page.locator("[data-composition-node][data-primitive='text']").first();
              if (await text.isVisible()) await text.click({ position: { x: 8, y: 8 }, timeout: 3_000 });
              break;
            }
            case "appearance": {
              const door = page
                .getByTestId("card-contextual-object-tools")
                .getByRole("button", { name: /^Appearance$/i })
                .first();
              if (await door.isVisible()) await door.click({ timeout: 3_000 });
              break;
            }
            case "duplicate": {
              const more = page
                .getByTestId("card-contextual-object-tools")
                .getByRole("button", { name: /More actions/i });
              if (await more.isVisible()) {
                await more.click({ timeout: 3_000 });
                const dup = page
                  .getByTestId("common-more-menu")
                  .getByRole("button", { name: /^Duplicate$/i });
                if (await dup.isVisible()) await dup.click({ timeout: 3_000 });
              }
              break;
            }
            case "undo":
              if (await page.getByTestId("card-undo").isEnabled()) await undo(page);
              break;
            case "layers":
              await page.getByTestId("card-creative-tool-layers").click({ timeout: 3_000 });
              break;
            case "background":
              await page.getByTestId("card-creative-tool-backgrounds").click({ timeout: 3_000 });
              break;
            case "tools":
              await page.getByTestId("card-creative-tool-tools").click({ timeout: 3_000 });
              break;
            case "escape":
              await page.keyboard.press("Escape");
              await dismissTransientStudioChrome(page);
              break;
          }
        });
        await expect(page.getByTestId("card-edit-workspace-host")).toHaveAttribute(
          "data-builder-ready",
          "true"
        );
        await expect(page.getByTestId("creative-composition-canvas")).toBeVisible();
      }

      const blocking = errors.filter(
        (e) => !/Download the React DevTools|Clerk|favicon|ResizeObserver|hydration/i.test(e)
      );
      expect(blocking, `page errors seed=${seed} path=${path.join(">")}: ${blocking.join(" | ")}`).toEqual(
        []
      );
    });
  }

  test("endurance drawer/selection cycles", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(String(err)));
    await openBlankStudio(page);
    await insertFamily(page, "text");

    for (let cycle = 0; cycle < 6; cycle += 1) {
      await safe("background", async () => {
        await page.getByTestId("card-creative-tool-backgrounds").click({ timeout: 3_000 });
      });
      await page.keyboard.press("Escape");
      await dismissTransientStudioChrome(page);

      await safe("layers", async () => {
        await page.getByTestId("card-creative-tool-layers").click({ timeout: 3_000 });
      });
      await page.keyboard.press("Escape");

      const text = page.locator("[data-composition-node][data-primitive='text']").first();
      await safe("select", async () => {
        await text.click({ position: { x: 8, y: 8 }, timeout: 3_000 });
      });
      await safe("undo-redo", async () => {
        if (await page.getByTestId("card-undo").isEnabled()) await undo(page);
        if (await page.getByTestId("card-redo").isEnabled()) await redo(page);
      });

      await expect(page.getByTestId("creative-composition-canvas")).toBeVisible();
    }

    const blocking = errors.filter((e) => !/Download the React DevTools|Clerk|favicon/i.test(e));
    expect(blocking).toEqual([]);
  });
});
