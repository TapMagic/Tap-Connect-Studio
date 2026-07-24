/**
 * Omnichannel TapCast adapters — mock-first publish ladder with failure isolation.
 * TikTok variants optionally bridge into the existing first-class TikTok module.
 */

import { nanoid } from "nanoid";
import { DISPLAY_READINESS_LABEL } from "@/lib/fusion/readiness/display-status";
import { getTapCastChannel, evaluateChannelReadiness } from "../registry";
import {
  connectTikTok,
  createTikTokCast,
  composeTikTok916,
  setTikTokCaption,
  uploadTikTokDraft,
  scheduleTikTokCast,
  directPostTikTok,
  requestTikTokApproval,
  resolveTikTokApproval,
  failAndRetryTikTok,
  refreshTikTokAnalytics,
} from "../tiktok";
import { adaptCampaignToChannel, type CampaignSource } from "./adapt";
import {
  getChannelConnection,
  getVariant,
  listChannelConnections,
  listOmnichannelAudit,
  listVariants,
  setChannelConnection,
  upsertVariant,
  connectionsMap,
} from "./store";
import {
  persistOmnichannelAudit,
  persistChannelConnection,
  persistVariant,
} from "./persist";
import type {
  CampaignChannelVariant,
  ChannelAnalyticsStub,
  ChannelConnection,
  ChannelPublishOutcome,
  MultiPublishResult,
  TapCastAdapterResult,
  VariantStatus,
} from "./types";

function now() {
  return new Date().toISOString();
}

let pendingPersists: Promise<unknown>[] = [];

function trackPersist(p: Promise<unknown>) {
  pendingPersists.push(
    p.catch(() => {
      /* memory/unit: ignore FK when synthetic business ids */
    })
  );
  void p.catch(() => undefined);
}

export async function flushOmnichannelPersists(): Promise<void> {
  const batch = pendingPersists;
  pendingPersists = [];
  await Promise.all(batch);
}

function saveVariant(v: CampaignChannelVariant): CampaignChannelVariant {
  upsertVariant(v);
  trackPersist(persistVariant(v));
  return v;
}

function audit(entry: {
  businessId: string;
  channelId?: string;
  variantId?: string;
  action: string;
  detail?: Record<string, unknown>;
}) {
  trackPersist(persistOmnichannelAudit(entry));
}

export function connectChannel(opts: {
  businessId: string;
  channelId: string;
  preferLive?: boolean;
}): TapCastAdapterResult<ChannelConnection> {
  const def = getTapCastChannel(opts.channelId);
  if (!def) {
    return { ok: false, error: `Unknown channel: ${opts.channelId}`, code: "unknown_channel" };
  }
  const readiness = evaluateChannelReadiness(opts.channelId);
  const mode =
    opts.preferLive && readiness.liveConfigured ? "live" : "mock";

  if (opts.channelId === "tiktok") {
    connectTikTok({ businessId: opts.businessId, preferLive: opts.preferLive });
  }

  const conn: ChannelConnection = {
    businessId: opts.businessId,
    channelId: opts.channelId,
    mode,
    health: "healthy",
    connectedAt: getChannelConnection(opts.businessId, opts.channelId)?.connectedAt ?? now(),
    updatedAt: now(),
  };
  setChannelConnection(conn);
  trackPersist(persistChannelConnection(conn));
  audit({
    businessId: opts.businessId,
    channelId: opts.channelId,
    action: "tapcast.channel.connected",
    detail: { mode, liveConfigured: readiness.liveConfigured },
  });
  return { ok: true, data: conn, mode };
}

export function createChannelVariant(opts: {
  businessId: string;
  campaignId: string;
  channelId: string;
  source: CampaignSource;
}): TapCastAdapterResult<CampaignChannelVariant> {
  const def = getTapCastChannel(opts.channelId);
  if (!def) {
    return { ok: false, error: `Unknown channel: ${opts.channelId}`, code: "unknown_channel" };
  }
  if (!getChannelConnection(opts.businessId, opts.channelId)) {
    connectChannel({ businessId: opts.businessId, channelId: opts.channelId });
  }
  const mode = getChannelConnection(opts.businessId, opts.channelId)?.mode ?? "mock";
  const adapted = adaptCampaignToChannel(opts.channelId, {
    ...opts.source,
    id: opts.campaignId,
    businessId: opts.businessId,
  });

  let tikTokCastId: string | undefined;
  if (opts.channelId === "tiktok") {
    const cast = createTikTokCast({
      businessId: opts.businessId,
      title: opts.source.title,
      script: opts.source.body,
      caption: adapted.copy,
      hashtags: adapted.hashtags,
      campaignId: opts.campaignId,
      cardId: opts.source.cardId,
      tapPointId: opts.source.tapPointId,
    });
    if (cast.ok) {
      composeTikTok916(cast.data.id, { durationSec: adapted.media.durationSec });
      setTikTokCaption(cast.data.id, adapted.copy, adapted.hashtags);
      tikTokCastId = cast.data.id;
    }
  }

  const variant: CampaignChannelVariant = {
    id: `tcvar_${nanoid(10)}`,
    businessId: opts.businessId,
    campaignId: opts.campaignId,
    channelId: opts.channelId,
    title: `${opts.source.title} · ${def.name}`,
    copy: adapted.copy,
    hashtags: adapted.hashtags,
    media: adapted.media,
    dimensions: adapted.dimensions,
    preview: adapted.preview,
    status: "adapted",
    approvalStatus: "none",
    readiness: adapted.readiness,
    retryCount: 0,
    mode,
    tikTokCastId,
    attribution: {
      campaignId: opts.campaignId,
      tapPointId: opts.source.tapPointId,
      cardId: opts.source.cardId,
      utmSource: opts.channelId,
      utmMedium: "tapcast",
      utmCampaign: opts.campaignId,
    },
    analytics: {
      impressions: 0,
      engagements: 0,
      clicks: 0,
      keepsAttributed: 0,
      walletAddsAttributed: 0,
      updatedAt: now(),
    },
    createdAt: now(),
    updatedAt: now(),
  };
  saveVariant(variant);
  audit({
    businessId: opts.businessId,
    channelId: opts.channelId,
    variantId: variant.id,
    action: "tapcast.variant.created",
    detail: {
      campaignId: opts.campaignId,
      publishPath: variant.readiness.publishPath,
      tikTokCastId,
    },
  });
  return { ok: true, data: variant, mode };
}

/** Create variants for many channels — each adapted natively */
export function createMultiChannelVariants(opts: {
  businessId: string;
  campaignId: string;
  channelIds: string[];
  source: CampaignSource;
}): TapCastAdapterResult<{
  variants: CampaignChannelVariant[];
  failures: Array<{ channelId: string; error: string; code: string }>;
}> {
  const variants: CampaignChannelVariant[] = [];
  const failures: Array<{ channelId: string; error: string; code: string }> = [];
  for (const channelId of opts.channelIds) {
    const result = createChannelVariant({
      businessId: opts.businessId,
      campaignId: opts.campaignId,
      channelId,
      source: opts.source,
    });
    if (result.ok) variants.push(result.data);
    else failures.push({ channelId, error: result.error, code: result.code });
  }
  return {
    ok: true,
    data: { variants, failures },
    mode: "mock",
  };
}

export function reAdaptVariant(
  variantId: string,
  source: CampaignSource
): TapCastAdapterResult<CampaignChannelVariant> {
  const existing = getVariant(variantId);
  if (!existing) {
    return { ok: false, error: "Variant not found", code: "not_found" };
  }
  const adapted = adaptCampaignToChannel(existing.channelId, {
    ...source,
    id: existing.campaignId,
    businessId: existing.businessId,
  });
  const updated: CampaignChannelVariant = {
    ...existing,
    copy: adapted.copy,
    hashtags: adapted.hashtags,
    media: adapted.media,
    dimensions: adapted.dimensions,
    preview: adapted.preview,
    readiness: adapted.readiness,
    status: "adapted",
    updatedAt: now(),
  };
  if (existing.tikTokCastId) {
    setTikTokCaption(existing.tikTokCastId, adapted.copy, adapted.hashtags);
  }
  saveVariant(updated);
  audit({
    businessId: existing.businessId,
    channelId: existing.channelId,
    variantId,
    action: "tapcast.variant.adapted",
  });
  return { ok: true, data: updated, mode: existing.mode };
}

export function approveVariant(
  variantId: string,
  decision: "approve" | "reject"
): TapCastAdapterResult<CampaignChannelVariant> {
  const v = getVariant(variantId);
  if (!v) return { ok: false, error: "Variant not found", code: "not_found" };

  if (v.tikTokCastId) {
    requestTikTokApproval(v.tikTokCastId);
    resolveTikTokApproval(v.tikTokCastId, decision);
  }

  const updated: CampaignChannelVariant = {
    ...v,
    approvalStatus: decision === "approve" ? "approved" : "rejected",
    status: decision === "approve" ? "approved" : "draft",
    updatedAt: now(),
  };
  saveVariant(updated);
  audit({
    businessId: v.businessId,
    channelId: v.channelId,
    variantId,
    action: decision === "approve" ? "tapcast.variant.approved" : "tapcast.variant.rejected",
  });
  return { ok: true, data: updated, mode: v.mode };
}

export function scheduleVariant(
  variantId: string,
  scheduledAt: string
): TapCastAdapterResult<CampaignChannelVariant> {
  const v = getVariant(variantId);
  if (!v) return { ok: false, error: "Variant not found", code: "not_found" };
  const def = getTapCastChannel(v.channelId);
  if (def && !def.capabilities.scheduling) {
    return {
      ok: false,
      error: `${def.name} does not support scheduling`,
      code: "scheduling_unsupported",
    };
  }
  if (v.tikTokCastId) {
    scheduleTikTokCast(v.tikTokCastId, scheduledAt);
  }
  const updated: CampaignChannelVariant = {
    ...v,
    scheduledAt,
    status: "scheduled",
    updatedAt: now(),
  };
  saveVariant(updated);
  audit({
    businessId: v.businessId,
    channelId: v.channelId,
    variantId,
    action: "tapcast.variant.scheduled",
    detail: { scheduledAt },
  });
  return { ok: true, data: updated, mode: v.mode };
}

/**
 * Publish one variant via its mock publish path.
 * Simulates failure when `forceFail` is set (for isolation tests).
 *
 * Ladder honesty:
 * - open_composer / manual_checklist → checklist only (no live post claim)
 * - prepared_package + livePublishPath null (e.g. Snapchat) → package draft id only
 * - otherwise mock publish mints externalDraftId + externalPostId
 */
export function publishVariantMock(
  variantId: string,
  opts?: { forceFail?: boolean }
): TapCastAdapterResult<CampaignChannelVariant> {
  const v = getVariant(variantId);
  if (!v) return { ok: false, error: "Variant not found", code: "not_found" };

  if (opts?.forceFail) {
    const failed: CampaignChannelVariant = {
      ...v,
      status: "failed",
      lastError: "Simulated channel failure (isolation test)",
      retryCount: v.retryCount,
      updatedAt: now(),
    };
    saveVariant(failed);
    audit({
      businessId: v.businessId,
      channelId: v.channelId,
      variantId,
      action: "tapcast.variant.publish_failed",
      detail: { simulated: true },
    });
    return {
      ok: false,
      error: failed.lastError!,
      code: "publish_failed",
    };
  }

  const def = getTapCastChannel(v.channelId);
  const path = v.readiness.publishPath;

  if (v.tikTokCastId) {
    if (path === "draft_upload" || path === "direct" || path === "scheduled") {
      uploadTikTokDraft(v.tikTokCastId);
    }
    if (path === "direct" || v.status === "scheduled" || v.status === "approved") {
      const posted = directPostTikTok(v.tikTokCastId);
      if (!posted.ok) {
        const failed: CampaignChannelVariant = {
          ...v,
          status: "failed",
          lastError: posted.error,
          updatedAt: now(),
        };
        saveVariant(failed);
        return { ok: false, error: posted.error, code: posted.code };
      }
    }
  }

  // Weakest ladder rungs — never claim automated live publish
  if (path === "open_composer" || path === "manual_checklist") {
    const externalDraftId =
      v.externalDraftId ?? `checklist_${v.channelId}_${nanoid(8)}`;
    const updated: CampaignChannelVariant = {
      ...v,
      status: "adapted",
      externalDraftId,
      externalPostId: undefined,
      publishedAt: undefined,
      lastError: undefined,
      updatedAt: now(),
    };
    saveVariant(updated);
    audit({
      businessId: v.businessId,
      channelId: v.channelId,
      variantId,
      action: "tapcast.variant.manual_required",
      detail: { publishPath: path, externalDraftId, livePublishClaimed: false },
    });
    return {
      ok: false,
      error: `${def?.name ?? v.channelId} uses ${path} — no automated live publish claimed`,
      code: "manual_publish_required",
    };
  }

  // Snapchat (and any channel with no live publish API): package only
  if (path === "prepared_package" && def?.capabilities.livePublishPath === null) {
    const externalDraftId =
      v.externalDraftId ?? `pkg_${v.channelId}_${nanoid(8)}`;
    const updated: CampaignChannelVariant = {
      ...v,
      status: "approved",
      externalDraftId,
      externalPostId: undefined,
      publishedAt: undefined,
      lastError: undefined,
      updatedAt: now(),
    };
    saveVariant(updated);
    audit({
      businessId: v.businessId,
      channelId: v.channelId,
      variantId,
      action: "tapcast.variant.packaged",
      detail: {
        publishPath: path,
        externalDraftId,
        livePublishClaimed: false,
      },
    });
    return { ok: true, data: updated, mode: "mock" };
  }

  const externalDraftId =
    v.externalDraftId ?? `draft_${v.channelId}_${nanoid(8)}`;
  const externalPostId = `post_${v.channelId}_${nanoid(8)}`;

  const updated: CampaignChannelVariant = {
    ...v,
    status: "published",
    publishedAt: now(),
    externalDraftId,
    externalPostId,
    lastError: undefined,
    updatedAt: now(),
  };
  saveVariant(updated);
  audit({
    businessId: v.businessId,
    channelId: v.channelId,
    variantId,
    action: "tapcast.variant.published",
    detail: { publishPath: path, externalPostId, mode: "mock" },
  });
  return { ok: true, data: updated, mode: "mock" };
}

/**
 * Publish many variants with failure isolation —
 * one channel failure must not roll back others.
 */
export function publishCampaignChannels(opts: {
  businessId: string;
  campaignId: string;
  variantIds?: string[];
  /** Channel ids that should simulate failure */
  forceFailChannels?: string[];
}): TapCastAdapterResult<MultiPublishResult> {
  const variants = (
    opts.variantIds
      ? opts.variantIds.map((id) => getVariant(id)).filter(Boolean)
      : listVariants(opts.businessId, { campaignId: opts.campaignId })
  ) as CampaignChannelVariant[];

  const outcomes: ChannelPublishOutcome[] = [];
  for (const v of variants) {
    if (v.businessId !== opts.businessId) continue;
    const forceFail = opts.forceFailChannels?.includes(v.channelId);
    const result = publishVariantMock(v.id, { forceFail });
    if (result.ok) {
      outcomes.push({
        channelId: v.channelId,
        variantId: v.id,
        ok: true,
        status: result.data.status,
        externalPostId: result.data.externalPostId,
        publishPath: v.readiness.publishPath,
      });
    } else {
      const failed = getVariant(v.id);
      outcomes.push({
        channelId: v.channelId,
        variantId: v.id,
        ok: false,
        status: (failed?.status ?? "failed") as VariantStatus,
        error: result.error,
        code: result.code,
        publishPath: v.readiness.publishPath,
      });
    }
  }

  const succeeded = outcomes.filter((o) => o.ok).length;
  const failed = outcomes.filter((o) => !o.ok).length;
  const multi: MultiPublishResult = {
    campaignId: opts.campaignId,
    outcomes,
    succeeded,
    failed,
    partialSuccess: succeeded > 0 && failed > 0,
  };
  audit({
    businessId: opts.businessId,
    action: "tapcast.campaign.multi_publish",
    detail: {
      campaignId: opts.campaignId,
      succeeded,
      failed,
      partialSuccess: multi.partialSuccess,
    },
  });
  return { ok: true, data: multi, mode: "mock" };
}

export function retryVariant(variantId: string): TapCastAdapterResult<CampaignChannelVariant> {
  const v = getVariant(variantId);
  if (!v) return { ok: false, error: "Variant not found", code: "not_found" };

  if (v.tikTokCastId) {
    const retried = failAndRetryTikTok(v.tikTokCastId);
    if (!retried.ok) {
      return { ok: false, error: retried.error, code: retried.code };
    }
  }

  const retrying: CampaignChannelVariant = {
    ...v,
    status: "retrying",
    retryCount: v.retryCount + 1,
    lastError: undefined,
    updatedAt: now(),
  };
  saveVariant(retrying);

  const published = publishVariantMock(variantId);
  if (!published.ok) {
    return {
      ok: false,
      error: published.error,
      code: published.code,
    };
  }
  const done = {
    ...published.data,
    retryCount: retrying.retryCount,
  };
  saveVariant(done);
  audit({
    businessId: v.businessId,
    channelId: v.channelId,
    variantId,
    action: "tapcast.variant.retry_succeeded",
    detail: { retryCount: done.retryCount },
  });
  return { ok: true, data: done, mode: "mock" };
}

export function refreshVariantAnalytics(
  variantId: string
): TapCastAdapterResult<CampaignChannelVariant> {
  const v = getVariant(variantId);
  if (!v) return { ok: false, error: "Variant not found", code: "not_found" };
  const def = getTapCastChannel(v.channelId);
  if (def && !def.capabilities.analytics) {
    return {
      ok: false,
      error: `${def.name} does not claim analytics in registry`,
      code: "analytics_unsupported",
    };
  }

  if (v.tikTokCastId) {
    refreshTikTokAnalytics(v.tikTokCastId);
  }

  const analytics: ChannelAnalyticsStub = {
    impressions: 100 + Math.floor(Math.random() * 900),
    engagements: 10 + Math.floor(Math.random() * 90),
    clicks: 5 + Math.floor(Math.random() * 40),
    keepsAttributed: Math.floor(Math.random() * 8),
    walletAddsAttributed: Math.floor(Math.random() * 4),
    updatedAt: now(),
  };
  const updated: CampaignChannelVariant = {
    ...v,
    analytics,
    updatedAt: now(),
  };
  saveVariant(updated);
  audit({
    businessId: v.businessId,
    channelId: v.channelId,
    variantId,
    action: "tapcast.variant.analytics_refreshed",
    detail: analytics,
  });
  return { ok: true, data: updated, mode: v.mode };
}

export function openProviderComposer(
  variantId: string
): TapCastAdapterResult<{ url: string; checklist: string[] }> {
  const v = getVariant(variantId);
  if (!v) return { ok: false, error: "Variant not found", code: "not_found" };
  const def = getTapCastChannel(v.channelId);
  const url = `https://composer.mock/${v.channelId}?variant=${v.id}`;
  const checklist = [
    `Paste channel-native copy (${v.copy.length} chars)`,
    `Apply dimensions ${v.dimensions.width}×${v.dimensions.height}`,
    ...v.hashtags.map((h) => `Include ${h}`),
    "Confirm Tap Connect attribution / UTM",
    "Do not blind cross-post identical assets",
  ];
  audit({
    businessId: v.businessId,
    channelId: v.channelId,
    variantId,
    action: "tapcast.variant.open_composer",
    detail: { url, channel: def?.name },
  });
  return { ok: true, data: { url, checklist }, mode: "mock" };
}

export function getOmnichannelSnapshot(businessId: string) {
  const connections = listChannelConnections(businessId);
  const variants = listVariants(businessId);
  const readiness = evaluateChannelReadiness;
  return {
    statusLabel: DISPLAY_READINESS_LABEL.verified_credentials_required,
    note: "Omnichannel TapCast mock adapters ready. Live publish = VERIFIED — CREDENTIALS REQUIRED.",
    connections,
    variants,
    audit: listOmnichannelAudit(businessId),
    channelReadiness: [...connectionsMap(businessId).keys()].map((id) =>
      readiness(id, getChannelConnection(businessId, id))
    ),
  };
}

export { listVariants, getVariant, listChannelConnections, listOmnichannelAudit };
