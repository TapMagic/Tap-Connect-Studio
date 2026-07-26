/**
 * Insights multi-view vocabulary — Campaign / Card / Tap Point / comms / loyalty / commerce / provider.
 */

export const INSIGHTS_VIEWS = [
  "overview",
  "campaign",
  "card",
  "tappoint",
  "comms",
  "loyalty",
  "commerce",
  "provider",
  "tapproof",
] as const;

export type InsightsView = (typeof INSIGHTS_VIEWS)[number];

export const INSIGHTS_VIEW_LABELS: Record<InsightsView, string> = {
  overview: "Overview",
  campaign: "Campaign",
  card: "Card",
  tappoint: "Tap Point",
  comms: "Communications",
  loyalty: "Loyalty",
  commerce: "Commerce",
  provider: "Provider",
  tapproof: "TapProof",
};

/** KPI keys that belong primarily to a view (overview shows all). */
export const VIEW_KPI_KEYS: Record<InsightsView, string[] | "all"> = {
  overview: "all",
  campaign: ["taps_range", "leads_range", "conversion", "clicks", "campaigns_live", "campaigns_total", "offer_views_range", "offer_claims_range", "offer_leads_range"],
  card: ["card_publications", "card_versions", "clicks", "offer_views_range", "offer_claims_range", "offer_leads_range", "offer_followups_range"],
  tappoint: ["taps_range", "tap_points_total", "devices_active", "devices_unassigned"],
  comms: ["open_threads", "inbox_messages_range", "email_ready", "comms_outbox_pending"],
  loyalty: ["loyalty_enrollments", "loyalty_awards_range", "loyalty_redeems_range", "commerce_loyalty_stubs"],
  commerce: [
    "commerce_orders_paid",
    "commerce_revenue_mock",
    "commerce_relationship_links",
    "commerce_loyalty_stubs",
  ],
  provider: ["providers_catalog", "providers_live_ready", "providers_mock_only", "email_ready"],
  tapproof: "all",
};

export function parseInsightsView(
  input: string | null | undefined
): InsightsView {
  const v = (input ?? "overview").toLowerCase().trim();
  return (INSIGHTS_VIEWS as readonly string[]).includes(v)
    ? (v as InsightsView)
    : "overview";
}

export function kpiBelongsToView(key: string, view: InsightsView): boolean {
  const keys = VIEW_KPI_KEYS[view];
  if (keys === "all") return true;
  return keys.includes(key);
}

export function buildInsightsHref(input: {
  days: number;
  view?: InsightsView;
  compare?: boolean;
  evidence?: string;
  drill?: string;
  campaignId?: string;
}): string {
  const sp = new URLSearchParams();
  sp.set("days", String(input.days));
  if (input.view && input.view !== "overview") sp.set("view", input.view);
  if (input.compare) sp.set("compare", "1");
  if (input.evidence && input.evidence !== "all") sp.set("evidence", input.evidence);
  if (input.drill) sp.set("drill", input.drill);
  if (input.campaignId) sp.set("campaignId", input.campaignId);
  return `/dashboard/insights?${sp.toString()}`;
}
