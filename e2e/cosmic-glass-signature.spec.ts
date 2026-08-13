import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- package.json declares @types/pngjs; this local install omits that dev type folder.
import { PNG } from "pngjs";
import {
  dismissTransientStudioChrome,
  insertFamily,
  openBlankStudio,
  ownerClick,
  saveDraft,
} from "./owner-sim/physical-harness";

const enabled = process.env.COSMIC_GLASS_ACCEPTANCE === "1";
const out = path.join("tmp", "cosmic-glass-signature-final-ring-polish");

function writeBeforeAfter(beforePath: string, afterPath: string, outputPath: string) {
  const before = PNG.sync.read(fs.readFileSync(beforePath));
  const after = PNG.sync.read(fs.readFileSync(afterPath));
  const gap = 12;
  const canvas = new PNG({ width: before.width + after.width + gap, height: Math.max(before.height, after.height) });
  PNG.bitblt(before, canvas, 0, 0, before.width, before.height, 0, 0);
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = before.width; x < before.width + gap; x += 1) {
      const i = (y * canvas.width + x) * 4;
      canvas.data[i] = 213; canvas.data[i + 1] = 164; canvas.data[i + 2] = 60; canvas.data[i + 3] = 255;
    }
  }
  PNG.bitblt(after, canvas, 0, 0, after.width, after.height, before.width + gap, 0);
  fs.writeFileSync(outputPath, PNG.sync.write(canvas));
}

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
    const ring = await page.getByTestId("cosmic-glass-ring-seat").boundingBox();
    const receiver = await page.getByTestId("cosmic-glass-ring-receiver").boundingBox();
    expect(ring).toBeTruthy(); expect(receiver).toBeTruthy();
    const left = Math.min(ring!.x, receiver!.x) - 10;
    const top = Math.min(ring!.y, receiver!.y) - 10;
    const right = Math.max(ring!.x + ring!.width, receiver!.x + receiver!.width) + 24;
    const bottom = Math.max(ring!.y + ring!.height, receiver!.y + receiver!.height) + 10;
    await page.screenshot({ path: path.join(out, "02-ring-socket-closeup.png"), clip: { x:left, y:top, width:right-left, height:bottom-top } });
    writeBeforeAfter(path.join(out, "00-before-hero.png"), path.join(out, "01-hero-canonical.png"), path.join(out, "03-before-after-closure.png"));
    await shot("view=hero&finish=copper", "cosmic-glass-hero", "04-ring-copper.png");
    await shot("view=hero&shape=soft_square", "cosmic-glass-hero", "05-ring-nonround.png");
    await shot("view=hero&phone=1", "cosmic-glass-hero", "06-phone-hero.png");
    const geometry = await page.getByTestId("cosmic-glass-hero").evaluate((hero) => {
      const box = (selector: string) => {
        const r = hero.querySelector(selector)!.getBoundingClientRect();
        return { left:r.left, right:r.right, top:r.top, bottom:r.bottom, width:r.width, height:r.height };
      };
      const ringBox = box(".cg-ring");
      const receiverBox = box(".cg-ring-receiver");
      const title = box(".cg-title");
      const cue = box(".cg-cue");
      const separated = (a: ReturnType<typeof box>, b: ReturnType<typeof box>) => a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
      return {
        specimen: { profile:"phone", width:hero.getBoundingClientRect().width, height:hero.getBoundingClientRect().height },
        browserViewport: { width: window.innerWidth, height: window.innerHeight },
        ring: ringBox,
        receiver: receiverBox,
        title,
        cue,
        proofs: {
          ringVsTitleSeparated: separated(ringBox, title),
          receiverVsTitleSeparated: separated(receiverBox, title),
          titleVsCueSeparated: separated(title, cue),
          ringVsCueSeparated: separated(ringBox, cue),
        },
      };
    });
    expect(Object.values(geometry.proofs).every(Boolean)).toBeTruthy();
    fs.writeFileSync(path.join(out, "08-phone-geometry-boxes.json"), JSON.stringify(geometry, null, 2));
    await shot("view=full", "cosmic-glass-full-desktop", "07-full-desktop.png");
  });

  test("applies through Cabinet and survives save/reload with Action intact", async ({ page }) => {
    await openBlankStudio(page);
    await dismissTransientStudioChrome(page);
    await insertFamily(page, "button");
    const button = page.locator("[data-composition-node][data-element-kind='button'], [data-composition-node] a[data-button-presentation]").first();
    await expect(button).toBeVisible({ timeout: 20_000 });
    await button.click();
    await ownerClick(page.getByTestId("contextual-button-content"), "Button Content");
    await page.getByTestId("button-label-input").fill("Live Cosmic Title");
    const description = page.getByLabel("Button description").or(page.getByTestId("button-description-input")).first();
    if (await description.isVisible().catch(() => false)) await description.fill("Live secondary description");
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
    await expect(action.locator(".cg-title")).toHaveText("Live Cosmic Title");
    await expect(action.locator(".cg-description")).toHaveText("Live secondary description");
    const identityBefore = await action.locator(".cg-identity").getAttribute("src");
    const layerOrder = await action.evaluate((node) => ({
      receiver: Number(getComputedStyle(node.querySelector(".cg-ring-receiver")!).zIndex),
      ring: Number(getComputedStyle(node.querySelector(".cg-ring")!).zIndex),
    }));
    expect(layerOrder.ring).toBeGreaterThan(layerOrder.receiver);
    const hrefBefore = await action.getAttribute("data-action-href");
    await ownerClick(page.getByTestId("vp-cosmic-ring-copper"), "Copper ring");
    await ownerClick(page.getByTestId("vp-cosmic-shape-soft_square"), "Soft-square ring");
    await expect(action.locator("[data-cg-ring-finish='copper']")).toBeVisible();
    await expect(action.getByTestId("cosmic-glass-ring-receiver")).toBeVisible();
    expect(await action.locator(".cg-identity").getAttribute("src")).toBe(identityBefore);
    await expect(action.locator(".cg-title")).toHaveText("Live Cosmic Title");

    await saveDraft(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await dismissTransientStudioChrome(page);
    const reloaded = page.locator("[data-vp-cosmic-glass-host='true']").first();
    await expect(reloaded).toBeVisible({ timeout: 30_000 });
    expect(await reloaded.getAttribute("data-action-href")).toBe(hrefBefore);
    await expect(reloaded.locator("[data-cg-ring-finish='copper']")).toBeVisible();
    await expect(reloaded.locator("[data-cg-ring-shape='soft_square']")).toBeVisible();
    await expect(reloaded.getByTestId("cosmic-glass-ring-receiver")).toBeVisible();
    await expect(reloaded.locator(".cg-title")).toHaveText("Live Cosmic Title");
    await expect(reloaded.locator(".cg-description")).toHaveText("Live secondary description");
    expect(await reloaded.locator(".cg-identity").getAttribute("src")).toBe(identityBefore);
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
