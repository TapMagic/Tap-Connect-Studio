/**
 * Human labels for Channel Guardian — operator language first.
 * Technical codes stay behind View details.
 */

import type { GuardianDecision } from "../comms/channel-guardian";
import type { ThreadStatus } from "./reply-eligibility";
import { evaluateReplyEligibility } from "./reply-eligibility";

type GuardianCode = GuardianDecision["code"];

const GUARDIAN_LABELS: Record<GuardianCode, string> = {
  ok: "Ready to send",
  feature_off: "Messaging is turned off for this workspace",
  provider_missing: "Email or messaging isn’t connected yet",
  no_consent: "Customer hasn’t agreed to receive this type of message",
  quiet_hours: "Outside the customer’s preferred hours",
  channel_blocked: "This channel isn’t available for this customer",
  missing_recipient: "No email or phone on file",
  suppressed: "This address asked not to be contacted",
  plan_blocked: "Your plan doesn’t include this send",
  frequency: "Too many recent messages — wait before sending again",
  window_closed: "The provider conversation window has closed",
  template_required: "A approved template is required for this send",
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

export const PURPOSE_OPTIONS = [
  {
    id: "support" as const,
    label: "Support reply",
    help: "Answer a question or help with an issue the customer raised.",
  },
  {
    id: "service" as const,
    label: "Service update",
    help: "Transactional update about an order, booking, or account.",
  },
  {
    id: "promo" as const,
    label: "Marketing / promo",
    help: "Offers or news — only when the customer opted in for marketing.",
  },
];

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
      hint: "This conversation is closed. Reopen it or start a new one to reply.",
    };
  }

  if (!input.featureEnabled) {
    return {
      allowed: false,
      code: "feature_off",
      hint: "Inbox messaging isn’t enabled for this workspace yet.",
    };
  }

  if (!eligibility.ok && eligibility.code === "empty_body") {
    return {
      allowed: true,
      code: "empty_body",
      hint: "Write your reply. We’ll check communication preferences before sending.",
    };
  }

  return {
    allowed: true,
    hint: "We’ll check this reply against the customer’s communication preferences before sending.",
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
