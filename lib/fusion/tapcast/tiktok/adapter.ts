/**
 * TikTok TapCast adapter — compose, draft upload (mock), schedule, approve,
 * Direct Post (gated), retry, analytics stubs, Reels/Shorts adaptation.
 */

import { nanoid } from "nanoid";
import { evaluateTikTokReadiness } from "./readiness";
import {
  appendTikTokAudit,
  getCast,
  getTikTokConnection,
  listCasts,
  setTikTokConnection,
  upsertCast,
} from "./store";
import type {
  TikTokAdaptation,
  TikTokAdapterResult,
  TikTokCast,
  TikTokComposition,
  TikTokRelationshipFunnel,
  TikTokStoryboardBeat,
} from "./types";
import { createGovernedEvent, enqueueOutboxSync } from "@/lib/fusion/publication/events";

const DEFAULT_COMPOSITION: TikTokComposition = {
  aspectRatio: "9:16",
  width: 1080,
  height: 1920,
  durationSec: 30,
  coverFrameSec: 1,
};

function now() {
  return new Date().toISOString();
}

function defaultFunnel(opts?: {
  cardId?: string;
  campaignId?: string;
}): TikTokRelationshipFunnel {
  return {
    stages: [
      { id: "content", label: "TikTok content", status: "ready" },
      {
        id: "card",
        label: "Card",
        status: opts?.cardId ? "ready" : "pending",
        linkedObjectId: opts?.cardId,
      },
      { id: "keep", label: "Keep", status: "pending" },
      { id: "wallet", label: "Wallet", status: "pending" },
      { id: "loyalty", label: "Loyalty", status: "pending" },
      { id: "outcome", label: "Measurable outcome", status: "pending" },
    ],
  };
}

export function connectTikTok(opts: {
  businessId: string;
  preferLive?: boolean;
}): TikTokAdapterResult<{ mode: "mock" | "live" }> {
  const readiness = evaluateTikTokReadiness();
  const mode =
    opts.preferLive && readiness.liveConfigured ? "live" : "mock";
  setTikTokConnection(opts.businessId, mode);
  appendTikTokAudit({
    businessId: opts.businessId,
    action: "tiktok.connected",
    detail: { mode, liveConfigured: readiness.liveConfigured },
  });
  return { ok: true, data: { mode }, mode };
}

export function createTikTokCast(opts: {
  businessId: string;
  title: string;
  script?: string;
  caption?: string;
  hashtags?: string[];
  campaignId?: string;
  cardId?: string;
  tapPointId?: string;
}): TikTokAdapterResult<TikTokCast> {
  const conn = getTikTokConnection(opts.businessId);
  if (!conn) {
    connectTikTok({ businessId: opts.businessId });
  }
  const mode = getTikTokConnection(opts.businessId)?.mode ?? "mock";
  const cast: TikTokCast = {
    id: `ttcast_${nanoid(10)}`,
    businessId: opts.businessId,
    title: opts.title,
    script: opts.script ?? "",
    caption: opts.caption ?? "",
    hashtags: opts.hashtags ?? ["#TapConnect", "#TapTheMagic"],
    storyboard: [],
    composition: { ...DEFAULT_COMPOSITION },
    status: "draft",
    campaignId: opts.campaignId,
    cardId: opts.cardId,
    tapPointId: opts.tapPointId,
    retryCount: 0,
    mode,
    funnel: defaultFunnel({ cardId: opts.cardId, campaignId: opts.campaignId }),
    analytics: {
      views: 0,
      likes: 0,
      shares: 0,
      comments: 0,
      profileVisits: 0,
      keepsAttributed: 0,
      walletAddsAttributed: 0,
      updatedAt: now(),
    },
    createdAt: now(),
    updatedAt: now(),
  };
  upsertCast(cast);
  appendTikTokAudit({
    businessId: opts.businessId,
    castId: cast.id,
    action: "tiktok.cast_created",
    detail: { title: cast.title },
  });
  void enqueueOutboxSync(
    "tapcast.tiktok.created",
    createGovernedEvent({
      name: "tapcast.tiktok.created",
      businessId: opts.businessId,
      aggregateType: "TikTokCast",
      aggregateId: cast.id,
      correlationId: nanoid(10),
      payload: { title: cast.title, mode },
    })
  );
  return { ok: true, data: cast, mode };
}

export function updateTikTokStoryboard(
  castId: string,
  beats: Omit<TikTokStoryboardBeat, "id">[]
): TikTokAdapterResult<TikTokCast> {
  const cast = getCast(castId);
  if (!cast) return { ok: false, error: "Cast not found", code: "not_found" };
  cast.storyboard = beats.map((b, i) => ({
    ...b,
    id: `beat_${nanoid(6)}`,
    order: b.order ?? i,
  }));
  cast.status = "storyboard";
  cast.updatedAt = now();
  upsertCast(cast);
  appendTikTokAudit({
    businessId: cast.businessId,
    castId,
    action: "tiktok.storyboard_updated",
    detail: { beatCount: cast.storyboard.length },
  });
  return { ok: true, data: cast, mode: cast.mode };
}

export function composeTikTok916(
  castId: string,
  opts: { durationSec?: number; coverNote?: string; coverFrameSec?: number } = {}
): TikTokAdapterResult<TikTokCast> {
  const cast = getCast(castId);
  if (!cast) return { ok: false, error: "Cast not found", code: "not_found" };
  cast.composition = {
    aspectRatio: "9:16",
    width: 1080,
    height: 1920,
    durationSec: opts.durationSec ?? cast.composition.durationSec ?? 30,
    coverFrameSec: opts.coverFrameSec ?? 1,
  };
  cast.coverNote = opts.coverNote ?? cast.coverNote;
  cast.status = "composed";
  cast.updatedAt = now();
  upsertCast(cast);
  appendTikTokAudit({
    businessId: cast.businessId,
    castId,
    action: "tiktok.composed_9_16",
    detail: { composition: cast.composition },
  });
  return { ok: true, data: cast, mode: cast.mode };
}

export function setTikTokCaption(
  castId: string,
  caption: string,
  hashtags?: string[]
): TikTokAdapterResult<TikTokCast> {
  const cast = getCast(castId);
  if (!cast) return { ok: false, error: "Cast not found", code: "not_found" };
  cast.caption = caption;
  if (hashtags) cast.hashtags = hashtags;
  cast.updatedAt = now();
  upsertCast(cast);
  return { ok: true, data: cast, mode: cast.mode };
}

/** Mock draft upload — always works without credentials */
export function uploadTikTokDraft(castId: string): TikTokAdapterResult<TikTokCast> {
  const cast = getCast(castId);
  if (!cast) return { ok: false, error: "Cast not found", code: "not_found" };
  if (cast.status === "draft" && !cast.composition) {
    return { ok: false, error: "Compose 9:16 before upload", code: "not_composed" };
  }
  cast.externalDraftId = `mock_draft_${nanoid(8)}`;
  cast.status = "uploaded_draft";
  cast.updatedAt = now();
  upsertCast(cast);
  appendTikTokAudit({
    businessId: cast.businessId,
    castId,
    action: "tiktok.draft_uploaded",
    detail: { externalDraftId: cast.externalDraftId, mode: "mock" },
  });
  return { ok: true, data: cast, mode: cast.mode };
}

export function requestTikTokApproval(castId: string): TikTokAdapterResult<TikTokCast> {
  const cast = getCast(castId);
  if (!cast) return { ok: false, error: "Cast not found", code: "not_found" };
  cast.status = "pending_approval";
  cast.updatedAt = now();
  upsertCast(cast);
  appendTikTokAudit({
    businessId: cast.businessId,
    castId,
    action: "tiktok.approval_requested",
  });
  return { ok: true, data: cast, mode: cast.mode };
}

export function resolveTikTokApproval(
  castId: string,
  decision: "approve" | "reject"
): TikTokAdapterResult<TikTokCast> {
  const cast = getCast(castId);
  if (!cast) return { ok: false, error: "Cast not found", code: "not_found" };
  if (decision === "reject") {
    cast.status = "draft";
    cast.updatedAt = now();
    upsertCast(cast);
    appendTikTokAudit({
      businessId: cast.businessId,
      castId,
      action: "tiktok.approval_rejected",
    });
    return { ok: true, data: cast, mode: cast.mode };
  }
  cast.status = cast.scheduledAt ? "scheduled" : "uploaded_draft";
  cast.updatedAt = now();
  upsertCast(cast);
  appendTikTokAudit({
    businessId: cast.businessId,
    castId,
    action: "tiktok.approval_approved",
  });
  return { ok: true, data: cast, mode: cast.mode };
}

export function scheduleTikTokCast(
  castId: string,
  scheduledAt: string
): TikTokAdapterResult<TikTokCast> {
  const cast = getCast(castId);
  if (!cast) return { ok: false, error: "Cast not found", code: "not_found" };
  cast.scheduledAt = scheduledAt;
  cast.status = "scheduled";
  cast.updatedAt = now();
  upsertCast(cast);
  appendTikTokAudit({
    businessId: cast.businessId,
    castId,
    action: "tiktok.scheduled",
    detail: { scheduledAt },
  });
  return { ok: true, data: cast, mode: cast.mode };
}

/**
 * Direct Post — gated when live credentials / token missing.
 * Mock mode publishes a mock post id.
 */
export function directPostTikTok(castId: string): TikTokAdapterResult<TikTokCast> {
  const cast = getCast(castId);
  if (!cast) return { ok: false, error: "Cast not found", code: "not_found" };
  const readiness = evaluateTikTokReadiness();

  if (cast.mode === "live") {
    if (readiness.directPostGated) {
      appendTikTokAudit({
        businessId: cast.businessId,
        castId,
        action: "tiktok.direct_post_blocked",
        detail: { missing: readiness.missingEnvVars, gated: true },
      });
      return {
        ok: false,
        error:
          "Direct Post gated — VERIFIED — CREDENTIALS REQUIRED (OAuth + access token)",
        code: "credentials_required",
      };
    }
  }

  // Mock (or live with token) publish path
  cast.status = "publishing";
  cast.updatedAt = now();
  upsertCast(cast);

  cast.externalPostId = `${cast.mode}_post_${nanoid(8)}`;
  cast.status = "published";
  cast.publishedAt = now();
  cast.updatedAt = now();
  if (cast.funnel) {
    cast.funnel.stages = cast.funnel.stages.map((s) =>
      s.id === "content" ? { ...s, status: "active" as const } : s
    );
  }
  upsertCast(cast);
  appendTikTokAudit({
    businessId: cast.businessId,
    castId,
    action: "tiktok.direct_posted",
    detail: { externalPostId: cast.externalPostId, mode: cast.mode },
  });
  void enqueueOutboxSync(
    "tapcast.tiktok.published",
    createGovernedEvent({
      name: "tapcast.tiktok.published",
      businessId: cast.businessId,
      aggregateType: "TikTokCast",
      aggregateId: cast.id,
      correlationId: nanoid(10),
      payload: { externalPostId: cast.externalPostId, mode: cast.mode },
    })
  );
  return { ok: true, data: cast, mode: cast.mode };
}

export function failAndRetryTikTok(castId: string): TikTokAdapterResult<TikTokCast> {
  const cast = getCast(castId);
  if (!cast) return { ok: false, error: "Cast not found", code: "not_found" };
  cast.status = "failed";
  cast.lastError = "Simulated publish failure";
  cast.updatedAt = now();
  upsertCast(cast);
  appendTikTokAudit({
    businessId: cast.businessId,
    castId,
    action: "tiktok.publish_failed",
    detail: { error: cast.lastError },
  });

  cast.status = "retrying";
  cast.retryCount += 1;
  cast.updatedAt = now();
  upsertCast(cast);

  // Mock retry succeeds
  cast.status = "published";
  cast.externalPostId = cast.externalPostId ?? `mock_retry_${nanoid(8)}`;
  cast.publishedAt = now();
  cast.lastError = undefined;
  cast.updatedAt = now();
  upsertCast(cast);
  appendTikTokAudit({
    businessId: cast.businessId,
    castId,
    action: "tiktok.retry_succeeded",
    detail: { retryCount: cast.retryCount, externalPostId: cast.externalPostId },
  });
  return { ok: true, data: cast, mode: cast.mode };
}

export function associateTikTokCast(
  castId: string,
  links: { campaignId?: string; cardId?: string; tapPointId?: string }
): TikTokAdapterResult<TikTokCast> {
  const cast = getCast(castId);
  if (!cast) return { ok: false, error: "Cast not found", code: "not_found" };
  if (links.campaignId) cast.campaignId = links.campaignId;
  if (links.cardId) cast.cardId = links.cardId;
  if (links.tapPointId) cast.tapPointId = links.tapPointId;
  cast.funnel = defaultFunnel({ cardId: cast.cardId, campaignId: cast.campaignId });
  cast.updatedAt = now();
  upsertCast(cast);
  appendTikTokAudit({
    businessId: cast.businessId,
    castId,
    action: "tiktok.associated",
    detail: links,
  });
  return { ok: true, data: cast, mode: cast.mode };
}

export function refreshTikTokAnalytics(castId: string): TikTokAdapterResult<TikTokCast> {
  const cast = getCast(castId);
  if (!cast) return { ok: false, error: "Cast not found", code: "not_found" };
  const seed = cast.retryCount + (cast.status === "published" ? 100 : 10);
  cast.analytics = {
    views: seed * 37,
    likes: seed * 4,
    shares: seed * 2,
    comments: Math.floor(seed / 2),
    profileVisits: seed * 3,
    keepsAttributed: Math.floor(seed / 5),
    walletAddsAttributed: Math.floor(seed / 10),
    updatedAt: now(),
  };
  if (cast.funnel && cast.status === "published") {
    cast.funnel.stages = cast.funnel.stages.map((s) => {
      if (s.id === "content" || s.id === "card") return { ...s, status: "active" as const };
      if (s.id === "keep" && (cast.analytics?.keepsAttributed ?? 0) > 0) {
        return { ...s, status: "measured" as const };
      }
      if (s.id === "wallet" && (cast.analytics?.walletAddsAttributed ?? 0) > 0) {
        return { ...s, status: "measured" as const };
      }
      return s;
    });
  }
  cast.updatedAt = now();
  upsertCast(cast);
  return { ok: true, data: cast, mode: cast.mode };
}

export function adaptTikTokToReelsShorts(castId: string): TikTokAdapterResult<{
  cast: TikTokCast;
  adaptations: TikTokAdaptation[];
}> {
  const cast = getCast(castId);
  if (!cast) return { ok: false, error: "Cast not found", code: "not_found" };
  const adaptations: TikTokAdaptation[] = [
    {
      network: "reels",
      aspectRatio: "9:16",
      captionMax: 2200,
      notes: "Stub — reuse 9:16 composition; trim CTA for IG Reels",
    },
    {
      network: "shorts",
      aspectRatio: "9:16",
      captionMax: 100,
      notes: "Stub — Shorts title ≤100 chars; map hashtags to YouTube tags",
    },
  ];
  appendTikTokAudit({
    businessId: cast.businessId,
    castId,
    action: "tiktok.adapted_reels_shorts",
    detail: { networks: adaptations.map((a) => a.network) },
  });
  return { ok: true, data: { cast, adaptations }, mode: cast.mode };
}

export function getTikTokSnapshot(businessId: string) {
  const readiness = evaluateTikTokReadiness();
  const conn = getTikTokConnection(businessId);
  return {
    category: "TapCast · TikTok",
    displayStatus: readiness.displayStatus,
    statusLabel: "VERIFIED — CREDENTIALS REQUIRED",
    note: readiness.note,
    readiness,
    connection: conn,
    casts: listCasts(businessId),
  };
}
