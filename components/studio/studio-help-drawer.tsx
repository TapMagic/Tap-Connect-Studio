"use client";

import { useId, useState } from "react";
import { CircleHelp, X } from "lucide-react";
import { cn } from "@/lib/utils";

const TIPS = [
  {
    title: "Start from outcomes",
    body: "Use + Create → What do you want to do? Studio opens the right workspace — you do not need to memorize modules.",
  },
  {
    title: "Home tells you what next",
    body: "Recommended next, Needs attention, and Setup progress are grounded in your workspace data — not marketing tips.",
  },
  {
    title: "Browse tools when needed",
    body: "Each hub keeps advanced tools under Browse all tools so beginners are not flooded with readiness catalogs.",
  },
  {
    title: "Format expands on Cards",
    body: "In the Card builder, open Format for a full Format workspace. Quick controls stay in the inspector.",
  },
  {
    title: "Errors stay human",
    body: "If something fails, read the plain message first. Use View details only when you need technical context for support.",
  },
];

/**
 * Optional lightweight help drawer — not a documentation wall.
 */
export function StudioHelpDrawer() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="relative">
      <button
        type="button"
        className="rounded-lg border border-white/10 p-2 text-white/50 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        aria-label="Help tips"
        aria-expanded={open}
        aria-controls={panelId}
        title="Help tips"
        data-testid="studio-help-drawer-toggle"
        onClick={() => setOpen((v) => !v)}
      >
        <CircleHelp className="h-4 w-4" aria-hidden />
      </button>
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Studio help tips"
          data-testid="studio-help-drawer"
          className={cn(
            "absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-white/10 bg-[#0d1320] p-3 shadow-2xl shadow-black/50"
          )}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
              Quick tips
            </p>
            <button
              type="button"
              className="rounded p-1 text-white/40 hover:bg-white/5 hover:text-white"
              aria-label="Close help tips"
              onClick={() => setOpen(false)}
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
          <ul className="space-y-3">
            {TIPS.map((t) => (
              <li key={t.title}>
                <p className="text-sm font-medium text-white/90">{t.title}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-white/45">{t.body}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-white/8 pt-2 text-[10px] text-white/35">
            Workspace settings and recovery remain under Settings.
          </p>
          <a
            href="/dashboard?assembly=replay"
            data-testid="studio-assembly-help-replay"
            className="mt-2 inline-flex min-h-11 items-center text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            onClick={() => setOpen(false)}
          >
            Replay Studio Assembly
          </a>
        </div>
      ) : null}
    </div>
  );
}
