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
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Monitor, Redo2, Save, Smartphone, Tablet, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdaptiveWorkspaceShell,
  openAdaptiveTool,
} from "@/components/fusion/authoring/adaptive-workspace-shell";
import {
  TapCardBuilder,
  type CardBuilderShellApi,
  type CardBuilderShellStatus,
} from "@/components/card/tap-card-builder";
import { CardLiveToolDrawer } from "@/components/fusion/card/card-live-tool-drawer";
import { CardComposerLibrary } from "@/components/fusion/card/card-composer-library";
import { CardComposerInspector } from "@/components/fusion/card/card-composer-inspector";
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
  CARD_AUTHORING_TOOLS,
  ensureDefaultToolRegistries,
  getWorkspaceTool,
} from "@/lib/fusion/authoring/workspace-tools";
import { cn } from "@/lib/utils";
import type { BrandContactProfile } from "@/lib/brand/contact-profile";
import type { TapConnectCardConfig } from "@/lib/brand/tap-card";

ensureDefaultToolRegistries();

const WORKSPACE_ID = "card-authoring";
/** Shared inspector dock size — every tool opens to the same place. */
const CARD_INSPECTOR_SIZE_KEY = "card-inspector";
/** Default dock width when no personal resize has been saved yet. */
const CARD_INSPECTOR_DEFAULT_MODE = "balanced" as const;

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

/**
 * Compact primary rail — shallow one-topic panes consolidated into
 * Inspector / Appearance hubs. Aliases stay registered for deep-links.
 */
const CARD_RAIL_HIDDEN = new Set([
  "format",
  "inspector",
  "brand",
  "colors",
  "layout",
]);
const CARD_RAIL_TOOLS = CARD_AUTHORING_TOOLS.filter(
  (t) => !CARD_RAIL_HIDDEN.has(t.id)
);

export type CardAuthoringWorkspaceProps = {
  initialConfig: TapConnectCardConfig;
  initialDraftRevision?: number;
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
      selectedToolId: "content",
      drawerOpen: true,
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
  const [sessionRestored] = useState(() => Boolean(restored.sessionDraftRestored));
  const [studioMode, setStudioMode] = useState<CreativeStudioMode>("edit");
  const [previewViewport, setPreviewViewport] = useState<PreviewViewport>("desktop");
  const [liveDeviceOpen, setLiveDeviceOpen] = useState(false);
  const [previewRevision, setPreviewRevision] = useState(1);
  const [appearanceEntryLevel, setAppearanceEntryLevel] = useState<
    "root" | "colors" | "brand" | "layout" | "segment"
  >("root");
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
  });
  const [chromeState, setChromeState] = useState<
    "expanded" | "compact" | "collapsed" | "pinned" | "focus"
  >("compact");
  const apiRef = useRef<CardBuilderShellApi | null>(null);

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
      const shared = toolMemory[CARD_INSPECTOR_SIZE_KEY];
      // Same dock every time: keep current width when switching tools;
      // when opening from closed, use the shared personal size (or default).
      const sizeMode = shell.drawerOpen
        ? shell.drawerSizeMode
        : shared?.sizeMode || CARD_INSPECTOR_DEFAULT_MODE;
      const customDrawerWidthPct = shell.drawerOpen
        ? shell.customDrawerWidthPct
        : sizeMode === "custom"
          ? shared?.customWidthPct ?? null
          : null;
      const nextMemory = rememberToolDrawer(
        rememberToolDrawer(memory, CARD_INSPECTOR_SIZE_KEY, {
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
        rememberToolDrawer(m, CARD_INSPECTOR_SIZE_KEY, {
          sizeMode: next.drawerSizeMode,
          customWidthPct: next.customDrawerWidthPct,
        })
      );
    }
  }, []);

  const onStatusChange = useCallback((next: CardBuilderShellStatus) => {
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
  const recommendedDrawerMode = CARD_INSPECTOR_DEFAULT_MODE;

  const outline = <CardComposerLibrary model={liveModel} />;

  const mobileToolRail = (
    <div
      className="flex shrink-0 gap-1 overflow-x-auto border-t border-white/10 bg-[#070b14] px-2 py-2"
      data-testid="card-mobile-tool-rail"
    >
      {CARD_RAIL_TOOLS.map((tool) => (
        <button
          key={tool.id}
          type="button"
          data-testid={`card-mobile-tool-${tool.id}`}
          onClick={() => openCardTool(tool.id)}
          className={cn(
            "min-h-11 shrink-0 rounded-md px-3 text-xs",
            activeToolId === tool.id && shell.drawerOpen
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
      <button type="button" className="min-h-9 rounded-md border border-white/15 px-2 text-xs text-white/80" onClick={() => openCardTool("history")}>History</button>
      <Link href="/control" className="inline-flex min-h-9 items-center rounded-md border border-white/15 px-2 text-xs text-white/80">Control Room</Link>
    </div>
  );

  return (
    <div
      className="relative flex h-full min-h-0 flex-col overflow-hidden"
      data-testid="card-edit-workspace-host"
      data-escape-authoring="true"
      data-adaptive-shell="v1"
      data-shell-consumer="card-authoring"
      data-studio-mode={studioMode}
      data-chrome-state={chromeState}
      data-drawer-open={shell.drawerOpen ? "true" : "false"}
      data-selected-tool={shell.selectedToolId ?? ""}
      data-maturity="implementation-in-progress"
    >
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
        canvas={
          <div
            className={cn(
              "flex h-full min-h-0 w-full justify-center",
              previewViewport !== "desktop" && "overflow-y-auto py-4"
            )}
            data-testid="card-canvas-viewport"
            data-preview-viewport={previewViewport}
            data-studio-mode={studioMode}
            style={
              previewViewport !== "desktop"
                ? { maxWidth: PREVIEW_VIEWPORT_WIDTHS[previewViewport] }
                : undefined
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
                activeToolId={studioMode === "preview" ? null : activeToolId}
                shellFocusMode={shell.focusMode || studioMode === "preview"}
                doneHref={doneHref}
                publicCode={publicCode}
                tapPointCount={tapPointCount}
                activeSpotlightTitle={activeSpotlightTitle}
                onShellApi={(api) => {
                  apiRef.current = api;
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
            activeToolId === "history" || activeToolId === "lifecycle" || activeToolId === "appearance" ? (
              <CardLiveToolDrawer
                toolId={activeToolId}
                onCloseTool={closeCardTool}
                onRequestTool={openCardTool}
                appearanceInitialLevel={appearanceEntryLevel}
              />
            ) : (
              <CardComposerInspector model={liveModel} onRequestTool={openCardTool} />
            )
          ) : undefined
        }
        drawerTitle={
          activeToolId === "history" || activeToolId === "lifecycle" || activeToolId === "appearance"
            ? getWorkspaceTool(WORKSPACE_ID, activeToolId)?.label || "Tools"
            : "Inspector"
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
              "content",
              "composition",
              "typography",
              "buttons",
              "media",
              "history",
            ].includes(activeToolId)
        )}
        onExitWorkspace={() => router.push(doneHref)}
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
