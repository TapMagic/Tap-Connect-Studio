/**
 * TapSave service — Keep Card, preferences, moments.
 * Persists via Prisma when isolated fusion DB is configured; otherwise memory fallback for moments.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isIsolatedFusionDatabaseConfigured } from "@/lib/fusion/db/safety";
import { createGovernedEvent, enqueueOutbox } from "@/lib/fusion/publication/events";
import { upsertContact } from "@/lib/fusion/audience/contacts";
import {
  ensureCustomerRelationship,
  findRelationshipByPublicToken,
} from "@/lib/fusion/audience/relationships";
import { recordConsent, getLatestConsentForContact } from "@/lib/fusion/audience/consent";
import { isFeatureEnabled, type FeatureOverride } from "@/lib/fusion/features/resolve";
import {
  createMoment,
  defaultTapSavePreferences,
  parseTapSavePreferences,
  type TapSaveMoment,
  type TapSaveMomentKind,
  type TapSavePreference,
} from "./moments";

export type KeepCardInput = {
  businessId: string;
  email: string;
  name?: string;
  phone?: string;
  campaignId?: string;
  deviceSlotId?: string;
  visitorRef?: string;
  consentGiven?: boolean;
  overrides?: FeatureOverride[];
};

export type KeepCardResult =
  | {
      ok: true;
      publicToken: string;
      relationshipId: string;
      contactId: string;
      myTapUrl: string;
      moment: TapSaveMoment;
      firstSave: boolean;
    }
  | { ok: false; code: "feature_disabled" | "invalid_email" | "persist_failed"; message: string };

export type TapSaveStatus = {
  publicToken: string;
  tapSaveEnabled: boolean;
  preferences: TapSavePreference;
  moments: TapSaveMoment[];
  reopenCardUrl: string | null;
  businessName: string;
};

type MemoryStore = {
  moments: TapSaveMoment[];
  prefs: Map<string, TapSavePreference>;
};

const memory: MemoryStore = {
  moments: [],
  prefs: new Map(),
};

function correlationId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `ts_${Date.now().toString(36)}`;
}

function asMetaObject(metadata: unknown): Record<string, unknown> {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }
  return {};
}

function prefsFromMetadata(metadata: unknown): TapSavePreference {
  const meta = asMetaObject(metadata);
  return parseTapSavePreferences(meta.tapsavePreferences ?? defaultTapSavePreferences());
}

async function writeMomentRow(input: {
  businessId: string;
  relationshipId: string;
  visitorRef?: string;
  kind: TapSaveMomentKind;
  campaignId?: string;
  deviceSlotId?: string;
  metadata?: Record<string, unknown>;
}): Promise<TapSaveMoment> {
  const moment = createMoment({
    businessId: input.businessId,
    relationshipId: input.relationshipId,
    visitorRef: input.visitorRef ?? input.relationshipId,
    kind: input.kind,
    campaignId: input.campaignId,
    deviceSlotId: input.deviceSlotId,
    metadata: input.metadata,
  });

  if (isIsolatedFusionDatabaseConfigured()) {
    try {
      const row = await prisma.tapSaveMoment.create({
        data: {
          id: moment.id,
          businessId: input.businessId,
          relationshipId: input.relationshipId,
          visitorRef: input.visitorRef,
          kind: input.kind,
          campaignId: input.campaignId,
          deviceSlotId: input.deviceSlotId,
          metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
          occurredAt: new Date(moment.occurredAt),
        },
      });
      return {
        id: row.id,
        businessId: row.businessId,
        relationshipId: row.relationshipId,
        visitorRef: row.visitorRef ?? row.relationshipId,
        kind: row.kind as TapSaveMomentKind,
        occurredAt: row.occurredAt.toISOString(),
        campaignId: row.campaignId ?? undefined,
        deviceSlotId: row.deviceSlotId ?? undefined,
        metadata: asMetaObject(row.metadata),
      };
    } catch (err) {
      console.warn("[tapsave] moment persist failed; using memory", err);
    }
  }

  memory.moments.unshift(moment);
  return moment;
}

/**
 * Keep Card — create/update Contact + CustomerRelationship, enable TapSave, record moment.
 */
export async function keepCard(input: KeepCardInput): Promise<KeepCardResult> {
  if (!isFeatureEnabled("tapsave.core", { overrides: input.overrides })) {
    return {
      ok: false,
      code: "feature_disabled",
      message: "TapSave is not enabled for this workspace.",
    };
  }

  const email = input.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { ok: false, code: "invalid_email", message: "A valid email is required to Keep Card." };
  }

  try {
    const contact = await upsertContact({
      businessId: input.businessId,
      email,
      name: input.name,
      phone: input.phone,
      metadata: { source: "tapsave.keep" },
    });

    const relationship = await ensureCustomerRelationship({
      businessId: input.businessId,
      contactId: contact.id,
      sourceType: "tapsave",
    });

    const firstSave = !relationship.tapSaveEnabled;
    const existingRow = await prisma.customerRelationship.findUnique({
      where: { id: relationship.id },
      select: { metadata: true },
    });
    const existingMeta = asMetaObject(existingRow?.metadata);

    await prisma.customerRelationship.update({
      where: { id: relationship.id },
      data: {
        tapSaveEnabled: true,
        status: "ACTIVE",
        sourceType: relationship.sourceType ?? "tapsave",
        metadata: {
          ...existingMeta,
          lastKeepAt: new Date().toISOString(),
          lastCampaignId: input.campaignId ?? null,
          lastDeviceSlotId: input.deviceSlotId ?? null,
        } as Prisma.InputJsonValue,
      },
    });

    if (input.consentGiven) {
      await recordConsent({
        businessId: input.businessId,
        contactId: contact.id,
        channel: "EMAIL",
        status: "GRANTED",
        legalBasis: "consent",
        sourceType: "tapsave_keep",
        sourceId: relationship.id,
      });
    }

    const kind: TapSaveMomentKind = firstSave ? "first_save" : "return_visit";
    const moment = await writeMomentRow({
      businessId: input.businessId,
      relationshipId: relationship.id,
      visitorRef: input.visitorRef ?? email,
      kind,
      campaignId: input.campaignId,
      deviceSlotId: input.deviceSlotId,
      metadata: { domain: email.split("@")[1] },
    });

    const corr = correlationId();
    try {
      await prisma.platformAuditEvent.create({
        data: {
          businessId: input.businessId,
          actorType: "PUBLIC",
          action: firstSave ? "tapsave.keep" : "tapsave.return",
          resourceType: "customer_relationship",
          resourceId: relationship.id,
          correlationId: corr,
          metadata: { kind, campaignId: input.campaignId ?? null },
        },
      });
    } catch {
      // audit optional when spine tables missing
    }

    await enqueueOutbox(
      "tapsave.keep",
      createGovernedEvent({
        name: firstSave ? "tapsave.kept" : "tapsave.returned",
        businessId: input.businessId,
        aggregateType: "customer_relationship",
        aggregateId: relationship.id,
        correlationId: corr,
        payload: {
          publicToken: relationship.publicToken,
          momentId: moment.id,
          kind,
        },
      })
    );

    return {
      ok: true,
      publicToken: relationship.publicToken,
      relationshipId: relationship.id,
      contactId: contact.id,
      myTapUrl: `/mytap/${relationship.publicToken}`,
      moment,
      firstSave,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to keep card";
    return { ok: false, code: "persist_failed", message };
  }
}

export type UpdatePreferencesInput = {
  publicToken: string;
  preferences: Partial<TapSavePreference>;
  overrides?: FeatureOverride[];
};

export async function updateTapSavePreferences(
  input: UpdatePreferencesInput
): Promise<
  | { ok: true; preferences: TapSavePreference; moment: TapSaveMoment }
  | { ok: false; code: "feature_disabled" | "not_found" | "persist_failed"; message: string }
> {
  if (!isFeatureEnabled("tapsave.core", { overrides: input.overrides })) {
    return {
      ok: false,
      code: "feature_disabled",
      message: "TapSave is not enabled.",
    };
  }

  const relationship = await findRelationshipByPublicToken(input.publicToken);
  if (!relationship) {
    return { ok: false, code: "not_found", message: "Saved relationship not found." };
  }

  try {
    const current = prefsFromMetadata(relationship.metadata);
    const next: TapSavePreference = {
      ...current,
      ...input.preferences,
    };

    const existingMeta = asMetaObject(relationship.metadata);
    await prisma.customerRelationship.update({
      where: { id: relationship.id },
      data: {
        metadata: {
          ...existingMeta,
          tapsavePreferences: next,
        } as Prisma.InputJsonValue,
      },
    });

    memory.prefs.set(input.publicToken, next);

    const channelMap: Array<{
      key: keyof Pick<TapSavePreference, "emailOptIn" | "smsOptIn" | "walletOptIn">;
      channel: "EMAIL" | "SMS" | "WALLET";
    }> = [
      { key: "emailOptIn", channel: "EMAIL" },
      { key: "smsOptIn", channel: "SMS" },
      { key: "walletOptIn", channel: "WALLET" },
    ];
    for (const { key, channel } of channelMap) {
      if (input.preferences[key] === undefined) continue;
      await recordConsent({
        businessId: relationship.businessId,
        contactId: relationship.contactId,
        channel,
        status: next[key] ? "GRANTED" : "WITHDRAWN",
        legalBasis: "consent",
        sourceType: "tapsave_preferences",
        sourceId: relationship.id,
      });
    }

    const moment = await writeMomentRow({
      businessId: relationship.businessId,
      relationshipId: relationship.id,
      visitorRef: relationship.publicToken,
      kind: "preference_update",
      metadata: { preferences: next },
    });

    const corr = correlationId();
    try {
      await prisma.platformAuditEvent.create({
        data: {
          businessId: relationship.businessId,
          actorType: "PUBLIC",
          action: "tapsave.preferences",
          resourceType: "customer_relationship",
          resourceId: relationship.id,
          correlationId: corr,
          metadata: next as unknown as Prisma.InputJsonValue,
        },
      });
    } catch {
      // optional
    }

    await enqueueOutbox(
      "tapsave.preferences",
      createGovernedEvent({
        name: "tapsave.preferences_updated",
        businessId: relationship.businessId,
        aggregateType: "customer_relationship",
        aggregateId: relationship.id,
        correlationId: corr,
        payload: { preferences: next, momentId: moment.id },
      })
    );

    return { ok: true, preferences: next, moment };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update preferences";
    return { ok: false, code: "persist_failed", message };
  }
}

export async function listMomentsForRelationship(
  relationshipId: string,
  limit = 50
): Promise<TapSaveMoment[]> {
  if (isIsolatedFusionDatabaseConfigured()) {
    try {
      const rows = await prisma.tapSaveMoment.findMany({
        where: { relationshipId },
        orderBy: { occurredAt: "desc" },
        take: limit,
      });
      return rows.map((row) => ({
        id: row.id,
        businessId: row.businessId,
        relationshipId: row.relationshipId,
        visitorRef: row.visitorRef ?? row.relationshipId,
        kind: row.kind as TapSaveMomentKind,
        occurredAt: row.occurredAt.toISOString(),
        campaignId: row.campaignId ?? undefined,
        deviceSlotId: row.deviceSlotId ?? undefined,
        metadata: asMetaObject(row.metadata),
      }));
    } catch (err) {
      console.warn("[tapsave] list moments failed", err);
    }
  }
  return memory.moments.filter((m) => m.relationshipId === relationshipId).slice(0, limit);
}

export async function getTapSaveStatus(publicToken: string): Promise<TapSaveStatus | null> {
  const relationship = await findRelationshipByPublicToken(publicToken);
  if (!relationship) return null;

  let preferences =
    memory.prefs.get(publicToken) ?? prefsFromMetadata(relationship.metadata);

  try {
    const [email, sms, wallet] = await Promise.all([
      getLatestConsentForContact(relationship.contactId, "EMAIL"),
      getLatestConsentForContact(relationship.contactId, "SMS"),
      getLatestConsentForContact(relationship.contactId, "WALLET"),
    ]);
    if (email) preferences = { ...preferences, emailOptIn: email.status === "GRANTED" };
    if (sms) preferences = { ...preferences, smsOptIn: sms.status === "GRANTED" };
    if (wallet) preferences = { ...preferences, walletOptIn: wallet.status === "GRANTED" };
  } catch {
    // consent tables may be unavailable
  }

  const moments = await listMomentsForRelationship(relationship.id);
  const meta = asMetaObject(relationship.metadata);
  const deviceSlotId = typeof meta.lastDeviceSlotId === "string" ? meta.lastDeviceSlotId : null;

  let reopenCardUrl: string | null = null;
  if (deviceSlotId) {
    try {
      const slot = await prisma.deviceSlot.findUnique({
        where: { id: deviceSlotId },
        select: { deviceCode: true },
      });
      if (slot) reopenCardUrl = `/t/${slot.deviceCode}?public=1`;
    } catch {
      // optional
    }
  }

  return {
    publicToken: relationship.publicToken,
    tapSaveEnabled: relationship.tapSaveEnabled,
    preferences,
    moments,
    reopenCardUrl,
    businessName: relationship.business.name,
  };
}

export function resetTapSaveMemory() {
  memory.moments.length = 0;
  memory.prefs.clear();
}
