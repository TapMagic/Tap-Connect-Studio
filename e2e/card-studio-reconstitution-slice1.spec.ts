import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

const enabled = process.env.STUDIO_RECONSTITUTION_SLICE1_ACCEPTANCE === "1";
const evidence = path.join("tmp", "studio-reconstitution-slice1");

test.describe.serial("Studio reconstitution Phase 1 / Slice 1", () => {
  test.skip(!enabled, "Set STUDIO_RECONSTITUTION_SLICE1_ACCEPTANCE=1 with the isolated enrolled development fixture");
  test.setTimeout(300_000);

  test.beforeAll(() => mkdirSync(evidence, { recursive: true }));

  test("proves the stable shell, shared discovery surface, placement, history, and preview", async ({ page }) => {
    page.setDefaultTimeout(20_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/review/studio", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("studio-reconstitution-shell")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("studio-reconstitution-shell")).toHaveAttribute("data-session-restored", "true");
    const baselineResponse = await page.request.get("/api/card/draft");
    expect(baselineResponse.ok()).toBeTruthy();
    const baselineState = await baselineResponse.json() as { draft: Record<string, unknown>; revision: number };
    try {
    await expect(page.getByRole("group", { name: /Cabinet Noir (Standalone Action|Single Stack|Twin Rail)/ }).first()).toBeVisible();
    const rootItems = page.locator('[data-card-surface-flow="true"] > [data-composition-kind]');
    const baselineRootItemCount = await rootItems.count();
    const baselineTwinCount = await page.getByRole("group", { name: "Cabinet Noir Twin Rail", exact: true }).count();

    const rail = page.getByTestId("studio-editor-rail");
    await expect(rail.getByRole("button")).toHaveCount(7);
    for (const job of ["Templates", "Add", "Text", "Design", "Brand", "Assets", "Outline"]) {
      await expect(rail.getByRole("button", { name: job, exact: true })).toBeVisible();
    }
    for (const deferred of ["Templates", "Text", "Design", "Brand", "Assets"]) {
      await expect(rail.getByRole("button", { name: deferred, exact: true })).toBeDisabled();
    }

    await page.getByTestId("studio-rail-add").click();
    await expect(page.getByTestId("studio-discovery-drawer")).toBeVisible();
    await page.getByTestId("studio-add-buttons").click();
    await expect(page.getByTestId("studio-button-family-home")).toBeVisible();
    for (const family of ["Standard", "Brand", "Cabinet Noir"]) await expect(page.getByText(family, { exact: true }).last()).toBeVisible();
    await expect(page.getByText("Arc Ember", { exact: true })).toHaveCount(0);
    await expect(page.getByTestId("studio-button-family-saved")).toHaveCount(0);
    await page.getByTestId("studio-button-family-cabinet-noir").click();
    await expect(page.getByRole("heading", { name: "Assembly starting points" })).toBeVisible();
    await expect(page.getByText("Action language", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /Identity|Plug choices|Utility/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Cabinet Noir Single Stack assembly preview/ }).locator("img")).toHaveAttribute("src", /reference\/presets\/CN-006/);
    await expect(page.getByRole("button", { name: /Cabinet Noir Twin Rail assembly preview/ }).locator("img")).toHaveAttribute("src", /reference\/presets\/CN-008/);
    await page.getByRole("button", { name: /Cabinet Noir Twin Rail assembly preview/ }).click();
    await expect(rootItems).toHaveCount(baselineRootItemCount + 1);
    await expect(page.getByTestId("studio-curated-object-toolbar")).toBeVisible();
    await expect(page.getByTestId("studio-assembly-inspector")).toHaveCount(0);
    await page.getByTestId("studio-curated-selection-identity").click();
    await expect(page.getByTestId("studio-assembly-inspector")).toBeVisible();
    const assemblyInspector = page.getByTestId("studio-assembly-inspector");
    await expect(assemblyInspector).toHaveAttribute("data-shared-authoring-shell", "true");
    await expect(assemblyInspector).toHaveAttribute("data-authoring-level", "module");
    await expect(assemblyInspector.getByTestId("studio-assembly-appearance")).toContainText("Certified finish");
    await expect(assemblyInspector.getByTestId("studio-assembly-appearance")).not.toContainText("px at phone density");
    await expect(assemblyInspector.getByRole("button", { name: /Twin Rail/ })).toHaveAttribute("aria-pressed", "true");
    await assemblyInspector.getByTestId("studio-authoring-edit-contents").click();
    await expect(assemblyInspector.getByRole("button", { name: "Center", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(assemblyInspector.getByRole("slider", { name: "Text size", exact: true })).toHaveCount(1);
    await expect(assemblyInspector.getByLabel("Text size exact value")).toHaveValue("13");
    await expect(assemblyInspector.getByRole("slider", { name: "Text size", exact: true })).toHaveAttribute("min", "11");
    await expect(assemblyInspector.getByRole("slider", { name: "Text size", exact: true })).toHaveAttribute("max", "15");
    await expect(assemblyInspector.getByRole("slider", { name: "Text size", exact: true })).toHaveAttribute("step", "0.5");
    const browseAllPlugs = assemblyInspector.getByRole("button", { name: /^Browse all 24 compatible plug/ });
    await expect(browseAllPlugs).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "cabinet-appearance-controls.png") });
    await browseAllPlugs.click();
    await page.getByRole("textbox", { name: "Search Compatible plug", exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(evidence, "cabinet-plug-picker.png") });
    await page.getByRole("button", { name: "Close Compatible plug", exact: true }).click();
    await assemblyInspector.getByRole("button", { name: "Right", exact: true }).click();

    await assemblyInspector.getByRole("button", { name: "Back to Cabinet Noir" }).click();
    const actionRoster = assemblyInspector.locator('[data-testid^="studio-authoring-roster-"]');
    const initialActionCount = await actionRoster.count();
    await assemblyInspector.getByRole("button", { name: "Add action" }).click();
    await expect(actionRoster).toHaveCount(initialActionCount + 2);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(actionRoster).toHaveCount(initialActionCount);
    await assemblyInspector.getByTestId("studio-authoring-edit-contents").click();

    const callIntent = assemblyInspector.getByRole("button", { name: /Call Phone number/ });
    await callIntent.click();
    await expect(callIntent).toHaveAttribute("aria-pressed", "true");
    const destinationField = assemblyInspector.getByTestId("studio-authoring-destination");
    await destinationField.fill("(352) 620-5901");
    await destinationField.press("Tab");
    await expect(destinationField).toHaveValue("(352) 620-5901");
    await assemblyInspector.getByTestId("studio-authoring-label").click();
    await assemblyInspector.getByTestId("studio-authoring-label").fill("Call Now");
    await assemblyInspector.getByTestId("studio-authoring-accessible-name").click();
    await expect(page.getByTestId("studio-authoring-roster-0")).toContainText("Call Now");
    await assemblyInspector.getByRole("button", { name: "Move Call Now down" }).first().click();
    await expect(page.getByTestId("studio-authoring-roster-1")).toContainText("Call Now");

    if (await page.getByTestId("studio-save").isEnabled()) await page.getByTestId("studio-save").click();
    await expect(page.getByText("Saved", { exact: true }).first()).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("studio-reconstitution-shell")).toHaveAttribute("data-session-restored", "true");
    await expect(page.getByText("Call Now", { exact: true })).toBeVisible();
    const curatedObject = page.locator('[data-card-surface-flow="true"] > [data-element-kind="curated-system"]').filter({ hasText: "Call Now" });
    await curatedObject.click();
    await page.getByTestId("studio-curated-selection-identity").click();
    await expect(page.getByTestId("studio-assembly-inspector")).toBeVisible();
    await page.getByTestId("studio-authoring-roster-1").click();
    await expect(page.getByTestId("studio-assembly-inspector").getByRole("button", { name: "Right", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("studio-assembly-inspector").getByRole("slider", { name: "Text size", exact: true })).toHaveCount(1);
    await expect(page.getByTestId("studio-authoring-destination")).toHaveValue("tel:3526205901");
    await page.getByTestId("studio-preview").click();
    await expect(page.getByTestId("studio-editor-rail")).toHaveCount(0);
    await expect(page.getByText("Call Now", { exact: true })).toBeVisible();
    await expect(page.getByRole("group", { name: "Cabinet Noir Twin Rail" }).last().locator("a.signature-master__action", { hasText: "Call Now" })).toHaveAttribute("href", "tel:3526205901");
    await page.getByTestId("studio-preview").click();

    await curatedObject.click();
    await page.getByRole("button", { name: "Move Curated System", exact: true }).click();
    const positionInspector = page.getByTestId("studio-composition-inspector");
    await expect(positionInspector).toContainText("Position · Flow placement");
    const initialPosition = await positionInspector.getByText(/Position \d+ of \d+/).textContent();
    await positionInspector.getByRole("button", { name: "Move earlier", exact: true }).click();
    await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(positionInspector.getByText(initialPosition!, { exact: true })).toBeVisible();
    await positionInspector.getByRole("button", { name: "Close Inspector", exact: true }).click();

    await page.getByLabel("More Curated System actions").click();
    await page.getByRole("menuitem", { name: "Duplicate", exact: true }).click();
    await expect(rootItems).toHaveCount(baselineRootItemCount + 2);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(rootItems).toHaveCount(baselineRootItemCount + 1);
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await expect(rootItems).toHaveCount(baselineRootItemCount + 2);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(rootItems).toHaveCount(baselineRootItemCount + 1);

    await curatedObject.click();
    await page.getByLabel("More Curated System actions").click();
    await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
    await expect(rootItems).toHaveCount(baselineRootItemCount);
    if (await page.getByTestId("studio-save").isEnabled()) await page.getByTestId("studio-save").click();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("group", { name: "Cabinet Noir Twin Rail", exact: true })).toHaveCount(baselineTwinCount);

    await expect(page.getByTestId("studio-discovery-drawer")).toHaveCount(0);
    await page.getByTestId("studio-rail-add").click();
    await page.getByTestId("studio-add-buttons").click();
    await expect(page.getByTestId("studio-button-family-home")).toBeVisible();
    await page.getByTestId("studio-button-family-brand").click();
    await expect(page.getByTestId("studio-standard-button-gallery")).toBeVisible();
    await expect(page.getByText("Brand Primary", { exact: true }).last()).toBeVisible();
    await expect(page.getByText("Brand Outline", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Compact Utility", { exact: true })).toHaveCount(0);

    const nodes = page.locator('[data-card-surface-flow="true"] > [data-composition-kind]');
    const baseline = await nodes.count();
    const preset = page.getByTestId("standard-button-preset-brand-primary").last();
    await expect(preset).toHaveAttribute("draggable", "true");
    await preset.click();
    await expect(nodes).toHaveCount(baseline + 1);
    await expect(page.getByTestId("studio-button-inspector")).toBeVisible();
    await expect(page.getByTestId("studio-inspector-tab-content")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("studio-button-label")).not.toBeFocused();
    await page.getByTestId("studio-inspector-tab-appearance").click();
    await expect(page.getByText("Text alignment", { exact: true })).toBeVisible();
    await expect(page.getByRole("slider", { name: "Label size", exact: true })).toBeVisible();
    await expect(page.getByRole("spinbutton", { name: "Label size exact value px", exact: true })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /Raised text/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(nodes).toHaveCount(baseline);
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await expect(nodes).toHaveCount(baseline + 1);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(nodes).toHaveCount(baseline);

    const closeButtonInspector = page.getByRole("button", { name: "Close Button Inspector" });
    if (await closeButtonInspector.isVisible().catch(() => false)) await closeButtonInspector.click();
    await page.getByTestId("studio-rail-add").click();
    await page.getByTestId("studio-add-buttons").click();
    await page.getByTestId("studio-button-family-brand").click();
    const dragPreset = page.getByTestId("standard-button-preset-brand-primary").last();
    await dragPreset.dragTo(page.getByTestId("studio-canvas-drop-zone"), {
      sourcePosition: { x: 24, y: 24 },
      targetPosition: { x: 180, y: 220 },
    });
    await expect(nodes).toHaveCount(baseline + 1);
    await expect(page.getByTestId("studio-button-inspector")).toBeVisible();
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(nodes).toHaveCount(baseline);

    await page.getByTestId("studio-preview").click();
    await expect(page.getByTestId("studio-editor-rail")).toHaveCount(0);
    await page.screenshot({ path: path.join(evidence, "desktop-preview.png") });
    await page.getByTestId("studio-preview").click();

    await page.setViewportSize({ width: 820, height: 1180 });
    await expect(page.getByTestId("studio-editor-rail")).toBeVisible();
    await page.getByTestId("studio-rail-add").click();
    await page.getByTestId("studio-add-buttons").click();
    await page.getByTestId("studio-button-family-brand").click();
    await expect(page.getByTestId("standard-button-preset-brand-primary").last()).toHaveAttribute("draggable", "true");
    await page.screenshot({ path: path.join(evidence, "tablet-discovery.png") });
    } finally {
      const current = await page.request.get("/api/card/draft");
      if (current.ok()) {
        const state = await current.json() as { revision: number };
        const restored = await page.request.put("/api/card/draft", { data: { draft: baselineState.draft, expectedRevision: state.revision } });
        expect(restored.ok()).toBeTruthy();
      }
    }
  });

  test("uses tap placement and explicit Move controls without phone drag", async ({ page }) => {
    const baselineResponse = await page.request.get("/api/card/draft");
    expect(baselineResponse.ok()).toBeTruthy();
    const baselineState = await baselineResponse.json() as { draft: unknown; revision: number };
    try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/review/studio", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("studio-reconstitution-shell")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("studio-reconstitution-shell")).toHaveAttribute("data-session-restored", "true");
    await page.getByTestId("studio-rail-add").click();
    await page.getByTestId("studio-add-buttons").click();
    await page.getByTestId("studio-button-family-standard").click();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId("studio-phone-toolbar")).toBeVisible();
    const preset = page.getByTestId("standard-button-preset-icon-label").last();
    await expect(preset).toHaveAttribute("draggable", "false");
    const nodes = page.locator('[data-card-surface-flow="true"] > [data-composition-kind]');
    const baseline = await nodes.count();
    await preset.click();
    await expect(nodes).toHaveCount(baseline + 1);
    await expect(page.getByTestId("studio-button-inspector")).toBeVisible();
    await expect(page.getByTestId("studio-selection-toolbar")).toBeHidden();
    await expect(page.getByRole("navigation", { name: "Phone editor tools" }).getByRole("button", { name: "Move", exact: true })).toBeVisible();
    await page.getByRole("navigation", { name: "Phone editor tools" }).getByRole("button", { name: "Move", exact: true }).click();
    const positionInspector = page.getByTestId("studio-composition-inspector");
    await expect(positionInspector).toBeVisible();
    await expect(positionInspector).toContainText("Position · Flow placement");
    await expect(positionInspector.getByRole("button", { name: "Move earlier", exact: true })).toBeEnabled();
    await expect(positionInspector.getByRole("button", { name: "Send backward", exact: true })).toHaveCount(0);
    await expect(positionInspector.getByRole("spinbutton", { name: "X", exact: true })).toHaveCount(0);
    await positionInspector.getByRole("button", { name: "Move earlier", exact: true }).click();
    await page.screenshot({ path: path.join(evidence, "phone-layout.png") });

    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(nodes).toHaveCount(baseline);
    } finally {
      const current = await page.request.get("/api/card/draft");
      if (current.ok()) {
        const state = await current.json() as { revision: number };
        const restored = await page.request.put("/api/card/draft", { data: { draft: baselineState.draft, expectedRevision: state.revision } });
        expect(restored.ok()).toBeTruthy();
      }
    }
  });

  test("keeps phone depth singular when Add opens from the Inspector", async ({ page }) => {
    const baselineResponse = await page.request.get("/api/card/draft");
    expect(baselineResponse.ok()).toBeTruthy();
    const baselineState = await baselineResponse.json() as { draft: unknown; revision: number };
    try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/review/studio", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("studio-reconstitution-shell")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("studio-reconstitution-shell")).toHaveAttribute("data-session-restored", "true");
    const phoneTools = page.getByRole("navigation", { name: "Phone editor tools" });
    await phoneTools.getByRole("button", { name: "Add", exact: true }).click();
    await page.getByTestId("studio-add-buttons").click();
    await page.getByTestId("studio-button-family-standard").click();
    await page.getByTestId("standard-button-preset-icon-label").last().click();
    await expect(page.getByTestId("studio-button-inspector")).toBeVisible();
    await phoneTools.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByTestId("studio-button-inspector")).toHaveCount(0);
    await expect(page.getByTestId("studio-discovery-drawer")).toBeVisible();
    await expect(page.getByTestId("studio-add-buttons")).toBeVisible();
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    } finally {
      const current = await page.request.get("/api/card/draft");
      if (current.ok()) {
        const state = await current.json() as { revision: number };
        const restored = await page.request.put("/api/card/draft", { data: { draft: baselineState.draft, expectedRevision: state.revision } });
        expect(restored.ok()).toBeTruthy();
      }
    }
  });
});
