"use client";

/**
 * Adaptive Command Shade — workspace-level chrome only.
 * Overlays / retracts without destabilizing the live work surface.
 */

import type { ReactNode } from "react";
import {
  ChevronDown,
  ChevronUp,
  Crosshair,
  Pin,
  PinOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CommandShadeDisplay,
  CommandShadePreference,
  ResolvedShade,
} from "@/lib/fusion/authoring/workspace-shell";

export type CommandShadeProps = {
  identityLabel: string;
  objectLabel?: string;
  display: CommandShadeDisplay;
  preference: CommandShadePreference;
  resolved?: ResolvedShade;
  dirty?: boolean;
  saved?: boolean;
  blockingWarning?: string | null;
  focusMode?: boolean;
  primaryAction?: ReactNode;
  returnAction?: ReactNode;
  openInNewTab?: ReactNode;
  previewControls?: ReactNode;
  extras?: ReactNode;
  reducedMotion?: boolean;
  onCollapse?: () => void;
  onExpand?: () => void;
  onPinOpen?: () => void;
  onPinCollapsed?: () => void;
  onAuto?: () => void;
  onFocusToggle?: () => void;
  className?: string;
};

export function CommandShade({
  identityLabel,
  objectLabel,
  display,
  preference,
  resolved,
  dirty = false,
  saved = true,
  blockingWarning = null,
  focusMode = false,
  primaryAction,
  returnAction,
  openInNewTab,
  previewControls,
  extras,
  reducedMotion = false,
  onCollapse,
  onExpand,
  onPinOpen,
  onPinCollapsed,
  onAuto,
  onFocusToggle,
  className,
}: CommandShadeProps) {
  const showWarning =
    Boolean(blockingWarning) || resolved?.showWarningInStrip === true;
  const isCollapsed = display === "collapsed";
  const isPeek = display === "peek";

  return (
    <section
      className={cn(
        "relative z-20 shrink-0 border-b border-white/10 bg-[#050814]/95 backdrop-blur-sm",
        !reducedMotion && "transition-[min-height,padding] duration-200 ease-out",
        isCollapsed ? "min-h-11" : isPeek ? "min-h-14" : "min-h-[4.5rem]",
        className
      )}
      data-testid="command-shade"
      data-shade-display={display}
      data-shade-preference={preference}
      data-shade-reason={resolved?.reason ?? ""}
      aria-label={`Workspace command shade (${display})`}
    >
      {/* Pull handle */}
      <div className="flex justify-center pt-0.5">
        <button
          type="button"
          data-testid="command-shade-handle"
          aria-label={isCollapsed ? "Expand command shade" : "Collapse command shade"}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-white/45 hover:bg-white/5 hover:text-white/80"
          onClick={() => (isCollapsed ? onExpand?.() : onCollapse?.())}
        >
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4" aria-hidden />
          ) : (
            <ChevronUp className="h-4 w-4" aria-hidden />
          )}
          <span
            className="mx-1 h-1 w-10 rounded-full bg-white/25"
            aria-hidden
          />
        </button>
      </div>

      <div
        className={cn(
          "flex flex-wrap items-center gap-2 px-3 pb-2",
          isCollapsed && "pb-1.5 pt-0"
        )}
      >
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate font-semibold uppercase tracking-[0.14em] text-primary",
              isCollapsed ? "text-[9px]" : "text-[10px]"
            )}
          >
            {identityLabel}
          </p>
          {!isCollapsed && objectLabel ? (
            <p className="truncate text-xs text-white/55">{objectLabel}</p>
          ) : null}
          {showWarning ? (
            <p
              className="mt-0.5 truncate text-[10px] text-amber-200/90"
              data-testid="command-shade-warning"
              role="status"
            >
              {blockingWarning || "Needs attention"}
              {resolved?.expandAvailable ? (
                <button
                  type="button"
                  className="ml-2 underline"
                  data-testid="command-shade-expand-warning"
                  onClick={onExpand}
                >
                  Expand
                </button>
              ) : null}
            </p>
          ) : null}
          {dirty ? (
            <span
              className="mt-0.5 inline-block text-[10px] uppercase tracking-wider text-amber-200/80"
              data-testid="command-shade-dirty"
              data-dirty="true"
            >
              Unsaved session
            </span>
          ) : saved && !isCollapsed ? (
            <span
              className="mt-0.5 inline-block text-[10px] uppercase tracking-wider text-white/70"
              data-testid="command-shade-saved"
            >
              Saved
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {!isCollapsed ? previewControls : null}
          {extras}
          {!isCollapsed && openInNewTab}
          {returnAction}
          {primaryAction}

          <div
            className="flex items-center gap-1"
            role="group"
            aria-label="Shade pin controls"
            data-testid="command-shade-pin-controls"
          >
            {!isCollapsed ? (
              <>
                <button
                  type="button"
                  data-testid="command-shade-pin-open"
                  aria-pressed={preference === "pinned_open"}
                  aria-label="Pin shade open"
                  className={cn(
                    "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border text-xs",
                    preference === "pinned_open"
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-white/15 text-white/60 hover:bg-white/5"
                  )}
                  onClick={onPinOpen}
                >
                  <Pin className="h-3.5 w-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  data-testid="command-shade-pin-collapsed"
                  aria-pressed={preference === "pinned_collapsed"}
                  aria-label="Pin shade collapsed"
                  className={cn(
                    "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border text-xs",
                    preference === "pinned_collapsed"
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-white/15 text-white/60 hover:bg-white/5"
                  )}
                  onClick={onPinCollapsed}
                >
                  <PinOff className="h-3.5 w-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  data-testid="command-shade-auto"
                  aria-pressed={preference === "auto"}
                  aria-label="Automatic shade"
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-md border px-2.5 text-[10px] uppercase tracking-wide",
                    preference === "auto"
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-white/15 text-white/60 hover:bg-white/5"
                  )}
                  onClick={onAuto}
                >
                  Auto
                </button>
                <button
                  type="button"
                  data-testid="command-shade-collapse"
                  aria-label="Collapse shade"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-white/15 text-white/60 hover:bg-white/5"
                  onClick={onCollapse}
                >
                  <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  data-testid="command-shade-pin-open"
                  aria-pressed={preference === "pinned_open"}
                  aria-label="Pin shade open"
                  className={cn(
                    "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border text-xs",
                    preference === "pinned_open"
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-white/15 text-white/60 hover:bg-white/5"
                  )}
                  onClick={onPinOpen}
                >
                  <Pin className="h-3.5 w-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  data-testid="command-shade-pin-collapsed"
                  aria-pressed={preference === "pinned_collapsed"}
                  aria-label="Pin shade collapsed"
                  className={cn(
                    "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border text-xs",
                    preference === "pinned_collapsed"
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-white/15 text-white/60 hover:bg-white/5"
                  )}
                  onClick={onPinCollapsed}
                >
                  <PinOff className="h-3.5 w-3.5" aria-hidden />
                </button>
              </>
            )}
          </div>

          {onFocusToggle ? (
            <button
              type="button"
              data-testid="command-shade-focus"
              aria-pressed={focusMode}
              aria-label={focusMode ? "Exit focus mode" : "Enter focus mode"}
              className={cn(
                "inline-flex min-h-11 items-center gap-1 rounded-md border px-2.5 text-xs",
                focusMode
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-white/15 text-white/70 hover:bg-white/5"
              )}
              onClick={onFocusToggle}
            >
              <Crosshair className="h-3.5 w-3.5" aria-hidden />
              {focusMode ? "Exit focus" : "Focus"}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
