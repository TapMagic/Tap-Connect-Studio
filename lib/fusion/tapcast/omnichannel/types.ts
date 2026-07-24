/**
 * Omnichannel TapCast — campaign channel variants + publish ladder.
 * One Campaign → many channel-native variants (never blind identical cross-post).
 */

import type { PublishPath } from "../registry/types";

export type VariantStatus =
  | "draft"
  | "adapted"
  | "pending_approval"
  | "approved"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed"
  | "retrying";

export type ChannelMediaAsset = {
  kind: "video" | "image" | "carousel" | "audio" | "none";
  url?: string;
  width?: number;
  height?: number;
  aspectRatio?: string;
  durationSec?: number;
  altText?: string;
};

export type ChannelPreview = {
  title: string;
  body: string;
  hashtags: string[];
  cta?: string;
  media: ChannelMediaAsset;
  dimensionNote: string;
  warnings: string[];
};

export type ChannelAnalyticsStub = {
  impressions: number;
  engagements: number;
  clicks: number;
  keepsAttributed: number;
  walletAddsAttributed: number;
  updatedAt: string;
};

export type AttributionStub = {
  campaignId: string;
  tapPointId?: string;
  cardId?: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
};

/** Channel-native variant derived from a Campaign */
export type CampaignChannelVariant = {
  id: string;
  businessId: string;
  campaignId: string;
  channelId: string;
  title: string;
  /** Channel-native copy — adapted, not copied blindly */
  copy: string;
  hashtags: string[];
  media: ChannelMediaAsset;
  dimensions: {
    aspectRatio: string;
    width: number;
    height: number;
    maxCaptionChars?: number;
  };
  preview: ChannelPreview;
  status: VariantStatus;
  approvalStatus: "none" | "pending" | "approved" | "rejected";
  readiness: {
    ready: boolean;
    blockers: string[];
    publishPath: PublishPath;
  };
  scheduledAt?: string | null;
  publishedAt?: string | null;
  externalDraftId?: string;
  externalPostId?: string;
  lastError?: string;
  retryCount: number;
  mode: "mock" | "live";
  analytics?: ChannelAnalyticsStub;
  attribution: AttributionStub;
  /** TikTok first-class cast id when channel is tiktok */
  tikTokCastId?: string;
  createdAt: string;
  updatedAt: string;
};

export type ChannelConnection = {
  businessId: string;
  channelId: string;
  mode: "mock" | "live";
  health: "healthy" | "degraded" | "disconnected";
  connectedAt: string;
  updatedAt: string;
};

export type TapCastAdapterResult<T> =
  | { ok: true; data: T; mode: "mock" | "live" }
  | { ok: false; error: string; code: string };

/** Per-channel publish outcome — failure isolation */
export type ChannelPublishOutcome = {
  channelId: string;
  variantId: string;
  ok: boolean;
  status: VariantStatus;
  error?: string;
  code?: string;
  externalPostId?: string;
  publishPath: PublishPath;
};

export type MultiPublishResult = {
  campaignId: string;
  outcomes: ChannelPublishOutcome[];
  succeeded: number;
  failed: number;
  /** True when at least one succeeded even if others failed */
  partialSuccess: boolean;
};
