"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CircleHelp,
  Command,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthControls } from "@/components/auth/auth-controls";
import { isClerkConfigured } from "@/lib/utils/app";
import { CREATE_ACTIONS, studioSearchIndex } from "@/lib/fusion/studio/ia";
import { safeDisplayLabel } from "@/lib/fusion/readiness/display-status";
import { cn } from "@/lib/utils";

export function StudioTopBar({
  businessName,
  readinessLabel = "Local demo",
  alertCount = 0,
}: {
  businessName: string;
  readinessLabel?: string;
  alertCount?: number;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");

  const index = useMemo(() => studioSearchIndex(), []);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return index.slice(0, 24);
    return index.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.hint.toLowerCase().includes(q) ||
        i.href.toLowerCase().includes(q)
    ).slice(0, 32);
  }, [index, query]);

  const go = useCallback(
    (href: string) => {
      setPaletteOpen(false);
      setCreateOpen(false);
      setQuery("");
      router.push(href);
    },
    [router]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setPaletteOpen(false);
        setCreateOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const createGroups = useMemo(() => {
    const map = new Map<string, typeof CREATE_ACTIONS>();
    for (const a of CREATE_ACTIONS) {
      const list = map.get(a.group) ?? [];
      list.push(a);
      map.set(a.group, list);
    }
    return [...map.entries()];
  }, []);

  return (
    <header className="relative z-30 flex shrink-0 items-center gap-3 border-b border-white/8 bg-[#0a0f1a]/95 px-3 py-2.5 backdrop-blur lg:px-5">
      <div className="hidden min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 sm:flex">
        <span className="text-[10px] uppercase tracking-wide text-white/35">Business</span>
        <span className="max-w-[10rem] truncate text-xs font-medium text-white/85 lg:max-w-[14rem]">
          {businessName}
        </span>
        <span className="hidden text-white/20 lg:inline">·</span>
        <span className="hidden text-[11px] text-white/40 lg:inline">All locations</span>
      </div>

      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-xs text-white/40 transition hover:border-primary/30 hover:text-white/70"
      >
        <Search className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate">Search Studio…</span>
        <span className="ml-auto hidden items-center gap-1 rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/35 sm:inline-flex">
          <Command className="h-3 w-3" />K
        </span>
      </button>

      <div className="relative">
        <Button
          type="button"
          size="sm"
          className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => setCreateOpen((v) => !v)}
          aria-expanded={createOpen}
          aria-haspopup="menu"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Create
        </Button>
        {createOpen ? (
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 max-h-[70vh] w-72 overflow-y-auto rounded-xl border border-white/10 bg-[#0d1320] p-2 shadow-2xl shadow-black/50"
          >
            {createGroups.map(([group, actions]) => (
              <div key={group} className="mb-2">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/30">
                  {group}
                </p>
                {actions.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    role="menuitem"
                    className="flex w-full flex-col rounded-lg px-2 py-1.5 text-left hover:bg-white/5"
                    onClick={() => go(a.href)}
                  >
                    <span className="text-sm text-white/90">{a.label}</span>
                    <span className="text-[11px] text-white/40">
                      {a.description} · {safeDisplayLabel(a.maturity)}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] sm:flex",
          alertCount > 0
            ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
            : "border-primary/30 bg-primary/10 text-primary"
        )}
        title="Workspace readiness"
      >
        <Sparkles className="h-3 w-3" aria-hidden />
        {readinessLabel}
        {alertCount > 0 ? ` · ${alertCount}` : ""}
      </div>

      <button
        type="button"
        className="relative rounded-lg border border-white/10 p-2 text-white/50 hover:bg-white/5 hover:text-white"
        aria-label="Notifications"
        title="Activity feed — Functional"
      >
        <Bell className="h-4 w-4" />
        {alertCount > 0 ? (
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
        ) : null}
      </button>

      <Link
        href="/dashboard/settings"
        className="rounded-lg border border-white/10 p-2 text-white/50 hover:bg-white/5 hover:text-white"
        aria-label="Help and settings"
        title="Help · Settings"
      >
        <CircleHelp className="h-4 w-4" />
      </Link>

      {isClerkConfigured() ? (
        <AuthControls />
      ) : (
        <span className="hidden text-[11px] text-white/35 lg:inline">Dev session</span>
      )}

      {paletteOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[12vh]"
          onClick={() => setPaletteOpen(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#0d1320] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Command palette"
          >
            <div className="flex items-center gap-2 border-b border-white/8 px-3 py-2">
              <Search className="h-4 w-4 text-white/40" aria-hidden />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Jump to a destination, pillar, or create action…"
                className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                aria-label="Command search"
              />
            </div>
            <ul className="max-h-80 overflow-y-auto p-2">
              {filtered.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-white/5"
                    onClick={() => go(item.href)}
                  >
                    <span className="text-sm text-white/90">{item.label}</span>
                    <span className="truncate text-[11px] text-white/35">{item.hint}</span>
                  </button>
                </li>
              ))}
              {filtered.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-white/40">No matches</li>
              ) : null}
            </ul>
          </div>
        </div>
      ) : null}
    </header>
  );
}
