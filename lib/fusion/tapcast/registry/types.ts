/**
 * TapCast Channel Capability Registry — provider-neutral declarations.
 * Flags are honest: never claim unsupported publish paths or media types.
 * Live providers = VERIFIED — CREDENTIALS REQUIRED.
 */

export type TapCastChannelCategory =
  | "publishing_social"
  | "conversation_relationship"
  | "community_ops";

/** Publishing path ladder (strongest → weakest automation) */
export type PublishPath =
  | "direct"
  | "scheduled"
  | "draft_upload"
  | "provider_draft"
  | "prepared_package"
  | "open_composer"
  | "manual_checklist";

export type MediaCapability =
  | "video"
  | "short_video"
  | "image"
  | "carousel"
  | "story"
  | "text"
  | "link"
  | "audio"
  | "live";

export type DimensionSpec = {
  aspectRatio: string;
  width: number;
  height: number;
  maxDurationSec?: number;
  maxCaptionChars?: number;
  notes?: string;
};

export type ChannelCapabilityFlags = {
  /** Ordered preferred publish paths this adapter can exercise (mock or live) */
  publishPaths: PublishPath[];
  /** Strongest path mock adapter implements today */
  mockPublishPath: PublishPath;
  /** Strongest path live API would use when credentials present */
  livePublishPath: PublishPath | null;
  media: MediaCapability[];
  dimensions: DimensionSpec[];
  scheduling: boolean;
  approvals: boolean;
  analytics: boolean;
  attribution: boolean;
  oauth: boolean;
  webhooks: boolean;
  /** Conversation / DM style */
  messaging: boolean;
  /** Community / ops (moderation, alerts) */
  communityOps: boolean;
  /** Channel-native caption/hashtag adaptation required (no blind cross-post) */
  requiresNativeAdaptation: boolean;
};

export type TapCastChannelDefinition = {
  id: string;
  name: string;
  category: TapCastChannelCategory;
  categoryLabel: string;
  capabilities: ChannelCapabilityFlags;
  requiredEnvVars: string[];
  optionalEnvVars: string[];
  documentation: string;
  /** First-class deep UI (TikTok) vs hub-managed */
  firstClass: boolean;
  href: string;
  supportsMock: boolean;
  /** Live posting classification */
  liveClassification: "verified_credentials_required";
  notes: string;
};

export type ChannelReadiness = {
  channelId: string;
  displayStatus: "verified_credentials_required" | "development";
  liveConfigured: boolean;
  missingEnvVars: string[];
  oauthReady: boolean;
  mockReady: boolean;
  connected: boolean;
  connectionMode?: "mock" | "live";
  note: string;
};
