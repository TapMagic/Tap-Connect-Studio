/**
 * Channel-specific keyword / hashtag rules.
 * Distinct recommendations per channel — never one identical list blindly reused.
 */

import type {
  ChannelRuleSet,
  KeywordChannel,
  KeywordSuggestion,
  SuggestionFamily,
  TermKind,
} from "./types";

export const KEYWORD_CHANNELS: KeywordChannel[] = [
  "tiktok",
  "instagram",
  "facebook",
  "threads",
  "youtube",
  "youtube_shorts",
  "linkedin",
  "pinterest",
  "x",
  "bluesky",
  "gbp",
  "snapchat",
  "reddit",
  "mastodon",
  "nextdoor",
  "email",
  "messenger",
  "instagram_direct",
  "whatsapp",
  "telegram",
  "sms",
  "discord",
  "tapcanvas",
  "tapflow",
  "assets_templates",
];

export const CHANNEL_LABEL: Record<KeywordChannel, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Facebook",
  threads: "Threads",
  youtube: "YouTube",
  youtube_shorts: "YouTube Shorts",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  x: "X",
  bluesky: "Bluesky",
  gbp: "Google Business Profile",
  snapchat: "Snapchat",
  reddit: "Reddit",
  mastodon: "Mastodon",
  nextdoor: "Nextdoor",
  email: "Email",
  messenger: "Messenger",
  instagram_direct: "Instagram Direct",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  sms: "SMS",
  discord: "Discord",
  tapcanvas: "TapCanvas conversational",
  tapflow: "TapFlow",
  assets_templates: "Assets / Templates",
};

const DEFAULT_PROHIBITED = [/\bfree money\b/i, /\bguaranteed\b/i];

function rule(
  channel: KeywordChannel,
  partial: Omit<ChannelRuleSet, "channel" | "label" | "prohibitedPatterns"> & {
    prohibitedPatterns?: RegExp[];
  }
): ChannelRuleSet {
  return {
    channel,
    label: CHANNEL_LABEL[channel],
    prohibitedPatterns: partial.prohibitedPatterns ?? DEFAULT_PROHIBITED,
    ...partial,
  };
}

export const CHANNEL_RULES: Record<KeywordChannel, ChannelRuleSet> = {
  tiktok: rule("tiktok", {
    supportedKinds: ["hashtag", "keyword", "phrase", "trigger"],
    hashtagSuitable: true,
    recommendedCount: { min: 3, max: 5 },
    titleSearchRelevant: false,
    captionRelevant: true,
    triggerSuitable: true,
    characterGuidance: { maxTerm: 40, maxSetChars: 120 },
    notes: ["Prefer short discovery + branded sets", "Avoid spammy stuffing"],
  }),
  instagram: rule("instagram", {
    supportedKinds: ["hashtag", "keyword", "phrase"],
    hashtagSuitable: true,
    recommendedCount: { min: 5, max: 12 },
    titleSearchRelevant: false,
    captionRelevant: true,
    triggerSuitable: true,
    characterGuidance: { maxTerm: 50 },
    notes: ["Mix branded + niche + local"],
  }),
  facebook: rule("facebook", {
    supportedKinds: ["keyword", "phrase", "hashtag"],
    hashtagSuitable: false,
    recommendedCount: { min: 2, max: 6 },
    titleSearchRelevant: true,
    captionRelevant: true,
    triggerSuitable: false,
    characterGuidance: { maxTerm: 60 },
    notes: ["Prefer keywords over hashtags"],
  }),
  threads: rule("threads", {
    supportedKinds: ["keyword", "hashtag", "phrase"],
    hashtagSuitable: true,
    recommendedCount: { min: 1, max: 4 },
    titleSearchRelevant: false,
    captionRelevant: true,
    triggerSuitable: false,
    characterGuidance: { maxTerm: 40 },
    notes: ["Keep sparse"],
  }),
  youtube: rule("youtube", {
    supportedKinds: ["phrase", "keyword"],
    hashtagSuitable: false,
    recommendedCount: { min: 3, max: 8 },
    titleSearchRelevant: true,
    captionRelevant: true,
    triggerSuitable: false,
    characterGuidance: { maxTerm: 80 },
    notes: ["SEO / title phrases preferred"],
  }),
  youtube_shorts: rule("youtube_shorts", {
    supportedKinds: ["hashtag", "phrase", "keyword"],
    hashtagSuitable: true,
    recommendedCount: { min: 2, max: 5 },
    titleSearchRelevant: true,
    captionRelevant: true,
    triggerSuitable: false,
    characterGuidance: { maxTerm: 40 },
    notes: ["Short title + light tags"],
  }),
  linkedin: rule("linkedin", {
    supportedKinds: ["phrase", "keyword"],
    hashtagSuitable: false,
    recommendedCount: { min: 2, max: 5 },
    titleSearchRelevant: true,
    captionRelevant: true,
    triggerSuitable: false,
    characterGuidance: { maxTerm: 80 },
    notes: ["Professional phrasing; avoid slang hashtags"],
  }),
  pinterest: rule("pinterest", {
    supportedKinds: ["phrase", "keyword", "asset_tag"],
    hashtagSuitable: false,
    recommendedCount: { min: 4, max: 10 },
    titleSearchRelevant: true,
    captionRelevant: true,
    triggerSuitable: false,
    characterGuidance: { maxTerm: 60 },
    notes: ["Search / SEO phrases dominate"],
  }),
  x: rule("x", {
    supportedKinds: ["hashtag", "keyword"],
    hashtagSuitable: true,
    recommendedCount: { min: 1, max: 3 },
    titleSearchRelevant: false,
    captionRelevant: true,
    triggerSuitable: false,
    characterGuidance: { maxTerm: 30, maxSetChars: 80 },
    notes: ["Very sparse hashtags"],
  }),
  bluesky: rule("bluesky", {
    supportedKinds: ["keyword", "hashtag"],
    hashtagSuitable: true,
    recommendedCount: { min: 1, max: 3 },
    titleSearchRelevant: false,
    captionRelevant: true,
    triggerSuitable: false,
    characterGuidance: { maxTerm: 40 },
    notes: ["Light tagging"],
  }),
  gbp: rule("gbp", {
    supportedKinds: ["phrase", "keyword"],
    hashtagSuitable: false,
    recommendedCount: { min: 2, max: 6 },
    titleSearchRelevant: true,
    captionRelevant: true,
    triggerSuitable: false,
    characterGuidance: { maxTerm: 70 },
    notes: ["Local + service SEO phrases"],
  }),
  snapchat: rule("snapchat", {
    supportedKinds: ["keyword", "hashtag"],
    hashtagSuitable: true,
    recommendedCount: { min: 1, max: 4 },
    titleSearchRelevant: false,
    captionRelevant: true,
    triggerSuitable: false,
    characterGuidance: { maxTerm: 30 },
    notes: ["Short discovery terms"],
  }),
  reddit: rule("reddit", {
    supportedKinds: ["phrase", "keyword"],
    hashtagSuitable: false,
    recommendedCount: { min: 1, max: 4 },
    titleSearchRelevant: true,
    captionRelevant: true,
    triggerSuitable: false,
    characterGuidance: { maxTerm: 80 },
    notes: ["No hashtag stuffing"],
  }),
  mastodon: rule("mastodon", {
    supportedKinds: ["hashtag", "keyword"],
    hashtagSuitable: true,
    recommendedCount: { min: 1, max: 4 },
    titleSearchRelevant: false,
    captionRelevant: true,
    triggerSuitable: false,
    characterGuidance: { maxTerm: 40 },
    notes: ["Community hashtags only when grounded"],
  }),
  nextdoor: rule("nextdoor", {
    supportedKinds: ["phrase", "keyword"],
    hashtagSuitable: false,
    recommendedCount: { min: 1, max: 4 },
    titleSearchRelevant: true,
    captionRelevant: true,
    triggerSuitable: false,
    characterGuidance: { maxTerm: 60 },
    notes: ["Hyperlocal phrasing"],
  }),
  email: rule("email", {
    supportedKinds: ["phrase", "keyword"],
    hashtagSuitable: false,
    recommendedCount: { min: 2, max: 6 },
    titleSearchRelevant: true,
    captionRelevant: true,
    triggerSuitable: false,
    characterGuidance: { maxTerm: 80 },
    notes: ["Never auto-insert public hashtags into email"],
  }),
  messenger: rule("messenger", {
    supportedKinds: ["trigger", "keyword", "synonym"],
    hashtagSuitable: false,
    recommendedCount: { min: 1, max: 8 },
    titleSearchRelevant: false,
    captionRelevant: false,
    triggerSuitable: true,
    characterGuidance: { maxTerm: 40 },
    notes: ["Comment/DM trigger suitability"],
  }),
  instagram_direct: rule("instagram_direct", {
    supportedKinds: ["trigger", "keyword", "synonym", "misspelling"],
    hashtagSuitable: false,
    recommendedCount: { min: 1, max: 8 },
    titleSearchRelevant: false,
    captionRelevant: false,
    triggerSuitable: true,
    characterGuidance: { maxTerm: 40 },
    notes: ["DM triggers + misspellings"],
  }),
  whatsapp: rule("whatsapp", {
    supportedKinds: ["trigger", "keyword", "synonym"],
    hashtagSuitable: false,
    recommendedCount: { min: 1, max: 6 },
    titleSearchRelevant: false,
    captionRelevant: false,
    triggerSuitable: true,
    characterGuidance: { maxTerm: 40 },
    notes: ["Trigger vocabulary; Channel Guardian still gates sends"],
  }),
  telegram: rule("telegram", {
    supportedKinds: ["trigger", "keyword"],
    hashtagSuitable: false,
    recommendedCount: { min: 1, max: 6 },
    titleSearchRelevant: false,
    captionRelevant: false,
    triggerSuitable: true,
    characterGuidance: { maxTerm: 40 },
    notes: ["Bot command-like triggers"],
  }),
  sms: rule("sms", {
    supportedKinds: ["trigger", "keyword"],
    hashtagSuitable: false,
    recommendedCount: { min: 1, max: 4 },
    titleSearchRelevant: false,
    captionRelevant: false,
    triggerSuitable: true,
    characterGuidance: { maxTerm: 20 },
    notes: ["Short keywords only"],
  }),
  discord: rule("discord", {
    supportedKinds: ["keyword", "trigger"],
    hashtagSuitable: false,
    recommendedCount: { min: 1, max: 5 },
    titleSearchRelevant: false,
    captionRelevant: true,
    triggerSuitable: true,
    characterGuidance: { maxTerm: 40 },
    notes: ["Community ops keywords"],
  }),
  tapcanvas: rule("tapcanvas", {
    supportedKinds: ["trigger", "synonym", "misspelling", "keyword"],
    hashtagSuitable: false,
    recommendedCount: { min: 2, max: 12 },
    titleSearchRelevant: false,
    captionRelevant: false,
    triggerSuitable: true,
    characterGuidance: { maxTerm: 40 },
    notes: ["Conversational triggers; collision detection required"],
  }),
  tapflow: rule("tapflow", {
    supportedKinds: ["trigger", "synonym", "misspelling", "keyword"],
    hashtagSuitable: false,
    recommendedCount: { min: 2, max: 12 },
    titleSearchRelevant: false,
    captionRelevant: false,
    triggerSuitable: true,
    characterGuidance: { maxTerm: 40 },
    notes: ["Flow branch labels + keyword triggers"],
  }),
  assets_templates: rule("assets_templates", {
    supportedKinds: ["asset_tag", "keyword", "phrase"],
    hashtagSuitable: false,
    recommendedCount: { min: 2, max: 10 },
    titleSearchRelevant: true,
    captionRelevant: false,
    triggerSuitable: false,
    characterGuidance: { maxTerm: 40 },
    notes: ["Internal tagging / discovery"],
  }),
};

export const CHANNEL_FAMILY_PRIORITY: Record<KeywordChannel, SuggestionFamily[]> = {
  tiktok: ["caption_title", "social_discovery", "campaign_hashtag", "niche", "branded_hashtag"],
  instagram: ["branded_hashtag", "caption_title", "social_discovery", "local", "campaign_hashtag"],
  facebook: ["primary", "local", "audience", "caption_title", "branded_keyword"],
  threads: ["primary", "branded_keyword", "synonym", "niche"],
  youtube: ["seo_phrase", "caption_title", "primary", "intent", "branded_keyword"],
  youtube_shorts: ["caption_title", "social_discovery", "branded_hashtag", "niche"],
  linkedin: ["seo_phrase", "intent", "primary", "branded_keyword", "audience"],
  pinterest: ["seo_phrase", "asset_tag", "niche", "primary"],
  x: ["primary", "branded_hashtag", "synonym", "niche"],
  bluesky: ["primary", "branded_keyword", "niche", "synonym"],
  gbp: ["local", "primary", "seo_phrase", "intent"],
  snapchat: ["social_discovery", "niche", "branded_hashtag", "primary"],
  reddit: ["seo_phrase", "intent", "primary", "audience"],
  mastodon: ["branded_hashtag", "niche", "primary"],
  nextdoor: ["local", "primary", "intent", "audience"],
  email: ["primary", "intent", "audience", "caption_title", "seo_phrase"],
  messenger: ["comment_dm_trigger", "synonym", "branded_keyword"],
  instagram_direct: ["comment_dm_trigger", "synonym", "branded_keyword"],
  whatsapp: ["comment_dm_trigger", "synonym", "branded_keyword"],
  telegram: ["comment_dm_trigger", "synonym", "branded_keyword"],
  sms: ["comment_dm_trigger", "synonym"],
  discord: ["comment_dm_trigger", "branded_keyword", "primary"],
  tapcanvas: ["comment_dm_trigger", "synonym", "branded_keyword", "primary", "avoid_exclusion"],
  tapflow: ["comment_dm_trigger", "synonym", "branded_keyword", "primary", "avoid_exclusion"],
  assets_templates: ["asset_tag", "primary", "niche", "seo_phrase"],
};

export function preferHashtag(channel: KeywordChannel): boolean {
  return CHANNEL_RULES[channel].hashtagSuitable;
}

export function getChannelRules(channel: KeywordChannel): ChannelRuleSet {
  return CHANNEL_RULES[channel];
}

export function adaptTermForChannel(
  value: string,
  kind: TermKind,
  channel: KeywordChannel
): { value: string; kind: TermKind } {
  const cleaned = value.trim();
  if (!cleaned) return { value: cleaned, kind };
  const rules = CHANNEL_RULES[channel];

  if (!rules.hashtagSuitable) {
    if (kind === "hashtag") {
      return {
        value: cleaned
          .replace(/^#/, "")
          .replace(/([a-z])([A-Z])/g, "$1 $2")
          .replace(/_/g, " ")
          .trim(),
        kind: "phrase",
      };
    }
  }

  if (rules.triggerSuitable && (channel === "tapcanvas" || channel === "tapflow" || channel === "messenger" || channel === "instagram_direct" || channel === "whatsapp" || channel === "telegram" || channel === "sms")) {
    return {
      value: cleaned.replace(/^#/, "").toLowerCase(),
      kind: kind === "hashtag" ? "trigger" : kind,
    };
  }

  if (preferHashtag(channel) && (kind === "hashtag" || kind === "keyword")) {
    const tag = cleaned.startsWith("#") ? cleaned : `#${cleaned.replace(/\s+/g, "")}`;
    return { value: tag, kind: "hashtag" };
  }

  return { value: cleaned, kind };
}

export function sortSuggestionsForChannel(
  suggestions: KeywordSuggestion[],
  channel: KeywordChannel
): KeywordSuggestion[] {
  const priority = CHANNEL_FAMILY_PRIORITY[channel];
  const rank = (f: SuggestionFamily) => {
    const i = priority.indexOf(f);
    return i === -1 ? priority.length + 1 : i;
  };
  return [...suggestions].sort((a, b) => rank(a.family) - rank(b.family));
}

export function filterSuggestionsForChannel(
  suggestions: KeywordSuggestion[],
  channel: KeywordChannel
): KeywordSuggestion[] {
  const rules = CHANNEL_RULES[channel];
  return suggestions.filter((s) => {
    if (!rules.supportedKinds.includes(s.kind) && s.family !== "avoid_exclusion") {
      // Allow if adapted kind would be supported
      const adapted = adaptTermForChannel(s.value, s.kind, channel);
      if (!rules.supportedKinds.includes(adapted.kind)) return false;
    }
    for (const re of rules.prohibitedPatterns) {
      if (re.test(s.value)) return false;
    }
    if (rules.characterGuidance.maxTerm && s.value.length > rules.characterGuidance.maxTerm) {
      return false;
    }
    return true;
  });
}

/** @deprecated use CHANNEL_RULES — kept for barrel compatibility */
export { CHANNEL_RULES as channelRules };
