/**
 * Inbox reply pre-checks — pure eligibility before Guardian + provider I/O.
 */

import type { GuardianPurpose } from "../comms/channel-guardian";

export type ThreadStatus = "OPEN" | "PENDING" | "CLOSED";

export function canReopenThread(status: ThreadStatus): boolean {
  return status === "CLOSED";
}

export function evaluateReplyEligibility(input: {
  threadStatus: ThreadStatus;
  featureEnabled: boolean;
  body: string;
  purpose?: GuardianPurpose;
}): { ok: true } | { ok: false; code: string; error: string } {
  if (!input.featureEnabled) {
    return { ok: false, code: "feature_off", error: "Messaging/email feature disabled" };
  }
  if (input.threadStatus === "CLOSED") {
    return { ok: false, code: "thread_closed", error: "Thread is closed" };
  }
  if (!input.body.trim()) {
    return { ok: false, code: "empty_body", error: "Reply body is required" };
  }
  return { ok: true };
}
