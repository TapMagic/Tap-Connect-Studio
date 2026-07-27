/**
 * In-memory Email & Replies store — isolated unit tests ONLY.
 * Set EMAIL_REPLIES_STORE=memory explicitly. Never the default runtime path.
 */

import { randomUUID } from "node:crypto";
import type {
  ReplyDestinationRecord,
  ReplyPolicyRecord,
} from "./types";
import { capabilitiesForDestinationType } from "./capabilities";
import { normalizeEmailAddress } from "./destination";
import {
  generateVerificationToken,
  hashToken,
  type VerificationTokenRecord,
} from "./verification";
import {
  createAliasExpiry,
  generateOpaqueReplyToken,
  hashReplyToken,
  type ReplyAliasContext,
} from "./reply-alias";
import type { ReplyEvidenceRecord } from "./evidence";
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

function nowIso() {
  return new Date().toISOString();
}

export class EmailRepliesMemoryStore implements EmailRepliesStore {
  readonly kind = "memory" as const;

  destinations = new Map<string, ReplyDestinationRecord>();
  policies = new Map<string, ReplyPolicyRecord>();
  tokens: VerificationTokenRecord[] = [];
  aliases = new Map<string, StoredAlias>();
  providerEvents = new Map<string, StoredProviderEvent>();
  initialReplies = new Map<string, StoredInitialReply>();
  routingAttempts = new Map<string, StoredRoutingAttempt>();
  evidence: ReplyEvidenceRecord[] = [];
  verificationSendLog: Array<{ destinationId: string; at: number }> = [];

  policyKey(businessId: string, locationId?: string | null) {
    return `${businessId}::${locationId ?? ""}`;
  }

  async ping() {
    return { ok: true as const, kind: this.kind };
  }

  async upsertDestination(
    input: UpsertDestinationInput
  ): Promise<ReplyDestinationRecord> {
    const id = input.id ?? randomUUID();
    const existing = this.destinations.get(id);
    const normalizedAddress = input.address
      ? normalizeEmailAddress(input.address)
      : existing?.normalizedAddress ?? null;
    const record: ReplyDestinationRecord = {
      id,
      businessId: input.businessId,
      locationId: input.locationId ?? null,
      name: input.name,
      destinationType: input.destinationType,
      destinationReference: input.destinationReference ?? null,
      normalizedAddress,
      verificationStatus: existing?.verificationStatus ?? "UNVERIFIED",
      enabled: existing?.enabled ?? true,
      role: input.role ?? existing?.role ?? "PRIMARY",
      selectedCategories:
        input.selectedCategories ?? existing?.selectedCategories ?? ["all"],
      keepCopyInTap: input.keepCopyInTap ?? existing?.keepCopyInTap ?? false,
      failureNotificationAddress:
        input.failureNotificationAddress ??
        existing?.failureNotificationAddress ??
        null,
      capabilities: capabilitiesForDestinationType(input.destinationType),
      credentialRef: existing?.credentialRef ?? null,
      lastTestedAt: existing?.lastTestedAt ?? null,
      lastTestResult: existing?.lastTestResult ?? null,
      lastSuccessfulRouteAt: existing?.lastSuccessfulRouteAt ?? null,
      lastFailureAt: existing?.lastFailureAt ?? null,
      consecutiveFailureCount: existing?.consecutiveFailureCount ?? 0,
      paused: existing?.paused ?? false,
      pausedReason: existing?.pausedReason ?? null,
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    };
    this.destinations.set(id, record);
    return record;
  }

  async listDestinations(businessId: string) {
    return [...this.destinations.values()].filter(
      (d) => d.businessId === businessId
    );
  }

  async getDestination(id: string) {
    return this.destinations.get(id) ?? null;
  }

  async setDestinationEnabled(
    destinationId: string,
    businessId: string,
    enabled: boolean
  ) {
    const d = this.destinations.get(destinationId);
    if (!d || d.businessId !== businessId) return null;
    d.enabled = enabled;
    d.updatedAt = nowIso();
    return d;
  }

  async revokeDestination(destinationId: string, businessId: string) {
    const d = this.destinations.get(destinationId);
    if (!d || d.businessId !== businessId) return null;
    d.verificationStatus = "REVOKED";
    d.enabled = false;
    d.updatedAt = nowIso();
    return d;
  }

  async pauseDestination(
    destinationId: string,
    businessId: string,
    reason: string
  ) {
    const d = this.destinations.get(destinationId);
    if (!d || d.businessId !== businessId) return null;
    d.paused = true;
    d.pausedReason = reason;
    d.updatedAt = nowIso();
    return d;
  }

  async unpauseDestination(destinationId: string, businessId: string) {
    const d = this.destinations.get(destinationId);
    if (!d || d.businessId !== businessId) return null;
    d.paused = false;
    d.pausedReason = null;
    d.consecutiveFailureCount = 0;
    d.updatedAt = nowIso();
    return d;
  }

  async setPolicy(input: SetPolicyInput): Promise<ReplyPolicyRecord> {
    const key = this.policyKey(input.businessId, input.locationId);
    const existing = this.policies.get(key);
    const record: ReplyPolicyRecord = {
      id: existing?.id ?? randomUUID(),
      businessId: input.businessId,
      locationId: input.locationId ?? null,
      mode: input.mode,
      primaryDestinationId: input.primaryDestinationId ?? null,
      fallbackDestinationId: input.fallbackDestinationId ?? null,
      keepCopyInTap: input.keepCopyInTap ?? false,
      notifyOnFailure: input.notifyOnFailure ?? true,
      failureNotificationAddress: input.failureNotificationAddress ?? null,
      useTapInboxFallback: input.useTapInboxFallback ?? true,
      activated: input.activated ?? false,
      activatedAt:
        input.activated && !existing?.activated
          ? nowIso()
          : existing?.activatedAt ?? null,
      skipTestAcknowledged: input.skipTestAcknowledged ?? false,
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    };
    this.policies.set(key, record);
    return record;
  }

  async getPolicy(businessId: string, locationId?: string | null) {
    return this.policies.get(this.policyKey(businessId, locationId)) ?? null;
  }

  async createVerificationToken(input: {
    destinationId: string;
    businessId: string;
  }) {
    await this.supersedeOpenTokens(input.destinationId);
    const generated = generateVerificationToken();
    const record: VerificationTokenRecord = {
      id: randomUUID(),
      destinationId: input.destinationId,
      businessId: input.businessId,
      tokenHash: generated.tokenHash,
      expiresAt: generated.expiresAt.toISOString(),
      usedAt: null,
      createdAt: nowIso(),
    };
    this.tokens.push(record);
    this.verificationSendLog.push({
      destinationId: input.destinationId,
      at: Date.now(),
    });
    const dest = this.destinations.get(input.destinationId);
    if (dest) {
      dest.verificationStatus = "PENDING";
      dest.updatedAt = nowIso();
    }
    return { plainToken: generated.token, record };
  }

  async supersedeOpenTokens(destinationId: string) {
    const now = nowIso();
    for (const t of this.tokens) {
      if (t.destinationId === destinationId && !t.usedAt) {
        t.usedAt = now;
      }
    }
  }

  async countVerificationSends(destinationId: string, windowMs: number) {
    const cutoff = Date.now() - windowMs;
    return this.verificationSendLog.filter(
      (s) => s.destinationId === destinationId && s.at >= cutoff
    ).length;
  }

  async findTokenByPlain(plain: string) {
    const h = hashToken(plain);
    return this.tokens.find((t) => t.tokenHash === h) ?? null;
  }

  async markTokenUsed(tokenHash: string) {
    const t = this.tokens.find((x) => x.tokenHash === tokenHash);
    if (t) t.usedAt = nowIso();
  }

  async markDestinationVerified(destinationId: string, businessId?: string) {
    const d = this.destinations.get(destinationId);
    if (!d) return null;
    if (businessId && d.businessId !== businessId) return null;
    d.verificationStatus = "VERIFIED";
    d.updatedAt = nowIso();
    return d;
  }

  async markDestinationTested(
    destinationId: string,
    result: "success" | "failure",
    detail?: string
  ) {
    const d = this.destinations.get(destinationId);
    if (!d) return null;
    d.lastTestedAt = nowIso();
    d.lastTestResult = result === "success" ? "success" : detail ?? "failure";
    if (result === "success") {
      d.lastSuccessfulRouteAt = nowIso();
      d.consecutiveFailureCount = 0;
      d.paused = false;
      d.pausedReason = null;
    }
    d.updatedAt = nowIso();
    return d;
  }

  async recordRouteFailure(destinationId: string, reason: string) {
    const d = this.destinations.get(destinationId);
    if (!d) return null;
    d.consecutiveFailureCount += 1;
    d.lastFailureAt = nowIso();
    if (d.consecutiveFailureCount >= 3) {
      d.paused = true;
      d.pausedReason = reason;
    }
    d.updatedAt = nowIso();
    return d;
  }

  async createAlias(ctx: ReplyAliasContext): Promise<StoredAlias> {
    const token = generateOpaqueReplyToken();
    const alias: StoredAlias = {
      id: randomUUID(),
      token,
      tokenHash: hashReplyToken(token),
      expiresAt: createAliasExpiry().toISOString(),
      deactivatedAt: null,
      ...ctx,
    };
    this.aliases.set(token, alias);
    return alias;
  }

  async getAliasByToken(token: string) {
    return this.aliases.get(token) ?? null;
  }

  async deactivateAlias(token: string, businessId: string) {
    const a = this.aliases.get(token);
    if (!a || a.businessId !== businessId) return null;
    a.deactivatedAt = nowIso();
    return a;
  }

  async claimProviderEvent(input: {
    provider: string;
    eventId: string;
    eventType: string;
    receivedEmailId?: string | null;
    businessId?: string | null;
  }) {
    const key = `${input.provider}:${input.eventId}`;
    const existing = this.providerEvents.get(key);
    if (existing) {
      if (input.businessId && !existing.businessId) {
        existing.businessId = input.businessId;
      }
      return { created: false, event: existing };
    }
    const event: StoredProviderEvent = {
      id: randomUUID(),
      provider: input.provider,
      eventId: input.eventId,
      receivedEmailId: input.receivedEmailId ?? null,
      eventType: input.eventType,
      processingState: "received",
      businessId: input.businessId ?? null,
    };
    this.providerEvents.set(key, event);
    return { created: true, event };
  }

  async updateProviderEventState(
    provider: string,
    eventId: string,
    processingState: string,
    lastError?: string | null
  ) {
    const key = `${provider}:${eventId}`;
    const e = this.providerEvents.get(key);
    if (e) {
      e.processingState = processingState;
      if (lastError !== undefined) e.lastError = lastError;
    }
  }

  async saveInitialReply(row: SaveInitialReplyInput) {
    if (row.providerMessageId) {
      for (const existing of this.initialReplies.values()) {
        if (
          existing.providerMessageId === row.providerMessageId &&
          (existing.provider ?? "resend") === (row.provider ?? "resend")
        ) {
          return existing;
        }
      }
    }
    const record: StoredInitialReply = {
      id: row.id ?? randomUUID(),
      ...row,
      provider: row.provider ?? "resend",
      evidenceClass: row.evidenceClass ?? "confirmed",
      retentionState: row.retentionState ?? "active",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.initialReplies.set(record.id, record);
    return record;
  }

  async getInitialReply(id: string) {
    return this.initialReplies.get(id) ?? null;
  }

  async findInitialReplyByProviderMessage(
    provider: string,
    providerMessageId: string
  ) {
    for (const row of this.initialReplies.values()) {
      if (
        (row.provider ?? "resend") === provider &&
        row.providerMessageId === providerMessageId
      ) {
        return row;
      }
    }
    return null;
  }

  async listInitialReplies(businessId: string, limit = 50) {
    return [...this.initialReplies.values()]
      .filter((r) => r.businessId === businessId)
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
      .slice(0, limit);
  }

  async updateInitialReplyLinks(input: {
    id: string;
    businessId: string;
    threadId?: string | null;
    inboxMessageId?: string | null;
    routingState?: StoredInitialReply["routingState"];
    routingDestinationId?: string | null;
    externalReference?: string | null;
  }) {
    const row = this.initialReplies.get(input.id);
    if (!row || row.businessId !== input.businessId) return null;
    if (input.threadId !== undefined) row.threadId = input.threadId;
    if (input.inboxMessageId !== undefined)
      row.inboxMessageId = input.inboxMessageId;
    if (input.routingState) row.routingState = input.routingState;
    if (input.routingDestinationId !== undefined)
      row.routingDestinationId = input.routingDestinationId;
    if (input.externalReference !== undefined)
      row.externalReference = input.externalReference;
    row.updatedAt = nowIso();
    return row;
  }

  async saveRoutingAttempt(
    row: Omit<StoredRoutingAttempt, "id"> & { id?: string }
  ) {
    for (const a of this.routingAttempts.values()) {
      if (a.idempotencyKey === row.idempotencyKey) {
        return { created: false, attempt: a };
      }
    }
    const attempt: StoredRoutingAttempt = {
      id: row.id ?? randomUUID(),
      ...row,
      createdAt: nowIso(),
    };
    this.routingAttempts.set(attempt.id, attempt);
    return { created: true, attempt };
  }

  async listRoutingAttempts(businessId: string, limit = 50) {
    return [...this.routingAttempts.values()]
      .filter((a) => a.businessId === businessId)
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
      .slice(0, limit);
  }

  async addEvidence(e: ReplyEvidenceRecord) {
    this.evidence.push(e);
  }

  async listEvidence(businessId: string, limit = 50) {
    return this.evidence
      .filter((e) => e.businessId === businessId)
      .slice(-limit)
      .reverse();
  }

  reset() {
    this.destinations.clear();
    this.policies.clear();
    this.tokens = [];
    this.aliases.clear();
    this.providerEvents.clear();
    this.initialReplies.clear();
    this.routingAttempts.clear();
    this.evidence = [];
    this.verificationSendLog = [];
  }
}

let singleton: EmailRepliesMemoryStore | null = null;

export function getEmailRepliesMemoryStore(): EmailRepliesMemoryStore {
  if (!singleton) singleton = new EmailRepliesMemoryStore();
  return singleton;
}

export function resetEmailRepliesMemoryStore() {
  getEmailRepliesMemoryStore().reset();
}
