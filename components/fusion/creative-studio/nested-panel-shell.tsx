"use client";

import { useEffect, useRef, type ReactNode } from "react";
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

/**
 * Shared nested panel chrome — Back one level · Close · breadcrumb · title.
 * Levels slide horizontally in the same inspector space.
 * Escape backs one level when available, otherwise closes the inspector.
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
  const prevDepthRef = useRef(depth);
  const slideDirection: "forward" | "back" | "none" =
    depth > prevDepthRef.current
      ? "forward"
      : depth < prevDepthRef.current
        ? "back"
        : "none";
  useEffect(() => {
    prevDepthRef.current = depth;
  }, [depth]);

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

  return (
    <div
      className={cn("flex min-h-0 flex-col", className)}
      data-testid={testId}
      data-sliding-panel-stack="true"
      data-panel-depth={String(depth)}
      data-panel-slide-direction={slideDirection}
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
        <div
          key={`panel-depth-${depth}`}
          data-panel-slide-track
          data-slide-direction={slideDirection}
          className={cn(
            "min-h-0 p-3",
            slideDirection === "forward" && "tc-panel-slide-forward",
            slideDirection === "back" && "tc-panel-slide-back"
          )}
        >
          {children}
        </div>
      </div>
      {footer ? (
        <div className="shrink-0 border-t border-white/10 p-3" data-testid="panel-stack-footer">
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
          <span className="mt-0.5 block text-[11px] text-white/40">{hint}</span>
        ) : null}
      </span>
      <span className="text-white/35" aria-hidden>
        ›
      </span>
    </button>
  );
}
