"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type CanvasNode = {
  id: string;
  kind: string;
  label: string;
  sketch?: boolean;
  liveStatus?: string;
  linked?: { type: string; id: string } | null;
  data?: Record<string, unknown>;
};

type TapCanvas = {
  id: string;
  name: string;
  mode: string;
  version: number;
  nodes: CanvasNode[];
  edges: { id: string; source: string; target: string; sketch?: boolean }[];
};

type Template = { id: string; name: string };

export function TapCanvasShell({
  initialLinkType,
  initialLinkId,
  initialCanvasId,
}: {
  initialLinkType?: string;
  initialLinkId?: string;
  initialCanvasId?: string;
}) {
  const [canvases, setCanvases] = useState<TapCanvas[]>([]);
  const [canvas, setCanvas] = useState<TapCanvas | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stickyLabel, setStickyLabel] = useState("Idea sticky");
  const [proposals, setProposals] = useState<
    Array<{ id: string; title: string; status: string; severity: string }>
  >([]);
  const [persistence, setPersistence] = useState<"prisma" | "memory" | null>(null);

  const reloadList = useCallback(async () => {
    const res = await fetch("/api/canvas");
    const json = await res.json();
    if (res.ok) {
      setCanvases(json.canvases ?? []);
      setTemplates(json.templates ?? []);
      if (json.persistence === "prisma" || json.persistence === "memory") {
        setPersistence(json.persistence);
      }
    }
  }, []);

  const loadCanvas = useCallback(async (id: string) => {
    const res = await fetch(`/api/canvas?canvasId=${encodeURIComponent(id)}`);
    const json = await res.json();
    if (res.ok) {
      setCanvas(json.canvas);
      setProposals(json.proposals ?? []);
    } else {
      setMessage(json.error ?? "Failed to load canvas");
    }
  }, []);

  useEffect(() => {
    void reloadList().then(() => {
      if (initialCanvasId) void loadCanvas(initialCanvasId);
    });
  }, [reloadList, loadCanvas, initialCanvasId]);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/canvas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || json.ok === false) {
        setMessage(json.error ?? JSON.stringify(json.warnings ?? json));
      } else {
        setMessage(json.message ?? "OK");
        if (json.canvas) {
          setCanvas(json.canvas);
          await loadCanvas(json.canvas.id);
        } else if (canvas) {
          await loadCanvas(canvas.id);
        }
        await reloadList();
        if (json.proposals) setProposals(json.proposals);
        if (json.evaluation) {
          setMessage(
            json.evaluation.allowed
              ? `Allowed: ${json.evaluation.reason}`
              : `Blocked (${json.evaluation.code}): ${json.evaluation.reason}`
          );
        }
        if (json.conflicts) {
          setMessage(`Conflicts: ${json.conflicts.length}`);
        }
        if (json.overlay) {
          setMessage(
            `Operate: ${json.overlay.nodes?.length ?? 0} nodes · ${json.overlay.blocks?.length ?? 0} blocks`
          );
        }
      }
      return json;
    } finally {
      setBusy(false);
    }
  }

  const modes = ["sketch", "build", "operate", "analyze"] as const;

  return (
    <div className="space-y-6" data-testid="tapcanvas-shell">
      <header className="space-y-2 border-b border-white/8 pb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          Experiences · TapCanvas
        </p>
        <h1
          data-testid="tapcanvas-heading"
          className="text-2xl font-semibold tracking-tight text-white"
        >
          TapCanvas
        </h1>
        <p className="max-w-2xl text-sm text-white/55">
          One graph for Sketch, Build, Operate, and Analyze &amp; Repair — linked projections of
          TapConnect objects (including ExternalWorkItem). Sketch connectors never execute until
          promoted. Automation Team repairs never apply silently.
        </p>
        {initialLinkType && initialLinkId ? (
          <p className="text-xs text-sky-200/90">
            Opened from {initialLinkType}:{initialLinkId} — use Reverse viz or templates to project.
          </p>
        ) : null}
        <p
          data-testid="tapcanvas-persistence-note"
          className="text-xs text-white/40"
        >
          Powered by Tap The Magic ·{" "}
          {persistence === "prisma"
            ? "IMPLEMENTED BUT NOT OWNER-READY (Prisma on tapconnect_fusion_dev)"
            : "Persists on tapconnect_fusion_dev when configured · Not OWNER-READY"}
        </p>
      </header>

      {message ? (
        <p
          data-testid="tapcanvas-message"
          className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/70"
        >
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          disabled={busy}
          data-testid="tapcanvas-create"
          onClick={() => post({ action: "create", name: "New TapCanvas" })}
        >
          New board
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          data-testid="tapcanvas-simple-campaign"
          onClick={() =>
            post({
              action: "create_simple_campaign",
              title: `Canvas Campaign ${Date.now()}`,
            })
          }
        >
          Simple campaign
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          data-testid="tapcanvas-weekly-specials"
          onClick={() =>
            post({
              action: "create_weekly_specials_persisted",
              name: "Weekly Specials",
            })
          }
        >
          Weekly Specials (persist)
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          data-testid="tapcanvas-weekly-recipe"
          className="border-white/15"
          onClick={() => post({ action: "weekly_specials", name: "Weekly Specials" })}
        >
          Weekly Specials recipe
        </Button>
        {templates.slice(0, 6).map((t) => (
          <Button
            key={t.id}
            variant="outline"
            disabled={busy}
            className="border-white/15"
            onClick={() =>
              post({ action: "apply_template", templateId: t.id, name: t.name })
            }
          >
            {t.name}
          </Button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-2" data-testid="tapcanvas-board-list">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/35">Boards</p>
          <ul className="space-y-1">
            {canvases.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  data-testid={`tapcanvas-board-${c.id}`}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-left text-sm",
                    canvas?.id === c.id
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-white/10 text-white/70 hover:border-white/20"
                  )}
                  onClick={() => loadCanvas(c.id)}
                >
                  <span className="block truncate font-medium">{c.name}</span>
                  <span className="text-[10px] uppercase text-white/40">{c.mode}</span>
                </button>
              </li>
            ))}
          </ul>
          <Link
            href="/dashboard/experiences/tapcast/tiktok"
            data-testid="tapcanvas-open-tiktok"
            className="mt-4 block text-xs text-primary underline-offset-4 hover:underline"
          >
            Open TapCast · TikTok →
          </Link>
        </aside>

        <section className="space-y-4">
          {!canvas ? (
            <p className="text-sm text-white/45">Select or create a board to begin.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  data-testid="tapcanvas-active-name"
                  className="mr-2 text-lg font-medium text-white"
                >
                  {canvas.name}
                </h2>
                <span className="text-xs text-white/40" data-testid="tapcanvas-version">
                  v{canvas.version}
                </span>
                {modes.map((m) => (
                  <Button
                    key={m}
                    size="sm"
                    data-testid={`tapcanvas-mode-${m}`}
                    variant={canvas.mode === m ? "default" : "outline"}
                    className={canvas.mode === m ? "" : "border-white/15"}
                    disabled={busy}
                    onClick={() =>
                      post({ action: "set_mode", canvasId: canvas.id, mode: m })
                    }
                  >
                    {m === "analyze" ? "Analyze & Repair" : m}
                  </Button>
                ))}
              </div>

              {canvas.mode === "sketch" || canvas.mode === "build" ? (
                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-white/40">Sticky</label>
                    <Input
                      data-testid="tapcanvas-sticky-input"
                      value={stickyLabel}
                      onChange={(e) => setStickyLabel(e.target.value)}
                      className="h-9 w-48 bg-black/40"
                    />
                  </div>
                  <Button
                    size="sm"
                    disabled={busy}
                    data-testid="tapcanvas-add-sticky"
                    onClick={() =>
                      post({
                        action: "add_sticky",
                        canvasId: canvas.id,
                        label: stickyLabel,
                      })
                    }
                  >
                    Add sticky
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy || canvas.nodes.filter((n) => n.sketch).length === 0}
                    onClick={() => {
                      const ids = canvas.nodes.filter((n) => n.sketch).map((n) => n.id);
                      void post({
                        action: "promote",
                        canvasId: canvas.id,
                        nodeIds: ids,
                        confirm: true,
                        createApprovalTasks: true,
                      });
                    }}
                  >
                    Promote sketch (confirm)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/15"
                    disabled={busy}
                    onClick={() =>
                      post({
                        action: "add_action",
                        canvasId: canvas.id,
                        actionId: "send_email",
                        consentGiven: false,
                      })
                    }
                  >
                    Add email action (no consent)
                  </Button>
                </div>
              ) : null}

              {canvas.mode === "operate" ? (
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    post({ action: "operate_refresh", canvasId: canvas.id })
                  }
                >
                  Refresh operate overlay
                </Button>
              ) : null}

              {canvas.mode === "analyze" ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      post({
                        action: "reverse_viz",
                        name: "From objects",
                        objects: [
                          {
                            type: "campaign",
                            id: "camp_demo",
                            label: "Demo Campaign",
                            status: "draft",
                          },
                          {
                            type: "external_work_item",
                            id: "ewi_demo",
                            label: "Approval task",
                            provider: "monday",
                            status: "pending",
                          },
                        ],
                        associations: [
                          { fromId: "camp_demo", toId: "ewi_demo", label: "approval" },
                        ],
                      })
                    }
                  >
                    Reverse-viz sample
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => post({ action: "detect_issues", canvasId: canvas.id })}
                  >
                    Detect issues
                  </Button>
                  {proposals.map((p) => (
                    <div key={p.id} className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/15"
                        disabled={busy}
                        onClick={() =>
                          post({ action: "proposal_preview", proposalId: p.id })
                        }
                      >
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          post({
                            action: "proposal_resolve",
                            proposalId: p.id,
                            decision: "accept",
                          })
                        }
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busy}
                        onClick={() =>
                          post({
                            action: "proposal_resolve",
                            proposalId: p.id,
                            decision: "reject",
                          })
                        }
                      >
                        Reject
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}

              <div
                data-testid="tapcanvas-graph"
                className="min-h-[320px] rounded-xl border border-white/10 bg-[radial-gradient(ellipse_at_top,_rgba(163,230,53,0.06),_transparent_55%),linear-gradient(180deg,#0a0a0a,#111)] p-4"
              >
                <ul className="flex flex-wrap gap-3">
                  {canvas.nodes.map((n) => (
                    <li
                      key={n.id}
                      data-testid={`tapcanvas-node-${n.id}`}
                      className={cn(
                        "min-w-[140px] max-w-[200px] rounded-lg border px-3 py-2 text-sm",
                        n.sketch
                          ? "border-dashed border-white/25 bg-black/30 text-white/70"
                          : n.data?.guardianBlocked
                            ? "border-red-500/40 bg-red-500/10 text-red-100"
                            : "border-primary/30 bg-primary/5 text-white"
                      )}
                    >
                      <p className="text-[10px] uppercase tracking-wide text-white/40">
                        {n.kind}
                        {n.sketch ? " · sketch" : ""}
                      </p>
                      <p className="font-medium">{n.label}</p>
                      {n.liveStatus ? (
                        <p className="mt-1 text-[10px] text-sky-200/80">{n.liveStatus}</p>
                      ) : null}
                      {n.linked ? (
                        <p className="mt-1 truncate text-[10px] text-white/35">
                          → {n.linked.type}:{n.linked.id}
                        </p>
                      ) : null}
                      {n.data?.guardianBlocked ? (
                        <p className="mt-1 text-[10px] text-red-200/90">
                          Guardian: {String(n.data.guardianReason ?? "blocked")}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {canvas.edges.length > 0 ? (
                  <p className="mt-4 text-xs text-white/35">
                    {canvas.edges.length} edge(s) ·{" "}
                    {canvas.edges.filter((e) => e.sketch).length} sketch (non-executing)
                  </p>
                ) : null}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
