import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

const enabled = process.env.STUDIO_ADAPTIVE_WORKSPACE_ACCEPTANCE === "1";
const evidence = path.join("docs", "product-reconstitution", "creative-studio-platform", "proofs", "studio-platform-completion");

test.describe("Studio Adaptive Workspace Foundation", () => {
  test.skip(!enabled, "Set STUDIO_ADAPTIVE_WORKSPACE_ACCEPTANCE=1 for the isolated review runtime");
  test.describe.configure({ timeout: 180_000 });
  test.beforeAll(() => mkdirSync(evidence, { recursive: true }));

  test.beforeEach(async ({ page }) => {
    await page.goto("/review/studio", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/dashboard\/card\/edit$/);
    await expect(page.getByTestId("studio-reconstitution-shell")).toBeVisible();
    await expect(page.getByTestId("studio-reconstitution-shell")).toHaveAttribute("data-session-restored", "true");
  });

  test.afterEach(async ({ page }) => {
    if (!page.url().includes("/dashboard/card/edit")) return;
    const undo = page.getByRole("button", { name: "Undo", exact: true });
    for (let remaining=20;remaining>0 && await undo.isEnabled().catch(() => false);remaining--) await undo.click();
    const save = page.getByRole("button", { name: "Save", exact: true });
    if (await save.isEnabled().catch(() => false)) {
      await save.click();
      await expect(save).toBeDisabled();
    }
  });

  test("keeps the Card dominant until an explicit authoring job changes the workspace", async ({ page }) => {
    const shell = page.getByTestId("studio-reconstitution-shell");
    await expect(shell).toHaveAttribute("data-workspace-contract", "studioAdaptiveWorkspace@1.0.0");
    await expect(shell).toHaveAttribute("data-workspace-composition", "compose");
    await expect(shell).toHaveAttribute("data-card-visibility", "dominant");

    await page.getByTestId("studio-rail-add").click();
    await expect(shell).toHaveAttribute("data-workspace-composition", "discover");
    await expect(shell).toHaveAttribute("data-task-surface", "broad");
    await expect(page.getByTestId("studio-discovery-drawer")).toHaveAttribute("data-catalog-adapter", "studio-add");
    await page.getByTestId("studio-add-buttons").click();
    await expect(shell).toHaveAttribute("data-workspace-task", "browse-buttons");
    await expect(page.getByTestId("studio-button-family-standard")).toBeVisible();
    await expect(page.getByTestId("studio-button-family-cabinet-noir")).toBeVisible();
    await expect(page.getByText("Arc Ember", { exact: true })).toHaveCount(0);
    await page.screenshot({ path: path.join(evidence, "adaptive-button-discovery.png") });
    await page.getByTestId("studio-drawer-close").click();
    await expect(page.getByTestId("studio-discovery-drawer")).toHaveCount(0);
    await expect(shell).toHaveAttribute("data-workspace-composition", "compose");
  });

  test("uses Outline only for the explicit organization job and selection does not summon an Inspector", async ({ page }) => {
    const shell = page.getByTestId("studio-reconstitution-shell");
    await page.getByTestId("studio-rail-layers").click();
    await expect(shell).toHaveAttribute("data-workspace-composition", "organize");
    await expect(page.getByTestId("studio-outline-view")).toBeVisible();
    const firstNode = page.locator('[data-testid^="studio-layer-"]').first();
    if (await firstNode.count()) await firstNode.click();
    await expect(shell).toHaveAttribute("data-workspace-composition", "organize");
    await expect(page.getByTestId("studio-button-inspector")).toHaveCount(0);
    await expect(page.getByTestId("studio-assembly-inspector")).toHaveCount(0);
    await page.getByTestId("studio-drawer-close").click();
    await expect(shell).toHaveAttribute("data-workspace-composition", "compose");
  });

  test("places a Standard Button, returns to the Card, and opens relevant refinement", async ({ page }) => {
    const shell = page.getByTestId("studio-reconstitution-shell");
    await page.getByTestId("studio-rail-add").click();
    await page.getByTestId("studio-add-buttons").click();
    await page.getByTestId("studio-button-family-standard").click();
    await page.locator('[data-testid^="standard-button-preset-"]').first().click();
    await expect(page.getByTestId("studio-discovery-drawer")).toHaveCount(0);
    await expect(shell).toHaveAttribute("data-workspace-composition", "refine");
    await expect(page.getByTestId("studio-button-inspector")).toBeVisible();
    await page.getByRole("button", { name: "Close Button Inspector" }).click();
    await expect(shell).toHaveAttribute("data-workspace-composition", "compose");
  });

  test("adapts the same grammar to phone furniture", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: "domcontentloaded" });
    const shell = page.getByTestId("studio-reconstitution-shell");
    await expect(page.getByTestId("studio-phone-toolbar")).toBeVisible();
    await page.getByTestId("studio-phone-toolbar").getByText("Add", { exact: true }).click();
    await expect(shell).toHaveAttribute("data-workspace-composition", "discover");
    await expect(page.getByTestId("studio-discovery-drawer")).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "phone-discovery-sheet.png") });
    await page.getByTestId("studio-drawer-close").click();
    await expect(shell).toHaveAttribute("data-workspace-composition", "compose");
  });

  test("discovers Cabinet Noir as a finished system and requires explicit Edit Contents", async ({ page }) => {
    const shell = page.getByTestId("studio-reconstitution-shell");
    await page.getByTestId("studio-rail-add").click();
    await page.getByTestId("studio-add-buttons").click();
    await page.getByTestId("studio-button-family-cabinet-noir").click();
    await expect(page.getByTestId("studio-governed-family-cabinet-noir")).toBeVisible();
    const startingPoint = page.locator('button[data-testid^="studio-governed-resource-"]').first();
    await expect(startingPoint).toContainText("Insert assembly");
    await startingPoint.click();
    await expect(page.getByTestId("studio-discovery-drawer")).toHaveCount(0);
    await expect(shell).toHaveAttribute("data-workspace-composition", "compose");
    await expect(page.getByTestId("studio-assembly-inspector")).toHaveCount(0);
    await expect(page.getByTestId("studio-curated-object-toolbar")).toBeVisible();
    await page.getByTestId("studio-curated-selection-identity").click();
    await expect(shell).toHaveAttribute("data-workspace-composition", "deep-edit");
    await expect(page.getByTestId("studio-assembly-inspector")).toBeVisible();
  });

  test("uses canonical Surface and Asset consumers, then restores the tune context", async ({ page }) => {
    const shell = page.getByTestId("studio-reconstitution-shell");
    await page.getByTestId("studio-rail-add").click();
    await page.getByTestId("studio-add-container").click();
    await page.getByRole("button", { name: "Smoked Glass", exact: true }).click();
    await expect(page.getByTestId("studio-composition-object-toolbar")).toBeVisible();
    await page.getByTestId("studio-composition-object-toolbar").getByRole("button", { name: /^Edit/ }).click();
    await expect(shell).toHaveAttribute("data-workspace-composition", "refine");
    await expect(page.getByTestId("studio-discovery-drawer")).toHaveCount(0);
    const surface = page.locator('[data-catalog-adapter="surface-treatments"]');
    await expect(surface).toBeVisible();
    await surface.getByRole("button", { name: /Image-backed/ }).click();
    await page.getByRole("button", { name: /Choose image|Replace image/ }).click();
    await expect(shell).toHaveAttribute("data-workspace-task", "browse-assets");
    await expect(page.getByTestId("shared-media-browser")).toHaveAttribute("data-catalog-adapter", "canonical-assets");
    await page.getByRole("button", { name: "Close Media and Asset Browser" }).click();
    await expect(shell).toHaveAttribute("data-workspace-composition", "refine");
    await expect(page.getByTestId("studio-discovery-drawer")).toHaveCount(0);
    await expect(page.getByTestId("studio-composition-inspector")).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "surface-context-restored-disabled-reason.png") });
  });

  test("treats Text and Divider as complete ordinary Modules without duplicate controls", async ({ page }) => {
    await page.getByRole("button", { name: "Welcome text Module", exact: true }).click();
    await page.getByTestId("studio-composition-object-toolbar").getByRole("button", { name: /^Edit/ }).click();
    const inspector = page.getByTestId("studio-composition-inspector");
    const text = inspector.getByTestId("studio-text-content");
    await text.fill("Studio text");
    await text.press("Space");
    await text.type("has spaces");
    await expect(text).toHaveValue("Studio text has spaces");
    await inspector.getByRole("combobox", { name: "Typeface", exact: true }).selectOption({ label: "Georgia" });
    await inspector.getByRole("button", { name: "left", exact: true }).first().click();
    await expect(page.getByRole("button", { name: "Welcome text Module", exact: true })).toContainText("Studio text has spaces");
    await page.screenshot({ path: path.join(evidence, "text-keyboard-typography.png") });
    await inspector.getByRole("button", { name: "Close Inspector", exact: true }).click();

    await page.getByRole("button", { name: "Champagne glow Divider Module", exact: true }).click();
    await page.getByTestId("studio-composition-object-toolbar").getByRole("button", { name: /^Edit/ }).click();
    const divider = page.getByTestId("studio-composition-inspector");
    await expect(divider.locator('[data-control-group="line"]')).toBeVisible();
    await expect(divider.locator('[data-control-group="width-and-alignment"]')).toBeVisible();
    await expect(divider.getByRole("button", { name: "double", exact: true })).toBeVisible();
    await expect(divider.getByRole("spinbutton", { name: "Thickness exact value px", exact: true })).toBeVisible();
    await expect(divider.getByRole("spinbutton", { name: "Space before exact value px", exact: true })).toBeVisible();
    await expect(divider.getByRole("spinbutton", { name: "Space after exact value px", exact: true })).toBeVisible();
    await expect(divider.getByRole("spinbutton", { name: "Width exact value %", exact: true })).toHaveCount(1);
    await divider.getByRole("button", { name: "dashed", exact: true }).click();
    await divider.getByRole("button", { name: "metallic", exact: true }).click();
    await page.screenshot({ path: path.join(evidence, "divider-authoring.png") });
  });

  test("makes Standard Button a complete ordinary Module and keeps selection chrome outside its label", async ({ page }) => {
    await page.getByRole("button", { name: "Standard Button Module", exact: true }).click();
    const geometry = await page.evaluate(() => {
      const selected = document.querySelector('[data-composition-kind="module"][data-selected="true"]')!;
      const handle = selected.querySelector('[data-testid^="studio-canvas-handle-"]')!;
      const label = selected.querySelector('a')!;
      const h = handle.getBoundingClientRect();
      const l = label.getBoundingClientRect();
      return { placement: handle.getAttribute("data-chrome-placement"), overlaps: !(h.right <= l.left || h.left >= l.right || h.bottom <= l.top || h.top >= l.bottom) };
    });
    expect(geometry.placement).toBe("outside-start");
    expect(geometry.overlaps).toBe(false);
    await page.screenshot({ path: path.join(evidence, "button-selection-chrome.png") });

    await page.getByTestId("studio-composition-object-toolbar").getByRole("button", { name: /^Edit/ }).click();
    const buttonInspector = page.getByTestId("studio-button-inspector");
    await buttonInspector.getByTestId("studio-button-label").fill("Contact our team");
    await buttonInspector.getByRole("button", { name: "after", exact: true }).click();
    await buttonInspector.getByTestId("studio-inspector-tab-appearance").click();
    await expect(buttonInspector.getByRole("combobox", { name: "Family", exact: true })).toBeVisible();
    await expect(buttonInspector.getByRole("slider", { name: "Weight", exact: true })).toBeVisible();
    await expect(buttonInspector.getByRole("slider", { name: "Shadow / depth", exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "button-appearance.png") });
    await buttonInspector.getByTestId("studio-inspector-tab-action").click();
    await buttonInspector.getByRole("combobox", { name: "Action", exact: true }).selectOption("call");
    await expect(buttonInspector.getByRole("textbox", { name: "Phone number", exact: true })).toBeVisible();
    await buttonInspector.getByTestId("studio-inspector-tab-layout").click();
    await expect(buttonInspector.getByRole("slider", { name: "Width", exact: true })).toBeVisible();
    await expect(buttonInspector.getByRole("slider", { name: "Minimum height", exact: true })).toBeVisible();
    await expect(buttonInspector.getByRole("slider", { name: "Inner padding", exact: true })).toBeVisible();
  });
});
