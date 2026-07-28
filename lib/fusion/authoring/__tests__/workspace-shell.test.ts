/**
 * Adaptive Workspace Shell V1 — unit proofs.
 * Maturity: IMPLEMENTED BUT NOT OWNER-READY.
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  applyEscLayer,
  applyShadeAction,
  clampDrawerPct,
  createShellSnapshot,
  drawerWidthPct,
  DRAWER_SIZE_FRACTIONS,
  DRAWER_WIDTH_MIN_PCT,
  DRAWER_WIDTH_MAX_PCT,
  mapDesktopModeToMobileSheet,
  nextEscLayer,
  openToolDrawer,
  rememberToolDrawer,
  resetDrawerToRecommended,
  resolveCommandShade,
  type WorkspaceShellSnapshot,
} from "@/lib/fusion/authoring/workspace-shell";
import {
  defaultPersistedShell,
  loadWorkspaceShellState,
  saveWorkspaceShellState,
  snapshotToPersisted,
  persistedToSnapshot,
  SESSION_RESTORE_LABEL,
} from "@/lib/fusion/authoring/workspace-shell-persist";
import {
  BRAND_KIT_TOOLS,
  CARD_AUTHORING_TOOLS,
  clearWorkspaceTools,
  ensureDefaultToolRegistries,
  getWorkspaceTool,
  getWorkspaceTools,
  registerWorkspaceTools,
} from "@/lib/fusion/authoring/workspace-tools";
import {
  loadBrandWorkspaceState,
  saveBrandWorkspaceState,
  BRAND_WORKSPACE_STORAGE_KEY,
  DEFAULT_BRAND_WORKSPACE_STATE,
} from "@/lib/fusion/authoring/workspace-state";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

describe("Command Shade state machine", () => {
  it("resolves browse/review to open or peek", () => {
    const snap = createShellSnapshot("brand-kit", {
      workspaceMode: "browse",
      shadePreference: "auto",
      priorShadeDisplay: "open",
    });
    assert.equal(resolveCommandShade(snap).display, "open");
    assert.equal(resolveCommandShade(snap).reason, "browse_review");
  });

  it("auto-collapses on edit/construct", () => {
    const edit = createShellSnapshot("brand-kit", {
      workspaceMode: "edit",
      shadePreference: "auto",
    });
    assert.equal(resolveCommandShade(edit).display, "collapsed");
    assert.equal(resolveCommandShade(edit).reason, "edit_construct");
    const construct = applyShadeAction(edit, { type: "enter_construct" });
    assert.equal(resolveCommandShade(construct).display, "collapsed");
  });

  it("restores prior shade after exiting edit", () => {
    let snap = createShellSnapshot("brand-kit", {
      workspaceMode: "browse",
      shadePreference: "auto",
      priorShadeDisplay: "open",
    });
    snap = applyShadeAction(snap, { type: "enter_edit" });
    assert.equal(resolveCommandShade(snap).display, "collapsed");
    snap = applyShadeAction(snap, { type: "exit_edit_construct" });
    assert.equal(snap.workspaceMode, "browse");
    assert.equal(resolveCommandShade(snap).display, "open");
  });

  it("honors pinned open over edit auto-collapse", () => {
    const snap = createShellSnapshot("brand-kit", {
      workspaceMode: "edit",
      shadePreference: "pinned_open",
    });
    const r = resolveCommandShade(snap);
    assert.equal(r.display, "open");
    assert.equal(r.reason, "pinned");
  });

  it("honors pinned collapsed", () => {
    const snap = createShellSnapshot("brand-kit", {
      workspaceMode: "browse",
      shadePreference: "pinned_collapsed",
    });
    const r = resolveCommandShade(snap);
    assert.equal(r.display, "collapsed");
    assert.equal(r.reason, "pinned");
  });

  it("needs-attention opens shade unless pinned collapsed", () => {
    const open = createShellSnapshot("brand-kit", {
      workspaceMode: "needs_attention",
      blockingWarning: "Contrast fails",
      shadePreference: "auto",
    });
    assert.equal(resolveCommandShade(open).display, "open");
    assert.equal(resolveCommandShade(open).reason, "blocking_warning");

    const pinned = createShellSnapshot("brand-kit", {
      workspaceMode: "needs_attention",
      blockingWarning: "Contrast fails",
      shadePreference: "pinned_collapsed",
    });
    const r = resolveCommandShade(pinned);
    assert.equal(r.display, "collapsed");
    assert.equal(r.showWarningInStrip, true);
    assert.equal(r.expandAvailable, true);
  });

  it("focus mode collapses shade and closes drawer via action", () => {
    let snap = createShellSnapshot("brand-kit", {
      workspaceMode: "edit",
      drawerOpen: true,
      shadePreference: "auto",
    });
    snap = applyShadeAction(snap, { type: "enter_focus" });
    assert.equal(snap.focusMode, true);
    assert.equal(snap.drawerOpen, false);
    assert.equal(resolveCommandShade(snap).display, "collapsed");
    assert.equal(resolveCommandShade(snap).reason, "focus");
  });
});

describe("Esc priority order", () => {
  it("orders modal → expanded → focus → drawer → exit", () => {
    assert.equal(
      nextEscLayer({
        modalOpen: true,
        drawerOpen: true,
        drawerSizeMode: "expanded",
        focusMode: true,
      }),
      "modal"
    );
    assert.equal(
      nextEscLayer({
        modalOpen: false,
        drawerOpen: true,
        drawerSizeMode: "expanded",
        focusMode: true,
      }),
      "expanded_drawer"
    );
    assert.equal(
      nextEscLayer({
        modalOpen: false,
        drawerOpen: true,
        drawerSizeMode: "compact",
        focusMode: true,
      }),
      "focus"
    );
    assert.equal(
      nextEscLayer({
        modalOpen: false,
        drawerOpen: true,
        drawerSizeMode: "compact",
        focusMode: false,
      }),
      "drawer"
    );
    assert.equal(
      nextEscLayer({
        modalOpen: false,
        drawerOpen: false,
        drawerSizeMode: "compact",
        focusMode: false,
      }),
      "exit_workspace"
    );
  });

  it("applyEscLayer mutates the correct layer", () => {
    let snap = createShellSnapshot("x", {
      modalOpen: true,
      drawerOpen: true,
      drawerSizeMode: "expanded",
      focusMode: true,
    });
    snap = applyEscLayer(snap, "modal");
    assert.equal(snap.modalOpen, false);
    snap = applyEscLayer(snap, "expanded_drawer", "balanced");
    assert.equal(snap.drawerSizeMode, "balanced");
    snap = applyEscLayer(snap, "focus");
    assert.equal(snap.focusMode, false);
    snap = applyEscLayer(snap, "drawer");
    assert.equal(snap.drawerOpen, false);
  });
});

describe("Adaptive drawer sizing", () => {
  it("maps library / compact / balanced / expanded fractions", () => {
    assert.equal(drawerWidthPct("library", null), Math.round((2 / 3) * 100));
    assert.equal(drawerWidthPct("compact", null), Math.round((1 / 3) * 100));
    assert.equal(drawerWidthPct("balanced", null), 50);
    assert.equal(drawerWidthPct("expanded", null), Math.round(0.85 * 100));
    assert.equal(DRAWER_SIZE_FRACTIONS.library, 2 / 3);
  });

  it("custom resize clamps to min/max", () => {
    assert.equal(clampDrawerPct(5), DRAWER_WIDTH_MIN_PCT);
    assert.equal(clampDrawerPct(99), 92);
    assert.equal(drawerWidthPct("custom", 40), 40);
  });

  it("reset to recommended clears custom width", () => {
    const r = resetDrawerToRecommended("compact");
    assert.equal(r.drawerSizeMode, "compact");
    assert.equal(r.customDrawerWidthPct, null);
  });

  it("maps desktop modes to mobile sheet modes", () => {
    assert.equal(mapDesktopModeToMobileSheet("library"), "library");
    assert.equal(mapDesktopModeToMobileSheet("compact"), "compact");
    assert.equal(mapDesktopModeToMobileSheet("custom"), "balanced");
  });
});

describe("Drawer open/close and one-at-a-time", () => {
  it("opening a tool replaces selectedToolId (one drawer)", () => {
    let snap = createShellSnapshot("brand-kit", { workspaceMode: "browse" });
    let memory = {};
    ({ snapshot: snap, memory } = openToolDrawer(
      snap,
      "logos",
      "library",
      memory,
      { triggersConstructMode: true }
    ));
    assert.equal(snap.selectedToolId, "logos");
    assert.equal(snap.drawerOpen, true);
    assert.equal(snap.drawerSizeMode, "library");
    assert.equal(snap.workspaceMode, "edit");

    ({ snapshot: snap, memory } = openToolDrawer(
      snap,
      "colors",
      "compact",
      memory,
      { triggersConstructMode: true }
    ));
    assert.equal(snap.selectedToolId, "colors");
    assert.equal(snap.drawerSizeMode, "compact");
  });

  it("per-tool memory restores size and selection", () => {
    let memory = rememberToolDrawer({}, "logos", {
      sizeMode: "custom",
      customWidthPct: 55,
      selectedItemId: "logo-1",
      scrollTop: 120,
      searchTerm: "mark",
      filters: { kind: "primary" },
    });
    memory = rememberToolDrawer(memory, "colors", {
      sizeMode: "compact",
      selectedItemId: "primary",
    });
    const snap = createShellSnapshot("brand-kit");
    const opened = openToolDrawer(snap, "logos", "library", memory);
    assert.equal(opened.snapshot.drawerSizeMode, "custom");
    assert.equal(opened.snapshot.customDrawerWidthPct, 55);
    assert.equal(opened.snapshot.selectedObjectId, "logo-1");
    assert.equal(memory.logos.scrollTop, 120);
    assert.equal(memory.colors.selectedItemId, "primary");
  });
});

describe("Tool registry", () => {
  beforeEach(() => {
    clearWorkspaceTools();
    ensureDefaultToolRegistries();
  });

  it("registers Brand Kit, Card, and Campaign tools through the same contract", () => {
    assert.ok(getWorkspaceTools("brand-kit").length >= BRAND_KIT_TOOLS.length);
    assert.ok(getWorkspaceTools("card-authoring").length >= CARD_AUTHORING_TOOLS.length);
    assert.ok(getWorkspaceTools("campaign-authoring").length >= 10);
    assert.equal(getWorkspaceTool("brand-kit", "logos")?.recommendedDrawerMode, "library");
    assert.equal(getWorkspaceTool("brand-kit", "colors")?.recommendedDrawerMode, "compact");
    assert.equal(getWorkspaceTool("brand-kit", "history")?.recommendedDrawerMode, "expanded");
    assert.equal(getWorkspaceTool("card-authoring", "format")?.id, "format");
    assert.equal(getWorkspaceTool("card-authoring", "colors")?.id, "colors");
    assert.equal(getWorkspaceTool("card-authoring", "content")?.id, "content");
    assert.equal(getWorkspaceTool("card-authoring", "lifecycle")?.id, "lifecycle");
    assert.ok(getWorkspaceTools("card-authoring").length >= 13);
    assert.equal(getWorkspaceTool("campaign-authoring", "colors")?.recommendedDrawerMode, "compact");
    assert.equal(getWorkspaceTool("campaign-authoring", "media")?.recommendedDrawerMode, "library");
  });

  it("allows host registration without giant conditionals", () => {
    registerWorkspaceTools("insights", [
      {
        id: "funnel",
        label: "Funnel",
        recommendedDrawerMode: "balanced",
        featureReadiness: "deferred",
      },
    ]);
    assert.equal(getWorkspaceTool("insights", "funnel")?.label, "Funnel");
  });
});

describe("Detached / refresh persistence", () => {
  beforeEach(() => {
    (globalThis as { sessionStorage?: Storage }).sessionStorage = memoryStorage();
  });

  it("round-trips shell chrome state", () => {
    const snap = createShellSnapshot("brand-kit", {
      shadePreference: "pinned_open",
      drawerOpen: true,
      selectedToolId: "colors",
      drawerSizeMode: "compact",
      selectedObjectId: "primary",
      previewSurface: "card",
      previewZoom: 1.1,
      focusMode: false,
      workspaceMode: "edit",
    });
    const persisted = snapshotToPersisted(snap, {
      colors: { sizeMode: "compact", selectedItemId: "primary", scrollTop: 40 },
    });
    saveWorkspaceShellState(persisted);
    const loaded = loadWorkspaceShellState("brand-kit");
    assert.equal(loaded.shadePreference, "pinned_open");
    assert.equal(loaded.selectedToolId, "colors");
    assert.equal(loaded.toolMemory.colors?.scrollTop, 40);
    assert.equal(loaded.sessionDraftRestored, true);
    assert.ok(SESSION_RESTORE_LABEL.includes("session"));
    const restored = persistedToSnapshot(loaded);
    assert.equal(restored.drawerSizeMode, "compact");
  });

  it("extends Brand workspace state with shell chrome fields", () => {
    saveBrandWorkspaceState({
      ...DEFAULT_BRAND_WORKSPACE_STATE,
      topic: "logos",
      drawerOpen: true,
      selectedAssetId: "asset-1",
      shadePreference: "auto",
      drawerSizeMode: "library",
      toolMemory: { logos: { sizeMode: "library", selectedItemId: "asset-1", scrollTop: 10 } },
    });
    const loaded = loadBrandWorkspaceState();
    assert.equal(loaded.topic, "logos");
    assert.equal(loaded.drawerSizeMode, "library");
    assert.equal(loaded.toolMemory?.logos?.selectedItemId, "asset-1");
    assert.equal(loaded.sessionDraftRestored, true);
    assert.ok(BRAND_WORKSPACE_STORAGE_KEY.includes("brand-kit"));
  });

  it("default persisted shell is safe", () => {
    const d = defaultPersistedShell("card-authoring");
    assert.equal(d.version, 1);
    assert.equal(d.drawerOpen, false);
    assert.equal(d.shadePreference, "auto");
  });
});

describe("State priority contradictions", () => {
  it("modal temporarily peeks when pinned collapsed", () => {
    const snap = createShellSnapshot("brand-kit", {
      shadePreference: "pinned_collapsed",
      modalOpen: true,
    });
    const r = resolveCommandShade(snap);
    assert.equal(r.display, "peek");
    assert.equal(r.reason, "modal");
  });

  it("completion pulse prefers open/peek then host restores", () => {
    let snap = createShellSnapshot("brand-kit", {
      workspaceMode: "edit",
      priorShadeDisplay: "collapsed",
      shadePreference: "auto",
    });
    snap = applyShadeAction(snap, { type: "completion_pulse" });
    assert.equal(snap.priorShadeDisplay, "peek");
  });
});

describe("Width bounds prevent zero / full cover", () => {
  it("never allows accidental zero-width or 100% cover", () => {
    assert.ok(DRAWER_WIDTH_MIN_PCT >= 18);
    assert.ok(DRAWER_WIDTH_MAX_PCT <= 90);
    assert.ok(clampDrawerPct(0) >= DRAWER_WIDTH_MIN_PCT);
    assert.ok(clampDrawerPct(100) < 100);
  });
});

// Silence unused in type-only paths
void (null as unknown as WorkspaceShellSnapshot);
