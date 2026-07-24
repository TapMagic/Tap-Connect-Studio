/**
 * Grounded keyword / hashtag suggestion engine (deterministic local fallback).
 * Only derives suggestions from provided ground facts — never invents business claims.
 * Does not claim trending. Does not claim causation from prior-performance stubs.
 * AI enhancement (OpenAI) may remain VERIFIED — CREDENTIALS REQUIRED.
 */

import {
  adaptTermForChannel,
  filterSuggestionsForChannel,
  getChannelRules,
  sortSuggestionsForChannel,
} from "./channel-rules";
import { familyToVocabularyKind, termKey } from "./normalization";
import type {
  ConflictWarning,
  GroundContext,
  KeywordChannel,
  KeywordSuggestion,
  RegenerateMode,
  SuggestResult,
  SuggestionFamily,
  SuggestionSourceFact,
  TermKind,
} from "./types";

const TREND_NOTE =
  "Live trend enrichment is VERIFIED — CREDENTIALS REQUIRED. No trending claims without an approved provider.";

const AI_NOTE =
  "AI-powered enhancement is VERIFIED — CREDENTIALS REQUIRED when OpenAI/budget is unavailable. Local grounded generation remains available without live AI credentials.";

function sid(prefix: string, value: string): string {
  return `${prefix}_${termKey(value).replace(/[^a-z0-9]+/g, "_").slice(0, 40) || "x"}`;
}

function fact(
  field: string,
  value: string,
  evidence: SuggestionSourceFact["evidence"] = "confirmed"
): SuggestionSourceFact {
  return { field, value, evidence };
}

function pushUnique(
  out: KeywordSuggestion[],
  seen: Set<string>,
  s: KeywordSuggestion
) {
  const key = termKey(s.value);
  if (!key || seen.has(key)) return;
  seen.add(key);
  out.push({
    ...s,
    vocabularyKind: s.vocabularyKind ?? familyToVocabularyKind(s.family, s.kind),
  });
}

function bannedSet(ctx: GroundContext): Set<string> {
  return new Set(
    [...(ctx.bannedTerms ?? []), ...(ctx.competitorExclusions ?? [])].map(termKey)
  );
}

function detectWarnings(
  suggestions: KeywordSuggestion[],
  ctx: GroundContext
): ConflictWarning[] {
  const warnings: ConflictWarning[] = [];
  const banned = bannedSet(ctx);
  const approved = new Set((ctx.approvedTerms ?? []).map(termKey));
  const seen = new Map<string, string>();

  for (const s of suggestions) {
    const key = termKey(s.value);
    if (banned.has(key)) {
      warnings.push({
        code: s.family === "avoid_exclusion" ? "exclusion" : "banned",
        message: `"${s.value}" matches a banned or competitor exclusion term`,
        term: s.value,
      });
    }
    if (seen.has(key)) {
      warnings.push({
        code: "duplicate",
        message: `"${s.value}" duplicates another suggestion`,
        term: s.value,
        conflictsWith: seen.get(key),
      });
    } else {
      seen.set(key, s.value);
    }
    if (approved.has(key) && s.family !== "avoid_exclusion") {
      warnings.push({
        code: "duplicate",
        message: `"${s.value}" is already in approved Brand vocabulary`,
        term: s.value,
      });
    }
  }
  return warnings;
}

function baseFromFact(opts: {
  value: string;
  kind: TermKind;
  family: SuggestionFamily;
  channel: KeywordChannel;
  rationale: string;
  sourceFacts: SuggestionSourceFact[];
  confidence?: KeywordSuggestion["confidence"];
}): KeywordSuggestion {
  const adapted =
    opts.family === "primary" || opts.family === "avoid_exclusion"
      ? { value: opts.value.trim(), kind: opts.kind }
      : adaptTermForChannel(opts.value, opts.kind, opts.channel);
  return {
    id: sid(opts.family, adapted.value),
    value: adapted.value,
    kind: adapted.kind,
    family: opts.family,
    vocabularyKind: familyToVocabularyKind(opts.family, adapted.kind),
    channels: [opts.channel],
    confidence: opts.confidence ?? "high",
    rationale: opts.rationale,
    sourceFacts: opts.sourceFacts,
  };
}

/**
 * Generate grounded suggestions. Empty ground context → empty structural-only output.
 */
export function suggestKeywords(opts: {
  ground: GroundContext;
  channel?: KeywordChannel;
  mode?: RegenerateMode;
  limit?: number;
}): SuggestResult {
  const channel = opts.channel ?? opts.ground.channel ?? "instagram";
  const rules = getChannelRules(channel);
  const limit = opts.limit ?? rules.recommendedCount.max * 2;
  const mode = opts.mode;
  const ctx = opts.ground;
  const seen = new Set<string>();
  const out: KeywordSuggestion[] = [];
  const banned = bannedSet(ctx);
  const skip = (v: string) => banned.has(termKey(v));

  if (ctx.businessName) {
    const name = ctx.businessName.trim();
    if (!skip(name)) {
      pushUnique(
        out,
        seen,
        baseFromFact({
          value: name,
          kind: "keyword",
          family: "primary",
          channel,
          rationale: "Primary brand keyword from business name in ground context",
          sourceFacts: [fact("businessName", name)],
        })
      );
      const compact = name.replace(/\s+/g, "");
      if (compact.length > 2 && !skip(compact) && rules.hashtagSuitable) {
        pushUnique(
          out,
          seen,
          baseFromFact({
            value: compact,
            kind: "hashtag",
            family: "branded_hashtag",
            channel,
            rationale: "Branded hashtag derived from provided business name",
            sourceFacts: [fact("businessName", name)],
          })
        );
      }
    }
  }

  for (const loc of ctx.locationLabels ?? []) {
    if (skip(loc)) continue;
    if (mode === "broader" && out.length > 8) break;
    pushUnique(
      out,
      seen,
      baseFromFact({
        value: loc,
        kind: "keyword",
        family: "local",
        channel,
        rationale: "Local keyword from provided location vocabulary",
        sourceFacts: [fact("locationLabels", loc)],
      })
    );
    if ((mode === "more_local" || !mode) && rules.hashtagSuitable) {
      pushUnique(
        out,
        seen,
        baseFromFact({
          value: loc.replace(/\s+/g, ""),
          kind: "hashtag",
          family: "local",
          channel,
          rationale: "Local hashtag from provided location label",
          sourceFacts: [fact("locationLabels", loc)],
        })
      );
    }
  }

  for (const product of ctx.knownProducts ?? []) {
    if (skip(product)) continue;
    pushUnique(
      out,
      seen,
      baseFromFact({
        value: product,
        kind: "keyword",
        family: mode === "more_niche" ? "niche" : "primary",
        channel,
        rationale: "Product vocabulary from Brand Kit / ground facts",
        sourceFacts: [fact("knownProducts", product)],
      })
    );
    if (mode === "more_niche" && rules.hashtagSuitable) {
      pushUnique(
        out,
        seen,
        baseFromFact({
          value: product.replace(/\s+/g, ""),
          kind: "hashtag",
          family: "niche",
          channel,
          rationale: "Niche hashtag from provided product term",
          sourceFacts: [fact("knownProducts", product)],
          confidence: "medium",
        })
      );
    }
  }

  for (const offer of ctx.knownOffers ?? []) {
    if (skip(offer)) continue;
    pushUnique(
      out,
      seen,
      baseFromFact({
        value: offer,
        kind: "phrase",
        family: "intent",
        channel,
        rationale: "Intent phrase from provided offer fact (not invented)",
        sourceFacts: [fact("knownOffers", offer)],
      })
    );
  }

  for (const aud of ctx.audienceHints ?? []) {
    if (skip(aud)) continue;
    pushUnique(
      out,
      seen,
      baseFromFact({
        value: aud,
        kind: "keyword",
        family: "audience",
        channel,
        rationale: "Audience keyword from provided audience vocabulary",
        sourceFacts: [fact("audienceHints", aud)],
      })
    );
  }

  if (ctx.campaignTitle) {
    const title = ctx.campaignTitle.trim();
    if (!skip(title)) {
      pushUnique(
        out,
        seen,
        baseFromFact({
          value: title,
          kind: "phrase",
          family: "caption_title",
          channel,
          rationale: "Caption/title keywords from campaign title",
          sourceFacts: [fact("campaignTitle", title)],
        })
      );
      const tag = title.replace(/[^a-zA-Z0-9]+/g, "");
      if (tag.length > 2 && rules.hashtagSuitable) {
        pushUnique(
          out,
          seen,
          baseFromFact({
            value: tag,
            kind: "hashtag",
            family: "campaign_hashtag",
            channel,
            rationale: "Campaign hashtag from provided campaign title",
            sourceFacts: [fact("campaignTitle", title)],
            confidence: "medium",
          })
        );
      }
    }
  }

  if (ctx.seasonHint && !skip(ctx.seasonHint)) {
    pushUnique(
      out,
      seen,
      baseFromFact({
        value: ctx.seasonHint,
        kind: "keyword",
        family: "social_discovery",
        channel,
        rationale: "Season hint from ground context (not a trend claim)",
        sourceFacts: [fact("seasonHint", ctx.seasonHint, "modeled")],
        confidence: "medium",
      })
    );
  }

  for (const term of ctx.approvedTerms ?? []) {
    if (skip(term)) continue;
    pushUnique(
      out,
      seen,
      baseFromFact({
        value: term,
        kind: term.startsWith("#") ? "hashtag" : "keyword",
        family: "branded_keyword",
        channel,
        rationale: "Reinforced from approved Brand Kit vocabulary",
        sourceFacts: [fact("approvedTerms", term)],
      })
    );
  }

  for (const snippet of ctx.existingContentSnippets ?? []) {
    const tokens = snippet.match(/#[A-Za-z0-9_]+|\b[A-Za-z][A-Za-z0-9]{2,}\b/g) ?? [];
    for (const tok of tokens.slice(0, 4)) {
      if (skip(tok)) continue;
      const isHashtag = tok.startsWith("#");
      const known =
        isHashtag ||
        (ctx.approvedTerms ?? []).some((t) => termKey(t) === termKey(tok)) ||
        (ctx.knownProducts ?? []).some((t) => termKey(t) === termKey(tok)) ||
        (ctx.locationLabels ?? []).some((t) => termKey(t) === termKey(tok));
      if (!known && !isHashtag) continue;
      pushUnique(
        out,
        seen,
        baseFromFact({
          value: tok,
          kind: isHashtag ? "hashtag" : "keyword",
          family: "seo_phrase",
          channel,
          rationale: "Term already present in provided existing content",
          sourceFacts: [fact("existingContentSnippets", tok, "confirmed")],
          confidence: "medium",
        })
      );
    }
  }

  for (const stub of ctx.priorPerformanceStubs ?? []) {
    if (skip(stub.term)) continue;
    pushUnique(out, seen, {
      ...baseFromFact({
        value: stub.term,
        kind: stub.term.startsWith("#") ? "hashtag" : "keyword",
        family: "social_discovery",
        channel,
        rationale:
          "Prior performance stub (correlation only — not causation). Review before reuse.",
        sourceFacts: [fact("priorPerformanceStubs", stub.term, "stub")],
        confidence: "low",
      }),
      warnings: ["correlation_stub_not_causation"],
    });
  }

  for (const ban of [...(ctx.bannedTerms ?? []), ...(ctx.competitorExclusions ?? [])].slice(
    0,
    6
  )) {
    pushUnique(
      out,
      seen,
      baseFromFact({
        value: ban,
        kind: "keyword",
        family: "avoid_exclusion",
        channel,
        rationale: "Exclusion — do not use (from banned/competitor Brand Kit lists)",
        sourceFacts: [fact("bannedOrCompetitor", ban)],
      })
    );
  }

  if (rules.triggerSuitable || mode === "channel_specific") {
    for (const term of (ctx.approvedTerms ?? []).slice(0, 8)) {
      const bare = term.replace(/^#/, "").toLowerCase();
      if (!bare || skip(bare)) continue;
      pushUnique(
        out,
        seen,
        baseFromFact({
          value: bare,
          kind: "trigger",
          family: "comment_dm_trigger",
          channel: rules.triggerSuitable ? channel : "tapcanvas",
          rationale: "Comment/DM trigger from approved Brand Kit term",
          sourceFacts: [fact("approvedTerms", term)],
        })
      );
      if (bare.length >= 4) {
        const misspelled = bare.slice(0, -2) + bare.slice(-1) + bare.slice(-2, -1);
        pushUnique(
          out,
          seen,
          baseFromFact({
            value: misspelled,
            kind: "misspelling",
            family: "synonym",
            channel: rules.triggerSuitable ? channel : "tapcanvas",
            rationale:
              "Structural misspelling variant of approved term for conversational matching",
            sourceFacts: [fact("approvedTerms", term, "modeled")],
            confidence: "low",
          })
        );
      }
    }
  }

  for (const product of (ctx.knownProducts ?? []).slice(0, 4)) {
    pushUnique(
      out,
      seen,
      baseFromFact({
        value: product.toLowerCase().replace(/\s+/g, "_"),
        kind: "asset_tag",
        family: "asset_tag",
        channel,
        rationale: "Asset tag from provided product vocabulary",
        sourceFacts: [fact("knownProducts", product)],
        confidence: "medium",
      })
    );
  }

  // Tone modes adjust rationale only — never invent new business facts
  if (mode === "more_professional" || mode === "more_playful") {
    for (const s of out) {
      s.rationale = `${s.rationale} · regenerate tone hint: ${mode} (phrasing preference only)`;
    }
  }
  if (mode === "language_specific" && ctx.locale) {
    for (const s of out) {
      s.rationale = `${s.rationale} · locale=${ctx.locale}`;
    }
  }

  let suggestions = filterSuggestionsForChannel(out, channel);
  suggestions = sortSuggestionsForChannel(suggestions, channel);

  if (mode === "shorter") {
    suggestions = suggestions
      .map((s) => ({
        ...s,
        value:
          s.kind === "hashtag"
            ? `#${s.value.replace(/^#/, "").slice(0, 18)}`
            : s.value.split(/\s+/).slice(0, 3).join(" "),
      }))
      .filter((s) => s.value.replace(/^#/, "").length >= 2);
  }

  if (mode === "channel_specific") {
    suggestions = suggestions.map((s) => ({
      ...s,
      channels: [channel],
      rationale: `${s.rationale} · adapted for ${channel}`,
    }));
  }

  // Always retain exclusion markers even when the list is truncated to channel limits
  const exclusions = suggestions.filter((s) => s.family === "avoid_exclusion");
  const primary = suggestions.filter((s) => s.family !== "avoid_exclusion");
  const primaryBudget = Math.max(0, limit - Math.min(exclusions.length, 6));
  suggestions = [...primary.slice(0, primaryBudget), ...exclusions.slice(0, 6)].slice(0, limit);
  const warnings = detectWarnings(suggestions, ctx);

  return {
    suggestions,
    warnings,
    channel,
    trendEnrichment: {
      status: "verified_credentials_required",
      label: "VERIFIED — CREDENTIALS REQUIRED",
      note: TREND_NOTE,
    },
    analyticsEvent: "keywords.suggest",
    aiEnhancement: {
      status: "local_grounded",
      label: "Local grounded generation",
      note: AI_NOTE,
    },
  };
}

/** Alias matching architecture naming */
export { suggestKeywords as generateSuggestions };
