/**
 * Client-safe Autopilot proposal compare helpers (no Prisma / Node builtins).
 */

export type ComparableProposal = {
  id: string;
  recipeId: string;
  recipeVersion?: string | number;
  revision?: number;
  summary: string;
  status: string;
  artifacts: Array<{ kind: string; label: string }>;
  warnings?: string[];
};

export type ProposalCompareResult = {
  leftId: string;
  rightId: string;
  sameRecipe: boolean;
  sameVersion: boolean;
  sameRevision: boolean;
  artifactDiff: {
    onlyLeft: string[];
    onlyRight: string[];
    both: string[];
  };
  summaryEqual: boolean;
};

export function compareProposals(
  left: ComparableProposal,
  right: ComparableProposal
): ProposalCompareResult {
  const leftKinds = new Set(left.artifacts.map((a) => a.kind));
  const rightKinds = new Set(right.artifacts.map((a) => a.kind));
  const both: string[] = [];
  const onlyLeft: string[] = [];
  const onlyRight: string[] = [];

  for (const k of leftKinds) {
    if (rightKinds.has(k)) both.push(k);
    else onlyLeft.push(k);
  }
  for (const k of rightKinds) {
    if (!leftKinds.has(k)) onlyRight.push(k);
  }

  return {
    leftId: left.id,
    rightId: right.id,
    sameRecipe: left.recipeId === right.recipeId,
    sameVersion: (left.recipeVersion ?? "1") === (right.recipeVersion ?? "1"),
    sameRevision: (left.revision ?? 1) === (right.revision ?? 1),
    artifactDiff: { onlyLeft, onlyRight, both },
    summaryEqual: left.summary === right.summary,
  };
}
