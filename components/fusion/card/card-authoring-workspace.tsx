"use client";

/**
 * Card authoring — full Adaptive Workspace Shell consumer.
 * One Command Shade · optional Outline · live Card canvas · one Adaptive Task Drawer.
 * Maturity: IMPLEMENTATION IN PROGRESS.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Monitor, Redo2, Save, SlidersHorizontal, Smartphone, Tablet, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdaptiveWorkspaceShell,
  openAdaptiveTool,
} from "@/components/fusion/authoring/adaptive-workspace-shell";
import {
  TapCardBuilder,
  type CardBuilderShellApi,
  type CardBuilderShellStatus,
  type OpenCardCreativeDocument,
} from "@/components/card/tap-card-builder";
import { CardLiveToolDrawer } from "@/components/fusion/card/card-live-tool-drawer";
import { CardCreativeToolRail, type CardCreativeTool } from "@/components/fusion/card/card-creative-tool-rail";
import { CardContextualObjectToolbar } from "@/components/fusion/card/card-contextual-object-toolbar";
import { CardAdvancedSettingsOverlay } from "@/components/fusion/card/card-advanced-settings-overlay";
import { PreviewToolbar } from "@/components/fusion/creative-studio/preview-toolbar";
import { LiveDeviceQrPanel } from "@/components/fusion/creative-studio/live-device-qr-panel";
import {
  getCardEditorLive,
  subscribeCardEditorLive,
} from "@/components/fusion/card/card-editor-live";
import {
  PREVIEW_VIEWPORT_WIDTHS,
  type CreativeStudioMode,
  type PreviewViewport,
} from "@/lib/fusion/creative-studio/modes";
import { STUDIO_WORDING } from "@/lib/fusion/creative-studio/wording";
import {
  createShellSnapshot,
  rememberToolDrawer,
  type ToolDrawerMemory,
  type WorkspaceShellSnapshot,
} from "@/lib/fusion/authoring/workspace-shell";
import {
  loadWorkspaceShellState,
  saveWorkspaceShellState,
  snapshotToPersisted,
  SESSION_RESTORE_LABEL,
} from "@/lib/fusion/authoring/workspace-shell-persist";
import {
  ensureDefaultToolRegistries,
  getWorkspaceTool,
} from "@/lib/fusion/authoring/workspace-tools";
import { cn } from "@/lib/utils";
import type { BrandContactProfile } from "@/lib/brand/contact-profile";
import type { TapConnectCardConfig } from "@/lib/brand/tap-card";
import {
  DEFAULT_EDITOR_PREFERENCES,
  readEditorPreferences,
  writeEditorPreferences,
  type EditorPreferences,
} from "@/lib/fusion/creative-studio/editor-preferences";
import { OUTPUT_PROFILES, type OutputProfile } from "@/lib/fusion/creative-studio/output-profiles";

ensureDefaultToolRegistries();

const WORKSPACE_ID = "card-authoring";
/** Shared adaptive drawer size — every operational tool opens to the same place. */
const CARD_DRAWER_SIZE_KEY = "card-tool-drawer";
/** Default dock width when no personal resize has been saved yet. */
const CARD_DRAWER_DEFAULT_MODE = "balanced" as const;

function readLifecycleIntent(): boolean {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash.replace(/^#/, "");
  const toolParam = new URLSearchParams(window.location.search).get("tool");
  return (
    hash === "card-retire" ||
    hash === "lifecycle" ||
    toolParam === "lifecycle" ||
    toolParam === "retire"
  );
}

const MOBILE_CREATIVE_TOOLS: Array<{ id: CardCreativeTool; label: string }> = [
  { id: "build", label: "Build" },
  { id: "elements", label: "Elements" },
  { id: "buttons", label: "Buttons" },
  { id: "text", label: "Text" },
  { id: "assets", label: "Assets" },
  { id: "layers", label: "Layers" },
  { id: "ai", label: "AI Assist" },
  { id: "tools", label: "Tools" },
];

export type CardAuthoringWorkspaceProps = {
  initialConfig: TapConnectCardConfig;
  initialDraftRevision?: number;
  initialOpenDocuments?: OpenCardCreativeDocument[];
  profile: BrandContactProfile;
  businessName: string;
  logoUrl?: string | null;
  reviewUrl?: string | null;
  mediaUploadReady: boolean;
  stockReady: boolean;
  isAdmin?: boolean;
  isLandingDemo?: boolean;
  devices?: { id: string; nickname: string | null; deviceCode: string }[];
  campaigns?: {
    id: string;
    title: string;
    status: string;
    campaignType: string;
    features: string[];
    devices: { code: string; label: string }[];
    scheduledStart?: string | null;
    scheduledEnd?: string | null;
    group?: { id: string; title: string } | null;
  }[];
  campaignGroups?: {
    id: string;
    title: string;
    status: string;
    defaultCampaignTitle?: string | null;
    slotCount: number;
  }[];
  experiences?: { id: string; name: string; status: string }[];
  locations?: { id: string; name: string; address?: string | null; mapUrl?: string | null; isDefault?: boolean }[];
  freeformEnabled?: boolean;
  brandKitId?: string | null;
  brandColors?: {
    primaryColor?: string | null;
    secondaryColor?: string | null;
    accentColor?: string | null;
  } | null;
  publicCode?: string | null;
  tapPointCount?: number;
  activeSpotlightTitle?: string | null;
  doneHref?: string;
};

export function CardAuthoringWorkspace({
  publicCode,
  tapPointCount = 0,
  activeSpotlightTitle = null,
  doneHref = "/dashboard/card",
  ...builderProps
}: CardAuthoringWorkspaceProps) {
  const router = useRouter();
  const restored = useMemo(() => loadWorkspaceShellState(WORKSPACE_ID), []);
  const lifecycleIntent = useMemo(() => readLifecycleIntent(), []);
  // This initialization intentionally captures one restored session snapshot.
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const initialShell = useMemo(() => {
    const baseMemory = restored.toolMemory ?? {};
    // Canvas-first composer keeps the contextual inspector persistently available.
    const base = createShellSnapshot(WORKSPACE_ID, {
      workspaceMode: restored.focusMode ? "focus" : "browse",
      shadePreference: restored.shadePreference,
      priorShadeDisplay: restored.priorShadeDisplay || "open",
      focusMode: restored.focusMode,
      selectedToolId: null,
      drawerOpen: false,
      drawerSizeMode:
        (restored.selectedToolId &&
          restored.toolMemory?.[restored.selectedToolId]?.sizeMode) ||
        "balanced",
      customDrawerWidthPct:
        (restored.selectedToolId &&
          restored.toolMemory?.[restored.selectedToolId]?.customWidthPct) ||
        null,
      selectedObjectId: null,
      dirty: false,
      saved: true,
    });
    if (lifecycleIntent) {
      // Deep-link from assembly always wins over restored focus mode.
      const browseBase = {
        ...base,
        focusMode: false,
        workspaceMode: "browse" as const,
      };
      return openAdaptiveTool(browseBase, WORKSPACE_ID, "lifecycle", baseMemory);
    }
    return { snapshot: base, memory: baseMemory };
  }, [lifecycleIntent, restored]);
  const [toolMemory, setToolMemory] = useState<Record<string, ToolDrawerMemory>>(
    () => initialShell.memory
  );
  const [shell, setShell] = useState<WorkspaceShellSnapshot>(
    () => initialShell.snapshot
  );
  // Keep the server and first client render identical; sessionStorage is client-only.
  const [sessionRestored, setSessionRestored] = useState(false);
  const [studioMode, setStudioMode] = useState<CreativeStudioMode>("edit");
  const [previewViewport, setPreviewViewport] = useState<PreviewViewport>("desktop");
  const [liveDeviceOpen, setLiveDeviceOpen] = useState(false);
  const [previewRevision, setPreviewRevision] = useState(1);
  const [previewMotion, setPreviewMotion] = useState(false);
  const [reducedMotionSimulation, setReducedMotionSimulation] = useState(false);
  const [motionRevision, setMotionRevision] = useState(0);
  const [appearanceEntryLevel, setAppearanceEntryLevel] = useState<
    "root" | "colors" | "brand" | "layout" | "segment"
  >("root");
  const [creativeTool, setCreativeTool] = useState<CardCreativeTool>("build");
  const [creativeDrawerOpen, setCreativeDrawerOpen] = useState(true);
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(false);
  const [resizeAdaptOpen, setResizeAdaptOpen] = useState(false);
  const [editorPreferences, setEditorPreferences] = useState<EditorPreferences>(DEFAULT_EDITOR_PREFERENCES);
  const [systemDark, setSystemDark] = useState(true);
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const timer = window.setTimeout(() => {
      setEditorPreferences(readEditorPreferences(window.localStorage));
      setSystemDark(query.matches);
    }, 0);
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener("change", onChange);
    return () => {
      window.clearTimeout(timer);
      query.removeEventListener("change", onChange);
    };
  }, []);
  const resolvedEditorAppearance = editorPreferences.appearance === "system"
    ? systemDark ? "dark" : "light"
    : editorPreferences.appearance;
  const updateEditorPreferences = useCallback((patch: Partial<EditorPreferences>) => {
    setEditorPreferences((current) => {
      const next = { ...current, ...patch };
      writeEditorPreferences(window.localStorage, next);
      return next;
    });
  }, []);
  const [editSelectionMemory, setEditSelectionMemory] = useState<string | null>(
    null
  );
  const [status, setStatus] = useState<CardBuilderShellStatus>({
    dirty: false,
    saving: false,
    focusMode: false,
    canUndo: false,
    canRedo: false,
    message: null,
    lifecycleStatus: "active",
    brandSource: "Brand Kit",
    selectedId: null,
    sectionCount: 0,
    cardName: builderProps.businessName || "Card",
    pastLabels: [],
    futureLabels: [],
    canPublish: false,
    publicationLabel: "Not published",
    saveState: "saved",
    savedAt: null,
    recoveryState: "none",
    activeDocumentId: "main-card",
    openDocuments: [],
  });
  const [chromeState, setChromeState] = useState<
    "expanded" | "compact" | "collapsed" | "pinned" | "focus"
  >("compact");
  const apiRef = useRef<CardBuilderShellApi | null>(null);
  const [builderReady, setBuilderReady] = useState(false);
  const [nameDraft, setNameDraft] = useState(status.cardName);
  const lastReportedNameRef = useRef(status.cardName);
  const [tabMenuId, setTabMenuId] = useState<string | null>(null);
  const [exitState, setExitState] = useState<"closed" | "saving" | "ready" | "blocked">("closed");

  useEffect(() => {
    const timer = window.setTimeout(
      () => setSessionRestored(Boolean(restored.sessionDraftRestored)),
      0
    );
    return () => window.clearTimeout(timer);
  }, [restored.sessionDraftRestored]);

  const requestExit = useCallback(async () => {
    setExitState("saving");
    const saved = apiRef.current ? await apiRef.current.save() : false;
    setExitState(saved ? "ready" : "blocked");
  }, []);

  const confirmExit = useCallback(() => {
    setExitState("closed");
    router.push(doneHref);
  }, [doneHref, router]);

  useEffect(() => {
    const marker = { tapconnectEditGuard: true };
    window.history.pushState(marker, "", window.location.href);
    const onPopState = () => {
      window.history.pushState(marker, "", window.location.href);
      void requestExit();
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [requestExit]);

  useEffect(() => {
    saveWorkspaceShellState(
      snapshotToPersisted(shell, toolMemory, {
        sessionDraftRestored: sessionRestored,
      })
    );
  }, [shell, toolMemory, sessionRestored]);

  // Client-only deep link: SSR cannot read window URL, so open Lifecycle after mount.
  useEffect(() => {
    if (!readLifecycleIntent()) return;
    const timer = window.setTimeout(() => {
      setChromeState("expanded");
      setShell((s) => {
        if (s.selectedToolId === "lifecycle" && s.drawerOpen && !s.focusMode) {
          return s;
        }
        const { snapshot, memory } = openAdaptiveTool(
          {
            ...s,
            focusMode: false,
            workspaceMode: "browse",
          },
          WORKSPACE_ID,
          "lifecycle",
          toolMemory
        );
        setToolMemory(memory);
        return snapshot;
      });
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot URL handoff
  }, []);

  // Read live config via external store — never mirror notifies into setState
  // (that previously caused Maximum update depth with publishCardEditorLive).
  const liveModel = useSyncExternalStore(
    subscribeCardEditorLive,
    getCardEditorLive,
    getCardEditorLive
  );

  const enterPreview = useCallback(() => {
    setEditSelectionMemory(status.selectedId);
    setStudioMode("preview");
    setShell((s) => ({ ...s, drawerOpen: false, focusMode: true }));
    setChromeState("focus");
  }, [status.selectedId]);

  const exitPreview = useCallback(() => {
    setStudioMode("edit");
    setLiveDeviceOpen(false);
    setShell((s) => ({ ...s, focusMode: false }));
    setChromeState("expanded");
    if (editSelectionMemory) {
      apiRef.current?.selectSection?.(editSelectionMemory);
    }
  }, [editSelectionMemory]);

  // Keep builder focus in sync with shell Focus.
  useEffect(() => {
    apiRef.current?.setFocusMode(shell.focusMode);
  }, [shell.focusMode]);

  // Deep-link from assembly: focus the authoritative retire control once drawer is open.
  useEffect(() => {
    if (!lifecycleIntent || shell.selectedToolId !== "lifecycle") return;
    const t = window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>(
        '[data-testid="card-retire-toggle"]'
      );
      el?.focus();
      el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, 120);
    return () => window.clearTimeout(t);
  }, [lifecycleIntent, shell.selectedToolId]);

  const openCardTool = useCallback(
    (toolId: string) => {
      // Compatibility aliases → consolidated sliding hubs
      if (toolId === "colors" || toolId === "format") {
        setAppearanceEntryLevel("colors");
      } else if (toolId === "brand") {
        setAppearanceEntryLevel("brand");
      } else if (toolId === "layout") {
        setAppearanceEntryLevel("layout");
      } else if (toolId === "appearance") {
        setAppearanceEntryLevel("root");
      }
      const resolved =
        toolId === "format" ||
        toolId === "colors" ||
        toolId === "brand" ||
        toolId === "layout"
          ? "appearance"
          : toolId === "inspector"
            ? "content"
            : toolId;
      const { snapshot, memory } = openAdaptiveTool(
        shell,
        WORKSPACE_ID,
        resolved,
        toolMemory
      );
      const shared = toolMemory[CARD_DRAWER_SIZE_KEY];
      // Same dock every time: keep current width when switching tools;
      // when opening from closed, use the shared personal size (or default).
      const sizeMode = shell.drawerOpen
        ? shell.drawerSizeMode
        : shared?.sizeMode || CARD_DRAWER_DEFAULT_MODE;
      const customDrawerWidthPct = shell.drawerOpen
        ? shell.customDrawerWidthPct
        : sizeMode === "custom"
          ? shared?.customWidthPct ?? null
          : null;
      const nextMemory = rememberToolDrawer(
        rememberToolDrawer(memory, CARD_DRAWER_SIZE_KEY, {
          sizeMode,
          customWidthPct: customDrawerWidthPct,
        }),
        resolved,
        {
          sizeMode,
          customWidthPct: customDrawerWidthPct,
        }
      );
      setToolMemory(nextMemory);
      setShell({
        ...snapshot,
        drawerSizeMode: sizeMode,
        customDrawerWidthPct,
      });
    },
    [shell, toolMemory]
  );

  const closeCardTool = useCallback(() => {
    setShell((s) => ({
      ...s,
      drawerOpen: false,
      selectedToolId: null,
    }));
  }, []);

  const onShellChange = useCallback((next: WorkspaceShellSnapshot) => {
    setShell(next);
    if (next.drawerOpen) {
      setToolMemory((m) =>
        rememberToolDrawer(m, CARD_DRAWER_SIZE_KEY, {
          sizeMode: next.drawerSizeMode,
          customWidthPct: next.customDrawerWidthPct,
        })
      );
    }
  }, []);

  const onStatusChange = useCallback((next: CardBuilderShellStatus) => {
    if (next.cardName !== lastReportedNameRef.current) {
      lastReportedNameRef.current = next.cardName;
      setNameDraft(next.cardName);
    }
    setStatus((prev) => {
      if (
        prev.dirty === next.dirty &&
        prev.saving === next.saving &&
        prev.focusMode === next.focusMode &&
        prev.canUndo === next.canUndo &&
        prev.canRedo === next.canRedo &&
        prev.message === next.message &&
        prev.lifecycleStatus === next.lifecycleStatus &&
        prev.brandSource === next.brandSource &&
        prev.selectedId === next.selectedId &&
        prev.sectionCount === next.sectionCount &&
        prev.cardName === next.cardName &&
        prev.saveState === next.saveState &&
        prev.savedAt === next.savedAt &&
        prev.recoveryState === next.recoveryState &&
        prev.canPublish === next.canPublish &&
        prev.publicationLabel === next.publicationLabel &&
        prev.activeDocumentId === next.activeDocumentId &&
        JSON.stringify(prev.openDocuments) === JSON.stringify(next.openDocuments) &&
        prev.pastLabels.join("|") === next.pastLabels.join("|") &&
        prev.futureLabels.join("|") === next.futureLabels.join("|")
      ) {
        return prev;
      }
      return next;
    });
    setShell((s) => {
      if (s.dirty === next.dirty && s.saved === !next.dirty) return s;
      return { ...s, dirty: next.dirty, saved: !next.dirty };
    });
  }, []);

  const activeToolId = shell.selectedToolId;
  const recommendedDrawerMode = CARD_DRAWER_DEFAULT_MODE;

  const outline = <CardCreativeToolRail model={liveModel} activeTool={creativeTool} drawerOpen={creativeDrawerOpen} onActiveToolChange={setCreativeTool} onDrawerOpenChange={setCreativeDrawerOpen} />;

  const mobileToolRail = (
    <div
      className="flex shrink-0 gap-1 overflow-x-auto border-t border-white/10 bg-[#070b14] px-2 py-2"
      data-testid="card-mobile-tool-rail"
    >
      {MOBILE_CREATIVE_TOOLS.map((tool) => (
        <button
          key={tool.id}
          type="button"
          data-testid={`card-mobile-tool-${tool.id}`}
          onClick={() => { setCreativeTool(tool.id); setCreativeDrawerOpen(true); }}
          className={cn(
            "min-h-11 shrink-0 rounded-md px-3 text-xs",
            creativeTool === tool.id && creativeDrawerOpen
              ? "border border-white/30 bg-white/10 text-white"
              : "border border-white/10 text-white/70"
          )}
        >
          {tool.label}
        </button>
      ))}
    </div>
  );

  /** Green = forward action only: Save when dirty, Finish editing when clean. */
  const primaryAction = status.dirty ? (
    <Button
      type="button"
      className="inline-flex min-h-11 items-center bg-primary px-3 text-primary-foreground"
      data-testid="card-save"
      disabled={status.saving || studioMode === "preview"}
      onClick={() => void apiRef.current?.save()}
    >
      <Save className="mr-1 h-4 w-4" />
      {status.saving ? STUDIO_WORDING.saving : STUDIO_WORDING.save}
    </Button>
  ) : (
    <Link
      href={doneHref}
      className="inline-flex min-h-11 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"
      data-testid="card-shade-done"
    >
      {STUDIO_WORDING.finishEditing}
    </Link>
  );

  const shadeExtras = (
    <div className="flex flex-wrap items-center gap-2" data-testid="card-shade-extras">
      <span
        className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-white/70"
        data-testid="studio-save-state"
        data-saved={status.dirty ? "false" : "true"}
      >
        {status.dirty ? STUDIO_WORDING.unsaved : STUDIO_WORDING.saved}
      </span>
      {!builderProps.freeformEnabled ? (
        <span
          className="text-[10px] text-white/65"
          data-testid="freeform-honest-disabled"
          title="Freeform canvas is not enabled for this workspace"
        >
          Freeform off
        </span>
      ) : null}
      <Button
        type="button"
        variant="outline"
        className="inline-flex min-h-11 items-center"
        data-testid="card-publish"
        disabled={!status.canPublish || studioMode === "preview"}
        onClick={() => void apiRef.current?.publish()}
      >
        Publish
      </Button>
      <span className="text-[10px] text-white/70" data-testid="card-publication-state">{status.publicationLabel}</span>
      <Button
        type="button"
        variant="outline"
        className="inline-flex min-h-11 min-w-11 items-center justify-center"
        onClick={() => apiRef.current?.undo()}
        disabled={!status.canUndo || studioMode === "preview"}
        data-testid="card-undo"
        aria-label={STUDIO_WORDING.undo}
        title={`${STUDIO_WORDING.undo} (⌘Z / Ctrl+Z)`}
      >
        <Undo2 className="h-4 w-4" />
        <span className="sr-only">{STUDIO_WORDING.undo}</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        className="inline-flex min-h-11 min-w-11 items-center justify-center"
        onClick={() => apiRef.current?.redo()}
        disabled={!status.canRedo || studioMode === "preview"}
        data-testid="card-redo"
        aria-label={STUDIO_WORDING.redo}
        title={`${STUDIO_WORDING.redo} (⌘⇧Z / Ctrl+Shift+Z)`}
      >
        <Redo2 className="h-4 w-4" />
        <span className="sr-only">{STUDIO_WORDING.redo}</span>
      </Button>
      {status.dirty ? (
        <Link
          href={doneHref}
          className="inline-flex min-h-11 items-center rounded-md border border-white/20 px-2.5 text-xs text-white/85 hover:bg-white/5"
          data-testid="card-done-editing"
          onClick={(e) => {
            if (!window.confirm("Leave with unsaved Card changes?")) {
              e.preventDefault();
            }
          }}
        >
          {STUDIO_WORDING.finishEditing}
        </Link>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="inline-flex min-h-11 items-center"
          data-testid="card-save"
          disabled={status.saving}
          onClick={() => void apiRef.current?.save()}
        >
          <Save className="mr-1 h-4 w-4" />
          {STUDIO_WORDING.save}
        </Button>
      )}
      <span className="sr-only" data-testid="card-focus-mode" aria-hidden>
        Focus lives on command-shade-focus
      </span>
      <details className="relative" data-testid="card-overflow-menu">
        <summary className="grid min-h-9 min-w-9 cursor-pointer list-none place-items-center rounded-md border border-white/15 px-2 text-xs text-white/80" aria-label="More Card actions">•••</summary>
        <div className="absolute right-0 top-full z-[1300] mt-1 grid min-w-52 gap-1 rounded-lg border border-white/15 bg-[#090e18] p-2 shadow-2xl">
          <button type="button" className="min-h-9 rounded-md px-2 text-left text-xs text-white/80 hover:bg-white/5" onClick={() => openCardTool("history")}>History</button>
          <button type="button" className="min-h-9 rounded-md px-2 text-left text-xs text-white/80 hover:bg-white/5" aria-pressed={previewMotion} data-testid="card-preview-motion" onClick={() => setPreviewMotion((active) => !active)}>{previewMotion ? "Stop motion preview" : "Preview motion"}</button>
          <button type="button" className="min-h-9 rounded-md px-2 text-left text-xs text-white/80 hover:bg-white/5" data-testid="card-restart-motion" onClick={() => { setPreviewMotion(true); setMotionRevision((revision) => revision + 1); }}>Restart animation</button>
          <label className="flex min-h-9 items-center gap-2 rounded-md px-2 text-xs text-white/80 hover:bg-white/5"><input type="checkbox" checked={reducedMotionSimulation} onChange={(event) => setReducedMotionSimulation(event.target.checked)} data-testid="card-reduced-motion-simulation" />Simulate reduced motion</label>
          <Link href="/dashboard/card" className="flex min-h-9 items-center rounded-md px-2 text-xs text-white/80 hover:bg-white/5">Card overview</Link>
          <Link href="/control" className="flex min-h-9 items-center rounded-md px-2 text-xs text-white/80 hover:bg-white/5">Control Room</Link>
        </div>
      </details>
    </div>
  );

  const saveStateLabel = status.saveState === "saving"
    ? "Saving…"
    : status.saveState === "failed"
      ? "Save failed — action required"
      : status.saveState === "conflict"
        ? "Conflict detected"
        : status.saveState === "unsaved"
          ? "Unsaved changes"
          : status.savedAt
            ? `Saved at ${new Date(status.savedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
            : "Saved";

  const editTopBar = (
    <header className="shrink-0 border-b border-white/10 bg-[#070b14] text-white" data-testid="card-edit-mode-topbar">
      <div className="flex min-h-14 items-center gap-2 px-3">
        <div className="min-w-0 flex-1 sm:max-w-[320px]">
          <label className="sr-only" htmlFor="card-document-name">Card name</label>
          <input
            id="card-document-name"
            value={nameDraft}
            maxLength={120}
            disabled={!builderReady}
            onChange={(event) => setNameDraft(event.target.value)}
            onBlur={() => apiRef.current?.renameDocument(nameDraft)}
            onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
            className="h-9 w-full rounded-md border border-transparent bg-white/5 px-2 text-sm font-semibold outline-none hover:border-white/15 focus:border-[#b8ff2c]/60"
            data-testid="card-document-name"
          />
          <span className="block px-2 text-[9px] uppercase tracking-[.14em] text-white/45">Tap Card</span>
        </div>
        <span className="hidden rounded-full border border-white/10 px-2 py-1 text-[10px] text-white/65 md:inline" data-testid="studio-save-state" data-saved={status.saveState === "saved" ? "true" : "false"}>{saveStateLabel}</span>
        <button type="button" className="grid min-h-10 min-w-10 place-items-center rounded-md border border-white/10 disabled:opacity-40" onClick={() => apiRef.current?.undo()} disabled={!status.canUndo} aria-label="Undo" data-testid="card-undo"><Undo2 className="h-4 w-4" /></button>
        <button type="button" className="grid min-h-10 min-w-10 place-items-center rounded-md border border-white/10 disabled:opacity-40" onClick={() => apiRef.current?.redo()} disabled={!status.canRedo} aria-label="Redo" data-testid="card-redo"><Redo2 className="h-4 w-4" /></button>
        <button type="button" className="min-h-10 rounded-md bg-[#b8ff2c] px-3 text-xs font-semibold text-[#07100a]" onClick={enterPreview} data-testid="card-preview-as-customer">Preview draft</button>
        <button type="button" className="hidden min-h-10 items-center rounded-md border border-white/15 px-3 text-xs sm:inline-flex" onClick={() => void apiRef.current?.save()} disabled={status.saving} data-testid="card-save"><Save className="mr-1 h-4 w-4" />Save now</button>
        <button type="button" className="hidden min-h-10 items-center rounded-md border border-white/15 px-3 text-xs lg:inline-flex" onClick={() => void apiRef.current?.cloneDocument()} data-testid="card-clone"><Copy className="mr-1 h-4 w-4" />Clone</button>
        <button type="button" className="hidden min-h-10 rounded-md border border-white/15 px-3 text-xs lg:block" onClick={() => { setAdvancedSettingsOpen(false); setResizeAdaptOpen(true); }} data-testid="card-resize-adapt">Resize / Adapt</button>
        <button type="button" className="hidden min-h-10 rounded-md border border-white/15 px-3 text-xs lg:block" disabled={!status.canPublish} onClick={() => void apiRef.current?.publish()} data-testid="card-publish">{status.publicationLabel === "Not published" ? "Publish" : "Update"}</button>
        <details className="relative" data-testid="editor-preferences-menu">
          <summary className="grid min-h-10 min-w-10 cursor-pointer list-none place-items-center rounded-md border border-white/15 px-2" aria-label="Editor appearance and canvas assistance"><SlidersHorizontal className="h-4 w-4" /></summary>
          <div className="absolute right-0 top-full z-[1750] mt-1 w-72 space-y-3 rounded-xl border border-white/15 bg-[var(--studio-panel)] p-3 text-xs text-[var(--studio-text)] shadow-2xl">
            <PreferenceChoices label="Appearance" value={editorPreferences.appearance} choices={["system", "light", "dark"]} onChange={(appearance) => updateEditorPreferences({ appearance: appearance as EditorPreferences["appearance"] })} />
            <PreferenceChoices label="Pasteboard" value={editorPreferences.pasteboard} choices={["light", "dark", "neutral", "checkerboard"]} onChange={(pasteboard) => updateEditorPreferences({ pasteboard: pasteboard as EditorPreferences["pasteboard"] })} />
            <PreferenceChoices label="Density" value={editorPreferences.density} choices={["comfortable", "compact"]} onChange={(density) => updateEditorPreferences({ density: density as EditorPreferences["density"] })} />
            <div><p className="mb-1 font-semibold">Canvas assistance</p>{([ ["rulers", "Rulers"], ["grid", "Grid"], ["safeMargins", "Safe margins"], ["alignmentGuides", "Alignment guides"], ["publicationBoundary", "Publication boundary"], ["dimOutsideDocument", "Dim outside document"] ] as const).map(([key, label]) => <label key={key} className="flex min-h-8 items-center gap-2"><input type="checkbox" checked={editorPreferences[key]} onChange={(event) => updateEditorPreferences({ [key]: event.target.checked })} />{label}</label>)}</div>
            <div><p className="mb-1 font-semibold">Accessibility</p>{([ ["reducedMotion", "Reduced motion"], ["highContrast", "High contrast"], ["largerControls", "Larger controls"] ] as const).map(([key, label]) => <label key={key} className="flex min-h-8 items-center gap-2"><input type="checkbox" checked={editorPreferences[key]} onChange={(event) => updateEditorPreferences({ [key]: event.target.checked })} />{label}</label>)}</div>
          </div>
        </details>
        <button type="button" className="inline-flex min-h-10 items-center justify-center rounded-md border border-white/15 px-3 text-xs" onClick={() => void requestExit()} aria-label="Exit Edit Mode" title="Exit Edit Mode" data-testid="card-exit-edit-mode"><X className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Exit Edit Mode</span></button>
        <details className="relative hidden xl:block" data-testid="card-overflow-menu">
          <summary className="grid min-h-10 min-w-10 cursor-pointer list-none place-items-center rounded-md border border-white/15 px-2 text-xs text-white/80" aria-label="More Card actions">•••</summary>
          <div className="absolute right-0 top-full z-[1600] mt-1 grid min-w-52 gap-1 rounded-lg border border-white/15 bg-[#090e18] p-2 shadow-2xl">
            <button type="button" className="min-h-9 rounded-md px-2 text-left text-xs text-white/80 hover:bg-white/5" onClick={() => openCardTool("history")}>History</button>
            <button type="button" className="min-h-9 rounded-md px-2 text-left text-xs text-white/80 hover:bg-white/5" aria-pressed={previewMotion} data-testid="card-preview-motion" onClick={() => setPreviewMotion((active) => !active)}>{previewMotion ? "Stop motion preview" : "Preview motion"}</button>
            <button type="button" className="min-h-9 rounded-md px-2 text-left text-xs text-white/80 hover:bg-white/5" data-testid="card-restart-motion" onClick={() => { setPreviewMotion(true); setMotionRevision((revision) => revision + 1); }}>Restart animation</button>
            <label className="flex min-h-9 items-center gap-2 rounded-md px-2 text-xs text-white/80 hover:bg-white/5"><input type="checkbox" checked={reducedMotionSimulation} onChange={(event) => setReducedMotionSimulation(event.target.checked)} data-testid="card-reduced-motion-simulation" />Simulate reduced motion</label>
          </div>
        </details>
      </div>
      <div className="flex h-9 items-end gap-1 overflow-x-auto border-t border-white/5 px-3" role="toolbar" aria-label="Open creative documents" data-testid="creative-document-tabs">
        {status.openDocuments.map((document) => <div key={document.id} className="group relative flex h-8 min-w-40 items-center rounded-t-md border border-b-0 border-white/15" data-testid={`creative-document-tab-${document.id}`} onContextMenu={(event) => { event.preventDefault(); setTabMenuId(document.id); }}>
          <button type="button" aria-pressed={document.id === status.activeDocumentId} aria-label={`${document.name}, ${document.type === "MAIN_CARD" ? "Card" : "Variation"}${document.dirty ? ", unsaved" : ", saved"}`} title={document.name} className={cn("flex h-full min-w-0 flex-1 items-center gap-2 px-3 text-xs", document.id === status.activeDocumentId ? "min-w-56 bg-[#111827] text-white" : "text-white/70 hover:bg-white/5")} onClick={() => { setTabMenuId(null); void apiRef.current?.switchDocument(document.id); }}><span className={cn("truncate", document.id === status.activeDocumentId ? "max-w-52" : "max-w-36")}>{document.name}</span><span className="text-[8px] uppercase text-white/70">{document.type === "MAIN_CARD" ? "Card" : "Variation"}</span>{document.dirty ? <span className="h-1.5 w-1.5 rounded-full bg-amber-300" aria-label="Unsaved" /> : null}</button>
          {document.id !== "main-card" ? <button type="button" className="grid h-full w-8 place-items-center text-white/45 hover:text-white" onClick={() => void apiRef.current?.closeDocument(document.id)} aria-label={`Close ${document.name}`}>×</button> : null}
          {tabMenuId === document.id ? <div role="menu" className="absolute left-2 top-full z-[1600] mt-1 grid min-w-40 rounded-lg border border-white/15 bg-[#0b1019] p-1 shadow-2xl" data-testid="creative-document-tab-menu"><button role="menuitem" type="button" className="rounded px-2 py-2 text-left text-xs hover:bg-white/5" onClick={async () => { await apiRef.current?.switchDocument(document.id); setTabMenuId(null); window.setTimeout(() => window.document.getElementById("card-document-name")?.focus(), 0); }}>Rename</button><button role="menuitem" type="button" className="rounded px-2 py-2 text-left text-xs hover:bg-white/5" onClick={async () => { await apiRef.current?.switchDocument(document.id); await apiRef.current?.cloneDocument(); setTabMenuId(null); }}>Duplicate</button>{document.id !== "main-card" ? <button role="menuitem" type="button" className="rounded px-2 py-2 text-left text-xs hover:bg-white/5" onClick={() => { void apiRef.current?.closeDocument(document.id); setTabMenuId(null); }}>Close tab</button> : null}</div> : null}
        </div>)}
      </div>
    </header>
  );

  return (
    <div
      className="creative-studio-editor relative flex h-full min-h-0 flex-col overflow-hidden bg-[var(--studio-chrome)] text-[var(--studio-text)]"
      data-testid="card-edit-workspace-host"
      data-escape-authoring="true"
      data-adaptive-shell="v1"
      data-shell-consumer="card-authoring"
      data-studio-mode={studioMode}
      data-chrome-state={chromeState}
      data-drawer-open={shell.drawerOpen ? "true" : "false"}
      data-selected-tool={shell.selectedToolId ?? ""}
      data-reusable-composition-count={liveModel?.config.reusableCompositions?.length ?? 0}
      data-maturity="implementation-in-progress"
      data-editor-appearance={editorPreferences.appearance}
      data-resolved-appearance={resolvedEditorAppearance}
      data-pasteboard-theme={editorPreferences.pasteboard}
      data-editor-density={editorPreferences.density}
      data-reduced-motion={editorPreferences.reducedMotion ? "true" : "false"}
      data-high-contrast={editorPreferences.highContrast ? "true" : "false"}
      data-larger-controls={editorPreferences.largerControls ? "true" : "false"}
      style={{
        "--studio-chrome": resolvedEditorAppearance === "light" ? "#f8fafc" : "#070b14",
        "--studio-panel": resolvedEditorAppearance === "light" ? "#ffffff" : "#090e18",
        "--studio-text": resolvedEditorAppearance === "light" ? "#111827" : "#ffffff",
      } as CSSProperties}
    >
      {studioMode === "edit" ? editTopBar : null}
      {studioMode === "edit" ? <CardContextualObjectToolbar key={`${creativeTool}:${resizeAdaptOpen ? "adapt" : "canvas"}:${liveModel?.selectionRef.selectionGeneration ?? 0}`} model={liveModel} onAdvanced={() => { setResizeAdaptOpen(false); setAdvancedSettingsOpen(true); }} previewMotion={previewMotion} reducedMotionSimulation={reducedMotionSimulation} onPreviewMotion={() => setPreviewMotion((active) => !active)} onRestartMotion={() => { setPreviewMotion(true); setMotionRevision((revision) => revision + 1); }} onReducedMotionSimulation={setReducedMotionSimulation} /> : null}
      {studioMode === "edit" && advancedSettingsOpen ? <CardAdvancedSettingsOverlay model={liveModel} onClose={() => setAdvancedSettingsOpen(false)} /> : null}
      {studioMode === "edit" && resizeAdaptOpen ? <ResizeAdaptOverlay onClose={() => setResizeAdaptOpen(false)} onAdapt={async (profile) => { const ok = await apiRef.current?.adaptDocument(profile.id); if (ok) setResizeAdaptOpen(false); }} /> : null}
      {status.recoveryState !== "none" && studioMode === "edit" ? (
        <section className="absolute left-1/2 top-28 z-[1500] w-[min(92vw,32rem)] -translate-x-1/2 rounded-xl border border-amber-300/35 bg-[#111827] p-4 text-white shadow-2xl" role="alert" data-testid="card-recovery-prompt">
          <h2 className="text-sm font-semibold">{status.recoveryState === "conflict" ? "Recovered changes need review" : "Recovered changes are available"}</h2>
          <p className="mt-1 text-xs text-white/65">A browser-local checkpoint was found. A newer server draft will never be overwritten silently.</p>
          <div className="mt-3 flex flex-wrap gap-2"><button type="button" className="min-h-9 rounded bg-[#b8ff2c] px-3 text-xs font-semibold text-black" onClick={() => apiRef.current?.restoreRecovery()} disabled={status.recoveryState === "stale"}>Restore recovered version</button><button type="button" className="min-h-9 rounded border border-white/15 px-3 text-xs" onClick={() => openCardTool("content")}>Review server version</button><button type="button" className="min-h-9 rounded border border-white/15 px-3 text-xs" onClick={() => apiRef.current?.discardRecovery()}>Keep server version</button></div>
        </section>
      ) : null}
      {exitState !== "closed" ? (
        <div className="fixed inset-0 z-[1800] grid place-items-center bg-black/70 p-4" data-testid="card-exit-save-dialog">
          <section className="w-full max-w-sm rounded-xl border border-white/15 bg-[#0b1019] p-5 text-white" role="alertdialog" aria-modal="true" aria-labelledby="exit-edit-title">
            <h2 id="exit-edit-title" className="text-base font-semibold">{exitState === "saving" ? "Saving changes…" : exitState === "ready" ? "All changes saved." : "Save failed — exit blocked"}</h2>
            <p className="mt-2 text-xs text-white/65">{exitState === "saving" ? "Waiting for the server draft acknowledgement." : exitState === "ready" ? "Exit Edit Mode?" : "Your recovery journal remains available. Retry or stay in Edit Mode."}</p>
            <div className="mt-5 flex justify-end gap-2">{exitState === "ready" ? <button type="button" className="min-h-10 rounded bg-[#b8ff2c] px-4 text-xs font-semibold text-black" onClick={confirmExit} data-testid="card-exit-confirm">Exit</button> : null}{exitState === "blocked" ? <button type="button" className="min-h-10 rounded bg-[#b8ff2c] px-4 text-xs font-semibold text-black" onClick={() => void requestExit()} data-testid="card-exit-retry">Retry</button> : null}{exitState !== "saving" ? <button type="button" className="min-h-10 rounded border border-white/15 px-4 text-xs" onClick={() => setExitState("closed")}>Keep editing</button> : null}</div>
          </section>
        </div>
      ) : null}
      {sessionRestored ? (
        <p className="sr-only" role="status" data-testid="card-session-restore-notice">
          {SESSION_RESTORE_LABEL}
        </p>
      ) : null}

      {/* Compatibility marker — shade owns chrome */}
      <div className="sr-only" data-testid="card-edit-compact-toolbar" aria-hidden>
        Command Shade owns Card chrome
      </div>

      {studioMode === "preview" ? (
        <PreviewToolbar
          viewport={previewViewport}
          onViewportChange={setPreviewViewport}
          liveDeviceActive={liveDeviceOpen}
          onLiveDevice={() => setLiveDeviceOpen((v) => !v)}
          onRefresh={() => setPreviewRevision((n) => n + 1)}
          onCopyLink={() => {
            const url = publicCode
              ? `${window.location.origin}/t/${publicCode}?public=1`
              : window.location.href;
            void navigator.clipboard.writeText(url);
          }}
          onOpenTab={() => {
            if (publicCode) {
              window.open(`/t/${publicCode}?public=1`, "_blank", "noopener,noreferrer");
            }
          }}
          onExit={exitPreview}
          revision={previewRevision}
          draftStateLabel={
            status.dirty ? STUDIO_WORDING.unsaved : STUDIO_WORDING.workingDraft
          }
        />
      ) : null}

      {studioMode === "preview" && liveDeviceOpen ? (
        <div className="border-b border-white/10 bg-[#0a0e16]" data-testid="live-device-dock">
          <LiveDeviceQrPanel
            config={liveModel?.config || builderProps.initialConfig}
            profile={builderProps.profile}
            businessName={builderProps.businessName}
            cardName={status.cardName}
            brandKitId={builderProps.brandKitId}
            logoUrl={builderProps.logoUrl}
            reviewUrl={builderProps.reviewUrl}
            revision={previewRevision}
          />
        </div>
      ) : null}

      <AdaptiveWorkspaceShell
        compactHeader
        hideHeader
        identity={{
          id: WORKSPACE_ID,
          label: status.cardName || "Card",
          objectLabel: [
            studioMode === "preview"
              ? STUDIO_WORDING.draftPreview
              : status.lifecycleStatus === "retired"
                ? "Retired"
                : "Working draft",
            tapPointCount ? `${tapPointCount} Tap Points` : null,
            activeSpotlightTitle ? `Spotlight · ${activeSpotlightTitle}` : null,
            status.brandSource,
          ]
            .filter(Boolean)
            .join(" · "),
          zone: "card",
        }}
        outline={shell.focusMode || studioMode === "preview" ? undefined : outline}
        outlineClassName={cn(creativeDrawerOpen ? "!w-[min(20rem,28%)]" : "!w-[68px]", "!overflow-hidden !p-0 transition-[width] duration-150 motion-reduce:transition-none")}
        canvas={
          <div
            className={cn(
              "card-edit-pasteboard mx-auto flex h-full min-h-0 w-full justify-center overflow-auto",
              previewViewport !== "desktop" && "overflow-y-auto py-4"
            )}
            data-testid="card-canvas-viewport"
            data-pasteboard="true"
            data-preview-viewport={previewViewport}
            data-studio-mode={studioMode}
            style={
              previewViewport !== "desktop"
                ? { maxWidth: PREVIEW_VIEWPORT_WIDTHS[previewViewport], ...pasteboardStyle(editorPreferences.pasteboard) }
                : pasteboardStyle(editorPreferences.pasteboard)
            }
          >
            <div
              className={cn(
                "h-full min-h-0 w-full transition-[max-width] duration-200 ease-out motion-reduce:transition-none",
                previewViewport === "phone" &&
                  "mx-auto max-w-[390px] rounded-2xl border border-white/10 shadow-2xl",
                previewViewport === "tablet" &&
                  "mx-auto max-w-[768px] rounded-xl border border-white/10 shadow-xl"
              )}
            >
              <TapCardBuilder
                {...builderProps}
                workspaceMode
                escapeMode
                shellHosted
                interactionMode={studioMode === "preview" ? "preview" : "edit"}
                compositionForceMobile={previewViewport === "phone"}
                previewMotion={studioMode === "preview" || previewMotion}
                reducedMotionSimulation={reducedMotionSimulation}
                motionRevision={motionRevision}
                activeToolId={studioMode === "preview" ? null : activeToolId}
                shellFocusMode={shell.focusMode || studioMode === "preview"}
                doneHref={doneHref}
                publicCode={publicCode}
                tapPointCount={tapPointCount}
                activeSpotlightTitle={activeSpotlightTitle}
                onShellApi={(api) => {
                  apiRef.current = api;
                  setBuilderReady(true);
                }}
                onShellStatus={onStatusChange}
                onRequestTool={openCardTool}
              />
            </div>
          </div>
        }
        drawerContent={
          shell.drawerOpen &&
          !shell.focusMode &&
          studioMode === "edit" &&
          activeToolId ? (
            <CardLiveToolDrawer
              toolId={activeToolId}
              onCloseTool={closeCardTool}
              onRequestTool={openCardTool}
              appearanceInitialLevel={appearanceEntryLevel}
            />
          ) : undefined
        }
        drawerTitle={
          activeToolId === "history" || activeToolId === "lifecycle" || activeToolId === "appearance"
            ? getWorkspaceTool(WORKSPACE_ID, activeToolId)?.label || "Tools"
            : getWorkspaceTool(WORKSPACE_ID, activeToolId || "")?.label || "Tools"
        }
        toolMemory={toolMemory}
        onToolMemoryChange={setToolMemory}
        snapshot={shell}
        onSnapshotChange={onShellChange}
        recommendedDrawerMode={recommendedDrawerMode}
        zoneClassName="card-zone-glow"
        shadeExtras={shadeExtras}
        mobileToolRail={studioMode === "edit" ? mobileToolRail : undefined}
        desktopDrawerCloseTestId="card-drawer-collapse"
        mobileDrawerCloseTestId="card-drawer-collapse"
        mobileSheetTestId="card-mobile-sheet"
        drawerRootTestId="card-contextual-drawer"
        suppressDrawerHeader={Boolean(
          activeToolId &&
            [
              "appearance",
              "history",
            ].includes(activeToolId)
        )}
        onExitWorkspace={() => { void requestExit(); }}
        primaryAction={primaryAction}
        returnAction={
          <Link
            href={doneHref}
            className="inline-flex min-h-11 items-center rounded-md border border-white/20 px-2.5 text-xs text-white/85 hover:bg-white/5"
            data-testid="card-edit-done-link"
          >
            {STUDIO_WORDING.backToOverview}
          </Link>
        }
        openInNewTab={
          <a
            href="/dashboard/card/edit"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center rounded-md border border-white/20 px-2.5 text-xs text-white/75 hover:bg-white/5"
            data-testid="card-edit-open-full"
            title="Open this editor in a detached tab"
          >
            Detached tab ↗
          </a>
        }
        previewControls={
          <div
            className="flex flex-wrap items-center gap-2"
            data-testid="card-preview-controls"
          >
            {studioMode === "edit" ? (
              <button
                type="button"
                className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-white/85 hover:bg-white/5"
                data-testid="card-preview-as-customer"
                onClick={enterPreview}
              >
                {STUDIO_WORDING.previewAsCustomer}
              </button>
            ) : (
              <button
                type="button"
                className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-white/85 hover:bg-white/5"
                data-testid="card-exit-preview"
                onClick={exitPreview}
              >
                {STUDIO_WORDING.exitPreview}
              </button>
            )}
            <Link
              href="/dashboard/card/preview"
              className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-white/75 hover:bg-white/5"
              data-testid="card-edit-open-preview"
            >
              View-only preview
            </Link>
            {publicCode ? (
              <a
                href={`/t/${publicCode}?public=1`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-white/70 hover:bg-white/5"
                data-testid="card-edit-preview-public"
              >
                {STUDIO_WORDING.publishedCard}
              </a>
            ) : (
              <span
                className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-white/70"
                title="No Tap Point device code available"
                data-testid="card-edit-preview-public-unavailable"
              >
                Published Card unavailable
              </span>
            )}
            <div
              className="inline-flex items-center rounded-md border border-white/15 p-0.5"
              role="group"
              aria-label="Preview viewport"
              data-testid="card-viewport-toggle"
            >
              {(
                [
                  ["desktop", Monitor],
                  ["tablet", Tablet],
                  ["phone", Smartphone],
                ] as const
              ).map(([id, Icon]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={previewViewport === id}
                  aria-label={id === "phone" ? "Phone preview" : `${id[0].toUpperCase()}${id.slice(1)} preview`}
                  data-testid={`card-viewport-${id === "phone" ? "mobile" : id}`}
                  onClick={() => setPreviewViewport(id)}
                  className={cn(
                    "inline-flex min-h-9 min-w-9 items-center justify-center rounded",
                    previewViewport === id
                      ? "bg-white/12 text-white"
                      : "text-white/70 hover:text-white/80"
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </button>
              ))}
            </div>
            <button
              type="button"
              className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-white/70 hover:bg-white/5"
              data-testid="card-toggle-outline"
              onClick={() => openCardTool("outline")}
            >
              Outline
            </button>
            <button
              type="button"
              className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-white/70 hover:bg-white/5"
              data-testid="card-tool-format-trigger"
              onClick={() => openCardTool("format")}
            >
              Format
            </button>
          </div>
        }
        className="h-full"
      />
    </div>
  );
}

function PreferenceChoices({
  label,
  value,
  choices,
  onChange,
}: {
  label: string;
  value: string;
  choices: readonly string[];
  onChange: (value: string) => void;
}) {
  return <fieldset><legend className="mb-1 font-semibold">{label}</legend><div className="grid grid-cols-2 gap-1">{choices.map((choice) => <label key={choice} className="flex min-h-9 items-center gap-2 rounded-md border border-current/10 px-2 capitalize"><input type="radio" name={`editor-${label}`} value={choice} checked={value === choice} onChange={() => onChange(choice)} />{choice}</label>)}</div></fieldset>;
}

function pasteboardStyle(theme: EditorPreferences["pasteboard"]): CSSProperties {
  if (theme === "checkerboard") {
    return {
      backgroundColor: "#d1d5db",
      backgroundImage: "linear-gradient(45deg,#9ca3af 25%,transparent 25%),linear-gradient(-45deg,#9ca3af 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#9ca3af 75%),linear-gradient(-45deg,transparent 75%,#9ca3af 75%)",
      backgroundPosition: "0 0,0 10px,10px -10px,-10px 0",
      backgroundSize: "20px 20px",
    };
  }
  return { backgroundColor: theme === "light" ? "#eef2f7" : theme === "dark" ? "#090d14" : "#2b3039" };
}

function ResizeAdaptOverlay({
  onClose,
  onAdapt,
}: {
  onClose: () => void;
  onAdapt: (profile: OutputProfile) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("social-story");
  const [working, setWorking] = useState(false);
  const profiles = OUTPUT_PROFILES.filter((profile) => profile.id !== "tap-card-responsive" && (!query.trim() || `${profile.label} ${profile.class}`.toLowerCase().includes(query.toLowerCase())));
  const selected = OUTPUT_PROFILES.find((profile) => profile.id === selectedId) || profiles[0];
  return <div className="absolute inset-0 z-[1725] bg-black/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} data-testid="resize-adapt-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="resize-adapt-title" className="ml-auto max-h-full w-[min(34rem,100%)] overflow-y-auto rounded-2xl border border-white/15 bg-[var(--studio-panel)] p-4 text-[var(--studio-text)] shadow-2xl" data-testid="resize-adapt-panel"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#74a800]">Related outputs</p><h2 id="resize-adapt-title" className="mt-1 text-lg font-semibold">Resize / Adapt</h2><p className="mt-1 text-xs opacity-60">Tap Card is governed and cannot be resized into a poster or social graphic. Copy & Adapt creates an editable related variation.</p></div><button type="button" className="grid h-10 w-10 place-items-center rounded border border-current/15" onClick={onClose} aria-label="Close Resize and Adapt"><X className="h-4 w-4" /></button></div><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search output profiles" className="mt-4 h-11 w-full rounded-lg border border-current/15 bg-transparent px-3 text-sm" /><div className="mt-4 space-y-4">{(["tapconnect", "social", "print", "screen"] as const).map((profileClass) => { const choices = profiles.filter((profile) => profile.class === profileClass); if (!choices.length) return null; return <section key={profileClass}><h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider opacity-55">{profileClass}</h3><div className="grid grid-cols-2 gap-2">{choices.map((profile) => <button type="button" key={profile.id} aria-pressed={selectedId === profile.id} className="min-h-20 rounded-lg border border-current/15 p-2 text-left aria-pressed:border-[#74a800] aria-pressed:bg-[#b8ff2c]/10" onClick={() => setSelectedId(profile.id)}><span className="block text-xs font-semibold">{profile.label}</span><span className="mt-1 block text-[9px] opacity-55">Registry {profile.version}{profile.dpi ? ` · ${profile.dpi} DPI` : ""}</span></button>)}</div></section>; })}</div><div className="sticky bottom-0 mt-5 rounded-xl border border-current/15 bg-[var(--studio-panel)] p-3"><p className="text-xs font-semibold">Page scope</p><p className="mt-1 text-[10px] opacity-60">Current governed Card page → one related output variation. Multi-page scopes become available in flyer, carousel, ticket-sheet, and other compatible document types.</p><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" disabled className="min-h-11 rounded-lg border border-current/15 text-xs opacity-45" title="Tap Card current-document resize is prohibited">Resize current document</button><button type="button" disabled={!selected || working} className="min-h-11 rounded-lg bg-[#b8ff2c] px-3 text-xs font-semibold text-[#07100a] disabled:opacity-45" onClick={async () => { if (!selected) return; setWorking(true); try { await onAdapt(selected); } finally { setWorking(false); } }} data-testid="copy-adapt-action">{working ? "Creating variation…" : "Copy & Adapt"}</button></div></div></section></div>;
}
