import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  dismissTransientStudioChrome,
  insertFamily,
  openBlankStudio,
  ownerClick,
  saveDraft,
} from "./owner-sim/physical-harness";

const enabled = process.env.COSMIC_GLASS_ACCEPTANCE === "1";
const out = path.join("tmp", "cosmic-glass-signature");

test.describe("Cosmic Glass recovered visual evidence", () => {
  test.skip(!enabled, "Set COSMIC_GLASS_ACCEPTANCE=1");
  test.setTimeout(120_000);

  test("renders canonical, closeup, variants, phone, divider, and full desktop", async ({ page }) => {
    fs.mkdirSync(out, { recursive: true });
    const shot = async (query: string, testId: string, file: string) => {
      await page.goto(`/dev/cosmic-glass-specimen?${query}`, { waitUntil: "networkidle" });
      const target = page.getByTestId(testId);
      await expect(target).toBeVisible();
      if (testId === "cosmic-glass-hero" || testId === "cosmic-glass-full-desktop") {
        await expect(page.locator("[data-cg-measured='true']").first()).toBeVisible();
      }
      await target.screenshot({ path: path.join(out, file) });
    };
    await shot("view=hero", "cosmic-glass-hero", "01-hero-canonical.png");
    await page.getByTestId("cosmic-glass-ring-seat").screenshot({ path: path.join(out, "02-ring-seat-closeup.png") });
    await shot("view=hero&finish=copper", "cosmic-glass-hero", "03-ring-copper.png");
    await shot("view=hero&shape=soft_square", "cosmic-glass-hero", "04-ring-nonround.png");
    await shot("view=hero&phone=1", "cosmic-glass-hero", "05-phone-hero.png");
    await shot("view=divider&center=diamond", "cosmic-glass-divider", "06-divider-default.png");
    await shot("view=divider&center=identity", "cosmic-glass-divider", "07-divider-tree-or-logo.png");
    await shot("view=divider&center=none", "cosmic-glass-divider", "08-divider-none.png");
    await shot("view=full", "cosmic-glass-full-desktop", "09-full-desktop.png");

    const hero = page.getByTestId("cosmic-glass-hero");
    if (await hero.count()) {
      const boxes = await hero.locator(".cg-ring,.cg-copy,.cg-cue").evaluateAll((els) => els.map((el) => {
        const r = el.getBoundingClientRect();
        return { left:r.left,right:r.right,top:r.top,bottom:r.bottom };
      }));
      const [ring, copy, cue] = boxes;
      expect(ring!.right).toBeLessThanOrEqual(copy!.left + 1);
      expect(copy!.right).toBeLessThanOrEqual(cue!.left + 1);
    }
  });

  test("applies through Cabinet and survives save/reload with Action intact", async ({ page }) => {
    await openBlankStudio(page);
    await dismissTransientStudioChrome(page);
    await insertFamily(page, "button");
    const button = page.locator("[data-composition-node][data-element-kind='button'], [data-composition-node] a[data-button-presentation]").first();
    await expect(button).toBeVisible({ timeout: 20_000 });
    await button.click();
    await ownerClick(page.getByTestId("contextual-button-action"), "Button Action");
    await page.getByLabel("Button action type").selectOption("website");
    await page.getByLabel("Button destination").fill("https://example.com/cosmic-glass");
    await button.click();
    const visualParts = page.getByTestId("contextual-button-visual-parts").or(page.getByTestId("contextual-visual-parts")).first();
    await ownerClick(visualParts, "Visual Parts");
    await expect(page.getByTestId("visual-parts-cabinet")).toBeVisible();
    await ownerClick(page.getByTestId("vp-drawer-curated"), "Curated");
    await ownerClick(page.getByTestId("vp-part-family_cosmic_glass_signature"), "Cosmic Glass");

    const action = page.locator("[data-vp-cosmic-glass-host='true']").first();
    await expect(action).toBeVisible();
    await expect(action).toHaveAttribute("data-vp-assembly", "recipe/signature/cosmic-glass-action/v1");
    const hrefBefore = await action.getAttribute("data-action-href");
    await ownerClick(page.getByTestId("vp-cosmic-ring-copper"), "Copper ring");
    await ownerClick(page.getByTestId("vp-cosmic-shape-soft_square"), "Soft-square ring");
    await expect(action.locator("[data-cg-ring-finish='copper']")).toBeVisible();

    await saveDraft(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await dismissTransientStudioChrome(page);
    const reloaded = page.locator("[data-vp-cosmic-glass-host='true']").first();
    await expect(reloaded).toBeVisible({ timeout: 30_000 });
    expect(await reloaded.getAttribute("data-action-href")).toBe(hrefBefore);
    await expect(reloaded.locator("[data-cg-ring-finish='copper']")).toBeVisible();
    await expect(reloaded.locator("[data-cg-ring-shape='soft_square']")).toBeVisible();
    const previewButton = page.getByTestId("card-preview").or(page.getByRole("button", { name: /^Preview$/i })).first();
    if (await previewButton.isVisible().catch(() => false)) {
      await ownerClick(previewButton, "Preview");
      const previewAction = page.locator("[data-vp-cosmic-glass-host='true']").first();
      await expect(previewAction).toBeVisible();
      expect(await previewAction.getAttribute("data-action-href")).toBe(hrefBefore);
      await expect(previewAction.locator("[data-cg-ring-finish='copper']")).toBeVisible();
    }
  });
});
