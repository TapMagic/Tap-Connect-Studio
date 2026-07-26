"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
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
import {
  CREATE_ACTIONS,
  createActionMenuLabel,
  studioSearchIndex,
} from "@/lib/fusion/studio/ia";
import { safeDisplayLabel } from "@/lib/fusion/readiness/display-status";
import { cn } from "@/lib/utils";

export function StudioTopBar({
  businessName,
  readinessLabel = "Local demo",
  readinessTone = "healthy",
  readinessReasons = [],
  readinessHref = "/dashboard",
  alertCount = 0,
}: {
  businessName: string;
  readinessLabel?: string;
  readinessTone?: "setup" | "attention" | "healthy";
  readinessReasons?: string[];
  readinessHref?: string;
  alertCount?: number;
}) {
  const router = useRouter();
  const createMenuId = useId();
  const notificationsMenuId = useId();
  const createBtnRef = useRef<HTMLButtonElement>(null);
  const searchBtnRef = useRef<HTMLButtonElement>(null);
  const notificationsBtnRef = useRef<HTMLButtonElement>(null);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const notificationsMenuRef = useRef<HTMLDivElement>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");

  const index = useMemo(() => studioSearchIndex(), []);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return index.slice(0, 24);
    return index
      .filter(
        (i) =>
          i.label.toLowerCase().includes(q) ||
          i.hint.toLowerCase().includes(q) ||
          i.href.toLowerCase().includes(q)
      )
      .slice(0, 32);
  }, [index, query]);

  const closeCreate = useCallback((restoreFocus = false) => {
    setCreateOpen(false);
    if (restoreFocus) createBtnRef.current?.focus();
  }, []);

  const closeNotifications = useCallback((restoreFocus = false) => {
    setNotificationsOpen(false);
    if (restoreFocus) notificationsBtnRef.current?.focus();
  }, []);

  const closePalette = useCallback((restoreFocus = false) => {
    setPaletteOpen(false);
    setQuery("");
    if (restoreFocus) searchBtnRef.current?.focus();
  }, []);

  const go = useCallback(
    (href: string) => {
      setPaletteOpen(false);
      setCreateOpen(false);
      setNotificationsOpen(false);
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
        if (paletteOpen) {
          e.preventDefault();
          closePalette(true);
        } else if (createOpen) {
          e.preventDefault();
          closeCreate(true);
        } else if (notificationsOpen) {
          e.preventDefault();
          closeNotifications(true);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    paletteOpen,
    createOpen,
    notificationsOpen,
    closePalette,
    closeCreate,
    closeNotifications,
  ]);

  useEffect(() => {
    if (!createOpen) return;
    function onPointer(e: MouseEvent) {
      const t = e.target as Node;
      if (
        createMenuRef.current?.contains(t) ||
        createBtnRef.current?.contains(t)
      ) {
        return;
      }
      closeCreate(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [createOpen, closeCreate]);

  useEffect(() => {
    if (!notificationsOpen) return;
    function onPointer(e: MouseEvent) {
      const t = e.target as Node;
      if (
        notificationsMenuRef.current?.contains(t) ||
        notificationsBtnRef.current?.contains(t)
      ) {
        return;
      }
      closeNotifications(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [notificationsOpen, closeNotifications]);

  useEffect(() => {
    if (!createOpen) return;
    const first = createMenuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
    first?.focus();
  }, [createOpen]);

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
    <header
      role="banner"
      className="relative z-30 flex shrink-0 items-center gap-3 border-b border-white/8 bg-[#0a0f1a]/95 px-3 py-2.5 backdrop-blur lg:px-5"
    >
      <div
        className="hidden min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 sm:flex"
        data-testid="studio-workspace-chip"
        title="Single-workspace context — multi-location switching is not shipped"
      >
        <span className="text-[10px] uppercase tracking-wide text-white/60">Workspace</span>
        <span className="max-w-[10rem] truncate text-xs font-medium text-white/90 lg:max-w-[14rem]">
          {businessName}
        </span>
        <span className="hidden text-white/55 lg:inline">·</span>
        <span className="hidden text-[11px] text-white/55 lg:inline">This workspace</span>
      </div>

      <button
        ref={searchBtnRef}
        type="button"
        onClick={() => setPaletteOpen(true)}
        aria-label="Search Studio"
        className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-xs text-white/55 transition hover:border-primary/30 hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <Search className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate">Search Studio…</span>
        <span className="ml-auto hidden items-center gap-1 rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/55 sm:inline-flex">
          <Command className="h-3 w-3" />K
        </span>
      </button>

      <div className="relative">
        <Button
          ref={createBtnRef}
          type="button"
          size="sm"
          className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => setCreateOpen((v) => !v)}
          aria-expanded={createOpen}
          aria-haspopup="menu"
          aria-controls={createMenuId}
          data-testid="studio-create-button"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Create
        </Button>
        {createOpen ? (
          <div
            ref={createMenuRef}
            id={createMenuId}
            role="menu"
            aria-label="Create actions"
            data-testid="studio-create-menu"
            className="absolute right-0 top-full z-50 mt-2 max-h-[70vh] w-72 overflow-y-auto rounded-xl border border-white/10 bg-[#0d1320] p-2 shadow-2xl shadow-black/50"
          >
            {createGroups.map(([group, actions]) => (
              <div key={group} className="mb-2">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/30">
                  {group}
                </p>
                {actions.map((a) => {
                  const intent = a.intent ?? "create";
                  const unavailable = intent === "unavailable";
                  return (
                    <button
                      key={a.id}
                      type="button"
                      role="menuitem"
                      data-testid={`studio-create-${a.id}`}
                      data-create-intent={intent}
                      disabled={unavailable}
                      aria-disabled={unavailable}
                      title={
                        unavailable
                          ? a.unavailableReason ?? a.description
                          : a.description
                      }
                      className={cn(
                        "flex w-full flex-col rounded-lg px-2 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                        unavailable
                          ? "cursor-not-allowed opacity-45"
                          : "hover:bg-white/5 focus-visible:bg-white/5"
                      )}
                      onClick={() => {
                        if (unavailable) return;
                        go(a.href);
                      }}
                    >
                      <span className="text-sm text-white/90">
                        {createActionMenuLabel(a)}
                      </span>
                      <span className="text-[11px] text-white/40">
                        {unavailable
                          ? a.unavailableReason
                          : `${a.description} · ${safeDisplayLabel(a.maturity)}`}
                        {!unavailable && intent === "open" ? " · opens hub" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <Link
        href={readinessHref}
        data-testid="studio-readiness-pill"
        data-readiness-tone={readinessTone}
        className={cn(
          "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] sm:flex",
          readinessTone === "attention"
            ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
            : readinessTone === "setup"
              ? "border-sky-500/35 bg-sky-500/10 text-sky-100"
              : "border-primary/30 bg-primary/10 text-primary"
        )}
        role="status"
        aria-live="polite"
        title={
          readinessReasons.length
            ? readinessReasons.join(" · ")
            : "Workspace readiness"
        }
      >
        <Sparkles className="h-3 w-3" aria-hidden />
        {readinessLabel}
        {alertCount > 0 ? ` · ${alertCount}` : ""}
      </Link>

      <div className="relative">
        <button
          ref={notificationsBtnRef}
          type="button"
          className="relative rounded-lg border border-white/10 p-2 text-white/50 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label={
            alertCount > 0
              ? `Notifications, ${alertCount} failed delivery job${alertCount === 1 ? "" : "s"}`
              : "Notifications"
          }
          aria-expanded={notificationsOpen}
          aria-haspopup="dialog"
          aria-controls={notificationsMenuId}
          title={
            alertCount > 0
              ? `${alertCount} failed outbox job${alertCount === 1 ? "" : "s"} — open recovery`
              : "Delivery alerts — empty when no failed outbox jobs"
          }
          data-testid="studio-notifications-button"
          onClick={() => setNotificationsOpen((v) => !v)}
        >
          <Bell className="h-4 w-4" aria-hidden />
          {alertCount > 0 ? (
            <span
              className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-400"
              aria-hidden
            />
          ) : null}
        </button>
        {notificationsOpen ? (
          <div
            ref={notificationsMenuRef}
            id={notificationsMenuId}
            role="dialog"
            aria-label="Notifications"
            data-testid="studio-notifications-panel"
            className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-white/10 bg-[#0d1320] p-3 shadow-2xl shadow-black/50"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
              Delivery alerts
            </p>
            {alertCount > 0 ? (
              <div className="mt-2 space-y-2">
                <p className="text-sm text-amber-100">
                  {alertCount} failed outbox job{alertCount === 1 ? "" : "s"} need recovery.
                </p>
                <p className="text-[11px] text-white/45">
                  Studio badges only track failed delivery jobs for this workspace — not a full
                  activity feed.
                </p>
                <Button
                  type="button"
                  size="sm"
                  className="w-full"
                  data-testid="studio-notifications-recover"
                  onClick={() => go("/dashboard/settings#outbox")}
                >
                  Open outbox recovery
                </Button>
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                <p className="text-sm text-white/80">No failed delivery jobs</p>
                <p className="text-[11px] text-white/45">
                  Notifications here are limited to outbox dead letters. There is no separate
                  activity inbox yet.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full border-white/15 bg-transparent text-white/80 hover:bg-white/5"
                  data-testid="studio-notifications-outbox"
                  onClick={() => go("/dashboard/settings#outbox")}
                >
                  View outbox on Settings
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <Link
        href="/dashboard/settings"
        className="rounded-lg border border-white/10 p-2 text-white/50 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        aria-label="Help and settings"
        title="Help · Settings"
      >
        <CircleHelp className="h-4 w-4" />
      </Link>

      {isClerkConfigured() ? (
        <AuthControls />
      ) : (
        <span className="hidden text-[11px] text-white/55 lg:inline">Dev session</span>
      )}

      {paletteOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[12vh]"
          onClick={() => closePalette(true)}
          role="presentation"
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#0d1320] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            data-testid="studio-command-palette"
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
            <ul className="max-h-80 overflow-y-auto p-2" role="listbox" aria-label="Search results">
              {filtered.map((item) => (
                <li key={item.id} role="option" aria-selected={false}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    onClick={() => go(item.href)}
                  >
                    <span className="text-sm text-white/90">{item.label}</span>
                    <span className="truncate text-[11px] text-white/55">{item.hint}</span>
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
