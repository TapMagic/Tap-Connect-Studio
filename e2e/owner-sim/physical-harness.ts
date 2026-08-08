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
import {
  badgePresetInsertTestId,
  INSERT_SURFACES,
  type InsertSurface,
} from "./interaction-manifest";

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
      BLOCKED: merged.filter((v) => v.status === "BLOCKED").length,
      NOT_APPLICABLE: merged.filter((v) => v.status === "NOT_APPLICABLE").length,
      DEFERRED: merged.filter((v) => v.status === "DEFERRED").length,
      DEFERRED_BY_SCOPE: merged.filter((v) => v.status === "DEFERRED_BY_SCOPE").length,
    },
    verdicts: merged,
  };
  fs.writeFileSync(file, JSON.stringify(summary, null, 2));
  return summary;
}

/** Physical click — never force. Failure is a product defect. */
export async function ownerClick(locator: Locator, label: string) {
  // Prefer a visible match when duplicate testids exist (e.g. shade + topbar Save).
  const visible = locator.filter({ visible: true }).first();
  const target = (await visible.count().catch(() => 0)) > 0 ? visible : locator.first();
  await expect(target, `Owner cannot see/reach: ${label}`).toBeVisible({ timeout: 15_000 });
  await target.scrollIntoViewIfNeeded().catch(() => undefined);
  await target.click({ timeout: 10_000 });
}

export async function ownerFill(locator: Locator, value: string, label: string) {
  await expect(locator, `Owner cannot see/reach input: ${label}`).toBeVisible({ timeout: 15_000 });
  await locator.click();
  await locator.fill(value);
}

/** Dismiss save dialog via visible UI only (Keep editing). */
export async function dismissSaveDialogIfPresent(page: Page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const dialog = page.getByTestId("card-exit-save-dialog");
    if ((await dialog.count()) === 0) return;
    if (!(await dialog.isVisible().catch(() => false))) return;
    const keep = dialog
      .getByTestId("card-exit-keep-editing")
      .or(dialog.getByRole("button", { name: /Keep editing|Cancel|Stay/i }))
      .first();
    if ((await keep.count()) > 0 && (await keep.isVisible().catch(() => false))) {
      await keep.click({ timeout: 3_000 }).catch(() => undefined);
    } else {
      await page.keyboard.press("Escape").catch(() => undefined);
    }
    await page.waitForTimeout(80);
  }
}

/** Recovery alertdialog blocks the canvas — Keep server version is the safe Owner default. */
export async function dismissRecoveryPromptIfPresent(page: Page) {
  const prompt = page.getByTestId("card-recovery-prompt");
  if ((await prompt.count()) === 0) return;
  if (!(await prompt.isVisible().catch(() => false))) return;
  const keepServer = prompt
    .getByTestId("card-recovery-keep-server")
    .or(prompt.getByRole("button", { name: /Keep server version/i }))
    .first();
  if ((await keepServer.count()) > 0 && (await keepServer.isVisible().catch(() => false))) {
    await keepServer.click({ timeout: 3_000 }).catch(() => undefined);
  } else {
    await page.keyboard.press("Escape").catch(() => undefined);
  }
  await expect(prompt).toHaveCount(0, { timeout: 5_000 }).catch(() => undefined);
}

export async function closeExtraDocumentTabs(page: Page) {
  // Prior Clone pollution can leave dozens of tabs — close until a single document remains.
  for (let i = 0; i < 40; i += 1) {
    const closes = page.locator('[data-testid^="creative-document-tab-"] button[aria-label^="Close"]');
    const count = await closes.count();
    if (count === 0) break;
    // When only one tab remains, its Close may still exist — stop if Blank Studio needs that doc.
    const tabs = page.locator('[data-testid^="creative-document-tab-"]');
    if ((await tabs.count()) <= 1) break;
    await closes.first().click({ timeout: 1_500 }).catch(() => undefined);
    await dismissSaveDialogIfPresent(page);
    await page.waitForTimeout(40);
  }
}

export async function dismissTransientStudioChrome(page: Page) {
  await dismissSaveDialogIfPresent(page);
  await dismissRecoveryPromptIfPresent(page);
  const retention = page.getByTestId("retention-chooser");
  if ((await retention.count()) > 0 && (await retention.isVisible().catch(() => false))) {
    const keepClose = retention.getByRole("button", { name: /^Close$/i }).first();
    if ((await keepClose.count()) > 0 && (await keepClose.isVisible().catch(() => false))) {
      await keepClose.click({ timeout: 2_000 }).catch(() => undefined);
    } else {
      await page.keyboard.press("Escape").catch(() => undefined);
    }
  }
  const issues = page.getByRole("button", { name: /Collapse issues badge/i }).first();
  if ((await issues.count()) > 0 && (await issues.isVisible().catch(() => false))) {
    await issues.click({ timeout: 1_500 }).catch(() => undefined);
  }
}

export async function openBlankStudio(page: Page, viewport = { width: 1440, height: 960 }) {
  await page.setViewportSize(viewport);
  await page.goto("/dashboard/card/edit", { waitUntil: "domcontentloaded", timeout: 45_000 });
  await expect(page.getByTestId("card-edit-workspace-host")).toHaveAttribute("data-builder-ready", "true", {
    timeout: 60_000,
  });
  await dismissTransientStudioChrome(page);
  await closeExtraDocumentTabs(page);
  await dismissTransientStudioChrome(page);
  await ownerClick(page.getByTestId("card-creative-tool-templates"), "Templates rail");
  await expect(page.getByTestId("card-template-library")).toBeVisible({ timeout: 15_000 });
  await ownerClick(
    page.getByTestId("card-template-library").getByRole("button", { name: "Blank Card" }),
    "Blank Card"
  );
  await dismissSaveDialogIfPresent(page);
  await dismissRecoveryPromptIfPresent(page);
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

function familySelectionTarget(family: InsertSurface["family"]): RegExp {
  if (family === "text") return /text/i;
  if (family === "icon") return /icon/i;
  if (family === "button") return /button/i;
  if (family === "badge") return /badge/i;
  if (family === "coupon") return /coupon/i;
  if (family === "ticket") return /ticket/i;
  return new RegExp(family, "i");
}

function familyCompositionNodeSelector(family: InsertSurface["family"]): string {
  const canvas = '[data-testid="creative-composition-canvas"]';
  if (family === "badge") return `${canvas} [data-composition-node][data-element-kind="badge"]`;
  if (family === "icon") return `${canvas} [data-composition-node][data-element-kind="icon"]`;
  if (family === "button") return `${canvas} [data-composition-node][data-primitive="button"]`;
  if (family === "text") return `${canvas} [data-composition-node][data-primitive="text"]`;
  if (family === "coupon") return `${canvas} [data-composition-node][data-component-kind="coupon"]`;
  if (family === "ticket") return `${canvas} [data-composition-node][data-component-kind="ticket"]`;
  return `${canvas} [data-composition-node]`;
}

export async function insertFromSurface(page: Page, surface: InsertSurface) {
  await dismissTransientStudioChrome(page);
  await ownerClick(page.getByTestId(surface.railTool), `${surface.family} rail`);
  await expect(page.getByTestId(surface.libraryTestId)).toBeVisible({ timeout: 15_000 });
  const beforeFamily = await page.locator(surface.canvasSelector).count();
  const beforeNodes = await page.locator("[data-composition-node]").count();
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
  // Compare like-for-like family selectors — never composition-node count vs badge/button count.
  await expect
    .poll(async () => page.locator(surface.canvasSelector).count(), { timeout: 15_000 })
    .toBeGreaterThan(beforeFamily);
  // Prefer the composition-node hit target — inner shape/content can sit under selection handles.
  const node = page.locator(familyCompositionNodeSelector(surface.family)).last();
  await expect(node).toBeVisible({ timeout: 10_000 });
  const tools = page.getByTestId("card-contextual-object-tools");
  const readTarget = async () =>
    (await tools.getAttribute("data-selection-target").catch(() => "")) || "";
  let alreadySelected = familySelectionTarget(surface.family).test(await readTarget());
  if (!alreadySelected) {
    // Click interior away from edge/corner resize chrome (short badges make center ≈ south handle).
    const box = await node.boundingBox();
    if (box) {
      const x = box.x + Math.max(12, box.width * 0.5);
      const y = box.y + Math.max(10, Math.min(box.height * 0.35, box.height - 14));
      await page.mouse.click(x, y);
    } else {
      await node.click({ timeout: 10_000, position: { x: 12, y: 10 } });
    }
    alreadySelected = familySelectionTarget(surface.family).test(await readTarget());
  }
  await expect(tools).toBeVisible({ timeout: 10_000 });
  if (!alreadySelected) {
    throw new Error(
      `Inserted ${surface.family} but selection target is "${await readTarget()}" — select failed`
    );
  }
  return { node, before: beforeNodes, after: await page.locator("[data-composition-node]").count() };
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
                "contextual-text-appearance",
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

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await clickToolbarByTestId(page, ids, "Appearance");
    const drawer = page.getByTestId("card-creative-context-drawer");
    await expect(drawer).toHaveAttribute("data-drawer-mode", "edit", { timeout: 10_000 });
    if ((await appearanceContent().count()) > 0 && (await appearanceContent().isVisible().catch(() => false))) {
      return;
    }
    // Fill shortcut may land on solid-colors — that is still Appearance authority.
    const fill = page.getByTestId("appearance-fill-controls");
    if ((await fill.count()) > 0 && (await fill.isVisible().catch(() => false))) {
      const back = page.getByTestId("appearance-back").first();
      if ((await back.count()) > 0) await ownerClick(back, "Back from Fill to Appearance overview");
      if ((await appearanceContent().count()) > 0) return;
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

export function writeServerIdentity() {
  const identity = {
    generatedAt: new Date().toISOString(),
    branch: process.env.OWNER_SIM_BRANCH || "",
    sha: process.env.OWNER_SIM_SHA || "",
    baseUrl: process.env.BASE_URL || "http://127.0.0.1:3000",
    workspace: process.cwd(),
    serverPid: process.env.OWNER_SIM_SERVER_PID || "",
    serverPort: process.env.OWNER_SIM_SERVER_PORT || "3000",
    dirtyCount: process.env.OWNER_SIM_DIRTY_COUNT || "",
  };
  fs.mkdirSync(path.join(EVIDENCE_ROOT, "_reports"), { recursive: true });
  fs.writeFileSync(path.join(EVIDENCE_ROOT, "_reports", "server-identity.json"), JSON.stringify(identity, null, 2));
  return identity;
}

export async function readNodeCount(page: Page) {
  return page.locator("[data-composition-node]").count();
}

export type ToolbarDoorSnapshot = {
  drawerMode: string | null;
  inventoryJson: string;
  selectedNodeGeo: GeometrySnapshot | null;
  toolbarVisible: boolean;
  contentEditing: boolean;
};

export async function snapshotToolbarDoorState(page: Page, node?: Locator): Promise<ToolbarDoorSnapshot> {
  const drawerMode = await page
    .getByTestId("card-creative-context-drawer")
    .getAttribute("data-drawer-mode")
    .catch(() => null);
  const inventory = await readCompositionInventory(page);
  const selectedNodeGeo = node ? await readGeometry(node).catch(() => null) : null;
  const toolbarVisible = (await page.getByTestId("card-contextual-object-tools").count()) > 0;
  const contentEditing =
    (await page.locator('[data-composition-node][data-selected="true"]').getAttribute("data-content-editing").catch(() => null)) ===
    "true";
  return {
    drawerMode,
    inventoryJson: JSON.stringify(inventory),
    selectedNodeGeo,
    toolbarVisible,
    contentEditing,
  };
}

export async function collectToolbarDoorButtons(page: Page) {
  const tools = page.getByTestId("card-contextual-object-tools");
  await expect(tools).toBeVisible({ timeout: 10_000 });
  return tools.locator("button").evaluateAll((buttons) =>
    buttons
      .map((button) => {
        const el = button as HTMLButtonElement;
        const testId = el.getAttribute("data-testid") || "";
        const label = (el.textContent || "").trim() || el.getAttribute("aria-label") || "";
        const disabled = el.disabled;
        const hidden = el.offsetParent === null;
        return { testId, label, disabled, hidden };
      })
      .filter((item) => !item.hidden && !item.disabled && item.label.length > 0)
  );
}

const TOOLBAR_DOOR_SKIP = new Set([
  "contextual-target-label",
  "contextual-group-font-size",
  "contextual-font-size",
]);

export async function assertToolbarDoorOutcome(
  page: Page,
  before: ToolbarDoorSnapshot,
  after: ToolbarDoorSnapshot,
  doorLabel: string
) {
  const editDrawer = page.getByTestId("deep-left-edit-drawer");
  const contextualDrawer = page.getByTestId("card-creative-context-drawer");
  const drawerOpen =
    (await editDrawer.isVisible().catch(() => false)) ||
    (await page.locator('[data-testid^="contextual-"][data-testid$="-drawer"]').first().isVisible().catch(() => false));
  const editMode =
    after.drawerMode === "edit" ||
    (await contextualDrawer.getAttribute("data-drawer-mode").catch(() => null)) === "edit";
  const inventoryChanged = before.inventoryJson !== after.inventoryJson;
  const geoChanged =
    before.selectedNodeGeo &&
    after.selectedNodeGeo &&
    geometryChanged(before.selectedNodeGeo, after.selectedNodeGeo);
  const modeChanged = before.contentEditing !== after.contentEditing;
  const ok = drawerOpen || editMode || inventoryChanged || geoChanged || modeChanged;
  if (!ok) {
    recordVerdict({
      id: `toolbar-doors.${doorLabel.replace(/\s+/g, "-").toLowerCase()}`,
      domain: "drawer-transitions",
      label: `Toolbar door: ${doorLabel}`,
      status: "BROKEN",
      notes: ["No drawer, mutation, or mode change within 1s"],
      evidence: [],
    });
    throw new Error(`Toolbar door no-op: ${doorLabel}`);
  }
  return { drawerOpen, editMode, inventoryChanged, geoChanged, modeChanged };
}

export async function crawlToolbarDoors(page: Page, family: InsertSurface["family"], evidencePrefix: string) {
  const surface = INSERT_SURFACES.find((item) => item.family === family);
  if (!surface) throw new Error(`Unknown family ${family}`);
  await openBlankStudio(page);
  const { node } = await insertFromSurface(page, surface);
  const doors = await collectToolbarDoorButtons(page);
  const clicked: string[] = [];
  const broken: string[] = [];

  for (const door of doors) {
    if (TOOLBAR_DOOR_SKIP.has(door.testId)) continue;
    if (/^B$|^I$|^U$|^−10%$|^\+10%$/.test(door.label)) continue;
    const locator = door.testId
      ? page.getByTestId(door.testId).first()
      : page.getByTestId("card-contextual-object-tools").getByRole("button", { name: new RegExp(`^${door.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }).first();
    if ((await locator.count()) === 0 || !(await locator.isVisible().catch(() => false))) continue;

    const before = await snapshotToolbarDoorState(page, node);
    try {
      await ownerClick(locator, `${family} toolbar ${door.label || door.testId}`);
      await page.waitForTimeout(350);
      const after = await snapshotToolbarDoorState(page, node);
      await assertToolbarDoorOutcome(page, before, after, `${family}:${door.label || door.testId}`);
      clicked.push(door.label || door.testId);
      await evidenceShot(page, "drawer-transitions", `${evidencePrefix}-${(door.testId || door.label).replace(/\s+/g, "-")}`);
      // Close drawer/menu so next door starts from toolbar chrome.
      const closeBtn = page.getByTestId("deep-left-back").or(page.getByRole("button", { name: /Close editor/i })).first();
      if ((await closeBtn.count()) > 0 && (await closeBtn.isVisible().catch(() => false))) {
        await ownerClick(closeBtn, "Close drawer after door crawl");
      } else if (await page.getByTestId("card-contextual-object-tools").isVisible().catch(() => false)) {
        await ownerClick(locator, `Toggle-close ${door.label || door.testId}`).catch(() => undefined);
      }
      if ((await node.count()) > 0 && !(await page.getByTestId("card-contextual-object-tools").count())) {
        await node.click({ timeout: 8_000 });
      }
    } catch (error) {
      broken.push(`${door.label || door.testId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const status: CertStatus = broken.length === 0 ? "VERIFIED" : clicked.length > 0 ? "PARTIAL" : "BROKEN";
  recordVerdict({
    id: `toolbar-doors.${family}`,
    domain: "drawer-transitions",
    label: `Toolbar door crawl (${family})`,
    status,
    notes: [`clicked=${clicked.length}`, `broken=${broken.length}`, ...broken.slice(0, 8)],
    evidence: clicked.slice(0, 6).map((id) => `drawer-transitions/${evidencePrefix}-${id.replace(/\s+/g, "-")}.png`),
  });
  if (status === "BROKEN") throw new Error(`Toolbar door crawl failed for ${family}: ${broken.join("; ")}`);
  return { clicked, broken };
}

export async function openColorDoor(page: Page) {
  const color = page.getByTestId("contextual-color").or(page.getByTestId("contextual-group-color")).first();
  if ((await color.count()) > 0) {
    await ownerClick(color, "Color door");
    return;
  }
  const aa = page.getByTestId("contextual-aa").getByRole("button").first();
  if ((await aa.count()) > 0) await ownerClick(aa, "Aa color door");
  else throw new Error("No visible Color/Aa door");
}

export async function applyGlyphColor(page: Page, hex: string) {
  await openColorDoor(page);
  await expect(page.getByTestId("glyph-color-input").or(page.locator('input[aria-label="Custom glyph color"]')).first()).toBeVisible({
    timeout: 10_000,
  });
  const input = page.getByTestId("glyph-color-input").or(page.locator('input[aria-label="Custom glyph color"]')).first();
  await input.fill(hex);
  await page.waitForTimeout(250);
}

export async function openButtonLabelColor(page: Page) {
  await ownerClick(page.getByTestId("contextual-button-content"), "Button Edit contents");
  await expect(page.getByLabel("Button label color")).toBeVisible({ timeout: 10_000 });
}

export async function applyButtonLabelColor(page: Page, hex: string) {
  await openButtonLabelColor(page);
  await page.getByLabel("Button label color").fill(hex);
  await page.waitForTimeout(250);
}

/** Label paint lives on the inner label span, not the composition wrapper. */
export async function readButtonLabelPaint(button: Locator) {
  return button.evaluate((el) => {
    const surface = el.querySelector("[data-button-surface-kind]");
    const label =
      (surface?.querySelector("span span") as HTMLElement | null) ||
      (surface?.querySelector("span") as HTMLElement | null) ||
      (el.querySelector("a span span") as HTMLElement | null) ||
      (el.querySelector("strong") as HTMLElement | null);
    const target = label || (el.querySelector("a") as HTMLElement | null) || (el as HTMLElement);
    const style = window.getComputedStyle(target);
    return { color: style.color, text: (target.textContent || "").trim().slice(0, 40) };
  });
}

export async function openButtonFillOrMaterial(page: Page) {
  await ownerClick(page.getByTestId("contextual-button-appearance"), "Button Appearance");
  await expect(page.getByTestId("card-creative-context-drawer")).toHaveAttribute("data-drawer-mode", "edit", { timeout: 10_000 });
  await expect(page.getByTestId("deep-left-edit-header")).toContainText(/Appearance/i, { timeout: 10_000 });
  const fillCat = page.getByTestId("appearance-category-fill").or(page.getByTestId("appearance-category-color")).first();
  if ((await fillCat.count()) > 0) {
    await ownerClick(fillCat, "Fill category");
    await expect(page.getByTestId("appearance-fill-controls")).toBeVisible({ timeout: 10_000 });
    return "fill" as const;
  }
  const materialCat = page.getByTestId("appearance-category-material").first();
  if ((await materialCat.count()) > 0) {
    await ownerClick(materialCat, "Material category");
    await expect(page.getByTestId("material-engine-controls")).toBeVisible({ timeout: 10_000 });
    return "material" as const;
  }
  throw new Error("Button Appearance missing Fill/Material category");
}

/** Button paint lives on the inner surface span, not the outer composition node. */
export async function readButtonSurfacePaint(button: Locator) {
  const surface = button.locator("[data-button-surface-kind]").first();
  await expect(surface).toBeVisible({ timeout: 10_000 });
  return surface.evaluate((el) => {
    const style = window.getComputedStyle(el);
    return {
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      boxShadow: style.boxShadow,
      filter: style.filter,
    };
  });
}

export async function duplicateSelectedViaMore(page: Page) {
  const menu = page.getByTestId("common-more-menu");
  if ((await menu.count()) === 0 || !(await menu.isVisible().catch(() => false))) {
    await ownerClick(page.getByTestId("card-contextual-object-tools").getByRole("button", { name: /More actions/i }), "More actions");
  }
  await ownerClick(page.getByTestId("common-more-menu").getByRole("button", { name: /^Duplicate$/i }), "Duplicate");
}

export async function deleteSelectedViaMore(page: Page) {
  const menu = page.getByTestId("common-more-menu");
  // After Duplicate the More drawer may already be open — re-clicking More toggles it closed.
  if ((await menu.count()) === 0 || !(await menu.isVisible().catch(() => false))) {
    await ownerClick(page.getByTestId("card-contextual-object-tools").getByRole("button", { name: /More actions/i }), "More actions");
  }
  const del = page.getByTestId("more-delete").or(page.getByTestId("common-more-menu").getByRole("button", { name: /^Delete$/i })).first();
  await ownerClick(del, "Delete");
}

export async function insertCouponPreset(page: Page, presetId: string) {
  await ownerClick(page.getByTestId("card-creative-tool-coupons"), "Coupons rail");
  await ownerClick(page.getByTestId(`coupon-preset-${presetId}`), `Coupon preset ${presetId}`);
  const node = page.locator('[data-component-kind="coupon"]').last();
  await expect(node).toBeVisible({ timeout: 15_000 });
  return node;
}

export async function insertTicketPreset(page: Page, presetId: string) {
  await ownerClick(page.getByTestId("card-creative-tool-tickets"), "Tickets rail");
  await ownerClick(page.getByTestId(`ticket-preset-${presetId}`), `Ticket preset ${presetId}`);
  const node = page.locator('[data-component-kind="ticket"]').last();
  await expect(node).toBeVisible({ timeout: 15_000 });
  return node;
}

export async function insertButtonPreset(page: Page, presetId: string) {
  await ownerClick(page.getByTestId("card-creative-tool-buttons"), "Buttons rail");
  await ownerClick(page.getByTestId(`button-preset-${presetId}`), `Button preset ${presetId}`);
  const node = page.locator('[data-primitive="button"]').last();
  await expect(node).toBeVisible({ timeout: 15_000 });
  return node;
}

export async function insertBadgePreset(page: Page, presetId: string) {
  await ownerClick(page.getByTestId("card-creative-tool-badges"), "Badges rail");
  const testId = badgePresetInsertTestId(presetId);
  await ownerClick(page.getByTestId(testId), `Badge preset ${presetId}`);
  const node = page.locator('[data-testid="creative-composition-canvas"] [data-badge-shape]').last();
  await expect(node).toBeVisible({ timeout: 15_000 });
  return node;
}

export async function openCardRootAppearance(page: Page) {
  await expect(page.locator('[data-contextual-object="card-root"]')).toBeVisible({ timeout: 10_000 });
  await ownerClick(
    page.locator('[data-contextual-object="card-root"]').getByRole("button", { name: /^Background$/i }),
    "Card root Background"
  );
  await expect(page.getByTestId("contextual-root-background-drawer").or(page.getByTestId("root-background-editor")).first()).toBeVisible({
    timeout: 10_000,
  });
}

export async function readGroupMemberGeometries(page: Page, groupId: string) {
  return page.locator(`[data-composition-node][data-group="${groupId}"]`).evaluateAll((nodes) =>
    nodes.map((node) => {
      const el = node as HTMLElement;
      const rect = el.getBoundingClientRect();
      return { id: el.getAttribute("data-composition-node") || "", x: rect.x, y: rect.y };
    })
  );
}

export async function applyMaterialById(page: Page, materialId: string) {
  await openAppearanceOverview(page);
  const materialControls = page.getByTestId("material-engine-controls");
  if ((await materialControls.count()) === 0 || !(await materialControls.isVisible().catch(() => false))) {
    const materialCat = page.getByTestId("appearance-category-material");
    if ((await materialCat.count()) > 0) {
      await ownerClick(materialCat, "Material category");
    } else {
      const back = page.getByTestId("appearance-back").or(page.getByRole("button", { name: /← Appearance/i })).first();
      if ((await back.count()) > 0) await ownerClick(back, "Back to Appearance overview");
      await ownerClick(page.getByTestId("appearance-category-material"), "Material category");
    }
  }
  const tile = page.getByTestId(`material-${materialId}`);
  await expect(tile, `Material tile missing: ${materialId}`).toBeVisible({ timeout: 10_000 });
  await ownerClick(tile, `Material ${materialId}`);
}

export async function applyBadgeShapeById(page: Page, shapeId: string) {
  const controls = page.getByTestId("badge-shape-controls");
  if ((await controls.count()) === 0 || !(await controls.isVisible().catch(() => false))) {
    const shapeDoor = page.getByTestId("contextual-badge-shape");
    await expect(shapeDoor, "Badge Shape door missing").toBeVisible({ timeout: 10_000 });
    // Force-open: if Shape is already focused, toggle would close — click Appearance then Shape.
    if (await controls.isVisible().catch(() => false)) {
      /* already open */
    } else {
      await ownerClick(shapeDoor, "Badge Shape");
      if ((await controls.count()) === 0 || !(await controls.isVisible().catch(() => false))) {
        // Toggle-closed — open again
        await ownerClick(shapeDoor, "Badge Shape reopen");
      }
    }
  }
  await expect(page.getByTestId("badge-shape-controls")).toBeVisible({ timeout: 10_000 });
  const tile = page.getByTestId(`badge-shape-${shapeId}`);
  await expect(tile, `Badge shape control missing: ${shapeId}`).toBeVisible({ timeout: 10_000 });
  await ownerClick(tile, `Badge shape ${shapeId}`);
}

export async function insertTextCombination(page: Page, combinationId: string) {
  await ownerClick(page.getByTestId("card-creative-tool-text"), "Text rail");
  await expect(page.getByTestId("card-text-library")).toBeVisible({ timeout: 15_000 });
  await ownerClick(page.getByTestId(`text-combination-${combinationId}`), `Text combination ${combinationId}`);
  const node = page.locator('[data-primitive="text"]').last();
  await expect(node).toBeVisible({ timeout: 15_000 });
  return node;
}

export async function openAppearanceCategory(page: Page, categoryId: string) {
  await openAppearanceOverview(page);
  const overview = page.getByTestId("appearance-category-overview");
  if ((await overview.count()) === 0 || !(await overview.isVisible().catch(() => false))) {
    const back = page.getByTestId("appearance-back").or(page.getByRole("button", { name: /← Appearance/i })).first();
    if ((await back.count()) > 0) await ownerClick(back, "Back to Appearance");
  }
  await ownerClick(page.getByTestId(`appearance-category-${categoryId}`), `Appearance category ${categoryId}`);
}

/** Visual signature for false-variety detection (read-only). */
export async function readVisualSignature(locator: Locator) {
  return locator.evaluate((el) => {
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
      w: Math.round(rect.width),
      h: Math.round(rect.height),
      color: style.color,
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage.slice(0, 160),
      boxShadow: style.boxShadow.slice(0, 120),
      filter: style.filter,
      textShadow: style.textShadow.slice(0, 120),
      borderRadius: style.borderRadius,
      clipPath: style.clipPath,
      opacity: style.opacity,
      transform: style.transform,
    };
  });
}
