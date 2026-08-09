/**
 * Google Font browser — family names render in their actual faces; first-use load works.
 */
import { expect, test } from "@playwright/test";
import {
  insertFamily,
  openBlankStudio,
  ownerClick,
} from "./owner-sim/physical-harness";

test.describe("Google Font browser faces", () => {
  test.setTimeout(180_000);

  test("font browser rows render distinct faces and apply to Text", async ({ page }) => {
    await openBlankStudio(page);
    const inserted = await insertFamily(page, "text");
    await inserted.node.click({ position: { x: 10, y: 10 } });

    const fontDoor = page
      .getByTestId("card-contextual-object-tools")
      .getByRole("button", { name: /Font|Aa|Typography/i })
      .first()
      .or(page.getByTestId("contextual-font").or(page.getByTestId("contextual-text-font")));
    await expect(fontDoor.first()).toBeVisible({ timeout: 15_000 });
    await ownerClick(fontDoor.first(), "Font");

    const search = page
      .getByTestId("font-browser-search")
      .or(page.getByTestId("contextual-font-search"))
      .or(page.getByPlaceholder(/Search Google Fonts|Search fonts/i))
      .first();
    await expect(search).toBeVisible({ timeout: 15_000 });

    const families = ["Playfair Display", "Bebas Neue", "Roboto Slab"];
    const faceKeys = new Set<string>();

    for (const family of families) {
      await search.fill(family);
      await page.waitForTimeout(400);
      const row = page
        .getByTestId("font-browser-results")
        .getByTestId(`font-family-${family.replace(/\s+/g, "-").toLowerCase()}`)
        .first();
      await expect(row, `Font row missing: ${family}`).toBeVisible({ timeout: 20_000 });
      await row.hover();
      await page.waitForFunction(
        (name) => document.fonts.check(`16px "${name}"`) || document.fonts.check(`16px ${name}`),
        family,
        { timeout: 25_000 }
      );
      const face = await row.evaluate((el) => getComputedStyle(el).fontFamily);
      expect(face.toLowerCase()).toContain(family.split(" ")[0]!.toLowerCase());
      faceKeys.add(face);
      await ownerClick(row, `Select ${family}`);
      const token = family.split(" ")[0]!.toLowerCase();
      await expect
        .poll(async () => ((await inserted.node.getAttribute("data-font-family")) || "").toLowerCase(), {
          timeout: 15_000,
        })
        .toContain(token);
    }

    expect(faceKeys.size).toBeGreaterThanOrEqual(2);
  });
});
