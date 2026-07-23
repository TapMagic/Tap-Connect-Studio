/**
 * Human labels for Channel Guardian codes — Inbox reply UX.
 */

import type { GuardianDecision } from "../comms/channel-guardian";
import type { ThreadStatus } from "./reply-eligibility";
import { evaluateReplyEligibility } from "./reply-eligibility";

type GuardianCode = GuardianDecision["code"];

const GUARDIAN_LABELS: Record<GuardianCode, string> = {
  ok: "Guardian cleared",
  feature_off: "Messaging disabled",
  provider_missing: "Provider not ready",
  no_consent: "Consent required",
  quiet_hours: "Quiet hours",
  channel_blocked: "Channel blocked",
  missing_recipient: "Missing recipient",
  suppressed: "Suppressed address",
  plan_blocked: "Plan blocked",
  frequency: "Frequency cap",
  window_closed: "Provider window closed",
  template_required: "Template required",
};

export function labelGuardianCode(code: string | null | undefined): string {
  if (!code) return "—";
  return GUARDIAN_LABELS[code as GuardianCode] ?? code;
}

export function guardianReplyBlockedMessage(input: {
  code: string;
  error?: string;
  reason?: string;
}): string {
  const label = labelGuardianCode(input.code);
  const detail = input.error ?? input.reason;
  if (detail && detail !== label) {
    return `${label}: ${detail}`;
  }
  return label;
}

export function replyComposerState(input: {
  threadStatus: ThreadStatus;
  featureEnabled: boolean;
  body?: string;
}): {
  allowed: boolean;
  code?: string;
  hint: string;
} {
  const eligibility = evaluateReplyEligibility({
    threadStatus: input.threadStatus,
    featureEnabled: input.featureEnabled,
    body: input.body ?? "placeholder",
  });

  if (input.threadStatus === "CLOSED") {
    return {
      allowed: false,
      code: "thread_closed",
      hint: "Thread is closed — reopen or start a new thread to reply.",
    };
  }

  if (!input.featureEnabled) {
    return {
      allowed: false,
      code: "feature_off",
      hint: "Enable comms.inbox (and comms.email or comms.messaging) to send replies.",
    };
  }

  if (!eligibility.ok && eligibility.code === "empty_body") {
    return {
      allowed: false,
      code: "empty_body",
      hint: "Type a reply — Channel Guardian runs before send.",
    };
  }

  return {
    allowed: true,
    hint: "Support reply · consent assumed · Guardian enforced before provider send.",
  };
}

export function isGuardianBlockedMessage(message: {
  direction: string;
  provider: string;
  guardianCode: string | null;
}): boolean {
  return (
    message.direction === "SYSTEM" &&
    message.provider === "guardian" &&
    Boolean(message.guardianCode && message.guardianCode !== "ok")
  );
}
