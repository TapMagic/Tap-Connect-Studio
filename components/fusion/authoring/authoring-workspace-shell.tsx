/**
 * Thin shared full-screen authoring shell contract.
 * Hosts Outline · Canvas · Format regions without inventing a second builder.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type AuthoringWorkspaceProps = {
  title: string;
  subtitle?: string;
  outline?: ReactNode;
  canvas: ReactNode;
  format?: ReactNode;
  toolbar?: ReactNode;
  footer?: ReactNode;
  focusMode?: boolean;
  onDone?: () => void;
  doneHref?: string;
  className?: string;
};

export function AuthoringWorkspaceShell({
  title,
  subtitle,
  outline,
  canvas,
  format,
  toolbar,
  footer,
  focusMode = false,
  onDone,
  className,
}: AuthoringWorkspaceProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col bg-[#050814] text-white",
        className
      )}
      data-testid="authoring-workspace-shell"
      data-focus-mode={focusMode ? "true" : "false"}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            Authoring workspace
          </p>
          <h1 className="truncate text-sm font-semibold">{title}</h1>
          {subtitle ? <p className="truncate text-xs text-white/55">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          {toolbar}
          {onDone ? (
            <button
              type="button"
              onClick={onDone}
              className="rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
              data-testid="authoring-done"
            >
              Done editing
            </button>
          ) : null}
        </div>
      </header>

      <div
        className={cn(
          "grid min-h-0 flex-1",
          focusMode || (!outline && !format)
            ? "grid-cols-1"
            : outline && format
              ? "grid-cols-1 lg:grid-cols-[minmax(12rem,16rem)_minmax(0,1fr)_minmax(16rem,22rem)]"
              : outline
                ? "grid-cols-1 lg:grid-cols-[minmax(12rem,16rem)_minmax(0,1fr)]"
                : "grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]"
        )}
      >
        {!focusMode && outline ? (
          <aside
            className="hidden min-h-0 overflow-y-auto border-r border-white/8 p-3 lg:block"
            data-testid="authoring-outline"
          >
            {outline}
          </aside>
        ) : null}
        <main className="min-h-0 overflow-hidden p-0" data-testid="authoring-canvas">
          {canvas}
        </main>
        {!focusMode && format ? (
          <aside
            className="min-h-0 overflow-y-auto border-t border-white/8 lg:border-l lg:border-t-0"
            data-testid="authoring-format"
          >
            {format}
          </aside>
        ) : null}
      </div>

      {footer ? (
        <footer className="shrink-0 border-t border-white/10 px-4 py-3" data-testid="authoring-footer">
          {footer}
        </footer>
      ) : null}
    </div>
  );
}
