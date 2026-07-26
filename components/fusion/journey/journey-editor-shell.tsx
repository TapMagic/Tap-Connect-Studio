"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Copy,
  Focus,
  GitBranch,
  LayoutTemplate,
  ListOrdered,
  PanelRightClose,
  PanelRightOpen,
  Play,
  Plus,
  Redo2,
  Save,
  Trash2,
  Undo2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  JOURNEY_NODE_REGISTRY,
  SAMPLE_VISITOR,
  createEmptyJourney,
  buildJourneyAnalyticsOverlay,
  executeJourneyDryRun,
  isEntryNodeType,
  journeyToStages,
  planJourneyRecovery,
  recoverJourneyDryRun,
  validateJourney,
  type JourneyDefinition,
  type JourneyLifecycleAction,
  type JourneyNodeType,
  type RuntimeEvent,
} from "@/lib/fusion/journey";
import { AuthoringHistory } from "@/lib/fusion/graph/history";
import { canConnectNodes, type JourneyFinding } from "@/lib/fusion/journey/review";
import { cn } from "@/lib/utils";
import { KeywordsSuggestPanel } from "@/components/fusion/keywords/keywords-suggest-panel";
import {
  VisualBoard,
  applyAutoLayoutToPositions,
  type VisualBoardEdge,
  type VisualBoardNode,
} from "@/components/fusion/graph/visual-board";
import { DeveloperDefinitionPanel } from "@/components/fusion/journey/developer-definition-panel";
import { JourneySimulationPanel } from "@/components/fusion/journey/journey-simulation-panel";
import { JourneyReviewPanel } from "@/components/fusion/journey/journey-ai-review-panel";
import { ExpandedTextField } from "@/components/design/expanded-text-field";
import { BrandInheritanceBar } from "@/components/fusion/authoring/brand-inheritance-bar";
import {
  createInheritanceState,
  resolveInheritedValue,
  type BrandInheritanceState,
  type BrandKitSnapshot,
} from "@/lib/fusion/authoring/brand-inheritance";

type DraftRow = {
  id: string;
  name: string;
  status?: string;
  updatedAt: string;
};

const BEGINNER_PALETTE: JourneyNodeType[] = [
  "trigger",
  "message",
  "email",
  "wait",
  "condition",
  "award_loyalty",
  "human_handoff",
  "exit",
];

const EXPERT_PALETTE: JourneyNodeType[] = [
  ...BEGINNER_PALETTE,
  "create_case",
  "entry_tap",
  "branch",
  "page_view",
  "form_submit",
  "offer_redeem",
];

function toneForNode(
  type: JourneyNodeType,
  finding?: boolean
): VisualBoardNode["tone"] {
  if (finding) return "warning";
  if (isEntryNodeType(type)) return "entry";
  if (type === "exit") return "exit";
  return "executable";
}

export function JourneyEditorShell({
  businessId,
  initialDrafts,
  featureEnabled,
  brandKit,
}: {
  businessId: string;
  initialDrafts: DraftRow[];
  featureEnabled: boolean;
  brandKit?: BrandKitSnapshot | null;
}) {
  const [mode, setMode] = useState<"beginner" | "expert">("beginner");
  const [focusMode, setFocusMode] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [drafts, setDrafts] = useState(initialDrafts);
  const [history] = useState(() => new AuthoringHistory(createEmptyJourney()));
  const [definition, setDefinition] = useState<JourneyDefinition>(() => history.value);
  const [historyTick, setHistoryTick] = useState(0);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("DRAFT");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [runtimeEvents, setRuntimeEvents] = useState<RuntimeEvent[] | null>(null);
  const [highlightNodes, setHighlightNodes] = useState<string[]>([]);
  const [highlightEdges, setHighlightEdges] = useState<string[]>([]);
  const [findingNodeIds, setFindingNodeIds] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [brandState, setBrandState] = useState<BrandInheritanceState>(() =>
    createInheritanceState(brandKit ?? {})
  );

  const commit = useCallback(
    (next: JourneyDefinition, _label?: string) => {
      history.push(next, _label);
      setDefinition(next);
      setHistoryTick((t) => t + 1);
    },
    [history]
  );

  const undo = useCallback(() => {
    const next = history.undo();
    setDefinition(next);
    setHistoryTick((t) => t + 1);
  }, [history]);

  const redo = useCallback(() => {
    const next = history.redo();
    setDefinition(next);
    setHistoryTick((t) => t + 1);
  }, [history]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (meta && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const issues = useMemo(() => validateJourney(definition), [definition]);
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

  const selectedNode = definition.nodes.find((n) => n.id === selectedIds[0]);
  const palette = mode === "beginner" ? BEGINNER_PALETTE : EXPERT_PALETTE;

  const boardNodes: VisualBoardNode[] = useMemo(
    () =>
      definition.nodes.map((n) => ({
        id: n.id,
        label: n.label,
        subtitle: nodeSummary(n.type, n.config),
        x: n.position?.x ?? 40,
        y: n.position?.y ?? 40,
        tone: toneForNode(n.type, findingNodeIds.has(n.id)),
        badge: JOURNEY_NODE_REGISTRY[n.type]?.label ?? n.type,
        finding: findingNodeIds.has(n.id),
      })),
    [definition.nodes, findingNodeIds]
  );

  const boardEdges: VisualBoardEdge[] = useMemo(
    () =>
      definition.edges.map((e) => ({
        id: e.id,
        from: e.from,
        to: e.to,
        label: e.label,
        blocked: Boolean(e.label && /block|fail|deny/i.test(e.label)),
        highlight: highlightEdges.includes(e.id),
      })),
    [definition.edges, highlightEdges]
  );

  function addNode(type: JourneyNodeType) {
    const reg = JOURNEY_NODE_REGISTRY[type];
    const id = `${type}_${crypto.randomUUID().slice(0, 8)}`;
    const tone = resolveInheritedValue(brandState, "tone");
    const config: Record<string, unknown> =
      type === "email"
        ? {
            subject: "Journey update",
            body:
              typeof tone === "string"
                ? `A quick update from us (${tone} tone).`
                : "A quick update from us.",
            requireConsent: true,
            consentAware: true,
          }
        : type === "message"
          ? {
              body:
                typeof tone === "string"
                  ? `Thanks for tapping — more soon.`
                  : "Thanks for tapping — more soon.",
              requireConsent: true,
              consentAware: true,
            }
          : {};
    const next: JourneyDefinition = {
      ...definition,
      nodes: [
        ...definition.nodes,
        {
          id,
          type,
          label: reg.label,
          config,
          position: {
            x: 120 + (definition.nodes.length % 4) * 200,
            y: 60 + Math.floor(definition.nodes.length / 4) * 100,
          },
        },
      ],
    };
    commit(next, `Add ${type}`);
    setSelectedIds([id]);
    setMessage(`Added ${reg.label}`);
  }

  function removeSelected() {
    if (selectedIds.length === 0) return;
    const remove = new Set(selectedIds);
    commit(
      {
        ...definition,
        nodes: definition.nodes.filter((n) => !remove.has(n.id)),
        edges: definition.edges.filter((e) => !remove.has(e.from) && !remove.has(e.to)),
      },
      "Delete nodes"
    );
    setSelectedIds([]);
  }

  function duplicateSelected() {
    const node = selectedNode;
    if (!node) return;
    const id = `${node.type}_${crypto.randomUUID().slice(0, 8)}`;
    commit(
      {
        ...definition,
        nodes: [
          ...definition.nodes,
          {
            ...node,
            id,
            label: `${node.label} copy`,
            position: {
              x: (node.position?.x ?? 40) + 24,
              y: (node.position?.y ?? 40) + 24,
            },
          },
        ],
      },
      "Duplicate"
    );
    setSelectedIds([id]);
  }

  function onMoveNodes(positions: Record<string, { x: number; y: number }>) {
    setDefinition((d) => ({
      ...d,
      nodes: d.nodes.map((n) =>
        positions[n.id] ? { ...n, position: positions[n.id] } : n
      ),
    }));
  }

  function onMoveEnd(positions: Record<string, { x: number; y: number }>) {
    // history.value is still pre-drag (live moves never pushed). One entry per completed drag.
    const base = history.value;
    const next: JourneyDefinition = {
      ...base,
      nodes: base.nodes.map((n) =>
        positions[n.id] ? { ...n, position: positions[n.id] } : n
      ),
    };
    const changed = next.nodes.some((n, i) => {
      const prev = base.nodes[i];
      return (
        prev &&
        (prev.position?.x !== n.position?.x || prev.position?.y !== n.position?.y)
      );
    });
    if (!changed) return;
    commit(next, "Move nodes");
  }

  function connect(fromId: string, toId: string) {
    const check = canConnectNodes(definition, fromId, toId);
    if (!check.ok) {
      setMessage(check.reason ?? "Cannot connect");
      setConnectFrom(null);
      return;
    }
    const id = `e_${crypto.randomUUID().slice(0, 8)}`;
    commit(
      {
        ...definition,
        edges: [...definition.edges, { id, from: fromId, to: toId }],
      },
      "Connect"
    );
    setConnectFrom(null);
    setMessage(`Connected →`);
  }

  function autoLayout() {
    const entry = definition.nodes.find((n) => isEntryNodeType(n.type));
    const positions = applyAutoLayoutToPositions(
      definition.nodes.map((n) => ({ id: n.id })),
      definition.edges,
      entry?.id
    );
    commit(
      {
        ...definition,
        nodes: definition.nodes.map((n) => ({
          ...n,
          position: positions[n.id] ?? n.position,
        })),
      },
      "Auto-layout"
    );
  }

  function insertBeginnerStage(type: JourneyNodeType) {
    const reg = JOURNEY_NODE_REGISTRY[type];
    const id = `${type}_${crypto.randomUUID().slice(0, 8)}`;
    const exit = definition.nodes.find((n) => n.type === "exit");
    const stagesNow = journeyToStages(definition);
    const lastBeforeExit =
      [...stagesNow].reverse().find((n) => n.type !== "exit") ?? stagesNow[0];
    const nodes = [
      ...definition.nodes,
      {
        id,
        type,
        label: reg.label,
        config:
          type === "email"
            ? { subject: "Journey update", requireConsent: true, consentAware: true }
            : type === "message"
              ? { requireConsent: true, consentAware: true }
              : {},
        position: {
          x: (lastBeforeExit?.position?.x ?? 80) + 200,
          y: lastBeforeExit?.position?.y ?? 120,
        },
      },
    ];
    let edges = definition.edges.filter(
      (e) => !(lastBeforeExit && exit && e.from === lastBeforeExit.id && e.to === exit.id)
    );
    if (lastBeforeExit) {
      edges = [...edges, { id: `e_${crypto.randomUUID().slice(0, 8)}`, from: lastBeforeExit.id, to: id }];
    }
    if (exit) {
      edges = [...edges, { id: `e_${crypto.randomUUID().slice(0, 8)}`, from: id, to: exit.id }];
    }
    commit({ ...definition, nodes, edges }, `Beginner add ${type}`);
    setSelectedIds([id]);
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
    history.replace(data.draft.definition as JourneyDefinition);
    setDefinition(data.draft.definition as JourneyDefinition);
    setHistoryTick((t) => t + 1);
    setStatus(data.draft.status ?? "DRAFT");
    setRuntimeEvents(null);
    setMessage(`Loaded "${data.draft.name}" (${data.draft.status})`);
  }

  void historyTick;

  return (
    <div
      className={cn("space-y-4", focusMode && "fixed inset-0 z-40 overflow-auto bg-[#070b12] p-4 lg:p-6")}
      data-testid="journey-editor-shell"
    >
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

      {!focusMode ? <KeywordsSuggestPanel surface="tapflow" defaultChannel="email" /> : null}

      {brandKit ? (
        <BrandInheritanceBar state={brandState} onChange={setBrandState} />
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1 space-y-1">
          <label htmlFor="journey-name" className="text-xs font-medium text-muted-foreground">
            Journey name
          </label>
          <Input
            id="journey-name"
            value={definition.name}
            onChange={(e) => setDefinition((d) => ({ ...d, name: e.target.value }))}
            onBlur={() => commit(definition, "Rename")}
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
        <Button type="button" variant="outline" size="sm" onClick={undo} disabled={!history.canUndo} aria-label="Undo">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={redo} disabled={!history.canRedo} aria-label="Redo">
          <Redo2 className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={autoLayout}>
          <LayoutTemplate className="h-3.5 w-3.5" />
          Auto-layout
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => setFocusMode((v) => !v)}
          data-testid="journey-focus-mode"
        >
          <Focus className="h-3.5 w-3.5" />
          {focusMode ? "Exit focus" : "Focus"}
        </Button>
        <Button onClick={saveDraft} disabled={pending || errors.length > 0} className="gap-2">
          <Save className="h-4 w-4" />
          {pending ? "Saving…" : "Save draft"}
        </Button>
        <Button type="button" variant="outline" disabled={pending || !canLifecyclePublish} onClick={() => lifecycle("publish")}>
          Publish
        </Button>
        <Button type="button" variant="outline" disabled={pending || !canLifecyclePublish} onClick={() => lifecycle("activate")}>
          Activate
        </Button>
        <Button type="button" variant="outline" disabled={pending || !canPause} onClick={() => lifecycle("pause")}>
          Pause
        </Button>
        <Button type="button" variant="outline" disabled={pending || !canResume} onClick={() => lifecycle("resume")}>
          Resume
        </Button>
        <Button type="button" variant="secondary" disabled={pending} onClick={runDryRun} className="gap-2">
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

      <div
        className={cn(
          "grid gap-4",
          focusMode || !inspectorOpen ? "lg:grid-cols-1" : "lg:grid-cols-[1fr_320px]"
        )}
      >
        <div className="space-y-3 min-w-0">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card/30 p-3">
            <p className="text-xs font-semibold text-muted-foreground">
              {mode === "beginner" ? "Recommended steps" : "Node palette"}
            </p>
            <div className="flex flex-wrap gap-2">
              {palette.map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    mode === "beginner" ? insertBeginnerStage(type) : addNode(type)
                  }
                >
                  <Plus className="mr-1 h-3 w-3" />
                  {JOURNEY_NODE_REGISTRY[type].label}
                </Button>
              ))}
            </div>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={connectFrom ? "default" : "outline"}
                onClick={() =>
                  setConnectFrom((c) => (c ? null : selectedIds[0] ?? null))
                }
                disabled={!selectedIds[0] && !connectFrom}
              >
                {connectFrom ? "Click target node…" : "Connect"}
              </Button>
              <Button type="button" size="sm" variant="outline" className="gap-1" onClick={duplicateSelected} disabled={!selectedNode}>
                <Copy className="h-3 w-3" />
                Duplicate
              </Button>
              <Button type="button" size="sm" variant="destructive" className="gap-1" onClick={removeSelected} disabled={selectedIds.length === 0}>
                <Trash2 className="h-3 w-3" />
                Delete
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label={inspectorOpen ? "Collapse inspector" : "Expand inspector"}
                onClick={() => setInspectorOpen((v) => !v)}
              >
                {inspectorOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {mode === "beginner" ? (
            <div className="rounded-xl border border-border/50 bg-card/20 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Guided stages (same engine as the graph below)
              </p>
              <ol className="flex flex-wrap gap-2">
                {stages.map((node, idx) => (
                  <li key={node.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedIds([node.id])}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs",
                        selectedIds.includes(node.id)
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border/60 text-muted-foreground"
                      )}
                    >
                      {idx + 1}. {node.label}
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          <VisualBoard
            testId="journey-visual-board"
            nodes={boardNodes.map((n) =>
              highlightNodes.includes(n.id) ? { ...n, tone: "highlight" } : n
            )}
            edges={boardEdges}
            selectedIds={selectedIds}
            highlightedNodeIds={highlightNodes}
            highlightedEdgeIds={highlightEdges}
            connectFromId={connectFrom}
            onSelect={(ids) => setSelectedIds(ids)}
            onMoveNodes={onMoveNodes}
            onMoveEnd={onMoveEnd}
            onConnect={connect}
            emptyLabel="Add a step from the palette to build the customer journey"
          />
          <p className="text-[10px] text-muted-foreground">
            Release drag to commit positions · keyboard arrows nudge selected node · non-drag: use Connect + lists
          </p>

          {/* Accessible non-drag edge list */}
          <details className="rounded-lg border border-border/40 p-3 text-xs">
            <summary className="cursor-pointer font-medium text-muted-foreground">
              Connections list ({definition.edges.length}) — keyboard alternative
            </summary>
            <ul className="mt-2 space-y-1">
              {definition.edges.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2 font-mono">
                  <span>
                    {e.from.slice(0, 16)} → {e.to.slice(0, 16)}
                    {e.label ? ` (${e.label})` : ""}
                  </span>
                  <button
                    type="button"
                    className="text-red-400 hover:underline"
                    onClick={() =>
                      commit(
                        { ...definition, edges: definition.edges.filter((x) => x.id !== e.id) },
                        "Remove edge"
                      )
                    }
                  >
                    remove
                  </button>
                </li>
              ))}
            </ul>
          </details>
        </div>

        {inspectorOpen && !focusMode ? (
          <aside className="space-y-3 min-w-0">
            <div className="rounded-xl border border-border/60 bg-card/40 p-4">
              <p className="mb-2 text-sm font-semibold">
                {mode === "beginner" ? "Simple inspector" : "Inspector"}
              </p>
              {selectedNode ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="node-label" className="text-xs">
                      Label
                    </Label>
                    <Input
                      id="node-label"
                      value={selectedNode.label}
                      onChange={(e) => {
                        const label = e.target.value;
                        setDefinition((d) => ({
                          ...d,
                          nodes: d.nodes.map((n) =>
                            n.id === selectedNode.id ? { ...n, label } : n
                          ),
                        }));
                      }}
                      onBlur={() => commit(definition, "Label")}
                    />
                  </div>
                  {(selectedNode.type === "message" || selectedNode.type === "email") && (
                    <ExpandedTextField
                      label={selectedNode.type === "email" ? "Email body" : "Message"}
                      value={String(selectedNode.config?.body ?? "")}
                      recommendedMax={selectedNode.type === "email" ? 600 : 280}
                      onChange={(body) => {
                        setDefinition((d) => ({
                          ...d,
                          nodes: d.nodes.map((n) =>
                            n.id === selectedNode.id
                              ? { ...n, config: { ...n.config, body } }
                              : n
                          ),
                        }));
                      }}
                      onBlur={() => commit(definition, "Message body")}
                      preview={String(selectedNode.config?.body ?? "")}
                      data-testid="journey-message-body"
                    />
                  )}
                  {selectedNode.type === "email" && (
                    <div className="space-y-1">
                      <Label htmlFor="email-subject" className="text-xs">
                        Subject
                      </Label>
                      <Input
                        id="email-subject"
                        value={String(selectedNode.config?.subject ?? "")}
                        onChange={(e) => {
                          const subject = e.target.value;
                          setDefinition((d) => ({
                            ...d,
                            nodes: d.nodes.map((n) =>
                              n.id === selectedNode.id
                                ? { ...n, config: { ...n.config, subject } }
                                : n
                            ),
                          }));
                        }}
                        onBlur={() => commit(definition, "Subject")}
                      />
                    </div>
                  )}
                  {mode === "expert" && (selectedNode.type === "wait" || selectedNode.type === "delay") && (
                    <div className="space-y-1">
                      <Label htmlFor="wait-ms" className="text-xs">
                        Wait (minutes)
                      </Label>
                      <Input
                        id="wait-ms"
                        type="number"
                        min={1}
                        value={Number(selectedNode.config?.minutes ?? 15)}
                        onChange={(e) => {
                          const minutes = Number(e.target.value);
                          setDefinition((d) => ({
                            ...d,
                            nodes: d.nodes.map((n) =>
                              n.id === selectedNode.id
                                ? { ...n, config: { ...n.config, minutes } }
                                : n
                            ),
                          }));
                        }}
                        onBlur={() => commit(definition, "Wait")}
                      />
                    </div>
                  )}
                  {mode === "expert" ? (
                    <p className="font-mono text-[10px] text-muted-foreground">{selectedNode.id}</p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Select a step on the journey board.</p>
              )}
            </div>

            {drafts.length > 0 && (
              <div className="space-y-2 rounded-xl border border-border/60 p-3">
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

            <div className="rounded-xl border border-border/60 p-3">
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
          </aside>
        ) : null}
      </div>

      <div className={cn("grid gap-4", focusMode ? "lg:grid-cols-1" : "lg:grid-cols-2")}>
        <JourneySimulationPanel
          definition={definition}
          runtimeEvents={runtimeEvents}
          onHighlight={(nodes, edges) => {
            setHighlightNodes(nodes);
            setHighlightEdges(edges);
          }}
        />
        <JourneyReviewPanel
          definition={definition}
          onApplyDefinition={(next, label) => commit(next, label)}
          onMarkFindings={(findings: JourneyFinding[]) => {
            setFindingNodeIds(new Set(findings.flatMap((f) => f.nodeIds)));
          }}
        />
      </div>

      <div className="rounded-xl border border-border/60 p-4">
        <p className="mb-1 text-sm font-semibold">Analytics overlay · {analytics.evidence}</p>
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

      <DeveloperDefinitionPanel
        definition={definition}
        onApply={(next) => {
          history.replace(next);
          setDefinition(next);
          setHistoryTick((t) => t + 1);
          setMessage("Developer definition applied");
        }}
      />

      {message ? (
        <p
          role="status"
          aria-live="polite"
          data-testid="journey-editor-status"
          className="text-sm text-muted-foreground"
        >
          {message}
        </p>
      ) : null}
      <p className="font-mono text-[10px] text-muted-foreground">business: {businessId}</p>
    </div>
  );
}

function nodeSummary(type: JourneyNodeType, config: Record<string, unknown>): string {
  if (type === "email") return String(config.subject ?? "Email");
  if (type === "message") {
    const body = String(config.body ?? "");
    return body ? (body.length > 42 ? `${body.slice(0, 42)}…` : body) : "Message";
  }
  if (type === "wait" || type === "delay") return `${config.minutes ?? 15} min`;
  if (type === "condition" || type === "branch") return "Branch";
  return JOURNEY_NODE_REGISTRY[type]?.description ?? type;
}
