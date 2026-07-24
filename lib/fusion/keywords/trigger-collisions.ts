/**
 * Conversational trigger collision detection (ManyChat-style).
 * Channel Guardian remains authoritative for whether a resulting send is permitted.
 */

import { termKey } from "./normalization";
import type {
  ConflictWarning,
  KeywordBrandPack,
  KeywordChannel,
  TriggerBindingInput,
  TriggerMatchMode,
} from "./types";

export const RESERVED_CONVERSATIONAL_KEYWORDS = [
  "stop",
  "unsubscribe",
  "cancel",
  "help",
  "start",
  "yes",
  "no",
] as const;

/** Example canonical triggers (not auto-applied — only used as suggestion hints when approved). */
export const EXAMPLE_TRIGGER_HINTS = [
  "WINGS",
  "MENU",
  "BOOK",
  "VIP",
  "CATERING",
  "HELP",
] as const;

export type ConversationalKeywordSet = {
  triggers: string[];
  synonyms: string[];
  misspellings: string[];
  collisions: ConflictWarning[];
  reservedHits: ConflictWarning[];
  guardianNote: string;
};

export type ActiveTriggerBinding = {
  id: string;
  flowId: string;
  flowLabel?: string | null;
  canonicalValue: string;
  normalizedValue: string;
  channel: string;
  matchMode: TriggerMatchMode | string;
  active: boolean;
  locationId?: string | null;
  campaignId?: string | null;
};

function structuralMisspellings(term: string): string[] {
  const bare = term.replace(/^#/, "").toLowerCase();
  if (bare.length < 4) return [];
  const swap = bare.slice(0, -2) + bare.slice(-1) + bare.slice(-2, -1);
  const drop = bare.slice(0, -1);
  return [swap, drop].filter((v) => v !== bare);
}

export function buildConversationalKeywordSet(
  pack: KeywordBrandPack,
  extraTriggers: string[] = []
): ConversationalKeywordSet {
  const approved = [
    ...pack.approvedTerms,
    ...pack.brandedHashtags,
    ...pack.requiredTerms,
    ...pack.recurringCampaignTags,
  ].map((t) => t.value.replace(/^#/, "").toLowerCase().trim());

  const triggers = [
    ...new Set([...approved, ...extraTriggers.map((t) => t.toLowerCase().trim())]),
  ].filter(Boolean);

  const synonyms: string[] = [];
  const misspellings: string[] = [];
  for (const t of triggers) {
    if (t.includes(" ")) synonyms.push(t.replace(/\s+/g, ""));
    misspellings.push(...structuralMisspellings(t));
  }

  const collisions: ConflictWarning[] = [];
  const seen = new Map<string, string>();
  for (const t of [...triggers, ...synonyms, ...misspellings]) {
    const key = termKey(t);
    if (seen.has(key) && seen.get(key) !== t) {
      collisions.push({
        code: "collision",
        message: `"${t}" collides with "${seen.get(key)}"`,
        term: t,
        conflictsWith: seen.get(key),
      });
    } else if (!seen.has(key)) {
      seen.set(key, t);
    }
  }

  for (const ban of [...pack.bannedTerms, ...pack.competitorExclusions]) {
    const key = termKey(ban.value);
    if (seen.has(key)) {
      collisions.push({
        code: "banned",
        message: `Trigger "${seen.get(key)}" conflicts with banned/competitor term "${ban.value}"`,
        term: seen.get(key)!,
        conflictsWith: ban.value,
      });
    }
  }

  const reservedHits: ConflictWarning[] = [];
  for (const t of triggers) {
    if ((RESERVED_CONVERSATIONAL_KEYWORDS as readonly string[]).includes(t)) {
      reservedHits.push({
        code: "reserved",
        message: `"${t}" is a reserved control keyword — Channel Guardian / opt-out handling takes precedence`,
        term: t,
      });
    }
  }

  return {
    triggers,
    synonyms: [...new Set(synonyms)],
    misspellings: [...new Set(misspellings)],
    collisions,
    reservedHits,
    guardianNote:
      "Keyword matching does not authorize regulated sends. Channel Guardian evaluates consent, quiet hours, suppression, and provider readiness independently.",
  };
}

/**
 * Detect whether two active flows claim the same scoped trigger.
 * Do not allow silent double-claim — always surface warnings.
 */
export function detectTriggerCollisions(opts: {
  existing: ActiveTriggerBinding[];
  candidate: TriggerBindingInput;
}): ConflictWarning[] {
  const warnings: ConflictWarning[] = [];
  const key = termKey(opts.candidate.canonicalValue);
  const channel = opts.candidate.channel ?? "tapcanvas";
  const reserved = (RESERVED_CONVERSATIONAL_KEYWORDS as readonly string[]).includes(key);
  if (reserved) {
    warnings.push({
      code: "reserved",
      message: `"${opts.candidate.canonicalValue}" is reserved — Channel Guardian implications apply`,
      term: opts.candidate.canonicalValue,
    });
  }

  for (const row of opts.existing) {
    if (!row.active) continue;
    if (row.channel !== channel) continue;
    if (row.flowId === opts.candidate.flowId) continue;
    if (row.normalizedValue !== key) continue;
    // Same location/campaign scope (or both unset = business-wide)
    const locMatch =
      (!opts.candidate.locationId && !row.locationId) ||
      opts.candidate.locationId === row.locationId;
    const campMatch =
      (!opts.candidate.campaignId && !row.campaignId) ||
      opts.candidate.campaignId === row.campaignId;
    if (locMatch && campMatch) {
      warnings.push({
        code: "collision",
        message: `Active flow "${row.flowLabel ?? row.flowId}" already claims trigger "${row.canonicalValue}" on ${channel}`,
        term: opts.candidate.canonicalValue,
        conflictsWith: row.canonicalValue,
        flowId: row.flowId,
      });
    }
  }
  return warnings;
}

export function matchesTrigger(
  inbound: string,
  canonical: string,
  mode: TriggerMatchMode = "contains"
): boolean {
  const a = inbound.trim().toLowerCase();
  const b = canonical.trim().toLowerCase().replace(/^#/, "");
  if (!a || !b) return false;
  if (mode === "exact" || mode === "case_insensitive") return a === b;
  if (mode === "starts_with") return a.startsWith(b);
  return a.includes(b);
}

export type { KeywordChannel };
