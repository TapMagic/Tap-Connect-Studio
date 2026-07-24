/**
 * Keywords analytics — durable when DB configured; memory fallback for unit tests.
 */

import type {
  KeywordAnalyticsEntry,
  KeywordAnalyticsEvent,
  KeywordChannel,
  SuggestionFamily,
} from "./types";

const memory = new Map<string, KeywordAnalyticsEntry[]>();

export function resetKeywordAnalyticsMemory() {
  memory.clear();
}

export function recordKeywordAnalytics(input: {
  businessId: string;
  event: KeywordAnalyticsEvent;
  count?: number;
  channel?: KeywordChannel;
  families?: SuggestionFamily[];
  campaignId?: string;
}): KeywordAnalyticsEntry {
  const entry: KeywordAnalyticsEntry = {
    id: `kwa_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    businessId: input.businessId,
    event: input.event,
    count: input.count ?? 1,
    channel: input.channel,
    campaignId: input.campaignId,
    families: input.families,
    at: new Date().toISOString(),
    disclaimer: "counts_only_no_causal_claim",
  };
  const list = memory.get(input.businessId) ?? [];
  list.push(entry);
  memory.set(input.businessId, list.slice(-500));
  return entry;
}

export function listKeywordAnalytics(businessId: string): KeywordAnalyticsEntry[] {
  return [...(memory.get(businessId) ?? [])];
}

export function summarizeKeywordAnalytics(businessId: string): {
  generated: number;
  accepted: number;
  applied: number;
  brandPackSaves: number;
  disclaimer: "counts_only_no_causal_claim";
} {
  const list = listKeywordAnalytics(businessId);
  let generated = 0;
  let accepted = 0;
  let applied = 0;
  let brandPackSaves = 0;
  for (const e of list) {
    if (e.event === "keywords.suggest" || e.event === "keywords.regenerate") {
      generated += e.count;
    }
    if (e.event === "keywords.accept") accepted += e.count;
    if (e.event === "keywords.apply") applied += e.count;
    if (e.event === "keywords.save_brand" || e.event === "keywords.brand_pack.create") {
      brandPackSaves += e.count;
    }
  }
  return {
    generated,
    accepted,
    applied,
    brandPackSaves,
    disclaimer: "counts_only_no_causal_claim",
  };
}
