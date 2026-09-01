import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const enabled = process.env.STUDIO_AUTHORING_SHELL_ACCEPTANCE === "1";
const evidence = path.join("docs", "product-reconstitution", "creative-studio-platform", "proofs", "studio-authoring-shell");
const svgDataUri = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`;
const fitFixtureAssets = [
  {
    id: "fit-wide-wordmark",
    url: svgDataUri('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400"><rect width="1200" height="400" fill="white"/><rect x="170" y="128" width="860" height="144" rx="72" fill="#172033"/><circle cx="252" cy="200" r="48" fill="#b8ff2c"/><text x="330" y="228" font-family="Arial" font-size="92" font-weight="700" fill="white">WIDE MARK</text></svg>'),
    filename: "wide-wordmark.svg",
    mimeType: "image/svg+xml",
    source: "studio",
    provider: null,
    width: 1200,
    height: 400,
    approvalStatus: "APPROVED",
    defaultAltText: "Wide wordmark",
    rightsNote: "Acceptance fixture",
  },
  {
    id: "fit-tall-transparent",
    url: svgDataUri('<svg xmlns="http://www.w3.org/2000/svg" width="480" height="960"><path d="M240 92 380 300 318 820H162L100 300Z" fill="#8b5cf6"/><circle cx="240" cy="344" r="96" fill="#b8ff2c"/><path d="M184 620h112v112H184z" fill="white"/></svg>'),
    filename: "tall-transparent.svg",
    mimeType: "image/svg+xml",
    source: "studio",
    provider: null,
    width: 480,
    height: 960,
    approvalStatus: "APPROVED",
    defaultAltText: "Tall transparent mark",
    rightsNote: "Acceptance fixture",
  },
];

async function selectSingleStack(page: import("@playwright/test").Page) {
  await expect(page.getByTestId("studio-reconstitution-shell")).toHaveAttribute("data-session-restored", "true");
  await page.locator('[data-parent-authority="flow-v1"] [data-composition-kind="module"][aria-label="Cabinet Noir Single Stack Curated System"]').click({ position: { x: 8, y: 8 } });
  await expect(page.getByTestId("studio-assembly-inspector")).toHaveCount(0);
  const phoneToolbar = page.getByTestId("studio-phone-toolbar");
  if (await phoneToolbar.isVisible().catch(() => false)) await phoneToolbar.getByRole("button", { name: "Edit", exact: true }).click();
  else await page.getByTestId("studio-curated-selection-identity").click();
}

test.describe.serial("Reusable Studio Authoring Shell", () => {
  test.skip(!enabled, "Set STUDIO_AUTHORING_SHELL_ACCEPTANCE=1 for the isolated Rich review runtime");
  test.setTimeout(180_000);
  test.beforeAll(() => mkdirSync(evidence, { recursive: true }));

  test("Cabinet Noir consumes the shared desktop shell with purpose-built controls", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto("/review/studio", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("studio-reconstitution-shell")).toBeVisible({ timeout: 60_000 });
    await selectSingleStack(page);
    const shell = page.getByTestId("studio-authoring-shell");
    await expect(shell).toBeVisible();
    await expect(page.getByTestId("studio-assembly-inspector")).toHaveAttribute("data-shared-authoring-shell", "true");
    await expect(page.getByTestId("studio-assembly-inspector")).toHaveAttribute("data-authoring-level", "module");
    await expect(shell.locator("select")).toHaveCount(0);
    await expect(shell.getByRole("button", { name: /Single Stack/ })).toHaveAttribute("aria-pressed", "true");
    await expect(shell.getByRole("button", { name: /Twin Rail/ })).toBeVisible();
    await expect(shell.getByTestId("studio-authoring-appearance")).toContainText("Champagne gold · blackened gunmetal");
    await expect(shell.getByTestId("studio-authoring-appearance")).toContainText("Raised enamel");
    const geometry = await page.evaluate(() => {
      const canvas = document.querySelector('main[aria-label="Card canvas"]')!.getBoundingClientRect();
      const panel = document.querySelector('[data-testid="studio-assembly-inspector"]')!.getBoundingClientRect();
      return { canvasWidth: canvas.width, panelWidth: panel.width };
    });
    expect(geometry.panelWidth).toBeLessThanOrEqual(300);
    expect(geometry.canvasWidth).toBeGreaterThan(geometry.panelWidth * 2);
    await page.screenshot({ path: path.join(evidence, "desktop-module.png") });

    await shell.getByTestId("studio-authoring-edit-contents").click();
    await expect(page.getByTestId("studio-assembly-inspector")).toHaveAttribute("data-authoring-level", "module-internal");
    await expect(shell.getByTestId("studio-authoring-breadcrumb")).toContainText("Action 1");
    await expect(shell.getByRole("button", { name: "Left", exact: true })).toBeVisible();
    await expect(shell.getByRole("button", { name: "Center", exact: true })).toHaveAttribute("aria-pressed", "true");
    const exactSize = shell.getByLabel("Text size exact value");
    await expect(exactSize).toHaveAttribute("min", "12");
    await expect(exactSize).toHaveAttribute("max", "17");
    await expect(exactSize).toHaveAttribute("step", "0.5");
    expect(Number(await exactSize.inputValue())).toBeGreaterThanOrEqual(12);
    expect(Number(await exactSize.inputValue())).toBeLessThanOrEqual(17);
    const plugBrowserTrigger = shell.getByTestId("studio-visual-browser-trigger");
    await expect(plugBrowserTrigger).toContainText("Browse all 24");
    await expect(shell.getByTestId("studio-visual-browser-resting-state")).toContainText("Website / Globe");
    await expect(shell.locator("select")).toHaveCount(0);
    await page.screenshot({ path: path.join(evidence, "desktop-module-internal.png") });
    await plugBrowserTrigger.click();
    await expect(page.getByTestId("studio-visual-browser")).toBeVisible();
    await expect(page.getByRole("listbox", { name: "Plug" }).getByRole("option")).toHaveCount(24);
    await expect(page.getByRole("listbox", { name: /plug/i }).getByRole("option", { selected: true })).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("studio-visual-browser")).toBeHidden();
    await expect(plugBrowserTrigger).toBeFocused();
  });

  test("phone uses the same contract in a Card-preserving bottom sheet", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/review/studio", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("studio-reconstitution-shell")).toBeVisible({ timeout: 60_000 });
    await selectSingleStack(page);
    const panel = page.getByTestId("studio-assembly-inspector");
    await expect(panel).toHaveAttribute("data-sheet-size", "partial");
    const partial = await page.evaluate(() => {
      const value = document.querySelector('[data-testid="studio-assembly-inspector"]')!.getBoundingClientRect();
      return { y: value.y, height: value.height, viewport: innerHeight };
    });
    expect(partial.y).toBeGreaterThan(180);
    expect(partial.height).toBeLessThan(partial.viewport * 0.65);
    await page.screenshot({ path: path.join(evidence, "phone-module-partial.png") });
    await panel.getByRole("button", { name: "Change panel height" }).click();
    await expect(panel).toHaveAttribute("data-sheet-size", "expanded");
    const identity = panel.getByTestId("studio-authoring-resource-slot-identity");
    await identity.getByTestId("studio-authoring-resource-slot-identity-adjust").click();
    const cropEditor = page.getByRole("dialog", { name: "Adjust identity crop" });
    await expect(cropEditor).toBeVisible();
    await expect(page.getByTestId("studio-reconstitution-shell")).toHaveAttribute("data-workspace-task", "adjust-resource");
    await expect(cropEditor.getByTestId("studio-resource-crop-drag-surface")).toBeVisible();
    await expect(cropEditor.getByLabel("Identity zoom")).toBeVisible();
    await expect(cropEditor.getByRole("button", { name: "Apply", exact: true })).toBeVisible();
    await expect(cropEditor.getByRole("button", { name: "Cancel", exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "phone-circular-crop-editor.png") });
    await cropEditor.getByRole("button", { name: "Zoom in" }).click();
    await cropEditor.getByRole("button", { name: "Apply", exact: true }).click();
    await expect(cropEditor).toBeHidden();
    await expect(page.getByTestId("studio-reconstitution-shell")).toHaveAttribute("data-workspace-task", "edit-contents");
    await expect(page.getByTestId("studio-preview")).toBeVisible();
    await expect(page.getByTestId("preview-live-device")).toBeVisible();
    await expect(page.locator('[data-visual-fit-contract][data-governed-zoom="1.05"]')).toHaveCount(2);
    await panel.getByRole("button", { name: "Change panel height" }).click();
    await expect(panel).toHaveAttribute("data-sheet-size", "peek");
    await page.screenshot({ path: path.join(evidence, "phone-module-peek.png") });
    await page.goto("/review/studio", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeDisabled();
  });

  test("Curated identity uses the canonical Asset browser and survives governed layout recompilation", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto("/review/studio", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("studio-reconstitution-shell")).toBeVisible({ timeout: 60_000 });
    await selectSingleStack(page);
    const panel = page.getByTestId("studio-assembly-inspector");
    const identity = panel.getByTestId("studio-authoring-resource-slot-identity");
    await expect(identity).toBeVisible();
    await expect(identity).toContainText("Brand identity");
    await identity.getByRole("button", { name: "Replace", exact: true }).click();
    const browser = page.getByRole("dialog", { name: "Media & Asset Browser" });
    await expect(browser).toBeVisible();
    await expect(browser.getByRole("tab", { name: "Brand", exact: true })).toBeVisible();
    await expect(browser.getByRole("tab", { name: "Recent", exact: true })).toBeVisible();
    await expect(browser.getByRole("tab", { name: "Favorites", exact: true })).toBeVisible();
    await browser.getByRole("button", { name: "Close Media and Asset Browser" }).click();
    await expect(identity).toBeVisible();
    const projection = identity.locator("[data-visual-fit-contract]");
    const originalSrc = await projection.locator("img").getAttribute("src");
    const originalCrop = await projection.evaluate((element) => ({
      zoom: element.getAttribute("data-governed-zoom"),
      x: element.getAttribute("data-focal-x"),
      y: element.getAttribute("data-focal-y"),
    }));

    await identity.getByTestId("studio-authoring-resource-slot-identity-adjust").click();
    const cropEditor = page.getByRole("dialog", { name: "Adjust identity crop" });
    await expect(cropEditor).toBeVisible();
    await cropEditor.getByRole("button", { name: "Zoom in" }).click();
    await cropEditor.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(cropEditor).toBeHidden();
    await expect(page.getByTestId("studio-reconstitution-shell")).toHaveAttribute("data-workspace-task", "edit-contents");
    await expect(page.getByTestId("studio-assembly-inspector")).toHaveAttribute("data-authoring-level", "module");
    await expect(page.getByTestId("studio-preview")).toBeVisible();
    await expect(page.getByTestId("preview-live-device")).toBeVisible();
    await expect(projection).toHaveAttribute("data-governed-zoom", originalCrop.zoom || "1.00");
    await expect(projection).toHaveAttribute("data-focal-x", originalCrop.x || "0.000");
    await expect(projection).toHaveAttribute("data-focal-y", originalCrop.y || "0.000");
    await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeDisabled();

    await page.route(/\/api\/media\/[^/]+\/used$/, async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) }));
    await identity.getByRole("button", { name: "Replace", exact: true }).click();
    const replacementAsset = browser.getByRole("option").first();
    await expect(replacementAsset).toBeVisible();
    await replacementAsset.click();
    await browser.getByRole("button", { name: "Insert selected" }).click();
    await expect(browser).toBeHidden();
    await expect(cropEditor).toBeVisible();
    await expect(page.getByTestId("studio-reconstitution-shell")).toHaveAttribute("data-workspace-task", "adjust-resource");
    await expect(cropEditor.getByTestId("studio-resource-crop-apply")).toBeEnabled();
    const replacementSrc = await cropEditor.locator("img").getAttribute("src");
    await page.screenshot({ path: path.join(evidence, "desktop-selected-asset-crop-session.png") });
    await cropEditor.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(cropEditor).toBeHidden();
    await expect(page.getByTestId("studio-reconstitution-shell")).toHaveAttribute("data-workspace-task", "edit-contents");
    if (originalSrc) await expect(projection.locator("img")).toHaveAttribute("src", originalSrc);
    await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeDisabled();

    await identity.getByRole("button", { name: "Replace", exact: true }).click();
    await browser.getByRole("option").first().click();
    await browser.getByRole("button", { name: "Insert selected" }).click();
    await expect(cropEditor).toBeVisible();
    if (replacementSrc) await expect(cropEditor.locator("img")).toHaveAttribute("src", replacementSrc);
    const dragSurface = cropEditor.getByTestId("studio-resource-crop-drag-surface");
    const box = await dragSurface.boundingBox();
    expect(box).toBeTruthy();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width * .62, box!.y + box!.height * .44, { steps: 4 });
    await page.mouse.up();
    const cropProjection = cropEditor.locator("[data-visual-fit-contract]");
    await expect(cropProjection).not.toHaveAttribute("data-focal-x", "0.000");
    await expect(dragSurface).toHaveAttribute("data-dragging", "false");
    await cropEditor.getByRole("button", { name: "Reset crop" }).click();
    await expect(cropProjection).toHaveAttribute("data-governed-zoom", "1.00");
    await expect(cropProjection).toHaveAttribute("data-focal-x", "0.000");
    await expect(cropProjection).toHaveAttribute("data-focal-y", "0.000");
    await cropEditor.getByRole("button", { name: "Zoom in" }).click();
    await cropEditor.getByRole("button", { name: "Zoom in" }).click();
    await expect(cropEditor.getByTestId("studio-resource-backing-plate")).toBeVisible();
    await expect(cropEditor.getByTestId("studio-resource-legibility-guidance")).toContainText("baked-in background");
    await cropEditor.getByTestId("studio-resource-backing-dark").click();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await expect(dragSurface).toHaveAttribute("data-dragging", "true");
    await page.mouse.move(box!.x + box!.width * .58, box!.y + box!.height * .57, { steps: 5 });
    await cropEditor.screenshot({ path: path.join(evidence, "pointer-drag-active.png") });
    await page.mouse.up();
    const committedCrop = {
      zoom: await cropProjection.getAttribute("data-governed-zoom"),
      x: await cropProjection.getAttribute("data-focal-x"),
      y: await cropProjection.getAttribute("data-focal-y"),
      utilization: await cropProjection.getAttribute("data-visible-utilization"),
      backingMode: await cropProjection.getAttribute("data-backing-mode"),
      backingColor: await cropProjection.getAttribute("data-backing-color"),
      placement: await cropProjection.evaluate((element) => {
        const image = element.querySelector("img")!;
        const slot = element.querySelector('[data-semantic-mask-viewport]')!.getBoundingClientRect();
        return {
          left: Number.parseFloat(image.style.left) / slot.width,
          top: Number.parseFloat(image.style.top) / slot.height,
          width: Number.parseFloat(image.style.width) / slot.width,
          height: Number.parseFloat(image.style.height) / slot.height,
        };
      }),
    };
    await cropProjection.screenshot({ path: path.join(evidence, "crop-parity-before-apply.png") });
    await cropEditor.getByRole("button", { name: "Apply", exact: true }).click();
    await expect(cropEditor).toBeHidden();
    await expect(page.getByTestId("studio-reconstitution-shell")).toHaveAttribute("data-workspace-task", "edit-contents");
    await expect(page.getByTestId("studio-preview")).toBeVisible();
    await expect(page.getByTestId("preview-live-device")).toBeVisible();
    await expect(identity).toBeVisible();
    if (originalSrc) await expect(projection.locator("img")).not.toHaveAttribute("src", originalSrc);
    await expect(projection).toHaveAttribute("data-governed-zoom", "1.10");
    await expect(projection).toHaveAttribute("data-focal-x", committedCrop.x || "0.000");
    await expect(projection).toHaveAttribute("data-focal-y", committedCrop.y || "0.000");
    await expect(projection).toHaveAttribute("data-mask-shape", "circle");
    await expect(projection).toHaveAttribute("data-backing-mode", "dark");
    await expect(projection).toHaveAttribute("data-backing-color", "#080b10");
    await expect(projection.locator('[data-semantic-mask-viewport="circle"]')).toHaveCSS("clip-path", /circle/);
    const crownProjection = page.locator('[data-signature-kind="identity"] [data-visual-fit-contract]').first();
    await expect(crownProjection).toHaveAttribute("data-governed-zoom", committedCrop.zoom || "1.10");
    await expect(crownProjection).toHaveAttribute("data-focal-x", committedCrop.x || "0.000");
    await expect(crownProjection).toHaveAttribute("data-focal-y", committedCrop.y || "0.000");
    await expect(crownProjection).toHaveAttribute("data-visible-utilization", committedCrop.utilization || "0.000");
    await expect(crownProjection).toHaveAttribute("data-backing-mode", committedCrop.backingMode || "dark");
    await expect(crownProjection).toHaveAttribute("data-backing-color", committedCrop.backingColor || "#080b10");
    await expect(crownProjection.locator('[data-semantic-mask-viewport="circle"]')).toHaveCSS("clip-path", /circle/);
    const crownPlacement = await crownProjection.evaluate((element) => {
      const image = element.querySelector("img")!;
      const slot = element.querySelector('[data-semantic-mask-viewport]')!.getBoundingClientRect();
      return {
        left: Number.parseFloat(image.style.left) / slot.width,
        top: Number.parseFloat(image.style.top) / slot.height,
        width: Number.parseFloat(image.style.width) / slot.width,
        height: Number.parseFloat(image.style.height) / slot.height,
      };
    });
    expect(crownPlacement.left).toBeCloseTo(committedCrop.placement.left, 2);
    expect(crownPlacement.top).toBeCloseTo(committedCrop.placement.top, 2);
    expect(crownPlacement.width).toBeCloseTo(committedCrop.placement.width, 2);
    expect(crownPlacement.height).toBeCloseTo(committedCrop.placement.height, 2);
    writeFileSync(path.join(evidence, "persisted-crop-metadata.json"), JSON.stringify({
      assetSource: replacementSrc,
      maskShape: "circle",
      zoom: committedCrop.zoom,
      focalX: committedCrop.x,
      focalY: committedCrop.y,
      visibleUtilization: committedCrop.utilization,
      backingPlate: { mode: committedCrop.backingMode, resolvedColor: committedCrop.backingColor },
      cropperPlacement: committedCrop.placement,
      crownPlacement,
      renderer: "StudioVisualResourceProjection",
    }, null, 2));
    await crownProjection.screenshot({ path: path.join(evidence, "crop-parity-after-apply.png") });
    await page.screenshot({ path: path.join(evidence, "desktop-identity-after-crop-apply.png") });
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    if (originalSrc) await expect(projection.locator("img")).toHaveAttribute("src", originalSrc);
    await expect(projection).toHaveAttribute("data-governed-zoom", originalCrop.zoom || "1.00");
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    if (replacementSrc) await expect(projection.locator("img")).toHaveAttribute("src", replacementSrc);
    await expect(projection).toHaveAttribute("data-governed-zoom", "1.10");
    await expect(projection).toHaveAttribute("data-backing-mode", "dark");

    await identity.getByTestId("studio-authoring-resource-slot-identity-adjust").click();
    await expect(cropEditor).toBeVisible();
    await cropEditor.getByRole("button", { name: "Zoom in" }).click();
    await cropEditor.getByRole("button", { name: "Zoom in" }).click();
    await cropEditor.getByRole("button", { name: "Zoom in" }).click();
    await cropEditor.getByRole("button", { name: "Apply", exact: true }).click();
    await expect(projection).toHaveAttribute("data-governed-zoom", "1.25");

    await panel.getByRole("button", { name: /Standalone Action/ }).click();
    await expect(identity).toHaveCount(0);
    await panel.getByRole("button", { name: /Twin Rail/ }).click();
    await expect(identity).toBeVisible();
    await expect(page.locator('[data-visual-fit-contract][data-governed-zoom="1.25"]')).toHaveCount(2);

    await identity.getByRole("button", { name: "Clear Identity logo" }).click();
    await expect(page.locator('[data-visual-fit-contract][data-governed-zoom="1.25"]')).toHaveCount(0);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(page.locator('[data-visual-fit-contract][data-governed-zoom="1.25"]')).toHaveCount(2);
    await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeEnabled();
    if (await page.getByTestId("studio-save").isEnabled()) await page.getByTestId("studio-save").click();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-visual-fit-contract][data-governed-zoom="1.25"]')).toHaveCount(1);
    await expect(page.locator('[data-visual-fit-contract][data-backing-mode="dark"]')).toHaveCount(1);
    await page.getByTestId("studio-preview").click();
    await expect(page.locator('[data-visual-fit-contract][data-governed-zoom="1.25"]')).toHaveCount(1);
    await expect(page.locator('[data-visual-fit-contract][data-backing-mode="dark"]')).toHaveCount(1);
    await page.screenshot({ path: path.join(evidence, "preview-circular-crop-parity.png") });
    await page.getByTestId("studio-preview").click();
    await page.getByTestId("preview-live-device").click();
    const livePanel = page.getByTestId("studio-live-device-panel");
    await expect(livePanel).toBeVisible();
    const liveHref = await livePanel.locator('a[href*="/preview/live/"]').first().getAttribute("href");
    expect(liveHref).toBeTruthy();
    const localLiveUrl = new URL(liveHref!);
    localLiveUrl.hostname = "127.0.0.1";
    const livePage = await page.context().newPage();
    await livePage.setViewportSize({ width: 390, height: 844 });
    await livePage.goto(localLiveUrl.toString(), { waitUntil: "domcontentloaded" });
    await expect(livePage.locator('[data-visual-fit-contract][data-governed-zoom="1.25"]')).toHaveCount(1);
    await expect(livePage.locator('[data-visual-fit-contract][data-backing-mode="dark"]')).toHaveCount(1);
    await livePage.screenshot({ path: path.join(evidence, "live-device-circular-crop-parity.png") });
    await livePage.close();
    await livePanel.getByRole("button", { name: "Revoke", exact: true }).click();
    await page.getByRole("button", { name: "Close Live Device Preview" }).click();
    await page.goto("/review/studio", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeDisabled();
  });

  test("wide opaque and tall transparent artwork use the same truthful circular treatment", async ({ page }) => {
    await page.route(/\/api\/media$/, async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ assets: fitFixtureAssets }) }));
    await page.route(/\/api\/media\/[^/]+\/used$/, async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) }));
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto("/review/studio", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("studio-reconstitution-shell")).toBeVisible({ timeout: 60_000 });
    await page.goto(`${page.url()}?studioResourceFitDebug=1`, { waitUntil: "domcontentloaded" });
    await selectSingleStack(page);
    const panel = page.getByTestId("studio-assembly-inspector");
    const identity = panel.getByTestId("studio-authoring-resource-slot-identity");
    const browser = page.getByRole("dialog", { name: "Media & Asset Browser" });
    const cropEditor = page.getByRole("dialog", { name: "Adjust identity crop" });

    await identity.getByRole("button", { name: "Replace", exact: true }).click();
    await browser.getByRole("option").filter({ hasText: "Wide wordmark" }).click();
    await browser.getByRole("button", { name: "Insert selected" }).click();
    await expect(cropEditor).toBeVisible();
    await expect(cropEditor.locator("img")).toHaveAttribute("src", fitFixtureAssets[0].url);
    await expect(cropEditor.getByTestId("studio-resource-crop-apply")).toBeEnabled();
    await expect(cropEditor.locator('[data-visual-bounds-source="edge-background"]')).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "desktop-wide-wordmark-circular-mask.png") });
    await cropEditor.getByRole("button", { name: "Zoom in" }).click();
    await cropEditor.getByRole("button", { name: "Apply", exact: true }).click();
    const wideProjection = identity.locator('[data-visual-bounds-source="edge-background"]');
    await expect(wideProjection).toHaveAttribute("data-visual-compatibility", "compatible");
    await expect(wideProjection).toHaveAttribute("data-governed-zoom", "1.05");

    await identity.getByRole("button", { name: "Replace", exact: true }).click();
    await browser.getByRole("option").filter({ hasText: "Tall transparent mark" }).click();
    await browser.getByRole("button", { name: "Insert selected" }).click();
    await expect(cropEditor).toBeVisible();
    await expect(cropEditor.locator('[data-visual-bounds-source="alpha"]')).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "desktop-transparent-mark-circular-mask.png") });
    await cropEditor.getByRole("button", { name: "Zoom out" }).click();
    await cropEditor.getByRole("button", { name: "Apply", exact: true }).click();
    await expect(identity.locator('[data-visual-bounds-source="alpha"]')).toHaveAttribute("data-governed-zoom", "0.95");
    await page.goto("/review/studio", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeDisabled();
  });

  test("an undecodable candidate is explicit, recoverable, and never replaces the committed identity", async ({ page }) => {
    const brokenAsset = {
      ...fitFixtureAssets[0],
      id: "fit-broken-identity",
      url: "/acceptance-assets/broken-identity.png",
      filename: "broken-identity.png",
      mimeType: "image/png",
      defaultAltText: "Broken identity candidate",
    };
    await page.route(/\/api\/media$/, async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ assets: [brokenAsset, fitFixtureAssets[1]] }) }));
    await page.route("**/acceptance-assets/broken-identity.png", async (route) => route.fulfill({ status: 404, contentType: "text/plain", body: "missing" }));
    await page.route(/\/api\/media\/[^/]+\/used$/, async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) }));
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto("/review/studio", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("studio-reconstitution-shell")).toBeVisible({ timeout: 60_000 });
    await selectSingleStack(page);
    const identity = page.getByTestId("studio-assembly-inspector").getByTestId("studio-authoring-resource-slot-identity");
    const committedProjection = identity.locator("[data-visual-fit-contract]");
    const committedSrc = await committedProjection.locator("img").getAttribute("src");
    await identity.getByRole("button", { name: "Replace", exact: true }).click();
    const browser = page.getByRole("dialog", { name: "Media & Asset Browser" });
    await browser.getByRole("option").filter({ hasText: "Broken identity candidate" }).click();
    await browser.getByRole("button", { name: "Insert selected" }).click();
    const cropEditor = page.getByRole("dialog", { name: "Adjust identity crop" });
    await expect(cropEditor).toBeVisible();
    await expect(cropEditor.getByTestId("studio-resource-crop-error")).toContainText("could not be displayed");
    await expect(cropEditor.getByTestId("studio-resource-crop-apply")).toBeDisabled();
    await page.screenshot({ path: path.join(evidence, "desktop-crop-candidate-decode-error.png") });
    if (committedSrc) await expect(committedProjection.locator("img")).toHaveAttribute("src", committedSrc);
    await cropEditor.getByRole("button", { name: "Choose another Asset" }).click();
    await expect(cropEditor).toBeHidden();
    await expect(browser).toBeVisible();
    await browser.getByRole("button", { name: "Close Media and Asset Browser" }).click();
    if (committedSrc) await expect(committedProjection.locator("img")).toHaveAttribute("src", committedSrc);
    await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeDisabled();
  });

  test("whole Curated hosts move directly by pointer without opening Outline", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto("/review/studio", { waitUntil: "domcontentloaded" });
    await selectSingleStack(page);
    const modules = page.locator('[data-parent-authority="flow-v1"] [data-composition-kind="module"][aria-label*="Curated System"]');
    const before = await modules.evaluateAll((elements) => elements.map((element) => element.getAttribute("data-composition-node")));
    const moduleOrders = await modules.evaluateAll((elements) => elements.map((element) => ({
      id: element.getAttribute("data-composition-node"),
      order: Number(element.getAttribute("data-sibling-order")),
    })));
    expect(before).toHaveLength(2);
    await expect(page.getByTestId("studio-phone-toolbar")).toBeHidden();
    const handle = page.locator('[data-testid^="studio-canvas-handle-"]').first();
    const selectedOrder = await handle.evaluate((element) => Number(element.closest('[data-composition-kind="module"]')?.getAttribute("data-sibling-order")));
    const selectedId = await handle.evaluate((element) => element.closest('[data-composition-kind="module"]')?.getAttribute("data-composition-node"));
    const otherOrder = moduleOrders.find((entry) => entry.id !== selectedId)?.order ?? selectedOrder;
    const handleBox = await handle.boundingBox();
    expect(handleBox).toBeTruthy();
    await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox!.x + handleBox!.width / 2 + 8, handleBox!.y + handleBox!.height / 2 + 8, { steps: 2 });
    const dropIndex = selectedOrder < otherOrder ? otherOrder + 1 : otherOrder;
    const drop = page.getByTestId(`studio-canvas-drop-card-${dropIndex}`);
    await expect(drop).toHaveAttribute("data-drop-valid", "true");
    await drop.hover();
    await expect(drop).toHaveAttribute("data-drop-active", "true");
    await page.mouse.up();
    await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeEnabled();
    const after = await modules.evaluateAll((elements) => elements
      .map((element) => ({ id: element.getAttribute("data-composition-node"), order: Number(element.getAttribute("data-sibling-order")) }))
      .sort((a, b) => a.order - b.order)
      .map((entry) => entry.id));
    expect(after).toEqual([...before].reverse());
    await page.getByRole("button", { name: "Undo", exact: true }).click();
  });

  test("canonical history, save/reload, Preview, and Live Device retain authored values", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto("/review/studio", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("studio-reconstitution-shell")).toBeVisible({ timeout: 60_000 });
    const selectAssembly = async () => {
      await selectSingleStack(page);
      await page.getByTestId("studio-authoring-edit-contents").click();
    };
    try {
      await selectAssembly();
      const centerAlignment = page.getByTestId("studio-authoring-shell").getByRole("button", { name: "Center", exact: true });
      if ((await centerAlignment.getAttribute("aria-pressed")) !== "true") {
        await centerAlignment.click();
        await page.getByTestId("studio-save").click();
        await expect(page.getByText("Saved", { exact: true }).first()).toBeVisible();
        await page.reload({ waitUntil: "domcontentloaded" });
        await selectAssembly();
      }
      await page.getByTestId("studio-authoring-shell").getByRole("button", { name: "Right", exact: true }).click();
      await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeEnabled();
      await page.getByTestId("studio-save").click();
      await expect(page.getByText("Saved", { exact: true }).first()).toBeVisible();
      await page.reload({ waitUntil: "domcontentloaded" });
      await selectAssembly();
      await expect(page.getByTestId("studio-authoring-shell").getByRole("button", { name: "Right", exact: true })).toHaveAttribute("aria-pressed", "true");

      await page.getByTestId("studio-preview").click();
      const authoredActionCopy = page.getByRole("group", { name: "Cabinet Noir Single Stack" }).locator('[data-signature-classification="live-action"] .signature-master__copy').first();
      await expect(authoredActionCopy).toHaveCSS("text-align", "right");
      await page.screenshot({ path: path.join(evidence, "preview-parity.png") });
      await page.getByTestId("studio-preview").click();
      await page.getByTestId("preview-live-device").click();
      await expect(page.getByTestId("studio-live-device-panel")).toBeVisible();
      await page.screenshot({ path: path.join(evidence, "live-device-parity-entry.png") });
      await page.getByRole("button", { name: "Close Live Device Preview" }).click();
    } finally {
      if (!page.url().includes("/dashboard/card/edit")) await page.goto("/review/studio", { waitUntil: "domcontentloaded" });
      const panel = page.getByTestId("studio-assembly-inspector");
      if (!(await panel.isVisible().catch(() => false))) await selectSingleStack(page).catch(() => undefined);
      if ((await panel.getAttribute("data-authoring-level").catch(() => null)) !== "module-internal") await panel.getByTestId("studio-authoring-edit-contents").click().catch(() => undefined);
      const center = panel.getByRole("button", { name: "Center", exact: true });
      if (await center.isVisible().catch(() => false)) await center.click();
      if (await page.getByTestId("studio-save").isEnabled().catch(() => false)) await page.getByTestId("studio-save").click();
    }
  });
});
