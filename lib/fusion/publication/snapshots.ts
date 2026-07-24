/**
 * Builder publication snapshots — immutable card/campaign versions for
 * save → publish → rollback using existing PublicationSnapshot rows.
 */

import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type PublicationSubjectType = "campaign" | "card";

export type CampaignPublishManifest = {
  kind: "campaign";
  title: string;
  status: string;
  contentBlocks: unknown;
  themeOverrides: unknown;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  endExperience?: unknown;
  formSettings?: unknown;
  label: string;
};

export type CardPublishManifest = {
  kind: "card";
  tapCard: unknown;
  label: string;
};

export type PublishManifest = CampaignPublishManifest | CardPublishManifest;

export type SnapshotRow = {
  id: string;
  subjectType: string;
  subjectId: string;
  version: number;
  schemaVersion: number;
  contentHash: string;
  publishedAt: Date;
  label: string;
  manifest: PublishManifest;
};

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

export function hashPublishManifest(manifest: PublishManifest): string {
  const { label, ...body } = manifest;
  void label;
  return createHash("sha256").update(stableStringify(body)).digest("hex").slice(0, 40);
}

function asManifest(raw: unknown): PublishManifest {
  const m = raw as PublishManifest;
  if (m?.kind === "campaign" || m?.kind === "card") return m;
  throw new Error("Invalid publication manifest");
}

function toRow(row: {
  id: string;
  subjectType: string;
  subjectId: string;
  version: number;
  schemaVersion: number;
  contentHash: string;
  publishedAt: Date;
  manifest: unknown;
}): SnapshotRow {
  const manifest = asManifest(row.manifest);
  return {
    id: row.id,
    subjectType: row.subjectType,
    subjectId: row.subjectId,
    version: row.version,
    schemaVersion: row.schemaVersion,
    contentHash: row.contentHash,
    publishedAt: row.publishedAt,
    label: manifest.label,
    manifest,
  };
}

export async function listPublicationSnapshots(params: {
  businessId: string;
  subjectType: PublicationSubjectType;
  subjectId: string;
  take?: number;
}): Promise<SnapshotRow[]> {
  const rows = await prisma.publicationSnapshot.findMany({
    where: {
      businessId: params.businessId,
      subjectType: params.subjectType,
      subjectId: params.subjectId,
    },
    orderBy: { version: "desc" },
    take: params.take ?? 25,
  });
  return rows.map(toRow);
}

export async function getPublicationSnapshot(params: {
  businessId: string;
  id: string;
}): Promise<SnapshotRow | null> {
  const row = await prisma.publicationSnapshot.findFirst({
    where: { id: params.id, businessId: params.businessId },
  });
  return row ? toRow(row) : null;
}

/**
 * Persist an immutable snapshot. Same content hash reuses the existing row
 * (unique on subjectType+subjectId+contentHash).
 */
export async function recordPublicationSnapshot(params: {
  businessId: string;
  subjectType: PublicationSubjectType;
  subjectId: string;
  manifest: PublishManifest;
  publishedById?: string | null;
  tapPointId?: string | null;
}): Promise<{ snapshot: SnapshotRow; created: boolean }> {
  const contentHash = hashPublishManifest(params.manifest);
  const existing = await prisma.publicationSnapshot.findUnique({
    where: {
      subjectType_subjectId_contentHash: {
        subjectType: params.subjectType,
        subjectId: params.subjectId,
        contentHash,
      },
    },
  });
  if (existing) {
    return { snapshot: toRow(existing), created: false };
  }

  const latest = await prisma.publicationSnapshot.findFirst({
    where: {
      subjectType: params.subjectType,
      subjectId: params.subjectId,
    },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (latest?.version ?? 0) + 1;

  try {
    const created = await prisma.publicationSnapshot.create({
      data: {
        businessId: params.businessId,
        subjectType: params.subjectType,
        subjectId: params.subjectId,
        version,
        schemaVersion: 1,
        manifest: params.manifest as unknown as Prisma.InputJsonValue,
        contentHash,
        publishedById: params.publishedById ?? undefined,
        tapPointId: params.tapPointId ?? undefined,
      },
    });
    return { snapshot: toRow(created), created: true };
  } catch (err) {
    // Race on unique hash — return winner
    const raced = await prisma.publicationSnapshot.findUnique({
      where: {
        subjectType_subjectId_contentHash: {
          subjectType: params.subjectType,
          subjectId: params.subjectId,
          contentHash,
        },
      },
    });
    if (raced) return { snapshot: toRow(raced), created: false };
    throw err;
  }
}

export async function snapshotCampaignBeforeUpdate(params: {
  businessId: string;
  campaign: {
    id: string;
    title: string;
    status: string;
    contentBlocks: unknown;
    themeOverrides: unknown;
    scheduledStart?: Date | null;
    scheduledEnd?: Date | null;
    endExperience?: unknown;
    formSettings?: unknown;
  };
  label: string;
  publishedById?: string | null;
}) {
  const manifest: CampaignPublishManifest = {
    kind: "campaign",
    title: params.campaign.title,
    status: params.campaign.status,
    contentBlocks: params.campaign.contentBlocks,
    themeOverrides: params.campaign.themeOverrides,
    scheduledStart: params.campaign.scheduledStart?.toISOString() ?? null,
    scheduledEnd: params.campaign.scheduledEnd?.toISOString() ?? null,
    endExperience: params.campaign.endExperience,
    formSettings: params.campaign.formSettings,
    label: params.label,
  };
  return recordPublicationSnapshot({
    businessId: params.businessId,
    subjectType: "campaign",
    subjectId: params.campaign.id,
    manifest,
    publishedById: params.publishedById,
  });
}

export async function snapshotCardBeforeUpdate(params: {
  businessId: string;
  brandKitId: string;
  tapCard: unknown;
  label: string;
  publishedById?: string | null;
}) {
  const manifest: CardPublishManifest = {
    kind: "card",
    tapCard: params.tapCard,
    label: params.label,
  };
  return recordPublicationSnapshot({
    businessId: params.businessId,
    subjectType: "card",
    subjectId: params.brandKitId,
    manifest,
    publishedById: params.publishedById,
  });
}

export async function restoreCampaignFromSnapshot(params: {
  businessId: string;
  campaignId: string;
  snapshotId: string;
  publishedById?: string | null;
}) {
  const snap = await getPublicationSnapshot({
    businessId: params.businessId,
    id: params.snapshotId,
  });
  if (!snap || snap.subjectType !== "campaign" || snap.subjectId !== params.campaignId) {
    throw new Error("Snapshot not found");
  }
  if (snap.manifest.kind !== "campaign") {
    throw new Error("Not a campaign snapshot");
  }

  const existing = await prisma.campaign.findFirst({
    where: { id: params.campaignId, businessId: params.businessId },
  });
  if (!existing) throw new Error("Campaign not found");

  // Checkpoint current state before overwrite
  await snapshotCampaignBeforeUpdate({
    businessId: params.businessId,
    campaign: existing,
    label: `pre-rollback-v${snap.version}`,
    publishedById: params.publishedById,
  });

  const m = snap.manifest;
  const campaign = await prisma.campaign.update({
    where: { id: params.campaignId },
    data: {
      title: m.title,
      contentBlocks: m.contentBlocks as Prisma.InputJsonValue,
      themeOverrides: m.themeOverrides as Prisma.InputJsonValue,
      ...(m.endExperience !== undefined
        ? { endExperience: m.endExperience as Prisma.InputJsonValue }
        : {}),
      ...(m.formSettings !== undefined
        ? { formSettings: m.formSettings as Prisma.InputJsonValue }
        : {}),
      scheduledStart: m.scheduledStart ? new Date(m.scheduledStart) : null,
      scheduledEnd: m.scheduledEnd ? new Date(m.scheduledEnd) : null,
      // Keep current LIVE/READY status if already public; otherwise restore snapshot status
      status:
        existing.status === "LIVE" || existing.status === "READY" || existing.status === "SCHEDULED"
          ? existing.status
          : (m.status as typeof existing.status),
    },
  });

  return { campaign, restoredFrom: snap };
}

export async function restoreCardFromSnapshot(params: {
  businessId: string;
  brandKitId: string;
  snapshotId: string;
  publishedById?: string | null;
}) {
  const snap = await getPublicationSnapshot({
    businessId: params.businessId,
    id: params.snapshotId,
  });
  if (!snap || snap.subjectType !== "card" || snap.subjectId !== params.brandKitId) {
    throw new Error("Snapshot not found");
  }
  if (snap.manifest.kind !== "card") {
    throw new Error("Not a card snapshot");
  }

  const existing = await prisma.brandKit.findFirst({
    where: { id: params.brandKitId, businessId: params.businessId },
  });
  if (!existing) throw new Error("Brand kit not found");

  await snapshotCardBeforeUpdate({
    businessId: params.businessId,
    brandKitId: existing.id,
    tapCard: existing.tapCard,
    label: `pre-rollback-v${snap.version}`,
    publishedById: params.publishedById,
  });

  const brandKit = await prisma.brandKit.update({
    where: { id: params.brandKitId },
    data: { tapCard: snap.manifest.tapCard as Prisma.InputJsonValue },
  });

  return { brandKit, restoredFrom: snap };
}
