import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { TapConnectCardConfig } from "@/lib/brand/tap-card";
import { canonicalizeExperienceConfig, projectExperiencePage } from "@/lib/fusion/card/experience-pages";

const enabled = process.env.COMPOSITION_PARENT_AUTHORITY_ACCEPTANCE === "1";
const evidence = path.join("tmp", "composition-parent-authority");

test("proves direct Modules, optional Containers, flow recompile, persistence, and Preview parity", async ({ page }) => {
  test.skip(!enabled, "Set COMPOSITION_PARENT_AUTHORITY_ACCEPTANCE=1 for the isolated Rich review runtime");
  test.setTimeout(120_000);
  page.setDefaultTimeout(10_000);
  mkdirSync(evidence, { recursive: true });

  await page.goto("/review/studio", { waitUntil: "domcontentloaded" });
  const shell = page.getByTestId("studio-reconstitution-shell");
  await expect(shell).toBeVisible();
  await expect(shell).toHaveAttribute("data-session-restored", "true");
  let baselineResponse = await page.request.get("/api/card/draft");
  expect(baselineResponse.ok()).toBeTruthy();
  let baseline = await baselineResponse.json() as { draft: Record<string, unknown>; revision: number };
  const baselineConfig = baseline.draft as unknown as TapConnectCardConfig;
  const activePageId = baselineConfig.experience?.defaultPageId;
  const baselineProjection = projectExperiencePage(baselineConfig, activePageId);
  const root = baselineProjection.rootComposition as { nodes?: Array<{ id: string; name?: string; parentId?: string | null; props?: { text?: string } }> } | undefined;
  const proofContainerIds = new Set((root?.nodes ?? [])
    .filter((node) => node.name === "Smoked Glass Container" && (root?.nodes ?? []).some((child) => child.parentId === node.id && String(child.props?.text || "").startsWith("A longer accessible paragraph")))
    .map((node) => node.id));
  if (proofContainerIds.size) {
    const cleanDraft = projectExperiencePage(structuredClone(baseline.draft) as unknown as TapConnectCardConfig, activePageId);
    const cleanRoot = cleanDraft.rootComposition as typeof root;
    if (cleanRoot?.nodes) cleanRoot.nodes = cleanRoot.nodes.filter((node) => !proofContainerIds.has(node.id) && !proofContainerIds.has(node.parentId || ""));
    const cleanup = await page.request.put("/api/card/draft", { data: { draft: canonicalizeExperienceConfig(cleanDraft, activePageId), expectedRevision: baseline.revision } });
    expect(cleanup.ok()).toBeTruthy();
    await page.reload({ waitUntil: "domcontentloaded" });
    baselineResponse = await page.request.get("/api/card/draft");
    expect(baselineResponse.ok()).toBeTruthy();
    baseline = await baselineResponse.json() as { draft: Record<string, unknown>; revision: number };
  }

  try {
    const authority = page.locator('[data-parent-authority="flow-v1"]');
    await expect(authority).toBeVisible();
    const initialContainers = await authority.locator('[data-composition-kind="container"]').count();
    const initialNestedModules = await authority.locator('[data-composition-kind="container"] [data-composition-kind="module"]').count();
    expect(await authority.locator('[data-composition-kind="module"]').count()).toBeGreaterThan(0);

    await page.getByTestId("studio-rail-add").click();
    await page.getByTestId("studio-add-container").click();
    await expect(page.getByTestId("studio-container-treatment-gallery")).toBeVisible();
    await page.getByTestId("studio-add-container-smoked_glass").click();
    await page.getByTestId("studio-composition-inspector").getByRole("button", { name: "Close Inspector", exact: true }).click();
    await page.getByTestId("studio-rail-add").click();
    await expect(page.getByTestId("studio-add-target")).toContainText("Smoked Glass Container");
    await page.getByTestId("studio-add-text").click();
    await page.getByRole("button", { name: /Body Text Box/ }).click();
    await expect(authority.locator('[data-composition-kind="container"]')).toHaveCount(initialContainers + 1);
    const container = authority.locator('[data-composition-kind="container"]').last();
    await expect(container.locator('[data-composition-kind="module"]')).toHaveCount(1);

    const before = await container.evaluate((element) => Math.round(element.getBoundingClientRect().height));
    await page.getByRole("button", { name: "Edit · Text", exact: true }).click();
    await expect(page.getByTestId("studio-selection-breadcrumb")).toHaveText("Card Surface › Smoked Glass Container › Text");
    await page.getByTestId("studio-text-content").fill("A longer accessible paragraph proves that content growth recompiles Container height automatically without changing membership or asking the Host to resize structural furniture.");
    await expect.poll(() => container.evaluate((element) => Math.round(element.getBoundingClientRect().height))).toBeGreaterThan(before);

    if (!(await page.getByTestId("studio-outline-view").isVisible())) await page.getByTestId("studio-rail-layers").click();
    await expect(page.getByTestId("studio-outline-view")).toContainText("Card Surface");
    await expect(page.getByTestId("studio-outline-view").locator('[data-outline-parent]')).toHaveCount(initialContainers + 1);

    await page.screenshot({ path: path.join(evidence, "desktop-container-flow.png"), fullPage: true });
    await expect.poll(async () => {
      const response = await page.request.get("/api/card/draft");
      if (!response.ok()) return baseline.revision;
      const state = await response.json() as { revision: number; draft: unknown };
      return JSON.stringify(state.draft).includes("A longer accessible paragraph")
        ? state.revision
        : baseline.revision;
    }, { timeout: 10_000 }).toBeGreaterThan(baseline.revision);
    await expect(page.getByText("Saved", { exact: true }).first()).toBeVisible({ timeout: 10_000 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-parent-authority="flow-v1"] [data-composition-kind="container"] [data-composition-kind="module"]')).toHaveCount(initialNestedModules + 1);

    if (await page.getByTestId("studio-discovery-drawer").isVisible()) await page.getByTestId("studio-drawer-close").click();
    await page.locator('[data-parent-authority="flow-v1"] [data-composition-kind="container"] [data-composition-kind="module"]').last().click({ force: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId("studio-phone-toolbar")).toBeVisible();
    await page.getByTestId("studio-phone-toolbar").getByRole("button", { name: "Edit", exact: true }).click();
    await expect(page.getByTestId("studio-composition-inspector")).toBeVisible();
    await page.screenshot({ path: path.join(evidence, "phone-container-flow.png"), fullPage: true });
    await page.getByTestId("studio-composition-inspector").getByRole("button", { name: "Close Inspector", exact: true }).click();
    await page.getByTestId("studio-preview").click();
    await expect(page.locator('[data-parent-authority="flow-v1"]')).toHaveAttribute("data-edit-mode", "false");
    await expect(page.locator('[data-parent-authority="flow-v1"] [data-composition-kind="container"] [data-composition-kind="module"]')).toHaveCount(initialNestedModules + 1);

    await page.goto("/dashboard/card/preview", { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-parent-authority="flow-v1"] [data-composition-kind="container"] [data-composition-kind="module"]')).toHaveCount(initialNestedModules + 1);
  } finally {
    const current = await page.request.get("/api/card/draft");
    if (current.ok()) {
      const state = await current.json() as { revision: number };
      const restored = await page.request.put("/api/card/draft", { data: { draft: baseline.draft, expectedRevision: state.revision } });
      expect(restored.ok()).toBeTruthy();
    }
  }
});
