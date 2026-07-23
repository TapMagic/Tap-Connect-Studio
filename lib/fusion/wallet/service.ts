/**
 * Wallet pass lifecycle service — mock adapter path is FUNCTIONAL without certs.
 * Real Apple/Google signing remains credential-blocked and honestly labeled.
 */

import type {
  FusionWalletPassStatus,
  FusionWalletPlatform,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/fusion/features";
import { createGovernedEvent, enqueueOutboxSync } from "@/lib/fusion/publication/events";
import { createMockWalletAdapter } from "./adapters";
import {
  canTransition,
  nextStatus,
  type WalletLifecycleAction,
  type WalletPassStatus,
} from "./lifecycle";
import {
  listWalletCredentialBlockers,
  projectCardToWalletPass,
  type WalletPlatform,
} from "./types";

export type WalletPassRecord = {
  id: string;
  businessId: string;
  contactId: string | null;
  relationshipId: string | null;
  platform: WalletPlatform;
  status: WalletPassStatus;
  serialNumber: string;
  version: number;
  cardId: string | null;
  externalId: string | null;
  installUrl: string | null;
  previewUrl: string | null;
  replacedById: string | null;
  mock: boolean;
  createdAt: string;
  updatedAt: string;
};

function toPlatformEnum(p: WalletPlatform): FusionWalletPlatform {
  return p === "apple" ? "APPLE" : "GOOGLE";
}

function fromPlatformEnum(p: FusionWalletPlatform): WalletPlatform {
  return p === "APPLE" ? "apple" : "google";
}

function mapPass(row: {
  id: string;
  businessId: string;
  contactId: string | null;
  relationshipId: string | null;
  platform: FusionWalletPlatform;
  status: FusionWalletPassStatus;
  serialNumber: string;
  version: number;
  cardId: string | null;
  externalId: string | null;
  installUrl: string | null;
  previewUrl: string | null;
  replacedById: string | null;
  mock: boolean;
  createdAt: Date;
  updatedAt: Date;
}): WalletPassRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    contactId: row.contactId,
    relationshipId: row.relationshipId,
    platform: fromPlatformEnum(row.platform),
    status: row.status as WalletPassStatus,
    serialNumber: row.serialNumber,
    version: row.version,
    cardId: row.cardId,
    externalId: row.externalId,
    installUrl: row.installUrl,
    previewUrl: row.previewUrl,
    replacedById: row.replacedById,
    mock: row.mock,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function recordEvent(params: {
  passId: string;
  businessId: string;
  action: string;
  fromStatus?: string | null;
  toStatus: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.walletPassEvent.create({
    data: {
      passId: params.passId,
      businessId: params.businessId,
      action: params.action,
      fromStatus: params.fromStatus ?? undefined,
      toStatus: params.toStatus,
      actorId: params.actorId,
      metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
}

function requireFeature(featureEnabled?: boolean) {
  const enabled =
    featureEnabled ?? isFeatureEnabled("wallet.apple_google", {});
  if (!enabled) {
    return {
      ok: false as const,
      code: "feature_off" as const,
      error: "wallet.apple_google feature is disabled",
    };
  }
  return { ok: true as const };
}

export async function createPassDraft(input: {
  businessId: string;
  platform: WalletPlatform;
  businessName: string;
  cardTitle: string;
  tapUrl: string;
  logoUrl?: string;
  contactId?: string;
  relationshipId?: string;
  cardId?: string;
  actorId?: string;
  featureEnabled?: boolean;
}): Promise<
  | { ok: true; pass: WalletPassRecord }
  | { ok: false; code: "feature_off" | "error"; error: string }
> {
  const gate = requireFeature(input.featureEnabled);
  if (!gate.ok) return gate;

  const projection = projectCardToWalletPass({
    platform: input.platform,
    businessName: input.businessName,
    cardTitle: input.cardTitle,
    tapUrl: input.tapUrl,
    logoUrl: input.logoUrl,
  });

  const blockers = listWalletCredentialBlockers();
  const mock =
    input.platform === "apple"
      ? blockers.apple.length > 0
      : blockers.google.length > 0;

  try {
    const row = await prisma.walletPass.create({
      data: {
        businessId: input.businessId,
        contactId: input.contactId,
        relationshipId: input.relationshipId,
        platform: toPlatformEnum(input.platform),
        status: "DRAFT",
        serialNumber: projection.serialNumber,
        cardId: input.cardId,
        projection: projection as unknown as Prisma.InputJsonValue,
        mock,
      },
    });
    await recordEvent({
      passId: row.id,
      businessId: input.businessId,
      action: "create",
      toStatus: "DRAFT",
      actorId: input.actorId,
    });
    return { ok: true, pass: mapPass(row) };
  } catch (err) {
    return {
      ok: false,
      code: "error",
      error: err instanceof Error ? err.message : "Failed to create draft",
    };
  }
}

export async function previewPass(input: {
  passId: string;
  businessId: string;
  actorId?: string;
  featureEnabled?: boolean;
}): Promise<
  | { ok: true; pass: WalletPassRecord; previewUrl: string }
  | { ok: false; code: "feature_off" | "not_found" | "invalid_transition" | "error"; error: string }
> {
  const gate = requireFeature(input.featureEnabled);
  if (!gate.ok) return gate;

  const existing = await prisma.walletPass.findFirst({
    where: { id: input.passId, businessId: input.businessId },
  });
  if (!existing) return { ok: false, code: "not_found", error: "Pass not found" };

  const transition = nextStatus(existing.status as WalletPassStatus, "preview");
  if (!transition.ok) return { ok: false, code: "invalid_transition", error: transition.error };

  const adapter = createMockWalletAdapter(fromPlatformEnum(existing.platform));
  const preview = await adapter.preview({
    cardId: existing.cardId ?? existing.id,
    businessId: existing.businessId,
    provider: fromPlatformEnum(existing.platform),
    serial: existing.serialNumber,
    version: existing.version,
    branding: {},
    fields: [],
    deepLinkUrl: existing.installUrl ?? "",
    status: "draft",
  });

  const previewUrl =
    preview.ok && preview.previewUrl
      ? preview.previewUrl
      : `/dashboard/audience/wallet?preview=${existing.serialNumber}`;

  const row = await prisma.walletPass.update({
    where: { id: existing.id },
    data: {
      status: transition.status as FusionWalletPassStatus,
      previewUrl,
    },
  });
  await recordEvent({
    passId: row.id,
    businessId: input.businessId,
    action: "preview",
    fromStatus: existing.status,
    toStatus: transition.status,
    actorId: input.actorId,
  });

  return { ok: true, pass: mapPass(row), previewUrl };
}

export async function issuePass(input: {
  passId: string;
  businessId: string;
  actorId?: string;
  featureEnabled?: boolean;
}): Promise<
  | { ok: true; pass: WalletPassRecord; mock: boolean }
  | { ok: false; code: "feature_off" | "not_found" | "invalid_transition" | "error"; error: string }
> {
  const gate = requireFeature(input.featureEnabled);
  if (!gate.ok) return gate;

  const existing = await prisma.walletPass.findFirst({
    where: { id: input.passId, businessId: input.businessId },
  });
  if (!existing) return { ok: false, code: "not_found", error: "Pass not found" };

  const transition = nextStatus(existing.status as WalletPassStatus, "issue");
  if (!transition.ok) return { ok: false, code: "invalid_transition", error: transition.error };

  const platform = fromPlatformEnum(existing.platform);
  const adapter = createMockWalletAdapter(platform);
  const issued = await adapter.issue({
    cardId: existing.cardId ?? existing.id,
    businessId: existing.businessId,
    provider: platform,
    serial: existing.serialNumber,
    version: existing.version,
    branding: {},
    fields: [],
    deepLinkUrl: "",
    status: "draft",
  });

  const mock = !issued.ok || existing.mock;
  const externalId = issued.ok
    ? issued.externalId
    : `mock_${platform}_${existing.serialNumber}`;
  const installUrl = mock
    ? `/dashboard/audience/wallet?mock_install=${existing.serialNumber}`
    : `/api/wallet/${platform}/install?serial=${existing.serialNumber}`;

  const row = await prisma.walletPass.update({
    where: { id: existing.id },
    data: {
      status: transition.status as FusionWalletPassStatus,
      externalId,
      installUrl,
      mock,
    },
  });

  await recordEvent({
    passId: row.id,
    businessId: input.businessId,
    action: "issue",
    fromStatus: existing.status,
    toStatus: transition.status,
    actorId: input.actorId,
    metadata: { mock, externalId },
  });

  enqueueOutboxSync(
    "wallet.issued",
    createGovernedEvent({
      name: "wallet.pass.issued",
      businessId: input.businessId,
      aggregateType: "wallet_pass",
      aggregateId: row.id,
      correlationId: crypto.randomUUID(),
      payload: { serialNumber: row.serialNumber, platform, mock },
    })
  );

  return { ok: true, pass: mapPass(row), mock };
}

export async function updatePass(input: {
  passId: string;
  businessId: string;
  fields?: Record<string, string>;
  actorId?: string;
  featureEnabled?: boolean;
}): Promise<
  | { ok: true; pass: WalletPassRecord }
  | { ok: false; code: "feature_off" | "not_found" | "invalid_transition" | "error"; error: string }
> {
  const gate = requireFeature(input.featureEnabled);
  if (!gate.ok) return gate;

  const existing = await prisma.walletPass.findFirst({
    where: { id: input.passId, businessId: input.businessId },
  });
  if (!existing) return { ok: false, code: "not_found", error: "Pass not found" };

  const transition = nextStatus(existing.status as WalletPassStatus, "update");
  if (!transition.ok) return { ok: false, code: "invalid_transition", error: transition.error };

  const projection =
    typeof existing.projection === "object" && existing.projection
      ? { ...(existing.projection as Record<string, unknown>), ...(input.fields ?? {}) }
      : (input.fields ?? {});

  const row = await prisma.walletPass.update({
    where: { id: existing.id },
    data: {
      status: transition.status as FusionWalletPassStatus,
      version: existing.version + 1,
      projection: projection as Prisma.InputJsonValue,
    },
  });

  await recordEvent({
    passId: row.id,
    businessId: input.businessId,
    action: "update",
    fromStatus: existing.status,
    toStatus: transition.status,
    actorId: input.actorId,
  });

  return { ok: true, pass: mapPass(row) };
}

export async function revokePass(input: {
  passId: string;
  businessId: string;
  actorId?: string;
  featureEnabled?: boolean;
}): Promise<
  | { ok: true; pass: WalletPassRecord }
  | { ok: false; code: "feature_off" | "not_found" | "invalid_transition" | "error"; error: string }
> {
  const gate = requireFeature(input.featureEnabled);
  if (!gate.ok) return gate;

  const existing = await prisma.walletPass.findFirst({
    where: { id: input.passId, businessId: input.businessId },
  });
  if (!existing) return { ok: false, code: "not_found", error: "Pass not found" };

  const transition = nextStatus(existing.status as WalletPassStatus, "revoke");
  if (!transition.ok) return { ok: false, code: "invalid_transition", error: transition.error };

  const row = await prisma.walletPass.update({
    where: { id: existing.id },
    data: { status: transition.status as FusionWalletPassStatus },
  });

  await recordEvent({
    passId: row.id,
    businessId: input.businessId,
    action: "revoke",
    fromStatus: existing.status,
    toStatus: transition.status,
    actorId: input.actorId,
  });

  enqueueOutboxSync(
    "wallet.revoked",
    createGovernedEvent({
      name: "wallet.pass.revoked",
      businessId: input.businessId,
      aggregateType: "wallet_pass",
      aggregateId: row.id,
      correlationId: crypto.randomUUID(),
      payload: { serialNumber: row.serialNumber },
    })
  );

  return { ok: true, pass: mapPass(row) };
}

export async function replacePass(input: {
  passId: string;
  businessId: string;
  actorId?: string;
  featureEnabled?: boolean;
}): Promise<
  | { ok: true; oldPass: WalletPassRecord; newPass: WalletPassRecord }
  | { ok: false; code: "feature_off" | "not_found" | "invalid_transition" | "error"; error: string }
> {
  const gate = requireFeature(input.featureEnabled);
  if (!gate.ok) return gate;

  const existing = await prisma.walletPass.findFirst({
    where: { id: input.passId, businessId: input.businessId },
  });
  if (!existing) return { ok: false, code: "not_found", error: "Pass not found" };

  if (!canTransition(existing.status as WalletPassStatus, "replace")) {
    return {
      ok: false,
      code: "invalid_transition",
      error: `Cannot replace pass in status ${existing.status}`,
    };
  }

  const platform = fromPlatformEnum(existing.platform);
  const draft = await createPassDraft({
    businessId: input.businessId,
    platform,
    businessName: "Tap Connect",
    cardTitle: "Replacement pass",
    tapUrl: existing.installUrl ?? "https://tapconnect.app",
    contactId: existing.contactId ?? undefined,
    relationshipId: existing.relationshipId ?? undefined,
    cardId: existing.cardId ?? undefined,
    actorId: input.actorId,
    featureEnabled: true,
  });
  if (!draft.ok) return draft;

  const oldRow = await prisma.walletPass.update({
    where: { id: existing.id },
    data: {
      status: "REPLACED",
      replacedById: draft.pass.id,
    },
  });

  await recordEvent({
    passId: oldRow.id,
    businessId: input.businessId,
    action: "replace",
    fromStatus: existing.status,
    toStatus: "REPLACED",
    actorId: input.actorId,
    metadata: { replacedById: draft.pass.id },
  });

  return { ok: true, oldPass: mapPass(oldRow), newPass: draft.pass };
}

export async function getPassStatus(input: {
  passId: string;
  businessId: string;
}): Promise<WalletPassRecord | null> {
  const row = await prisma.walletPass.findFirst({
    where: { id: input.passId, businessId: input.businessId },
  });
  return row ? mapPass(row) : null;
}

export async function listPassesForRelationship(input: {
  businessId: string;
  relationshipId?: string;
  contactId?: string;
  limit?: number;
}): Promise<WalletPassRecord[]> {
  const rows = await prisma.walletPass.findMany({
    where: {
      businessId: input.businessId,
      ...(input.relationshipId ? { relationshipId: input.relationshipId } : {}),
      ...(input.contactId ? { contactId: input.contactId } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: input.limit ?? 50,
  });
  return rows.map(mapPass);
}

export async function listPassesForBusiness(
  businessId: string,
  limit = 50
): Promise<WalletPassRecord[]> {
  const rows = await prisma.walletPass.findMany({
    where: { businessId },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
  return rows.map(mapPass);
}

export function walletActionAllowed(
  status: WalletPassStatus,
  action: WalletLifecycleAction
): boolean {
  return canTransition(status, action);
}
