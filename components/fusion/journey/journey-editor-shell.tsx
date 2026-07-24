"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { GitBranch, ListOrdered, Play, Plus, Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  JOURNEY_NODE_REGISTRY,
  SAMPLE_VISITOR,
  createEmptyJourney,
  buildJourneyAnalyticsOverlay,
  executeJourneyDryRun,
  journeyToStages,
  planJourneyRecovery,
  recoverJourneyDryRun,
  simulateJourney,
  validateJourney,
  type JourneyDefinition,
  type JourneyLifecycleAction,
  type JourneyNodeType,
  type RuntimeEvent,
} from "@/lib/fusion/journey";
import { cn } from "@/lib/utils";
import { KeywordsSuggestPanel } from "@/components/fusion/keywords/keywords-suggest-panel";

type DraftRow = {
  id: string;
  name: string;
  status?: string;
  updatedAt: string;
};

const PALETTE: JourneyNodeType[] = [
  "trigger",
  "wait",
  "condition",
  "message",
  "email",
  "award_loyalty",
  "create_case",
  "human_handoff",
  "exit",
];

export function JourneyEditorShell({
  businessId,
  initialDrafts,
  featureEnabled,
}: {
  businessId: string;
  initialDrafts: DraftRow[];
  featureEnabled: boolean;
}) {
  const [mode, setMode] = useState<"beginner" | "expert">("beginner");
  const [drafts, setDrafts] = useState(initialDrafts);
  const [definition, setDefinition] = useState<JourneyDefinition>(() => createEmptyJourney());
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("DRAFT");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [edgeFrom, setEdgeFrom] = useState("");
  const [edgeTo, setEdgeTo] = useState("");
  const [edgeLabel, setEdgeLabel] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [runtimeEvents, setRuntimeEvents] = useState<RuntimeEvent[] | null>(null);
  const [pending, startTransition] = useTransition();

  const issues = useMemo(() => validateJourney(definition), [definition]);
  const simulation = useMemo(() => simulateJourney(definition), [definition]);
  const localRuntime = useMemo(
    () => executeJourneyDryRun(definition, SAMPLE_VISITOR, { requireValid: false }),
    [definition]
  );
  const stages = useMemo(() => journeyToStages(definition), [definition]);
  const analytics = useMemo(
    () => buildJourneyAnalyticsOverlay(definition, []),
    [definition]
  );
  const recoveryPlan = useMemo(() => {
    const base = runtimeEvents
      ? {
          ok: !runtimeEvents.some((e) => e.blocked),
          completed: runtimeEvents.some((e) => e.action === "exit"),
          path: runtimeEvents.map((e) => e.nodeId).filter(Boolean),
          events: runtimeEvents,
          issues: runtimeEvents.filter((e) => e.blocked).map((e) => e.detail ?? "blocked"),
          visitor: SAMPLE_VISITOR,
          blockedAt: runtimeEvents.find((e) => e.blocked)?.nodeId,
        }
      : localRuntime;
    return planJourneyRecovery(base);
  }, [runtimeEvents, localRuntime]);
  const errors = issues.filter((i) => i.severity === "error");
  const canLifecyclePublish = featureEnabled && Boolean(selectedDraftId) && errors.length === 0;
  const canPause = Boolean(selectedDraftId) && (status === "ACTIVE" || status === "PUBLISHED");
  const canResume = featureEnabled && Boolean(selectedDraftId) && status === "PAUSED";

  function addNode(type: JourneyNodeType) {
    const reg = JOURNEY_NODE_REGISTRY[type];
    const id = `${type}_${crypto.randomUUID()}`;
    setDefinition((d) => ({
      ...d,
      nodes: [
        ...d.nodes,
        {
          id,
          type,
          label: reg.label,
          config: type === "email" ? { subject: "Journey update" } : {},
          position: { x: 120 + (d.nodes.length % 5) * 100, y: 60 + Math.floor(d.nodes.length / 5) * 72 },
        },
      ],
    }));
    setSelectedNodeId(id);
  }

  function removeNode(nodeId: string) {
    setDefinition((d) => ({
      ...d,
      nodes: d.nodes.filter((n) => n.id !== nodeId),
      edges: d.edges.filter((e) => e.from !== nodeId && e.to !== nodeId),
    }));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  }

  function connectEdge() {
    if (!edgeFrom || !edgeTo || edgeFrom === edgeTo) {
      setMessage("Pick distinct from/to nodes to connect");
      return;
    }
    const id = `e_${crypto.randomUUID()}`;
    setDefinition((d) => ({
      ...d,
      edges: [
        ...d.edges,
        { id, from: edgeFrom, to: edgeTo, label: edgeLabel.trim() || undefined },
      ],
    }));
    setEdgeLabel("");
    setMessage(`Connected ${edgeFrom} → ${edgeTo}`);
  }

  function removeEdge(edgeId: string) {
    setDefinition((d) => ({ ...d, edges: d.edges.filter((e) => e.id !== edgeId) }));
  }

  function saveDraft() {
    startTransition(async () => {
      setMessage(null);
      const res = await fetch("/api/journeys/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedDraftId,
          name: definition.name,
          definition,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessage(data.error ?? "Save failed");
        return;
      }
      setSelectedDraftId(data.draft.id);
      setStatus(data.draft.status ?? "DRAFT");
      setDrafts((prev) => {
        const rest = prev.filter((p) => p.id !== data.draft.id);
        return [
          {
            id: data.draft.id,
            name: data.draft.name,
            status: data.draft.status,
            updatedAt: data.draft.updatedAt,
          },
          ...rest,
        ];
      });
      setMessage(`Saved draft ${data.draft.id.slice(0, 8)}…`);
    });
  }

  function lifecycle(action: JourneyLifecycleAction) {
    if (!selectedDraftId) {
      setMessage("Save draft before lifecycle actions");
      return;
    }
    if ((action === "publish" || action === "activate" || action === "resume") && !featureEnabled) {
      setMessage("journey.tapflow is disabled — enable in Platform Admin to publish/activate/resume");
      return;
    }
    startTransition(async () => {
      setMessage(null);
      const res = await fetch("/api/journeys/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedDraftId, action }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessage(data.error ?? data.message ?? `${action} failed`);
        return;
      }
      setStatus(data.draft.status);
      setDrafts((prev) =>
        prev.map((d) =>
          d.id === data.draft.id
            ? { ...d, status: data.draft.status, updatedAt: data.draft.updatedAt }
            : d
        )
      );
      setMessage(`${action} → ${data.draft.status} (audited + outbox)`);
    });
  }

  function runDryRun() {
    if (!featureEnabled) {
      setMessage("journey.tapflow is disabled — simulate API blocked; showing local preview only");
      setRuntimeEvents(localRuntime.events);
      return;
    }
    startTransition(async () => {
      setMessage(null);
      const res = await fetch("/api/journeys/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          definition,
          draftId: selectedDraftId ?? undefined,
          visitor: SAMPLE_VISITOR,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? data.message ?? "Simulate failed");
        setRuntimeEvents(localRuntime.events);
        return;
      }
      setRuntimeEvents(data.events as RuntimeEvent[]);
      setMessage(
        data.completed
          ? `Dry-run completed (${data.path?.length ?? 0} nodes)`
          : `Dry-run incomplete (${data.path?.length ?? 0} nodes)`
      );
    });
  }

  function runRecovery() {
    const recovered = recoverJourneyDryRun(definition, localRuntime);
    setRuntimeEvents(recovered.events);
    setMessage(
      recovered.completed
        ? `Recovery dry-run completed (${recovered.path.length} nodes)`
        : `Recovery still blocked: ${recovered.issues[0] ?? "incomplete"}`
    );
  }

  async function loadDraft(id: string) {
    const res = await fetch(`/api/journeys/draft?id=${id}`);
    const data = await res.json();
    if (!res.ok || !data.draft) {
      setMessage(data.error ?? "Load failed");
      return;
    }
    setSelectedDraftId(id);
    setDefinition(data.draft.definition as JourneyDefinition);
    setStatus(data.draft.status ?? "DRAFT");
    setRuntimeEvents(null);
    setMessage(`Loaded "${data.draft.name}" (${data.draft.status})`);
  }

  return (
    <div className="space-y-6">
      {!featureEnabled && (
        <div
          role="status"
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200/90"
        >
          journey.tapflow is disabled — draft edit/save only. Publish, activate, resume, and API
          simulate are blocked. Enable in{" "}
          <Link href="/admin/platform" className="underline">
            Platform Admin
          </Link>
          .
        </div>
      )}

      <KeywordsSuggestPanel surface="tapflow" defaultChannel="email" />

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1 space-y-1">
          <label htmlFor="journey-name" className="text-xs font-medium text-muted-foreground">
            Journey name
          </label>
          <Input
            id="journey-name"
            value={definition.name}
            onChange={(e) => setDefinition((d) => ({ ...d, name: e.target.value }))}
          />
        </div>
        <Badge variant="outline" className="font-mono text-xs" aria-live="polite">
          {status}
        </Badge>
        <div
          role="tablist"
          aria-label="Editor mode"
          className="flex rounded-lg border border-border/60 p-0.5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "beginner"}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium",
              mode === "beginner" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
            onClick={() => setMode("beginner")}
          >
            <ListOrdered className="mr-1 inline h-3.5 w-3.5" aria-hidden />
            Beginner
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "expert"}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium",
              mode === "expert" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
            onClick={() => setMode("expert")}
          >
            <GitBranch className="mr-1 inline h-3.5 w-3.5" aria-hidden />
            Expert
          </button>
        </div>
        <Button onClick={saveDraft} disabled={pending || errors.length > 0} className="gap-2">
          <Save className="h-4 w-4" />
          {pending ? "Saving…" : "Save draft"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending || !canLifecyclePublish}
          onClick={() => lifecycle("publish")}
        >
          Publish
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending || !canLifecyclePublish}
          onClick={() => lifecycle("activate")}
        >
          Activate
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending || !canPause}
          onClick={() => lifecycle("pause")}
        >
          Pause
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending || !canResume}
          onClick={() => lifecycle("resume")}
        >
          Resume
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={runDryRun}
          className="gap-2"
        >
          <Play className="h-4 w-4" />
          Dry-run
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending || !recoveryPlan.canAutoRecover}
          onClick={runRecovery}
          title={recoveryPlan.reason}
        >
          Recover dry-run
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-4 lg:col-span-1">
          <p className="text-sm font-semibold">Node palette</p>
          <div className="flex flex-wrap gap-2">
            {PALETTE.map((type) => (
              <Button key={type} type="button" variant="outline" size="sm" onClick={() => addNode(type)}>
                <Plus className="mr-1 h-3 w-3" />
                {JOURNEY_NODE_REGISTRY[type].label}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {definition.nodes.length} nodes · {definition.edges.length} edges
          </p>

          <div className="space-y-2 border-t border-border/40 pt-3">
            <p id="connect-edge-label" className="text-xs font-medium text-muted-foreground">
              Connect edge
            </p>
            <select
              id="edge-from"
              aria-labelledby="connect-edge-label"
              aria-label="Edge from node"
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={edgeFrom}
              onChange={(e) => setEdgeFrom(e.target.value)}
            >
              <option value="">From…</option>
              {definition.nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label} ({n.id.slice(0, 12)})
                </option>
              ))}
            </select>
            <select
              id="edge-to"
              aria-labelledby="connect-edge-label"
              aria-label="Edge to node"
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={edgeTo}
              onChange={(e) => setEdgeTo(e.target.value)}
            >
              <option value="">To…</option>
              {definition.nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label} ({n.id.slice(0, 12)})
                </option>
              ))}
            </select>
            <Input
              placeholder="Label (optional, e.g. true)"
              value={edgeLabel}
              onChange={(e) => setEdgeLabel(e.target.value)}
            />
            <Button type="button" size="sm" variant="secondary" onClick={connectEdge}>
              Connect
            </Button>
          </div>

          {drafts.length > 0 && (
            <div className="space-y-2 border-t border-border/40 pt-3">
              <p className="text-xs font-medium text-muted-foreground">Saved drafts</p>
              {drafts.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => loadDraft(d.id)}
                  className="block w-full rounded-lg bg-muted/30 px-3 py-2 text-left text-sm hover:bg-muted/50"
                >
                  {d.name}
                  <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                    {d.status ?? "DRAFT"} · {d.id.slice(0, 8)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border/60 bg-card/30 p-4 lg:col-span-2">
          {mode === "beginner" ? (
            <>
              <div className="mb-3 flex items-center gap-2">
                <ListOrdered className="h-4 w-4 text-primary" />
                <p className="font-semibold">Stage list</p>
                <span className="text-xs text-muted-foreground">same engine as expert graph</span>
              </div>
              <ol className="space-y-2">
                {stages.map((node, idx) => (
                  <li
                    key={node.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-background/40 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {idx + 1}. {node.label}
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground">{node.type}</p>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeNode(node.id)}
                      aria-label="Remove node"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <>
              <div className="mb-3 flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-primary" />
                <p className="font-semibold">Expert graph</p>
              </div>
              <div className="relative min-h-[280px] overflow-auto rounded-lg border border-dashed border-border/50 bg-background/50 p-4">
                {definition.nodes.map((node) => (
                  <div
                    key={node.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${node.label}, ${node.type} node`}
                    aria-pressed={selectedNodeId === node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setSelectedNodeId(node.id);
                    }}
                    className={cn(
                      "absolute cursor-pointer rounded-lg border bg-card px-3 py-2 text-xs shadow-sm",
                      selectedNodeId === node.id
                        ? "border-primary ring-1 ring-primary"
                        : "border-primary/30"
                    )}
                    style={{
                      left: node.position?.x ?? 40,
                      top: node.position?.y ?? 40,
                    }}
                  >
                    <p className="font-medium text-primary">{node.label}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{node.type}</p>
                  </div>
                ))}
              </div>
              {selectedNodeId ? (
                <div className="mt-3 flex items-center gap-2">
                  <p className="font-mono text-xs text-muted-foreground">{selectedNodeId}</p>
                  <Button type="button" size="sm" variant="destructive" onClick={() => removeNode(selectedNodeId)}>
                    Remove node
                  </Button>
                </div>
              ) : null}
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {definition.edges.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2">
                    <span className="font-mono">
                      {e.from.slice(0, 14)} → {e.to.slice(0, 14)}
                      {e.label ? ` (${e.label})` : ""}
                    </span>
                    <button type="button" className="text-red-400 hover:underline" onClick={() => removeEdge(e.id)}>
                      remove
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Definition JSON</p>
            <Textarea
              className="font-mono text-[11px]"
              rows={6}
              value={JSON.stringify(definition, null, 2)}
              onChange={(e) => {
                try {
                  setDefinition(JSON.parse(e.target.value) as JourneyDefinition);
                } catch {
                  /* ignore parse while typing */
                }
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border/60 p-4">
          <p className="mb-2 text-sm font-semibold">Validation</p>
          {issues.length === 0 ? (
            <p className="text-sm text-primary">No issues</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {issues.map((i, idx) => (
                <li key={idx} className={i.severity === "error" ? "text-red-400" : "text-muted-foreground"}>
                  [{i.severity}] {i.message}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-border/60 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Play className="h-4 w-4 text-primary" />
            Sample path + runtime dry-run
          </p>
          <Badge variant={simulation.completed ? "default" : "outline"} className="mb-2">
            {simulation.completed ? "Reaches exit" : "Incomplete path"}
          </Badge>
          <ol className="mb-3 list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
            {simulation.steps.map((s) => (
              <li key={s.nodeId}>
                {s.label}: {s.action}
              </li>
            ))}
          </ol>
          {(runtimeEvents ?? localRuntime.events).length > 0 && (
            <div className="border-t border-border/40 pt-2">
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                Runtime events {runtimeEvents ? "(API/local dry-run)" : "(local preview)"}
              </p>
              <ul className="max-h-40 space-y-0.5 overflow-auto font-mono text-[10px] text-muted-foreground">
                {(runtimeEvents ?? localRuntime.events).map((ev, idx) => (
                  <li key={idx}>{JSON.stringify(ev)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border/60 p-4">
        <p className="mb-1 text-sm font-semibold">
          Analytics overlay · {analytics.evidence}
        </p>
        <p className="mb-3 text-xs text-muted-foreground">{analytics.note}</p>
        <ul className="grid gap-1 sm:grid-cols-2 md:grid-cols-3">
          {analytics.nodeVisitEstimates.map((n) => (
            <li
              key={n.nodeId}
              className={cn(
                "rounded-md border border-border/40 px-2 py-1 text-xs",
                analytics.blockedNodeIds.includes(n.nodeId) && "border-amber-500/50 text-amber-200"
              )}
            >
              {n.label}: {n.estimatedVisits}
            </li>
          ))}
        </ul>
        {recoveryPlan.canAutoRecover ? (
          <p className="mt-2 text-xs text-amber-200/90">
            Recovery available at {recoveryPlan.blockedAt ?? "path"} — {recoveryPlan.reason}
          </p>
        ) : null}
      </div>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      <p className="font-mono text-[10px] text-muted-foreground">business: {businessId}</p>
    </div>
  );
}
