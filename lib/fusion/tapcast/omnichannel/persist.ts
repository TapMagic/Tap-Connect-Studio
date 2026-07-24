/**
 * Prisma persistence for omnichannel TapCast — isolated fusion DB when configured.
 */

import { prisma } from "@/lib/db";
import { isIsolatedFusionDatabaseConfigured } from "@/lib/fusion/db/safety";
import type { Prisma } from "@prisma/client";
import type { CampaignChannelVariant, ChannelConnection } from "./types";
import {
  appendOmnichannelAudit,
  getChannelConnection,
  getVariant,
  listChannelConnections,
  listOmnichannelAudit,
  listVariants,
  setChannelConnection,
  upsertVariant,
} from "./store";

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export function omnichannelPersistenceEnabled(): boolean {
  return isIsolatedFusionDatabaseConfigured();
}

function variantFromRow(row: {
  id: string;
  businessId: string;
  campaignId: string;
  channelId: string;
  title: string;
  status: string;
  payload: unknown;
  scheduledAt: Date | null;
  publishedAt: Date | null;
  externalDraftId: string | null;
  externalPostId: string | null;
  lastError: string | null;
  retryCount: number;
  mode: string;
  tikTokCastId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): CampaignChannelVariant {
  const payload = (row.payload ?? {}) as Partial<CampaignChannelVariant>;
  return {
    id: row.id,
    businessId: row.businessId,
    campaignId: row.campaignId,
    channelId: row.channelId,
    title: row.title,
    copy: payload.copy ?? "",
    hashtags: payload.hashtags ?? [],
    media: payload.media ?? { kind: "none" },
    dimensions: payload.dimensions ?? {
      aspectRatio: "1:1",
      width: 1080,
      height: 1080,
    },
    preview: payload.preview ?? {
      title: row.title,
      body: payload.copy ?? "",
      hashtags: [],
      media: { kind: "none" },
      dimensionNote: "",
      warnings: [],
    },
    status: row.status as CampaignChannelVariant["status"],
    approvalStatus: payload.approvalStatus ?? "none",
    readiness: payload.readiness ?? {
      ready: false,
      blockers: ["hydrate"],
      publishPath: "manual_checklist",
    },
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    externalDraftId: row.externalDraftId ?? undefined,
    externalPostId: row.externalPostId ?? undefined,
    lastError: row.lastError ?? undefined,
    retryCount: row.retryCount,
    mode: row.mode as "mock" | "live",
    analytics: payload.analytics,
    attribution: payload.attribution ?? {
      campaignId: row.campaignId,
      utmSource: row.channelId,
      utmMedium: "tapcast",
      utmCampaign: row.campaignId,
    },
    tikTokCastId: row.tikTokCastId ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function persistVariant(variant: CampaignChannelVariant): Promise<void> {
  upsertVariant(variant);
  if (!omnichannelPersistenceEnabled()) return;
  const {
    id,
    businessId,
    campaignId,
    channelId,
    title,
    status,
    mode,
    retryCount,
    ...rest
  } = variant;
  await prisma.tapCastChannelVariant.upsert({
    where: { id },
    create: {
      id,
      businessId,
      campaignId,
      channelId,
      title,
      status,
      mode,
      retryCount,
      scheduledAt: variant.scheduledAt ? new Date(variant.scheduledAt) : null,
      publishedAt: variant.publishedAt ? new Date(variant.publishedAt) : null,
      externalDraftId: variant.externalDraftId,
      externalPostId: variant.externalPostId,
      lastError: variant.lastError,
      tikTokCastId: variant.tikTokCastId,
      payload: asJson(rest),
    },
    update: {
      title,
      status,
      mode,
      retryCount,
      scheduledAt: variant.scheduledAt ? new Date(variant.scheduledAt) : null,
      publishedAt: variant.publishedAt ? new Date(variant.publishedAt) : null,
      externalDraftId: variant.externalDraftId,
      externalPostId: variant.externalPostId,
      lastError: variant.lastError,
      tikTokCastId: variant.tikTokCastId,
      payload: asJson(rest),
      updatedAt: new Date(),
    },
  });
}

export async function loadVariant(
  id: string,
  businessId: string
): Promise<CampaignChannelVariant | null> {
  if (!omnichannelPersistenceEnabled()) {
    const v = getVariant(id);
    return v && v.businessId === businessId ? v : null;
  }
  const row = await prisma.tapCastChannelVariant.findFirst({
    where: { id, businessId },
  });
  if (!row) return null;
  const variant = variantFromRow(row);
  upsertVariant(variant);
  return variant;
}

export async function listVariantsFromDb(
  businessId: string,
  opts?: { campaignId?: string; channelId?: string }
): Promise<CampaignChannelVariant[]> {
  if (!omnichannelPersistenceEnabled()) {
    return listVariants(businessId, opts);
  }
  const rows = await prisma.tapCastChannelVariant.findMany({
    where: {
      businessId,
      ...(opts?.campaignId ? { campaignId: opts.campaignId } : {}),
      ...(opts?.channelId ? { channelId: opts.channelId } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });
  const variants = rows.map(variantFromRow);
  for (const v of variants) upsertVariant(v);
  return variants;
}

export async function persistChannelConnection(conn: ChannelConnection): Promise<void> {
  setChannelConnection(conn);
  if (!omnichannelPersistenceEnabled()) return;
  await prisma.tapCastChannelConnection.upsert({
    where: {
      businessId_channelId: {
        businessId: conn.businessId,
        channelId: conn.channelId,
      },
    },
    create: {
      businessId: conn.businessId,
      channelId: conn.channelId,
      mode: conn.mode,
      health: conn.health,
      connectedAt: new Date(conn.connectedAt),
    },
    update: {
      mode: conn.mode,
      health: conn.health,
      updatedAt: new Date(),
    },
  });
}

export async function hydrateChannelConnections(
  businessId: string
): Promise<ChannelConnection[]> {
  if (!omnichannelPersistenceEnabled()) return listChannelConnections(businessId);
  const rows = await prisma.tapCastChannelConnection.findMany({
    where: { businessId },
  });
  for (const row of rows) {
    setChannelConnection({
      businessId: row.businessId,
      channelId: row.channelId,
      mode: row.mode as "mock" | "live",
      health: row.health as ChannelConnection["health"],
      connectedAt: row.connectedAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  }
  return listChannelConnections(businessId);
}

export async function persistOmnichannelAudit(entry: {
  businessId: string;
  channelId?: string;
  variantId?: string;
  action: string;
  detail?: Record<string, unknown>;
}) {
  const mem = appendOmnichannelAudit(entry);
  if (!omnichannelPersistenceEnabled()) return mem;
  await prisma.tapCastAuditLog.create({
    data: {
      id: mem.id,
      businessId: entry.businessId,
      channelId: entry.channelId,
      variantId: entry.variantId,
      action: entry.action,
      detail: asJson(entry.detail ?? {}),
      createdAt: new Date(mem.at),
    },
  });
  return mem;
}

export async function listOmnichannelAuditFromDb(businessId: string, limit = 40) {
  if (!omnichannelPersistenceEnabled()) return listOmnichannelAudit(businessId, limit);
  const rows = await prisma.tapCastAuditLog.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    businessId: r.businessId,
    channelId: r.channelId ?? undefined,
    variantId: r.variantId ?? undefined,
    action: r.action,
    detail: (r.detail ?? {}) as Record<string, unknown>,
    at: r.createdAt.toISOString(),
  }));
}

export { getChannelConnection };
