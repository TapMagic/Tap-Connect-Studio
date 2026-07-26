"use client";

import { useId, useState, type ReactNode } from "react";
import {
  AlignLeft,
  Layers,
  LayoutGrid,
  Palette,
  Settings2,
  Type,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type FormatWorkspaceTab =
  | "typography"
  | "style"
  | "layout"
  | "appearance"
  | "advanced";

const TABS: Array<{
  id: FormatWorkspaceTab;
  label: string;
  icon: typeof Type;
  disclosure: "basic" | "contextual" | "advanced";
}> = [
  { id: "typography", label: "Typography", icon: Type, disclosure: "basic" },
  { id: "style", label: "Style", icon: Palette, disclosure: "basic" },
  { id: "layout", label: "Layout", icon: LayoutGrid, disclosure: "contextual" },
  { id: "appearance", label: "Appearance", icon: AlignLeft, disclosure: "contextual" },
  { id: "advanced", label: "Advanced", icon: Settings2, disclosure: "advanced" },
];

/**
 * Expanded Format workspace — Pages/Keynote depth without cloning chrome.
 * Contextual inspector stays available; this is the full Format surface.
 */
export function FormatWorkspace({
  open,
  onClose,
  title = "Format",
  subtitle = "Typography, style, layout, and appearance for the current selection.",
  children,
  defaultTab = "typography",
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  /** Render prop or map of tab → content */
  children: ReactNode | ((tab: FormatWorkspaceTab) => ReactNode);
  defaultTab?: FormatWorkspaceTab;
  className?: string;
}) {
  const titleId = useId();
  const [tab, setTab] = useState<FormatWorkspaceTab>(defaultTab);

  if (!open) return null;

  const body = typeof children === "function" ? children(tab) : children;

  return (
    <aside
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      data-testid="format-workspace"
      className={cn(
        "flex min-h-0 w-full flex-col border-l border-border/60 bg-[#0a0f1a] max-lg:max-h-[55vh] lg:w-[26rem] lg:shrink-0",
        className
      )}
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-white/8 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            Format workspace
          </p>
          <h2 id={titleId} className="mt-0.5 text-sm font-semibold text-white">
            {title}
          </h2>
          <p className="mt-1 text-[11px] leading-snug text-white/45">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-white/10 p-2 text-white/55 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="Close Format workspace"
          data-testid="format-workspace-close"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </header>

      <div
        role="tablist"
        aria-label="Format categories"
        className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-white/8 px-2 py-1.5"
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const selected = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={selected}
              data-testid={`format-tab-${t.id}`}
              data-disclosure={t.disclosure}
              className={cn(
                "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium transition",
                selected
                  ? "bg-primary/15 text-primary"
                  : "text-white/50 hover:bg-white/5 hover:text-white/85"
              )}
              onClick={() => setTab(t.id)}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {t.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4"
        data-testid={`format-panel-${tab}`}
      >
        {body}
      </div>

      <footer className="shrink-0 border-t border-white/8 px-4 py-2">
        <p className="flex items-center gap-1.5 text-[10px] text-white/35">
          <Layers className="h-3 w-3" aria-hidden />
          Advanced controls stay available — beginners can stay on Typography and Style.
        </p>
      </footer>
    </aside>
  );
}

/** Compact trigger for builders */
export function FormatWorkspaceTrigger({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-testid="format-workspace-trigger"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        active
          ? "border-primary/40 bg-primary/15 text-primary"
          : "border-white/10 bg-white/[0.03] text-white/70 hover:border-primary/30 hover:text-white"
      )}
    >
      <Type className="h-3.5 w-3.5" aria-hidden />
      Format
    </button>
  );
}
