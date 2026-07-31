"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Building2, Check, ChevronDown, ExternalLink, Search, Shield, UserRound } from "lucide-react";
import type { WorkspaceMenuModel } from "@/lib/workspace/context";

export function WorkspaceAccessMenu({
  model,
  surface,
}: {
  model: WorkspaceMenuModel;
  surface: "control" | "studio";
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return model.groups;
    return model.groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          `${item.name} ${item.kind} ${item.role}`.toLowerCase().includes(needle),
        ),
      }))
      .filter((group) => group.items.length);
  }, [model.groups, query]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  async function openStudio(businessId: string) {
    setBusyId(businessId);
    setError("");
    const returnTo =
      surface === "control"
        ? `${window.location.pathname}${window.location.search}`
        : model.returnToControlRoom;
    const response = await fetch("/api/workspace/context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, returnTo }),
    });
    const result = (await response.json()) as { href?: string; error?: string };
    if (!response.ok || !result.href) {
      setError(result.error ?? "Workspace could not be opened.");
      setBusyId("");
      return;
    }
    window.location.assign(result.href);
  }

  async function switchFixture(identity: "rich" | "daniel") {
    setError("");
    const response = await fetch("/api/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operation: "identity.switch", data: { identity } }),
    });
    if (!response.ok) {
      setError("Local identity could not be switched.");
      return;
    }
    window.location.assign("/control");
  }

  return (
    <div className="relative" ref={root} data-testid={`${surface}-workspace-menu`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex min-h-9 max-w-[18rem] items-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-2.5 text-left text-xs text-white/85 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
      >
        <Building2 className="h-4 w-4 shrink-0" aria-hidden />
        <span className="min-w-0">
          <strong className="block truncate font-medium">
            {model.currentWorkspaceName ?? "Choose workspace"}
          </strong>
          <small className="block truncate text-[10px] text-white/50">{model.mode.label}</small>
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Workspace and user menu"
          className="absolute right-0 top-full z-[80] mt-2 w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-white/12 bg-[#0d1320] text-white shadow-2xl shadow-black/60"
        >
          <div className="border-b border-white/10 p-3">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-400/15 text-emerald-300">
                <UserRound className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-sm">{model.actor.name}</strong>
                <small className="block truncate text-[11px] text-white/50">{model.actor.email}</small>
              </span>
            </div>
            <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] p-2">
              <span className="flex items-center gap-1.5 text-xs font-medium">
                <Shield className="h-3.5 w-3.5 text-emerald-300" aria-hidden />
                {model.mode.label}
              </span>
              <small className="mt-1 block text-[10px] text-white/50">{model.mode.detail}</small>
            </div>
          </div>
          <label className="m-3 flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2.5">
            <Search className="h-3.5 w-3.5 text-white/40" aria-hidden />
            <span className="sr-only">Search workspaces</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search workspaces…"
              className="h-9 min-w-0 flex-1 border-0 bg-transparent text-xs text-white outline-none placeholder:text-white/35"
            />
          </label>
          <div className="max-h-72 overflow-y-auto px-2 pb-2">
            {groups.map((group) => (
              <section key={group.id} className="mb-2">
                <h3 className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/40">
                  {group.label}
                </h3>
                {group.items.map((item) => (
                  <button
                    key={`${group.id}-${item.id}`}
                    type="button"
                    onClick={() => void openStudio(item.id)}
                    disabled={Boolean(busyId) || model.mode.readOnly}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-white/[0.06] disabled:opacity-50"
                  >
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-xs font-medium">{item.name}</strong>
                      <small className="block text-[10px] text-white/45">
                        {item.kind.toLowerCase().replaceAll("_", " ")} · {item.role.toLowerCase()}
                      </small>
                    </span>
                    {model.currentWorkspaceId === item.id ? (
                      <Check className="h-4 w-4 text-emerald-300" aria-label="Current workspace" />
                    ) : (
                      <ExternalLink className="h-3.5 w-3.5 text-white/30" aria-hidden />
                    )}
                  </button>
                ))}
              </section>
            ))}
            {!groups.length ? <p className="px-3 py-6 text-center text-xs text-white/45">No matching workspaces.</p> : null}
            {error ? <p className="m-2 rounded-lg bg-red-400/10 p-2 text-xs text-red-200" role="alert">{error}</p> : null}
          </div>
          <div className="flex items-center justify-between border-t border-white/10 p-2">
            <div className="flex flex-wrap items-center gap-1">
              <Link href="/dashboard/settings" className="rounded-lg px-2 py-2 text-xs text-white/70 hover:bg-white/[0.06]">
                Account settings
              </Link>
              <Link href="/control?section=businesses" className="rounded-lg px-2 py-2 text-xs text-white/70 hover:bg-white/[0.06]">
                Control Room
              </Link>
            </div>
            <Link href={surface === "studio" ? model.returnToControlRoom : "/dashboard"} className="rounded-lg px-2 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-400/10">
              {surface === "studio" ? "Return to Control Room" : "Open Studio"}
            </Link>
          </div>
          {model.actor.localFixture ? (
            <div className="flex items-center gap-2 border-t border-white/10 px-3 py-2 text-[10px] text-white/45">
              <span>Local identity</span>
              <button type="button" className="rounded px-2 py-1 hover:bg-white/10 hover:text-white" onClick={() => void switchFixture("rich")}>Rich</button>
              <button type="button" className="rounded px-2 py-1 hover:bg-white/10 hover:text-white" onClick={() => void switchFixture("daniel")}>Daniel</button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function OpenWorkspaceInStudio({
  businessId,
  children = "Open in Studio",
  className = "",
  href = "/dashboard",
}: {
  businessId: string;
  children?: React.ReactNode;
  className?: string;
  href?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function open() {
    setBusy(true);
    setError("");
    const response = await fetch("/api/workspace/context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId,
        returnTo: `${window.location.pathname}${window.location.search}`,
      }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(result.error ?? "Workspace could not be opened.");
      setBusy(false);
      return;
    }
    window.location.assign(href);
  }

  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        onClick={() => void open()}
        disabled={busy}
        className={className}
        data-testid={`open-studio-${businessId}`}
      >
        {busy ? "Opening…" : children}
      </button>
      {error ? <small className="text-[10px] text-red-300" role="alert">{error}</small> : null}
    </span>
  );
}
