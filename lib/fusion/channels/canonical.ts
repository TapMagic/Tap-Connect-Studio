/**
 * Canonical channel ID alignment between TapCast registry and Keywords vocabulary.
 * TapCast IDs are authoritative for publish/distribution.
 * Keywords may use aliases that map onto TapCast (or studio-only surfaces).
 */

/** TapCast registry channel ids (18). */
export const TAPCAST_CHANNEL_IDS = [
  "tiktok",
  "youtube",
  "instagram",
  "facebook",
  "x",
  "linkedin",
  "pinterest",
  "snapchat",
  "bluesky",
  "threads",
  "google_business",
  "messenger",
  "whatsapp",
  "instagram_dm",
  "sms",
  "discord",
  "slack_community",
  "reddit",
] as const;

export type TapCastChannelId = (typeof TAPCAST_CHANNEL_IDS)[number];

/** Keywords / vocabulary channel aliases → TapCast id (when applicable). */
export const KEYWORD_TO_TAPCAST_CHANNEL: Record<string, TapCastChannelId | null> = {
  tiktok: "tiktok",
  youtube: "youtube",
  youtube_shorts: "youtube",
  instagram: "instagram",
  facebook: "facebook",
  x: "x",
  linkedin: "linkedin",
  pinterest: "pinterest",
  snapchat: "snapchat",
  bluesky: "bluesky",
  threads: "threads",
  gbp: "google_business",
  google_business: "google_business",
  messenger: "messenger",
  whatsapp: "whatsapp",
  instagram_direct: "instagram_dm",
  instagram_dm: "instagram_dm",
  sms: "sms",
  discord: "discord",
  slack_community: "slack_community",
  reddit: "reddit",
  // Studio-only vocabulary surfaces (no TapCast publish row)
  email: null,
  telegram: null,
  mastodon: null,
  nextdoor: null,
  tapcanvas: null,
  tapflow: null,
  assets_templates: null,
};

/** Map a keywords channel id to TapCast registry id (or null if studio-only). */
export function toTapCastChannelId(keywordOrTapCastId: string): TapCastChannelId | null {
  if ((TAPCAST_CHANNEL_IDS as readonly string[]).includes(keywordOrTapCastId)) {
    return keywordOrTapCastId as TapCastChannelId;
  }
  if (keywordOrTapCastId in KEYWORD_TO_TAPCAST_CHANNEL) {
    return KEYWORD_TO_TAPCAST_CHANNEL[keywordOrTapCastId] ?? null;
  }
  return null;
}

/** Map TapCast id to preferred keywords channel id. */
export function toKeywordChannelId(tapCastId: string): string {
  switch (tapCastId) {
    case "google_business":
      return "gbp";
    case "instagram_dm":
      return "instagram_direct";
    default:
      return tapCastId;
  }
}
