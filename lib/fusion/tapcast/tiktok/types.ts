/**
 * TapCast → TikTok — first-class social distribution.
 * Live posting: VERIFIED — CREDENTIALS REQUIRED.
 * Mock adapters work without credentials.
 */

export type TikTokCastStatus =
  | "draft"
  | "storyboard"
  | "composed"
  | "uploaded_draft"
  | "pending_approval"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed"
  | "retrying";

export type TikTokComposition = {
  aspectRatio: "9:16";
  width: 1080;
  height: 1920;
  durationSec?: number;
  coverFrameSec?: number;
};

export type TikTokStoryboardBeat = {
  id: string;
  order: number;
  narration: string;
  visual: string;
  durationSec: number;
};

export type TikTokCast = {
  id: string;
  businessId: string;
  title: string;
  script: string;
  caption: string;
  hashtags: string[];
  coverNote?: string;
  storyboard: TikTokStoryboardBeat[];
  composition: TikTokComposition;
  status: TikTokCastStatus;
  /** Associations */
  campaignId?: string;
  cardId?: string;
  tapPointId?: string;
  /** Publish */
  scheduledAt?: string | null;
  publishedAt?: string | null;
  externalDraftId?: string;
  externalPostId?: string;
  lastError?: string;
  retryCount: number;
  mode: "mock" | "live";
  /** Funnel outcome stubs */
  funnel?: TikTokRelationshipFunnel;
  analytics?: TikTokAnalyticsStub;
  createdAt: string;
  updatedAt: string;
};

export type TikTokRelationshipFunnel = {
  stages: Array<{
    id: "content" | "card" | "keep" | "wallet" | "loyalty" | "outcome";
    label: string;
    status: "pending" | "ready" | "active" | "measured";
    linkedObjectId?: string;
  }>;
};

export type TikTokAnalyticsStub = {
  views: number;
  likes: number;
  shares: number;
  comments: number;
  profileVisits: number;
  keepsAttributed: number;
  walletAddsAttributed: number;
  updatedAt: string;
};

export type TikTokAdaptation = {
  network: "reels" | "shorts";
  aspectRatio: "9:16";
  captionMax: number;
  notes: string;
};

export type TikTokAdapterResult<T> =
  | { ok: true; data: T; mode: "mock" | "live" }
  | { ok: false; error: string; code: string };

export type TikTokReadiness = {
  displayStatus: "verified_credentials_required" | "development";
  liveConfigured: boolean;
  missingEnvVars: string[];
  oauthReady: boolean;
  directPostGated: boolean;
  note: string;
};

export const TIKTOK_REQUIRED_ENV = [
  "TIKTOK_CLIENT_KEY",
  "TIKTOK_CLIENT_SECRET",
] as const;

export const TIKTOK_OPTIONAL_ENV = [
  "TIKTOK_REDIRECT_URI",
  "TIKTOK_ACCESS_TOKEN",
] as const;
