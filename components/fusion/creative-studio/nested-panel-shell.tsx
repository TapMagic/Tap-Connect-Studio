"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type NestedPanelShellProps = {
  title: string;
  breadcrumbs: string[];
  onBack?: () => void;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
  testId?: string;
  footer?: ReactNode;
  /**
   * Stack depth for horizontal slide (0 = Selection Hub / root).
   * Forward increases depth; Back decreases — motion reverses.
   */
  depth?: number;
};

type SlideDir = "forward" | "back";

/** Premium, clearly visible stack motion (Owner-calibrated). */
export const PANEL_STACK_SLIDE_MS = 560;
export const PANEL_STACK_EASING = "cubic-bezier(0.16, 1, 0.3, 1)";

type TransitionState = {
  dir: SlideDir;
  outgoing: ReactNode;
  incoming: ReactNode;
  depth: number;
};

/**
 * Shared nested panel chrome — Back · Close · breadcrumb · title.
 * Levels slide horizontally in the same inspector space (true dual-pane track).
 */
export function NestedPanelShell({
  title,
  breadcrumbs,
  onBack,
  onClose,
  children,
  className,
  testId = "nested-panel-shell",
  footer,
  depth = 0,
}: NestedPanelShellProps) {
  const depthRef = useRef(depth);
  const childrenRef = useRef<ReactNode>(children);
  const transitioningRef = useRef(false);
  const [settled, setSettled] = useState<ReactNode>(children);
  const [transition, setTransition] = useState<TransitionState | null>(null);
  const [trackOffset, setTrackOffset] = useState(0); // 0 | -50
  const slideDirection: "forward" | "back" | "none" = transition
    ? transition.dir
    : "none";

  useLayoutEffect(() => {
    if (depth === depthRef.current) {
      childrenRef.current = children;
      if (transitioningRef.current) {
        setTransition((current) =>
          current ? { ...current, incoming: children } : current
        );
      } else {
        setSettled(children);
      }
      return;
    }
    const dir: SlideDir = depth > depthRef.current ? "forward" : "back";
    const outgoing = childrenRef.current;
    const incoming = children;
    depthRef.current = depth;
    childrenRef.current = children;
    transitioningRef.current = true;
    setTransition({ dir, outgoing, incoming, depth });
    setTrackOffset(dir === "forward" ? 0 : -50);
  }, [depth, children]);

  useEffect(() => {
    if (!transition) return;
    const target = transition.dir === "forward" ? -50 : 0;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setSettled(childrenRef.current);
      setTransition(null);
      setTrackOffset(0);
      transitioningRef.current = false;
      return;
    }
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setTrackOffset(target));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [transition]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      if (onBack) onBack();
      else if (onClose) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack, onClose]);

  function finishTransition() {
    if (!transition) return;
    // Selection/data can arrive after depth changes (for example Add Image).
    // Settle the latest pane content rather than the empty first transition frame.
    setSettled(childrenRef.current);
    setTransition(null);
    setTrackOffset(0);
    transitioningRef.current = false;
  }

  return (
    <div
      className={cn("tc-inspector-panel flex min-h-0 flex-col", className)}
      data-testid={testId}
      data-sliding-panel-stack="true"
      data-panel-depth={String(depth)}
      data-panel-slide-direction={slideDirection}
      data-panel-dual-pane={transition ? "true" : "false"}
      data-panel-slide-ms={String(PANEL_STACK_SLIDE_MS)}
      role="region"
      aria-label={title}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-3 py-2">
        {onBack ? (
          <button
            type="button"
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-white/15 text-white/80"
            data-testid="panel-stack-back"
            aria-label="Back one panel level"
            onClick={onBack}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-medium text-white"
            data-testid="panel-stack-title"
          >
            {title}
          </p>
          {breadcrumbs.length > 0 ? (
            <p
              className="truncate text-[11px] text-white/45"
              data-testid="panel-stack-breadcrumb"
            >
              {breadcrumbs.join(" → ")}
            </p>
          ) : null}
        </div>
        {onClose ? (
          <button
            type="button"
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-white/15 text-white/70"
            data-testid="panel-stack-close"
            aria-label="Close panel"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <div className="relative min-h-0 overflow-hidden">
        {transition ? (
          <div
            data-panel-slide-track
            data-slide-direction={transition.dir}
            data-track-offset={String(trackOffset)}
            className="flex w-[200%] will-change-transform motion-reduce:transition-none"
            style={{
              transform: `translateX(${trackOffset}%)`,
              transition: `transform ${PANEL_STACK_SLIDE_MS}ms ${PANEL_STACK_EASING}`,
            }}
            onTransitionEnd={(e) => {
              if (e.propertyName === "transform") finishTransition();
            }}
          >
            {transition.dir === "forward" ? (
              <>
                <div
                  className="w-1/2 shrink-0 border-r border-white/10 p-3 opacity-90"
                  data-panel-slide-pane="outgoing"
                  style={{
                    transition: `opacity ${PANEL_STACK_SLIDE_MS}ms ${PANEL_STACK_EASING}`,
                  }}
                >
                  {transition.outgoing}
                </div>
                <div
                  className="w-1/2 shrink-0 p-3"
                  data-panel-slide-pane="incoming"
                >
                  {transition.incoming}
                </div>
              </>
            ) : (
              <>
                <div
                  className="w-1/2 shrink-0 p-3"
                  data-panel-slide-pane="incoming"
                >
                  {transition.incoming}
                </div>
                <div
                  className="w-1/2 shrink-0 border-l border-white/10 p-3 opacity-90"
                  data-panel-slide-pane="outgoing"
                  style={{
                    transition: `opacity ${PANEL_STACK_SLIDE_MS}ms ${PANEL_STACK_EASING}`,
                  }}
                >
                  {transition.outgoing}
                </div>
              </>
            )}
          </div>
        ) : (
          <div
            data-panel-slide-track
            data-slide-direction="none"
            className="p-3"
          >
            {settled}
          </div>
        )}
      </div>
      {footer ? (
        <div
          className="shrink-0 border-t border-white/10 p-3"
          data-testid="panel-stack-footer"
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export function PanelNavRow({
  label,
  onClick,
  testId,
  hint,
}: {
  label: string;
  onClick: () => void;
  testId?: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      className="flex min-h-11 w-full items-center justify-between rounded-md border border-white/10 px-3 text-left text-sm text-white/85 hover:bg-white/5"
      data-testid={testId}
      onClick={onClick}
    >
      <span>
        {label}
        {hint ? (
          <span className="mt-0.5 block text-[11px] text-white/65">{hint}</span>
        ) : null}
      </span>
      <span className="text-white/35" aria-hidden>
        ›
      </span>
    </button>
  );
}
