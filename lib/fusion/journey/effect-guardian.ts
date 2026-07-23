/**
 * TapFlow effect Guardian pre-check — deterministic gate before queueing outbox effects.
 * Pure function; wraps evaluateChannelGuardian for email/message tapflow.effect.* topics.
 */

import {
  evaluateChannelGuardian,
  type GuardianContext,
  type GuardianDecision,
  type MessageChannel,
} from "@/lib/fusion/comms/channel-guardian";
import type { VisitorContext } from "./runtime";

export type TapFlowEffectAction =
  | "email"
  | "message"
  | "award_loyalty"
  | "create_case"
  | "human_handoff";

export type TapFlowEffectPrecheckInput = {
  action: string;
  visitor: VisitorContext;
  /** message node channel override */
  channel?: string;
  requireMarketingConsent?: boolean;
  purpose?: GuardianContext["purpose"];
  suppressed?: boolean;
  featureEnabled?: boolean;
  providerReady?: boolean;
  planAllows?: boolean;
  recipientId?: string;
  quietHours?: GuardianContext["quietHours"];
  now?: Date;
};

export type TapFlowEffectPrecheckResult = {
  /** Whether the effect may be enqueued on outbox */
  queue: boolean;
  blocked: boolean;
  topic: string | null;
  guardian: GuardianDecision | null;
  reason: string;
};

const QUEUEABLE: TapFlowEffectAction[] = [
  "email",
  "message",
  "award_loyalty",
  "create_case",
  "human_handoff",
];

function isQueueableAction(action: string): action is TapFlowEffectAction {
  return (QUEUEABLE as string[]).includes(action);
}

function resolveMessageChannel(raw?: string): MessageChannel {
  const c = (raw ?? "email").toLowerCase();
  if (c === "sms") return "sms";
  if (c === "whatsapp") return "whatsapp";
  if (c === "messenger") return "messenger";
  if (c === "instagram" || c === "instagram_dm") return "instagram_dm";
  if (c === "telegram") return "telegram";
  if (c === "manychat") return "manychat";
  return "email";
}

function consentForChannel(
  channel: MessageChannel,
  visitor: VisitorContext,
  requireMarketing: boolean
): boolean | undefined {
  if (channel === "email") {
    return Boolean(visitor.consent?.email || visitor.consent?.marketing);
  }
  if (requireMarketing) {
    return visitor.consent?.marketing;
  }
  return visitor.consent?.email ?? visitor.consent?.marketing;
}

/**
 * Guardian pre-check before enqueueing tapflow.effect.* outbox records.
 * Non-messaging effects (loyalty, case, handoff) pass through when feature allows.
 */
export function precheckTapFlowEffect(
  input: TapFlowEffectPrecheckInput
): TapFlowEffectPrecheckResult {
  if (!isQueueableAction(input.action)) {
    return {
      queue: false,
      blocked: false,
      topic: null,
      guardian: null,
      reason: "Not a queueable TapFlow effect",
    };
  }

  const topic = `tapflow.effect.${input.action}`;

  if (input.action === "award_loyalty" || input.action === "create_case" || input.action === "human_handoff") {
    if (input.featureEnabled === false) {
      return {
        queue: false,
        blocked: true,
        topic,
        guardian: {
          allowed: false,
          code: "feature_off",
          reason: "TapFlow effects feature disabled",
        },
        reason: "TapFlow effects feature disabled",
      };
    }
    return {
      queue: true,
      blocked: false,
      topic,
      guardian: { allowed: true, code: "ok", reason: "Non-messaging effect eligible" },
      reason: "Non-messaging effect eligible",
    };
  }

  const channel =
    input.action === "email" ? "email" : resolveMessageChannel(input.channel);
  const requireMarketing =
    input.requireMarketingConsent === true || input.action === "message";
  const consentGiven = consentForChannel(channel, input.visitor, requireMarketing);

  const guardian = evaluateChannelGuardian({
    channel,
    purpose: input.purpose ?? "promo",
    consentGiven,
    suppressed: input.suppressed,
    featureEnabled: input.featureEnabled ?? true,
    providerReady: input.providerReady ?? true,
    planAllows: input.planAllows ?? true,
    recipientId: input.recipientId ?? input.visitor.visitorId,
    quietHours: input.quietHours,
    now: input.now,
  });

  if (!guardian.allowed) {
    return {
      queue: false,
      blocked: true,
      topic,
      guardian,
      reason: guardian.reason,
    };
  }

  return {
    queue: true,
    blocked: false,
    topic,
    guardian,
    reason: guardian.reason,
  };
}
