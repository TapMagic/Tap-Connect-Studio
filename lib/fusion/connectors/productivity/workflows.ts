/**
 * TapConnect → Productivity & Work Management workflow bridges.
 * Creates ExternalWorkItem projections (mock until live OAuth).
 */

import { nanoid } from "nanoid";
import { createExternalWorkItem, postCollabAlert } from "./adapter";
import { getDefaultWorkProvider } from "./store";
import type { WorkBridgeSourceType, ExternalWorkItem } from "./types";
import type { WorkAdapterResult } from "./adapter";

function resolveProvider(businessId: string, provider?: string): string {
  return provider || getDefaultWorkProvider(businessId) || "monday";
}

export type BridgeInput = {
  businessId: string;
  title: string;
  description?: string;
  provider?: string;
  sourceId?: string;
  dueAt?: string | null;
  priority?: string;
  deepLinkBack?: string;
  notifyCollab?: boolean;
};

function bridge(
  sourceType: WorkBridgeSourceType,
  input: BridgeInput
): WorkAdapterResult<ExternalWorkItem> {
  const provider = resolveProvider(input.businessId, input.provider);
  const result = createExternalWorkItem({
    provider,
    businessId: input.businessId,
    title: input.title,
    description: input.description,
    priority: input.priority,
    dueAt: input.dueAt,
    sourceType,
    sourceId: input.sourceId,
    correlationId: nanoid(10),
    idempotencyKey: input.sourceId
      ? `${sourceType}:${input.sourceId}:${provider}`
      : undefined,
    deepLinkBack: input.deepLinkBack,
  });

  if (result.ok && input.notifyCollab) {
    postCollabAlert({
      businessId: input.businessId,
      provider: "slack",
      text: `${input.title} → ${provider}`,
      severity: "info",
      deepLink: result.data.url,
    });
  }

  return result;
}

export const workBridges = {
  tapCaseToTask: (input: BridgeInput) => bridge("tapcase", input),
  campaignApprovalToReviewTask: (input: BridgeInput) =>
    bridge("campaign_approval", input),
  agentFindingToTask: (input: BridgeInput) => bridge("agent_finding", input),
  providerFailureToIncident: (input: BridgeInput) => {
    const result = bridge("provider_failure", {
      ...input,
      priority: input.priority ?? "high",
      notifyCollab: true,
    });
    if (result.ok) {
      postCollabAlert({
        businessId: input.businessId,
        provider: "microsoft_teams",
        text: `Incident: ${input.title}`,
        severity: "critical",
        deepLink: result.data.url,
      });
    }
    return result;
  },
  tapPointFailureToServiceTask: (input: BridgeInput) =>
    bridge("tap_point_failure", { ...input, priority: input.priority ?? "high" }),
  inboxFollowUpToTask: (input: BridgeInput) => bridge("inbox_followup", input),
  bookingOrderToChecklist: (input: BridgeInput) =>
    bridge("booking_order", input),
  loyaltyCommerceExceptionToReview: (input: BridgeInput) =>
    bridge("loyalty_commerce_exception", {
      ...input,
      priority: input.priority ?? "high",
    }),
  manualCreate: (input: BridgeInput) => bridge("manual", input),
};

/** Map inbound provider status/comment into authorized TapConnect activity payload */
export function mapExternalActivityToTapConnect(opts: {
  businessId: string;
  workItemId: string;
  kind: "status_change" | "comment" | "completed";
  message: string;
  actorExternalId?: string;
}) {
  return {
    businessId: opts.businessId,
    workItemId: opts.workItemId,
    kind: opts.kind,
    message: opts.message,
    actorExternalId: opts.actorExternalId,
    authorized: true,
    recordedAt: new Date().toISOString(),
    note: "Activity mapped for TapConnect timeline — domain objects remain TapConnect-authoritative",
  };
}

/**
 * Completion on the external work platform → related TapConnect object update signal.
 * Does not mutate Cards/Campaigns directly here — emits an authorized activity for the owning surface.
 */
export function applyExternalCompletionToTapConnect(opts: {
  businessId: string;
  workItem: ExternalWorkItem;
}) {
  const activity = mapExternalActivityToTapConnect({
    businessId: opts.businessId,
    workItemId: opts.workItem.id,
    kind: "completed",
    message: `External work item completed: ${opts.workItem.title}`,
  });
  return {
    ...activity,
    sourceType: opts.workItem.sourceType,
    sourceId: opts.workItem.sourceId,
    provider: opts.workItem.provider,
    externalId: opts.workItem.externalId,
    tapConnectUpdate: {
      action: "mark_related_followup_complete",
      relatedObjectHint: opts.workItem.sourceType ?? "other",
      relatedObjectId: opts.workItem.sourceId ?? null,
      authority: "tapconnect_for_domain_objects",
      workItemAuthority: "provider_native_state",
    },
  };
}
