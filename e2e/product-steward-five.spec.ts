import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  dismissSaveDialogIfPresent,
  dismissTransientStudioChrome,
  evidenceShot,
  insertFamily,
  openAppearanceOverview,
  openBlankStudio,
  ownerClick,
} from "./owner-sim/physical-harness";

const EVIDENCE = path.join(process.cwd(), "tmp/owner-sim-physical-evidence/product-steward-five");

test.describe("Product-Steward five Owner improvements", () => {
  test.setTimeout(240_000);

  test.beforeAll(() => {
    fs.mkdirSync(EVIDENCE, { recursive: true });
  });

  test("Card label, text Color authority, Magic Write, More copy, Icon Artwork/Backing", async ({ page }) => {
    await openBlankStudio(page);

    // 1) Card terminology — Layers + contextual chip say Card (not Card root)
    await ownerClick(page.getByTestId("card-creative-tool-layers"), "Layers");
    await expect(page.getByTestId("card-layers-drawer").getByRole("button", { name: /^Card$/i })).toBeVisible();
    await ownerClick(page.getByTestId("card-layers-drawer").getByRole("button", { name: /^Card$/i }), "Layers Card");
    await expect(page.locator('[data-contextual-object="card-root"]')).toBeVisible();
    await expect(page.getByTestId("card-contextual-object-tools")).toContainText(/Card/i);
    await expect(page.getByTestId("card-contextual-object-tools")).not.toContainText(/Card root/i);
    await evidenceShot(page, "product-steward-five", "01-card-label");

    // 2) Text Appearance → Color opens shared Aa Color authority
    await insertFamily(page, "text");
    await openAppearanceOverview(page);
    await ownerClick(page.getByTestId("appearance-category-color"), "Appearance Color");
    await expect(page.getByTestId("text-appearance-controls")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("see-all-solid-colors")).toBeVisible();
    await evidenceShot(page, "product-steward-five", "02-text-color-authority");

    // 3) Magic Write on single Text
    await expect(page.getByTestId("contextual-magic-write")).toBeVisible();
    await ownerClick(page.getByTestId("contextual-magic-write"), "Magic Write");
    await expect(
      page.getByTestId("magic-write-panel").or(page.getByTestId("magic-write-open")).or(page.getByRole("dialog")).first()
    ).toBeVisible({ timeout: 15_000 });
    await evidenceShot(page, "product-steward-five", "03-magic-write-text");
    await page.keyboard.press("Escape").catch(() => undefined);
    await dismissSaveDialogIfPresent(page);
    await dismissTransientStudioChrome(page);

    // 4) More → Duplicate first; Copy uses composition clipboard (not JSON dump)
    await insertFamily(page, "text");
    await dismissSaveDialogIfPresent(page);
    await ownerClick(
      page.getByTestId("card-contextual-object-tools").getByRole("button", { name: /More actions/i }).first(),
      "More"
    );
    await expect(page.getByTestId("common-more-menu")).toBeVisible();
    const moreButtons = page.getByTestId("common-more-menu").locator("button");
    await expect(moreButtons.first()).toHaveText(/Duplicate/i);
    await expect(page.getByTestId("more-copy")).toBeVisible();
    await ownerClick(page.getByTestId("more-copy"), "Copy");
    await evidenceShot(page, "product-steward-five", "04-more-copy-composition");

    // 5) Icon Appearance → Artwork / Backing land on icon appearance sections (not Change Icon / Material)
    await insertFamily(page, "icon");
    await openAppearanceOverview(page);
    await ownerClick(page.getByTestId("appearance-category-artwork"), "Appearance Artwork");
    await expect(page.getByTestId("icon-appearance-controls")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("icon-artwork-section")).toBeVisible();
    await expect(page.getByTestId("icon-backing-section")).toHaveCount(0);
    await evidenceShot(page, "product-steward-five", "05-icon-artwork");
    await ownerClick(page.getByTestId("icon-appearance-back"), "Back to Appearance");
    await expect(page.getByTestId("appearance-category-overview")).toBeVisible();
    await ownerClick(page.getByTestId("appearance-category-backing_surface"), "Appearance Backing");
    await expect(page.getByTestId("icon-backing-section")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("icon-artwork-section")).toHaveCount(0);
    await evidenceShot(page, "product-steward-five", "06-icon-backing");

    // Sibling: Badge still has Magic Write + Appearance
    await insertFamily(page, "badge");
    await expect(page.getByTestId("contextual-magic-write")).toBeVisible();
    await expect(page.getByTestId("contextual-badge-appearance")).toBeVisible();
    await evidenceShot(page, "product-steward-five", "07-badge-sibling");
  });
});
