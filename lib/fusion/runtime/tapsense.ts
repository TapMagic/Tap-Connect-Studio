/**
 * TapSense — deterministic selection among approved eligible content.
 */

export type SenseContext = {
  at: Date;
  timezone: string;
  tapPointId?: string;
  locationId?: string;
  relationshipId?: string;
  campaignIdsEligible: string[];
  guardianAllowsPromo: boolean;
};

export type SenseCandidate = {
  id: string;
  kind: "campaign" | "spotlight" | "action" | "fallback";
  score: number;
  reasons: string[];
};

export function selectSenseWinner(
  ctx: SenseContext,
  candidates: SenseCandidate[]
): SenseCandidate | null {
  const filtered = candidates.filter((c) => {
    if (c.kind === "spotlight" && !ctx.guardianAllowsPromo) return false;
    if (c.kind === "campaign" && ctx.campaignIdsEligible.length) {
      return ctx.campaignIdsEligible.includes(c.id) || c.kind !== "campaign";
    }
    return true;
  });
  if (!filtered.length) return null;
  return [...filtered].sort((a, b) => b.score - a.score)[0] ?? null;
}
