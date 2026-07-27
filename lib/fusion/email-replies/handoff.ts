/**
 * Normalized external handoff payload — safe for support inboxes / Monday intake.
 */

import type { ReplyMessageCategory } from "./types";

export type NormalizedHandoffPayload = {
  subject: string;
  text: string;
  html: string;
  labels: {
    source: string;
    category: string;
    receivedAt: string;
    visibilityBoundary: string;
  };
};

export function buildNormalizedHandoff(input: {
  customerDisplay?: string | null;
  customerEmail?: string | null;
  campaignTitle?: string | null;
  originatingSubject?: string | null;
  classification: ReplyMessageCategory;
  urgency: string;
  receivedAt: string;
  safeText: string;
  recordLink?: string | null;
  attachmentSummaries?: string[];
  isTest?: boolean;
}): NormalizedHandoffPayload {
  const who =
    input.customerDisplay ||
    input.customerEmail ||
    "Customer";
  const campaign = input.campaignTitle || "Campaign";
  const testPrefix = input.isTest ? "[TEST] " : "";
  const subject = `${testPrefix}Customer reply via TapConnect — ${campaign}`;

  const lines = [
    input.isTest
      ? "This is a routing test. No customer was contacted."
      : "A customer replied to a TapConnect message.",
    "",
    `Customer: ${who}${input.customerEmail && input.customerDisplay ? ` <${input.customerEmail}>` : ""}`,
    `Campaign: ${campaign}`,
    input.originatingSubject ? `Original subject: ${input.originatingSubject}` : null,
    `Category: ${input.classification}`,
    `Urgency: ${input.urgency}`,
    `Received: ${input.receivedAt}`,
    input.recordLink ? `TapConnect record: ${input.recordLink}` : null,
    "",
    "—— Customer message ——",
    input.safeText,
    "",
    input.attachmentSummaries?.length
      ? `Attachments: ${input.attachmentSummaries.join(", ")}`
      : null,
    "",
    "TapConnect visibility: initial reply, classification, destination, and routing result.",
    "External system tracks: assignment, response, and resolution.",
  ].filter((l): l is string => l !== null);

  const text = lines.join("\n");
  const html = `<pre style="font-family:system-ui,sans-serif;white-space:pre-wrap">${escapeHtml(text)}</pre>`;

  return {
    subject,
    text,
    html,
    labels: {
      source: campaign,
      category: input.classification,
      receivedAt: input.receivedAt,
      visibilityBoundary: "initial_reply_and_handoff",
    },
  };
}

export function buildDestinationTestMessage(input: {
  campaignTitle?: string;
  category?: ReplyMessageCategory;
}): NormalizedHandoffPayload {
  return buildNormalizedHandoff({
    customerDisplay: "Test Customer",
    customerEmail: "test-customer@tapconnect.local",
    campaignTitle: input.campaignTitle ?? "Summer Offer Campaign",
    originatingSubject: "Test customer reply from TapConnect",
    classification: input.category ?? "questions",
    urgency: "low",
    receivedAt: new Date().toISOString(),
    safeText:
      "Test customer reply from TapConnect\n\nSource: Summer Offer Campaign\nCategory: Information request\n\nThis is a routing test. No customer was contacted.",
    isTest: true,
  });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
