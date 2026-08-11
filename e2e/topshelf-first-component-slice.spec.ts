/**
 * Top Shelf first component vertical slice — Owner UI workflow + visual evidence.
 * Enable: TOPSHELF_FIRST_COMPONENT=1
 * Requires TAPCONNECT_DEV_AUTH=1 local Next server.
 */

import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  dismissTransientStudioChrome,
  insertFamily,
  openBlankStudio,
  ownerClick,
  redo,
  saveDraft,
  undo,
} from "./owner-sim/physical-harness";

const enabled = process.env.TOPSHELF_FIRST_COMPONENT === "1";
const OUT = path.join("tmp", "top-shelf-first-component-slice");

async function dismissExit(page: Page) {
  const keep = page
    .getByTestId("card-exit-keep-editing")
    .or(page.getByRole("button", { name: /Keep editing|Cancel|Stay/i }))
    .first();
  if (await keep.isVisible().catch(() => false)) {
    await ownerClick(keep, "Keep editing");
  }
}

async function openVisualParts(page: Page) {
  const btn = page.getByTestId("contextual-button-visual-parts");
  const alt = page.getByTestId("contextual-visual-parts");
  if (await btn.isVisible().catch(() => false)) await ownerClick(btn, "Visual Parts");
  else await ownerClick(alt, "Visual Parts");
  await expect(page.getByTestId("visual-parts-cabinet")).toBeVisible({ timeout: 15_000 });
}

async function configureGenericButton(page: Page) {
  await ownerClick(page.getByTestId("contextual-button-content"), "Edit contents");
  await page.getByTestId("button-label-input").fill("Unlock Access");
  const desc = page.getByLabel("Button description").or(page.getByTestId("button-description-input")).first();
  await expect(desc).toBeVisible({ timeout: 10_000 });
  await desc.fill("Member benefits");
  const iconInput = page.getByLabel(/^Icon$/i).or(page.getByTestId("button-icon-input")).first();
  if (await iconInput.isVisible().catch(() => false)) {
    await iconInput.fill("lock");
  }
  await ownerClick(page.getByTestId("contextual-button-action"), "Action");
  await page.getByLabel("Button action type").selectOption("website");
  await page.getByLabel("Button destination").fill("https://example.com/safe-test");
}

test.describe("Top Shelf first component slice", () => {
  test.skip(!enabled, "Set TOPSHELF_FIRST_COMPONENT=1");
  test.setTimeout(240_000);

  test("Owner UI apply + parameters + save/reload + preview + reset", async ({ page, context }) => {
    fs.mkdirSync(OUT, { recursive: true });
    expect(fs.existsSync(path.join(OUT, "01-reference-supplied.png"))).toBeTruthy();

    await openBlankStudio(page);
    await dismissTransientStudioChrome(page);
    await dismissExit(page);

    await insertFamily(page, "button");
    const button = page.locator("[data-composition-node][data-element-kind='button'], [data-composition-node] a[data-button-presentation]").first();
    await expect(button).toBeVisible({ timeout: 15_000 });
    await button.click();

    await configureGenericButton(page);
    await button.click();

    // Apply Top Shelf via Cabinet — Curated → Enhanced
    await openVisualParts(page);
    await ownerClick(page.getByTestId("vp-drawer-curated"), "Curated");
    await expect(page.getByTestId("vp-curated-enhanced")).toBeVisible();
    await ownerClick(page.getByTestId("vp-part-family_top_shelf_premium_action"), "Top Shelf Premium Action");

    // Prefer the render host (not the composition wrapper that also carries assembly id).
    const topshelf = page.locator("[data-vp-topshelf='true']").first();
    await expect(topshelf).toBeVisible({ timeout: 15_000 });
    await expect(topshelf).toContainText("Unlock Access");
    await expect(topshelf).toContainText(/Member benefits/i);
    await expect(topshelf).toHaveAttribute("data-action-type", "website");
    await expect(topshelf).toHaveAttribute("data-action-href", /example\.com\/safe-test/);
    await expect(topshelf).toHaveAttribute("data-vp-assembly", "recipe/enhanced/top-shelf-premium-action/v1");

    // Parameter edits
    await ownerClick(page.getByTestId("vp-topshelf-anchor-cobalt"), "Anchor Cobalt");
    await ownerClick(page.getByTestId("vp-topshelf-ring-left"), "Ring Left");
    await page.getByTestId("vp-topshelf-halo").evaluate((el) => {
      const input = el as HTMLInputElement;
      const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
      proto?.set?.call(input, "80");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    await undo(page);
    await redo(page);

    await saveDraft(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("card-edit-workspace-host")).toHaveAttribute("data-builder-ready", "true", {
      timeout: 60_000,
    });
    await dismissTransientStudioChrome(page);
    await dismissExit(page);

    const reloaded = page.locator("[data-vp-topshelf='true']").first();
    await expect(reloaded).toBeVisible({ timeout: 20_000 });
    await reloaded.click();
    await openVisualParts(page);
    await expect(page.getByTestId("vp-assembly-id")).toContainText("recipe/enhanced/top-shelf-premium-action/v1");
    await expect(reloaded).toContainText("Unlock Access");
    await expect(reloaded).toHaveAttribute("data-action-type", "website");
    await expect(reloaded).toHaveAttribute("data-action-href", /example\.com\/safe-test/);
    await ownerClick(page.getByTestId("contextual-button-action"), "Action after reload");
    await expect(page.getByLabel("Button action type")).toHaveValue("website");
    await expect(page.getByLabel("Button destination")).toHaveValue("https://example.com/safe-test");

    // Preview/Public parity
    const previewBtn = page.getByTestId("card-preview").or(page.getByRole("button", { name: /^Preview$/i })).first();
    if (await previewBtn.isVisible().catch(() => false)) {
      await ownerClick(previewBtn, "Preview");
      await page.waitForTimeout(500);
      const previewAction = page.locator("[data-vp-topshelf='true']").first();
      await expect(previewAction).toBeVisible({ timeout: 15_000 });
      await expect(previewAction).toContainText("Unlock Access");
      await expect(previewAction).toHaveAttribute("data-action-href", /example\.com\/safe-test/);
      const exit = page.getByTestId("preview-exit").or(page.getByRole("button", { name: /Exit|Back|Close/i })).first();
      if (await exit.isVisible().catch(() => false)) await ownerClick(exit, "Exit preview");
      await dismissExit(page);
    }

    // Reset to canonical — content preserved
    await reloaded.click();
    await openVisualParts(page);
    await ownerClick(page.getByTestId("vp-topshelf-reset-canonical"), "Reset canonical");
    const afterReset = page.locator("[data-vp-topshelf='true']").first();
    await expect(afterReset).toContainText("Unlock Access");
    await expect(afterReset).toHaveAttribute("data-action-type", "website");
    await expect(afterReset).toHaveAttribute("data-action-href", /example\.com\/safe-test/);

    fs.writeFileSync(
      path.join(OUT, "workflow-result.json"),
      JSON.stringify(
        {
          ok: true,
          recipe: "recipe/enhanced/top-shelf-premium-action/v1",
          contentPreserved: true,
          actionPreserved: true,
          destination: "https://example.com/safe-test",
        },
        null,
        2
      )
    );
  });

  test("isolated live PNG evidence + side-by-side", async ({ browser }) => {
    fs.mkdirSync(OUT, { recursive: true });
    const context = await browser.newContext({
      deviceScaleFactor: 2,
      viewport: { width: 900, height: 700 },
      baseURL: process.env.BASE_URL || "http://127.0.0.1:3140",
    });
    const page = await context.newPage();

    async function shot(query: string, file: string) {
      await page.goto(`/dev/topshelf-specimen?${query}`, { waitUntil: "domcontentloaded" });
      // Product hull only — never the evidence host / composition specimen frame.
      const el = page.locator("[data-vp-topshelf='true']").first();
      await expect(el).toBeVisible({ timeout: 30_000 });
      await page.waitForTimeout(400);
      await el.screenshot({ path: path.join(OUT, file), type: "png" });
    }

    await shot("anchor=charcoal&placement=right", "02-live-integrated-button.png");
    await shot("anchor=cobalt&placement=right", "04-cobalt-variant.png");
    await shot("anchor=charcoal&placement=left", "05-left-icon-ring-variant.png");

    // Promote PO-approved Studio-integrated golden (product hull only; no specimen frame).
    const goldenDir = path.join(
      "lib",
      "fusion",
      "creative-studio",
      "visual-parts",
      "packages",
      "top-shelf",
      "reference"
    );
    fs.mkdirSync(goldenDir, { recursive: true });
    const studioGolden = path.join(goldenDir, "studio-integrated-charcoal-right.golden.png");
    fs.copyFileSync(path.join(OUT, "02-live-integrated-button.png"), studioGolden);
    fs.copyFileSync(path.join(OUT, "02-live-integrated-button.png"), path.join(OUT, "02-live-integrated-button.golden.png"));
    // Preserve earlier PO review PNG (with composition chrome) if present — never overwrite package master.
    expect(fs.existsSync(path.join(OUT, "01-reference-supplied.png"))).toBeTruthy();
    expect(
      fs.existsSync(path.join("vendor", "top-shelf-enhanced-component-package-v1.0", "reference", "code-render.png"))
    ).toBeTruthy();

    // Side-by-side HTML (PNGs are primary review artifacts)
    const html = `<!doctype html><meta charset="utf-8"/><title>Top Shelf First Component Slice</title>
<style>
body{margin:0;padding:24px;background:#0a0a0a;color:#e5e5e5;font:14px/1.4 ui-sans-serif,system-ui}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px;max-width:1100px}
img{display:block;width:100%;background:#0a0a0a;border:1px solid #333;border-radius:8px}
figcaption{margin-top:8px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#a3a3a3}
</style>
<h1>Top Shelf — reference vs integrated</h1>
<p>Matched-scale comparison. PNGs are the review artifacts.</p>
<div class="pair">
<figure><img src="01-reference-supplied.png"/><figcaption>A · Supplied reference</figcaption></figure>
<figure><img src="02-live-integrated-button.png"/><figcaption>B · Studio-integrated live</figcaption></figure>
</div>
<figure><img src="04-cobalt-variant.png"/><figcaption>D · Cobalt variant</figcaption></figure>
<figure><img src="05-left-icon-ring-variant.png"/><figcaption>E · Left Icon Ring</figcaption></figure>`;
    fs.writeFileSync(path.join(OUT, "index.html"), html);
    // C alias — side-by-side page is the comparison artifact
    fs.copyFileSync(path.join(OUT, "index.html"), path.join(OUT, "03-side-by-side.html"));

    for (const name of [
      "01-reference-supplied.png",
      "02-live-integrated-button.png",
      "04-cobalt-variant.png",
      "05-left-icon-ring-variant.png",
      "03-side-by-side.html",
    ]) {
      expect(fs.existsSync(path.join(OUT, name)), name).toBeTruthy();
    }
    await context.close();
  });
});
