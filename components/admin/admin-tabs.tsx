"use client";

import { useState, type ReactNode } from "react";
import { LayoutDashboard, PanelsTopLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type TabId = "overview" | "landing-tiles";

const TABS: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "landing-tiles", label: "Landing tiles", icon: PanelsTopLeft },
];

export function AdminTabs({
  overview,
  landingTiles,
  defaultTab = "overview",
}: {
  overview: ReactNode;
  landingTiles: ReactNode;
  defaultTab?: TabId;
}) {
  const [tab, setTab] = useState<TabId>(defaultTab);

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Admin sections"
        className="inline-flex flex-wrap gap-1 rounded-xl border border-border/60 bg-card/40 p-1"
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" hidden={tab !== "overview"}>
        {tab === "overview" ? overview : null}
      </div>
      <div role="tabpanel" hidden={tab !== "landing-tiles"}>
        {tab === "landing-tiles" ? landingTiles : null}
      </div>
    </div>
  );
}
