"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  Check,
  ExternalLink,
  Loader2,
  Plug,
  Plus,
  Sparkles,
} from "lucide-react";

type ProviderRow = {
  id: string;
  name: string;
  kind: string;
  oauth: boolean;
  supportsMock: boolean;
  requiredEnvVars: string[];
  notes?: string;
};

type HealthRow = {
  provider: string;
  name: string;
  mode: string;
  liveConfigured: boolean;
  connected: boolean;
  missingEnvVars: string[];
  kind: string;
};

type WorkItem = {
  id: string;
  provider: string;
  title: string;
  status?: string;
  url?: string;
  sourceType?: string;
  syncStatus?: string;
};

type Snapshot = {
  category: string;
  defaultProvider: string | null;
  displayStatus: string;
  note: string;
  providers: ProviderRow[];
  health: HealthRow[];
  items: WorkItem[];
  connections: { provider: string; mode: string }[];
  knowledge: { id: string; title: string; provider: string }[];
};

function modeBadge(mode: string) {
  if (mode === "live_ready") return "border-primary/50 text-primary";
  if (mode === "mock") return "border-emerald-500/40 text-emerald-300";
  if (mode === "credentials_required") return "border-sky-500/40 text-sky-200";
  return "border-white/15 text-white/45";
}

export function ProductivityWorkPanel({ className }: { className?: string }) {
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [title, setTitle] = useState("Follow up from Tap Connect");
  const [message, setMessage] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/connectors/productivity");
      const json = await res.json();
      if (res.ok) setData(json);
      else setMessage(json.error ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/connectors/productivity");
        const json = await res.json();
        if (cancelled) return;
        if (res.ok) setData(json);
        else setMessage(json.error ?? "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function post(body: Record<string, unknown>, key: string) {
    setBusy(key);
    setMessage(null);
    try {
      const res = await fetch("/api/connectors/productivity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json.error ?? "Action failed");
        return;
      }
      setMessage(
        json.displayStatus
          ? String(json.displayStatus)
          : json.steps
            ? `Closeout: ${json.ok ? "PASS" : "FAIL"} (${json.steps.filter((s: { ok: boolean }) => s.ok).length}/${json.steps.length})`
            : json.item
              ? `Created: ${json.item.title}`
              : json.workspaces
                ? `Discovered ${json.workspaces.length} workspace(s)`
                : json.runId
                  ? `Automation run ${json.runId}`
                  : json.id
                    ? `Recorded ${json.id}`
                    : json.synced != null
                      ? `Polled: ${json.synced} synced`
                      : "Done"
      );
      await reload();
    } finally {
      setBusy(null);
    }
  }

  if (loading && !data) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-white/50", className)}>
        <Loader2 className="h-4 w-4 animate-spin" /> Loading Productivity & Work Management…
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-red-300">{message ?? "Unavailable"}</p>;
  }

  return (
    <div className={cn("space-y-6", className)}>
      <header className="space-y-2 border-b border-white/8 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          Settings → Integrations
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-lg font-semibold text-white">Provider adapters</h3>
          <Badge
            variant="outline"
            className="border-sky-500/40 text-sky-200"
          >
            Mock ready · live gated
          </Badge>
        </div>
        <p className="max-w-3xl text-sm text-white/55">
          First-class adapters for monday.com, Asana, ClickUp, Planner, Teams, Slack, Notion, Jira,
          Trello, GitHub, Google Calendar/Drive, Outlook, OneDrive, Airtable, Zapier, Make, and n8n.
          One canonical ExternalWorkItem model. Mock adapters work now; live OAuth stays credential-gated.
        </p>
        <p className="text-xs text-white/40">{data.note}</p>
      </header>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-white/35">
          Create task / send to work platform
        </h3>
        <div className="flex flex-wrap gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="max-w-md bg-white/[0.03]"
            placeholder="Task title"
          />
          <Button
            size="sm"
            className="bg-primary text-primary-foreground"
            data-testid="productivity-create-task"
            disabled={!!busy}
            onClick={() =>
              post(
                {
                  action: "bridge",
                  bridge: "manualCreate",
                  title,
                  notifyCollab: false,
                },
                "create"
              )
            }
          >
            <Plus className="mr-1 h-4 w-4" />
            Create task
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!!busy}
            onClick={() =>
              post(
                {
                  action: "bridge",
                  bridge: "inboxFollowUpToTask",
                  title: `Inbox follow-up: ${title}`,
                  sourceId: `inbox_${Date.now()}`,
                },
                "inbox"
              )
            }
          >
            Create follow-up
          </Button>
          <Button
            size="sm"
            variant="outline"
            data-testid="productivity-run-closeout"
            disabled={!!busy}
            onClick={() => post({ action: "run_closeout" }, "closeout")}
          >
            Run closeout proof
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!!busy}
            onClick={() =>
              post(
                {
                  action: "bridge",
                  bridge: "providerFailureToIncident",
                  title: `Provider failure: ${title}`,
                  sourceId: `fail_${Date.now()}`,
                  notifyCollab: true,
                },
                "incident"
              )
            }
          >
            Incident task
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!!busy}
            onClick={() =>
              post(
                {
                  action: "discover",
                  provider: data.defaultProvider ?? "monday",
                },
                "discover"
              )
            }
          >
            Discover boards
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!!busy}
            onClick={() =>
              post(
                {
                  action: "poll_sync",
                  provider: data.defaultProvider ?? "monday",
                },
                "poll"
              )
            }
          >
            Poll sync
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!!busy}
            onClick={() =>
              post(
                {
                  action: "ingest_knowledge",
                  provider: "notion",
                  title: "Brand guide (mock)",
                  excerpt: "Neon lime accents; Tap Connect is product name.",
                },
                "know"
              )
            }
          >
            Ingest knowledge
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!!busy}
            onClick={() =>
              post(
                {
                  action: "collab_approval",
                  provider: "slack",
                  text: `Approve: ${title}`,
                },
                "approval"
              )
            }
          >
            Slack approval
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!!busy}
            onClick={() =>
              post(
                {
                  action: "automation_action",
                  provider: "zapier",
                  automationAction: "create_external_task",
                  idempotencyKey: `zap_${Date.now()}`,
                },
                "zap"
              )
            }
          >
            Zapier action
          </Button>
        </div>
        {message ? <p className="text-xs text-primary/90">{message}</p> : null}
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-white/35">
          Providers ({data.providers.length})
        </h3>
        <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {data.health.map((h) => {
            const def = data.providers.find((p) => p.id === h.provider);
            return (
              <li
                key={h.provider}
                className="rounded-xl border border-white/8 bg-white/[0.02] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-white/90">{h.name}</p>
                    <p className="text-[11px] text-white/40">{h.kind.replace(/_/g, " ")}</p>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px]", modeBadge(h.mode))}>
                    {h.mode === "mock"
                      ? "Mock"
                      : h.mode === "live_ready"
                        ? "Live ready"
                        : h.mode === "credentials_required"
                          ? "Credentials"
                          : "Off"}
                  </Badge>
                </div>
                {def?.notes ? (
                  <p className="mt-1 text-[11px] text-white/45">{def.notes}</p>
                ) : null}
                {!h.liveConfigured && h.missingEnvVars.length > 0 ? (
                  <p className="mt-2 font-mono text-[10px] text-white/30">
                    {h.missingEnvVars.slice(0, 3).join(", ")}
                    {h.missingEnvVars.length > 3 ? "…" : ""}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={!!busy}
                    onClick={() =>
                      post({ action: "connect", provider: h.provider }, `c-${h.provider}`)
                    }
                    data-testid={`productivity-connect-${h.provider}`}
                  >
                    <Plug className="mr-1 h-3 w-3" />
                    {h.connected ? "Reconnect" : "Connect mock"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    disabled={!!busy}
                    onClick={() =>
                      post({ action: "set_default", provider: h.provider }, `d-${h.provider}`)
                    }
                    data-testid={`productivity-default-${h.provider}`}
                  >
                    {data.defaultProvider === h.provider ? (
                      <>
                        <Check className="mr-1 h-3 w-3 text-primary" /> Default
                      </>
                    ) : (
                      "Set default"
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    disabled={!!busy}
                    onClick={() =>
                      post({ action: "discover", provider: h.provider }, `disc-${h.provider}`)
                    }
                  >
                    Discover
                  </Button>
                  {h.connected ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-white/40"
                      disabled={!!busy}
                      onClick={() =>
                        post({ action: "disconnect", provider: h.provider }, `x-${h.provider}`)
                      }
                    >
                      Disconnect
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-white/35">
          External work items
        </h3>
        {data.items.length === 0 ? (
          <p className="text-sm text-white/45">No work items yet — create a task above.</p>
        ) : (
          <ul className="divide-y divide-white/6 overflow-hidden rounded-xl border border-white/8">
            {data.items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div>
                  <p className="text-sm text-white/90">{item.title}</p>
                  <p className="text-[11px] text-white/40">
                    {item.provider} · {item.sourceType ?? "manual"} · {item.syncStatus ?? "—"}
                  </p>
                </div>
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Open external <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-4 w-4" />
          <p className="text-sm font-medium">Authority boundary</p>
        </div>
        <p className="mt-2 text-xs text-white/55">
          TapConnect remains authoritative for Cards, Experiences, Campaigns, Tap Points, Contacts,
          Relationships, consent, TapSave, loyalty, commerce, and analytics. Connected platforms remain
          authoritative for their native task/work-item state. Knowledge ingest from Notion / Drive /
          OneDrive grounds TapGuide and Autopilot when connected.
        </p>
      </section>
    </div>
  );
}

/** Compact contextual actions for hubs / cases / inbox */
export function WorkPlatformActions({
  defaultTitle,
  sourceType = "manual",
  sourceId,
}: {
  defaultTitle: string;
  sourceType?: string;
  sourceId?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/connectors/productivity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_item",
          title: defaultTitle,
          sourceType,
          sourceId,
        }),
      });
      const json = await res.json();
      setMsg(res.ok ? `Sent → ${json.item?.provider ?? "work platform"}` : json.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => void create()}
        data-testid="inbox-send-work-platform"
      >
        <Briefcase className="mr-1 h-3.5 w-3.5" />
        Send to work platform
      </Button>
      {msg ? <span className="text-[11px] text-white/50">{msg}</span> : null}
    </div>
  );
}
