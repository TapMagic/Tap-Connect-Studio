/**
 * Pexels / Logo.dev → durable roles (Page Background + Image + Pattern).
 * Uses fixture providers when CREATIVE_PROVIDER_MODE=fixture + TAPCONNECT_DEV_AUTH=1.
 */
import { expect, test } from "@playwright/test";
import {
  openBlankStudio,
  ownerClick,
} from "./owner-sim/physical-harness";

test.describe("provider visual plane roles", () => {
  test.setTimeout(240_000);

  test("Pexels photography as Page Background + Image insert; Brand Use as Pattern", async ({
    page,
  }) => {
    await openBlankStudio(page);

    await ownerClick(page.getByTestId("card-creative-tool-backgrounds"), "Background");
    await expect(page.getByTestId("visual-plane-studio-page")).toBeVisible({ timeout: 15_000 });
    await ownerClick(page.getByTestId("visual-plane-kind-image"), "Photography kind");

    const mediaDoor = page
      .getByTestId("visual-plane-studio-page")
      .getByRole("button", { name: /Browse|Media|Photography|Choose|Pexels/i })
      .first();
    if ((await mediaDoor.count()) === 0) {
      // MediaPicker may be inline — look for Pexels tab
      const pexelsTab = page.getByRole("tab", { name: /Pexels/i }).first();
      await expect(pexelsTab).toBeVisible({ timeout: 15_000 });
      await ownerClick(pexelsTab, "Pexels tab");
    } else {
      await ownerClick(mediaDoor, "Open media");
      const pexelsTab = page.getByRole("tab", { name: /Pexels/i }).first();
      if (await pexelsTab.isVisible().catch(() => false)) {
        await ownerClick(pexelsTab, "Pexels tab");
      }
    }

    const result = page
      .locator("[data-testid^='media-result-'], [data-testid^='pexels-result-'], [data-media-candidate]")
      .first()
      .or(page.getByRole("button", { name: /Import|Use|Select/i }).first());
    await expect(result).toBeVisible({ timeout: 20_000 });
    await ownerClick(result, "Pexels result");

    const useOrInsert = page
      .getByRole("button", { name: /Use as|Insert|Add to Card|Import|Apply/i })
      .first();
    if (await useOrInsert.isVisible().catch(() => false)) {
      await ownerClick(useOrInsert, "Apply media");
    }

    await expect
      .poll(async () => {
        const kind = await page
          .getByTestId("visual-plane-kind-image")
          .getAttribute("aria-pressed")
          .catch(() => null);
        const bg = page.locator("[data-composition-background]").first();
        const style =
          (await bg.count()) > 0
            ? await bg.evaluate((el) => getComputedStyle(el).backgroundImage)
            : "";
        return kind === "true" || /url\(/i.test(style);
      }, { timeout: 25_000 })
      .toBeTruthy();

    // Use as Pattern = shared Pattern engine via image+repeat (durable Brand mark)
    await expect(page.getByTestId("visual-plane-use-as-pattern-page")).toBeVisible();
    await ownerClick(page.getByTestId("visual-plane-use-as-pattern-page"), "Use as Pattern");
    await expect(page.getByTestId("visual-plane-use-as-pattern-page")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await expect(page.getByTestId("visual-plane-repeat-page")).toHaveValue("repeat");
  });
});
