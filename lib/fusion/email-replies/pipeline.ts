/**
 * Inbound → route pipeline (provider-neutral, durable store).
 */

import { classifyReplyText } from "./classify";
import { createReplyEvidence } from "./evidence";
import { buildNormalizedHandoff } from "./handoff";
import { isAutoResponder, isForwardingLoop } from "./loop-protection";
import {
  detectUntrustedOperationalInstructions,
  evaluateAttachmentMeta,
  normalizeInboundBody,
} from "./normalize";
import { resolveReplyPolicy, parseCampaignReplyOverride } from "./policy";
import {
  adapterForwardReceived,
  adapterGetReceivedEmail,
  adapterSendTransactional,
  getReceivingSubdomain,
  resolveResendAdapterReadiness,
} from "./providers/resend-adapter";
import { parseReplyAliasAddress, evaluateReplyAlias } from "./reply-alias";
import { buildIdempotencyKey, selectRouteDestination } from "./routing";
import type { EmailRepliesStore } from "./store";
import { requireEmailRepliesStore } from "./store-resolve";
import { retainInboundReplyInTapInbox } from "./tapinbox-retain";
import { shouldPauseAfterFailures } from "./verification";
import type {
  CampaignReplyHandlingOverride,
  ReplyMessageCategory,
} from "./types";

export type PipelineResult = {
  ok: boolean;
  duplicate?: boolean;
  skipped?: boolean;
  reason?: string;
  initialMessageId?: string;
  threadId?: string;
  inboxMessageId?: string;
  routingStatus?: string;
  mock?: boolean;
  retainedInTap?: boolean;
  decisionQueueSuggested?: boolean;
};

async function retainTapCopy(input: {
  businessId: string;
  fromAddress: string;
  subject?: string | null;
  body: string;
  contactId?: string | null;
  relationshipId?: string | null;
  campaignId?: string | null;
  providerMessageId?: string | null;
  internetMessageId?: string | null;
  inReplyTo?: string | null;
  referencesHeader?: string | null;
  replyAlias?: string | null;
  attachmentMetadata?: unknown;
  classification?: string | null;
  urgency?: string | null;
  /** When false, skip MessageThread write (memory unit tests without DB) */
  writeTapInbox: boolean;
}): Promise<{ threadId?: string; inboxMessageId?: string; error?: string }> {
  if (!input.writeTapInbox) {
    return {};
  }
  const retained = await retainInboundReplyInTapInbox({
    businessId: input.businessId,
    fromAddress: input.fromAddress,
    subject: input.subject || "(no subject)",
    body: input.body,
    contactId: input.contactId,
    relationshipId: input.relationshipId,
    campaignId: input.campaignId,
    provider: "email_inbound_reply",
    providerMessageId: input.providerMessageId,
    internetMessageId: input.internetMessageId,
    inReplyTo: input.inReplyTo,
    referencesHeader: input.referencesHeader,
    replyAlias: input.replyAlias,
    attachmentMetadata: input.attachmentMetadata,
    classification: input.classification,
    urgency: input.urgency,
  });
  if (!retained.ok) return { error: retained.error };
  return { threadId: retained.threadId, inboxMessageId: retained.messageId };
}

export async function processInboundEmailReceived(input: {
  eventId: string;
  emailId: string;
  store?: EmailRepliesStore;
  campaignOverride?: CampaignReplyHandlingOverride | null;
  locationId?: string | null;
  tapOutboundAddresses?: string[];
  forceRouteFailure?: boolean;
  /** Override: write TapInbox only when durable prisma (default) or forced */
  writeTapInbox?: boolean;
}): Promise<PipelineResult> {
  const store = input.store ?? (await requireEmailRepliesStore());
  const writeTapInbox =
    input.writeTapInbox ?? store.kind === "prisma";

  const claim = await store.claimProviderEvent({
    provider: "resend",
    eventId: input.eventId,
    eventType: "email.received",
    receivedEmailId: input.emailId,
  });
  if (!claim.created) {
    return { ok: true, duplicate: true, reason: "Duplicate provider event" };
  }

  // Also block duplicate received email id → second initial message
  const existingByEmail = await store.findInitialReplyByProviderMessage(
    "resend",
    input.emailId
  );
  if (existingByEmail) {
    await store.updateProviderEventState(
      "resend",
      input.eventId,
      "duplicate_email"
    );
    return {
      ok: true,
      duplicate: true,
      reason: "Duplicate received Email ID",
      initialMessageId: existingByEmail.id,
      threadId: existingByEmail.threadId ?? undefined,
      inboxMessageId: existingByEmail.inboxMessageId ?? undefined,
    };
  }

  const retrieved = await adapterGetReceivedEmail(input.emailId);
  if (!retrieved.ok) {
    await store.updateProviderEventState(
      "resend",
      input.eventId,
      "retrieve_failed",
      retrieved.error
    );
    return { ok: false, reason: retrieved.error, mock: retrieved.mock };
  }

  const email = retrieved.email;
  const toList = email.to ?? [];
  const aliasParse = toList.map(parseReplyAliasAddress).find((p) => p.ok);

  let businessId: string | null = null;
  let campaignId: string | null = null;
  let contactId: string | null = null;
  let relationshipId: string | null = null;
  let replyAlias: string | null = null;
  let destinationHint: string | null = null;
  let aliasId: string | null = null;

  if (aliasParse && aliasParse.ok) {
    replyAlias = `reply+${aliasParse.token}@${aliasParse.domain}`;
    const alias = await store.getAliasByToken(aliasParse.token);
    const evalAlias = evaluateReplyAlias({ alias });
    if (!evalAlias.ok) {
      await store.updateProviderEventState(
        "resend",
        input.eventId,
        "alias_invalid"
      );
      return {
        ok: false,
        reason: `Alias ${evalAlias.code}`,
        mock: retrieved.mock,
      };
    }
    businessId = alias!.businessId;
    campaignId = alias!.campaignId ?? null;
    contactId = alias!.contactId ?? null;
    relationshipId = alias!.relationshipId ?? null;
    destinationHint = alias!.destinationId ?? null;
    aliasId = alias!.id;
    await store.claimProviderEvent({
      provider: "resend",
      eventId: input.eventId,
      eventType: "email.received",
      receivedEmailId: input.emailId,
      businessId,
    });
  }

  if (!businessId) {
    await store.updateProviderEventState(
      "resend",
      input.eventId,
      "context_incomplete"
    );
    return {
      ok: false,
      reason: "Incomplete reply context — safe fallback, not routed",
      mock: retrieved.mock,
    };
  }

  const headers = email.headers ?? {};
  if (
    isAutoResponder({
      from: email.from,
      subject: email.subject,
      headers,
    })
  ) {
    await store.updateProviderEventState(
      "resend",
      input.eventId,
      "skipped_autoreply"
    );
    return {
      ok: true,
      skipped: true,
      reason: "Auto-responder skipped",
      mock: retrieved.mock,
    };
  }

  const subdomain = getReceivingSubdomain() ?? "reply.tapconnect.local";
  const outbound = (
    input.tapOutboundAddresses ?? [
      process.env.RESEND_FROM_EMAIL?.trim() ?? "",
      `noreply@${subdomain}`,
    ]
  ).filter(Boolean);

  const loop = isForwardingLoop({
    from: email.from,
    toAddresses: toList,
    replyAlias,
    tapOutboundAddresses: outbound,
  });
  if (loop.loop) {
    await store.updateProviderEventState("resend", input.eventId, "loop_blocked");
    return {
      ok: true,
      skipped: true,
      reason: loop.reason,
      mock: retrieved.mock,
    };
  }

  const { normalizedText, sanitizedHtml } = normalizeInboundBody({
    text: email.text,
    html: email.html,
  });
  const untrusted = detectUntrustedOperationalInstructions(normalizedText);
  const classification = classifyReplyText(normalizedText);
  const attachmentMeta = (email.attachments ?? []).map((a) =>
    evaluateAttachmentMeta({
      id: a.id,
      filename: a.filename,
      contentType: a.content_type,
      size: a.size,
    })
  );

  const businessPolicy = await store.getPolicy(businessId);
  const locationPolicy = input.locationId
    ? await store.getPolicy(businessId, input.locationId)
    : null;
  const policy = resolveReplyPolicy({
    businessId,
    locationId: input.locationId,
    campaignId,
    businessPolicy,
    locationPolicy,
    campaignOverride:
      input.campaignOverride ?? parseCampaignReplyOverride(null),
  });

  const internetMessageId =
    headers["message-id"] ?? headers["Message-ID"] ?? email.message_id ?? null;
  const inReplyTo = headers["in-reply-to"] ?? headers["In-Reply-To"] ?? null;
  const referencesHeader =
    headers["references"] ?? headers["References"] ?? null;

  const initial = await store.saveInitialReply({
    businessId,
    locationId: input.locationId ?? null,
    contactId,
    relationshipId,
    campaignId,
    aliasId,
    provider: "resend",
    providerMessageId: email.id,
    internetMessageId,
    inReplyTo,
    referencesHeader,
    fromAddress: email.from,
    toAddress: toList[0] ?? "",
    replyAlias,
    subject: email.subject,
    normalizedText,
    sanitizedHtmlRef: sanitizedHtml ? "inline_sanitized" : null,
    attachmentMetadata: attachmentMeta,
    classification: classification.category,
    urgency: classification.urgency,
    routingState: "CONTEXT_MATCHED",
    receivedAt: new Date().toISOString(),
  });

  await store.addEvidence(
    createReplyEvidence({
      kind: "reply_received",
      businessId,
      campaignId,
      contactId,
      relationshipId,
      providerReference: email.id,
      success: true,
      detail: untrusted.containsInstructions
        ? "Untrusted operational phrases detected — not executed"
        : undefined,
    })
  );
  await store.addEvidence(
    createReplyEvidence({
      kind: "reply_context_matched",
      businessId,
      campaignId,
      contactId,
      success: true,
    })
  );

  if (policy.mode === "DIRECT_EXTERNAL") {
    await store.updateInitialReplyLinks({
      id: initial.id,
      businessId,
      routingState: "SKIPPED_DIRECT",
    });
    await store.updateProviderEventState(
      "resend",
      input.eventId,
      "direct_external"
    );
    return {
      ok: true,
      skipped: true,
      reason:
        "Direct external mode — Tap does not receive customer replies for routing",
      initialMessageId: initial.id,
      mock: retrieved.mock,
    };
  }

  const primary = policy.primaryDestinationId
    ? await store.getDestination(policy.primaryDestinationId)
    : destinationHint
      ? await store.getDestination(destinationHint)
      : null;
  const fallback = policy.fallbackDestinationId
    ? await store.getDestination(policy.fallbackDestinationId)
    : null;

  const selection = selectRouteDestination({
    policy,
    category: classification.category as ReplyMessageCategory,
    primary,
    fallback,
  });

  if (!selection.ok) {
    await store.updateProviderEventState(
      "resend",
      input.eventId,
      "route_unavailable"
    );
    return {
      ok: false,
      reason: selection.reason,
      initialMessageId: initial.id,
      decisionQueueSuggested: true,
      mock: retrieved.mock,
    };
  }

  const dest = selection.destination;
  const retainArgs = {
    businessId,
    fromAddress: email.from,
    subject: email.subject,
    body: normalizedText,
    contactId,
    relationshipId,
    campaignId,
    providerMessageId: email.id,
    internetMessageId,
    inReplyTo,
    referencesHeader,
    replyAlias,
    attachmentMetadata: attachmentMeta,
    classification: classification.category,
    urgency: classification.urgency,
    writeTapInbox,
  };

  if (dest.destinationType === "TAP_INBOX" || selection.role === "tapinbox") {
    const retained = await retainTapCopy(retainArgs);
    await store.updateInitialReplyLinks({
      id: initial.id,
      businessId,
      threadId: retained.threadId ?? null,
      inboxMessageId: retained.inboxMessageId ?? null,
      routingDestinationId: dest.id,
      routingState: "RETAINED_IN_TAP",
    });
    await store.addEvidence(
      createReplyEvidence({
        kind: "reply_retained_in_tap",
        businessId,
        campaignId,
        destinationType: "TAP_INBOX",
        destinationReference: dest.id,
        success: true,
      })
    );
    await store.updateProviderEventState(
      "resend",
      input.eventId,
      "retained_tapinbox"
    );
    return {
      ok: true,
      initialMessageId: initial.id,
      threadId: retained.threadId,
      inboxMessageId: retained.inboxMessageId,
      routingStatus: "RETAINED_IN_TAP",
      retainedInTap: true,
      mock: retrieved.mock,
    };
  }

  const idempotencyKey = buildIdempotencyKey({
    providerMessageId: email.id,
    destinationId: dest.id,
    attemptNumber: 1,
  });

  const handoff = buildNormalizedHandoff({
    customerEmail: email.from,
    campaignTitle: campaignId ?? undefined,
    classification: classification.category,
    urgency: classification.urgency,
    receivedAt: initial.receivedAt,
    safeText: normalizedText,
    attachmentSummaries: attachmentMeta
      .filter((a) => a.allowed)
      .map((a) => a.filename),
  });

  let sendOk = !input.forceRouteFailure;
  let providerRef: string | undefined;
  let mock = retrieved.mock;
  const readiness = resolveResendAdapterReadiness();
  const handoffKind = mock || !readiness.configured ? "local_mock" : "provider";

  if (sendOk) {
    if (dest.normalizedAddress && dest.destinationType === "EMAIL_ADDRESS") {
      if (readiness.configured && !retrieved.mock) {
        const fwd = await adapterForwardReceived({
          emailId: email.id,
          to: dest.normalizedAddress,
          from: process.env.RESEND_FROM_EMAIL?.trim() || `handoff@${subdomain}`,
          idempotencyKey,
          normalized: { text: handoff.text, html: handoff.html },
        });
        sendOk = fwd.ok;
        providerRef = fwd.ok ? fwd.id : undefined;
        mock = fwd.ok ? fwd.mock : false;
        if (!fwd.ok) {
          const tx = await adapterSendTransactional({
            to: dest.normalizedAddress,
            subject: handoff.subject,
            html: handoff.html,
            text: handoff.text,
            idempotencyKey: `${idempotencyKey}:tx`,
          });
          sendOk = tx.ok;
          providerRef = tx.ok ? tx.id : undefined;
          mock = tx.mock;
        }
      } else {
        const tx = await adapterSendTransactional({
          to: dest.normalizedAddress,
          subject: handoff.subject,
          html: handoff.html,
          text: handoff.text,
          forceMock: true,
          idempotencyKey,
        });
        sendOk = tx.ok;
        providerRef = tx.ok ? tx.id : undefined;
        mock = true;
      }
    } else {
      sendOk = true;
      providerRef = `handoff_event_${Date.now().toString(36)}`;
      mock = true;
    }
  }

  const attempt = await store.saveRoutingAttempt({
    businessId,
    initialMessageId: initial.id,
    destinationId: dest.id,
    attemptNumber: 1,
    status: sendOk ? "success" : "failure",
    idempotencyKey,
    providerRef,
    errorMessage: sendOk ? null : "Route failed",
    handoffKind,
  });

  if (!attempt.created) {
    return {
      ok: true,
      duplicate: true,
      reason: "Duplicate forward idempotency",
      initialMessageId: initial.id,
      mock,
    };
  }

  if (sendOk) {
    await store.markDestinationTested(dest.id, "success");
    let retainedInTap = false;
    let threadId: string | undefined;
    let inboxMessageId: string | undefined;
    if (policy.keepCopyInTap || dest.keepCopyInTap) {
      const retained = await retainTapCopy(retainArgs);
      threadId = retained.threadId;
      inboxMessageId = retained.inboxMessageId;
      retainedInTap = true;
      await store.addEvidence(
        createReplyEvidence({
          kind: "reply_retained_in_tap",
          businessId,
          campaignId,
          destinationType: dest.destinationType,
          success: true,
        })
      );
    }
    await store.updateInitialReplyLinks({
      id: initial.id,
      businessId,
      threadId: threadId ?? null,
      inboxMessageId: inboxMessageId ?? null,
      routingDestinationId: dest.id,
      routingState: "ROUTED",
      externalReference: providerRef ?? null,
    });
    await store.addEvidence(
      createReplyEvidence({
        kind: "reply_routed",
        businessId,
        campaignId,
        contactId,
        destinationType: dest.destinationType,
        destinationReference: dest.id,
        providerReference: providerRef,
        success: true,
      })
    );
    await store.updateProviderEventState("resend", input.eventId, "routed");
    return {
      ok: true,
      initialMessageId: initial.id,
      threadId,
      inboxMessageId,
      routingStatus: "ROUTED",
      retainedInTap,
      mock,
    };
  }

  const failed = await store.recordRouteFailure(
    dest.id,
    "Reply routing paused because the destination rejected three attempts."
  );
  await store.updateInitialReplyLinks({
    id: initial.id,
    businessId,
    routingDestinationId: dest.id,
    routingState: "ROUTE_FAILED",
  });
  await store.addEvidence(
    createReplyEvidence({
      kind: "reply_route_failed",
      businessId,
      campaignId,
      destinationType: dest.destinationType,
      destinationReference: dest.id,
      success: false,
      detail: "Routing failed",
    })
  );
  if (failed?.paused) {
    await store.addEvidence(
      createReplyEvidence({
        kind: "destination_paused",
        businessId,
        destinationType: dest.destinationType,
        destinationReference: dest.id,
        success: false,
        detail: failed.pausedReason ?? undefined,
      })
    );
  }

  let retainedInTap = false;
  let threadId: string | undefined;
  let inboxMessageId: string | undefined;
  if (policy.useTapInboxFallback) {
    const retained = await retainTapCopy(retainArgs);
    threadId = retained.threadId;
    inboxMessageId = retained.inboxMessageId;
    retainedInTap = true;
    await store.updateInitialReplyLinks({
      id: initial.id,
      businessId,
      threadId: threadId ?? null,
      inboxMessageId: inboxMessageId ?? null,
      routingState: "RETAINED_IN_TAP",
    });
    await store.addEvidence(
      createReplyEvidence({
        kind: "reply_retained_in_tap",
        businessId,
        campaignId,
        success: true,
        detail: "Fallback after route failure",
      })
    );
  }

  await store.updateProviderEventState("resend", input.eventId, "route_failed");
  return {
    ok: false,
    reason: "Route failed",
    initialMessageId: initial.id,
    threadId,
    inboxMessageId,
    routingStatus: "ROUTE_FAILED",
    retainedInTap,
    decisionQueueSuggested: true,
    mock,
  };
}

export function pauseReasonForFailures(count: number): string | null {
  return shouldPauseAfterFailures(count)
    ? `Reply routing paused because the destination rejected ${count} attempts.`
    : null;
}
