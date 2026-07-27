/**
 * Prisma-backed Email & Replies store — durable runtime SoT.
 */

import type {
  Prisma,
  ReplyDestination as PrismaDestination,
  ReplyPolicy as PrismaPolicy,
  ReplyAlias as PrismaAlias,
  ReplyInitialMessage as PrismaInitial,
  ReplyRoutingAttempt as PrismaAttempt,
  ReplyProviderEvent as PrismaEvent,
  ReplyVerificationToken as PrismaToken,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { capabilitiesForDestinationType } from "./capabilities";
import { normalizeEmailAddress, parseMessageCategories } from "./destination";
import type { ReplyEvidenceRecord } from "./evidence";
import {
  createAliasExpiry,
  generateOpaqueReplyToken,
  hashReplyToken,
  type ReplyAliasContext,
} from "./reply-alias";
import type {
  EmailRepliesStore,
  SaveInitialReplyInput,
  SetPolicyInput,
  StoredAlias,
  StoredInitialReply,
  StoredProviderEvent,
  StoredRoutingAttempt,
  UpsertDestinationInput,
} from "./store";
import type {
  ReplyDestinationRecord,
  ReplyDestinationType,
  ReplyEvidenceKind,
  ReplyHandlingMode,
  ReplyPolicyRecord,
  ReplyRoutingState,
  ReplyVerificationStatus,
} from "./types";
import {
  generateVerificationToken,
  hashToken,
  type VerificationTokenRecord,
} from "./verification";

function mapDestination(row: PrismaDestination): ReplyDestinationRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    locationId: row.locationId,
    name: row.name,
    destinationType: row.destinationType as ReplyDestinationType,
    destinationReference: row.destinationReference,
    normalizedAddress: row.normalizedAddress,
    verificationStatus: row.verificationStatus as ReplyVerificationStatus,
    enabled: row.enabled,
    role: row.role as "PRIMARY" | "FALLBACK",
    selectedCategories: parseMessageCategories(row.selectedCategories),
    keepCopyInTap: row.keepCopyInTap,
    failureNotificationAddress: row.failureNotificationAddress,
    capabilities: Array.isArray(row.capabilities)
      ? (row.capabilities as ReplyDestinationRecord["capabilities"])
      : capabilitiesForDestinationType(row.destinationType as ReplyDestinationType),
    credentialRef: row.credentialRef,
    lastTestedAt: row.lastTestedAt?.toISOString() ?? null,
    lastTestResult: row.lastTestResult,
    lastSuccessfulRouteAt: row.lastSuccessfulRouteAt?.toISOString() ?? null,
    lastFailureAt: row.lastFailureAt?.toISOString() ?? null,
    consecutiveFailureCount: row.consecutiveFailureCount,
    paused: row.paused,
    pausedReason: row.pausedReason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapPolicy(row: PrismaPolicy): ReplyPolicyRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    locationId: row.locationId,
    mode: row.mode as ReplyHandlingMode,
    primaryDestinationId: row.primaryDestinationId,
    fallbackDestinationId: row.fallbackDestinationId,
    keepCopyInTap: row.keepCopyInTap,
    notifyOnFailure: row.notifyOnFailure,
    failureNotificationAddress: row.failureNotificationAddress,
    useTapInboxFallback: row.useTapInboxFallback,
    activated: row.activated,
    activatedAt: row.activatedAt?.toISOString() ?? null,
    skipTestAcknowledged: row.skipTestAcknowledged,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapAlias(row: PrismaAlias): StoredAlias {
  return {
    id: row.id,
    token: row.token,
    tokenHash: row.tokenHash,
    businessId: row.businessId,
    campaignId: row.campaignId,
    contactId: row.contactId,
    relationshipId: row.relationshipId,
    originatingMessageRef: row.originatingMessageRef,
    emailDocumentVersion: row.emailDocumentVersion,
    replyPolicyMode: row.replyPolicyMode as ReplyHandlingMode | null,
    destinationId: row.destinationId,
    expiresAt: row.expiresAt.toISOString(),
    deactivatedAt: row.deactivatedAt?.toISOString() ?? null,
  };
}

function mapToken(row: PrismaToken): VerificationTokenRecord {
  return {
    id: row.id,
    destinationId: row.destinationId,
    businessId: row.businessId,
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt.toISOString(),
    usedAt: row.usedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapInitial(row: PrismaInitial): StoredInitialReply {
  return {
    id: row.id,
    businessId: row.businessId,
    locationId: row.locationId,
    contactId: row.contactId,
    relationshipId: row.relationshipId,
    campaignId: row.campaignId,
    threadId: row.threadId,
    inboxMessageId: row.inboxMessageId,
    aliasId: row.aliasId,
    provider: row.provider,
    providerMessageId: row.providerMessageId,
    internetMessageId: row.internetMessageId,
    inReplyTo: row.inReplyTo,
    referencesHeader: row.referencesHeader,
    fromAddress: row.fromAddress,
    toAddress: row.toAddress,
    replyAlias: row.replyAlias,
    subject: row.subject,
    normalizedText: row.normalizedText,
    sanitizedHtmlRef: row.sanitizedHtmlRef,
    classification: row.classification,
    urgency: row.urgency,
    routingDestinationId: row.routingDestinationId,
    routingState: row.routingState as ReplyRoutingState,
    externalReference: row.externalReference,
    evidenceClass: row.evidenceClass,
    retentionState: row.retentionState,
    attachmentMetadata: row.attachmentMetadata,
    receivedAt: row.receivedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapAttempt(row: PrismaAttempt): StoredRoutingAttempt {
  return {
    id: row.id,
    businessId: row.businessId,
    initialMessageId: row.initialMessageId,
    destinationId: row.destinationId,
    attemptNumber: row.attemptNumber,
    status: row.status,
    idempotencyKey: row.idempotencyKey,
    providerRef: row.providerRef,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    handoffKind: row.handoffKind,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapEvent(row: PrismaEvent): StoredProviderEvent {
  return {
    id: row.id,
    provider: row.provider,
    eventId: row.eventId,
    receivedEmailId: row.receivedEmailId,
    eventType: row.eventType,
    processingState: row.processingState,
    businessId: row.businessId,
    lastError: row.lastError,
  };
}

export class EmailRepliesPrismaStore implements EmailRepliesStore {
  readonly kind = "prisma" as const;

  async ping() {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true as const, kind: this.kind };
  }

  async upsertDestination(input: UpsertDestinationInput) {
    const caps = capabilitiesForDestinationType(input.destinationType);
    const normalizedAddress = input.address
      ? normalizeEmailAddress(input.address)
      : undefined;

    if (input.id) {
      const existing = await prisma.replyDestination.findFirst({
        where: { id: input.id, businessId: input.businessId },
      });
      if (existing) {
        const updated = await prisma.replyDestination.update({
          where: { id: existing.id },
          data: {
            name: input.name,
            destinationType: input.destinationType,
            destinationReference: input.destinationReference ?? undefined,
            normalizedAddress:
              normalizedAddress ?? existing.normalizedAddress ?? undefined,
            locationId: input.locationId ?? undefined,
            role: input.role ?? undefined,
            selectedCategories: (input.selectedCategories ??
              parseMessageCategories(existing.selectedCategories)) as Prisma.InputJsonValue,
            keepCopyInTap: input.keepCopyInTap ?? undefined,
            failureNotificationAddress:
              input.failureNotificationAddress ?? undefined,
            capabilities: caps as unknown as Prisma.InputJsonValue,
          },
        });
        return mapDestination(updated);
      }
    }

    const created = await prisma.replyDestination.create({
      data: {
        businessId: input.businessId,
        locationId: input.locationId ?? null,
        name: input.name,
        destinationType: input.destinationType,
        destinationReference: input.destinationReference ?? null,
        normalizedAddress: normalizedAddress ?? null,
        role: input.role ?? "PRIMARY",
        selectedCategories: (input.selectedCategories ?? [
          "all",
        ]) as Prisma.InputJsonValue,
        keepCopyInTap: input.keepCopyInTap ?? false,
        failureNotificationAddress: input.failureNotificationAddress ?? null,
        capabilities: caps as unknown as Prisma.InputJsonValue,
      },
    });
    return mapDestination(created);
  }

  async getDestination(id: string) {
    const row = await prisma.replyDestination.findUnique({ where: { id } });
    return row ? mapDestination(row) : null;
  }

  async listDestinations(businessId: string) {
    const rows = await prisma.replyDestination.findMany({
      where: { businessId },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map(mapDestination);
  }

  async setDestinationEnabled(
    destinationId: string,
    businessId: string,
    enabled: boolean
  ) {
    const existing = await prisma.replyDestination.findFirst({
      where: { id: destinationId, businessId },
    });
    if (!existing) return null;
    return mapDestination(
      await prisma.replyDestination.update({
        where: { id: destinationId },
        data: { enabled },
      })
    );
  }

  async revokeDestination(destinationId: string, businessId: string) {
    const existing = await prisma.replyDestination.findFirst({
      where: { id: destinationId, businessId },
    });
    if (!existing) return null;
    return mapDestination(
      await prisma.replyDestination.update({
        where: { id: destinationId },
        data: { verificationStatus: "REVOKED", enabled: false },
      })
    );
  }

  async pauseDestination(
    destinationId: string,
    businessId: string,
    reason: string
  ) {
    const existing = await prisma.replyDestination.findFirst({
      where: { id: destinationId, businessId },
    });
    if (!existing) return null;
    return mapDestination(
      await prisma.replyDestination.update({
        where: { id: destinationId },
        data: { paused: true, pausedReason: reason },
      })
    );
  }

  async unpauseDestination(destinationId: string, businessId: string) {
    const existing = await prisma.replyDestination.findFirst({
      where: { id: destinationId, businessId },
    });
    if (!existing) return null;
    return mapDestination(
      await prisma.replyDestination.update({
        where: { id: destinationId },
        data: {
          paused: false,
          pausedReason: null,
          consecutiveFailureCount: 0,
        },
      })
    );
  }

  async setPolicy(input: SetPolicyInput) {
    const locationId = input.locationId ?? null;
    const existing = await prisma.replyPolicy.findFirst({
      where: {
        businessId: input.businessId,
        locationId,
      },
    });

    const data = {
      mode: input.mode,
      primaryDestinationId: input.primaryDestinationId ?? null,
      fallbackDestinationId: input.fallbackDestinationId ?? null,
      keepCopyInTap: input.keepCopyInTap ?? false,
      notifyOnFailure: input.notifyOnFailure ?? true,
      failureNotificationAddress: input.failureNotificationAddress ?? null,
      useTapInboxFallback: input.useTapInboxFallback ?? true,
      activated: input.activated ?? false,
      skipTestAcknowledged: input.skipTestAcknowledged ?? false,
      activatedAt:
        input.activated && !existing?.activated
          ? new Date()
          : existing?.activatedAt ?? null,
    };

    if (existing) {
      return mapPolicy(
        await prisma.replyPolicy.update({
          where: { id: existing.id },
          data,
        })
      );
    }

    return mapPolicy(
      await prisma.replyPolicy.create({
        data: {
          businessId: input.businessId,
          locationId,
          ...data,
        },
      })
    );
  }

  async getPolicy(businessId: string, locationId?: string | null) {
    const row = await prisma.replyPolicy.findFirst({
      where: {
        businessId,
        locationId: locationId ?? null,
      },
    });
    return row ? mapPolicy(row) : null;
  }

  async createVerificationToken(input: {
    destinationId: string;
    businessId: string;
  }) {
    await this.supersedeOpenTokens(input.destinationId);
    const generated = generateVerificationToken();
    const record = await prisma.replyVerificationToken.create({
      data: {
        destinationId: input.destinationId,
        businessId: input.businessId,
        tokenHash: generated.tokenHash,
        expiresAt: generated.expiresAt,
      },
    });
    await prisma.replyDestination.updateMany({
      where: { id: input.destinationId, businessId: input.businessId },
      data: { verificationStatus: "PENDING" },
    });
    return { plainToken: generated.token, record: mapToken(record) };
  }

  async supersedeOpenTokens(destinationId: string) {
    await prisma.replyVerificationToken.updateMany({
      where: { destinationId, usedAt: null },
      data: { usedAt: new Date() },
    });
  }

  async countVerificationSends(destinationId: string, windowMs: number) {
    const cutoff = new Date(Date.now() - windowMs);
    return prisma.replyVerificationToken.count({
      where: { destinationId, createdAt: { gte: cutoff } },
    });
  }

  async findTokenByPlain(plain: string) {
    const tokenHash = hashToken(plain);
    const row = await prisma.replyVerificationToken.findUnique({
      where: { tokenHash },
    });
    return row ? mapToken(row) : null;
  }

  async markTokenUsed(tokenHash: string) {
    await prisma.replyVerificationToken.updateMany({
      where: { tokenHash, usedAt: null },
      data: { usedAt: new Date() },
    });
  }

  async markDestinationVerified(destinationId: string, businessId?: string) {
    const where = businessId
      ? { id: destinationId, businessId }
      : { id: destinationId };
    const existing = await prisma.replyDestination.findFirst({ where });
    if (!existing) return null;
    return mapDestination(
      await prisma.replyDestination.update({
        where: { id: destinationId },
        data: { verificationStatus: "VERIFIED" },
      })
    );
  }

  async markDestinationTested(
    destinationId: string,
    result: "success" | "failure",
    detail?: string
  ) {
    const existing = await prisma.replyDestination.findUnique({
      where: { id: destinationId },
    });
    if (!existing) return null;
    return mapDestination(
      await prisma.replyDestination.update({
        where: { id: destinationId },
        data:
          result === "success"
            ? {
                lastTestedAt: new Date(),
                lastTestResult: "success",
                lastSuccessfulRouteAt: new Date(),
                consecutiveFailureCount: 0,
                paused: false,
                pausedReason: null,
              }
            : {
                lastTestedAt: new Date(),
                lastTestResult: detail ?? "failure",
              },
      })
    );
  }

  async recordRouteFailure(destinationId: string, reason: string) {
    const existing = await prisma.replyDestination.findUnique({
      where: { id: destinationId },
    });
    if (!existing) return null;
    const nextCount = existing.consecutiveFailureCount + 1;
    return mapDestination(
      await prisma.replyDestination.update({
        where: { id: destinationId },
        data: {
          consecutiveFailureCount: nextCount,
          lastFailureAt: new Date(),
          ...(nextCount >= 3
            ? { paused: true, pausedReason: reason }
            : {}),
        },
      })
    );
  }

  async createAlias(ctx: ReplyAliasContext) {
    const token = generateOpaqueReplyToken();
    const row = await prisma.replyAlias.create({
      data: {
        businessId: ctx.businessId,
        token,
        tokenHash: hashReplyToken(token),
        campaignId: ctx.campaignId ?? null,
        contactId: ctx.contactId ?? null,
        relationshipId: ctx.relationshipId ?? null,
        originatingMessageRef: ctx.originatingMessageRef ?? null,
        emailDocumentVersion: ctx.emailDocumentVersion ?? null,
        replyPolicyMode: ctx.replyPolicyMode ?? null,
        destinationId: ctx.destinationId ?? null,
        expiresAt: createAliasExpiry(),
      },
    });
    return mapAlias(row);
  }

  async getAliasByToken(token: string) {
    const row = await prisma.replyAlias.findUnique({ where: { token } });
    return row ? mapAlias(row) : null;
  }

  async deactivateAlias(token: string, businessId: string) {
    const existing = await prisma.replyAlias.findFirst({
      where: { token, businessId },
    });
    if (!existing) return null;
    return mapAlias(
      await prisma.replyAlias.update({
        where: { id: existing.id },
        data: { deactivatedAt: new Date() },
      })
    );
  }

  async claimProviderEvent(input: {
    provider: string;
    eventId: string;
    eventType: string;
    receivedEmailId?: string | null;
    businessId?: string | null;
  }) {
    const existing = await prisma.replyProviderEvent.findUnique({
      where: {
        provider_eventId: {
          provider: input.provider,
          eventId: input.eventId,
        },
      },
    });
    if (existing) {
      if (input.businessId && !existing.businessId) {
        const updated = await prisma.replyProviderEvent.update({
          where: { id: existing.id },
          data: { businessId: input.businessId },
        });
        return { created: false, event: mapEvent(updated) };
      }
      return { created: false, event: mapEvent(existing) };
    }
    try {
      const created = await prisma.replyProviderEvent.create({
        data: {
          provider: input.provider,
          eventId: input.eventId,
          eventType: input.eventType,
          receivedEmailId: input.receivedEmailId ?? null,
          businessId: input.businessId ?? null,
          processingState: "received",
        },
      });
      return { created: true, event: mapEvent(created) };
    } catch {
      const again = await prisma.replyProviderEvent.findUnique({
        where: {
          provider_eventId: {
            provider: input.provider,
            eventId: input.eventId,
          },
        },
      });
      if (again) return { created: false, event: mapEvent(again) };
      throw new Error("Failed to claim provider event");
    }
  }

  async updateProviderEventState(
    provider: string,
    eventId: string,
    processingState: string,
    lastError?: string | null
  ) {
    await prisma.replyProviderEvent.updateMany({
      where: { provider, eventId },
      data: {
        processingState,
        ...(lastError !== undefined ? { lastError } : {}),
      },
    });
  }

  async saveInitialReply(row: SaveInitialReplyInput) {
    const provider = row.provider ?? "resend";
    if (row.providerMessageId) {
      const existing = await prisma.replyInitialMessage.findFirst({
        where: {
          provider,
          providerMessageId: row.providerMessageId,
        },
      });
      if (existing) return mapInitial(existing);
    }

    try {
      const created = await prisma.replyInitialMessage.create({
        data: {
          businessId: row.businessId,
          locationId: row.locationId ?? null,
          contactId: row.contactId ?? null,
          relationshipId: row.relationshipId ?? null,
          campaignId: row.campaignId ?? null,
          threadId: row.threadId ?? null,
          inboxMessageId: row.inboxMessageId ?? null,
          aliasId: row.aliasId ?? null,
          provider,
          providerMessageId: row.providerMessageId ?? null,
          internetMessageId: row.internetMessageId ?? null,
          inReplyTo: row.inReplyTo ?? null,
          referencesHeader: row.referencesHeader ?? null,
          fromAddress: row.fromAddress,
          toAddress: row.toAddress,
          replyAlias: row.replyAlias ?? null,
          subject: row.subject ?? null,
          normalizedText: row.normalizedText,
          sanitizedHtmlRef: row.sanitizedHtmlRef ?? null,
          receivedAt: new Date(row.receivedAt),
          attachmentMetadata: (row.attachmentMetadata ??
            []) as Prisma.InputJsonValue,
          classification: row.classification ?? null,
          urgency: row.urgency ?? null,
          routingDestinationId: row.routingDestinationId ?? null,
          routingState: row.routingState,
          externalReference: row.externalReference ?? null,
          evidenceClass: row.evidenceClass ?? "confirmed",
          retentionState: row.retentionState ?? "active",
        },
      });
      return mapInitial(created);
    } catch {
      if (row.providerMessageId) {
        const again = await prisma.replyInitialMessage.findFirst({
          where: { provider, providerMessageId: row.providerMessageId },
        });
        if (again) return mapInitial(again);
      }
      throw new Error("Failed to persist initial reply");
    }
  }

  async getInitialReply(id: string) {
    const row = await prisma.replyInitialMessage.findUnique({ where: { id } });
    return row ? mapInitial(row) : null;
  }

  async findInitialReplyByProviderMessage(
    provider: string,
    providerMessageId: string
  ) {
    const row = await prisma.replyInitialMessage.findFirst({
      where: { provider, providerMessageId },
    });
    return row ? mapInitial(row) : null;
  }

  async listInitialReplies(businessId: string, limit = 50) {
    const rows = await prisma.replyInitialMessage.findMany({
      where: { businessId },
      orderBy: { receivedAt: "desc" },
      take: limit,
    });
    return rows.map(mapInitial);
  }

  async updateInitialReplyLinks(input: {
    id: string;
    businessId: string;
    threadId?: string | null;
    inboxMessageId?: string | null;
    routingState?: ReplyRoutingState;
    routingDestinationId?: string | null;
    externalReference?: string | null;
  }) {
    const existing = await prisma.replyInitialMessage.findFirst({
      where: { id: input.id, businessId: input.businessId },
    });
    if (!existing) return null;
    return mapInitial(
      await prisma.replyInitialMessage.update({
        where: { id: input.id },
        data: {
          ...(input.threadId !== undefined ? { threadId: input.threadId } : {}),
          ...(input.inboxMessageId !== undefined
            ? { inboxMessageId: input.inboxMessageId }
            : {}),
          ...(input.routingState ? { routingState: input.routingState } : {}),
          ...(input.routingDestinationId !== undefined
            ? { routingDestinationId: input.routingDestinationId }
            : {}),
          ...(input.externalReference !== undefined
            ? { externalReference: input.externalReference }
            : {}),
        },
      })
    );
  }

  async saveRoutingAttempt(
    row: Omit<StoredRoutingAttempt, "id"> & { id?: string }
  ) {
    const existing = await prisma.replyRoutingAttempt.findUnique({
      where: { idempotencyKey: row.idempotencyKey },
    });
    if (existing) return { created: false, attempt: mapAttempt(existing) };
    try {
      const created = await prisma.replyRoutingAttempt.create({
        data: {
          businessId: row.businessId,
          initialMessageId: row.initialMessageId ?? null,
          destinationId: row.destinationId ?? null,
          attemptNumber: row.attemptNumber,
          status: row.status,
          idempotencyKey: row.idempotencyKey,
          providerRef: row.providerRef ?? null,
          errorCode: row.errorCode ?? null,
          errorMessage: row.errorMessage ?? null,
          handoffKind: row.handoffKind ?? null,
        },
      });
      return { created: true, attempt: mapAttempt(created) };
    } catch {
      const again = await prisma.replyRoutingAttempt.findUnique({
        where: { idempotencyKey: row.idempotencyKey },
      });
      if (again) return { created: false, attempt: mapAttempt(again) };
      throw new Error("Failed to persist routing attempt");
    }
  }

  async listRoutingAttempts(businessId: string, limit = 50) {
    const rows = await prisma.replyRoutingAttempt.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(mapAttempt);
  }

  async addEvidence(e: ReplyEvidenceRecord) {
    // Durable evidence via PlatformAuditEvent — no secrets
    await prisma.platformAuditEvent.create({
      data: {
        actorType: "SYSTEM",
        action: `email_replies.${e.kind}`,
        resourceType: "reply_routing",
        resourceId:
          e.destinationReference ?? e.providerReference ?? e.businessId,
        businessId: e.businessId,
        correlationId:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `ev_${Date.now().toString(36)}`,
        metadata: {
          kind: e.kind,
          campaignId: e.campaignId ?? null,
          contactId: e.contactId ?? null,
          relationshipId: e.relationshipId ?? null,
          destinationType: e.destinationType ?? null,
          destinationReference: e.destinationReference ?? null,
          providerReference: e.providerReference ?? null,
          evidenceClass: e.evidenceClass,
          success: e.success,
          detail: e.detail ?? null,
          timestamp: e.timestamp,
        } as Prisma.InputJsonValue,
      },
    });
  }

  async listEvidence(businessId: string, limit = 50) {
    const rows = await prisma.platformAuditEvent.findMany({
      where: {
        businessId,
        action: { startsWith: "email_replies." },
      },
      orderBy: { occurredAt: "desc" },
      take: limit,
    });
    return rows.map((r) => {
      const meta = (r.metadata ?? {}) as Record<string, unknown>;
      const kind = String(
        meta.kind ?? r.action.replace("email_replies.", "")
      ) as ReplyEvidenceKind;
      return {
        kind,
        businessId: r.businessId ?? businessId,
        campaignId: (meta.campaignId as string | null) ?? null,
        contactId: (meta.contactId as string | null) ?? null,
        relationshipId: (meta.relationshipId as string | null) ?? null,
        destinationType: (meta.destinationType as string | null) ?? null,
        destinationReference:
          (meta.destinationReference as string | null) ?? null,
        providerReference: (meta.providerReference as string | null) ?? null,
        timestamp:
          typeof meta.timestamp === "string"
            ? meta.timestamp
            : r.occurredAt.toISOString(),
        evidenceClass:
          (meta.evidenceClass as ReplyEvidenceRecord["evidenceClass"]) ??
          "confirmed",
        success: meta.success === true,
        detail: typeof meta.detail === "string" ? meta.detail : undefined,
      } satisfies ReplyEvidenceRecord;
    });
  }
}

let prismaSingleton: EmailRepliesPrismaStore | null = null;

export function getEmailRepliesPrismaStore(): EmailRepliesPrismaStore {
  if (!prismaSingleton) prismaSingleton = new EmailRepliesPrismaStore();
  return prismaSingleton;
}
