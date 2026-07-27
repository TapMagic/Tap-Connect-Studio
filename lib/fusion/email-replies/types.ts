/**
 * Email & Replies — provider-neutral reply-routing contracts.
 * Locked naming: Email & Replies · TapConnect Email · Reply Routing · TapInbox · Powered by Resend
 * Maturity: IMPLEMENTED BUT NOT OWNER-READY
 */

export const EMAIL_REPLIES_PRODUCT_NAME = "Email & Replies" as const;
export const TAPCONNECT_EMAIL_NAME = "TapConnect Email" as const;
export const REPLY_ROUTING_NAME = "Reply Routing" as const;
export const TAP_INBOX_NAME = "TapInbox" as const;
export const RESEND_PROVIDER_DISCLOSURE = "Powered by Resend" as const;

export const EMAIL_REPLIES_PROMISE =
  "Send branded email and deliver customer replies wherever your team already works." as const;

export const EMAIL_REPLIES_SECONDARY =
  "TapConnect preserves the customer and Campaign context and tells you when the handoff succeeds." as const;

export const EMAIL_REPLIES_SMALL_BIZ =
  "Don’t have a customer-service inbox? TapConnect can handle replies for you." as const;

/** Canonical reply-handling modes — one system, not competing layers */
export type ReplyHandlingMode =
  | "TAP_ROUTE_EXTERNAL"
  | "TAP_INBOX"
  | "DIRECT_EXTERNAL"
  | "CONNECTED_DESTINATION";

export type ReplyDestinationType =
  | "EMAIL_ADDRESS"
  | "TAP_INBOX"
  | "INTEGRATION"
  | "WEBHOOK"
  | "DIRECT_REPLY_TO";

export type ReplyVerificationStatus =
  | "UNVERIFIED"
  | "PENDING"
  | "VERIFIED"
  | "FAILED"
  | "REVOKED";

export type ReplyDestinationRole = "PRIMARY" | "FALLBACK";

export type ReplyRoutingState =
  | "RECEIVED"
  | "CONTEXT_MATCHED"
  | "CLASSIFIED"
  | "ROUTE_PENDING"
  | "ROUTED"
  | "ROUTE_FAILED"
  | "RETAINED_IN_TAP"
  | "PAUSED"
  | "SKIPPED_DIRECT";

/** Message category rules — deliberately simple V1 */
export type ReplyMessageCategory =
  | "all"
  | "complaints"
  | "questions"
  | "bookings"
  | "sales"
  | "other";

export const REPLY_MESSAGE_CATEGORIES: readonly ReplyMessageCategory[] = [
  "all",
  "complaints",
  "questions",
  "bookings",
  "sales",
  "other",
] as const;

export type ReplyCapability =
  | "receive_initial_handoff"
  | "receive_original_message"
  | "receive_normalized_context"
  | "receive_attachments"
  | "return_delivery_status"
  | "return_assignment"
  | "return_work_status"
  | "return_resolution"
  | "return_full_thread"
  | "create_external_item"
  | "update_external_item"
  | "open_external_item"
  | "supports_reply"
  | "supports_bidirectional_sync";

export type EmailDeliveryState =
  | "tapconnect_email"
  | "powered_by_resend"
  | "provider_configured"
  | "provider_not_configured"
  | "sender_domain_pending"
  | "sender_domain_ready"
  | "test_mode"
  | "live_campaign_sending_disabled";

export type IntegrationCardState =
  | "not_set_up"
  | "setup_incomplete"
  | "destination_awaiting_verification"
  | "configured_but_untested"
  | "ready"
  | "routing_with_limited_visibility"
  | "tapinbox_active"
  | "direct_external_replies"
  | "paused_after_failures"
  | "needs_attention"
  | "provider_not_configured"
  | "local_mock"
  | "provider_test"
  | "live_ready_campaign_sending_disabled";

export type RuntimeDeliveryMode = "local_mock" | "provider_test" | "live_ready";

export type OperatorRequirementStatus =
  | "not_configured"
  | "configured"
  | "verified"
  | "failing"
  | "test_only"
  | "live_ready";

export type ReplyEvidenceKind =
  | "reply_received"
  | "reply_context_matched"
  | "reply_routed"
  | "reply_route_failed"
  | "reply_retained_in_tap"
  | "direct_external_reply_configured"
  | "destination_verified"
  | "destination_tested"
  | "destination_paused";

export type ReplyDestinationRecord = {
  id: string;
  businessId: string;
  locationId?: string | null;
  name: string;
  destinationType: ReplyDestinationType;
  destinationReference?: string | null;
  normalizedAddress?: string | null;
  verificationStatus: ReplyVerificationStatus;
  enabled: boolean;
  role: ReplyDestinationRole;
  selectedCategories: ReplyMessageCategory[];
  keepCopyInTap: boolean;
  failureNotificationAddress?: string | null;
  capabilities: ReplyCapability[];
  credentialRef?: string | null;
  lastTestedAt?: string | null;
  lastTestResult?: string | null;
  lastSuccessfulRouteAt?: string | null;
  lastFailureAt?: string | null;
  consecutiveFailureCount: number;
  paused: boolean;
  pausedReason?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReplyPolicyRecord = {
  id: string;
  businessId: string;
  locationId?: string | null;
  mode: ReplyHandlingMode;
  primaryDestinationId?: string | null;
  fallbackDestinationId?: string | null;
  keepCopyInTap: boolean;
  notifyOnFailure: boolean;
  failureNotificationAddress?: string | null;
  useTapInboxFallback: boolean;
  activated: boolean;
  activatedAt?: string | null;
  skipTestAcknowledged: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Campaign-level override stored in EmailDocument JSON */
export type CampaignReplyHandlingOverride = {
  override: true;
  mode?: ReplyHandlingMode;
  primaryDestinationId?: string | null;
  fallbackDestinationId?: string | null;
  keepCopyInTap?: boolean;
  useTapInboxFallback?: boolean;
  directReplyTo?: string | null;
  updatedAt?: string;
};

export type ResolvedReplyPolicy = {
  mode: ReplyHandlingMode;
  source: "business" | "location" | "campaign" | "fallback";
  businessId: string;
  locationId?: string | null;
  campaignId?: string | null;
  primaryDestinationId?: string | null;
  fallbackDestinationId?: string | null;
  keepCopyInTap: boolean;
  notifyOnFailure: boolean;
  failureNotificationAddress?: string | null;
  useTapInboxFallback: boolean;
  activated: boolean;
  skipTestAcknowledged: boolean;
  directReplyTo?: string | null;
};

export type ReplyVisibilityBoundary = {
  tapTracks: string[];
  externalTracks: string[];
  summary: string;
};

export type FeatureCapabilitySet = {
  available: string[];
  unavailable: string[];
  explanations: Record<string, string>;
};
