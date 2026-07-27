/**
 * Provider-neutral Email & Replies store interface.
 * Runtime: Prisma. Isolated unit tests: memory (explicit only).
 */

import type {
  ReplyDestinationRecord,
  ReplyDestinationType,
  ReplyHandlingMode,
  ReplyMessageCategory,
  ReplyPolicyRecord,
  ReplyRoutingState,
} from "./types";
import type { VerificationTokenRecord } from "./verification";
import type { ReplyAliasContext } from "./reply-alias";
import type { ReplyEvidenceRecord } from "./evidence";

export type StoredInitialReply = {
  id: string;
  businessId: string;
  locationId?: string | null;
  contactId?: string | null;
  relationshipId?: string | null;
  campaignId?: string | null;
  threadId?: string | null;
  inboxMessageId?: string | null;
  aliasId?: string | null;
  provider?: string;
  providerMessageId?: string | null;
  internetMessageId?: string | null;
  inReplyTo?: string | null;
  referencesHeader?: string | null;
  fromAddress: string;
  toAddress: string;
  replyAlias?: string | null;
  subject?: string | null;
  normalizedText: string;
  sanitizedHtmlRef?: string | null;
  classification?: string | null;
  urgency?: string | null;
  routingDestinationId?: string | null;
  routingState: ReplyRoutingState;
  externalReference?: string | null;
  evidenceClass?: string;
  retentionState?: string;
  attachmentMetadata?: unknown;
  receivedAt: string;
  createdAt?: string;
  updatedAt?: string;
};

export type StoredAlias = ReplyAliasContext & {
  id: string;
  token: string;
  tokenHash: string;
  expiresAt: string;
  deactivatedAt?: string | null;
};

export type StoredProviderEvent = {
  id: string;
  provider: string;
  eventId: string;
  receivedEmailId?: string | null;
  eventType: string;
  processingState: string;
  businessId?: string | null;
  lastError?: string | null;
};

export type StoredRoutingAttempt = {
  id: string;
  businessId: string;
  initialMessageId?: string | null;
  destinationId?: string | null;
  attemptNumber: number;
  status: string;
  idempotencyKey: string;
  providerRef?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  handoffKind?: string | null;
  createdAt?: string;
};

export type UpsertDestinationInput = {
  id?: string;
  businessId: string;
  locationId?: string | null;
  name: string;
  destinationType: ReplyDestinationType;
  destinationReference?: string | null;
  address?: string | null;
  selectedCategories?: ReplyMessageCategory[];
  role?: "PRIMARY" | "FALLBACK";
  keepCopyInTap?: boolean;
  failureNotificationAddress?: string | null;
};

export type SetPolicyInput = {
  businessId: string;
  locationId?: string | null;
  mode: ReplyHandlingMode;
  primaryDestinationId?: string | null;
  fallbackDestinationId?: string | null;
  keepCopyInTap?: boolean;
  notifyOnFailure?: boolean;
  failureNotificationAddress?: string | null;
  useTapInboxFallback?: boolean;
  activated?: boolean;
  skipTestAcknowledged?: boolean;
};

export type SaveInitialReplyInput = Omit<StoredInitialReply, "id"> & {
  id?: string;
};

export type EmailRepliesStoreKind = "prisma" | "memory";

export interface EmailRepliesStore {
  readonly kind: EmailRepliesStoreKind;

  upsertDestination(input: UpsertDestinationInput): Promise<ReplyDestinationRecord>;
  getDestination(id: string): Promise<ReplyDestinationRecord | null>;
  listDestinations(businessId: string): Promise<ReplyDestinationRecord[]>;
  setDestinationEnabled(
    destinationId: string,
    businessId: string,
    enabled: boolean
  ): Promise<ReplyDestinationRecord | null>;
  revokeDestination(
    destinationId: string,
    businessId: string
  ): Promise<ReplyDestinationRecord | null>;
  pauseDestination(
    destinationId: string,
    businessId: string,
    reason: string
  ): Promise<ReplyDestinationRecord | null>;
  unpauseDestination(
    destinationId: string,
    businessId: string
  ): Promise<ReplyDestinationRecord | null>;
  markDestinationVerified(
    destinationId: string,
    businessId?: string
  ): Promise<ReplyDestinationRecord | null>;
  markDestinationTested(
    destinationId: string,
    result: "success" | "failure",
    detail?: string
  ): Promise<ReplyDestinationRecord | null>;
  recordRouteFailure(
    destinationId: string,
    reason: string
  ): Promise<ReplyDestinationRecord | null>;

  setPolicy(input: SetPolicyInput): Promise<ReplyPolicyRecord>;
  getPolicy(
    businessId: string,
    locationId?: string | null
  ): Promise<ReplyPolicyRecord | null>;

  createVerificationToken(input: {
    destinationId: string;
    businessId: string;
  }): Promise<{ plainToken: string; record: VerificationTokenRecord }>;
  countVerificationSends(
    destinationId: string,
    windowMs: number
  ): Promise<number>;
  findTokenByPlain(plain: string): Promise<VerificationTokenRecord | null>;
  markTokenUsed(tokenHash: string): Promise<void>;
  /** Invalidate unused tokens for destination when resending */
  supersedeOpenTokens(destinationId: string): Promise<void>;

  createAlias(ctx: ReplyAliasContext): Promise<StoredAlias>;
  getAliasByToken(token: string): Promise<StoredAlias | null>;
  deactivateAlias(token: string, businessId: string): Promise<StoredAlias | null>;

  claimProviderEvent(input: {
    provider: string;
    eventId: string;
    eventType: string;
    receivedEmailId?: string | null;
    businessId?: string | null;
  }): Promise<{ created: boolean; event: StoredProviderEvent }>;
  updateProviderEventState(
    provider: string,
    eventId: string,
    processingState: string,
    lastError?: string | null
  ): Promise<void>;

  saveInitialReply(row: SaveInitialReplyInput): Promise<StoredInitialReply>;
  getInitialReply(id: string): Promise<StoredInitialReply | null>;
  findInitialReplyByProviderMessage(
    provider: string,
    providerMessageId: string
  ): Promise<StoredInitialReply | null>;
  listInitialReplies(
    businessId: string,
    limit?: number
  ): Promise<StoredInitialReply[]>;
  updateInitialReplyLinks(input: {
    id: string;
    businessId: string;
    threadId?: string | null;
    inboxMessageId?: string | null;
    routingState?: ReplyRoutingState;
    routingDestinationId?: string | null;
    externalReference?: string | null;
  }): Promise<StoredInitialReply | null>;

  saveRoutingAttempt(
    row: Omit<StoredRoutingAttempt, "id"> & { id?: string }
  ): Promise<{ created: boolean; attempt: StoredRoutingAttempt }>;
  listRoutingAttempts(
    businessId: string,
    limit?: number
  ): Promise<StoredRoutingAttempt[]>;

  addEvidence(e: ReplyEvidenceRecord): Promise<void>;
  listEvidence(businessId: string, limit?: number): Promise<ReplyEvidenceRecord[]>;

  /** Health probe — throws if durable backend unavailable */
  ping(): Promise<{ ok: true; kind: EmailRepliesStoreKind }>;
}
