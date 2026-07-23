/**
 * Email send via mock adapter — always enqueues outbox event.
 * Respects Channel Guardian + suppression unless skipGuardian.
 * Real Resend path only when credentials present AND feature allows.
 */

import { evaluateChannelGuardian, type GuardianPurpose } from "./channel-guardian";
import { isAddressSuppressed } from "./suppression";
import { isFeatureEnabled } from "@/lib/fusion/features";
import { createGovernedEvent, enqueueOutboxSync } from "@/lib/fusion/publication/events";
import { listEmailProviderReadiness } from "./email-readiness";

export type EmailSendResult =
  | { ok: true; providerRef: string; mock: boolean }
  | { ok: false; code: string; error: string };

export async function sendEmailViaMock(input: {
  businessId: string;
  to: string;
  subject: string;
  body: string;
  purpose?: GuardianPurpose;
  consentGiven?: boolean;
  skipGuardian?: boolean;
  featureEnabled?: boolean;
  quietHours?: { start: string; end: string; timezone: string };
  now?: Date;
}): Promise<EmailSendResult> {
  const featureOn =
    input.featureEnabled ?? isFeatureEnabled("comms.email", {});
  if (!featureOn) {
    return { ok: false, code: "feature_off", error: "comms.email feature is disabled" };
  }

  const to = input.to?.trim();
  if (!to) {
    return { ok: false, code: "missing_recipient", error: "Recipient address is required" };
  }
  if (!input.subject?.trim()) {
    return { ok: false, code: "channel_blocked", error: "Subject is required" };
  }
  if (!input.body?.trim()) {
    return { ok: false, code: "channel_blocked", error: "Body is required" };
  }

  const suppressed = await isAddressSuppressed({
    businessId: input.businessId,
    channel: "email",
    address: to,
  });

  if (!input.skipGuardian) {
    const readiness = listEmailProviderReadiness();
    const guardian = evaluateChannelGuardian({
      channel: "email",
      businessId: input.businessId,
      recipientId: to,
      purpose: input.purpose ?? "promo",
      consentGiven: input.consentGiven,
      suppressed,
      quietHours: input.quietHours,
      now: input.now,
      featureEnabled: true,
      // Mock path is always "provider ready"; label mock vs live separately
      providerReady: true,
      planAllows: true,
    });
    if (!guardian.allowed) {
      return { ok: false, code: guardian.code, error: guardian.reason };
    }
    void readiness;
  } else if (suppressed) {
    return { ok: false, code: "suppressed", error: "Address is on suppression list" };
  }

  const readiness = listEmailProviderReadiness();
  const live = readiness.ready;
  const providerRef = live
    ? `resend_pending_${Date.now()}`
    : `mock_email_${Date.now().toString(36)}`;

  enqueueOutboxSync(
    "email.send",
    createGovernedEvent({
      name: "email.outbound.queued",
      businessId: input.businessId,
      aggregateType: "email",
      aggregateId: providerRef,
      correlationId: crypto.randomUUID(),
      payload: {
        to,
        subject: input.subject.trim(),
        bodyPreview: input.body.slice(0, 200),
        mock: !live,
        purpose: input.purpose ?? "promo",
      },
    })
  );

  return { ok: true, providerRef, mock: !live };
}
