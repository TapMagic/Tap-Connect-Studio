"use client";

/**
 * Adaptive Task Drawer — one tool family at a time, sized by task.
 * Desktop: side drawer with recommended / custom width.
 * Phone: bottom sheet with compact / balanced / library / expanded heights.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { GripVertical, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DRAWER_WIDTH_MAX_PCT,
  DRAWER_WIDTH_MIN_PCT,
  MOBILE_SHEET_HEIGHT,
  clampDrawerPct,
  drawerWidthPct,
  mapDesktopModeToMobileSheet,
  type DrawerSizeMode,
  type MobileSheetMode,
} from "@/lib/fusion/authoring/workspace-shell";
import {
  PANEL_STACK_EASING,
  PANEL_STACK_SLIDE_MS,
} from "@/components/fusion/creative-studio/nested-panel-shell";

export type AdaptiveTaskDrawerProps = {
  open: boolean;
  title: string;
  sizeMode: DrawerSizeMode;
  customWidthPct?: number | null;
  recommendedMode?: DrawerSizeMode;
  mobile?: boolean;
  children: ReactNode;
  onClose: () => void;
  onSizeModeChange?: (mode: DrawerSizeMode, customPct?: number | null) => void;
  onResetSize?: () => void;
  /** Restore scroll after remount. */
  initialScrollTop?: number;
  onScrollTopChange?: (top: number) => void;
  className?: string;
  /** Keep canvas mounted — drawer is sibling, not remount host. */
  "data-tool-id"?: string;
  /** Optional aliases for host regression testids. */
  closeTestId?: string;
  sheetTestId?: string;
  rootTestId?: string;
  dataTopic?: string;
  /**
   * When content owns its chrome (NestedPanelShell Sliding Stack),
   * hide the duplicate Adaptive drawer title/close row.
   */
  suppressHeader?: boolean;
};

export function AdaptiveTaskDrawer({
  open,
  title,
  sizeMode,
  customWidthPct = null,
  recommendedMode = "balanced",
  mobile = false,
  children,
  onClose,
  onSizeModeChange,
  onResetSize,
  initialScrollTop = 0,
  onScrollTopChange,
  className,
  "data-tool-id": toolId,
  closeTestId = "adaptive-drawer-close",
  sheetTestId,
  rootTestId = "adaptive-task-drawer",
  dataTopic,
  suppressHeader = false,
}: AdaptiveTaskDrawerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startPct: number } | null>(null);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    // Enter once when the dock opens — keep position when switching tools.
    setEntered(false);
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !scrollRef.current) return;
    scrollRef.current.scrollTop = initialScrollTop;
    // Restore once per open/tool; ignore ongoing scrollTop churn from parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [open, toolId]);

  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (!el) return;
    function onScroll() {
      if (el) onScrollTopChange?.(el.scrollTop);
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [open, onScrollTopChange]);

  const widthPct = drawerWidthPct(sizeMode, customWidthPct);
  const sheetMode: MobileSheetMode = mapDesktopModeToMobileSheet(sizeMode);
  const sheetHeight = MOBILE_SHEET_HEIGHT[sheetMode];

  const onResizePointerDown = useCallback(
    (e: ReactPointerEvent) => {
      e.preventDefault();
      const startPct = widthPct;
      dragRef.current = { startX: e.clientX, startPct };
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);

      function onMove(ev: PointerEvent) {
        if (!dragRef.current) return;
        const parent = target.parentElement?.parentElement;
        const total = parent?.clientWidth || window.innerWidth;
        const deltaPct = ((dragRef.current.startX - ev.clientX) / total) * 100;
        const next = clampDrawerPct(dragRef.current.startPct + deltaPct);
        onSizeModeChange?.("custom", next);
      }
      function onUp(ev: PointerEvent) {
        dragRef.current = null;
        target.releasePointerCapture(ev.pointerId);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      }
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [onSizeModeChange, widthPct]
  );

  const onResizeKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const delta = e.key === "ArrowLeft" ? 2 : -2;
      const next = clampDrawerPct(widthPct + delta);
      onSizeModeChange?.("custom", next);
    },
    [onSizeModeChange, widthPct]
  );

  if (!open) return null;

  if (mobile) {
    return (
      <div
        className={cn(
          "tc-inspector-panel fixed inset-x-0 bottom-0 z-40 overflow-hidden rounded-t-2xl bg-[#0a0f1c] motion-reduce:transition-none",
          entered
            ? "translate-y-0 opacity-100"
            : "translate-y-6 opacity-0",
          className
        )}
        style={{
          maxHeight: sheetHeight,
          transition: `transform ${PANEL_STACK_SLIDE_MS}ms ${PANEL_STACK_EASING}, opacity ${PANEL_STACK_SLIDE_MS}ms ${PANEL_STACK_EASING}`,
        }}
        data-testid={sheetTestId ?? rootTestId}
        data-drawer-placement="bottom"
        data-drawer-size={sizeMode}
        data-mobile-sheet={sheetMode}
        data-drawer-entered={entered ? "true" : "false"}
        data-tool-id={toolId ?? ""}
        data-topic={dataTopic ?? ""}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
          <div className="flex items-center gap-2">
            <span
              className="mx-auto h-1 w-10 rounded-full bg-white/25"
              aria-hidden
              data-testid="adaptive-drawer-sheet-handle"
            />
            <h2 className="text-sm font-semibold text-white">{title}</h2>
          </div>
          <button
            type="button"
            aria-label="Close drawer"
            data-testid={closeTestId}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-white/70 hover:bg-white/5"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div
          ref={scrollRef}
          className="overflow-y-auto p-3 pb-20"
          style={{ maxHeight: `calc(${sheetHeight} - 3.5rem)` }}
          data-testid="adaptive-drawer-scroll"
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <aside
      className={cn(
        "tc-inspector-panel relative flex h-full min-h-0 shrink-0 flex-col bg-[#070b14] motion-reduce:transition-none",
        entered ? "translate-x-0 opacity-100" : "translate-x-10 opacity-0",
        className
      )}
      style={{
        width: `${widthPct}%`,
        minWidth: `${DRAWER_WIDTH_MIN_PCT}%`,
        maxWidth: `${DRAWER_WIDTH_MAX_PCT}%`,
        transition: `transform ${PANEL_STACK_SLIDE_MS}ms ${PANEL_STACK_EASING}, opacity ${PANEL_STACK_SLIDE_MS}ms ${PANEL_STACK_EASING}, width ${PANEL_STACK_SLIDE_MS}ms ${PANEL_STACK_EASING}`,
      }}
      data-testid={rootTestId}
      data-drawer-placement="side"
      data-drawer-size={sizeMode}
      data-drawer-width-pct={String(widthPct)}
      data-drawer-entered={entered ? "true" : "false"}
      data-tool-id={toolId ?? ""}
      data-topic={dataTopic ?? ""}
      aria-label={title}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={widthPct}
        aria-valuemin={DRAWER_WIDTH_MIN_PCT}
        aria-valuemax={DRAWER_WIDTH_MAX_PCT}
        aria-label="Resize drawer"
        tabIndex={0}
        data-testid="adaptive-drawer-resize"
        className="absolute inset-y-0 left-0 z-10 flex w-3 -translate-x-1/2 cursor-col-resize items-center justify-center"
        onPointerDown={onResizePointerDown}
        onKeyDown={onResizeKeyDown}
      >
        <GripVertical className="h-4 w-4 text-white/35" aria-hidden />
      </div>

      {!suppressHeader ? (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
          <h2 className="truncate text-sm font-semibold text-white">{title}</h2>
          <div className="flex items-center gap-1">
            {onResetSize ? (
              <button
                type="button"
                data-testid="adaptive-drawer-reset-size"
                aria-label={`Reset to recommended ${recommendedMode} size`}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-white/15 text-white/60 hover:bg-white/5"
                onClick={onResetSize}
                title="Reset to recommended size"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              </button>
            ) : null}
            <button
              type="button"
              aria-label="Collapse drawer"
              data-testid={closeTestId}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-white/15 text-white/70 hover:bg-white/5"
              onClick={onClose}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      ) : (
        <div className="sr-only" data-testid="adaptive-drawer-header-suppressed">
          {title}
          <button type="button" data-testid={closeTestId} onClick={onClose}>
            Close
          </button>
        </div>
      )}
      <div
        ref={scrollRef}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto",
          suppressHeader ? "p-0" : "p-3"
        )}
        data-testid="adaptive-drawer-scroll"
        data-owns-chrome={suppressHeader ? "content" : "drawer"}
      >
        {children}
      </div>
    </aside>
  );
}
