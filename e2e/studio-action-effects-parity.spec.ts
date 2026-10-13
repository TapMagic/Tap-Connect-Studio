import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { TapConnectCardConfig } from "@/lib/brand/tap-card";
import { canonicalizeExperienceConfig, projectExperiencePage } from "@/lib/fusion/card/experience-pages";

const enabled = process.env.STUDIO_ACTION_EFFECTS_ACCEPTANCE === "1";
const proofRoot = path.join("docs", "product-reconstitution", "creative-studio-platform", "proofs", "studio-action-effects");

test("authors shared Button effects and preserves phone Preview plus reduced-motion behavior", async ({ page }) => {
  test.skip(!enabled, "Set STUDIO_ACTION_EFFECTS_ACCEPTANCE=1 for the isolated local proof");
  test.setTimeout(180_000);
  page.setDefaultTimeout(20_000);
  mkdirSync(proofRoot, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/dashboard/card/edit", { waitUntil: "domcontentloaded" });
  const baselineResponse = await page.request.get("/api/card/draft");
  expect(baselineResponse.ok()).toBeTruthy();
  const baseline = await baselineResponse.json() as { draft: TapConnectCardConfig; revision: number };
  const activePageId = baseline.draft.experience?.defaultPageId;
  const projected = projectExperiencePage(structuredClone(baseline.draft), activePageId);
  if (!projected.rootComposition) throw new Error("Effects proof requires the canonical Card Surface composition.");
  const proofDraft = canonicalizeExperienceConfig({
    ...projected,
    rootComposition: {
      ...projected.rootComposition,
      nodes: [],
      groups: [],
      pageHeightPx: 700,
      compositionMode: { version: 1, mode: "flow", layeredHeightPx: 700, layeredPlacementInitialized: false, bounds: "constrain" },
    },
  }, activePageId);

  const ensureRootTarget = async () => {
    if (!(await page.getByTestId("studio-outline-view").isVisible().catch(() => false))) {
      await page.getByTestId("studio-rail-layers").click();
    }
    await page.getByTestId("studio-outline-card-surface").click();
    await page.getByTestId("studio-drawer-close").click();
  };
  const addButton = async () => {
    await page.getByTestId("studio-rail-add").click();
    await page.getByTestId("studio-add-buttons").click();
    await page.getByTestId("studio-button-family-standard").click();
    await page.getByTestId("standard-button-preset-icon-label").last().click();
    await expect(page.getByTestId("studio-button-inspector")).toBeVisible();
    const selected = page.locator('[data-composition-kind="module"][data-primitive="button"][data-selected="true"]');
    const id = await selected.getAttribute("data-composition-node");
    expect(id).toBeTruthy();
    await page.getByTestId("studio-inspector-tab-advanced").click();
    await page.getByLabel("Enable presentation effects").check();
    return id!;
  };
  const closeInspector = async () => page.getByRole("button", { name: "Close Button Inspector" }).click();

  try {
    const seeded = await page.request.put("/api/card/draft", { data: { draft: proofDraft, expectedRevision: baseline.revision } });
    expect(seeded.ok()).toBeTruthy();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("studio-reconstitution-shell")).toBeVisible();
    await ensureRootTarget();

    const glowId = await addButton();
    await page.getByRole("checkbox", { name: "Glow / halo" }).check();
    await page.getByRole("combobox", { name: "Reduced motion" }).selectOption("static_glow");
    await closeInspector();

    await ensureRootTarget();
    const interactionId = await addButton();
    await page.getByRole("combobox", { name: "Interaction" }).selectOption("lift-press");
    await closeInspector();

    await ensureRootTarget();
    const highlightId = await addButton();
    await page.getByRole("combobox", { name: "Motion / highlight" }).selectOption("highlight_sweep");
    await page.getByRole("slider", { name: /Intensity/ }).fill("32");
    await page.getByRole("spinbutton", { name: "Duration" }).fill("3.2");
    await page.getByRole("combobox", { name: "Reduced motion" }).selectOption("static_highlight");
    await closeInspector();

    const save = page.getByTestId("studio-save");
    if (await save.isEnabled()) await save.click();
    await expect(save).toBeDisabled();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator(`[data-composition-node="${glowId}"]`)).toBeVisible();

    await page.getByRole("button", { name: "phone preview" }).click();
    await page.getByTestId("studio-preview").click();
    const glow = page.locator(`[data-composition-node="${glowId}"] [data-action-effects-contract]`);
    const interaction = page.locator(`[data-composition-node="${interactionId}"] [data-action-effects-contract]`);
    const highlight = page.locator(`[data-composition-node="${highlightId}"] [data-action-effects-contract]`);
    await expect(glow).toHaveAttribute("data-action-glow", "true");
    await expect(interaction).toHaveAttribute("data-action-interaction", "lift-press");
    await expect(highlight).toHaveAttribute("data-action-motion", "highlight_sweep");
    await page.getByTestId("card-preview-phone").screenshot({ path: path.join(proofRoot, "01-phone-390-shared-effects.png") });

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect.poll(() => highlight.locator(".tc-action-motion").evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
    await expect(glow).toHaveAttribute("data-reduced-motion-fallback", "static_glow");
    await expect(highlight).toHaveAttribute("data-reduced-motion-fallback", "static_highlight");
    await page.getByTestId("card-preview-phone").screenshot({ path: path.join(proofRoot, "02-phone-390-reduced-motion.png") });
  } finally {
    const currentResponse = await page.request.get("/api/card/draft");
    if (currentResponse.ok()) {
      const current = await currentResponse.json() as { revision: number };
      await page.request.put("/api/card/draft", { data: { draft: baseline.draft, expectedRevision: current.revision } });
    }
  }
});
