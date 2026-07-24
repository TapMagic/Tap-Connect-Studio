/**
 * Saved Insights views — pure serialize/parse for localStorage / cookie payloads.
 */

import { parseInsightsRangeDays } from "./range";
import { parseInsightsView, type InsightsView } from "./views";
import type { EvidenceClass } from "./tapproof";

export const INSIGHTS_SAVED_VIEWS_KEY = "tc_insights_saved_views_v1";

export type InsightsSavedView = {
  id: string;
  name: string;
  days: number;
  view: InsightsView;
  compare: boolean;
  evidence: "all" | EvidenceClass;
  drill?: string;
  campaignId?: string;
  createdAt: string;
};

export type InsightsSavedViewsPayload = {
  version: 1;
  views: InsightsSavedView[];
};

const EVIDENCE_FILTERS = ["all", "confirmed", "derived", "modeled", "incomplete"] as const;

export function parseEvidenceFilter(
  input: string | null | undefined
): "all" | EvidenceClass {
  const v = (input ?? "all").toLowerCase().trim();
  return (EVIDENCE_FILTERS as readonly string[]).includes(v)
    ? (v as "all" | EvidenceClass)
    : "all";
}

export function serializeSavedViews(views: InsightsSavedView[]): string {
  const payload: InsightsSavedViewsPayload = { version: 1, views: views.slice(0, 20) };
  return JSON.stringify(payload);
}

export function parseSavedViews(raw: string | null | undefined): InsightsSavedView[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as InsightsSavedViewsPayload;
    if (parsed?.version !== 1 || !Array.isArray(parsed.views)) return [];
    return parsed.views
      .filter((v) => v && typeof v.id === "string" && typeof v.name === "string")
      .map((v) => ({
        id: String(v.id).slice(0, 64),
        name: String(v.name).slice(0, 80),
        days: parseInsightsRangeDays(v.days),
        view: parseInsightsView(v.view),
        compare: Boolean(v.compare),
        evidence: parseEvidenceFilter(v.evidence),
        drill: v.drill ? String(v.drill).slice(0, 64) : undefined,
        campaignId: v.campaignId ? String(v.campaignId).slice(0, 64) : undefined,
        createdAt: typeof v.createdAt === "string" ? v.createdAt : new Date().toISOString(),
      }))
      .slice(0, 20);
  } catch {
    return [];
  }
}

export function createSavedView(input: {
  name: string;
  days: number;
  view: InsightsView;
  compare?: boolean;
  evidence?: "all" | EvidenceClass;
  drill?: string;
  campaignId?: string;
}): InsightsSavedView {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `sv_${crypto.randomUUID().slice(0, 10)}`
      : `sv_${Date.now().toString(36)}`;
  return {
    id,
    name: input.name.trim().slice(0, 80) || "Untitled view",
    days: parseInsightsRangeDays(input.days),
    view: input.view,
    compare: Boolean(input.compare),
    evidence: input.evidence ?? "all",
    drill: input.drill,
    campaignId: input.campaignId,
    createdAt: new Date().toISOString(),
  };
}

/** Built-in presets — not user-owned; always available. */
export function builtinSavedViewPresets(): InsightsSavedView[] {
  const at = "2026-01-01T00:00:00.000Z";
  return [
    {
      id: "preset_overview_14",
      name: "Overview · 14d",
      days: 14,
      view: "overview",
      compare: false,
      evidence: "all",
      createdAt: at,
    },
    {
      id: "preset_campaign_compare",
      name: "Campaign · compare",
      days: 14,
      view: "campaign",
      compare: true,
      evidence: "all",
      createdAt: at,
    },
    {
      id: "preset_commerce_modeled",
      name: "Commerce · modeled",
      days: 30,
      view: "commerce",
      compare: false,
      evidence: "modeled",
      createdAt: at,
    },
    {
      id: "preset_tapproof",
      name: "TapProof · all evidence",
      days: 14,
      view: "tapproof",
      compare: false,
      evidence: "all",
      createdAt: at,
    },
  ];
}
