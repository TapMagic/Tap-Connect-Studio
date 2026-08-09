import { expect, test } from "@playwright/test";
import {
  dismissSaveDialogIfPresent,
  dismissTransientStudioChrome,
  openBlankStudio,
  ownerClick,
} from "./owner-sim/physical-harness";

test.describe("visual plane independence", () => {
  test.setTimeout(240_000);

  test("Page / Surface / Container share VisualPlaneStudio with independent targets", async ({
    page,
  }) => {
    await openBlankStudio(page);

    // Page plane on Blank Card root
    await ownerClick(page.getByTestId("card-creative-tool-backgrounds"), "Background");
    await expect(page.getByTestId("visual-plane-studio-page")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("visual-plane-studio-page")).toHaveAttribute(
      "data-visual-plane-target",
      "page"
    );
    await expect(page.getByTestId("visual-plane-use-as-pattern-page")).toBeVisible();
    await ownerClick(page.getByTestId("visual-plane-kind-pattern"), "Page pattern");
    await expect(page.getByTestId("visual-plane-catalog-page")).toBeVisible();

    // Essential Card gives real Sections for Surface plane proof
    await ownerClick(page.getByTestId("card-creative-tool-templates"), "Templates");
    await ownerClick(
      page.getByTestId("card-template-library").getByRole("button", { name: /^Essential Card$/i }),
      "Essential Card"
    );
    await dismissSaveDialogIfPresent(page);
    await dismissTransientStudioChrome(page);

    const section = page.locator("[data-section-id]").first();
    await expect(section).toBeVisible({ timeout: 20_000 });
    await section.click({ position: { x: 20, y: 20 } });
    await ownerClick(
      page
        .getByTestId("card-contextual-object-tools")
        .getByRole("button", { name: /^Appearance$/i })
        .first(),
      "Section Appearance"
    );
    await expect(page.getByTestId("visual-plane-studio-surface")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("visual-plane-studio-surface")).toHaveAttribute(
      "data-visual-plane-target",
      "surface"
    );

    // Container plane
    await ownerClick(page.getByTestId("card-creative-tool-tools"), "Tools");
    const starter = page.locator("[data-testid^='starter-container-']").first();
    await expect(starter).toBeVisible({ timeout: 10_000 });
    await ownerClick(starter, "Starter container");
    const container = page.locator("[data-component-kind='container']").first();
    await expect(container).toBeVisible({ timeout: 15_000 });
    await container.click({ position: { x: 24, y: 24 } });
    await ownerClick(page.getByTestId("contextual-container-background"), "Container Background");
    const containerStudio = page.getByTestId("visual-plane-studio-container");
    await expect(containerStudio).toBeVisible({ timeout: 15_000 });
    await expect(containerStudio).toHaveAttribute("data-visual-plane-target", "container");
    await expect(
      page.getByTestId("visual-plane-studio-container").getByTestId("visual-plane-use-as-pattern-container")
    ).toBeVisible();
    // Kind tabs + Brand pattern door prove Container shares the same Visual Plane studio.
    await expect(
      page.getByTestId("visual-plane-studio-container").getByTestId("visual-plane-kind-pattern")
    ).toBeVisible();
    await expect(
      page.getByTestId("visual-plane-studio-container").getByTestId("visual-plane-kind-texture")
    ).toBeVisible();
  });
});
