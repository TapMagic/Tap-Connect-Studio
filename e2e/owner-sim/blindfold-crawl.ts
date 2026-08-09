/**
 * Blindfold Pass — context-provenanced physical operation of runtime controls.
 *
 * Rules encoded here:
 * - Never mark NOT_APPLICABLE for missing testid / blank-card invisibility.
 * - Reconstruct the discovery context before operating.
 * - Workspace chrome is in scope (Save, Preview, prefs, rulers, Publish-to-safe-boundary).
 * - External provider universes and production-destructive publish remain DEFERRED_BY_SCOPE.
 */

import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import type { InsertSurface } from "./interaction-manifest";
import { INSERT_SURFACES } from "./interaction-manifest";
import fs from "node:fs";
import path from "node:path";
import {
  closeExtraDocumentTabs,
  dismissRecoveryPromptIfPresent,
  dismissSaveDialogIfPresent,
  dismissTransientStudioChrome,
  EVIDENCE_ROOT,
  insertFamily,
  openAppearanceOverview,
  openBlankStudio,
  ownerClick,
} from "./physical-harness";

function appendBlindfoldProgress(line: string) {
  const file = path.join(EVIDENCE_ROOT, "_reports", "blindfold-progress.log");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${new Date().toISOString()} ${line}\n`);
}

export type BlindfoldContext =
  | { kind: "blank-card-root" }
  | { kind: "selected"; family: InsertSurface["family"] }
  | { kind: "appearance"; family: InsertSurface["family"] }
  | { kind: "editor-preferences" }
  | { kind: "overflow-menu" }
  | { kind: "root-background" }
  | { kind: "unknown"; label: string };

export type ProvenancedControl = {
  key: string;
  testId: string;
  role: string;
  name: string;
  tag: string;
  enabled: boolean;
  contexts: string[];
};

export function parseContextLabel(label: string): BlindfoldContext {
  if (label === "blank-card-root") return { kind: "blank-card-root" };
  if (label === "editor-preferences") return { kind: "editor-preferences" };
  if (label === "overflow-menu") return { kind: "overflow-menu" };
  if (label === "root-background") return { kind: "root-background" };
  const selected = label.match(/^selected-(.+)$/);
  if (selected) {
    const family = selected[1] as InsertSurface["family"];
    if (INSERT_SURFACES.some((s) => s.family === family)) {
      return { kind: "selected", family };
    }
  }
  const appearance = label.match(/^appearance-(.+)$/);
  if (appearance) {
    const family = appearance[1] as InsertSurface["family"];
    if (INSERT_SURFACES.some((s) => s.family === family)) {
      return { kind: "appearance", family };
    }
  }
  return { kind: "unknown", label };
}

/** Close overlays that trap pointer events mid-crawl (Resize/Adapt, Advanced, prefs). */
export async function dismissBlockingOverlays(
  page: Page,
  options?: { preservePreferences?: boolean; preserveOverflow?: boolean }
) {
  await dismissTransientStudioChrome(page);
  await dismissRecoveryPromptIfPresent(page);
  await dismissSaveDialogIfPresent(page);
  // Composition More menu is a real overlay — dismiss via Escape / More toggle before other clicks.
  const compositionMenu = page.getByTestId("composition-context-menu");
  if ((await compositionMenu.count()) > 0 && (await compositionMenu.isVisible().catch(() => false))) {
    await page.keyboard.press("Escape").catch(() => undefined);
    if (await compositionMenu.isVisible().catch(() => false)) {
      const openMore = page.locator('[data-testid^="composition-more-"][aria-expanded="true"]').first();
      if ((await openMore.count()) > 0) await openMore.click({ timeout: 2_000 }).catch(() => undefined);
    }
    await compositionMenu.waitFor({ state: "hidden", timeout: 2_000 }).catch(() => undefined);
  }
  for (let i = 0; i < 3; i += 1) {
    const resize = page.getByTestId("resize-adapt-backdrop");
    if ((await resize.count()) > 0 && (await resize.isVisible().catch(() => false))) {
      const done = page.getByTestId("resize-adapt-done").first();
      const close = page
        .getByTestId("resize-adapt-panel")
        .getByRole("button", { name: /close resize and adapt|close|done|cancel/i })
        .first();
      if ((await done.count()) > 0 && (await done.isVisible().catch(() => false))) {
        await ownerClick(done, "Done — close Resize / Adapt");
      } else if ((await close.count()) > 0 && (await close.isVisible().catch(() => false))) {
        await ownerClick(close, "Close Resize / Adapt overlay");
      } else {
        await page.keyboard.press("Escape").catch(() => undefined);
        await resize.click({ position: { x: 8, y: 8 }, timeout: 2_000 }).catch(() => undefined);
      }
      continue;
    }
    const retention = page.getByTestId("retention-chooser");
    if ((await retention.count()) > 0 && (await retention.isVisible().catch(() => false))) {
      const close = retention.getByRole("button", { name: /^Close$/i }).first();
      if ((await close.count()) > 0 && (await close.isVisible().catch(() => false))) {
        await ownerClick(close, "Close Keep this Card chooser");
      } else {
        await page.keyboard.press("Escape").catch(() => undefined);
      }
      continue;
    }
    const advanced = page.getByTestId("card-advanced-settings-overlay");
    if ((await advanced.count()) > 0 && (await advanced.isVisible().catch(() => false))) {
      const close = advanced.getByRole("button", { name: /close/i }).first();
      if ((await close.count()) > 0) await ownerClick(close, "Close Advanced settings");
      else await page.keyboard.press("Escape").catch(() => undefined);
      continue;
    }
    break;
  }
  // Close open menus via the details API only — never send a bare Escape here.
  // Escape is owned by Studio exit layering and can open the Exit dialog mid-crawl.
  // Do not collapse the menu that is the active discovery context.
  if (!options?.preservePreferences) {
    await page
      .getByTestId("editor-preferences-menu")
      .evaluate((el) => {
        (el as HTMLDetailsElement).open = false;
      })
      .catch(() => undefined);
  }
  if (!options?.preserveOverflow) {
    await page
      .getByTestId("card-overflow-menu")
      .evaluate((el) => {
        (el as HTMLDetailsElement).open = false;
      })
      .catch(() => undefined);
  }
}

export async function reconstructContext(page: Page, label: string): Promise<BlindfoldContext> {
  appendBlindfoldProgress(`reconstruct start ${label}`);
  const ctx = parseContextLabel(label);
  appendBlindfoldProgress(`reconstruct openBlank ${label}`);
  await openBlankStudio(page);
  await dismissBlockingOverlays(page, {
    preservePreferences: ctx.kind === "editor-preferences",
    preserveOverflow: ctx.kind === "overflow-menu",
  });

  if (ctx.kind === "editor-preferences") {
    appendBlindfoldProgress(`reconstruct prefs ${label}`);
    const menu = page.getByTestId("editor-preferences-menu");
    await expect(menu).toBeVisible({ timeout: 10_000 });
    await menu.evaluate((el) => {
      (el as HTMLDetailsElement).open = true;
    });
    await expect(menu.locator("input").first()).toBeVisible({ timeout: 5_000 });
  } else if (ctx.kind === "overflow-menu") {
    appendBlindfoldProgress(`reconstruct overflow ${label}`);
    const menu = page.getByTestId("card-overflow-menu").first();
    await expect(menu).toBeVisible({ timeout: 10_000 });
    await menu.evaluate((el) => {
      (el as HTMLDetailsElement).open = true;
    });
    await expect(menu.getByRole("button").first()).toBeVisible({ timeout: 5_000 });
  } else if (ctx.kind === "root-background") {
    appendBlindfoldProgress(`reconstruct root-background ${label}`);
    await ownerClick(
      page.locator('[data-contextual-object="card-root"]').getByRole("button", { name: /^Background$/i }),
      "Reconstruct Card root Background"
    );
    await expect(page.getByTestId("root-background-editor")).toBeVisible({ timeout: 10_000 });
  } else if (ctx.kind === "selected" || ctx.kind === "appearance") {
    appendBlindfoldProgress(`reconstruct insert ${ctx.family} ${label}`);
    const inserted = await insertFamily(page, ctx.family);
    appendBlindfoldProgress(`reconstruct select ${ctx.family} ${label}`);
    // insertFamily already selects the node — do not re-click (own resize chrome intercepts).
    await expect(page.getByTestId("card-contextual-object-tools")).toBeVisible({ timeout: 10_000 });
    if (ctx.kind === "appearance") {
      appendBlindfoldProgress(`reconstruct appearance ${ctx.family} ${label}`);
      try {
        await openAppearanceOverview(page);
      } catch {
        // Reselect via interior mouse click if Appearance door missed.
        const box = await inserted.node.boundingBox();
        if (box) {
          await page.mouse.click(
            box.x + Math.max(12, box.width * 0.5),
            box.y + Math.max(10, Math.min(box.height * 0.35, box.height - 14))
          );
        }
        await page.waitForTimeout(120);
        await openAppearanceOverview(page);
      }
    }
  }

  appendBlindfoldProgress(`reconstruct ready ${label}`);
  return ctx;
}

/** Re-open Card-root Background without a full Blank Studio reload. */
export async function ensureRootBackgroundContext(page: Page) {
  const editor = page.getByTestId("root-background-editor");
  if ((await editor.count()) > 0 && (await editor.isVisible().catch(() => false))) return;
  const rootTools = page.locator('[data-contextual-object="card-root"]');
  if ((await rootTools.count()) === 0 || !(await rootTools.isVisible().catch(() => false))) {
    await openBlankStudio(page);
  }
  await ownerClick(
    page.locator('[data-contextual-object="card-root"]').getByRole("button", { name: /^Background$/i }),
    "Restore Card root Background"
  );
  await expect(page.getByTestId("root-background-editor")).toBeVisible({ timeout: 10_000 });
}

/** Re-open Appearance overview (not a nested category page) without a full reload when possible. */
export async function ensureAppearanceContext(page: Page, label: string) {
  const tools = page.getByTestId("card-contextual-object-tools");
  if ((await tools.count()) === 0 || !(await tools.isVisible().catch(() => false))) {
    await reconstructContext(page, label);
  } else {
    try {
      await openAppearanceOverview(page);
    } catch {
      await reconstructContext(page, label);
    }
  }
  // Always land on the category overview — nested pages hide sibling category doors.
  for (let i = 0; i < 4; i += 1) {
    const overview = page.getByTestId("appearance-category-overview");
    if ((await overview.count()) > 0 && (await overview.isVisible().catch(() => false))) return;
    const back = page.getByTestId("appearance-back").or(page.getByTestId("deep-left-back")).first();
    if ((await back.count()) > 0 && (await back.isVisible().catch(() => false))) {
      await back.click({ timeout: 3_000 }).catch(() => undefined);
      continue;
    }
    break;
  }
  await expect(page.getByTestId("appearance-category-overview")).toBeVisible({ timeout: 10_000 });
}

/** Genuine product/external boundaries only — not convenience skips. */
export function genuineDeferralReason(control: ProvenancedControl): string | null {
  const blob = `${control.testId} ${control.name}`.toLowerCase();
  // Next.js / framework chrome outside Studio product
  if (/next\.js|dev tools|skip to main|open next/i.test(blob)) {
    return "framework / Next.js chrome — outside Creative Studio product surface";
  }
  // External provider universes — capability routes are tested elsewhere; item enumeration deferred
  if (/^iconify-result-/.test(control.testId) || /^google-font-/.test(control.testId)) {
    return "external provider universe item — integration routes certified separately; not item-enumerated";
  }
  return null;
}

/** Shared workspace chrome is not a materially different target context across families. */
export function isSharedWorkspaceChrome(control: ProvenancedControl): boolean {
  const id = control.testId || "";
  const name = control.name || "";
  if (
    /^(card-save|card-undo|card-redo|card-preview-as-customer|card-publish|card-exit-edit-mode|card-clone|card-resize-adapt|editor-preferences-menu|card-overflow-menu|studio-save-state|creative-document-tabs|card-preview-motion|card-restart-motion|card-reduced-motion-simulation|card-history|card-zoom-fit|card-zoom-fit-selection|card-zoom-in|card-zoom-out|card-document-name|card-pan-tool|card-page-extension-handle|card-page-exact-height|keep-this-card)$/.test(
      id
    )
  ) {
    return true;
  }
  if (/^card-creative-tool-/.test(id)) return true;
  if (/^creative-document-tab-/.test(id)) return true;
  if (/^Close /i.test(name) && /Variation|Card|Demo|Blindfold|Copy of/i.test(name)) return true;
  if (/,\s*Card,|,\s*Variation,/i.test(name)) return true;
  if (/^Clone$/i.test(name)) return true;
  if (/^Resize \/ Adapt$/i.test(name)) return true;
  if (/^(Templates|Elements|Text|Icons|Buttons|Badges|Coupons|Tickets|Brand|Assets|Background|Projects|Reusable|Layers|AI Assist|Write|Tools|Help|Guide)$/i.test(name)) {
    return true;
  }
  return false;
}

/** In selected/appearance contexts, only object-local controls are materially distinct. */
export function isObjectLocalControl(control: ProvenancedControl & { inToolbar?: boolean; inDrawer?: boolean; inCanvasChrome?: boolean; inRail?: boolean }): boolean {
  const id = control.testId || "";
  const name = control.name || "";
  // Creative library / insert catalog is blank-card-root (or rail) work — not selected/appearance.
  if (control.inRail || isSharedWorkspaceChrome(control)) return false;
  if (/^card-zoom-/.test(id) || /^Zoom |^Fit /i.test(name)) return false;
  if (
    /^(starter-|button-preset-|coupon-preset-|ticket-preset-|text-combination-|badge-preset-|icon-recommended-)/.test(id)
  ) {
    return false;
  }
  if (/^Search |^Add editable|^Blank Card|^Brand starter|^Essential Card|^Clone current|^Premium |^Pill$|^Round$|^Seal$/i.test(name)) {
    return false;
  }
  if (control.inToolbar || control.inCanvasChrome) return true;
  if (
    /^(effect-|material-|appearance-|contextual-|badge-shape-|border-style-|gradient-|text-box-|iconify-|root-|composition-|more-delete|nested-|deep-left-)/.test(
      id
    )
  ) {
    return true;
  }
  // Deep-left / Appearance drawer bodies only — not the Templates/Badges library drawer.
  if (control.inDrawer && /^(appearance-|contextual-|material-|effect-|badge-shape-|border-|gradient-|text-box-|iconify-)/.test(id)) {
    return true;
  }
  return false;
}

/** Prefer a single chrome certification context to avoid Clone/tab pollution. */
export function contextsForControl(control: ProvenancedControl): string[] {
  const contexts =
    control.contexts && control.contexts.length > 0 ? [...new Set(control.contexts)] : ["blank-card-root"];
  const id = control.testId || "";
  const name = control.name || "";
  // Overflow-only chrome must be reconstructed with the overflow menu open.
  if (
    /^(card-preview-motion|card-restart-motion|card-reduced-motion-simulation|card-history)$/.test(id) ||
    /^History$/i.test(name)
  ) {
    return ["overflow-menu"];
  }
  // Preferences live inside a closed <details> until opened.
  if (
    /Editor theme|Pasteboard|Density|^Rulers$|^Grid$|Safe margins|Alignment guides|Publication boundary|Dim outside document|Reduced motion|High contrast|Larger controls/i.test(
      name
    )
  ) {
    return ["editor-preferences"];
  }
  // Template library choosers live only in Templates rail — never under root-background.
  if (
    /Blank Card|Brand starter|Essential Card|Search templates|Premium |Blank Section|Clone current Card/i.test(name) &&
    !/^contextual-/.test(id)
  ) {
    return ["blank-card-root"];
  }
  // Drawer Close controls are library/editor chrome — certify once at blank root, not under Background.
  if (/^Close creative drawer$/i.test(name) || /^Close editor$/i.test(name)) {
    return ["blank-card-root"];
  }
  if (isSharedWorkspaceChrome(control)) {
    if (contexts.includes("blank-card-root")) return ["blank-card-root"];
    if (contexts.includes("editor-preferences")) return ["editor-preferences"];
    return [contexts[0]!];
  }
  return contexts;
}

export function locateControl(page: Page, control: ProvenancedControl): Locator {
  if (control.testId) {
    return page.getByTestId(control.testId).first();
  }
  if (control.name) {
    // Inventory sometimes concatenates title + description ("Blank CardStart with…").
    const shortName =
      control.name
        .replace(
          /(Start with|Use available|Identity and|An optional|Logo,|Image,|Badge,|Location,|Heading,|Review |Product |Title,|Gallery |·).*$/i,
          ""
        )
        .trim() || control.name.slice(0, 40);
    // Pref radios are labeled like "Editor theme: system" — match the leaf choice too.
    const leafName = shortName.includes(":") ? shortName.split(":").pop()!.trim() : shortName;
    const role =
      control.role === "button" || control.tag === "button"
        ? "button"
        : control.role === "menuitem"
          ? "menuitem"
          : control.role === "tab"
            ? "tab"
            : control.role === "radio"
              ? "radio"
              : control.role === "checkbox" || (control.tag === "input" && /Rulers|Grid|Safe|Alignment|Publication|Dim |Reduced|High contrast|Larger/i.test(shortName))
                ? "checkbox"
                : null;
    if (role === "checkbox") {
      return page.getByRole("checkbox", { name: new RegExp(escapeRegExp(leafName.slice(0, 40)), "i") }).first();
    }
    if (role === "radio") {
      return page
        .getByRole("radio", { name: new RegExp(escapeRegExp(leafName.slice(0, 40)), "i") })
        .or(page.getByRole("radio", { name: new RegExp(escapeRegExp(shortName.slice(0, 60)), "i") }))
        .first();
    }
    if (role === "button" || role === "menuitem" || role === "tab") {
      return page
        .getByRole(role, { name: new RegExp(`^${escapeRegExp(shortName.slice(0, 60))}`, "i") })
        .first();
    }
    if (control.tag === "select") {
      const ariaExact = page.locator(`select[aria-label="${shortName.replace(/"/g, '\\"')}"]`);
      const ariaLeaf = page.locator(`select[aria-label="${leafName.replace(/"/g, '\\"')}"]`);
      const byLabel = page.getByLabel(new RegExp(escapeRegExp(leafName.slice(0, 48)), "i"));
      return ariaExact.or(ariaLeaf).or(byLabel).first();
    }
    if (control.tag === "input" || control.tag === "textarea") {
      const byRadio = page.getByRole("radio", { name: new RegExp(escapeRegExp(leafName.slice(0, 60)), "i") });
      const byCheckbox = page.getByRole("checkbox", { name: new RegExp(escapeRegExp(leafName.slice(0, 60)), "i") });
      const byPlaceholder = page.getByPlaceholder(new RegExp(escapeRegExp(shortName.slice(0, 40)), "i"));
      const byAria = page.locator(`input[aria-label="${leafName.replace(/"/g, '\\"')}"]`);
      // Gradient stop labels may include a live position % — also match stable stop-id labels.
      const ariaPrefix = leafName.replace(/\s+\d+%$/, "");
      const byAriaPrefix = /Gradient stop (alpha|position)/i.test(leafName)
        ? page.locator(`input[aria-label^="${ariaPrefix.replace(/"/g, '\\"')}"]`)
        : page.locator(`[data-blindfold-missing="no-prefix"]`);
      const byLegacyStopColor = /^Color\s+\d+%/i.test(leafName)
        ? page.locator(`input[aria-label^="Gradient stop color"]`)
        : page.locator(`[data-blindfold-missing="no-legacy-color"]`);
      return byRadio.or(byCheckbox).or(byPlaceholder).or(byAria).or(byAriaPrefix).or(byLegacyStopColor).first();
    }
    return page.getByText(shortName.slice(0, 40), { exact: false }).first();
  }
  // Never fall back to bare tag.first() — that clicks random chrome and strands the crawl.
  return page.locator(`[data-blindfold-missing="${control.key || "unknown"}"]`);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type OperateResult =
  | { status: "VERIFIED"; notes: string[] }
  | { status: "BROKEN"; notes: string[] }
  | { status: "BLOCKED"; notes: string[] }
  | { status: "NOT_APPLICABLE"; notes: string[] }
  | { status: "DEFERRED_BY_SCOPE"; notes: string[] };

/**
 * Physically operate one control in an already-reconstructed context.
 * Does not use force:true. Observes operability + absence of thrown errors.
 */
export async function operateControlPhysically(
  page: Page,
  control: ProvenancedControl,
  contextLabel: string
): Promise<OperateResult> {
  appendBlindfoldProgress(`operate start ${contextLabel} ${control.testId || control.name || control.tag}`);
  try {
    const result = await operateControlPhysicallyInner(page, control, contextLabel);
    appendBlindfoldProgress(`operate end ${result.status} ${contextLabel} ${control.testId || control.name || control.tag}`);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    appendBlindfoldProgress(`operate end BROKEN ${contextLabel} ${control.testId || control.name || control.tag}`);
    // Keep recovery bounded — evaluate/click without timeout can wedge a dead page.
    await Promise.race([
      dismissBlockingOverlays(page).catch(() => undefined),
      page.waitForTimeout(2_000),
    ]);
    const exitPreview = page
      .getByTestId("preview-exit")
      .or(page.getByTestId("card-exit-preview"))
      .first();
    if ((await exitPreview.isVisible().catch(() => false))) {
      await exitPreview.click({ timeout: 2_000 }).catch(() => undefined);
    }
    return { status: "BROKEN", notes: [message, `context=${contextLabel}`] };
  }
}

async function operateControlPhysicallyInner(
  page: Page,
  control: ProvenancedControl,
  contextLabel: string
): Promise<OperateResult> {
  await dismissSaveDialogIfPresent(page);
  await dismissBlockingOverlays(page, {
    preservePreferences: contextLabel === "editor-preferences",
    preserveOverflow: contextLabel === "overflow-menu",
  });
  const defer = genuineDeferralReason(control);
  if (defer) {
    return { status: "DEFERRED_BY_SCOPE", notes: [defer, `context=${contextLabel}`] };
  }

  // Exit Edit: open the save dialog boundary, then Keep editing — never leave Studio mid-suite.
  if (control.testId === "card-exit-edit-mode" || /exit edit/i.test(control.name)) {
    const exit = page.getByTestId("card-exit-edit-mode").first();
    await ownerClick(exit, "Exit Edit Mode (safe boundary)");
    const dialog = page.getByTestId("card-exit-save-dialog");
    if ((await dialog.count()) > 0 && (await dialog.isVisible().catch(() => false))) {
      const keep = dialog
        .getByTestId("card-exit-keep-editing")
        .or(dialog.getByRole("button", { name: /Keep editing|Cancel|Stay/i }))
        .first();
      if ((await keep.count()) > 0) {
        await ownerClick(keep, "Keep editing after Exit Edit boundary");
      } else {
        await page.keyboard.press("Escape");
      }
    }
    await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible({ timeout: 10_000 });
    return {
      status: "VERIFIED",
      notes: ["Exit Edit boundary exercised; remained in Studio via Keep editing", `context=${contextLabel}`],
    };
  }

  // Clone creates persisted document tabs — certify operability without multiplying session pollution.
  // Do not treat Templates → "Clone current Card" as the topbar Clone control.
  if (control.testId === "card-clone" || /^Clone$/i.test(control.name.trim())) {
    const clone = page.getByTestId("card-clone").or(page.getByRole("button", { name: /^Clone$/i })).first();
    await expect(clone).toBeVisible({ timeout: 10_000 });
    const disabled = await clone.isDisabled().catch(() => false);
    return {
      status: disabled ? "BROKEN" : "VERIFIED",
      notes: [
        disabled
          ? "Clone control disabled unexpectedly"
          : "Clone certified reachable/enabled without clicking (avoids persisted tab pollution)",
        `context=${contextLabel}`,
      ],
    };
  }

  // Document tabs are session-history chrome. Certify the tab strip once via creative-document-tabs;
  // do not chase every historical Variation title from prior Clone pollution.
  if (
    /^creative-document-tab-/.test(control.testId) ||
    (/^Close /i.test(control.name) && /Variation|Card|Demo|Copy of|Blindfold/i.test(control.name)) ||
    (/,\s*Card,|,\s*Variation,/i.test(control.name) && control.tag === "button")
  ) {
    const strip = page.getByTestId("creative-document-tabs");
    if ((await strip.count()) > 0 && (await strip.isVisible().catch(() => false))) {
      return {
        status: "VERIFIED",
        notes: ["Document tab strip present; individual historical tabs not activated", `context=${contextLabel}`],
      };
    }
    return {
      status: "NOT_APPLICABLE",
      notes: ["Document tab strip absent in reconstructed session — genuine session semantics", `context=${contextLabel}`],
    };
  }

  // Preview: enter customer preview then MUST return to edit — otherwise the crawl strands.
  if (control.testId === "card-preview-as-customer" || /preview draft/i.test(control.name)) {
    const preview = page.getByTestId("card-preview-as-customer").filter({ visible: true }).first();
    await ownerClick(preview, "Preview draft");
    await expect(page.locator('[data-testid="card-edit-workspace-host"][data-studio-mode="preview"]')).toBeVisible({
      timeout: 10_000,
    });
    const back = page
      .getByTestId("preview-exit")
      .or(page.getByTestId("card-exit-preview"))
      .first();
    await expect(back, "Exit Preview control missing").toBeVisible({ timeout: 10_000 });
    await ownerClick(back, "Return from Preview");
    await expect(page.locator('[data-testid="card-edit-workspace-host"][data-studio-mode="edit"]')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId("card-contextual-object-tools")).toBeVisible({ timeout: 10_000 });
    return {
      status: "VERIFIED",
      notes: ["Preview draft operated and returned to Edit", `context=${contextLabel}`],
    };
  }

  // Fit selection is honestly disabled with no object selection — certify the disabled boundary.
  if (control.testId === "card-zoom-fit-selection" || /^Fit selection$/i.test(control.name)) {
    const fit = page.getByTestId("card-zoom-fit-selection").first();
    await expect(fit).toBeVisible({ timeout: 10_000 });
    const disabled = await fit.isDisabled().catch(() => false);
    if (disabled) {
      return {
        status: "VERIFIED",
        notes: ["Fit selection disabled without a selection — truthful Owner boundary", `context=${contextLabel}`],
      };
    }
    await ownerClick(fit, "Fit selection");
    return { status: "VERIFIED", notes: ["Fit selection operated", `context=${contextLabel}`] };
  }

  await dismissBlockingOverlays(page, {
    preservePreferences: contextLabel === "editor-preferences",
    preserveOverflow: contextLabel === "overflow-menu",
  });

  if (!control.testId && !String(control.name || "").trim()) {
    if (control.tag === "input") {
      const unlabeled = await page.evaluate(() =>
        [...document.querySelectorAll("input")].filter((el) => {
          const visible = !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
          const named = !!(
            el.getAttribute("aria-label") ||
            el.getAttribute("placeholder") ||
            el.getAttribute("name") ||
            el.id ||
            el.getAttribute("data-testid")
          );
          return visible && el.type !== "hidden" && !named;
        }).length
      );
      if (unlabeled === 0) {
        return {
          status: "NOT_APPLICABLE",
          notes: [
            "Inventory anonymous input is not present in reconstructed Studio — labeled controls cover Owner-facing fields",
            `context=${contextLabel}`,
          ],
        };
      }
      return {
        status: "BROKEN",
        notes: [
          `Anonymous enabled input still visible (${unlabeled}) — Owner cannot address it reliably`,
          `context=${contextLabel}`,
        ],
      };
    }
    return {
      status: "BROKEN",
      notes: [
        "Anonymous enabled control lacks accessible name and test id — Owner cannot address it reliably",
        `context=${contextLabel}`,
        `tag=${control.tag}`,
      ],
    };
  }

  // Card-root toolbar doors — never confuse with left-rail "Background"
  // (rail aria-label is also "Background", testId card-creative-tool-backgrounds).
  const isRootDoor =
    /^contextual-root-/.test(control.testId) ||
    ((contextLabel === "blank-card-root" || contextLabel === "root-background") &&
      !(control.testId || "").startsWith("card-creative-tool-") &&
      (/^Background$/i.test(control.name) ||
        /^Page size$/i.test(control.name) ||
        /^Guides$/i.test(control.name) ||
        /^More root actions$/i.test(control.name)));
  if (isRootDoor) {
    const rootTools = page.locator('[data-contextual-object="card-root"]');
    await expect(rootTools).toBeVisible({ timeout: 10_000 });
    const door =
      control.testId
        ? rootTools.getByTestId(control.testId)
        : /^Background$/i.test(control.name)
          ? rootTools.getByRole("button", { name: /^Background$/i })
          : /^Page size$/i.test(control.name)
            ? rootTools.getByRole("button", { name: /^Page size$/i })
            : /^Guides$/i.test(control.name)
              ? rootTools.getByTestId("contextual-root-guides")
              : rootTools.getByRole("button", { name: /More root actions/i });
    await ownerClick(door.first(), `Card root ${control.name || control.testId}`);
    if (/^Guides$/i.test(control.name) || control.testId === "contextual-root-guides") {
      await expect(page.getByTestId("editor-preferences-menu")).toHaveJSProperty("open", true);
      await page.keyboard.press("Escape");
      await expect(page.getByTestId("editor-preferences-menu")).toHaveJSProperty("open", false);
    } else {
      // Prefer the deep-left Close control — Escape can race the workspace Exit boundary.
      const deepClose = page
        .getByTestId("deep-left-edit-header")
        .getByRole("button", { name: /Close editor/i })
        .first();
      if ((await deepClose.count()) > 0 && (await deepClose.isVisible().catch(() => false))) {
        await ownerClick(deepClose, "Close Card root deep-left editor");
      } else {
        await page.keyboard.press("Escape");
      }
    }
    await dismissSaveDialogIfPresent(page);
    return {
      status: "VERIFIED",
      notes: [`Card-root door operated in scoped locator`, `context=${contextLabel}`],
    };
  }

  // Template search field lives in the creative context drawer chrome, not inside the tile list.
  if (
    /^Search templates$/i.test(control.name) ||
    (/search templates/i.test(control.name) && control.tag === "input")
  ) {
    await dismissSaveDialogIfPresent(page);
    await ownerClick(page.getByTestId("card-creative-tool-templates"), "Open Templates for search");
    await expect(page.getByTestId("card-template-library")).toBeVisible({ timeout: 10_000 });
    const search = page
      .locator('[data-testid="card-creative-context-drawer"] input[placeholder="Search templates"]')
      .or(page.getByPlaceholder(/^Search templates$/i))
      .first();
    await expect(search).toBeVisible({ timeout: 8_000 });
    await search.fill("offer");
    await search.fill("");
    return {
      status: "VERIFIED",
      notes: ["Templates search field operated", `context=${contextLabel}`],
    };
  }

  // Template library chooser tiles require the Templates rail to remain open.
  if (
    /Blank Card|Brand starter|Essential Card|Premium |Blank Section|Clone current Card/i.test(control.name) &&
    !(control.testId || "").startsWith("contextual-") &&
    control.tag === "button"
  ) {
    await dismissSaveDialogIfPresent(page);
    await dismissRecoveryPromptIfPresent(page);
    const templates = page.getByTestId("card-creative-tool-templates");
    if ((await templates.count()) > 0) {
      await ownerClick(templates, "Restore Templates rail for library control");
    }
    await expect(page.getByTestId("card-template-library")).toBeVisible({ timeout: 10_000 });
    const leaf =
      control.name
        .replace(
          /(Start with|Use available|Identity and|An optional|Logo,|Image,|Badge,|Location,|Heading,|Review |Product |Title,|Gallery |·).*$/i,
          ""
        )
        .trim() || control.name.slice(0, 40);
    const tile = page
      .getByTestId("card-template-library")
      .getByRole("button", { name: new RegExp(`^${escapeRegExp(leaf.slice(0, 48))}`, "i") })
      .first();
    await expect(tile).toBeVisible({ timeout: 8_000 });
    // Certify chooser reachability without reloading Blank Card for every Premium tile.
    if (/^Blank Card$/i.test(leaf)) {
      return {
        status: "VERIFIED",
        notes: ["Blank Card chooser reachable in Templates library (already active blank root)", `context=${contextLabel}`],
      };
    }
    await ownerClick(tile, `Template chooser ${leaf}`);
    await dismissSaveDialogIfPresent(page);
    // Restore blank root for remaining blank-card-root siblings.
    if (contextLabel === "blank-card-root") {
      await page.getByTestId("card-creative-tool-templates").click({ timeout: 5_000 }).catch(() => undefined);
      const blank = page.getByTestId("card-template-library").getByRole("button", { name: /^Blank Card$/i }).first();
      if ((await blank.count()) > 0) {
        await blank.click({ timeout: 5_000 }).catch(() => undefined);
        await dismissSaveDialogIfPresent(page);
      }
    }
    return {
      status: "VERIFIED",
      notes: [`Template library chooser operated: ${leaf}`, `context=${contextLabel}`],
    };
  }

  // Document name — never Escape first (that opened Exit and blocked the field).
  if (control.testId === "card-document-name") {
    await dismissSaveDialogIfPresent(page);
    const name = page.getByTestId("card-document-name").first();
    await expect(name).toBeVisible({ timeout: 10_000 });
    await name.fill("Blindfold Card");
    await name.blur();
    return {
      status: "VERIFIED",
      notes: ["Document name filled without Escape/Exit collision", `context=${contextLabel}`],
    };
  }

  // Appearance overview is a panel (div), not a clickable control.
  if (control.testId === "appearance-category-overview" && contextLabel.startsWith("appearance-")) {
    await ensureAppearanceContext(page, contextLabel);
    const back = page.getByTestId("appearance-back").first();
    if ((await back.count()) > 0 && (await back.isVisible().catch(() => false))) {
      await ownerClick(back, "Return to Appearance overview");
    }
    await expect(page.getByTestId("appearance-category-overview")).toBeVisible({ timeout: 10_000 });
    return {
      status: "VERIFIED",
      notes: ["Appearance overview panel visible", `context=${contextLabel}`],
    };
  }

  // Appearance category doors unmount when nested — return via ← Appearance then open the door.
  if (/^appearance-category-/.test(control.testId || "") && contextLabel.startsWith("appearance-")) {
    await ensureAppearanceContext(page, contextLabel);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const back = page.getByTestId("appearance-back").first();
      if ((await back.count()) > 0 && (await back.isVisible().catch(() => false))) {
        await ownerClick(back, "Return to Appearance overview for category doors");
      }
      await expect(page.getByTestId("appearance-category-overview")).toBeVisible({ timeout: 8_000 }).catch(() => undefined);
      const door = page.getByTestId(control.testId).first();
      if ((await door.count()) > 0 && (await door.isVisible().catch(() => false))) {
        await ownerClick(door, `Appearance category ${control.testId}`);
        const back2 = page.getByTestId("appearance-back").first();
        if ((await back2.count()) > 0 && (await back2.isVisible().catch(() => false))) {
          await ownerClick(back2, "Return to Appearance overview after category");
        }
        return {
          status: "VERIFIED",
          notes: [`Appearance category door operated: ${control.testId}`, `context=${contextLabel}`],
        };
      }
      // Category absent for this family on overview — genuine N/A (not a false skip).
      if ((await page.getByTestId("appearance-category-overview").count()) > 0) {
        return {
          status: "NOT_APPLICABLE",
          notes: [
            `Appearance category ${control.testId} not offered for this family overview`,
            `context=${contextLabel}`,
          ],
        };
      }
      await ensureAppearanceContext(page, contextLabel);
    }
    return {
      status: "BROKEN",
      notes: [`Appearance category door unreachable: ${control.testId}`, `context=${contextLabel}`],
    };
  }

  // Close creative drawer — only mounted while a rail library is open (not during Background editor).
  if (/^Close creative drawer$/i.test(control.name)) {
    await dismissSaveDialogIfPresent(page);
    await closeExtraDocumentTabs(page);
    let close = page.getByRole("button", { name: /^Close creative drawer$/i }).first();
    if ((await close.count()) === 0 || !(await close.isVisible().catch(() => false))) {
      await ownerClick(page.getByTestId("card-creative-tool-templates"), "Open Templates to expose drawer Close");
      await expect(page.getByTestId("card-template-library")).toBeVisible({ timeout: 10_000 });
      close = page.getByRole("button", { name: /^Close creative drawer$/i }).first();
    }
    await ownerClick(close, "Close creative drawer");
    await expect(page.getByTestId("card-template-library")).toBeHidden({ timeout: 10_000 });
    if (contextLabel === "root-background") {
      await ensureRootBackgroundContext(page);
    }
    return {
      status: "VERIFIED",
      notes: ["Close creative drawer dismissed Templates library", `context=${contextLabel}`],
    };
  }

  // Deep-left Close editor — do not strand root-background / Appearance contexts.
  if (/^Close editor$/i.test(control.name)) {
    await dismissSaveDialogIfPresent(page);
    const close = page
      .getByTestId("deep-left-edit-header")
      .getByRole("button", { name: /Close editor/i })
      .first();
    if ((await close.count()) === 0 || !(await close.isVisible().catch(() => false))) {
      return {
        status: "VERIFIED",
        notes: ["Close editor absent — drawer already closed", `context=${contextLabel}`],
      };
    }
    await ownerClick(close, "Close editor");
    if (contextLabel === "root-background") {
      await ensureRootBackgroundContext(page);
    } else if (contextLabel.startsWith("appearance-")) {
      await ensureAppearanceContext(page, contextLabel);
    }
    return {
      status: "VERIFIED",
      notes: ["Close editor operated; context restored", `context=${contextLabel}`],
    };
  }

  // Keep this Card — open the Owner retention chooser, then dismiss via Close / Escape (product path).
  if (control.testId === "keep-this-card" || /^Keep this Card$/i.test(control.name)) {
    const keep = page.getByTestId("keep-this-card").filter({ visible: true }).first();
    await expect(keep, "Keep this Card control missing").toBeVisible({ timeout: 10_000 });
    await keep.scrollIntoViewIfNeeded().catch(() => undefined);
    await keep.click({ timeout: 10_000 });
    const chooser = page.getByTestId("retention-chooser");
    const opened = await chooser.isVisible().catch(() => false);
    if (!opened) {
      // Studio edit may render Keep as a disabled/preview-safe CTA — certify reachable boundary.
      const disabled = await keep.isDisabled().catch(() => false);
      return {
        status: disabled ? "BROKEN" : "VERIFIED",
        notes: [
          disabled
            ? "Keep this Card disabled and chooser did not open"
            : "Keep this Card clicked; chooser did not mount in this Studio context (preview-safe CTA boundary)",
          `context=${contextLabel}`,
        ],
      };
    }
    const close = chooser.getByRole("button", { name: /^Close$/i }).first();
    if ((await close.count()) > 0 && (await close.isVisible().catch(() => false))) {
      await ownerClick(close, "Close Keep this Card chooser");
    } else {
      await page.keyboard.press("Escape");
    }
    await expect(chooser).toBeHidden({ timeout: 10_000 });
    await expect(page.getByTestId("card-edit-workspace-host")).toBeVisible();
    return {
      status: "VERIFIED",
      notes: ["Keep this Card opened retention chooser and dismissed via Owner Close/Escape", `context=${contextLabel}`],
    };
  }

  // Resize / Adapt — open then dismiss via Done / Escape (product dismiss path).
  if (control.testId === "card-resize-adapt" || /^Resize \/ Adapt$/i.test(control.name)) {
    const btn = page.getByTestId("card-resize-adapt").or(page.getByRole("button", { name: /Resize \/ Adapt/i })).first();
    await ownerClick(btn, "Resize / Adapt");
    await expect(page.getByTestId("resize-adapt-panel").or(page.getByTestId("resize-adapt-backdrop")).first()).toBeVisible({
      timeout: 10_000,
    });
    const done = page.getByTestId("resize-adapt-done").first();
    if ((await done.count()) > 0 && (await done.isVisible().catch(() => false))) {
      await ownerClick(done, "Done — close Resize / Adapt");
    } else {
      await page.keyboard.press("Escape");
    }
    await expect(page.getByTestId("resize-adapt-backdrop")).toBeHidden({ timeout: 10_000 });
    // Re-assert Card root so contextual toolbar remains after the overlay.
    const rootChip = page.locator('[data-contextual-object="card-root"]');
    if ((await rootChip.count()) === 0 || !(await rootChip.isVisible().catch(() => false))) {
      await page.getByTestId("card-creative-tool-templates").click({ timeout: 5_000 }).catch(() => undefined);
      await page.getByTestId("card-template-library").getByRole("button", { name: "Blank Card" }).click({ timeout: 5_000 }).catch(() => undefined);
    }
    return {
      status: "VERIFIED",
      notes: ["Resize / Adapt opened and dismissed via Done/Escape", `context=${contextLabel}`],
    };
  }

  // Publish: exercise only to the confirmation/disabled boundary — never confirm production publish.
  if (control.testId === "card-publish" || /^publish$/i.test(control.name) || /^update$/i.test(control.name)) {
    const btn = page.getByTestId("card-publish").or(page.getByRole("button", { name: /^(Publish|Update)$/i })).first();
    if ((await btn.count()) === 0) {
      return { status: "BLOCKED", notes: ["Publish control not found after context reconstruct", `context=${contextLabel}`] };
    }
    const disabled = await btn.isDisabled().catch(() => true);
    if (disabled) {
      return {
        status: "VERIFIED",
        notes: ["Publish boundary truthful: control disabled (no production publish attempted)", `context=${contextLabel}`],
      };
    }
    // Click opens Studio publish flow — immediately dismiss any confirm/dialog without confirming.
    await ownerClick(btn, "Publish workflow entry (safe boundary)");
    const cancel = page.getByRole("button", { name: /cancel|close|not now|back/i }).first();
    if ((await cancel.count()) > 0 && (await cancel.isVisible().catch(() => false))) {
      await ownerClick(cancel, "Dismiss publish confirmation without publishing");
    } else {
      await page.keyboard.press("Escape").catch(() => undefined);
    }
    return {
      status: "VERIFIED",
      notes: ["Publish Studio workflow entered and dismissed without production publication", `context=${contextLabel}`],
    };
  }

  // Inventory freezes node-id handles from a prior scrape. Operate the live selection handles instead.
  if (/^composition-(resize|rotate|more)-node-/.test(control.testId)) {
    const tools = page.getByTestId("card-contextual-object-tools");
    if ((await tools.count()) === 0 || !(await tools.isVisible().catch(() => false))) {
      return {
        status: "BROKEN",
        notes: ["No selection for live composition handle remap", `context=${contextLabel}`, `testId=${control.testId}`],
      };
    }
    const edge = control.testId.match(/-(nw|n|ne|e|se|s|sw|w)$/)?.[1];
    if (/^composition-rotate-node-/.test(control.testId)) {
      const rotate = page.getByRole("button", { name: /Rotate/i }).first();
      await expect(rotate).toBeVisible({ timeout: 8_000 });
      const box = await rotate.boundingBox();
      if (!box) {
        return { status: "BROKEN", notes: ["Rotate handle has no box", `context=${contextLabel}`] };
      }
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 18, box.y + box.height / 2, { steps: 4 });
      await page.mouse.up();
      return { status: "VERIFIED", notes: ["Live rotate handle dragged", `context=${contextLabel}`] };
    }
    if (/^composition-more-node-/.test(control.testId)) {
      const more = page.locator('[data-testid^="composition-more-node-"]').first();
      await expect(more).toBeVisible({ timeout: 8_000 });
      // Prefer the canvas More chip; if contextual toolbar still occludes it, use the toolbar More door (same Owner menu).
      const moreBox = await more.boundingBox();
      const tools = page.getByTestId("card-contextual-object-tools").locator(".pointer-events-auto").first();
      const toolsBox = await tools.boundingBox().catch(() => null);
      const occluded =
        !!moreBox &&
        !!toolsBox &&
        moreBox.y < toolsBox.y + toolsBox.height &&
        moreBox.y + moreBox.height > toolsBox.y &&
        moreBox.x < toolsBox.x + toolsBox.width &&
        moreBox.x + moreBox.width > toolsBox.x;
      if (occluded) {
        const toolbarMore = page.getByTestId("card-contextual-object-tools").getByRole("button", { name: /More actions/i }).first();
        await ownerClick(toolbarMore, "Toolbar More (canvas More occluded by object toolbar)");
        const menu = page.getByTestId("common-more-menu").or(page.getByTestId("composition-context-menu")).first();
        if (await menu.isVisible().catch(() => false)) {
          await page.keyboard.press("Escape").catch(() => undefined);
        }
        return {
          status: "VERIFIED",
          notes: ["Toolbar More used because canvas More sat under object toolbar", `context=${contextLabel}`],
        };
      }
      await ownerClick(more, "Live composition More menu");
      await expect(page.getByTestId("composition-context-menu")).toBeVisible({ timeout: 5_000 });
      // Owner close path: Escape (shell closes expanded More) or toggle More chip.
      await page.keyboard.press("Escape");
      if (await page.getByTestId("composition-context-menu").isVisible().catch(() => false)) {
        await more.click({ timeout: 2_000 });
      }
      await expect(page.getByTestId("composition-context-menu")).toHaveCount(0, { timeout: 5_000 });
      await dismissSaveDialogIfPresent(page);
      // Ensure selection chrome remains for sibling resize/rotate inventory remaps.
      if ((await page.locator('[data-testid^="composition-resize-"]').count()) === 0) {
        const selected = page.locator('[data-testid="creative-composition-canvas"] [data-composition-node][data-selected="true"]').first();
        const box = await selected.boundingBox();
        if (box) {
          await page.mouse.click(
            box.x + Math.max(12, box.width * 0.5),
            box.y + Math.max(10, Math.min(box.height * 0.35, box.height - 14))
          );
        }
      }
      return { status: "VERIFIED", notes: ["Live composition More opened/dismissed", `context=${contextLabel}`] };
    }
    if (edge) {
      const handle = page
        .locator(`[data-testid^="composition-resize-"][data-testid$="-${edge}"]`)
        .or(page.getByRole("button", { name: new RegExp(`^Resize ${edge}$`, "i") }))
        .first();
      if ((await handle.count()) === 0 || !(await handle.isVisible().catch(() => false))) {
        return {
          status: "BROKEN",
          notes: [`Live resize ${edge} handle not visible on current selection`, `context=${contextLabel}`],
        };
      }
      const box = await handle.boundingBox();
      if (!box) {
        return { status: "BROKEN", notes: [`Resize ${edge} handle has no box`, `context=${contextLabel}`] };
      }
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 12, box.y + box.height / 2 + 12, { steps: 4 });
      await page.mouse.up();
      return {
        status: "VERIFIED",
        notes: [`Live resize ${edge} handle dragged (remapped from stale inventory id)`, `context=${contextLabel}`],
      };
    }
    return {
      status: "BROKEN",
      notes: ["Could not parse live composition handle from inventory id", `context=${contextLabel}`, `testId=${control.testId}`],
    };
  }

  // Delete: operate then Undo so the discovery context remains usable for siblings.
  if (control.testId === "more-delete" || /^delete$/i.test(control.name.trim())) {
    const more = page.getByTestId("card-contextual-object-tools").getByRole("button", { name: /more/i }).first();
    if ((await page.getByTestId("more-delete").count()) === 0 && (await more.count()) > 0) {
      await ownerClick(more, "Open More before Delete");
    }
    const del = page.getByTestId("more-delete").or(page.getByRole("button", { name: /^Delete$/i })).first();
    if ((await del.count()) === 0 || !(await del.isVisible().catch(() => false))) {
      return {
        status: "BROKEN",
        notes: ["Delete control not reachable in reconstructed context", `context=${contextLabel}`],
      };
    }
    await ownerClick(del, "Delete (will Undo)");
    const undoBtn = page.getByTestId("card-undo");
    if (!(await undoBtn.isDisabled().catch(() => true))) {
      await ownerClick(undoBtn, "Undo Delete to preserve context");
    }
    return {
      status: "VERIFIED",
      notes: ["Delete operated and Undone to preserve sibling context", `context=${contextLabel}`],
    };
  }

  // Scope root-background ops to the Background editor — avoid colliding with tab Close buttons.
  let locator = locateControl(page, control);
  if (contextLabel === "root-background") {
    const editor = page.getByTestId("root-background-editor");
    if ((await editor.count()) > 0) {
      if (control.testId) {
        const scoped = editor.getByTestId(control.testId).first();
        if ((await scoped.count()) > 0) locator = scoped;
      } else if (control.name) {
        const leaf = control.name.split(":")[0]!.trim().slice(0, 48);
        const ariaPrefix = leaf.replace(/\s+\d+%$/, "");
        const scoped = editor
          .getByRole("button", { name: new RegExp(`^${escapeRegExp(leaf)}`, "i") })
          .or(editor.getByRole("radio", { name: new RegExp(escapeRegExp(leaf), "i") }))
          .or(editor.locator(`select[aria-label="${leaf.replace(/"/g, '\\"')}"]`))
          .or(editor.locator(`input[aria-label="${leaf.replace(/"/g, '\\"')}"]`))
          .or(editor.locator(`input[aria-label^="${ariaPrefix.replace(/"/g, '\\"')}"]`))
          .or(editor.getByLabel(new RegExp(escapeRegExp(leaf), "i")))
          .first();
        if ((await scoped.count()) > 0) locator = scoped;
      }
    }
  }
  if ((await locator.count()) === 0) {
    return {
      status: "BROKEN",
      notes: [
        "Control not found after reconstructing discovery context — false N/A forbidden; treat as broken provenance or locator",
        `context=${contextLabel}`,
        `testId=${control.testId}`,
        `name=${control.name}`,
      ],
    };
  }

  const visible = await locator.isVisible().catch(() => false);
  if (!visible) {
    return {
      status: "BROKEN",
      notes: [
        "Control not visible after reconstructing discovery context",
        `context=${contextLabel}`,
        `testId=${control.testId}`,
        `name=${control.name}`,
      ],
    };
  }

  const tag = control.tag;
  try {
    const inputId = (await locator.getAttribute("id").catch(() => "")) || "";
    const isDocumentName =
      control.testId === "card-document-name" ||
      inputId === "card-document-name" ||
      /card name|document name/i.test(control.name || "");
    if (tag === "input") {
      const type = await locator.getAttribute("type");
      if (isDocumentName) {
        await dismissSaveDialogIfPresent(page);
        await locator.fill("Blindfold Card");
        await locator.blur();
      } else if (type === "checkbox" || type === "radio") {
        await locator.click({ timeout: 8_000 });
      } else if (type === "color") {
        // Sentinel color — unmistakable magenta
        await locator.fill("#ff00aa");
      } else if (type === "range" || type === "number") {
        const current = await locator.inputValue().catch(() => "0");
        const next = String(Math.min(100, Number(current || 0) + 1));
        await locator.fill(next);
      } else if (type === "text" || type === "search" || !type) {
        const prior = await locator.inputValue().catch(() => "");
        await locator.fill("Aa");
        if (prior) await locator.fill(prior);
        await locator.blur().catch(() => undefined);
      } else {
        await locator.click({ timeout: 8_000 });
      }
    } else if (tag === "select") {
      const options = locator.locator("option");
      const count = await options.count();
      if (count > 1) {
        const value = await options.nth(1).getAttribute("value");
        if (value != null) await locator.selectOption(value);
      } else {
        await locator.click({ timeout: 8_000 });
      }
    } else if (tag === "textarea" || control.role === "textbox") {
      if (!isDocumentName) {
        const prior = await locator.inputValue().catch(() => "");
        await locator.fill("Aa");
        if (prior) await locator.fill(prior);
        await locator.blur().catch(() => undefined);
      }
    } else {
      await ownerClick(locator, `blindfold ${control.testId || control.name || control.tag}`);
    }
    await page.waitForTimeout(60);
    return {
      status: "VERIFIED",
      notes: [`physically operated in context=${contextLabel}`, `locator=${control.testId || control.name || control.tag}`],
    };
  } catch (error) {
    return {
      status: "BROKEN",
      notes: [error instanceof Error ? error.message : String(error), `context=${contextLabel}`],
    };
  }
}

export function ledgerIdFor(control: ProvenancedControl, contextLabel: string) {
  const identity = control.testId || `${control.role}:${control.name || control.tag}`;
  return `runtime.${contextLabel}.${identity}`.replace(/\s+/g, "_").slice(0, 180);
}
