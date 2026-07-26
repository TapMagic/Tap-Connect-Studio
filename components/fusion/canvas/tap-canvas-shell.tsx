"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { KeywordsSuggestPanel } from "@/components/fusion/keywords/keywords-suggest-panel";
import {
  VisualBoard,
} from "@/components/fusion/graph/visual-board";
import { AuthoringHistory } from "@/lib/fusion/graph/history";
type CanvasNode = {
  id: string;
  kind: string;
  label: string;
  x?: number;
  y?: number;
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
  edges: {
    id: string;
    source: string;
    target: string;
    label?: string;
    sketch?: boolean;
  }[];
};

type Template = { id: string; name: string };

type CanvasVersionRow = {
  id: string;
  version: number;
  label: string;
};

type ProposalRow = {
  id: string;
  title: string;
  status: string;
  severity: string;
};

type CommentRow = {
  id: string;
  body: string;
  nodeId?: string | null;
  createdAt: string;
};

type ApprovalRow = {
  id: string;
  subjectType: string;
  subjectId: string;
  status: string;
  createdAt: string;
};

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
  const [versions, setVersions] = useState<CanvasVersionRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stickyLabel, setStickyLabel] = useState("Idea sticky");
  const [commentBody, setCommentBody] = useState("");
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRow[]>([]);
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [persistence, setPersistence] = useState<"prisma" | "memory" | null>(null);
  const [lastUndoVersionId, setLastUndoVersionId] = useState<string | null>(null);
  const [compareDiff, setCompareDiff] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [boardsOpen, setBoardsOpen] = useState(true);
  const openFromLinkDone = useRef(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const positionPersistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPositions = useRef<Record<string, { x: number; y: number }>>({});
  const canvasIdRef = useRef<string | null>(null);
  const positionHistory = useRef(
    new AuthoringHistory<Record<string, { x: number; y: number }>>({})
  );
  const [canUndoMove, setCanUndoMove] = useState(false);
  const [canRedoMove, setCanRedoMove] = useState(false);

  const syncMoveHistoryFlags = useCallback(() => {
    setCanUndoMove(positionHistory.current.canUndo);
    setCanRedoMove(positionHistory.current.canRedo);
  }, []);

  const resetMoveHistory = useCallback(
    (nodes: CanvasNode[]) => {
      const positions: Record<string, { x: number; y: number }> = {};
      nodes.forEach((n, idx) => {
        positions[n.id] = { x: n.x ?? 40 + idx * 24, y: n.y ?? 40 + idx * 16 };
      });
      positionHistory.current.replace(positions);
      syncMoveHistoryFlags();
    },
    [syncMoveHistoryFlags]
  );

  useEffect(() => {
    canvasIdRef.current = canvas?.id ?? null;
  }, [canvas?.id]);

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
      if (json.canvas?.nodes) resetMoveHistory(json.canvas.nodes as CanvasNode[]);
      setProposals(json.proposals ?? []);
      setComments(json.comments ?? []);
      setApprovals(json.approvals ?? []);
      setVersions(
        (json.versions ?? []).map(
          (v: { id: string; version: number; label: string }) => ({
            id: v.id,
            version: v.version,
            label: v.label,
          })
        )
      );
    } else {
      setMessage(json.error ?? "Failed to load canvas");
    }
  }, [resetMoveHistory]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/canvas");
      const json = await res.json();
      if (cancelled || !res.ok) return;
      setCanvases(json.canvases ?? []);
      setTemplates(json.templates ?? []);
      if (json.persistence === "prisma" || json.persistence === "memory") {
        setPersistence(json.persistence);
      }
      if (initialCanvasId) {
        const detail = await fetch(
          `/api/canvas?canvasId=${encodeURIComponent(initialCanvasId)}`
        );
        const detailJson = await detail.json();
        if (cancelled) return;
        if (detail.ok) {
          setCanvas(detailJson.canvas);
          if (detailJson.canvas?.nodes) {
            resetMoveHistory(detailJson.canvas.nodes as CanvasNode[]);
          }
          setProposals(detailJson.proposals ?? []);
          setComments(detailJson.comments ?? []);
          setApprovals(detailJson.approvals ?? []);
          setVersions(
            (detailJson.versions ?? []).map(
              (v: { id: string; version: number; label: string }) => ({
                id: v.id,
                version: v.version,
                label: v.label,
              })
            )
          );
        } else {
          setMessage(detailJson.error ?? "Failed to load canvas");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialCanvasId, resetMoveHistory]);

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
        if (json.undoVersionId) setLastUndoVersionId(json.undoVersionId);
        if (json.diff) {
          setCompareDiff(
            `+${json.diff.nodesAdded?.length ?? 0} / -${json.diff.nodesRemoved?.length ?? 0} nodes · ~${json.diff.nodesChanged?.length ?? 0} changed`
          );
        }
        if (json.canvas) {
          setCanvas(json.canvas);
          await loadCanvas(json.canvas.id);
        } else if (canvas) {
          await loadCanvas(canvas.id);
        }
        await reloadList();
        if (json.proposals) setProposals(json.proposals);
        if (json.comments) setComments(json.comments);
        if (json.approvals) setApprovals(json.approvals);
        if (json.versions) {
          setVersions(
            json.versions.map(
              (v: { id: string; version: number; label: string }) => ({
                id: v.id,
                version: v.version,
                label: v.label,
              })
            )
          );
        }
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

  const flushNodePositions = useCallback(async () => {
    const canvasId = canvasIdRef.current;
    const positions = pendingPositions.current;
    const entries = Object.entries(positions);
    if (!canvasId || entries.length === 0) return;
    pendingPositions.current = {};
    try {
      await fetch("/api/canvas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_node_position",
          canvasId,
          positions: entries.map(([nodeId, p]) => ({
            nodeId,
            x: p.x,
            y: p.y,
          })),
        }),
      });
    } catch {
      // Keep optimistic local positions; next drag/reload can reconcile.
    }
  }, []);

  function onMoveNodes(positions: Record<string, { x: number; y: number }>) {
    setCanvas((c) => {
      if (!c) return c;
      return {
        ...c,
        nodes: c.nodes.map((n) =>
          positions[n.id] ? { ...n, x: positions[n.id]!.x, y: positions[n.id]!.y } : n
        ),
      };
    });
    Object.assign(pendingPositions.current, positions);
    if (positionPersistTimer.current) clearTimeout(positionPersistTimer.current);
    positionPersistTimer.current = setTimeout(() => {
      void flushNodePositions();
    }, 280);
  }

  function onMoveEnd(positions: Record<string, { x: number; y: number }>) {
    const base = positionHistory.current.value;
    const next = { ...base, ...positions };
    const changed = Object.entries(positions).some(([id, p]) => {
      const prev = base[id];
      return !prev || prev.x !== p.x || prev.y !== p.y;
    });
    if (!changed) return;
    positionHistory.current.push(next, "Move nodes");
    syncMoveHistoryFlags();
    Object.assign(pendingPositions.current, positions);
    if (positionPersistTimer.current) clearTimeout(positionPersistTimer.current);
    positionPersistTimer.current = setTimeout(() => {
      void flushNodePositions();
    }, 120);
  }

  const undoNodeMove = useCallback(() => {
    if (!positionHistory.current.canUndo) return;
    const prev = positionHistory.current.undo();
    syncMoveHistoryFlags();
    setCanvas((c) => {
      if (!c) return c;
      return {
        ...c,
        nodes: c.nodes.map((n) =>
          prev[n.id] ? { ...n, x: prev[n.id]!.x, y: prev[n.id]!.y } : n
        ),
      };
    });
    Object.assign(pendingPositions.current, prev);
    if (positionPersistTimer.current) clearTimeout(positionPersistTimer.current);
    positionPersistTimer.current = setTimeout(() => {
      void flushNodePositions();
    }, 120);
  }, [flushNodePositions, syncMoveHistoryFlags]);

  const redoNodeMove = useCallback(() => {
    if (!positionHistory.current.canRedo) return;
    const next = positionHistory.current.redo();
    syncMoveHistoryFlags();
    setCanvas((c) => {
      if (!c) return c;
      return {
        ...c,
        nodes: c.nodes.map((n) =>
          next[n.id] ? { ...n, x: next[n.id]!.x, y: next[n.id]!.y } : n
        ),
      };
    });
    Object.assign(pendingPositions.current, next);
    if (positionPersistTimer.current) clearTimeout(positionPersistTimer.current);
    positionPersistTimer.current = setTimeout(() => {
      void flushNodePositions();
    }, 120);
  }, [flushNodePositions, syncMoveHistoryFlags]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undoNodeMove();
      } else if (
        e.key.toLowerCase() === "y" ||
        (e.key.toLowerCase() === "z" && e.shiftKey)
      ) {
        e.preventDefault();
        redoNodeMove();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undoNodeMove, redoNodeMove]);

  useEffect(() => {
    return () => {
      if (positionPersistTimer.current) {
        clearTimeout(positionPersistTimer.current);
        positionPersistTimer.current = null;
      }
      const canvasId = canvasIdRef.current;
      const entries = Object.entries(pendingPositions.current);
      if (!canvasId || entries.length === 0) return;
      pendingPositions.current = {};
      void fetch("/api/canvas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_node_position",
          canvasId,
          positions: entries.map(([nodeId, p]) => ({
            nodeId,
            x: p.x,
            y: p.y,
          })),
        }),
      });
    };
  }, []);

  useEffect(() => {
    if (openFromLinkDone.current) return;
    if (!initialLinkType || !initialLinkId || initialCanvasId) return;
    openFromLinkDone.current = true;
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/canvas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "open_from_object",
          objectType: initialLinkType,
          objectId: initialLinkId,
          label: `${initialLinkType} ${initialLinkId}`,
        }),
      });
      const json = await res.json();
      if (cancelled) return;
      if (!res.ok || json.ok === false) {
        setMessage(json.error ?? JSON.stringify(json.warnings ?? json));
        return;
      }
      setMessage(json.message ?? "OK");
      if (json.canvas) {
        setCanvas(json.canvas);
        await loadCanvas(json.canvas.id);
      }
      await reloadList();
    })();
    return () => {
      cancelled = true;
    };
  }, [initialLinkType, initialLinkId, initialCanvasId, loadCanvas, reloadList]);

  const modes = ["sketch", "build", "operate", "analyze"] as const;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const root = shellRef.current;
      if (!root) return;
      if (!root.contains(document.activeElement) && document.activeElement !== root) {
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMessage(null);
        setCompareDiff(null);
        return;
      }
      if (!canvas || busy) return;
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const modeMap: Record<string, (typeof modes)[number]> = {
        "1": "sketch",
        "2": "build",
        "3": "operate",
        "4": "analyze",
      };
      const next = modeMap[e.key];
      if (!next) return;
      e.preventDefault();
      void post({ action: "set_mode", canvasId: canvas.id, mode: next });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- post closes over canvas/busy
  }, [canvas, busy]);

  return (
    <div
      ref={shellRef}
      tabIndex={0}
      role="region"
      aria-label="TapCanvas operator shell"
      className="space-y-6 outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      data-testid="tapcanvas-shell"
    >
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
          <p
            data-testid="tapcanvas-open-from-link"
            className="text-xs text-sky-200/90"
          >
            Opened from {initialLinkType}:{initialLinkId} — reverse visualization projects the
            linked object into Analyze.
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

      <div data-testid="tapcanvas-keywords-mount" className="max-w-xl">
        <KeywordsSuggestPanel surface="tapcanvas" defaultChannel="tapcanvas" compact />
      </div>

      {message ? (
        <p
          role="status"
          aria-live="polite"
          data-testid="tapcanvas-message"
          className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/70"
        >
          {message}
        </p>
      ) : null}
      <p className="sr-only" role="status" aria-live="polite" data-testid="tapcanvas-selection-live">
        {selectedNodeId
          ? `Selected node ${canvas?.nodes.find((n) => n.id === selectedNodeId)?.label ?? selectedNodeId}`
          : "No canvas node selected"}
      </p>
      {compareDiff ? (
        <p data-testid="tapcanvas-compare-diff" className="text-xs text-white/50">
          Version compare: {compareDiff}
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
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/35">
              Boards
            </p>
            <button
              type="button"
              className="rounded border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/45 hover:border-white/25 hover:text-white/70 lg:hidden"
              aria-expanded={boardsOpen}
              aria-controls="tapcanvas-board-list-items"
              data-testid="tapcanvas-board-list-toggle"
              onClick={() => setBoardsOpen((o) => !o)}
            >
              {boardsOpen ? "Collapse" : "Expand"}
            </button>
          </div>
          <ul
            id="tapcanvas-board-list-items"
            className={cn("space-y-1", !boardsOpen && "hidden lg:block")}
          >
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
            className={cn(
              "mt-4 block text-xs text-primary underline-offset-4 hover:underline",
              !boardsOpen && "hidden lg:block"
            )}
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
                {modes.map((m, idx) => (
                  <Button
                    key={m}
                    size="sm"
                    data-testid={`tapcanvas-mode-${m}`}
                    variant={canvas.mode === m ? "default" : "outline"}
                    className={canvas.mode === m ? "" : "border-white/15"}
                    disabled={busy}
                    aria-label={`Switch to ${m} mode (shortcut ${idx + 1})`}
                    aria-pressed={canvas.mode === m}
                    onClick={() =>
                      post({ action: "set_mode", canvasId: canvas.id, mode: m })
                    }
                  >
                    {m === "analyze" ? "Analyze & Repair" : m}
                  </Button>
                ))}
                <span className="text-[10px] text-white/30" data-testid="tapcanvas-shortcuts-hint">
                  Keys 1–4 switch modes · Esc clears message
                </span>
              </div>

              {canvas.mode === "sketch" || canvas.mode === "build" ? (
                <div className="space-y-2">
                  <div
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] uppercase tracking-wide text-white/40"
                    data-testid="tapcanvas-object-palette"
                  >
                    <span>
                      <span className="text-white/55">Ideas</span>
                      {" · "}
                      sticky / note / frame
                      <span className="text-white/25"> (sketch, non-executing)</span>
                    </span>
                    <span>
                      <span className="text-primary/80">Executable</span>
                      {" · "}
                      campaign / card / offer / tapflow
                      <span className="text-white/25"> (after promote)</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-white/40" htmlFor="tapcanvas-sticky">
                        Sticky
                      </label>
                      <Input
                        id="tapcanvas-sticky"
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
                    data-testid="tapcanvas-promote"
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
                  {lastUndoVersionId ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/15"
                      data-testid="tapcanvas-undo-promote"
                      disabled={busy}
                      onClick={() =>
                        post({
                          action: "undo_promote",
                          canvasId: canvas.id,
                          undoVersionId: lastUndoVersionId,
                        })
                      }
                    >
                      Undo promote
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/15"
                    data-testid="tapcanvas-bind-keyword"
                    disabled={busy}
                    onClick={() =>
                      post({
                        action: "bind_keyword_trigger",
                        canvasId: canvas.id,
                        bindVocabulary: true,
                        extraTriggers: ["specials", "weekly"],
                      })
                    }
                  >
                    Bind keyword trigger
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    data-testid="tapcanvas-create-tapflow"
                    disabled={busy}
                    aria-label="Create TapFlow JourneyDraft from canvas"
                    onClick={() =>
                      post({
                        action: "create_tapflow_from_canvas",
                        canvasId: canvas.id,
                        name: `TapFlow ${canvas.name}`,
                        simulate: true,
                      })
                    }
                  >
                    Create TapFlow (DRAFT)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/15"
                    data-testid="tapcanvas-tapflow-validate"
                    disabled={busy}
                    onClick={() => {
                      const tf = canvas.nodes.find((n) => n.kind === "tapflow");
                      const jd =
                        (tf?.data?.journeyDraftId as string | undefined) ??
                        (tf?.linked?.type === "journey_draft" ? tf.linked.id : undefined);
                      if (!jd) {
                        setMessage("Create a TapFlow first");
                        return;
                      }
                      void post({
                        action: "tapflow_validate",
                        canvasId: canvas.id,
                        journeyDraftId: jd,
                        nodeId: tf?.id,
                      });
                    }}
                  >
                    Validate TapFlow
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/15"
                    data-testid="tapcanvas-tapflow-publish"
                    disabled={busy}
                    onClick={() => {
                      const tf = canvas.nodes.find((n) => n.kind === "tapflow");
                      const jd =
                        (tf?.data?.journeyDraftId as string | undefined) ??
                        (tf?.linked?.type === "journey_draft" ? tf.linked.id : undefined);
                      if (!jd) {
                        setMessage("Create a TapFlow first");
                        return;
                      }
                      void post({
                        action: "tapflow_lifecycle",
                        canvasId: canvas.id,
                        journeyDraftId: jd,
                        lifecycleAction: "publish",
                        nodeId: tf?.id,
                      });
                    }}
                  >
                    Publish TapFlow
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    data-testid="tapcanvas-tapflow-activate"
                    disabled={busy}
                    onClick={() => {
                      const tf = canvas.nodes.find((n) => n.kind === "tapflow");
                      const jd =
                        (tf?.data?.journeyDraftId as string | undefined) ??
                        (tf?.linked?.type === "journey_draft" ? tf.linked.id : undefined);
                      if (!jd) {
                        setMessage("Create a TapFlow first");
                        return;
                      }
                      void post({
                        action: "tapflow_lifecycle",
                        canvasId: canvas.id,
                        journeyDraftId: jd,
                        lifecycleAction: "activate",
                        nodeId: tf?.id,
                      });
                    }}
                  >
                    Activate TapFlow
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/15"
                    data-testid="tapcanvas-tapflow-execute"
                    disabled={busy}
                    onClick={() => {
                      const tf = canvas.nodes.find((n) => n.kind === "tapflow");
                      const jd =
                        (tf?.data?.journeyDraftId as string | undefined) ??
                        (tf?.linked?.type === "journey_draft" ? tf.linked.id : undefined);
                      if (!jd) {
                        setMessage("Create a TapFlow first");
                        return;
                      }
                      void post({
                        action: "tapflow_execute",
                        canvasId: canvas.id,
                        journeyDraftId: jd,
                        nodeId: tf?.id,
                      });
                    }}
                  >
                    Execute TapFlow
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
                </div>
              ) : null}

              {canvas.mode === "operate" ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    data-testid="tapcanvas-operate-refresh"
                    disabled={busy}
                    onClick={() =>
                      post({ action: "operate_refresh", canvasId: canvas.id })
                    }
                  >
                    Refresh operate overlay
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/15"
                    data-testid="tapcanvas-tapflow-pause"
                    disabled={busy}
                    onClick={() => {
                      const tf = canvas.nodes.find((n) => n.kind === "tapflow");
                      const jd =
                        (tf?.data?.journeyDraftId as string | undefined) ??
                        (tf?.linked?.type === "journey_draft" ? tf.linked.id : undefined);
                      if (!jd) {
                        setMessage("No TapFlow on board");
                        return;
                      }
                      void post({
                        action: "tapflow_lifecycle",
                        canvasId: canvas.id,
                        journeyDraftId: jd,
                        lifecycleAction: "pause",
                        nodeId: tf?.id,
                      });
                    }}
                  >
                    Pause TapFlow
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/15"
                    data-testid="tapcanvas-tapflow-resume"
                    disabled={busy}
                    onClick={() => {
                      const tf = canvas.nodes.find((n) => n.kind === "tapflow");
                      const jd =
                        (tf?.data?.journeyDraftId as string | undefined) ??
                        (tf?.linked?.type === "journey_draft" ? tf.linked.id : undefined);
                      if (!jd) {
                        setMessage("No TapFlow on board");
                        return;
                      }
                      void post({
                        action: "tapflow_lifecycle",
                        canvasId: canvas.id,
                        journeyDraftId: jd,
                        lifecycleAction: "resume",
                        nodeId: tf?.id,
                      });
                    }}
                  >
                    Resume TapFlow
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/15"
                    data-testid="tapcanvas-tapflow-analytics"
                    disabled={busy}
                    onClick={() => {
                      const tf = canvas.nodes.find((n) => n.kind === "tapflow");
                      const jd =
                        (tf?.data?.journeyDraftId as string | undefined) ??
                        (tf?.linked?.type === "journey_draft" ? tf.linked.id : undefined);
                      if (!jd) {
                        setMessage("No TapFlow on board");
                        return;
                      }
                      void post({
                        action: "tapflow_analytics",
                        canvasId: canvas.id,
                        journeyDraftId: jd,
                        nodeId: tf?.id,
                      });
                    }}
                  >
                    TapFlow Insights
                  </Button>
                </div>
              ) : null}

              {canvas.mode === "analyze" ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    data-testid="tapcanvas-reverse-viz"
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
                  {initialLinkType && initialLinkId ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      data-testid="tapcanvas-open-from-object"
                      disabled={busy}
                      onClick={() =>
                        post({
                          action: "open_from_object",
                          objectType: initialLinkType,
                          objectId: initialLinkId,
                          canvasId: canvas.id,
                          label: `${initialLinkType} ${initialLinkId}`,
                        })
                      }
                    >
                      Project linked object
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="secondary"
                    data-testid="tapcanvas-detect-issues"
                    disabled={busy}
                    onClick={() => post({ action: "detect_issues", canvasId: canvas.id })}
                  >
                    Detect issues
                  </Button>
                  {proposals.map((p) => (
                    <div key={p.id} className="flex gap-1" data-testid={`tapcanvas-proposal-${p.id}`}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/15"
                        data-testid={`tapcanvas-proposal-preview-${p.id}`}
                        disabled={busy}
                        onClick={() =>
                          post({
                            action: "proposal_preview",
                            proposalId: p.id,
                            canvasId: canvas.id,
                          })
                        }
                      >
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        data-testid={`tapcanvas-proposal-accept-${p.id}`}
                        disabled={busy}
                        onClick={() =>
                          post({
                            action: "proposal_resolve",
                            proposalId: p.id,
                            decision: "accept",
                            canvasId: canvas.id,
                          })
                        }
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        data-testid={`tapcanvas-proposal-reject-${p.id}`}
                        disabled={busy}
                        onClick={() =>
                          post({
                            action: "proposal_resolve",
                            proposalId: p.id,
                            decision: "reject",
                            canvasId: canvas.id,
                          })
                        }
                      >
                        Reject
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}

              {versions.length > 0 ? (
                <div
                  data-testid="tapcanvas-versions"
                  className="rounded-lg border border-white/10 bg-black/20 p-3"
                >
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-white/40">
                    Versions
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {versions.slice(0, 6).map((v, idx) => (
                      <li key={v.id} className="flex items-center gap-1">
                        <span className="text-[11px] text-white/55">
                          v{v.version} · {v.label}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 border-white/15 px-2 text-[10px]"
                          data-testid={`tapcanvas-restore-${v.id}`}
                          disabled={busy}
                          onClick={() =>
                            post({
                              action: "restore_version",
                              canvasId: canvas.id,
                              versionId: v.id,
                            })
                          }
                        >
                          Restore
                        </Button>
                        {idx === 0 && versions[1] ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[10px]"
                            data-testid="tapcanvas-compare-versions"
                            disabled={busy}
                            onClick={() =>
                              post({
                                action: "compare_versions",
                                canvasId: canvas.id,
                                leftVersionId: versions[1]!.id,
                                rightVersionId: v.id,
                              })
                            }
                          >
                            Compare
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2" data-testid="tapcanvas-operator-panels">
                <div
                  data-testid="tapcanvas-comments-panel"
                  className="rounded-lg border border-white/10 bg-black/20 p-3"
                  role="region"
                  aria-label="Canvas comments"
                >
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-white/40">
                    Comments
                  </p>
                  <div className="mb-2 flex flex-wrap items-end gap-2">
                    <div className="min-w-[160px] flex-1 space-y-1">
                      <label
                        className="text-[10px] uppercase text-white/40"
                        htmlFor="tapcanvas-comment-input"
                      >
                        Add comment
                      </label>
                      <Input
                        id="tapcanvas-comment-input"
                        data-testid="tapcanvas-comment-input"
                        value={commentBody}
                        onChange={(e) => setCommentBody(e.target.value)}
                        placeholder="Operator note…"
                        className="h-9 bg-black/40"
                      />
                    </div>
                    <Button
                      size="sm"
                      data-testid="tapcanvas-comment-add"
                      disabled={busy || !commentBody.trim()}
                      onClick={() => {
                        const body = commentBody.trim();
                        if (!body) return;
                        void post({
                          action: "add_comment",
                          canvasId: canvas.id,
                          body,
                        }).then(() => setCommentBody(""));
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  <ul
                    data-testid="tapcanvas-comments-list"
                    className="max-h-40 space-y-2 overflow-y-auto"
                  >
                    {comments.length === 0 ? (
                      <li className="text-xs text-white/35">No comments yet.</li>
                    ) : (
                      comments.map((c) => (
                        <li
                          key={c.id}
                          data-testid={`tapcanvas-comment-${c.id}`}
                          className="rounded border border-white/8 bg-white/[0.02] px-2 py-1.5 text-xs text-white/70"
                        >
                          {c.body}
                        </li>
                      ))
                    )}
                  </ul>
                </div>

                <div
                  data-testid="tapcanvas-approvals-panel"
                  className="rounded-lg border border-white/10 bg-black/20 p-3"
                  role="region"
                  aria-label="Canvas approvals"
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
                      Approvals
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 border-white/15 px-2 text-[10px]"
                      data-testid="tapcanvas-approval-create"
                      disabled={busy}
                      onClick={() =>
                        post({
                          action: "create_approval",
                          canvasId: canvas.id,
                          subjectType: "canvas",
                          subjectId: canvas.id,
                        })
                      }
                    >
                      Request approval
                    </Button>
                  </div>
                  <ul
                    data-testid="tapcanvas-approvals-list"
                    className="max-h-40 space-y-2 overflow-y-auto"
                  >
                    {approvals.length === 0 ? (
                      <li className="text-xs text-white/35">No approvals yet.</li>
                    ) : (
                      approvals.map((a) => (
                        <li
                          key={a.id}
                          data-testid={`tapcanvas-approval-${a.id}`}
                          className="flex flex-wrap items-center gap-2 rounded border border-white/8 bg-white/[0.02] px-2 py-1.5 text-xs text-white/70"
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {a.subjectType}:{a.subjectId} · {a.status}
                          </span>
                          {a.status === "pending" ? (
                            <>
                              <Button
                                size="sm"
                                className="h-7 px-2 text-[10px]"
                                data-testid={`tapcanvas-approval-approve-${a.id}`}
                                disabled={busy}
                                aria-label={`Approve ${a.id}`}
                                onClick={() =>
                                  post({
                                    action: "resolve_approval",
                                    canvasId: canvas.id,
                                    approvalId: a.id,
                                    decision: "approved",
                                  })
                                }
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 px-2 text-[10px]"
                                data-testid={`tapcanvas-approval-reject-${a.id}`}
                                disabled={busy}
                                aria-label={`Reject ${a.id}`}
                                onClick={() =>
                                  post({
                                    action: "resolve_approval",
                                    canvasId: canvas.id,
                                    approvalId: a.id,
                                    decision: "rejected",
                                  })
                                }
                              >
                                Reject
                              </Button>
                            </>
                          ) : null}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>

              <div
                data-testid="tapcanvas-graph"
                className="min-h-[320px] overflow-hidden rounded-xl border border-white/10"
              >
                <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px]"
                    disabled={!canUndoMove}
                    onClick={undoNodeMove}
                    data-testid="tapcanvas-move-undo"
                  >
                    Undo move
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px]"
                    disabled={!canRedoMove}
                    onClick={redoNodeMove}
                    data-testid="tapcanvas-move-redo"
                  >
                    Redo move
                  </Button>
                  <span className="text-[10px] text-muted-foreground" data-testid="tapcanvas-move-history-hint">
                    One history entry per completed drag · ⌘Z / ⌘⇧Z
                  </span>
                </div>
                <VisualBoard
                  testId="tapcanvas-visual-board"
                  testIdPrefix="tapcanvas-node"
                  className="min-h-[360px] border-0"
                  nodes={canvas.nodes.map((n, idx) => {
                    const subtitleParts: string[] = [];
                    if (n.sketch) subtitleParts.push("sketch · does not execute");
                    if (n.liveStatus) subtitleParts.push(n.liveStatus);
                    if (n.linked) subtitleParts.push(`→ ${n.linked.type}:${n.linked.id}`);
                    if (n.data?.guardianBlocked) {
                      subtitleParts.push(
                        `Guardian: ${String(n.data.guardianReason ?? "blocked")}`
                      );
                    }
                    if (Array.isArray(n.data?.keywords)) {
                      subtitleParts.push(
                        `keywords: ${(n.data.keywords as string[]).slice(0, 4).join(", ")}`
                      );
                    }
                    return {
                      id: n.id,
                      label: n.label,
                      badge: n.sketch ? `${n.kind} · sketch` : n.kind,
                      subtitle: subtitleParts.length ? subtitleParts.join(" · ") : undefined,
                      x: n.x ?? 40 + idx * 24,
                      y: n.y ?? 40 + idx * 16,
                      tone: n.sketch
                        ? ("sketch" as const)
                        : n.data?.guardianBlocked
                          ? ("error" as const)
                          : ("executable" as const),
                    };
                  })}
                  edges={canvas.edges.map((e) => ({
                    id: e.id,
                    from: e.source,
                    to: e.target,
                    label: e.label,
                    sketch: Boolean(e.sketch),
                  }))}
                  selectedIds={selectedNodeId ? [selectedNodeId] : []}
                  onSelect={(ids) => setSelectedNodeId(ids[0] ?? null)}
                  onMoveNodes={onMoveNodes}
                  onMoveEnd={onMoveEnd}
                  emptyLabel="Add stickies or promote sketch objects onto the board"
                />
                {canvas.nodes.some((n) => Array.isArray(n.data?.keywords)) ? (
                  <span data-testid="tapcanvas-keyword-node" className="sr-only">
                    keyword node present
                  </span>
                ) : null}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
