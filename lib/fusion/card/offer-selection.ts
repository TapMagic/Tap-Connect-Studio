/**
 * Explicit Campaign selection for Card Offer bind — never silent “newest”.
 */

export type OfferCampaignCandidate = {
  id: string;
  title: string;
  status: string;
  hasOffer: boolean;
  offerTitle?: string | null;
  offerCode?: string | null;
  offerValueSummary?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  assignmentSummary?: string | null;
  groupSummary?: string | null;
  /** Already linked on this Card Spotlight */
  boundToThisCard?: boolean;
};

export type OfferSelectionMode = "none" | "single" | "multiple";

export function listEligibleOfferCampaigns(
  campaigns: OfferCampaignCandidate[]
): OfferCampaignCandidate[] {
  return campaigns.filter((c) => c.hasOffer);
}

export function offerSelectionMode(
  eligible: OfferCampaignCandidate[]
): OfferSelectionMode {
  if (eligible.length === 0) return "none";
  if (eligible.length === 1) return "single";
  return "multiple";
}

/**
 * Initial picker value:
 * - already bound (and still eligible) → that Campaign (existing intentional bind)
 * - exactly one eligible → may suggest that one
 * - multiple eligible → empty (host must choose)
 * - none → empty
 *
 * Never picks “newest” by recency.
 */
export function initialOfferCampaignSelection(input: {
  eligible: OfferCampaignCandidate[];
  boundCampaignId?: string | null;
}): string {
  const { eligible, boundCampaignId } = input;
  if (boundCampaignId && eligible.some((c) => c.id === boundCampaignId)) {
    return boundCampaignId;
  }
  if (eligible.length === 1) return eligible[0]!.id;
  return "";
}

export function formatOfferCampaignOptionLabel(c: OfferCampaignCandidate): string {
  const offer = c.offerTitle?.trim() || c.offerValueSummary?.trim() || "Offer";
  const code = c.offerCode?.trim() ? ` · ${c.offerCode}` : "";
  const bound = c.boundToThisCard ? " · currently on Card" : "";
  return `${c.title} · ${offer}${code} · ${c.status}${bound}`;
}

export function describeOfferCampaignContext(c: OfferCampaignCandidate): string[] {
  const lines: string[] = [];
  lines.push(`Campaign: ${c.title}`);
  lines.push(`Status: ${c.status}`);
  if (c.offerTitle) lines.push(`Offer: ${c.offerTitle}`);
  if (c.offerCode) lines.push(`Code: ${c.offerCode}`);
  if (c.offerValueSummary && c.offerValueSummary !== c.offerTitle) {
    lines.push(c.offerValueSummary);
  }
  if (c.scheduledStart || c.scheduledEnd) {
    const start = c.scheduledStart
      ? new Date(c.scheduledStart).toLocaleDateString()
      : "—";
    const end = c.scheduledEnd ? new Date(c.scheduledEnd).toLocaleDateString() : "—";
    lines.push(`Schedule: ${start} → ${end}`);
  }
  if (c.assignmentSummary) lines.push(`Tap Points: ${c.assignmentSummary}`);
  if (c.groupSummary) lines.push(`Groups: ${c.groupSummary}`);
  if (c.boundToThisCard) lines.push("Already bound to this Card Spotlight.");
  return lines;
}
