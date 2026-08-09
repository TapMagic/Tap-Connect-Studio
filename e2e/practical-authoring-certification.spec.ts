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
    const candidateKind = await page.getByTestId("live-device-qr-panel").getAttribute("data-candidate-kind");
    const physicallyVerified = await page.getByTestId("live-device-qr-panel").getAttribute("data-physically-verified");
    expect(panelText).not.toMatch(/:3050(?:\/|$)/);
    expect(panelText).not.toMatch(/LAN reachable/i);
    expect(physicallyVerified).toBe("false");
    if (status === "ready") {
      await expect(page.getByTestId("live-device-status-ready")).toBeAttached();
      await expect(page.getByTestId("preview-status-label")).toContainText(/QR ready to scan/i);
      expect(panelText).toMatch(/has not been verified yet/i);
      if (/https?:\/\/\d+\.\d+\.\d+\.\d+/.test(panelText)) {
        expect(panelText).toMatch(new RegExp(`:${port}`));
        expect(candidateKind).toBe("lan_candidate");
        expect(panelText).toMatch(/LAN candidate/i);
      } else if (candidateKind === "configured_public_candidate") {
        expect(panelText).toMatch(/Public preview candidate/i);
        expect(panelText).not.toMatch(/LAN candidate/i);
      }
    } else {
      expect(status).toBe("error");
      expect(panelText.length).toBeGreaterThan(20);
      expect(["invalid", "locally_unreachable", "pending"]).toContain(candidateKind || "pending");
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
      expect(body.physicallyVerified).toBe(false);
      expect(body.candidateKind).toBeTruthy();
    }

    await evidenceShot(page, "practical", "task-g-live-device.png");
    fs.writeFileSync(
      path.join(EVIDENCE, "task-g.json"),
      JSON.stringify({ ok: true, port, status, candidateKind, physicallyVerified, base, panelSnippet: panelText.slice(0, 240) }, null, 2)
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

  test("Task I: Material consumer gate (all Host Material surfaces + Edit→Preview)", async ({ page }) => {
    test.setTimeout(360_000);
    ensureEvidenceDirs(["practical", "materials"]);
    fs.mkdirSync(path.join(EVIDENCE, "materials"), { recursive: true });
    const report: Record<string, unknown> = { ok: false, consumers: {} as Record<string, unknown> };

    async function applySurfaceMaterialById(materialId: string) {
      const overview = page.getByTestId("appearance-category-overview");
      if (await overview.isVisible().catch(() => false)) {
        await ownerClick(page.getByTestId("appearance-category-material"), "Material category");
      }
      await expect(page.getByTestId("material-engine-controls")).toBeVisible({ timeout: 15_000 });
      await ownerClick(page.getByTestId(`material-${materialId}`), `Apply ${materialId}`);
    }

    async function enterCustomerPreview() {
      const chromeExpanded = page.getByTestId("chrome-state-expanded");
      if (await chromeExpanded.isVisible().catch(() => false)) await chromeExpanded.click();
      await ownerClick(page.getByTestId("card-preview-as-customer"), "Preview as customer");
      await expect(page.getByTestId("preview-toolbar")).toBeVisible({ timeout: 20_000 });
    }

    async function exitCustomerPreview() {
      await page.getByTestId("preview-exit").click().catch(() => undefined);
      await dismissOverlays(page);
    }

    // ——— Button: polished metal Edit → Preview ———
    await openBlankStudio(page);
    await dismissOverlays(page);
    await insertButton(page);
    const button = page.locator('[data-composition-node]').filter({ has: page.locator("[data-button-surface-kind]") }).first();
    await button.click();
    await ownerClick(page.getByTestId("contextual-button-appearance"), "Appearance");
    await applySurfaceMaterialById("polished_metal");
    const buttonSurface = button.locator("[data-button-surface-kind]").first();
    await expect(buttonSurface).toHaveAttribute("data-material-fill-authority", "gradientFill");
    const buttonStops = Number(await buttonSurface.getAttribute("data-material-stop-count"));
    expect(buttonStops).toBeGreaterThanOrEqual(4);
    await expect(buttonSurface).toHaveAttribute("data-material-highlight", "true");
    await saveDraft(page);
    await enterCustomerPreview();
    const previewButton = page.locator('[data-testid="creative-composition-canvas"] [data-button-surface-kind]').first();
    await expect(previewButton).toHaveAttribute("data-material-fill-authority", "gradientFill");
    expect(Number(await previewButton.getAttribute("data-material-stop-count"))).toBe(buttonStops);
    await expect(previewButton).toHaveAttribute("data-material-highlight", "true");
    (report.consumers as Record<string, unknown>).button = { material: "polished_metal", stops: buttonStops, previewParity: true };
    await exitCustomerPreview();
    await evidenceShot(page, "materials", "consumer-button-polished.png");

    // ——— Badge ———
    await insertFamily(page, "badge");
    const badge = page.locator('[data-composition-node][data-element-kind="badge"]').last();
    await badge.click();
    await ownerClick(page.getByTestId("contextual-badge-appearance"), "Badge Appearance");
    await applySurfaceMaterialById("gloss_lacquer");
    await expect(badge.locator("[data-material-fill-authority]").first()).toHaveAttribute("data-material-fill-authority", "gradientFill");
    await expect(badge.locator("[data-material-stop-count]").first()).toHaveAttribute("data-material-stop-count", /^[3-9]/);
    const badgeText = await badge.getByTestId("badge-text").innerText();
    await saveDraft(page);
    await enterCustomerPreview();
    const previewBadge = page.locator('[data-testid="creative-composition-canvas"] [data-element-kind="badge"]').last();
    await expect(previewBadge.locator("[data-material-fill-authority]").first()).toHaveAttribute("data-material-fill-authority", "gradientFill");
    await expect(previewBadge.getByTestId("badge-text")).toHaveText(badgeText);
    (report.consumers as Record<string, unknown>).badge = { material: "gloss_lacquer", previewParity: true };
    await exitCustomerPreview();

    // ——— Shape ———
    await ownerClick(page.getByTestId("card-creative-tool-tools"), "Tools");
    await expect(page.getByTestId("card-quick-tools")).toBeVisible({ timeout: 10_000 });
    await ownerClick(page.getByTestId("card-quick-tools").getByRole("button", { name: /^Shape$/i }), "Insert Shape");
    const shape = page.locator('[data-composition-node][data-primitive="shape"]').last();
    await expect(shape).toBeVisible({ timeout: 15_000 });
    await shape.click();
    await ownerClick(
      page.getByTestId("contextual-appearance").or(page.getByTestId("card-contextual-object-tools").getByRole("button", { name: /^Appearance$/i })).first(),
      "Shape Appearance"
    );
    await applySurfaceMaterialById("acrylic");
    await expect(shape.locator("[data-material-fill-authority]").first()).toHaveAttribute("data-material-fill-authority", /.+/);
    (report.consumers as Record<string, unknown>).shape = { material: "acrylic", applied: true };
    await evidenceShot(page, "materials", "consumer-shape-acrylic.png");

    // ——— Container ———
    await ownerClick(page.getByTestId("card-creative-tool-tools"), "Tools");
    await ownerClick(page.getByTestId("starter-container-stack-card"), "Insert Container");
    const container = page.locator('[data-composition-node]').filter({ has: page.locator('[data-component-kind="container"]') }).last();
    await expect(container).toBeVisible({ timeout: 15_000 });
    await container.click();
    await ownerClick(page.getByTestId("contextual-container-appearance"), "Container Appearance");
    await applySurfaceMaterialById("polished_metal");
    const containerShell = container.locator('[data-component-kind="container"]').first();
    await expect(containerShell).toHaveAttribute("data-visual-plane", "material");
    await expect(containerShell).toHaveAttribute("data-material-fill-authority", "gradientFill");
    expect(Number(await containerShell.getAttribute("data-material-stop-count"))).toBeGreaterThanOrEqual(4);
    await expect(containerShell).toHaveAttribute("data-material-highlight", "true");
    await saveDraft(page);
    await enterCustomerPreview();
    const previewContainer = page.locator('[data-testid="creative-composition-canvas"] [data-component-kind="container"]').last();
    await expect(previewContainer).toHaveAttribute("data-material-fill-authority", "gradientFill");
    await expect(previewContainer).toHaveAttribute("data-material-highlight", "true");
    (report.consumers as Record<string, unknown>).container = { material: "polished_metal", previewParity: true };
    await exitCustomerPreview();
    await evidenceShot(page, "materials", "consumer-container-polished.png");

    // ——— Coupon ———
    await insertFamily(page, "coupon");
    const coupon = page.locator('[data-composition-node][data-element-kind="coupon"]').last();
    await coupon.click();
    await ownerClick(page.getByTestId("contextual-appearance").or(page.getByTestId("card-contextual-object-tools").getByRole("button", { name: /^Appearance$/i })).first(), "Coupon Appearance");
    await applySurfaceMaterialById("gloss_lacquer");
    const couponShell = coupon.locator('[data-component-kind="coupon"]').first();
    await expect(couponShell).toHaveAttribute("data-material-fill-authority", "gradientFill");
    const offerBefore = await couponShell.innerText();
    await expect(couponShell).toContainText(/OFF|OFFER|Coupon|SAVE|BUY/i);
    await saveDraft(page);
    await enterCustomerPreview();
    const previewCoupon = page.locator('[data-testid="creative-composition-canvas"] [data-component-kind="coupon"]').last();
    await expect(previewCoupon).toHaveAttribute("data-material-fill-authority", "gradientFill");
    expect((await previewCoupon.innerText()).length).toBeGreaterThan(10);
    (report.consumers as Record<string, unknown>).coupon = {
      material: "gloss_lacquer",
      contentPreserved: offerBefore.slice(0, 40),
      previewParity: true,
    };
    await exitCustomerPreview();

    // ——— Icon Backing ———
    await insertFamily(page, "icon");
    const icon = page.locator('[data-composition-node][data-element-kind="icon"]').last();
    await icon.click();
    await ownerClick(page.getByTestId("contextual-icon-appearance"), "Icon Appearance");
    const backingCategory = page.getByTestId("appearance-category-backing_surface");
    if (await backingCategory.isVisible().catch(() => false)) {
      await ownerClick(backingCategory, "Backing Surface");
    }
    const backingEnabled = page.getByTestId("icon-backing-enabled");
    await expect(backingEnabled).toBeVisible({ timeout: 10_000 });
    if (!(await backingEnabled.isChecked())) await backingEnabled.check();
    await expect(page.getByTestId("icon-backing-materials")).toBeVisible({ timeout: 10_000 });
    await ownerClick(page.getByTestId("icon-backing-material-chrome"), "Chrome backing");
    await expect(icon.locator('[data-icon-backing="on"]').first()).toBeVisible();
    await expect(icon.locator("[data-material-fill-authority]").first()).toHaveAttribute("data-material-fill-authority", "gradientFill");
    expect(Number(await icon.locator("[data-material-stop-count]").first().getAttribute("data-material-stop-count"))).toBeGreaterThanOrEqual(2);
    await saveDraft(page);
    await enterCustomerPreview();
    const previewIcon = page.locator('[data-testid="creative-composition-canvas"] [data-element-kind="icon"]').last();
    await expect(previewIcon.locator('[data-icon-backing="on"]').first()).toBeVisible();
    await expect(previewIcon.locator("[data-material-fill-authority]").first()).toHaveAttribute("data-material-fill-authority", "gradientFill");
    (report.consumers as Record<string, unknown>).iconBacking = { material: "chrome", previewParity: true };
    await exitCustomerPreview();
    await evidenceShot(page, "materials", "consumer-icon-backing-chrome.png");

    // ——— Card / Page Background texture Material ———
    const canvas = page.getByTestId("creative-composition-canvas");
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).toBeTruthy();
    await canvas.click({ position: { x: Math.max(4, (canvasBox?.width || 8) - 4), y: 4 } });
    await expect(page.locator('[data-contextual-object="card-root"]')).toBeVisible({ timeout: 10_000 });
    await ownerClick(page.getByTestId("contextual-root-background"), "Background");
    await expect(page.getByTestId("root-background-materials")).toBeVisible();
    const paperSwatch = page.getByTestId("root-material-paper");
    await expect(paperSwatch).toHaveAttribute("data-material-texture", "paper");
    await ownerClick(paperSwatch, "Apply Paper background");
    const bg = page.getByTestId("composition-background-renderer");
    await expect(bg).toHaveAttribute("data-material-preset", "paper");
    await expect(bg).toHaveAttribute("data-surface-texture", "paper");
    await expect(page.getByTestId("page-background-texture")).toBeVisible();
    await saveDraft(page);
    // Reload through Owner path
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("card-edit-workspace-host")).toHaveAttribute("data-builder-ready", "true", { timeout: 60_000 });
    await dismissOverlays(page);
    await expect(page.getByTestId("composition-background-renderer")).toHaveAttribute("data-material-preset", "paper", { timeout: 20_000 });
    await expect(page.getByTestId("composition-background-renderer")).toHaveAttribute("data-surface-texture", "paper");
    await enterCustomerPreview();
    await expect(page.getByTestId("composition-background-renderer")).toHaveAttribute("data-material-preset", "paper");
    await expect(page.getByTestId("composition-background-renderer")).toHaveAttribute("data-surface-texture", "paper");
    await expect(page.getByTestId("page-background-texture")).toBeVisible();
    (report.consumers as Record<string, unknown>).pageBackground = {
      material: "paper",
      textureSurvivedReload: true,
      previewParity: true,
    };
    await exitCustomerPreview();

    // Brushed metal texture + gradient on page
    const canvas2 = page.getByTestId("creative-composition-canvas");
    const box2 = await canvas2.boundingBox();
    await canvas2.click({ position: { x: Math.max(4, (box2?.width || 8) - 4), y: 4 } });
    await expect(page.locator('[data-contextual-object="card-root"]')).toBeVisible({ timeout: 10_000 });
    await ownerClick(page.getByTestId("contextual-root-background"), "Background");
    await ownerClick(page.getByTestId("root-material-brushed_metal"), "Brushed metal background");
    await expect(page.getByTestId("composition-background-renderer")).toHaveAttribute("data-material-preset", "brushed_metal");
    await expect(page.getByTestId("composition-background-renderer")).toHaveAttribute("data-surface-texture", "brushed");
    expect(Number(await page.getByTestId("composition-background-renderer").getAttribute("data-material-stop-count"))).toBeGreaterThanOrEqual(3);

    report.ok = true;
    report.at = new Date().toISOString();
    fs.writeFileSync(path.join(EVIDENCE, "materials", "consumer-gate.json"), JSON.stringify(report, null, 2));
    await evidenceShot(page, "materials", "consumer-gate-final.png");
  });
});
