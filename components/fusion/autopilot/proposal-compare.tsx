"use client";

import { compareProposals, type ComparableProposal } from "@/lib/fusion/autopilot/budget";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  left: ComparableProposal;
  right: ComparableProposal;
  className?: string;
};

/**
 * Side-by-side snippet for reviewing two Automation Team proposals.
 */
export function ProposalCompareSnippet({ left, right, className }: Props) {
  const diff = compareProposals(left, right);

  return (
    <div className={cn("space-y-3 rounded-xl border border-border/60 bg-card/30 p-4", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold">Compare proposals</p>
        <Badge variant={diff.sameRecipe ? "default" : "outline"} className="text-[10px]">
          {diff.sameRecipe ? "Same recipe" : "Different recipes"}
        </Badge>
        <Badge variant={diff.sameVersion ? "outline" : "destructive"} className="text-[10px]">
          {diff.sameVersion ? "Same version" : "Version mismatch"}
        </Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <ProposalColumn title="A" proposal={left} />
        <ProposalColumn title="B" proposal={right} />
      </div>

      <div className="space-y-1 text-xs text-muted-foreground">
        <p>
          Artifacts in both:{" "}
          <span className="text-foreground">{diff.artifactDiff.both.join(", ") || "—"}</span>
        </p>
        <p>
          Only A:{" "}
          <span className="text-foreground">{diff.artifactDiff.onlyLeft.join(", ") || "—"}</span>
        </p>
        <p>
          Only B:{" "}
          <span className="text-foreground">{diff.artifactDiff.onlyRight.join(", ") || "—"}</span>
        </p>
        <p>
          Summaries {diff.summaryEqual ? "match" : "differ"}
        </p>
      </div>
    </div>
  );
}

function ProposalColumn({
  title,
  proposal,
}: {
  title: string;
  proposal: ComparableProposal;
}) {
  return (
    <div className="rounded-lg border border-border/40 bg-background/40 p-3">
      <p className="mb-1 text-xs font-medium text-muted-foreground">Proposal {title}</p>
      <p className="font-mono text-[10px] text-primary">{proposal.id.slice(0, 10)}…</p>
      <p className="mt-1 text-sm font-medium">{proposal.summary}</p>
      <p className="mt-1 font-mono text-[10px] text-muted-foreground">
        {proposal.recipeId}
        {proposal.recipeVersion ? `@${proposal.recipeVersion}` : ""} · {proposal.status}
      </p>
      <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
        {proposal.artifacts.map((a) => (
          <li key={`${a.kind}-${a.label}`}>
            {a.kind}: {a.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
