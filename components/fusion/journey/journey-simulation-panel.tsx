"use client";

import { useEffect, useMemo, useState } from "react";
import { Pause, Play, SkipForward, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  SAMPLE_VISITOR,
  executeJourneyDryRun,
  simulateJourney,
  type JourneyDefinition,
  type RuntimeEvent,
} from "@/lib/fusion/journey";
import { buildCustomerExperienceSummary } from "@/lib/fusion/journey/review";

export function JourneySimulationPanel({
  definition,
  runtimeEvents,
  onHighlight,
  className,
}: {
  definition: JourneyDefinition;
  runtimeEvents?: RuntimeEvent[] | null;
  onHighlight?: (nodeIds: string[], edgeIds: string[]) => void;
  className?: string;
}) {
  const [branch, setBranch] = useState<string>("");
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const pathKey = `${definition.schemaVersion}:${definition.nodes.map((n) => n.id).join(",")}:${definition.edges.map((e) => e.id).join(",")}:${branch}`;
  const [prevPathKey, setPrevPathKey] = useState(pathKey);
  if (pathKey !== prevPathKey) {
    setPrevPathKey(pathKey);
    setStepIndex(0);
    setPlaying(false);
  }

  const branchOptions = useMemo(() => {
    const labels = Array.from(
      new Set(definition.edges.map((e) => e.label).filter(Boolean) as string[])
    );
    return labels;
  }, [definition.edges]);

  const simulation = useMemo(
    () => simulateJourney(definition, branch ? { preferEdgeLabel: branch } : undefined),
    [definition, branch]
  );

  const safeStepIndex = Math.min(stepIndex, Math.max(0, simulation.steps.length - 1));

  const localRuntime = useMemo(
    () => executeJourneyDryRun(definition, SAMPLE_VISITOR, { requireValid: false }),
    [definition]
  );

  const events = runtimeEvents ?? localRuntime.events;
  const customerSummary = useMemo(
    () => buildCustomerExperienceSummary(definition),
    [definition]
  );

  const currentStep = simulation.steps[safeStepIndex];
  const currentEdge = useMemo(() => {
    if (!currentStep || safeStepIndex === 0) return null;
    const prev = simulation.steps[safeStepIndex - 1];
    return definition.edges.find((e) => e.from === prev?.nodeId && e.to === currentStep.nodeId);
  }, [currentStep, safeStepIndex, simulation.steps, definition.edges]);

  // Notify parent of highlight — schedule to avoid sync setState-in-effect on parent
  useEffect(() => {
    if (!onHighlight) return;
    const nodeIds = currentStep ? [currentStep.nodeId] : [];
    const edgeIds = currentEdge ? [currentEdge.id] : [];
    const t = window.setTimeout(() => onHighlight(nodeIds, edgeIds), 0);
    return () => window.clearTimeout(t);
  }, [currentStep, currentEdge, onHighlight]);

  useEffect(() => {
    if (!playing) return;
    if (safeStepIndex >= simulation.steps.length - 1) {
      const stop = window.setTimeout(() => setPlaying(false), 0);
      return () => window.clearTimeout(stop);
    }
    const t = window.setTimeout(() => setStepIndex((i) => i + 1), 900);
    return () => window.clearTimeout(t);
  }, [playing, safeStepIndex, simulation.steps.length]);

  const communications = simulation.steps.filter(
    (s) => s.nodeType === "email" || s.nodeType === "message" || s.nodeType === "award_loyalty"
  );

  const blocked = events.find((e) => e.blocked);

  return (
    <div
      className={cn("rounded-xl border border-border/60 bg-card/30 p-4", className)}
      data-testid="journey-simulation-panel"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Simulation &amp; customer readout</p>
          <p className="text-[11px] text-muted-foreground">
            Step through what the customer experiences. Technical events stay under View details.
          </p>
        </div>
        <Badge variant={simulation.completed ? "default" : "outline"}>
          {simulation.completed ? "Reaches exit" : "Incomplete path"}
        </Badge>
      </div>

      {branchOptions.length > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label htmlFor="sim-branch" className="text-xs text-muted-foreground">
            Branch scenario
          </label>
          <select
            id="sim-branch"
            className="rounded-md border border-border bg-background px-2 py-1 text-xs"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            data-testid="journey-sim-branch"
          >
            <option value="">Primary path</option>
            {branchOptions.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="mb-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="gap-1"
          onClick={() => {
            if (safeStepIndex >= simulation.steps.length - 1) {
              setStepIndex(0);
              setPlaying(true);
              return;
            }
            setPlaying((p) => !p);
          }}
          data-testid="journey-sim-play"
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {playing ? "Pause" : "Play path"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1"
          disabled={safeStepIndex >= simulation.steps.length - 1}
          onClick={() => setStepIndex((i) => Math.min(simulation.steps.length - 1, i + 1))}
        >
          <SkipForward className="h-3.5 w-3.5" />
          Next step
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setStepIndex(0)}>
          Reset
        </Button>
      </div>

      <ol className="mb-3 max-h-40 space-y-1 overflow-auto text-sm">
        {simulation.steps.map((s, idx) => (
          <li
            key={`${s.nodeId}-${idx}`}
            className={cn(
              "rounded-md px-2 py-1",
              idx === safeStepIndex && "bg-primary/15 text-primary"
            )}
          >
            <span className="font-medium">{idx + 1}. {s.label}</span>
            <span className="ml-2 text-xs text-muted-foreground">{s.action}</span>
          </li>
        ))}
      </ol>

      <div className="rounded-lg border border-border/40 bg-background/40 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          What the customer experiences
        </p>
        <p className="mt-1 text-sm leading-relaxed text-foreground/90">{customerSummary}</p>
        {blocked ? (
          <p className="mt-2 text-xs text-amber-200" role="status">
            Blocked path: {blocked.detail ?? blocked.action} at {blocked.nodeId}
          </p>
        ) : null}
        <p className="mt-2 text-xs text-muted-foreground">
          Estimated communications / actions:{" "}
          {communications.length === 0
            ? "none on this path"
            : communications.map((c) => c.label).join(" · ")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Final outcome:{" "}
          {simulation.completed
            ? simulation.steps[simulation.steps.length - 1]?.label ?? "Complete"
            : "Path does not reach Exit"}
        </p>
      </div>

      <button
        type="button"
        className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setShowDetails((v) => !v)}
        data-testid="journey-sim-details"
      >
        <Eye className="h-3.5 w-3.5" />
        {showDetails ? "Hide details" : "View details"}
      </button>
      {showDetails ? (
        <ul className="mt-2 max-h-36 space-y-0.5 overflow-auto font-mono text-[10px] text-muted-foreground">
          {events.map((ev, idx) => (
            <li key={idx}>{JSON.stringify(ev)}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
