"use client";

/**
 * Adaptive Workspace Shell V1 — Command Shade + Task Drawer + Live Work Surface.
 * Extends the shared AuthoringWorkspaceShell contract (does not invent a second builder).
 * Maturity: IMPLEMENTED BUT NOT OWNER-READY.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { CommandShade } from "@/components/fusion/authoring/command-shade";
import { AdaptiveTaskDrawer } from "@/components/fusion/authoring/adaptive-task-drawer";
import {
  applyEscLayer,
  applyShadeAction,
  createShellSnapshot,
  nextEscLayer,
  openToolDrawer,
  rememberToolDrawer,
  resetDrawerToRecommended,
  resolveCommandShade,
  type CommandShadeDisplay,
  type CommandShadePreference,
  type DrawerSizeMode,
  type ToolDrawerMemory,
  type WorkspaceIdentity,
  type WorkspaceMode,
  type WorkspaceShellSnapshot,
} from "@/lib/fusion/authoring/workspace-shell";
import {
  getWorkspaceTool,
  ensureDefaultToolRegistries,
} from "@/lib/fusion/authoring/workspace-tools";

ensureDefaultToolRegistries();

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => undefined;
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", onStoreChange);
      return () => mq.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
}

function useIsPhoneLayout() {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => undefined;
      const mq = window.matchMedia("(max-width: 1023px)");
      mq.addEventListener("change", onStoreChange);
      return () => mq.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia("(max-width: 1023px)").matches,
    () => false
  );
}

export type AdaptiveWorkspaceShellProps = {
  identity: WorkspaceIdentity;
  outline?: ReactNode;
  canvas: ReactNode;
  /** Drawer body for the selected tool — replaced on topic change, never stacked. */
  drawerContent?: ReactNode;
  drawerTitle?: string;
  toolMemory?: Record<string, ToolDrawerMemory>;
  onToolMemoryChange?: (memory: Record<string, ToolDrawerMemory>) => void;
  snapshot: WorkspaceShellSnapshot;
  onSnapshotChange: (next: WorkspaceShellSnapshot) => void;
  primaryAction?: ReactNode;
  returnAction?: ReactNode;
  openInNewTab?: ReactNode;
  previewControls?: ReactNode;
  shadeExtras?: ReactNode;
  mobileToolRail?: ReactNode;
  /** Called when Esc reaches exit_workspace layer. */
  onExitWorkspace?: () => void;
  /** Recommended drawer mode for current tool (from registry or host). */
  recommendedDrawerMode?: DrawerSizeMode;
  className?: string;
  /** Zone atmosphere class (e.g. brand-zone-glow on canvas host). */
  zoneClassName?: string;
  footer?: ReactNode;
  desktopDrawerCloseTestId?: string;
  mobileDrawerCloseTestId?: string;
  mobileSheetTestId?: string;
  drawerRootTestId?: string;
  /** NestedPanelShell owns Back/Close — hide Adaptive drawer title row. */
  suppressDrawerHeader?: boolean;
};

export function AdaptiveWorkspaceShell({
  identity,
  outline,
  canvas,
  drawerContent,
  drawerTitle,
  toolMemory: toolMemoryProp,
  onToolMemoryChange,
  snapshot,
  onSnapshotChange,
  primaryAction,
  returnAction,
  openInNewTab,
  previewControls,
  shadeExtras,
  mobileToolRail,
  onExitWorkspace,
  recommendedDrawerMode = "balanced",
  className,
  zoneClassName,
  footer,
  desktopDrawerCloseTestId = "adaptive-drawer-close",
  mobileDrawerCloseTestId = "adaptive-drawer-close",
  mobileSheetTestId,
  drawerRootTestId = "adaptive-task-drawer",
  suppressDrawerHeader = false,
}: AdaptiveWorkspaceShellProps) {
  const isPhone = useIsPhoneLayout();
  const reducedMotion = usePrefersReducedMotion();
  const [localMemory, setLocalMemory] = useState<Record<string, ToolDrawerMemory>>(
    () => toolMemoryProp ?? {}
  );
  const memory = toolMemoryProp ?? localMemory;
  const setMemory = useCallback(
    (next: Record<string, ToolDrawerMemory>) => {
      if (onToolMemoryChange) onToolMemoryChange(next);
      else setLocalMemory(next);
    },
    [onToolMemoryChange]
  );

  const canvasMountRef = useRef<HTMLDivElement>(null);
  const resolved = useMemo(() => resolveCommandShade(snapshot), [snapshot]);
  const priorExpandedModeRef = useRef<DrawerSizeMode>("balanced");

  const patch = useCallback(
    (next: WorkspaceShellSnapshot) => onSnapshotChange(next),
    [onSnapshotChange]
  );

  const setShadePreference = useCallback(
    (preference: CommandShadePreference) => {
      patch(applyShadeAction(snapshot, { type: "set_preference", preference }));
    },
    [patch, snapshot]
  );

  const setShadeDisplay = useCallback(
    (display: CommandShadeDisplay) => {
      if (snapshot.shadePreference === "auto") {
        patch(applyShadeAction(snapshot, { type: "set_display", display }));
      } else if (display === "open") {
        setShadePreference("pinned_open");
      } else {
        setShadePreference("pinned_collapsed");
      }
    },
    [patch, setShadePreference, snapshot]
  );

  // Esc priority — capture phase so DashboardChrome exit waits.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      const layer = nextEscLayer({
        modalOpen: snapshot.modalOpen,
        drawerOpen: snapshot.drawerOpen,
        drawerSizeMode: snapshot.drawerSizeMode,
        focusMode: snapshot.focusMode,
      });
      if (layer === "exit_workspace") {
        // Let DashboardChrome handle exit; optionally notify host.
        onExitWorkspace?.();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      if (layer === "expanded_drawer") {
        priorExpandedModeRef.current =
          memory[snapshot.selectedToolId ?? ""]?.sizeMode &&
          memory[snapshot.selectedToolId ?? ""]!.sizeMode !== "expanded"
            ? memory[snapshot.selectedToolId ?? ""]!.sizeMode
            : recommendedDrawerMode;
      }
      patch(applyEscLayer(snapshot, layer, priorExpandedModeRef.current));
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [
    memory,
    onExitWorkspace,
    patch,
    recommendedDrawerMode,
    snapshot,
  ]);

  const closeDrawer = useCallback(() => {
    if (snapshot.selectedToolId) {
      setMemory(
        rememberToolDrawer(memory, snapshot.selectedToolId, {
          sizeMode: snapshot.drawerSizeMode,
          customWidthPct: snapshot.customDrawerWidthPct,
          selectedItemId: snapshot.selectedObjectId,
        })
      );
    }
    patch({ ...snapshot, drawerOpen: false });
  }, [memory, patch, setMemory, snapshot]);

  const onSizeModeChange = useCallback(
    (mode: DrawerSizeMode, customPct?: number | null) => {
      const next = {
        ...snapshot,
        drawerSizeMode: mode,
        customDrawerWidthPct: mode === "custom" ? (customPct ?? null) : null,
      };
      patch(next);
      if (snapshot.selectedToolId) {
        setMemory(
          rememberToolDrawer(memory, snapshot.selectedToolId, {
            sizeMode: mode,
            customWidthPct: customPct ?? null,
          })
        );
      }
    },
    [memory, patch, setMemory, snapshot]
  );

  const onResetSize = useCallback(() => {
    const reset = resetDrawerToRecommended(recommendedDrawerMode);
    patch({ ...snapshot, ...reset });
    if (snapshot.selectedToolId) {
      setMemory(
        rememberToolDrawer(memory, snapshot.selectedToolId, {
          sizeMode: reset.drawerSizeMode,
          customWidthPct: null,
        })
      );
    }
  }, [memory, patch, recommendedDrawerMode, setMemory, snapshot]);

  const showDrawer =
    snapshot.drawerOpen && !snapshot.focusMode && Boolean(drawerContent);
  const showOutline = Boolean(outline) && !snapshot.focusMode;

  const toolLabel =
    drawerTitle ||
    (snapshot.selectedToolId
      ? getWorkspaceTool(identity.id, snapshot.selectedToolId)?.label
      : undefined) ||
    "Tools";

  const scrollTop =
    (snapshot.selectedToolId &&
      memory[snapshot.selectedToolId]?.scrollTop) ||
    0;

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col bg-[#050814] text-white",
        className
      )}
      data-testid="authoring-workspace-shell"
      data-adaptive-shell="v1"
      data-workspace-id={identity.id}
      data-workspace-mode={snapshot.workspaceMode}
      data-focus-mode={snapshot.focusMode ? "true" : "false"}
      data-maturity="implemented-not-owner-ready"
    >
      <CommandShade
        identityLabel={identity.label}
        objectLabel={identity.objectLabel}
        display={resolved.display}
        preference={resolved.preference}
        resolved={resolved}
        dirty={snapshot.dirty}
        saved={snapshot.saved}
        blockingWarning={snapshot.blockingWarning}
        focusMode={snapshot.focusMode}
        primaryAction={primaryAction}
        returnAction={returnAction}
        openInNewTab={openInNewTab}
        previewControls={previewControls}
        extras={shadeExtras}
        reducedMotion={reducedMotion}
        onCollapse={() => setShadeDisplay("collapsed")}
        onExpand={() => setShadeDisplay("open")}
        onPinOpen={() => setShadePreference("pinned_open")}
        onPinCollapsed={() => setShadePreference("pinned_collapsed")}
        onAuto={() => setShadePreference("auto")}
        onFocusToggle={() =>
          patch(
            applyShadeAction(snapshot, {
              type: snapshot.focusMode ? "exit_focus" : "enter_focus",
            })
          )
        }
      />

      <div
        className={cn(
          "flex min-h-0 flex-1",
          isPhone ? "flex-col" : "flex-row"
        )}
        data-testid="adaptive-work-row"
      >
        {showOutline && !isPhone ? (
          <aside
            className="hidden min-h-0 w-[min(16rem,22%)] shrink-0 overflow-y-auto border-r border-white/8 p-3 lg:block"
            data-testid="authoring-outline"
          >
            {outline}
          </aside>
        ) : null}

        <main
          ref={canvasMountRef}
          className={cn(
            "min-h-0 min-w-0 flex-1 overflow-hidden",
            zoneClassName
          )}
          data-testid="authoring-canvas"
          data-live-surface="true"
        >
          {canvas}
        </main>

        {showDrawer && !isPhone ? (
          <AdaptiveTaskDrawer
            open
            title={toolLabel}
            sizeMode={snapshot.drawerSizeMode}
            customWidthPct={snapshot.customDrawerWidthPct}
            recommendedMode={recommendedDrawerMode}
            onClose={closeDrawer}
            onSizeModeChange={onSizeModeChange}
            onResetSize={suppressDrawerHeader ? undefined : onResetSize}
            initialScrollTop={scrollTop}
            onScrollTopChange={(top) => {
              if (!snapshot.selectedToolId) return;
              setMemory(
                rememberToolDrawer(memory, snapshot.selectedToolId, {
                  scrollTop: top,
                })
              );
            }}
            data-tool-id={snapshot.selectedToolId ?? undefined}
            closeTestId={desktopDrawerCloseTestId}
            rootTestId={drawerRootTestId}
            dataTopic={snapshot.selectedToolId ?? undefined}
            suppressHeader={suppressDrawerHeader}
          >
            {drawerContent}
          </AdaptiveTaskDrawer>
        ) : null}
      </div>

      {isPhone ? mobileToolRail : null}

      {showDrawer && isPhone ? (
        <AdaptiveTaskDrawer
          open
          mobile
          title={toolLabel}
          sizeMode={snapshot.drawerSizeMode}
          customWidthPct={snapshot.customDrawerWidthPct}
          recommendedMode={recommendedDrawerMode}
          onClose={closeDrawer}
          initialScrollTop={scrollTop}
          onScrollTopChange={(top) => {
            if (!snapshot.selectedToolId) return;
            setMemory(
              rememberToolDrawer(memory, snapshot.selectedToolId, {
                scrollTop: top,
              })
            );
          }}
          data-tool-id={snapshot.selectedToolId ?? undefined}
          closeTestId={mobileDrawerCloseTestId}
          sheetTestId={mobileSheetTestId}
          rootTestId={drawerRootTestId}
          dataTopic={snapshot.selectedToolId ?? undefined}
          suppressHeader={suppressDrawerHeader}
        >
          {drawerContent}
        </AdaptiveTaskDrawer>
      ) : null}

      {footer ? (
        <footer
          className="shrink-0 border-t border-white/10 px-4 py-3"
          data-testid="authoring-footer"
        >
          {footer}
        </footer>
      ) : null}
    </div>
  );
}

/** Helper: open a registered tool on a shell snapshot. */
export function openAdaptiveTool(
  snapshot: WorkspaceShellSnapshot,
  workspaceId: string,
  toolId: string,
  memory: Record<string, ToolDrawerMemory>
): {
  snapshot: WorkspaceShellSnapshot;
  memory: Record<string, ToolDrawerMemory>;
} {
  const tool = getWorkspaceTool(workspaceId, toolId);
  const recommended = tool?.recommendedDrawerMode ?? "balanced";
  return openToolDrawer(snapshot, toolId, recommended, memory, {
    triggersConstructMode: tool?.triggersConstructMode,
  });
}

export function createAdaptiveSnapshot(
  workspaceId: string,
  patch?: Partial<WorkspaceShellSnapshot>
): WorkspaceShellSnapshot {
  return createShellSnapshot(workspaceId, patch);
}

export type { WorkspaceMode, WorkspaceShellSnapshot, ToolDrawerMemory };
