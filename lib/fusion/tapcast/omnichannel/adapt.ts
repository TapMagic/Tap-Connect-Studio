/**
 * Channel-native adaptation — never blind identical cross-post.
 * Hashtags only from source / Brand Vocabulary — never invent #TapConnect / #FYP.
 */

import {
  EMPTY_BRAND_PACK,
  KEYWORD_CHANNELS,
  buildGroundContext,
  suggestKeywords,
  type KeywordChannel,
} from "@/lib/fusion/keywords";
import { toKeywordChannelId } from "@/lib/fusion/channels/canonical";
import type { PublishPath } from "../registry/types";
import { getTapCastChannel } from "../registry/channels";
import type { CampaignChannelVariant, ChannelMediaAsset, ChannelPreview } from "./types";

export type CampaignSource = {
  id: string;
  title: string;
  body?: string;
  offerText?: string;
  cta?: string;
  hashtags?: string[];
  mediaUrl?: string;
  tapPointId?: string;
  cardId?: string;
  businessId?: string;
};

/**
 * Prefer explicit source hashtags; otherwise ground from Brand Vocabulary suggestions.
 * Empty ground / empty pack → empty tags (never invent brand defaults).
 */
export function resolveSourceHashtags(
  channelId: string,
  source: CampaignSource
): string[] {
  if (source.hashtags && source.hashtags.length > 0) {
    return source.hashtags;
  }
  const kwId = toKeywordChannelId(channelId);
  if (!(KEYWORD_CHANNELS as string[]).includes(kwId)) {
    return [];
  }
  if (!source.businessId) {
    return [];
  }
  const result = suggestKeywords({
    ground: buildGroundContext({
      businessId: source.businessId,
      campaignTitle: source.title,
      brandPack: EMPTY_BRAND_PACK,
    }),
    channel: kwId as KeywordChannel,
    limit: 5,
  });
  return result.suggestions
    .filter(
      (s) =>
        s.kind === "hashtag" &&
        s.family !== "avoid_exclusion" &&
        Boolean(s.value)
    )
    .map((s) => s.value)
    .slice(0, 5);
}

const CHANNEL_HASHTAG_STYLE: Record<string, (base: string[]) => string[]> = {
  // Never invent brand tags — only shape provided vocabulary / source hashtags.
  tiktok: (b) => b.slice(0, 5),
  youtube: (b) => b.slice(0, 3),
  instagram: (b) => b.slice(0, 10),
  facebook: (b) => b.slice(0, 3),
  x: (b) => b.slice(0, 2),
  linkedin: () => [],
  pinterest: (b) => b.slice(0, 5),
  snapchat: () => [],
  bluesky: (b) => b.slice(0, 3),
  threads: (b) => b.slice(0, 4),
  google_business: () => [],
  messenger: () => [],
  whatsapp: () => [],
  instagram_dm: () => [],
  sms: () => [],
  discord: (b) => b.slice(0, 2),
  slack_community: () => [],
  reddit: () => [],
};

function clip(text: string, max?: number): string {
  if (!max || text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function adaptCopy(channelId: string, source: CampaignSource, maxChars?: number): string {
  switch (channelId) {
    case "tiktok":
      return clip(
        `${source.title}\n\n${source.offerText ?? source.body ?? ""}\n\nKeep the Card 💚`.trim(),
        maxChars
      );
    case "youtube":
      return clip(source.title, maxChars ?? 100);
    case "instagram":
      return clip(
        `${source.title}\n\n${source.body ?? source.offerText ?? ""}\n\nLink in bio / Keep Card`.trim(),
        maxChars
      );
    case "x":
      return clip(
        `${source.title}${source.offerText ? ` · ${source.offerText}` : ""} ${source.cta ?? ""}`.trim(),
        maxChars ?? 280
      );
    case "linkedin":
      return clip(
        `${source.title}\n\n${source.body ?? source.offerText ?? ""}\n\n${source.cta ?? "Learn more"}`.trim(),
        maxChars
      );
    case "sms":
      return clip(
        `${source.title}: ${source.offerText ?? source.body ?? ""} ${source.cta ?? "Tap to keep"}`.trim(),
        maxChars ?? 160
      );
    case "whatsapp":
      return clip(
        `*${source.title}*\n${source.offerText ?? source.body ?? ""}\n${source.cta ?? ""}`.trim(),
        maxChars
      );
    case "reddit":
      return clip(source.body ?? source.offerText ?? source.title, maxChars);
    case "google_business":
      return clip(
        `${source.title}\n${source.offerText ?? ""}\n${source.cta ?? "Visit us"}`.trim(),
        maxChars
      );
    default:
      return clip(
        `${source.title}${source.offerText ? ` — ${source.offerText}` : ""}`.trim(),
        maxChars
      );
  }
}

function adaptMedia(
  channelId: string,
  source: CampaignSource,
  dims: { aspectRatio: string; width: number; height: number }
): ChannelMediaAsset {
  const def = getTapCastChannel(channelId);
  const media = def?.capabilities.media ?? [];
  if (media.includes("short_video") || media.includes("video")) {
    return {
      kind: "video",
      url: source.mediaUrl,
      width: dims.width,
      height: dims.height,
      aspectRatio: dims.aspectRatio,
      durationSec: channelId === "youtube" ? 45 : 30,
      altText: source.title,
    };
  }
  if (media.includes("image") || media.includes("carousel")) {
    return {
      kind: "image",
      url: source.mediaUrl,
      width: dims.width,
      height: dims.height,
      aspectRatio: dims.aspectRatio,
      altText: source.title,
    };
  }
  return { kind: "none" };
}

export function buildNativePreview(
  channelId: string,
  source: CampaignSource,
  copy: string,
  hashtags: string[],
  media: ChannelMediaAsset,
  dims: { aspectRatio: string; width: number; height: number; maxCaptionChars?: number }
): ChannelPreview {
  const warnings: string[] = [];
  const def = getTapCastChannel(channelId);
  if (def?.capabilities.requiresNativeAdaptation) {
    warnings.push("Channel-native adaptation applied — not a blind cross-post");
  }
  if (dims.maxCaptionChars && copy.length > dims.maxCaptionChars) {
    warnings.push(`Copy exceeds ${dims.maxCaptionChars} char limit`);
  }
  if (channelId === "whatsapp") {
    warnings.push("WhatsApp outbound may require approved message templates");
  }
  if (channelId === "snapchat") {
    warnings.push("No organic public post API claimed — prepared package / open composer only");
  }
  return {
    title: source.title,
    body: copy,
    hashtags,
    cta: source.cta,
    media,
    dimensionNote: `${dims.width}×${dims.height} (${dims.aspectRatio})`,
    warnings,
  };
}

export function selectPublishPath(channelId: string): PublishPath {
  const def = getTapCastChannel(channelId);
  return def?.capabilities.mockPublishPath ?? "manual_checklist";
}

export function evaluateVariantReadiness(
  channelId: string,
  copy: string,
  media: ChannelMediaAsset
): { ready: boolean; blockers: string[]; publishPath: PublishPath } {
  const def = getTapCastChannel(channelId);
  const blockers: string[] = [];
  if (!def) blockers.push("unknown_channel");
  if (!copy.trim()) blockers.push("missing_copy");
  const needsMedia =
    def &&
    (def.capabilities.media.includes("video") ||
      def.capabilities.media.includes("short_video") ||
      def.capabilities.media.includes("image"));
  if (needsMedia && media.kind === "none" && !["sms", "messenger", "bluesky", "x"].includes(channelId)) {
    // Soft: allow mock without media URL
  }
  if (channelId === "sms" && copy.length > 160) {
    blockers.push("sms_over_160");
  }
  return {
    ready: blockers.length === 0,
    blockers,
    publishPath: selectPublishPath(channelId),
  };
}

export function adaptCampaignToChannel(
  channelId: string,
  source: CampaignSource
): {
  copy: string;
  hashtags: string[];
  media: ChannelMediaAsset;
  dimensions: CampaignChannelVariant["dimensions"];
  preview: ChannelPreview;
  readiness: CampaignChannelVariant["readiness"];
} {
  const def = getTapCastChannel(channelId);
  if (!def) {
    throw new Error(`Unknown channel: ${channelId}`);
  }
  const dims = def.capabilities.dimensions[0] ?? {
    aspectRatio: "1:1",
    width: 1080,
    height: 1080,
  };
  const style = CHANNEL_HASHTAG_STYLE[channelId] ?? ((b: string[]) => b.slice(0, 3));
  // Empty when source/vocabulary yields nothing — never invent #TapConnect / #FYP.
  const baseTags = resolveSourceHashtags(channelId, source);
  const hashtags = style(baseTags);
  const copy = adaptCopy(channelId, source, dims.maxCaptionChars);
  const media = adaptMedia(channelId, source, dims);
  const readiness = evaluateVariantReadiness(channelId, copy, media);
  const preview = buildNativePreview(channelId, source, copy, hashtags, media, {
    aspectRatio: dims.aspectRatio,
    width: dims.width,
    height: dims.height,
    maxCaptionChars: dims.maxCaptionChars,
  });
  return {
    copy,
    hashtags,
    media,
    dimensions: {
      aspectRatio: dims.aspectRatio,
      width: dims.width,
      height: dims.height,
      maxCaptionChars: dims.maxCaptionChars,
    },
    preview,
    readiness,
  };
}
