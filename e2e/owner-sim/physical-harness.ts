/**
 * Owner-simulation physical interaction harness.
 *
 * Rules:
 * - Ordinary browser clicks/drags/typing only (no force:true as normal path)
 * - No DOM overlay deletion
 * - No page.evaluate mutation of editor state
 * - No injected document JSON
 * - Read-only DOM / computed-style inspection after physical interaction is OK
 */

import { expect, type Locator, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import type { CertStatus, ManifestDomain } from "./interaction-manifest";
import { INSERT_SURFACES, type InsertSurface } from "./interaction-manifest";

export const EVIDENCE_ROOT = path.join(process.cwd(), "tmp/owner-sim-physical-evidence");

export type GeometrySnapshot = {
  x: number;
  y: number;
  width: number;
  height: number;
  transform: string;
  boxShadow: string;
  textShadow: string;
  filter: string;
  color: string;
  backgroundImage: string;
  opacity: string;
};

export type InteractionVerdict = {
  id: string;
  domain: ManifestDomain;
  label: string;
  status: CertStatus;
  notes: string[];
  evidence: string[];
};

const verdicts: InteractionVerdict[] = [];

export function ensureEvidenceDirs(domains: readonly string[]) {
  fs.mkdirSync(EVIDENCE_ROOT, { recursive: true });
  for (const domain of domains) {
    fs.mkdirSync(path.join(EVIDENCE_ROOT, domain), { recursive: true });
  }
  fs.mkdirSync(path.join(EVIDENCE_ROOT, "_manifest"), { recursive: true });
  fs.mkdirSync(path.join(EVIDENCE_ROOT, "_reports"), { recursive: true });
}

export function recordVerdict(verdict: InteractionVerdict) {
  const idx = verdicts.findIndex((item) => item.id === verdict.id);
  if (idx >= 0) verdicts[idx] = verdict;
  else verdicts.push(verdict);
  // Persist incrementally so a mid-crawl failure still keeps prior VERIFIED domains.
  writeVerdictReport();
}

export function writeVerdictReport() {
  const file = path.join(EVIDENCE_ROOT, "_reports", "certification-verdicts.json");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // Merge with on-disk report so a restarted worker cannot wipe earlier domains.
  let merged = [...verdicts];
  try {
    if (fs.existsSync(file)) {
      const prior = JSON.parse(fs.readFileSync(file, "utf8")) as { verdicts?: InteractionVerdict[] };
      const byId = new Map<string, InteractionVerdict>();
      for (const item of prior.verdicts || []) byId.set(item.id, item);
      for (const item of merged) byId.set(item.id, item);
      merged = [...byId.values()];
    }
  } catch {
    /* keep in-memory */
  }
  const summary = {
    generatedAt: new Date().toISOString(),
    counts: {
      VERIFIED: merged.filter((v) => v.status === "VERIFIED").length,
      PARTIAL: merged.filter((v) => v.status === "PARTIAL").length,
      BROKEN: merged.filter((v) => v.status === "BROKEN").length,
      NOT_APPLICABLE: merged.filter((v) => v.status === "NOT_APPLICABLE").length,
      DEFERRED: merged.filter((v) => v.status === "DEFERRED").length,
    },
    verdicts: merged,
  };
  fs.writeFileSync(file, JSON.stringify(summary, null, 2));
  return summary;
}

/** Physical click — never force. Failure is a product defect. */
export async function ownerClick(locator: Locator, label: string) {
  await expect(locator, `Owner cannot see/reach: ${label}`).toBeVisible({ timeout: 15_000 });
  await locator.scrollIntoViewIfNeeded().catch(() => undefined);
  await locator.click({ timeout: 10_000 });
}

export async function ownerFill(locator: Locator, value: string, label: string) {
  await expect(locator, `Owner cannot see/reach input: ${label}`).toBeVisible({ timeout: 15_000 });
  await locator.click();
  await locator.fill(value);
}

/** Dismiss save dialog via visible UI only (Keep editing). */
export async function dismissSaveDialogIfPresent(page: Page) {
  const dialog = page.getByTestId("card-exit-save-dialog");
  if ((await dialog.count()) === 0) return;
  const keep = dialog.getByRole("button", { name: /Keep editing|Cancel|Stay/i }).first();
  if (await keep.count()) {
    await ownerClick(keep, "Keep editing in save dialog");
  }
}

export async function openBlankStudio(page: Page, viewport = { width: 1440, height: 960 }) {
  await page.setViewportSize(viewport);
  await page.goto("/dashboard/card/edit", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("card-edit-workspace-host")).toHaveAttribute("data-builder-ready", "true", {
    timeout: 60_000,
  });
  await dismissSaveDialogIfPresent(page);
  await ownerClick(page.getByTestId("card-creative-tool-templates"), "Templates rail");
  await ownerClick(
    page.getByTestId("card-template-library").getByRole("button", { name: "Blank Card" }),
    "Blank Card"
  );
  await dismissSaveDialogIfPresent(page);
  await expect(page.getByTestId("creative-composition-canvas")).toBeVisible({ timeout: 20_000 });
  // Blank Card selects Card Root so the Owner lands on a truthful empty plane.
  await expect(page.locator('[data-contextual-object="card-root"]')).toBeVisible({ timeout: 15_000 });
}

export async function evidenceShot(page: Page, domain: ManifestDomain | string, name: string) {
  const dir = path.join(EVIDENCE_ROOT, domain);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name.endsWith(".png") ? name : `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

export async function readGeometry(locator: Locator): Promise<GeometrySnapshot> {
  return locator.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      transform: style.transform,
      boxShadow: style.boxShadow,
      textShadow: style.textShadow,
      filter: style.filter,
      color: style.color,
      backgroundImage: style.backgroundImage,
      opacity: style.opacity,
    };
  });
}

/** Read-only attribute inventory for selected/composition nodes. */
export async function readCompositionInventory(page: Page) {
  return page.locator("[data-composition-node]").evaluateAll((nodes) =>
    nodes.map((node) => {
      const el = node as HTMLElement;
      return {
        id: el.getAttribute("data-composition-node") || "",
        primitive: el.getAttribute("data-primitive") || "",
        elementKind: el.getAttribute("data-element-kind") || "",
        componentKind: el.getAttribute("data-component-kind") || "",
        selected: el.getAttribute("data-selected") || "false",
        group: el.getAttribute("data-group") || "",
        badgeShape: el.getAttribute("data-badge-shape") || "",
        text: (el.textContent || "").trim().slice(0, 80),
      };
    })
  );
}

export async function selectCanvasNode(page: Page, selector: string, index = 0) {
  const node = page.locator(selector).nth(index);
  await expect(node, `Canvas node missing: ${selector}[${index}]`).toBeVisible({ timeout: 15_000 });
  await node.click({ timeout: 10_000 });
  await expect(page.getByTestId("card-contextual-object-tools")).toBeVisible({ timeout: 10_000 });
  return node;
}

export async function insertFromSurface(page: Page, surface: InsertSurface) {
  await ownerClick(page.getByTestId(surface.railTool), `${surface.family} rail`);
  await expect(page.getByTestId(surface.libraryTestId)).toBeVisible({ timeout: 15_000 });
  const before = await page.locator("[data-composition-node]").count();
  if (surface.insert.kind === "role") {
    await ownerClick(
      page.getByTestId(surface.libraryTestId).getByRole("button", { name: surface.insert.name }).first(),
      `${surface.family} insert`
    );
  } else {
    const byId = page.getByTestId(surface.insert.id);
    if ((await byId.count()) > 0) {
      await ownerClick(byId.first(), `${surface.family} insert ${surface.insert.id}`);
    } else {
      // Fallback: first insertable button in library (still visible UI)
      await ownerClick(
        page.getByTestId(surface.libraryTestId).getByRole("button").first(),
        `${surface.family} library first button`
      );
    }
  }
  // Optional insertion target chooser
  const choice = page.getByTestId("insertion-target-choice");
  if (await choice.count()) {
    const addToCard = choice.getByRole("button", { name: /Add to Card|Card/i }).first();
    if (await addToCard.count()) await ownerClick(addToCard, "Add to Card");
  }
  await expect
    .poll(async () => page.locator(surface.canvasSelector).count(), { timeout: 15_000 })
    .toBeGreaterThan(0);
  const node = page.locator(surface.canvasSelector).last();
  await expect(node).toBeVisible({ timeout: 10_000 });
  // Many inserts auto-select; if not, click.
  if ((await page.getByTestId("card-contextual-object-tools").count()) === 0) {
    await node.click({ timeout: 10_000 });
  }
  await expect(page.getByTestId("card-contextual-object-tools")).toBeVisible({ timeout: 10_000 });
  return { node, before, after: await page.locator("[data-composition-node]").count() };
}

export async function insertFamily(page: Page, family: InsertSurface["family"]) {
  const surface = INSERT_SURFACES.find((item) => item.family === family);
  if (!surface) throw new Error(`No insert surface for ${family}`);
  return insertFromSurface(page, surface);
}

export async function toolbarLabels(page: Page): Promise<string[]> {
  const tools = page.getByTestId("card-contextual-object-tools");
  if (!(await tools.count())) return [];
  return tools.locator("button").evaluateAll((buttons) =>
    buttons.map((button) => (button.textContent || "").trim()).filter(Boolean)
  );
}

export async function clickToolbarByTestId(page: Page, testIds: string[], label: string) {
  for (const id of testIds) {
    const control = page.getByTestId(id).first();
    if ((await control.count()) > 0 && (await control.isVisible().catch(() => false))) {
      await ownerClick(control, label);
      return id;
    }
  }
  // Label fallback for Owner-visible buttons
  const byLabel = page.getByTestId("card-contextual-object-tools").getByRole("button", { name: new RegExp(`^${label}$`, "i") }).first();
  if ((await byLabel.count()) > 0) {
    await ownerClick(byLabel, label);
    return `role:${label}`;
  }
  throw new Error(`Enabled control not reachable for ${label}; tried ${testIds.join(", ")}`);
}

export async function openAppearanceOverview(page: Page) {
  const chrome = await page.getByTestId("card-contextual-object-tools").getAttribute("data-toolbar-chrome");
  const label = await page.getByTestId("contextual-target-label").innerText().catch(() => "");
  const ids =
    chrome === "group_parent" || /group/i.test(label)
      ? ["contextual-group-appearance"]
      : /button/i.test(label)
        ? ["contextual-button-appearance", "contextual-appearance"]
        : /badge/i.test(label)
          ? ["contextual-badge-appearance"]
          : /icon/i.test(label)
            ? ["contextual-icon-appearance"]
            : [
                "contextual-text-material",
                "contextual-appearance",
                "contextual-button-appearance",
                "contextual-badge-appearance",
                "contextual-group-appearance",
                "contextual-icon-appearance",
                "contextual-frame-appearance",
              ];
  const appearanceContent = () =>
    page
      .getByTestId("appearance-category-overview")
      .or(page.getByTestId("appearance-effects-list"))
      .or(page.getByTestId("material-engine-controls"))
      .or(page.getByTestId("appearance-fill-controls"))
      .first();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await clickToolbarByTestId(page, ids, "Appearance");
    const drawer = page.getByTestId("card-creative-context-drawer");
    await expect(drawer).toHaveAttribute("data-drawer-mode", "edit", { timeout: 10_000 });
    if ((await appearanceContent().count()) > 0 && (await appearanceContent().isVisible().catch(() => false))) {
      break;
    }
    // Stale nested page / empty portal — close via Back then reopen.
    const back = page.getByTestId("deep-left-back").or(page.getByTestId("appearance-back")).first();
    if ((await back.count()) > 0) await ownerClick(back, "Deep left back before Appearance retry");
  }
  await expect(appearanceContent()).toBeVisible({ timeout: 15_000 });
}

export async function applyEffectById(page: Page, effectId: string) {
  await openAppearanceOverview(page);
  const effectsList = page.getByTestId("appearance-effects-list");
  if ((await effectsList.count()) === 0) {
    const effectsCat = page.getByTestId("appearance-category-effects");
    if ((await effectsCat.count()) > 0) {
      await ownerClick(effectsCat, "Effects category");
    } else {
      // Already inside a nested Appearance page — return to overview first.
      const back = page.getByTestId("appearance-back").or(page.getByRole("button", { name: /← Appearance/i })).first();
      if ((await back.count()) > 0) await ownerClick(back, "Back to Appearance overview");
      await ownerClick(page.getByTestId("appearance-category-effects"), "Effects category");
    }
  }
  const tile = page.getByTestId(`effect-${effectId}`);
  await expect(tile, `Effect tile missing: ${effectId}`).toBeVisible({ timeout: 10_000 });
  await ownerClick(tile, `Effect ${effectId}`);
}

export async function undo(page: Page) {
  const btn = page.getByTestId("card-undo");
  await expect(btn).toBeEnabled({ timeout: 10_000 });
  await ownerClick(btn, "Undo");
}

export async function redo(page: Page) {
  const btn = page.getByTestId("card-redo");
  await expect(btn).toBeEnabled({ timeout: 10_000 });
  await ownerClick(btn, "Redo");
}

export async function saveDraft(page: Page) {
  const save = page.getByTestId("card-save");
  if ((await save.count()) > 0 && (await save.isEnabled().catch(() => false))) {
    await ownerClick(save, "Save now");
  }
  await expect(page.getByTestId("studio-save-state")).toHaveAttribute("data-saved", "true", { timeout: 30_000 });
}

/** Pointer drag on a visible handle — physical transform. */
export async function dragHandle(page: Page, handle: Locator, dx: number, dy: number) {
  await expect(handle).toBeVisible({ timeout: 10_000 });
  const box = await handle.boundingBox();
  if (!box) throw new Error("Handle has no bounding box");
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + dx, startY + dy, { steps: 12 });
  await page.mouse.up();
}

/** Select a composition object through the Layers drawer (Owner recovery when canvas is covered). */
export async function selectObjectViaLayers(
  page: Page,
  match: { name?: RegExp; elementKind?: string; primitive?: string },
  label: string
) {
  await ownerClick(page.getByTestId("card-creative-tool-layers"), `Layers for ${label}`);
  const drawer = page.getByTestId("card-layers-drawer");
  await expect(drawer).toBeVisible({ timeout: 10_000 });
  let row = drawer.locator('[data-testid^="layer-object-"]');
  if (match.elementKind) {
    row = drawer.locator(`[data-testid^="layer-object-"][data-element-kind="${match.elementKind}"]`);
  } else if (match.primitive) {
    row = drawer.locator(`[data-testid^="layer-object-"][data-layer-primitive="${match.primitive}"]`);
  } else if (match.name) {
    row = drawer.locator('[data-testid^="layer-object-"]').filter({
      has: page.locator('[data-testid^="layer-object-select-"]').filter({ hasText: match.name }),
    });
  } else {
    throw new Error(`selectObjectViaLayers requires name, elementKind, or primitive for ${label}`);
  }
  const select = row.first().locator('[data-testid^="layer-object-select-"]').first();
  await expect(select, `Layers row missing for ${label}`).toBeVisible({ timeout: 10_000 });
  await ownerClick(select, `Layers select ${label}`);
  await expect(page.getByTestId("card-contextual-object-tools")).toBeVisible({ timeout: 10_000 });
}

/** Bring the current selection to front via Position → To front. */
export async function bringSelectedToFront(page: Page) {
  await ownerClick(page.getByTestId("contextual-position"), "Position");
  const toFront = page.getByRole("button", { name: /^To front$/i }).first();
  await expect(toFront).toBeVisible({ timeout: 10_000 });
  await ownerClick(toFront, "To front");
}

/** Physical drag of the selected composition node's body. */
export async function dragSelectedNode(page: Page, node: Locator, dx: number, dy: number) {
  await expect(node).toBeVisible({ timeout: 10_000 });
  const box = await node.boundingBox();
  if (!box) throw new Error("Selected node has no bounding box");
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + dx, startY + dy, { steps: 12 });
  await page.mouse.up();
}

/** Clear selection by clicking empty pasteboard gutter (not under sticky view chrome). */
export async function clearSelection(page: Page) {
  const pasteboard = page.getByTestId("card-pasteboard");
  await expect(pasteboard).toBeVisible({ timeout: 15_000 });
  const box = await pasteboard.boundingBox();
  if (!box) throw new Error("Pasteboard has no bounding box");
  // Owner-natural empty gutter: left padding, below sticky view toolbar cluster.
  const x = box.x + Math.min(48, box.width * 0.08);
  const y = box.y + Math.min(140, box.height * 0.22);
  await page.mouse.click(x, y);
}

export function geometryChanged(before: GeometrySnapshot, after: GeometrySnapshot, keys: (keyof GeometrySnapshot)[] = ["x", "y", "width", "height", "boxShadow", "textShadow", "filter", "color"]) {
  return keys.some((key) => String(before[key]) !== String(after[key]));
}

export function effectVisualSignature(geo: GeometrySnapshot): string {
  return [geo.boxShadow, geo.textShadow, geo.filter, geo.color].join("|");
}

/** Read glyph/surface effect CSS from the painted node (inner text span when present). */
export async function readEffectSignature(locator: Locator): Promise<string> {
  return locator.evaluate((el) => {
    const root = el as HTMLElement;
    const glyph =
      root.querySelector<HTMLElement>("[data-glyph-effect], [data-text-curve], span, p, svg text") ||
      root;
    const style = window.getComputedStyle(glyph);
    const outer = window.getComputedStyle(root);
    const preset = root.getAttribute("data-effect") || root.getAttribute("data-effect-preset") || "";
    return [
      preset,
      style.textShadow,
      style.filter,
      style.boxShadow,
      outer.boxShadow,
      style.color,
      style.webkitTextStroke || "",
    ].join("|");
  });
}
