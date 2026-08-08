/**
 * Runtime-derived Creative Studio interactive control inventory.
 *
 * Combines registry expectations with live DOM discovery so a forgotten
 * registry entry or an unregistered visible control cannot escape certification.
 */

import type { Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { EVIDENCE_ROOT } from "./physical-harness";

export type RuntimeControl = {
  key: string;
  kind: string;
  testId: string;
  role: string;
  name: string;
  tag: string;
  ariaDisabled: boolean;
  disabled: boolean;
  visible: boolean;
  enabled: boolean;
  rect: { x: number; y: number; width: number; height: number };
  inToolbar: boolean;
  inRail: boolean;
  inDrawer: boolean;
  inCanvasChrome: boolean;
};

export type RuntimeInventorySnapshot = {
  capturedAt: string;
  contextLabel: string;
  totalDiscovered: number;
  enabledVisible: number;
  disabledOrHidden: number;
  controls: RuntimeControl[];
};

const INTERACTIVE_SELECTOR = [
  "button",
  "a[href]",
  "input:not([type='hidden'])",
  "select",
  "textarea",
  "[role='button']",
  "[role='menuitem']",
  "[role='option']",
  "[role='tab']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='switch']",
  "[role='combobox']",
  "[role='slider']",
  "[contenteditable='true']",
  "[data-testid^='composition-resize-']",
  "[data-testid^='composition-rotate-']",
  "[data-testid^='effect-']",
  "[data-testid^='material-']",
  "[data-testid^='appearance-category-']",
  "[data-testid^='button-preset-']",
  "[data-testid^='coupon-preset-']",
  "[data-testid^='ticket-preset-']",
  "[data-testid^='starter-badge']",
  "[data-testid^='text-combination-']",
  "[data-testid^='icon-recommended-']",
  "[data-testid^='gradient-preset-']",
  "[data-testid^='border-style-']",
].join(",");

/** Read-only scrape of currently rendered interactive controls. */
export async function scrapeRuntimeControls(page: Page, contextLabel: string): Promise<RuntimeInventorySnapshot> {
  const controls = await page.evaluate((selector) => {
    const nodes = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
    const seen = new Set<string>();
    const out: Array<{
      key: string;
      kind: string;
      testId: string;
      role: string;
      name: string;
      tag: string;
      ariaDisabled: boolean;
      disabled: boolean;
      visible: boolean;
      enabled: boolean;
      rect: { x: number; y: number; width: number; height: number };
      inToolbar: boolean;
      inRail: boolean;
      inDrawer: boolean;
      inCanvasChrome: boolean;
    }> = [];
    for (const el of nodes) {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const visible =
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity || "1") > 0.01 &&
        rect.width > 0 &&
        rect.height > 0;
      const disabledAttr =
        el.hasAttribute("disabled") ||
        el.getAttribute("aria-disabled") === "true" ||
        (el as HTMLButtonElement).disabled === true;
      const testId = el.getAttribute("data-testid") || "";
      const role = el.getAttribute("role") || el.tagName.toLowerCase();
      const name = (
        el.getAttribute("aria-label") ||
        el.getAttribute("title") ||
        (el as HTMLInputElement).placeholder ||
        el.textContent ||
        ""
      )
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80);
      const key = `${testId || role}|${name}|${Math.round(rect.x)}|${Math.round(rect.y)}|${el.tagName}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const inToolbar = Boolean(el.closest('[data-testid="card-contextual-object-tools"], [data-testid="card-view-toolbar"]'));
      const inRail = Boolean(el.closest('[data-testid="card-creative-tool-rail"]'));
      const inDrawer = Boolean(
        el.closest('[data-testid="card-creative-context-drawer"], [data-testid="deep-left-edit-drawer"], [data-testid="deep-left-edit-header"]')
      );
      const inCanvasChrome = Boolean(el.closest('[data-testid="creative-composition-canvas"], [data-testid="card-preview-phone"]'));
      out.push({
        key,
        kind: testId.split("-")[0] || role,
        testId,
        role,
        name,
        tag: el.tagName.toLowerCase(),
        ariaDisabled: el.getAttribute("aria-disabled") === "true",
        disabled: disabledAttr,
        visible,
        enabled: visible && !disabledAttr,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        inToolbar,
        inRail,
        inDrawer,
        inCanvasChrome,
      });
    }
    return out;
  }, INTERACTIVE_SELECTOR);

  const snapshot: RuntimeInventorySnapshot = {
    capturedAt: new Date().toISOString(),
    contextLabel,
    totalDiscovered: controls.length,
    enabledVisible: controls.filter((c) => c.enabled).length,
    disabledOrHidden: controls.filter((c) => !c.enabled).length,
    controls,
  };
  return snapshot;
}

export function writeRuntimeInventory(snapshot: RuntimeInventorySnapshot, fileName = "runtime-inventory.json") {
  const dir = path.join(EVIDENCE_ROOT, "_manifest");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, fileName);
  fs.writeFileSync(file, JSON.stringify(snapshot, null, 2));
  return file;
}

export function mergeRuntimeInventories(snapshots: RuntimeInventorySnapshot[]) {
  const byKey = new Map<string, RuntimeControl & { contexts: string[] }>();
  for (const snap of snapshots) {
    for (const control of snap.controls) {
      const stable = `${control.testId || control.role}|${control.name}|${control.tag}`;
      const existing = byKey.get(stable);
      if (existing) {
        existing.contexts.push(snap.contextLabel);
        if (control.enabled) existing.enabled = true;
        if (control.visible) existing.visible = true;
      } else {
        byKey.set(stable, { ...control, contexts: [snap.contextLabel] });
      }
    }
  }
  return [...byKey.values()];
}
