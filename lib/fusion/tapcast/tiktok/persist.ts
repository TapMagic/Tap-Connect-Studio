/**
 * Prisma persistence for TikTok TapCast — isolated fusion DB authoritative.
 */

import { prisma } from "@/lib/db";
import { isIsolatedFusionDatabaseConfigured } from "@/lib/fusion/db/safety";
import type { Prisma } from "@prisma/client";
import type { TikTokCast } from "./types";
import {
  appendTikTokAudit,
  getCast,
  getTikTokConnection,
  listCasts,
  listTikTokAudit,
  setTikTokConnection,
  upsertCast,
} from "./store";

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export function tikTokPersistenceEnabled(): boolean {
  return isIsolatedFusionDatabaseConfigured();
}

function castFromRow(row: {
  id: string;
  businessId: string;
  title: string;
  status: string;
  payload: unknown;
  campaignId: string | null;
  cardId: string | null;
  tapPointId: string | null;
  scheduledAt: Date | null;
  publishedAt: Date | null;
  externalDraftId: string | null;
  externalPostId: string | null;
  lastError: string | null;
  retryCount: number;
  mode: string;
  createdAt: Date;
  updatedAt: Date;
}): TikTokCast {
  const payload = (row.payload ?? {}) as Partial<TikTokCast>;
  return {
    id: row.id,
    businessId: row.businessId,
    title: row.title,
    script: payload.script ?? "",
    caption: payload.caption ?? "",
    hashtags: payload.hashtags ?? [],
    coverNote: payload.coverNote,
    storyboard: payload.storyboard ?? [],
    composition: payload.composition ?? {
      aspectRatio: "9:16",
      width: 1080,
      height: 1920,
    },
    status: row.status as TikTokCast["status"],
    campaignId: row.campaignId ?? undefined,
    cardId: row.cardId ?? undefined,
    tapPointId: row.tapPointId ?? undefined,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    externalDraftId: row.externalDraftId ?? undefined,
    externalPostId: row.externalPostId ?? undefined,
    lastError: row.lastError ?? undefined,
    retryCount: row.retryCount,
    mode: row.mode as "mock" | "live",
    funnel: payload.funnel,
    analytics: payload.analytics,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function persistTikTokCast(cast: TikTokCast): Promise<void> {
  upsertCast(cast);
  if (!tikTokPersistenceEnabled()) return;
  const { id, businessId, title, status, mode, retryCount, ...rest } = cast;
  await prisma.tikTokCast.upsert({
    where: { id },
    create: {
      id,
      businessId,
      title,
      status,
      mode,
      retryCount,
      campaignId: cast.campaignId,
      cardId: cast.cardId,
      tapPointId: cast.tapPointId,
      scheduledAt: cast.scheduledAt ? new Date(cast.scheduledAt) : null,
      publishedAt: cast.publishedAt ? new Date(cast.publishedAt) : null,
      externalDraftId: cast.externalDraftId,
      externalPostId: cast.externalPostId,
      lastError: cast.lastError,
      payload: asJson(rest),
    },
    update: {
      title,
      status,
      mode,
      retryCount,
      campaignId: cast.campaignId,
      cardId: cast.cardId,
      tapPointId: cast.tapPointId,
      scheduledAt: cast.scheduledAt ? new Date(cast.scheduledAt) : null,
      publishedAt: cast.publishedAt ? new Date(cast.publishedAt) : null,
      externalDraftId: cast.externalDraftId,
      externalPostId: cast.externalPostId,
      lastError: cast.lastError,
      payload: asJson(rest),
      updatedAt: new Date(),
    },
  });
}

export async function loadTikTokCast(
  id: string,
  businessId: string
): Promise<TikTokCast | null> {
  if (!tikTokPersistenceEnabled()) {
    const c = getCast(id);
    return c && c.businessId === businessId ? c : null;
  }
  const row = await prisma.tikTokCast.findFirst({ where: { id, businessId } });
  if (!row) return null;
  const cast = castFromRow(row);
  upsertCast(cast);
  return cast;
}

export async function listTikTokCastsFromDb(businessId: string): Promise<TikTokCast[]> {
  if (!tikTokPersistenceEnabled()) return listCasts(businessId);
  const rows = await prisma.tikTokCast.findMany({
    where: { businessId },
    orderBy: { updatedAt: "desc" },
  });
  const casts = rows.map(castFromRow);
  for (const c of casts) upsertCast(c);
  return casts;
}

export async function persistTikTokConnection(
  businessId: string,
  mode: "mock" | "live",
  capabilities: string[] = []
): Promise<void> {
  setTikTokConnection(businessId, mode);
  if (!tikTokPersistenceEnabled()) return;
  await prisma.tikTokConnection.upsert({
    where: { businessId },
    create: { businessId, mode, capabilities: asJson(capabilities) },
    update: { mode, capabilities: asJson(capabilities), updatedAt: new Date() },
  });
}

export async function hydrateTikTokConnection(businessId: string) {
  if (!tikTokPersistenceEnabled()) return getTikTokConnection(businessId);
  const row = await prisma.tikTokConnection.findUnique({ where: { businessId } });
  if (!row) return null;
  setTikTokConnection(businessId, row.mode as "mock" | "live");
  return getTikTokConnection(businessId);
}

export async function persistTikTokAudit(entry: {
  businessId: string;
  castId?: string;
  action: string;
  detail?: Record<string, unknown>;
}) {
  const mem = appendTikTokAudit(entry);
  if (!tikTokPersistenceEnabled()) return mem;
  await prisma.tikTokAuditLog.create({
    data: {
      id: mem.id,
      businessId: entry.businessId,
      castId: entry.castId,
      action: entry.action,
      detail: asJson(entry.detail ?? {}),
      createdAt: new Date(mem.at),
    },
  });
  return mem;
}

export async function listTikTokAuditFromDb(businessId: string, limit = 40) {
  if (!tikTokPersistenceEnabled()) return listTikTokAudit(businessId, limit);
  const rows = await prisma.tikTokAuditLog.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    businessId: r.businessId,
    castId: r.castId ?? undefined,
    action: r.action,
    detail: (r.detail ?? {}) as Record<string, unknown>,
    at: r.createdAt.toISOString(),
  }));
}
