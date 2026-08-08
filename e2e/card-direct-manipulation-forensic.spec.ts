import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import path from "node:path";

const enabled = process.env.CARD_DIRECT_MANIPULATION_FORENSIC_ACCEPTANCE === "1";
const evidence = path.join("tmp", "card-direct-manipulation-forensic");

async function openStudio(page: Page) {
  await page.goto("/dashboard/card/edit", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("card-edit-workspace-host")).toHaveAttribute("data-builder-ready", "true", { timeout: 60_000 });
  await expect(page.getByTestId("card-creative-tool-rail")).toBeVisible();
  await page.getByTestId("card-creative-tool-templates").click();
  await page.getByTestId("card-template-library").getByRole("button", { name: "Blank Card" }).click();
}

async function boxes(locator: Locator) {
  const count = await locator.count();
  return Promise.all(Array.from({ length: count }, (_, index) => locator.nth(index).boundingBox()));
}

function overlaps(a: NonNullable<Awaited<ReturnType<Locator["boundingBox"]>>>, b: NonNullable<Awaited<ReturnType<Locator["boundingBox"]>>>) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

test.describe("Card direct-manipulation forensic completion", () => {
  test.skip(!enabled, "Set CARD_DIRECT_MANIPULATION_FORENSIC_ACCEPTANCE=1 with the authenticated local fixture");
  test.setTimeout(240_000);

  test("proves additive Badges and Buttons, Layers recovery, media, nested content, panel docking, and clean Preview", async ({ page }) => {
    page.setDefaultTimeout(15_000);
    await page.setViewportSize({ width: 1600, height: 1000 });
    await openStudio(page);
    const root = page.getByTestId("card-root-canvas");

    await page.getByTestId("card-creative-tool-elements").click();
    const badges = page.getByTestId("card-badge-library");
    for (const wording of ["SALE", "VIP", "LIMITED"] as const) {
      await badges.getByRole("button", { name: wording, exact: true }).click();
    }
    const badgeNodes = root.locator('[data-composition-node][data-primitive="shape"] [data-badge-shape]').locator("..");
    await expect(badgeNodes).toHaveCount(3);
    await expect(root).toContainText("SALE");
    await expect(root).toContainText("VIP");
    await expect(root).toContainText("LIMITED");
    const badgeBoxes = (await boxes(badgeNodes)).filter((box): box is NonNullable<typeof box> => Boolean(box));
    expect(badgeBoxes).toHaveLength(3);
    for (let first = 0; first < badgeBoxes.length; first += 1) {
      for (let second = first + 1; second < badgeBoxes.length; second += 1) {
        expect(overlaps(badgeBoxes[first]!, badgeBoxes[second]!)).toBe(false);
      }
    }
    await page.screenshot({ path: path.join(evidence, "01-additive-non-overlapping-badges.png") });

    await page.getByTestId("card-creative-tool-layers").click();
    const layers = page.getByTestId("card-layers-drawer");
    await expect(layers.locator("[data-layer-object-id]")).toHaveCount(3);
    const firstLayerId = await layers.locator("[data-layer-object-id]").first().getAttribute("data-layer-object-id");
    expect(firstLayerId).toBeTruthy();
    await layers.locator(`[data-layer-object-id="${firstLayerId}"]`).getByRole("button", { name: "Badge", exact: true }).click();
    await expect(root.locator(`[data-composition-node="${firstLayerId}"]`)).toHaveAttribute("data-selected", "true");
    await expect(page.getByTestId("contextual-content")).toBeVisible();
    await expect(page.getByTestId("contextual-surface")).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "02-layers-authoritative-badge-selection.png") });

    await layers.getByRole("button", { name: "Card", exact: true }).click();
    await page.getByTestId("card-creative-tool-buttons").click();
    for (const preset of ["website-outline", "call-round", "claim-gloss"] as const) {
      await page.getByTestId(`button-preset-${preset}`).click();
    }
    const buttonNodes = root.locator('[data-composition-node][data-primitive="button"]');
    await expect(buttonNodes).toHaveCount(3);
    await expect(badgeNodes).toHaveCount(3);
    await page.screenshot({ path: path.join(evidence, "03-buttons-do-not-replace-badges.png") });

    await buttonNodes.first().click();
    await expect(page.getByTestId("contextual-button-content")).toBeVisible();
    await page.getByTestId("card-creative-tool-layers").click();
    const nestedButtonObjects = layers.locator("[data-nested-object-id]");
    await expect(nestedButtonObjects).toHaveCount(6);
    await nestedButtonObjects.first().click();
    await expect(page.getByTestId("contextual-button-content")).toHaveAttribute("aria-pressed", "true");
    await page.screenshot({ path: path.join(evidence, "04-button-nested-content-in-layers.png") });

    await layers.getByRole("button", { name: "Card", exact: true }).click();
    await page.getByTestId("card-creative-tool-elements").click();
    await page.getByTestId("card-elements-library").getByText("Image", { exact: true }).first().click();
    await expect(page.getByTestId("card-assets-library")).toBeVisible();
    await expect(root).not.toContainText("Add image URL in inspector");
    await page.getByRole("button", { name: "Place product thumbnail" }).click();
    const selectedImage = root.locator('[data-composition-node][data-primitive="image"]').last();
    await selectedImage.click();
    await expect(page.getByTestId("contextual-replace-media")).toHaveText("Replace");
    await page.getByTestId("contextual-replace-media").click();
    await expect(page.getByTestId("element-media-controls")).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "05-image-shared-media-browser.png") });

    await page.getByTestId("card-creative-tool-brand").click();
    await page.getByAltText("Primary logo preview").click();
    const logo = root.locator('[data-composition-node][data-primitive="image"]').last();
    await logo.click();
    await expect(logo).toHaveAttribute("data-selected", "true");

    await page.getByTestId("card-creative-tool-build").click();
    await page.getByTestId("composer-add-section-blank").click();
    await expect(page.getByTestId("card-contextual-object-tools")).toHaveAttribute("data-contextual-object", "section");
    await page.getByRole("button", { name: "Appearance", exact: true }).click();
    const panel = page.getByTestId("contextual-section-surface-drawer");
    const card = page.getByTestId("card-preview-phone");
    const [panelBox, cardBox] = await Promise.all([panel.boundingBox(), card.boundingBox()]);
    expect(panelBox).not.toBeNull();
    expect(cardBox).not.toBeNull();
    expect(overlaps(panelBox!, cardBox!)).toBe(false);
    await page.screenshot({ path: path.join(evidence, "06-section-surface-docked-in-gutter.png") });

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(panel).toBeVisible();
    const mobilePanel = await panel.boundingBox();
    expect(mobilePanel).not.toBeNull();
    expect(Math.abs((mobilePanel!.y + mobilePanel!.height) - 842)).toBeLessThanOrEqual(8);
    expect(await page.getByTestId("card-edit-workspace-host").evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: path.join(evidence, "07-mobile-bottom-sheet.png") });

    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.getByTestId("card-preview-as-customer").click();
    await expect(page.getByTestId("card-creative-tool-rail")).toHaveCount(0);
    await expect(page.getByTestId("card-contextual-object-tools")).toHaveCount(0);
    await expect(page.locator('[data-edit-selects="true"]')).toHaveCount(0);
    await page.screenshot({ path: path.join(evidence, "08-clean-preview.png") });

    const a11y = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(a11y.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical")).toEqual([]);
  });
});
