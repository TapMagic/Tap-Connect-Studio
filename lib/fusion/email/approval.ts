/**
 * Local email draft approval — no live send.
 */

import type { EmailDocument } from "./document";
import { serializeEmailDocument } from "./document";

export type EmailApprovalAction = "approve" | "reject" | "reopen";

export function approveEmailLocally(document: EmailDocument): EmailDocument {
  return serializeEmailDocument({
    ...document,
    approvalState: "approved",
    approvedAt: new Date().toISOString(),
  });
}

export function rejectEmailLocally(document: EmailDocument): EmailDocument {
  return serializeEmailDocument({
    ...document,
    approvalState: "rejected",
    approvedAt: null,
  });
}

export function reopenEmailDraft(document: EmailDocument): EmailDocument {
  return serializeEmailDocument({
    ...document,
    approvalState: "draft",
    approvedAt: null,
  });
}

export function emailApprovalHostMessage(document: EmailDocument): string {
  switch (document.approvalState) {
    case "approved":
      return "Your email is prepared and ready for final approval.";
    case "rejected":
      return "This email draft was rejected. Edit and review again when ready.";
    default:
      return "Save your draft, then review and approve locally when ready.";
  }
}

export function canLiveSend(): false {
  return false;
}
