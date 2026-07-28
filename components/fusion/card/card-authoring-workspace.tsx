"use client";

/**
 * Card authoring — full Adaptive Workspace Shell consumer.
 * One Command Shade · optional Outline · live Card canvas · one Adaptive Task Drawer.
 * Maturity: IMPLEMENTED BUT NOT OWNER-READY.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Redo2, Save, Undo2 } from "lucide-react";
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
import {
  createShellSnapshot,
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

/** Primary rail tools (aliases format/inspector omitted from rail). */
const CARD_RAIL_TOOLS = CARD_AUTHORING_TOOLS.filter(
  (t) => t.id !== "format" && t.id !== "inspector"
);

export type CardAuthoringWorkspaceProps = {
  initialConfig: TapConnectCardConfig;
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
  }[];
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
};

export function CardAuthoringWorkspace({
  publicCode,
  tapPointCount = 0,
  activeSpotlightTitle = null,
  ...builderProps
}: CardAuthoringWorkspaceProps) {
  const router = useRouter();
  const restored = useMemo(() => loadWorkspaceShellState(WORKSPACE_ID), []);
  const [toolMemory, setToolMemory] = useState<Record<string, ToolDrawerMemory>>(
    () => restored.toolMemory ?? {}
  );
  const [shell, setShell] = useState<WorkspaceShellSnapshot>(() =>
    createShellSnapshot(WORKSPACE_ID, {
      workspaceMode: restored.focusMode ? "focus" : "browse",
      shadePreference: restored.shadePreference,
      priorShadeDisplay: restored.priorShadeDisplay || "open",
      focusMode: restored.focusMode,
      selectedToolId: restored.selectedToolId,
      drawerOpen: Boolean(restored.selectedToolId) && !restored.focusMode,
      drawerSizeMode:
        (restored.selectedToolId &&
          restored.toolMemory?.[restored.selectedToolId]?.sizeMode) ||
        "balanced",
      customDrawerWidthPct:
        (restored.selectedToolId &&
          restored.toolMemory?.[restored.selectedToolId]?.customWidthPct) ||
        null,
      selectedObjectId:
        (restored.selectedToolId &&
          restored.toolMemory?.[restored.selectedToolId]?.selectedItemId) ||
        null,
      dirty: false,
      saved: true,
    })
  );
  const [sessionRestored] = useState(() => Boolean(restored.sessionDraftRestored));
  const [outlineBody, setOutlineBody] = useState<ReactNode>(null);
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
  });
  const apiRef = useRef<CardBuilderShellApi | null>(null);

  useEffect(() => {
    saveWorkspaceShellState(
      snapshotToPersisted(shell, toolMemory, {
        sessionDraftRestored: sessionRestored,
      })
    );
  }, [shell, toolMemory, sessionRestored]);

  // Keep builder focus in sync with shell Focus.
  useEffect(() => {
    apiRef.current?.setFocusMode(shell.focusMode);
  }, [shell.focusMode]);

  const openCardTool = useCallback(
    (toolId: string) => {
      // Compatibility aliases
      const resolved =
        toolId === "format"
          ? "colors"
          : toolId === "inspector"
            ? "content"
            : toolId;
      setShell((s) => {
        const { snapshot, memory } = openAdaptiveTool(
          s,
          WORKSPACE_ID,
          resolved,
          toolMemory
        );
        setToolMemory(memory);
        return snapshot;
      });
    },
    [toolMemory]
  );

  const onShellChange = useCallback((next: WorkspaceShellSnapshot) => {
    setShell(next);
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
        prev.cardName === next.cardName
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
  const recommendedDrawerMode =
    (activeToolId &&
      getWorkspaceTool(WORKSPACE_ID, activeToolId)?.recommendedDrawerMode) ||
    "balanced";

  const outline = (
    <div className="space-y-3" data-testid="card-outline-rail">
      <div className="space-y-1" data-testid="card-tool-rail">
        {CARD_RAIL_TOOLS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            data-testid={`card-tool-${tool.id}`}
            onClick={() => openCardTool(tool.id)}
            className={cn(
              "flex min-h-11 w-full items-center rounded-md px-3 text-left text-xs",
              activeToolId === tool.id && shell.drawerOpen
                ? "bg-primary/20 text-primary"
                : "text-white/70 hover:bg-white/5"
            )}
          >
            {tool.label}
          </button>
        ))}
      </div>
      <div className="border-t border-white/10 pt-3">{outlineBody}</div>
    </div>
  );

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
              ? "bg-primary/20 text-primary"
              : "border border-white/10 text-white/70"
          )}
        >
          {tool.label}
        </button>
      ))}
    </div>
  );

  /** Green = next forward action only: Save when dirty, Done when clean. */
  const primaryAction = status.dirty ? (
    <Button
      type="button"
      className="inline-flex min-h-11 items-center bg-primary px-3 text-primary-foreground"
      data-testid="card-save"
      disabled={status.saving}
      onClick={() => void apiRef.current?.save()}
    >
      <Save className="mr-1 h-4 w-4" />
      {status.saving ? "Saving…" : "Save Card"}
    </Button>
  ) : (
    <Link
      href="/dashboard/card"
      className="inline-flex min-h-11 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"
      data-testid="card-shade-done"
    >
      Done
    </Link>
  );

  const shadeExtras = (
    <div className="flex flex-wrap items-center gap-2" data-testid="card-shade-extras">
      <Button
        type="button"
        variant="outline"
        className="inline-flex min-h-11 min-w-11 items-center justify-center"
        onClick={() => apiRef.current?.undo()}
        disabled={!status.canUndo}
        data-testid="card-undo"
        aria-label="Undo"
      >
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        className="inline-flex min-h-11 min-w-11 items-center justify-center"
        onClick={() => apiRef.current?.redo()}
        disabled={!status.canRedo}
        data-testid="card-redo"
        aria-label="Redo"
      >
        <Redo2 className="h-4 w-4" />
      </Button>
      {status.dirty ? (
        <Link
          href="/dashboard/card"
          className="inline-flex min-h-11 items-center rounded-md border border-white/20 px-2.5 text-xs text-white/85 hover:bg-white/5"
          data-testid="card-done-editing"
          onClick={(e) => {
            if (!window.confirm("Leave with unsaved Card changes?")) {
              e.preventDefault();
            }
          }}
        >
          Done
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
          Save
        </Button>
      )}
      {/* Focus is owned by Command Shade — keep alias for docs, not for Playwright clicks */}
      <span className="sr-only" data-testid="card-focus-mode" aria-hidden>
        Focus lives on command-shade-focus
      </span>
    </div>
  );

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden"
      data-testid="card-edit-workspace-host"
      data-escape-authoring="true"
      data-adaptive-shell="v1"
      data-shell-consumer="card-authoring"
      data-maturity="implemented-not-owner-ready"
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

      <AdaptiveWorkspaceShell
        identity={{
          id: WORKSPACE_ID,
          label: status.cardName || "Card",
          objectLabel: [
            status.lifecycleStatus === "retired" ? "Retired" : "Public-ready",
            tapPointCount ? `${tapPointCount} Tap Points` : null,
            activeSpotlightTitle ? `Spotlight · ${activeSpotlightTitle}` : null,
            status.brandSource,
          ]
            .filter(Boolean)
            .join(" · "),
          zone: "card",
        }}
        outline={shell.focusMode ? undefined : outline}
        canvas={
          <TapCardBuilder
            {...builderProps}
            workspaceMode
            escapeMode
            shellHosted
            activeToolId={activeToolId}
            shellFocusMode={shell.focusMode}
            doneHref="/dashboard/card"
            publicCode={publicCode}
            tapPointCount={tapPointCount}
            activeSpotlightTitle={activeSpotlightTitle}
            onShellApi={(api) => {
              apiRef.current = api;
            }}
            onShellOutline={setOutlineBody}
            onShellStatus={onStatusChange}
            onRequestTool={openCardTool}
          />
        }
        drawerContent={
          shell.drawerOpen && !shell.focusMode && activeToolId ? (
            <CardLiveToolDrawer toolId={activeToolId} />
          ) : undefined
        }
        drawerTitle={
          (activeToolId && getWorkspaceTool(WORKSPACE_ID, activeToolId)?.label) ||
          "Tools"
        }
        toolMemory={toolMemory}
        onToolMemoryChange={setToolMemory}
        snapshot={shell}
        onSnapshotChange={onShellChange}
        recommendedDrawerMode={recommendedDrawerMode}
        zoneClassName="card-zone-glow"
        shadeExtras={shadeExtras}
        mobileToolRail={mobileToolRail}
        desktopDrawerCloseTestId="card-drawer-collapse"
        mobileDrawerCloseTestId="card-drawer-collapse"
        mobileSheetTestId="card-mobile-sheet"
        drawerRootTestId="card-contextual-drawer"
        onExitWorkspace={() => router.push("/dashboard/card")}
        primaryAction={primaryAction}
        returnAction={
          <Link
            href="/dashboard/card"
            className="inline-flex min-h-11 items-center rounded-md border border-white/20 px-2.5 text-xs text-white/85 hover:bg-white/5"
            data-testid="card-edit-done-link"
          >
            Return
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
                Open public URL
              </a>
            ) : (
              <span
                className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-white/40"
                title="No Tap Point device code available"
                data-testid="card-edit-preview-public-unavailable"
              >
                Public URL unavailable
              </span>
            )}
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
