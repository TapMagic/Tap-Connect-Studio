import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const evidence = path.resolve(
  process.cwd(),
  "tmp/creative-platform-completion-owner-evidence"
);

async function openComposition(page: Page) {
  await page.goto("/dashboard/card/edit", { waitUntil: "networkidle" });
  await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible({
    timeout: 60_000,
  });
  await page.getByTestId("card-tool-composition").click();
  const add = page.getByTestId("composition-drawer-add");
  if (await add.isVisible().catch(() => false)) await add.click();
  await expect(page.getByTestId("composition-panel-stack")).toBeVisible({
    timeout: 20_000,
  });
}

test.describe.serial("Creative Platform completion Owner workflow", () => {
  test.setTimeout(120_000);

  test("Gradient and Background Studios work on desktop and mobile", async ({
    page,
  }) => {
    await openComposition(page);
    await page.getByTestId("composition-open-background").click();
    await page.getByTestId("composition-bg-gradient").click();
    await page.getByTestId("gradient-advanced-toggle").click();
    await page.getByTestId("gradient-add-stop").click();
    await page.getByTestId("gradient-kind-radial").click();
    await page.getByTestId("gradient-stop-position").fill("42");
    await expect(page.getByTestId("gradient-preview")).toBeVisible();
    await expect(page.getByTestId("gradient-contrast-assistance")).toBeVisible();
    await expect(
      page.getByTestId("reusable-design-browser-gradient")
    ).toBeVisible();
    await page.screenshot({
      path: path.join(evidence, "01-gradient-studio-desktop.png"),
      fullPage: true,
    });

    await page.getByTestId("composition-bg-pattern").click();
    await expect(page.getByTestId("pattern-studio")).toBeVisible();
    await page.getByTestId("composition-bg-image").click();
    await expect(page.getByTestId("composition-background-image-controls")).toBeVisible();
    await expect(page.getByTestId("background-image-scale")).toBeVisible();
    await expect(page.getByTestId("background-image-blend-mode")).toBeVisible();
    await page.screenshot({
      path: path.join(evidence, "02-background-studio-desktop.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByTestId("composition-bg-gradient").click();
    const studio = page.getByTestId("gradient-studio");
    await expect(studio).toBeVisible();
    const box = await studio.boundingBox();
    expect(box?.width || 0).toBeLessThanOrEqual(390);
    await page.screenshot({
      path: path.join(evidence, "03-gradient-background-mobile.png"),
      fullPage: true,
    });
  });

  test("outlines, masks, image treatment, Shape Studio, layers, and history are usable", async ({
    page,
  }) => {
    await openComposition(page);
    await page.getByTestId("composition-add-frame").click();
    const borderWidth = page.getByTestId("composition-frame-border-width");
    await borderWidth.fill("10");
    await borderWidth.fill("2");
    await expect(borderWidth).toHaveValue("2");
    await page.getByTestId("composition-frame-scale-stroke").uncheck();
    await page.getByTestId("composition-open-masks").click();
    await page.getByTestId("mask-search").fill("shirt");
    await page.getByTestId("composition-mask-shirt").click();
    await page
      .getByRole("button", { name: /(Add|Remove) Shirt favorite/i })
      .click();
    await page.getByTestId("mask-reset").click();
    await expect(page.getByTestId("composition-mask-rectangle")).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await page.screenshot({
      path: path.join(evidence, "04-outline-mask-studio.png"),
      fullPage: true,
    });

    await page.getByTestId("panel-stack-back").click();
    await page.getByTestId("panel-stack-back").click();
    await page.getByTestId("composition-add-image").click();
    await expect(page.getByTestId("composition-image-outline")).toBeVisible();
    await page.getByTestId("composition-image-crop-1-1").click();
    await page.getByTestId("composition-image-reset").click();

    await page.getByTestId("panel-stack-back").click();
    await page.getByTestId("composition-add-shape").click();
    await expect(page.getByTestId("shape-studio")).toBeVisible();
    await page.getByTestId("shape-studio").getByRole("button", { name: /star/i }).click();
    await page
      .getByTestId("shape-studio")
      .getByRole("button", { name: /gradient/i })
      .click();
    await expect(page.getByTestId("gradient-studio")).toBeVisible();
    await page.screenshot({
      path: path.join(evidence, "05-shape-studio.png"),
      fullPage: true,
    });

    await page.getByTestId("panel-stack-back").click();
    const selectedLayer = page.locator('[data-testid^="composition-layer-"]').first();
    await selectedLayer.getByLabel(/Rename .* layer/).fill("Owner shape");
    await page.getByTestId("composition-copy").click();
    await page.getByTestId("composition-paste").click();
    await page
      .locator('[data-testid^="composition-layer-"]')
      .nth(1)
      .locator("button")
      .first()
      .click({ modifiers: ["Shift"] });
    await page.getByTestId("composition-hub-group").click();
    await page.getByTestId("composition-hub-lock").click();
    await page.getByTestId("composition-open-group").click();
    await page.getByTestId("composition-unlock").click();
    await page.getByTestId("composition-ungroup").click();
    await page.getByTestId("panel-stack-back").click();
    await page.getByTestId("composition-open-align").click();
    await expect(page.getByTestId("composition-distance-measurement")).toBeVisible();
    await page.getByTestId("composition-tidy").click();
    await page.getByTestId("panel-stack-back").click();
    await expect(page.getByTestId("composition-zoom-controls").last()).toBeVisible();
    await expect(page.getByTestId("composition-safe-area-guide").last()).toBeVisible();
    await page
      .locator('[data-testid^="composition-layer-"]')
      .first()
      .locator("button")
      .first()
      .click();
    const keyboardNode = page
      .locator('[data-testid="creative-composition-canvas"][data-edit-mode="true"]')
      .locator('[data-composition-node][data-selected="true"]')
      .last();
    await keyboardNode.focus();
    await expect(keyboardNode).toBeFocused();
    await expect(keyboardNode).toHaveAttribute("data-locked", "false");
    const topBefore = await keyboardNode.evaluate(
      (element) => (element as HTMLElement).style.top
    );
    await keyboardNode.press("ArrowDown");
    await expect
      .poll(() =>
        keyboardNode.evaluate((element) => (element as HTMLElement).style.top)
      )
      .not.toBe(topBefore);
    const topAfter = await keyboardNode.evaluate(
      (element) => (element as HTMLElement).style.top
    );
    await keyboardNode.press("Shift+ArrowDown");
    await expect
      .poll(() =>
        keyboardNode.evaluate((element) => (element as HTMLElement).style.top)
      )
      .not.toBe(topAfter);
    await page.getByTestId("card-undo").click();
    await page.getByTestId("card-redo").click();
    await page.getByRole("button", { name: "Zoom in" }).last().click();
    await page.getByTestId("composition-fit-canvas").last().click();

    const accessibility = await new AxeBuilder({ page })
      .include('[data-testid="card-edit-workspace-host"]')
      .analyze();
    expect(accessibility.violations).toEqual([]);
    await page.screenshot({
      path: path.join(evidence, "06-layers-precision-history.png"),
      fullPage: true,
    });
  });

  test("one approved composition is reused with structured flow across Card, Email, and Campaign", async ({
    page,
  }) => {
    const campaignId = "cms1cazaz0002gh9k33zrzlow";
    const resourceName = `Owner cross-surface ${Date.now()}`;

    await openComposition(page);
    const cardResources = page.getByTestId("reusable-design-browser-composition");
    await expect(cardResources).toBeVisible();
    await cardResources.getByLabel("Reusable design name").fill(resourceName);
    await cardResources.getByRole("button", { name: "Save as reusable" }).click();
    const cardResource = cardResources
      .locator("article")
      .filter({ hasText: resourceName })
      .locator("button")
      .first();
    await expect(cardResource).toBeVisible();
    await cardResource.click();
    await cardResources.getByRole("button", { name: "Approve", exact: true }).click();
    await expect(
      cardResources
        .locator("article")
        .filter({ hasText: resourceName })
        .getByText(/v1 · approved/i)
    ).toBeVisible();
    await page.screenshot({
      path: path.join(evidence, "07-card-reusable-composition.png"),
      fullPage: true,
    });

    await page.goto(`/dashboard/campaigns/${campaignId}/email`, {
      waitUntil: "networkidle",
    });
    await expect(page.getByTestId("email-authoring-workspace")).toBeVisible({
      timeout: 60_000,
    });
    await page.getByTestId("email-tool-content").click();
    const emailDrawer = page.getByTestId("email-contextual-drawer");
    await emailDrawer
      .getByLabel("Add email block type")
      .selectOption("creative_section");
    await emailDrawer.getByRole("button", { name: "Add", exact: true }).click();
    await page.getByTestId("email-tool-outline").click();
    await page
      .locator('[data-testid^="email-outline-block-"]')
      .filter({ hasText: "Reusable creative section" })
      .last()
      .click();
    await page.getByTestId("email-tool-content").click();
    const emailResources = emailDrawer.getByTestId(
      "reusable-design-browser-composition"
    );
    await emailResources.getByLabel("Search reusable designs").fill(resourceName);
    await emailResources
      .locator("article")
      .filter({ hasText: resourceName })
      .locator("button")
      .first()
      .click();
    await expect(page.getByTestId("creative-composition-canvas").last()).toBeVisible();

    await emailDrawer
      .getByLabel("Add email block type")
      .selectOption("creative_flow");
    await emailDrawer.getByRole("button", { name: "Add", exact: true }).click();
    await page.getByTestId("email-tool-outline").click();
    await page
      .locator('[data-testid^="email-outline-block-"]')
      .filter({ hasText: "Image + text layout" })
      .last()
      .click();
    await page.getByTestId("email-tool-content").click();
    const flowEditor = emailDrawer.getByTestId("creative-flow-section-editor");
    await expect(flowEditor).toBeVisible();
    await flowEditor.getByTestId("open-shared-media-browser").click();
    await page.getByTestId("media-browser-result").first().click();
    await page.getByTestId("media-browser-insert").click();
    await flowEditor.getByRole("button", { name: "Image right" }).click();
    await flowEditor.getByLabel("Heading").fill("One shared creative story");
    await flowEditor.getByLabel("Mobile stack").selectOption("text_first");
    await expect(page.getByTestId("creative-flow-renderer").last()).toHaveAttribute(
      "data-layout",
      "image_right"
    );
    await page.getByTestId("email-save").click();
    await expect(page.getByText(/Email draft saved/i)).toBeVisible();
    await page.screenshot({
      path: path.join(evidence, "08-email-reuse-structured-flow.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId("creative-flow-renderer").last()).toHaveAttribute(
      "data-mobile-stack",
      "text_first"
    );
    await page.screenshot({
      path: path.join(evidence, "09-email-structured-flow-mobile.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`/dashboard/campaigns/${campaignId}`, {
      waitUntil: "networkidle",
    });
    await page.getByTestId("campaign-add-block-type").selectOption("creative_section");
    await page.getByTestId("campaign-add-block").click();
    const campaignResources = page
      .getByTestId("reusable-design-browser-composition")
      .last();
    await campaignResources.getByLabel("Search reusable designs").fill(resourceName);
    await campaignResources
      .locator("article")
      .filter({ hasText: resourceName })
      .locator("button")
      .first()
      .click();
    await expect(page.getByTestId("creative-composition-canvas").last()).toBeVisible();
    await page.getByTestId("campaign-add-block-type").selectOption("creative_flow");
    await page.getByTestId("campaign-add-block").click();
    await expect(page.getByTestId("creative-flow-section-editor")).toBeVisible();
    await page
      .getByTestId("creative-flow-section-editor")
      .getByRole("button", { name: "Image left" })
      .click();
    await page.getByTestId("campaign-save").click();
    await expect(page.getByText(/Saved — live pages keep their status/i)).toBeVisible();
    await page.screenshot({
      path: path.join(evidence, "10-campaign-reuse-structured-flow.png"),
      fullPage: true,
    });
  });

  test("view-only Preview and Public surfaces preserve the shared creative render contract", async ({
    page,
  }) => {
    await page.goto("/dashboard/card/preview", { waitUntil: "networkidle" });
    await expect(page.getByTestId("card-preview-workspace")).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByTestId("card-save")).toHaveCount(0);
    const previewCompositions = page.getByTestId("creative-composition-canvas");
    expect(await previewCompositions.count()).toBeGreaterThan(0);
    await page.screenshot({
      path: path.join(evidence, "11-card-view-only-preview.png"),
      fullPage: true,
    });

    await page.goto(
      "/t/seeddemo01?public=1&at=2026-07-30T10%3A00%3A00-04%3A00",
      { waitUntil: "networkidle" }
    );
    await expect(
      page.getByTestId("card-utility-layer").or(page.locator(".tap-card")).first()
    ).toBeVisible({ timeout: 60_000 });
    const publicCompositions = page.getByTestId("creative-composition-canvas");
    expect(await publicCompositions.count()).toBeGreaterThan(0);
    await page.screenshot({
      path: path.join(evidence, "12-public-shared-creative-render.png"),
      fullPage: true,
    });
  });
});
