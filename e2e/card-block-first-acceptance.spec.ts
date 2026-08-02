import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const enabled = process.env.CARD_BLOCK_ACCEPTANCE === "1";
const evidence = path.join("tmp", "card-block-first-acceptance");

async function openOutline(page: Page) {
  await page.getByTestId("card-tool-outline").click();
  await expect(page.getByTestId("card-drawer-outline")).toBeVisible();
}

async function addBlock(page: Page, kind: string) {
  await openOutline(page);
  const button = page.getByTestId(`card-drawer-add-${kind}`);
  await button.scrollIntoViewIfNeeded();
  await button.click();
  await expect(page.getByTestId("selection-panel-stack")).toBeVisible();
}

async function openFields(page: Page) {
  await page.getByTestId("selection-open-fields").click();
  await expect(page.getByTestId("selection-panel-fields")).toBeVisible();
}

test.describe("block-first Card visible acceptance", () => {
  test.skip(!enabled, "Set CARD_BLOCK_ACCEPTANCE=1 with an authenticated local fixture");
  test.describe.configure({ timeout: 360_000 });

  test("builds, edits, arranges, persists, previews and publishes through visible controls", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dashboard/card/edit");
    await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible({ timeout: 60_000 });

    await openOutline(page);
    await page.getByTestId("card-start-blank").click();
    await expect(page.getByTestId("card-empty-builder-state")).toContainText("Your Card is ready to build.");

    await addBlock(page, "logo_block");
    await page.getByRole("button", { name: "Open Brand" }).click();
    const brandLogo = page.getByTestId("brand-select-primary-logo");
    if (await brandLogo.count()) await brandLogo.click();

    await addBlock(page, "identity");
    await openFields(page);
    await page.getByLabel("Identity name").fill("Block First Tap House");
    await page.getByLabel("Identity headline").fill("A useful Card, built directly");
    await expect(page.getByTestId("card-preview-phone")).toContainText("Block First Tap House");

    await addBlock(page, "text");
    await openFields(page);
    await page.getByTestId("card-content-text").fill("Tonight we are open after the game.");
    await page.getByTestId("card-content-source-mode").selectOption("LOCAL");
    await expect(page.getByTestId("card-preview-phone")).toContainText("Tonight we are open after the game.");

    await addBlock(page, "image");
    await addBlock(page, "map");
    await openFields(page);
    await page.getByTestId("card-content-address").fill("123 Main Street, Ocala, FL");
    await addBlock(page, "action-call");
    await openFields(page);
    await page.getByTestId("card-content-href").fill("tel:+13525550123");
    await addBlock(page, "action-website");
    await openFields(page);
    await page.getByTestId("card-content-href").fill("https://example.com");
    await addBlock(page, "action-custom");
    await openFields(page);
    await page.getByTestId("card-content-href").fill("https://example.com/menu");

    await addBlock(page, "special_offer");
    await openFields(page);
    const offer = page.getByTestId("card-local-offer-fields");
    await offer.getByLabel("Offer heading").fill("Free Fries Tonight");
    await offer.getByLabel("Offer description").fill("One order with any entrée after the game.");
    await offer.getByLabel("Offer code").fill("FRIES");
    await offer.getByLabel("Offer terms").fill("While supplies last.");
    await expect(page.getByTestId("card-preview-phone")).toContainText("Free Fries Tonight");

    await openOutline(page);
    const rows = page.locator('[data-testid^="card-outline-row-"]');
    await expect(rows).toHaveCount(10);
    const lastRow = rows.last();
    const rowTestId = await lastRow.getAttribute("data-testid");
    const sectionId = rowTestId!.replace("card-outline-row-", "");
    await page.getByTestId(`card-outline-menu-${sectionId}`).click();
    await page.getByRole("menuitem", { name: "Move to top" }).click();
    await page.getByTestId(`card-outline-visibility-${sectionId}`).click();
    await page.getByTestId(`card-outline-visibility-${sectionId}`).click();
    await page.getByTestId(`card-outline-lock-${sectionId}`).click();
    await page.getByTestId(`card-outline-lock-${sectionId}`).click();
    await page.getByTestId("card-undo").click();
    await page.getByTestId("card-redo").click();

    await page.screenshot({ path: path.join(evidence, "01-built-desktop.png"), fullPage: false });
    await page.getByTestId("card-save").first().click();
    await expect(page.getByTestId("studio-save-state")).toHaveAttribute("data-saved", "true", { timeout: 30_000 });
    await page.reload();
    await expect(page.getByTestId("card-preview-phone")).toContainText("Free Fries Tonight", { timeout: 60_000 });

    await page.getByTestId("card-edit-open-preview").click();
    await expect(page.getByTestId("card-preview-host")).toBeVisible();
    await page.goto("/dashboard/card/edit");
    await expect(page.getByTestId("card-publish").first()).toBeEnabled({ timeout: 60_000 });
    await page.getByTestId("card-publish").first().click();
    await expect(page.getByTestId("card-publication-state").first()).toContainText("Published", { timeout: 30_000 });

    const desktopA11y = await new AxeBuilder({ page }).analyze();
    expect(desktopA11y.violations).toEqual([]);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId("card-mobile-tool-rail")).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "02-built-mobile-390.png"), fullPage: false });
  });
});
