/**
 * Integration-card state resolution — host language, not raw errors.
 */

import type {
  IntegrationCardState,
  ReplyDestinationRecord,
  ReplyHandlingMode,
  ResolvedReplyPolicy,
  RuntimeDeliveryMode,
} from "./types";
import {
  EMAIL_REPLIES_PRODUCT_NAME,
  RESEND_PROVIDER_DISCLOSURE,
  TAPCONNECT_EMAIL_NAME,
  TAP_INBOX_NAME,
} from "./types";

export type CardStateInput = {
  policy: ResolvedReplyPolicy | null;
  primaryDestination?: ReplyDestinationRecord | null;
  providerConfigured: boolean;
  runtimeMode: RuntimeDeliveryMode;
  senderDomainReady?: boolean;
  liveCampaignSendingEnabled?: boolean;
};

export function resolveIntegrationCardState(
  input: CardStateInput
): IntegrationCardState {
  if (!input.providerConfigured && input.runtimeMode === "local_mock") {
    if (!input.policy || !input.policy.activated) {
      // Still allow local setup; distinguish provider later
    }
  }

  if (!input.providerConfigured && input.runtimeMode !== "local_mock") {
    return "provider_not_configured";
  }

  if (!input.policy || !input.policy.activated) {
    if (!input.policy) return "not_set_up";
    if (
      input.primaryDestination &&
      input.primaryDestination.verificationStatus === "PENDING"
    ) {
      return "destination_awaiting_verification";
    }
    if (
      input.primaryDestination &&
      input.primaryDestination.verificationStatus === "VERIFIED" &&
      !input.primaryDestination.lastTestedAt &&
      !input.policy.skipTestAcknowledged
    ) {
      return "configured_but_untested";
    }
    if (input.primaryDestination) return "setup_incomplete";
    return "not_set_up";
  }

  if (input.primaryDestination?.paused) {
    return "paused_after_failures";
  }

  if (
    input.primaryDestination &&
    (input.primaryDestination.verificationStatus === "FAILED" ||
      input.primaryDestination.verificationStatus === "REVOKED" ||
      !input.primaryDestination.enabled)
  ) {
    return "needs_attention";
  }

  if (input.policy.mode === "DIRECT_EXTERNAL") {
    return "direct_external_replies";
  }

  if (input.policy.mode === "TAP_INBOX") {
    return "tapinbox_active";
  }

  if (input.runtimeMode === "local_mock") return "local_mock";
  if (input.runtimeMode === "provider_test") return "provider_test";

  if (
    input.policy.mode === "TAP_ROUTE_EXTERNAL" ||
    input.policy.mode === "CONNECTED_DESTINATION"
  ) {
    if (!(input.liveCampaignSendingEnabled ?? false)) {
      if (input.runtimeMode === "live_ready") {
        return "live_ready_campaign_sending_disabled";
      }
    }
    return "routing_with_limited_visibility";
  }

  return "ready";
}

export function cardStateHostLabel(state: IntegrationCardState): string {
  switch (state) {
    case "not_set_up":
      return "Not set up";
    case "setup_incomplete":
      return "Setup incomplete";
    case "destination_awaiting_verification":
      return "Destination awaiting verification";
    case "configured_but_untested":
      return "Configured but untested";
    case "ready":
      return "Ready";
    case "routing_with_limited_visibility":
      return "Routing with limited visibility";
    case "tapinbox_active":
      return `${TAP_INBOX_NAME} active`;
    case "direct_external_replies":
      return "Direct external replies";
    case "paused_after_failures":
      return "Paused after failures";
    case "needs_attention":
      return "Needs attention";
    case "provider_not_configured":
      return "Provider not configured";
    case "local_mock":
      return "Local mock";
    case "provider_test":
      return "Provider test";
    case "live_ready_campaign_sending_disabled":
      return "Live ready, but Campaign sending disabled";
  }
}

export function pausedFailureHostMessage(failureCount: number): string {
  return `Reply routing paused because the destination rejected ${failureCount} attempts.`;
}

export type CollapsedCardSummary = {
  productName: typeof EMAIL_REPLIES_PRODUCT_NAME;
  emailDelivery: {
    label: string;
    detail: string;
  };
  customerReplies: {
    label: string;
    detail: string;
  };
  destination?: { label: string; detail: string };
  tapVisibility: string;
  followUpTracking: string;
  state: IntegrationCardState;
  stateLabel: string;
  actions: Array<"set_up" | "manage" | "send_test" | "view_routing_activity">;
};

export function buildCollapsedCardSummary(input: {
  state: IntegrationCardState;
  mode?: ReplyHandlingMode | null;
  destinationName?: string | null;
  destinationAddress?: string | null;
  providerConfigured: boolean;
  runtimeMode: RuntimeDeliveryMode;
}): CollapsedCardSummary {
  const stateLabel = cardStateHostLabel(input.state);
  const emailDetail = !input.providerConfigured
    ? input.runtimeMode === "local_mock"
      ? "Local mock · no external send"
      : "Provider not configured"
    : `${TAPCONNECT_EMAIL_NAME} · ${RESEND_PROVIDER_DISCLOSURE}`;

  let repliesDetail = "Not set up";
  let tapVisibility = "—";
  let followUp = "—";

  switch (input.mode) {
    case "TAP_ROUTE_EXTERNAL":
    case "CONNECTED_DESTINATION":
      repliesDetail = input.destinationName
        ? `Routed to ${input.destinationName}`
        : "Routed externally";
      tapVisibility = "Initial reply and successful handoff";
      followUp = "Managed externally";
      break;
    case "TAP_INBOX":
      repliesDetail = `${TAP_INBOX_NAME}`;
      tapVisibility = "Full conversation in TapConnect";
      followUp = `Managed in ${TAP_INBOX_NAME}`;
      break;
    case "DIRECT_EXTERNAL":
      repliesDetail = "Directly outside TapConnect";
      tapVisibility = "Delivery and conversion only";
      followUp = "Not tracked by TapConnect";
      break;
  }

  const actions: CollapsedCardSummary["actions"] = [];
  if (
    input.state === "not_set_up" ||
    input.state === "setup_incomplete" ||
    input.state === "destination_awaiting_verification" ||
    input.state === "configured_but_untested"
  ) {
    actions.push("set_up");
  } else {
    actions.push("manage");
  }
  if (
    input.state === "ready" ||
    input.state === "routing_with_limited_visibility" ||
    input.state === "tapinbox_active" ||
    input.state === "local_mock" ||
    input.state === "provider_test" ||
    input.state === "live_ready_campaign_sending_disabled" ||
    input.state === "configured_but_untested"
  ) {
    actions.push("send_test");
    actions.push("view_routing_activity");
  }
  if (input.state === "paused_after_failures" || input.state === "needs_attention") {
    actions.push("manage");
    actions.push("send_test");
  }

  return {
    productName: EMAIL_REPLIES_PRODUCT_NAME,
    emailDelivery: {
      label: "Email delivery",
      detail: emailDetail.includes(TAPCONNECT_EMAIL_NAME)
        ? `${TAPCONNECT_EMAIL_NAME} · Ready`
        : emailDetail,
    },
    customerReplies: { label: "Customer replies", detail: repliesDetail },
    destination:
      input.destinationAddress || input.destinationName
        ? {
            label: "Destination",
            detail: input.destinationAddress ?? input.destinationName ?? "",
          }
        : undefined,
    tapVisibility,
    followUpTracking: followUp,
    state: input.state,
    stateLabel,
    actions: Array.from(new Set(actions)),
  };
}
