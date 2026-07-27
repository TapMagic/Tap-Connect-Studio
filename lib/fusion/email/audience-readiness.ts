/**
 * Audience, consent, suppression, and provider readiness — plain language for Email workspace.
 * No live send — authoring and local approval only.
 *
 * Counts are authoritative only when ConsentRecord + suppression were loaded.
 * Never invent consent. Never mark eligible merely because an email address exists.
 *
 * Client-safe — do not import Prisma here. Server loading lives in audience-load.ts.
 */

import { evaluateChannelGuardian } from "@/lib/fusion/comms/channel-guardian";
import { listEmailProviderReadiness } from "@/lib/fusion/comms/email-readiness";

export type AudienceContactSummary = {
  contactId?: string;
  email?: string | null;
  /** true = GRANTED email consent; false = denied/withdrawn; undefined/null = unknown */
  consentEmail?: boolean | null;
  consentKnown?: boolean;
  suppressed?: boolean;
};

export type EligibilityEvidence =
  | "authoritative"
  | "incomplete_consent"
  | "incomplete_suppression"
  | "incomplete";

export type EmailAudienceReadiness = {
  intendedAudience: string;
  totalContacts: number;
  withEmailCount: number;
  consentedCount: number;
  eligibleCount: number | null;
  excludedNoConsent: number | null;
  excludedSuppressed: number;
  excludedNoEmail: number;
  providerConnected: boolean;
  providerSummary: string;
  approvalRequired: boolean;
  canAuthor: boolean;
  canApproveLocally: boolean;
  canSend: false;
  sendBlockedReason: string;
  evidence: EligibilityEvidence;
  evidenceNote: string | null;
  lines: string[];
};

export function summarizeEmailAudienceReadiness(input: {
  audienceLabel?: string;
  contacts?: AudienceContactSummary[];
  featureEmailEnabled?: boolean;
  approvalState?: "draft" | "approved" | "rejected";
  /** Whether ConsentRecord was consulted for this summary */
  consentLoaded?: boolean;
  /** Whether suppression store was consulted */
  suppressionLoaded?: boolean;
}): EmailAudienceReadiness {
  const contacts = input.contacts ?? [];
  const provider = listEmailProviderReadiness();
  const featureOn = input.featureEmailEnabled !== false;
  const consentLoaded = input.consentLoaded === true;
  const suppressionLoaded = input.suppressionLoaded === true;

  let withEmail = 0;
  let consented = 0;
  let eligible = 0;
  let noConsent = 0;
  let suppressed = 0;
  let noEmail = 0;
  let unknownConsent = 0;

  for (const c of contacts) {
    const email = c.email?.trim();
    if (!email) {
      noEmail++;
      continue;
    }
    withEmail++;

    if (c.suppressed) {
      suppressed++;
      continue;
    }

    const consentKnown =
      c.consentKnown === true ||
      (consentLoaded && (c.consentEmail === true || c.consentEmail === false));

    if (!consentKnown) {
      unknownConsent++;
      continue;
    }

    if (c.consentEmail === true) consented++;

    const decision = evaluateChannelGuardian({
      channel: "email",
      purpose: "promo",
      consentGiven: c.consentEmail === true,
      suppressed: false,
      featureEnabled: featureOn,
      // Provider gaps do not reduce audience eligibility for authoring counts
      providerReady: true,
    });

    if (decision.code === "no_consent") {
      noConsent++;
      continue;
    }
    if (decision.allowed) eligible++;
  }

  let evidence: EligibilityEvidence = "authoritative";
  let evidenceNote: string | null = null;
  if (!consentLoaded && !suppressionLoaded) {
    evidence = "incomplete";
    evidenceNote =
      "Eligibility is incomplete because consent and suppression records have not been loaded.";
  } else if (!consentLoaded) {
    evidence = "incomplete_consent";
    evidenceNote =
      "Eligibility is incomplete because consent records have not been loaded.";
  } else if (!suppressionLoaded) {
    evidence = "incomplete_suppression";
    evidenceNote =
      "Eligibility is incomplete because the suppression list has not been loaded.";
  } else if (unknownConsent > 0) {
    evidence = "incomplete_consent";
    evidenceNote =
      "Eligibility is incomplete because some contacts are missing an email consent record.";
  }

  const intended = input.audienceLabel?.trim() || "All contacts with email";
  const lines: string[] = [];
  const countsAuthoritative = evidence === "authoritative";

  if (!countsAuthoritative) {
    lines.push("Eligibility not fully calculated.");
    if (evidenceNote) lines.push(evidenceNote);
    if (withEmail > 0) {
      lines.push(
        `${withEmail.toLocaleString()} contact${withEmail === 1 ? "" : "s"} have an email address on file.`
      );
    }
    if (consentLoaded && consented > 0) {
      lines.push(
        `${consented.toLocaleString()} contact${consented === 1 ? "" : "s"} have approved email.`
      );
    }
    if (suppressionLoaded && suppressed > 0) {
      lines.push(
        `${suppressed.toLocaleString()} contact${suppressed === 1 ? "" : "s"} are suppressed.`
      );
    }
  } else {
    if (eligible > 0) {
      lines.push(
        `${eligible.toLocaleString()} customer${eligible === 1 ? "" : "s"} are eligible.`
      );
    } else if (contacts.length === 0) {
      lines.push("No contacts in this audience yet.");
    } else {
      lines.push("No eligible contacts yet — check consent and email addresses.");
    }
    if (consented > 0) {
      lines.push(
        `${consented.toLocaleString()} contact${consented === 1 ? "" : "s"} have approved email.`
      );
    }
    if (noConsent > 0) {
      lines.push(
        `${noConsent.toLocaleString()} customer${noConsent === 1 ? "" : "s"} will be excluded because they did not approve email.`
      );
    }
    if (suppressed > 0) {
      lines.push(
        `${suppressed.toLocaleString()} contact${suppressed === 1 ? "" : "s"} are suppressed.`
      );
    }
  }

  if (!provider.ready) {
    lines.push("Email is prepared, but no provider is connected.");
  }

  const providerSummary = provider.ready
    ? "Email provider is connected."
    : "No email provider connected — you can still prepare and approve locally.";

  return {
    intendedAudience: intended,
    totalContacts: contacts.length,
    withEmailCount: withEmail,
    consentedCount: consented,
    eligibleCount: countsAuthoritative ? eligible : null,
    excludedNoConsent: countsAuthoritative ? noConsent : null,
    excludedSuppressed: suppressed,
    excludedNoEmail: noEmail,
    providerConnected: provider.ready,
    providerSummary,
    approvalRequired: input.approvalState !== "approved",
    canAuthor: true,
    canApproveLocally: true,
    canSend: false,
    sendBlockedReason: "Live send is not enabled in this wave.",
    evidence,
    evidenceNote,
    lines,
  };
}
