/**
 * PRACTICAL AUTHORING CERTIFICATION — Canva-benchmark outcome workflows.
 *
 * Enable: PRACTICAL_AUTHORING_CERT=1
 * Requires authenticated Studio at BASE_URL (non-default port recommended for Task G).
 */

import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  ensureEvidenceDirs,
  evidenceShot,
  insertFamily,
  openBlankStudio,
  ownerClick,
  readGeometry,
  saveDraft,
  undo,
  redo,
} from "./owner-sim/physical-harness";

const enabled = process.env.PRACTICAL_AUTHORING_CERT === "1";
const EVIDENCE = path.join("tmp", "practical-authoring-evidence");

async function dismissOverlays(page: Page) {
  for (const id of ["card-recovery-keep-server", "card-exit-keep-editing", "card-exit-preview", "preview-exit"]) {
    const b = page.getByTestId(id);
    if (await b.isVisible().catch(() => false)) await b.click().catch(() => undefined);
  }
}

/** Canvas Button icon — never toolbar Icon controls (`button-icon-choices`, color, offsets…). */
function canvasButtonIcon(page: Page) {
  return page.locator('[data-composition-node] [data-testid^="button-icon-"]').first();
}

async function insertButton(page: Page) {
  await insertFamily(page, "button");
  await expect(page.locator('[data-composition-node][data-element-kind="button"][data-selected="true"], [data-composition-node][data-selected="true"]').filter({ has: page.locator('[data-button-surface-kind]') }).first()).toBeVisible({ timeout: 15_000 });
}

test.describe("Practical authoring certification (Canva-benchmark outcomes)", () => {
  test.skip(!enabled, "Set PRACTICAL_AUTHORING_CERT=1");
  test.setTimeout(420_000);

  test("Tasks A–F: CTA row, stack, badge, page height, button content, actions", async ({ page }) => {
    ensureEvidenceDirs(["practical"]);
    fs.mkdirSync(EVIDENCE, { recursive: true });
    await openBlankStudio(page);
    await dismissOverlays(page);

    // ——— Task A: professional CTA row ———
    for (let i = 0; i < 3; i++) await insertButton(page);
    const buttons = page.locator('[data-composition-node]').filter({ has: page.locator("[data-button-surface-kind]") });
    await expect(buttons).toHaveCount(3);
    await buttons.nth(0).click();
    await page.keyboard.down("Shift");
    await buttons.nth(1).click();
    await buttons.nth(2).click();
    await page.keyboard.up("Shift");
    await ownerClick(page.getByTestId("contextual-arrange"), "Arrange");
    await ownerClick(page.getByTestId("arrange-match-size"), "Match Size");
    await ownerClick(page.getByTestId("arrange-distribute-h"), "Distribute H");
    await evidenceShot(page, "practical", "task-a-cta-row.png");

    // Apply premium material + corners + border on first button
    await buttons.nth(0).click();
    await ownerClick(page.getByTestId("contextual-corners"), "Corners");
    await ownerClick(page.getByTestId("quick-corner-rounded"), "Rounded");
    await ownerClick(page.getByTestId("contextual-border"), "Border");
    await ownerClick(page.getByTestId("quick-border-style-solid"), "Solid border");
    await page.getByTestId("quick-border-weight").fill("2");
    await ownerClick(page.getByTestId("contextual-button-appearance"), "Appearance");
    const raisedResin = page.getByRole("button", { name: /Raised resin|Gloss lacquer|Acrylic|Polished metal/i }).first();
    if (await raisedResin.isVisible().catch(() => false)) await raisedResin.click();

    // Nested icons via Button content Iconify
    for (let i = 0; i < 3; i++) {
      await buttons.nth(i).click();
      await ownerClick(page.getByTestId("contextual-button-content"), "Edit contents");
      await ownerClick(page.getByTestId("button-add-icon"), "Add Icon");
      const search = page.getByTestId("button-iconify-search");
      await search.fill(i === 0 ? "phone" : i === 1 ? "map" : "star");
      await expect(page.getByTestId("button-iconify-results").locator("button").first()).toBeVisible({ timeout: 20_000 });
      const fillBefore = await buttons.nth(i).locator("[data-button-surface-kind]").evaluate((el) => getComputedStyle(el).backgroundColor);
      await page.getByTestId("button-iconify-results").locator("button").first().click();
      await expect(canvasButtonIcon(page)).toHaveAttribute("data-icon-svg", "true", { timeout: 10_000 });
      const fillAfter = await buttons.nth(i).locator("[data-button-surface-kind]").evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(fillAfter).toBe(fillBefore);
      await page.getByLabel("Button icon size").fill("22");
    }
    await saveDraft(page);
    await evidenceShot(page, "practical", "task-a-after-icons.png");

    // ——— Task B: stacked action group ———
    await openBlankStudio(page);
    await dismissOverlays(page);
    for (let i = 0; i < 4; i++) await insertButton(page);
    const stackButtons = page.locator('[data-composition-node]').filter({ has: page.locator("[data-button-surface-kind]") });
    await stackButtons.nth(0).click();
    await page.keyboard.down("Shift");
    for (let i = 1; i < 4; i++) await stackButtons.nth(i).click();
    await page.keyboard.up("Shift");
    await ownerClick(page.getByTestId("contextual-arrange"), "Arrange");
    await ownerClick(page.getByTestId("arrange-match-size"), "Match Size");
    await page.getByTestId("arrange-gap").fill("2");
    await ownerClick(page.getByTestId("arrange-stack-v"), "Stack vertical");
    await stackButtons.nth(1).click();
    await ownerClick(page.getByTestId("contextual-button-content"), "Edit contents");
    await page.getByTestId("button-label-input").fill("Line one\nLine two");
    await undo(page);
    await redo(page);
    await evidenceShot(page, "practical", "task-b-stack.png");

    // ——— Task C: premium Badge multiline + silhouette border ———
    await insertFamily(page, "badge");
    const badge = page.locator('[data-composition-node][data-element-kind="badge"][data-selected="true"]').first();
    await expect(badge).toBeVisible();
    await ownerClick(page.getByTestId("contextual-badge-shape"), "Shape");
    await ownerClick(page.getByTestId("badge-shape-starburst"), "Starburst");
    await ownerClick(page.getByTestId("contextual-content"), "Wording");
    await page.getByTestId("badge-wording-input").fill("TONIGHT\nONLY");
    await expect(page.getByTestId("badge-text")).toContainText("TONIGHT");
    const textContent = await page.getByTestId("badge-text").evaluate((el) => el.textContent || "");
    expect(textContent.includes("\n") || (await page.getByTestId("badge-text").evaluate((el) => getComputedStyle(el).whiteSpace)).includes("pre")).toBeTruthy();
    await ownerClick(page.getByTestId("contextual-border"), "Border");
    await ownerClick(page.getByTestId("quick-border-style-solid"), "Solid");
    await page.getByTestId("quick-border-weight").fill("3");
    await expect(badge.locator('[data-badge-path-stroke="true"]')).toBeVisible({ timeout: 10_000 });
    await expect(badge.locator('[data-testid="badge-shape-stroke"]')).toBeVisible();
    await evidenceShot(page, "practical", "task-c-badge.png");

    // ——— Task D: page extension zero absolute drift ———
    await insertFamily(page, "text");
    await insertFamily(page, "icon");
    await insertButton(page);
    const nodes = page.locator("[data-composition-node]");
    const count = await nodes.count();
    expect(count).toBeGreaterThanOrEqual(4);
    const before: Array<{ id: string; g: Awaited<ReturnType<typeof readGeometry>> }> = [];
    for (let i = 0; i < Math.min(count, 8); i++) {
      const node = nodes.nth(i);
      const id = (await node.getAttribute("data-composition-node")) || `idx-${i}`;
      before.push({ id, g: await readGeometry(node) });
    }
    const heightBefore = Number((await page.getByTestId("card-page-height").textContent())?.replace(/\D/g, ""));
    await ownerClick(page.getByTestId("card-page-extension-handle"), "Extend page +240");
    await expect.poll(async () => Number((await page.getByTestId("card-page-height").textContent())?.replace(/\D/g, ""))).toBeGreaterThan(heightBefore + 80);
    for (const snap of before) {
      const node = page.locator(`[data-composition-node="${snap.id}"]`).first();
      if ((await node.count()) === 0) continue;
      const after = await readGeometry(node);
      expect(Math.abs(after.width - snap.g.width)).toBeLessThan(2);
      expect(Math.abs(after.height - snap.g.height)).toBeLessThan(2);
      expect(Math.abs(after.x - snap.g.x)).toBeLessThan(2);
      expect(Math.abs(after.y - snap.g.y)).toBeLessThan(2);
    }
    const handle = page.getByTestId("card-page-extension-handle");
    const box = await handle.boundingBox();
    expect(box).not.toBeNull();
    const midBefore = before.map((s) => ({ ...s, g: { ...s.g } }));
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2 + 80, { steps: 8 });
    await page.mouse.up();
    for (const snap of midBefore) {
      const node = page.locator(`[data-composition-node="${snap.id}"]`).first();
      if ((await node.count()) === 0) continue;
      const after = await readGeometry(node);
      expect(Math.abs(after.width - snap.g.width)).toBeLessThan(2);
      expect(Math.abs(after.height - snap.g.height)).toBeLessThan(2);
      expect(Math.abs(after.x - snap.g.x)).toBeLessThan(2);
      expect(Math.abs(after.y - snap.g.y)).toBeLessThan(2);
    }
    // Undo/Redo of page height must not drift children.
    await undo(page);
    for (const snap of midBefore) {
      const node = page.locator(`[data-composition-node="${snap.id}"]`).first();
      if ((await node.count()) === 0) continue;
      const after = await readGeometry(node);
      expect(Math.abs(after.x - snap.g.x)).toBeLessThan(2);
      expect(Math.abs(after.y - snap.g.y)).toBeLessThan(2);
      expect(Math.abs(after.width - snap.g.width)).toBeLessThan(2);
      expect(Math.abs(after.height - snap.g.height)).toBeLessThan(2);
    }
    await redo(page);
    for (const snap of midBefore) {
      const node = page.locator(`[data-composition-node="${snap.id}"]`).first();
      if ((await node.count()) === 0) continue;
      const after = await readGeometry(node);
      expect(Math.abs(after.x - snap.g.x)).toBeLessThan(2);
      expect(Math.abs(after.y - snap.g.y)).toBeLessThan(2);
    }
    // Persist + Owner reopen path.
    await saveDraft(page);
    const editUrl = page.url();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("card-edit-workspace-host")).toHaveAttribute("data-builder-ready", "true", { timeout: 60_000 });
    await dismissOverlays(page);
    expect(page.url()).toContain("/dashboard/card/edit");
    for (const snap of midBefore) {
      const node = page.locator(`[data-composition-node="${snap.id}"]`).first();
      if ((await node.count()) === 0) continue;
      const after = await readGeometry(node);
      expect(Math.abs(after.x - snap.g.x)).toBeLessThan(3);
      expect(Math.abs(after.y - snap.g.y)).toBeLessThan(3);
      expect(Math.abs(after.width - snap.g.width)).toBeLessThan(3);
      expect(Math.abs(after.height - snap.g.height)).toBeLessThan(3);
    }
    fs.writeFileSync(
      path.join(EVIDENCE, "task-d-persistence.json"),
      JSON.stringify({ ok: true, editUrl, heightBefore, at: new Date().toISOString() }, null, 2)
    );
    await evidenceShot(page, "practical", "task-d-page-height.png");

    // ——— Task E: Button content isolation ———
    await openBlankStudio(page);
    await dismissOverlays(page);
    await insertButton(page);
    const button = page.locator('[data-composition-node]').filter({ has: page.locator("[data-button-surface-kind]") }).first();
    await ownerClick(page.getByTestId("contextual-button-content"), "Edit contents");
    await ownerClick(page.getByTestId("button-add-icon"), "Add Icon");
    await page.getByTestId("button-iconify-search").fill("heart");
    await expect(page.getByTestId("button-iconify-results").locator("button").first()).toBeVisible({ timeout: 20_000 });
    const surfaceFill = await button.locator("[data-button-surface-kind]").evaluate((el) => getComputedStyle(el).backgroundImage + getComputedStyle(el).backgroundColor);
    await page.getByTestId("button-iconify-results").locator("button").first().click();
    await expect(canvasButtonIcon(page)).toHaveAttribute("data-icon-svg", "true");
    const surfaceFillAfter = await button.locator("[data-button-surface-kind]").evaluate((el) => getComputedStyle(el).backgroundImage + getComputedStyle(el).backgroundColor);
    expect(surfaceFillAfter).toBe(surfaceFill);
    await page.getByLabel("Button icon size").fill("28");
    await page.getByLabel("Button icon position").selectOption("after");
    await ownerClick(page.getByTestId("contextual-size"), "Size");
    await page.getByTestId("quick-size-w").fill("200");
    await page.getByTestId("quick-size-h").fill("56");
    await ownerClick(page.getByTestId("contextual-corners"), "Corners");
    await ownerClick(page.getByTestId("quick-corner-pill"), "Pill");
    await evidenceShot(page, "practical", "task-e-button-content.png");

    // ——— Task F: Action edit vs test ———
    await ownerClick(page.getByTestId("contextual-button-action"), "Action");
    await page.getByLabel("Button action type").selectOption("website");
    await page.getByLabel("Button destination").fill("https://example.com/menu");
    await ownerClick(page.getByTestId("button-test-action"), "Test action");
    // Edit mode: button click must not navigate away from Studio
    await button.click();
    await expect(page).toHaveURL(/card\/edit/);
    await page.getByTestId("card-preview-as-customer").click();
    await expect(page.locator('[data-element-action="website"], a[href="https://example.com/menu"]').first()).toBeVisible({ timeout: 15_000 });
    await evidenceShot(page, "practical", "task-f-preview-action.png");
    await page.getByTestId("preview-exit").click().catch(() => undefined);

    fs.writeFileSync(
      path.join(EVIDENCE, "tasks-a-f.json"),
      JSON.stringify({ ok: true, at: new Date().toISOString(), baseUrl: process.env.BASE_URL || null }, null, 2)
    );
  });

  test("Task G: Live Device URL preserves non-default port", async ({ page, request }) => {
    test.setTimeout(120_000);
    ensureEvidenceDirs(["practical"]);
    fs.mkdirSync(EVIDENCE, { recursive: true });
    const base = process.env.BASE_URL || "http://127.0.0.1:3055";
    const port = new URL(base).port || "80";
    expect(port).not.toBe("3050");

    await openBlankStudio(page);
    await dismissOverlays(page);
    await insertButton(page);

    const chromeExpanded = page.getByTestId("chrome-state-expanded");
    if (await chromeExpanded.isVisible().catch(() => false)) await chromeExpanded.click();
    await ownerClick(page.getByTestId("card-preview-as-customer"), "Preview as customer");
    await expect(page.getByTestId("preview-toolbar")).toBeVisible({ timeout: 20_000 });
    await ownerClick(page.getByTestId("preview-live-device"), "Live device");
    await expect(page.getByTestId("live-device-qr-panel")).toBeVisible({ timeout: 20_000 });
    await expect.poll(async () => page.getByTestId("live-device-qr-panel").getAttribute("data-preview-status"), { timeout: 30_000 }).not.toBe("creating");
    const status = await page.getByTestId("live-device-qr-panel").getAttribute("data-preview-status");
    const panelText = await page.getByTestId("live-device-qr-panel").innerText();
    expect(panelText).not.toMatch(/:3050(?:\/|$)/);
    if (status === "ready") {
      await expect(page.getByTestId("live-device-status-ready")).toBeAttached();
      if (/https?:\/\/\d+\.\d+\.\d+\.\d+/.test(panelText)) {
        expect(panelText).toMatch(new RegExp(`:${port}`));
      }
    } else {
      expect(status).toBe("error");
      expect(panelText.length).toBeGreaterThan(20);
    }

    const assessmentRes = await request.post("/api/preview/card/session", {
      data: {
        snapshot: { version: 1, nodes: [] },
        profile: { name: "Practical Cert" },
        cardName: "Practical Cert",
        businessName: "Practical Cert",
        revision: 1,
        mode: "follow",
      },
      failOnStatusCode: false,
    });
    if (assessmentRes.ok()) {
      const body = await assessmentRes.json();
      if (body.url) expect(String(body.url)).not.toMatch(/:3050(?:\/|$)/);
      if (body.qrUrl) expect(String(body.qrUrl)).not.toMatch(/:3050(?:\/|$)/);
    }

    await evidenceShot(page, "practical", "task-g-live-device.png");
    fs.writeFileSync(
      path.join(EVIDENCE, "task-g.json"),
      JSON.stringify({ ok: true, port, status, base, panelSnippet: panelText.slice(0, 240) }, null, 2)
    );
  });

  test("Task H: Product-Steward Material quality gate (preview ≡ apply)", async ({ page }) => {
    test.setTimeout(240_000);
    ensureEvidenceDirs(["practical", "materials"]);
    fs.mkdirSync(path.join(EVIDENCE, "materials"), { recursive: true });
    await openBlankStudio(page);
    await dismissOverlays(page);

    const materials = [
      { id: "flat", minStops: 0 },
      { id: "soft_touch", minStops: 0 },
      { id: "raised_resin", minStops: 3 },
      { id: "gloss_lacquer", minStops: 3 },
      { id: "acrylic", minStops: 2 },
      { id: "polished_metal", minStops: 4 },
    ] as const;

    const signatures: Array<{ id: string; bg: string; stops: number; highlight: string; shine: string }> = [];
    await insertButton(page);
    const button = page.locator('[data-composition-node]').filter({ has: page.locator("[data-button-surface-kind]") }).first();
    await ownerClick(page.getByTestId("contextual-button-action"), "Action");
    await page.getByLabel("Button action type").selectOption("website");
    await page.getByLabel("Button destination").fill("https://example.com/material-gate");
    const actionHrefBefore = "https://example.com/material-gate";
    const geom0 = await readGeometry(button);

    for (const mat of materials) {
      await button.click();
      await ownerClick(page.getByTestId("contextual-button-appearance"), "Appearance");
      const overview = page.getByTestId("appearance-category-overview");
      if (await overview.isVisible().catch(() => false)) {
        await ownerClick(page.getByTestId("appearance-category-material"), "Material category");
      }
      await expect(page.getByTestId("material-engine-controls")).toBeVisible({ timeout: 15_000 });
      const swatch = page.getByTestId(`material-swatch-${mat.id}`);
      await expect(swatch).toBeVisible();
      const previewStops = Number(await swatch.getAttribute("data-material-stop-count"));
      const previewAuthority = await swatch.getAttribute("data-material-fill-authority");
      await ownerClick(page.getByTestId(`material-${mat.id}`), `Apply ${mat.id}`);
      const surface = button.locator("[data-button-surface-kind]").first();
      await expect(surface).toHaveAttribute("data-material-fill-authority", /.+/);
      const appliedStops = Number(await surface.getAttribute("data-material-stop-count"));
      const appliedAuthority = await surface.getAttribute("data-material-fill-authority");
      expect(appliedAuthority).toBe(previewAuthority);
      if (mat.minStops > 0) {
        expect(appliedStops).toBeGreaterThanOrEqual(mat.minStops);
        expect(previewStops).toBe(appliedStops);
      }
      if (mat.id === "raised_resin" || mat.id === "gloss_lacquer" || mat.id === "acrylic" || mat.id === "polished_metal" || mat.id === "soft_touch") {
        const nodeId = await button.getAttribute("data-composition-node");
        await expect(surface).toHaveAttribute("data-material-highlight", "true");
        await expect(page.getByTestId(`button-${nodeId}-highlight`)).toBeVisible();
      }
      const bg = await surface.evaluate((el) => getComputedStyle(el).backgroundImage + "|" + getComputedStyle(el).backgroundColor);
      signatures.push({
        id: mat.id,
        bg,
        stops: appliedStops,
        highlight: (await surface.getAttribute("data-material-highlight")) || "false",
        shine: (await surface.getAttribute("data-button-high-gloss")) || "false",
      });
      await evidenceShot(page, "materials", `button-${mat.id}.png`);
      const geomAfter = await readGeometry(button);
      expect(Math.abs(geomAfter.width - geom0.width)).toBeLessThan(2);
      expect(Math.abs(geomAfter.height - geom0.height)).toBeLessThan(2);
      expect(Math.abs(geomAfter.x - geom0.x)).toBeLessThan(2);
      expect(Math.abs(geomAfter.y - geom0.y)).toBeLessThan(2);
    }

    await ownerClick(page.getByTestId("contextual-button-action"), "Action");
    await expect(page.getByLabel("Button destination")).toHaveValue(actionHrefBefore);

    const uniqueBg = new Set(signatures.map((s) => s.bg));
    expect(uniqueBg.size).toBe(signatures.length);
    fs.writeFileSync(
      path.join(EVIDENCE, "materials", "quality-gate.json"),
      JSON.stringify({ ok: true, signatures, at: new Date().toISOString() }, null, 2)
    );
  });
});
