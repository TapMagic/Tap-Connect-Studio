/**
 * Deterministic chaos + endurance — legal Owner actions only.
 * Failures/timeouts FAIL the seed. No catch-and-forget.
 *
 * Enable: OWNER_SIM_CHAOS=1
 */
import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  dismissSaveDialogIfPresent,
  dismissTransientStudioChrome,
  EVIDENCE_ROOT,
  insertFamily,
  openBlankStudio,
  ownerClick,
  redo,
  selectObjectViaLayers,
  undo,
} from "./owner-sim/physical-harness";

const enabled = process.env.OWNER_SIM_CHAOS === "1";
const ACTION_TIMEOUT_MS = 10_000;
const ENDURANCE_CYCLE_TIMEOUT_MS = 45_000;

type ChaosOutcome = "EXECUTED" | "SEMANTICALLY_NOT_APPLICABLE";

type ChaosStepRecord = {
  seed: number;
  step: number;
  actionId: string;
  startingContext: string;
  target: string;
  reachable: boolean;
  outcome: ChaosOutcome;
  elapsedMs: number;
  notes: string[];
};

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

async function withTimeout<T>(label: string, ms: number, fn: () => Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fn(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`timeout:${label}`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function readContext(page: Page): Promise<string> {
  const parts: string[] = [];
  const tools = page.getByTestId("card-contextual-object-tools");
  if (await tools.isVisible().catch(() => false)) {
    parts.push(
      `toolbar=${(await tools.getAttribute("data-selection-target").catch(() => "")) || "selected"}`
    );
  } else {
    parts.push("toolbar=none");
  }
  const drawer = page.getByTestId("card-creative-context-drawer");
  if (await drawer.isVisible().catch(() => false)) {
    parts.push(`drawer=${(await drawer.getAttribute("data-drawer-mode").catch(() => "")) || "open"}`);
  }
  const deep = page.getByTestId("deep-left-edit-drawer");
  if (await deep.isVisible().catch(() => false)) parts.push("deep-left=open");
  const plane = page.locator("[data-testid^='visual-plane-studio-']").first();
  if (await plane.isVisible().catch(() => false)) {
    parts.push(`plane=${(await plane.getAttribute("data-testid")) || "open"}`);
  }
  const write = page.getByTestId("magic-write-panel");
  if (await write.isVisible().catch(() => false)) parts.push("writing-assist=open");
  const prefs = page.locator('details[open] summary, [data-testid="card-canvas-assistance"]').first();
  if (await prefs.isVisible().catch(() => false)) parts.push("prefs=open");
  return parts.join("|") || "idle";
}

type LegalAction = {
  id: string;
  target: string;
  run: () => Promise<{ notes?: string[] } | void>;
};

async function discoverLegalActions(page: Page): Promise<LegalAction[]> {
  const actions: LegalAction[] = [];

  const textCount = await page.locator("[data-composition-node][data-primitive='text']").count();
  if (textCount > 0) {
    actions.push({
      id: "select-text",
      target: "composition-text",
      run: async () => {
        const text = page.locator("[data-composition-node][data-primitive='text']").first();
        await expect(text).toBeVisible({ timeout: 5_000 });
        await text.click({ position: { x: 10, y: 10 }, timeout: 5_000 });
        await expect(page.getByTestId("card-contextual-object-tools")).toBeVisible({ timeout: 5_000 });
      },
    });
  }

  const buttonCount = await page.locator("[data-composition-node][data-primitive='button']").count();
  if (buttonCount > 0) {
    actions.push({
      id: "select-button",
      target: "composition-button",
      run: async () => {
        const button = page.locator("[data-composition-node][data-primitive='button']").first();
        await expect(button).toBeVisible({ timeout: 5_000 });
        await button.click({ position: { x: 12, y: 12 }, timeout: 5_000 });
        await expect(page.getByTestId("card-contextual-object-tools")).toBeVisible({ timeout: 5_000 });
      },
    });
  }

  const tools = page.getByTestId("card-contextual-object-tools");
  const toolbarVisible = await tools.isVisible().catch(() => false);

  if (toolbarVisible) {
    const appearance = tools.getByRole("button", { name: /^Appearance$/i }).first();
    if (await appearance.isVisible().catch(() => false)) {
      actions.push({
        id: "appearance",
        target: "toolbar-appearance",
        run: async () => {
          await ownerClick(appearance, "Appearance");
          await expect(
            page
              .getByTestId("deep-left-edit-drawer")
              .or(page.getByTestId("card-creative-context-drawer"))
              .or(page.locator('[data-testid^="contextual-"][data-testid$="-drawer"]'))
              .first()
          ).toBeVisible({ timeout: 8_000 });
        },
      });
    }

    const more = tools.getByRole("button", { name: /More actions/i }).first();
    if (await more.isVisible().catch(() => false)) {
      actions.push({
        id: "duplicate",
        target: "more-duplicate",
        run: async () => {
          const menu = page.getByTestId("common-more-menu");
          if (!(await menu.isVisible().catch(() => false))) {
            await ownerClick(more, "More");
          }
          await expect(page.getByTestId("common-more-menu")).toBeVisible({ timeout: 5_000 });
          const before = await page.locator("[data-composition-node]").count();
          await ownerClick(
            page.getByTestId("common-more-menu").getByRole("button", { name: /^Duplicate$/i }),
            "Duplicate"
          );
          await expect
            .poll(async () => page.locator("[data-composition-node]").count(), { timeout: 8_000 })
            .toBeGreaterThan(before);
        },
      });
    }

    const write = tools
      .getByTestId("contextual-magic-write")
      .or(tools.getByRole("button", { name: /^Write$/i }))
      .first();
    if (await write.isVisible().catch(() => false)) {
      actions.push({
        id: "writing-assist",
        target: "toolbar-write",
        run: async () => {
          await ownerClick(write, "Write");
          await expect(
            page
              .getByTestId("magic-write-panel")
              .or(page.getByTestId("magic-write-open"))
              .or(page.getByTestId("card-creative-tool-text"))
              .first()
          ).toBeVisible({ timeout: 8_000 });
        },
      });
    }
  }

  const undoBtn = page.getByTestId("card-undo");
  if ((await undoBtn.isVisible().catch(() => false)) && (await undoBtn.isEnabled().catch(() => false))) {
    actions.push({
      id: "undo",
      target: "card-undo",
      run: async () => {
        await undo(page);
      },
    });
  }

  const redoBtn = page.getByTestId("card-redo");
  if ((await redoBtn.isVisible().catch(() => false)) && (await redoBtn.isEnabled().catch(() => false))) {
    actions.push({
      id: "redo",
      target: "card-redo",
      run: async () => {
        await redo(page);
      },
    });
  }

  for (const [id, testId] of [
    ["layers", "card-creative-tool-layers"],
    ["background", "card-creative-tool-backgrounds"],
    ["tools", "card-creative-tool-tools"],
    ["text-rail", "card-creative-tool-text"],
  ] as const) {
    const rail = page.getByTestId(testId);
    if (await rail.isVisible().catch(() => false)) {
      actions.push({
        id,
        target: testId,
        run: async () => {
          await ownerClick(rail, id);
          if (id === "background") {
            await expect(page.getByTestId("visual-plane-studio-page")).toBeVisible({ timeout: 8_000 });
          } else {
            await expect(page.getByTestId("card-creative-context-drawer")).toBeVisible({ timeout: 8_000 });
            await expect(page.getByTestId("card-creative-context-drawer")).toHaveAttribute(
              "data-creative-tool",
              id === "text-rail" ? "text" : id,
              { timeout: 5_000 }
            );
          }
        },
      });
    }
  }

  const planePattern = page.getByTestId("visual-plane-kind-pattern");
  if (await planePattern.isVisible().catch(() => false)) {
    actions.push({
      id: "plane-pattern",
      target: "visual-plane-kind-pattern",
      run: async () => {
        await ownerClick(planePattern, "Pattern kind");
        await expect(planePattern).toHaveAttribute("aria-pressed", "true", { timeout: 5_000 });
        await expect(page.locator("[data-testid^='visual-plane-catalog-']").first()).toBeVisible({
          timeout: 5_000,
        });
      },
    });
  }

  const preview = page.getByTestId("card-preview").or(page.getByRole("button", { name: /Preview draft/i })).first();
  if (await preview.isVisible().catch(() => false)) {
    actions.push({
      id: "preview",
      target: "preview-draft",
      run: async () => {
        await ownerClick(preview, "Preview");
        await page.waitForTimeout(400);
        const back = page.getByRole("button", { name: /Back|Return|Exit preview|Edit/i }).first();
        if (await back.isVisible().catch(() => false)) {
          await ownerClick(back, "Return from Preview");
        } else {
          await page.keyboard.press("Escape");
        }
        await expect(page.getByTestId("creative-composition-canvas")).toBeVisible({ timeout: 10_000 });
      },
    });
  }

  // Escape is always a legal Owner keyboard action when Studio is interactive.
  actions.push({
    id: "escape",
    target: "keyboard-escape",
    run: async () => {
      await page.keyboard.press("Escape");
      await dismissTransientStudioChrome(page);
      await expect(page.getByTestId("creative-composition-canvas")).toBeVisible({ timeout: 5_000 });
    },
  });

  return actions;
}

async function assertChaosInvariants(page: Page, seed: number, step: number, path: string[]) {
  await expect(page.getByTestId("card-edit-workspace-host"), `seed=${seed} step=${step} builder-ready`).toHaveAttribute(
    "data-builder-ready",
    "true"
  );
  await expect(page.getByTestId("creative-composition-canvas"), `seed=${seed} step=${step} canvas`).toBeVisible();

  const exitDialog = page.getByTestId("card-exit-save-dialog");
  if (await exitDialog.isVisible().catch(() => false)) {
    throw new Error(`Unexpected Exit dialog open seed=${seed} step=${step} path=${path.join(">")}`);
  }

  // No full-screen opaque interceptor covering the canvas center.
  const blocked = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="creative-composition-canvas"]') as HTMLElement | null;
    if (!canvas) return "missing-canvas";
    const rect = canvas.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const top = document.elementFromPoint(x, y) as HTMLElement | null;
    if (!top) return "no-top-element";
    if (top.closest('[data-testid="creative-composition-canvas"]')) return null;
    if (top.closest('[data-testid="card-contextual-object-tools"]')) return null;
    if (top.closest('[data-testid="card-creative-context-drawer"], [data-testid="deep-left-edit-drawer"]')) {
      return null;
    }
    if (top.closest('[data-testid="card-view-toolbar"], [data-testid="card-edit-topbar"]')) return null;
    const tag = top.tagName.toLowerCase();
    const testId = top.getAttribute("data-testid") || "";
    const label = (top.getAttribute("aria-label") || top.textContent || "").slice(0, 40);
    return `interceptor:${tag}:${testId}:${label}`;
  });
  if (blocked && blocked.startsWith("interceptor:")) {
    // Allow known chrome that may cover center on small viewports only if interactive Studio chrome.
    if (!/card-creative|composition-|preview|toolbar|drawer/i.test(blocked)) {
      throw new Error(`Stale overlay intercepts canvas seed=${seed} step=${step}: ${blocked}`);
    }
  }
}

function writeChaosLedger(seed: number, records: ChaosStepRecord[]) {
  const dir = path.join(EVIDENCE_ROOT, "_reports");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `chaos-ledger-seed-${seed}.json`);
  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        seed,
        generatedAt: new Date().toISOString(),
        executed: records.filter((r) => r.outcome === "EXECUTED").length,
        steps: records,
      },
      null,
      2
    )
  );
  return file;
}

test.describe("chaos + endurance", () => {
  test.skip(!enabled, "Set OWNER_SIM_CHAOS=1");
  test.setTimeout(420_000);

  for (const seed of [7, 42, 99]) {
    test(`deterministic chaos seed=${seed}`, async ({ page }) => {
      const pageErrors: string[] = [];
      const failedRequests: string[] = [];
      page.on("pageerror", (err) => pageErrors.push(String(err)));
      page.on("requestfailed", (req) => {
        const url = req.url();
        if (/\/api\//.test(url) && !/favicon|hot-update/.test(url)) {
          failedRequests.push(`${req.failure()?.errorText || "failed"} ${url}`);
        }
      });

      await openBlankStudio(page);
      await insertFamily(page, "text");
      await insertFamily(page, "button");
      const rand = mulberry32(seed);
      const pathIds: string[] = [];
      const ledger: ChaosStepRecord[] = [];

      for (let step = 0; step < 14; step += 1) {
        const legal = await discoverLegalActions(page);
        expect(legal.length, `seed=${seed} step=${step} no legal actions`).toBeGreaterThan(0);
        const chosen = legal[Math.floor(rand() * legal.length)]!;
        pathIds.push(chosen.id);
        const startingContext = await readContext(page);
        const started = Date.now();
        try {
          await withTimeout(chosen.id, ACTION_TIMEOUT_MS, async () => {
            await chosen.run();
          });
          ledger.push({
            seed,
            step,
            actionId: chosen.id,
            startingContext,
            target: chosen.target,
            reachable: true,
            outcome: "EXECUTED",
            elapsedMs: Date.now() - started,
            notes: [],
          });
        } catch (error) {
          ledger.push({
            seed,
            step,
            actionId: chosen.id,
            startingContext,
            target: chosen.target,
            reachable: true,
            outcome: "EXECUTED",
            elapsedMs: Date.now() - started,
            notes: [error instanceof Error ? error.message : String(error)],
          });
          writeChaosLedger(seed, ledger);
          await page.screenshot({
            path: path.join(EVIDENCE_ROOT, "_reports", `chaos-fail-seed-${seed}-step-${step}.png`),
            fullPage: false,
          }).catch(() => undefined);
          throw new Error(
            `Chaos seed=${seed} FAILED step=${step} action=${chosen.id} path=${pathIds.join(">")}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }

        await assertChaosInvariants(page, seed, step, pathIds);
      }

      writeChaosLedger(seed, ledger);
      const blocking = pageErrors.filter(
        (e) => !/Download the React DevTools|Clerk|favicon|ResizeObserver|hydration/i.test(e)
      );
      expect(blocking, `page errors seed=${seed}`).toEqual([]);
      expect(
        failedRequests.filter((r) => !/magic-write|openai/i.test(r)),
        `failed internal requests seed=${seed}: ${failedRequests.join(" | ")}`
      ).toEqual([]);
      expect(ledger.every((r) => r.outcome === "EXECUTED")).toBe(true);
      expect(ledger.length).toBe(14);
    });
  }

  test("endurance repeated legal cycles", async ({ page }) => {
    test.setTimeout(180_000);
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(String(err)));
    await openBlankStudio(page);
    await insertFamily(page, "text");
    await insertFamily(page, "button");
    await expect(page.locator('[data-composition-node][data-primitive="text"]').first()).toBeVisible({
      timeout: 10_000,
    });

    async function dismissOwnedOverlay(label: string) {
      await dismissSaveDialogIfPresent(page);
      await dismissTransientStudioChrome(page);
      // Prefer explicit close controls — blind Escape opens Exit Edit Mode.
      const panelClose = page.getByTestId("panel-stack-close").first();
      if (await panelClose.isVisible().catch(() => false)) {
        await ownerClick(panelClose, `Close panel (${label})`);
      }
      const moreMenu = page.getByTestId("common-more-menu");
      if (await moreMenu.isVisible().catch(() => false)) {
        await ownerClick(
          page.getByTestId("card-contextual-object-tools").getByRole("button", { name: /More actions/i }),
          `Toggle More closed (${label})`
        );
      }
      const writeOpen = page.getByTestId("magic-write-open");
      if (
        (await page.getByTestId("magic-write-panel").isVisible().catch(() => false)) &&
        (await writeOpen.isVisible().catch(() => false))
      ) {
        await ownerClick(writeOpen, `Collapse Writing Assist (${label})`);
      }
      await dismissSaveDialogIfPresent(page);
      if (await page.getByTestId("card-exit-save-dialog").isVisible().catch(() => false)) {
        throw new Error(`Unexpected Exit dialog after ${label}`);
      }
    }

    async function ensureTextSelected() {
      await dismissOwnedOverlay("ensure-text-pre");
      const tools = page.getByTestId("card-contextual-object-tools");
      const target = (await tools.getAttribute("data-selection-target").catch(() => "")) || "";
      if (/text/i.test(target) && (await tools.isVisible().catch(() => false))) {
        await expect(tools.getByRole("button", { name: /More actions/i })).toBeVisible({ timeout: 5_000 });
        return;
      }
      const textNode = page.locator('[data-composition-node][data-primitive="text"]').first();
      if ((await textNode.count()) > 0) {
        await textNode.click({ position: { x: 12, y: 12 }, force: true, timeout: 10_000 });
      } else if (await page.getByTestId("card-layers-drawer").isVisible().catch(() => false)) {
        const select = page
          .getByTestId("card-layers-drawer")
          .locator('[data-testid^="layer-object-"][data-layer-primitive="text"] [data-testid^="layer-object-select-"]')
          .first();
        await expect(select, "Layers text row missing").toBeVisible({ timeout: 8_000 });
        await ownerClick(select, "Layers select text");
      } else {
        await selectObjectViaLayers(page, { primitive: "text" }, "text for endurance");
      }
      await expect(tools).toBeVisible({ timeout: 8_000 });
      await expect(tools).toHaveAttribute("data-selection-target", /text/i, { timeout: 8_000 });
      await expect(tools.getByRole("button", { name: /More actions/i })).toBeVisible({ timeout: 5_000 });
    }

    // No Promise.race — Playwright timeouts fail the action; blind Escape is forbidden.
    const cycles = 3;
    for (let cycle = 0; cycle < cycles; cycle += 1) {
      await ownerClick(page.getByTestId("card-creative-tool-backgrounds"), `Background c${cycle}`);
      await expect(page.getByTestId("visual-plane-studio-page")).toBeVisible({ timeout: 8_000 });
      await ownerClick(page.getByTestId("visual-plane-kind-pattern"), `Pattern c${cycle}`);
      await expect(page.getByTestId("visual-plane-catalog-page")).toBeVisible({ timeout: 8_000 });

      await ownerClick(page.getByTestId("card-creative-tool-layers"), `Layers c${cycle}`);
      await expect(page.getByTestId("card-layers-drawer")).toBeVisible({ timeout: 8_000 });

      await ensureTextSelected();
      await ownerClick(
        page.getByTestId("card-contextual-object-tools").getByRole("button", { name: /^Appearance$/i }),
        `Appearance c${cycle}`
      );
      await expect(page.getByTestId("deep-left-edit-drawer")).toBeVisible({ timeout: 8_000 });
      await dismissOwnedOverlay(`appearance-${cycle}`);

      await ensureTextSelected();
      await ownerClick(
        page.getByTestId("card-contextual-object-tools").getByRole("button", { name: /More actions/i }),
        `More c${cycle}`
      );
      await expect(page.getByTestId("common-more-menu")).toBeVisible({ timeout: 5_000 });
      await dismissOwnedOverlay(`more-${cycle}`);

      await ensureTextSelected();
      await ownerClick(page.getByTestId("contextual-font"), `Font c${cycle}`);
      await expect(page.getByTestId("recent-fonts-menu").or(page.getByTestId("current-font")).first()).toBeVisible({
        timeout: 8_000,
      });
      // Leave font panel by selecting Appearance then dismissing — avoids Escape→Exit.
      await ownerClick(
        page.getByTestId("card-contextual-object-tools").getByRole("button", { name: /^Appearance$/i }),
        `Appearance after font c${cycle}`
      );
      await expect(page.getByTestId("deep-left-edit-drawer")).toBeVisible({ timeout: 8_000 });
      await dismissOwnedOverlay(`font-${cycle}`);

      await ensureTextSelected();
      await ownerClick(page.getByTestId("contextual-magic-write"), `Write c${cycle}`);
      await expect(page.getByTestId("magic-write-open")).toBeVisible({ timeout: 8_000 });
      if (!(await page.getByTestId("magic-write-panel").isVisible().catch(() => false))) {
        await ownerClick(page.getByTestId("magic-write-open"), `Writing Assist c${cycle}`);
      }
      await expect(page.getByTestId("magic-write-panel")).toBeVisible({ timeout: 8_000 });
      // Collapse panel via the same toggle (no Escape).
      await ownerClick(page.getByTestId("magic-write-open"), `Collapse Writing Assist c${cycle}`);
      await dismissSaveDialogIfPresent(page);

      await assertChaosInvariants(page, 0, cycle, [`endurance-${cycle}`]);
    }

    // One controlled Duplicate → Undo → Redo → Undo at the end.
    await ensureTextSelected();
    await ownerClick(
      page.getByTestId("card-contextual-object-tools").getByRole("button", { name: /More actions/i }),
      "More before Duplicate"
    );
    await ownerClick(page.getByTestId("more-duplicate"), "Duplicate text");
    await dismissOwnedOverlay("duplicate-final");
    await undo(page);
    await redo(page);
    await undo(page);
    await expect(page.locator('[data-composition-node][data-primitive="text"]')).toHaveCount(1, {
      timeout: 8_000,
    });

    const blocking = pageErrors.filter((e) => !/Download the React DevTools|Clerk|favicon/i.test(e));
    expect(blocking).toEqual([]);
  });
});
