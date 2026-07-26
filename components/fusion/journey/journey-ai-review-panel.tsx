"use client";

import { useMemo, useState } from "react";
import { ListChecks, Check, Diff, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { JourneyDefinition } from "@/lib/fusion/journey";
import {
  applyJourneyPatch,
  describeJourneyDiff,
  reviewJourney,
  type JourneyFinding,
  type JourneyReviewProposal,
} from "@/lib/fusion/journey/review";

/**
 * Rules-based Journey Review — deterministic validation/simulation findings.
 * Does not invoke a live AI model. Live grounded Automation Team review is Phase 2.
 */
export function JourneyReviewPanel({
  definition,
  onApplyDefinition,
  onMarkFindings,
  className,
}: {
  definition: JourneyDefinition;
  onApplyDefinition: (next: JourneyDefinition, label: string) => void;
  onMarkFindings?: (findings: JourneyFinding[]) => void;
  className?: string;
}) {
  const [proposal, setProposal] = useState<JourneyReviewProposal | null>(null);
  const [selectedOps, setSelectedOps] = useState<Set<number>>(new Set());
  const [previewDef, setPreviewDef] = useState<JourneyDefinition | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const live = useMemo(() => reviewJourney(definition), [definition]);

  function runReview() {
    const result = reviewJourney(definition);
    setProposal(result.proposal);
    onMarkFindings?.(result.findings);
    if (result.proposal) {
      setSelectedOps(new Set(result.proposal.proposedOps.map((_, i) => i)));
      setStatus(`Review complete — ${result.findings.length} finding(s).`);
    } else {
      setSelectedOps(new Set());
      setStatus("No corrective suggestions needed.");
    }
    setPreviewDef(null);
  }

  function toggleOp(index: number) {
    setSelectedOps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
    setPreviewDef(null);
  }

  function showDiff() {
    if (!proposal) return;
    const indexes = Array.from(selectedOps).sort((a, b) => a - b);
    const next = applyJourneyPatch(definition, proposal.proposedOps, indexes);
    setPreviewDef(next);
    setProposal({ ...proposal, status: "previewed" });
    setStatus("Suggested corrections ready — accept to apply, or reject.");
  }

  function accept() {
    if (!proposal) return;
    const indexes = Array.from(selectedOps).sort((a, b) => a - b);
    if (indexes.length === 0) {
      setStatus("Select at least one suggested correction to accept.");
      return;
    }
    const next = applyJourneyPatch(definition, proposal.proposedOps, indexes);
    const validated = reviewJourney(next);
    onApplyDefinition(
      next,
      indexes.length === proposal.proposedOps.length
        ? "Journey review accept"
        : "Journey review partial accept"
    );
    setProposal({
      ...proposal,
      status: indexes.length === proposal.proposedOps.length ? "accepted" : "partial",
      acceptedOpIndexes: indexes,
    });
    setPreviewDef(null);
    onMarkFindings?.(validated.findings);
    setStatus(
      `Applied ${indexes.length} change(s). Re-validated: ${validated.findings.length} remaining finding(s).`
    );
  }

  function reject() {
    if (!proposal) return;
    setProposal({ ...proposal, status: "rejected" });
    setPreviewDef(null);
    setSelectedOps(new Set());
    setStatus("Suggested corrections rejected — journey unchanged.");
  }

  const diff =
    proposal && previewDef
      ? describeJourneyDiff(
          definition,
          previewDef,
          proposal.proposedOps.filter((_, i) => selectedOps.has(i))
        )
      : null;

  const findings = proposal?.findings ?? live.findings;

  return (
    <div
      className={cn("rounded-xl border border-border/60 bg-card/30 p-4", className)}
      data-testid="journey-ai-review-panel"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-primary" aria-hidden />
          <div>
            <p className="text-sm font-semibold">Journey Review</p>
            <p className="text-[11px] text-muted-foreground">
              Rules-based review of the current Journey definition using validation and simulation
              rules. Does not call a live AI model. Never silently rewrites or publishes. Live
              grounded Automation Team review is Phase 2.
            </p>
          </div>
        </div>
        <Button type="button" size="sm" onClick={runReview} data-testid="journey-ai-review-run">
          Run review
        </Button>
      </div>

      <ul className="mb-3 max-h-48 space-y-2 overflow-auto">
        {findings.length === 0 ? (
          <li className="text-sm text-primary">No findings on the current journey.</li>
        ) : (
          findings.map((f) => (
            <li
              key={f.id}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm",
                f.severity === "error"
                  ? "border-red-500/40 bg-red-500/10"
                  : f.severity === "warning"
                    ? "border-amber-500/40 bg-amber-500/10"
                    : "border-border/50 bg-background/30"
              )}
              data-testid={`journey-finding-${f.code}`}
            >
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {f.severity}
                </Badge>
                <span className="font-medium">{f.title}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{f.plainLanguage}</p>
              {f.suggestedFix ? (
                <p className="mt-1 text-[11px] text-primary/90">Suggested: {f.suggestedFix}</p>
              ) : null}
            </li>
          ))
        )}
      </ul>

      {proposal && proposal.proposedOps.length > 0 ? (
        <div className="space-y-3 border-t border-border/40 pt-3">
          <p className="text-xs font-medium text-muted-foreground">{proposal.summary}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Suggested corrections
          </p>
          <ul className="space-y-1">
            {proposal.proposedOps.map((op, index) => {
              const summary = describeJourneyDiff(definition, definition, [op]).opSummaries[0];
              return (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedOps.has(index)}
                    onChange={() => toggleOp(index)}
                    aria-label={`Include correction: ${summary}`}
                    data-testid={`journey-ai-op-${index}`}
                  />
                  <span>{summary}</span>
                </li>
              );
            })}
          </ul>

          <div className="rounded-lg border border-border/40 bg-background/40 p-3 text-xs">
            <p className="font-semibold">What the customer experiences</p>
            <p className="mt-1 text-muted-foreground">{proposal.customerExperience}</p>
          </div>

          {diff ? (
            <div
              className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs"
              data-testid="journey-ai-diff"
            >
              <p className="flex items-center gap-1 font-semibold">
                <Diff className="h-3.5 w-3.5" />
                Correction preview
              </p>
              <p className="mt-1 text-muted-foreground">
                Nodes {diff.nodesAdded >= 0 ? `+${diff.nodesAdded}` : diff.nodesAdded} · Edges{" "}
                {diff.edgesAdded >= 0 ? `+${diff.edgesAdded}` : diff.edgesAdded}
                {diff.nodesRemoved ? ` · removed nodes ${diff.nodesRemoved}` : ""}
                {diff.edgesRemoved ? ` · removed edges ${diff.edgesRemoved}` : ""}
              </p>
              <ul className="mt-2 list-disc space-y-0.5 pl-4">
                {diff.opSummaries.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" className="gap-1" onClick={showDiff}>
              <Diff className="h-3.5 w-3.5" />
              Preview corrections
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-1"
              onClick={accept}
              data-testid="journey-ai-accept"
            >
              <Check className="h-3.5 w-3.5" />
              Accept selected
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={reject}
              data-testid="journey-ai-reject"
            >
              <X className="h-3.5 w-3.5" />
              Reject
            </Button>
          </div>
        </div>
      ) : null}

      {status ? (
        <p className="mt-3 text-xs text-muted-foreground" role="status" data-testid="journey-ai-status">
          {status}
        </p>
      ) : null}
    </div>
  );
}

/** @deprecated Use JourneyReviewPanel — alias kept for import stability */
export const JourneyAiReviewPanel = JourneyReviewPanel;
