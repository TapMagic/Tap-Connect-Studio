import { expect, test, type Page } from "@playwright/test";

const enabled = process.env.STUDIO_TRANSIENT_TASK_ACCEPTANCE === "1";

async function openCabinetIdentity(page: Page) {
  await expect(page.getByTestId("studio-reconstitution-shell")).toHaveAttribute("data-session-restored", "true");
  await page.locator('[data-parent-authority="flow-v1"] [data-composition-kind="module"][aria-label="Cabinet Noir Single Stack Curated System"]').click({ position: { x: 8, y: 8 } });
  const phoneToolbar = page.getByTestId("studio-phone-toolbar");
  if (await phoneToolbar.isVisible().catch(() => false)) await phoneToolbar.getByRole("button", { name: "Edit", exact: true }).click();
  else await page.getByTestId("studio-curated-selection-identity").click();
  const panel = page.getByTestId("studio-assembly-inspector");
  await expect(panel).toBeVisible();
  if (await phoneToolbar.isVisible().catch(() => false)) {
    while ((await panel.getAttribute("data-sheet-size")) !== "expanded") await panel.getByRole("button", { name: "Change panel height" }).click();
  }
  return panel.getByTestId("studio-authoring-resource-slot-identity");
}

async function assertCoherentEdit(page: Page) {
  const shell = page.getByTestId("studio-reconstitution-shell");
  await expect(shell).toHaveAttribute("data-workspace-task", "edit-contents");
  await expect(shell).toHaveAttribute("data-workspace-composition", "deep-edit");
  await expect(page.getByRole("dialog", { name: "Adjust identity crop" })).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "Media & Asset Browser" })).toHaveCount(0);
  await expect(page.getByTestId("studio-assembly-inspector")).toBeVisible();
  await expect(page.getByTestId("studio-preview")).toBeVisible();
  await expect(page.getByTestId("preview-live-device")).toBeVisible();
}

test.describe.serial("Studio transient task completion", () => {
  test.skip(!enabled, "Set STUDIO_TRANSIENT_TASK_ACCEPTANCE=1 for the isolated Rich review runtime");
  test.setTimeout(180_000);

  test("Apply and Cancel restore desktop Edit, Preview, Live Device, history, save, and reload", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto("/review/studio", { waitUntil: "domcontentloaded" });
    const identity = await openCabinetIdentity(page);
    const projection = identity.locator("[data-visual-fit-contract]");
    const originalZoom = await projection.getAttribute("data-governed-zoom");

    await identity.getByTestId("studio-authoring-resource-slot-identity-adjust").click();
    const crop = page.getByRole("dialog", { name: "Adjust identity crop" });
    await expect(page.getByTestId("studio-reconstitution-shell")).toHaveAttribute("data-workspace-task", "adjust-resource");
    await crop.getByRole("button", { name: "Zoom in" }).click();
    await crop.getByRole("button", { name: "Apply", exact: true }).click();
    await assertCoherentEdit(page);
    const appliedZoom = await projection.getAttribute("data-governed-zoom");
    expect(appliedZoom).not.toBe(originalZoom);
    await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeEnabled();

    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(projection).toHaveAttribute("data-governed-zoom", originalZoom || "1.00");
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await expect(projection).toHaveAttribute("data-governed-zoom", appliedZoom || "1.05");

    await identity.getByTestId("studio-authoring-resource-slot-identity-adjust").click();
    await crop.getByRole("button", { name: "Zoom in" }).click();
    await crop.getByRole("button", { name: "Cancel", exact: true }).click();
    await assertCoherentEdit(page);
    await expect(projection).toHaveAttribute("data-governed-zoom", appliedZoom || "1.05");

    await page.getByTestId("studio-preview").click();
    await expect(page.getByTestId("studio-reconstitution-shell")).toHaveAttribute("data-workspace-task", "preview-card");
    await expect(page.locator('[data-testid^="composition-move-"]')).toHaveCount(0);
    await page.getByTestId("studio-preview").click();
    await assertCoherentEdit(page);

    await page.getByTestId("preview-live-device").click();
    await expect(page.getByTestId("studio-live-device-panel")).toBeVisible();
    await page.getByRole("button", { name: "Close Live Device Preview" }).click();
    await assertCoherentEdit(page);

    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(projection).toHaveAttribute("data-governed-zoom", originalZoom || "1.00");
    if (await page.getByTestId("studio-save").isEnabled()) await page.getByTestId("studio-save").click();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("studio-reconstitution-shell")).toHaveAttribute("data-workspace-task", "compose-card");
    await expect(page.getByTestId("studio-reconstitution-shell")).toHaveAttribute("data-workspace-composition", "compose");
    await expect(page.getByTestId("studio-assembly-inspector")).toHaveCount(0);
    await expect(page.getByRole("dialog", { name: "Adjust identity crop" })).toHaveCount(0);
    await expect(page.getByTestId("studio-preview")).toBeVisible();
    await expect(page.getByTestId("preview-live-device")).toBeVisible();
  });

  test("phone Apply and Cancel return to the same governed authoring context", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/review/studio", { waitUntil: "domcontentloaded" });
    const identity = await openCabinetIdentity(page);
    const projection = identity.locator("[data-visual-fit-contract]");
    const originalZoom = await projection.getAttribute("data-governed-zoom");
    const crop = page.getByRole("dialog", { name: "Adjust identity crop" });

    await identity.getByTestId("studio-authoring-resource-slot-identity-adjust").click();
    await crop.getByRole("button", { name: "Zoom in" }).click();
    await crop.getByRole("button", { name: "Apply", exact: true }).click();
    await assertCoherentEdit(page);
    const appliedZoom = await projection.getAttribute("data-governed-zoom");
    expect(appliedZoom).not.toBe(originalZoom);

    await identity.getByTestId("studio-authoring-resource-slot-identity-adjust").click();
    await crop.getByRole("button", { name: "Zoom in" }).click();
    await crop.getByRole("button", { name: "Cancel", exact: true }).click();
    await assertCoherentEdit(page);
    await expect(projection).toHaveAttribute("data-governed-zoom", appliedZoom || "1.05");

    await page.getByRole("button", { name: "Undo", exact: true }).click();
    if (await page.getByTestId("studio-save").isEnabled()) await page.getByTestId("studio-save").click();
  });

  test("Asset browser hands off to Crop Apply without completing the wrong return point", async ({ page }) => {
    await page.route(/\/api\/media\/[^/]+\/used$/, async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) }));
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto("/review/studio", { waitUntil: "domcontentloaded" });
    const identity = await openCabinetIdentity(page);
    const originalSrc = await identity.locator("[data-visual-fit-contract] img").getAttribute("src");

    await identity.getByRole("button", { name: "Replace", exact: true }).click();
    const browser = page.getByRole("dialog", { name: "Media & Asset Browser" });
    await expect(browser).toBeVisible();
    await expect(page.getByTestId("studio-reconstitution-shell")).toHaveAttribute("data-workspace-task", "browse-assets");
    await browser.getByRole("option").first().click();
    await browser.getByRole("button", { name: "Insert selected" }).click();

    const crop = page.getByRole("dialog", { name: "Adjust identity crop" });
    await expect(browser).toBeHidden();
    await expect(crop).toBeVisible();
    await expect(page.getByTestId("studio-reconstitution-shell")).toHaveAttribute("data-workspace-task", "adjust-resource");
    const candidateSrc = await crop.locator("img").getAttribute("src");
    await crop.getByRole("button", { name: "Zoom in", exact: true }).click();
    await crop.getByRole("button", { name: "Apply", exact: true }).click();
    await assertCoherentEdit(page);
    if (candidateSrc) await expect(identity.locator("[data-visual-fit-contract] img")).toHaveAttribute("src", candidateSrc);
    await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeEnabled();

    await page.getByTestId("studio-preview").click();
    await expect(page.getByTestId("studio-reconstitution-shell")).toHaveAttribute("data-workspace-task", "preview-card");
    await page.getByTestId("studio-preview").click();
    await assertCoherentEdit(page);
    await page.getByTestId("preview-live-device").click();
    await expect(page.getByTestId("studio-live-device-panel")).toBeVisible();
    await page.getByRole("button", { name: "Close Live Device Preview" }).click();
    await assertCoherentEdit(page);

    await page.getByRole("button", { name: "Undo", exact: true }).click();
    if (originalSrc) await expect(identity.locator("[data-visual-fit-contract] img")).toHaveAttribute("src", originalSrc);
    if (await page.getByTestId("studio-save").isEnabled()) await page.getByTestId("studio-save").click();
  });
});
