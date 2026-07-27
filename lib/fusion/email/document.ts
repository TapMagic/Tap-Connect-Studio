/**
 * Email document contract — medium-specific presentation variant of Campaign offer facts.
 * Persists in Campaign.formSettings.emailResponse JSON (no parallel Prisma model).
 *
 * Maturity: IMPLEMENTED BUT NOT OWNER-READY.
 */

import {
  defaultCampaignEmailResponse,
  parseCampaignEmailResponse,
  type CampaignEmailResponse,
} from "@/lib/campaign-email";
import type { ContentBlock } from "@/lib/types/campaign";
import {
  parseCampaignReplyOverride,
} from "@/lib/fusion/email-replies/policy";
import type { CampaignReplyHandlingOverride } from "@/lib/fusion/email-replies/types";

export type EmailApprovalState = "draft" | "approved" | "rejected";

export type EmailVisualTheme = {
  backgroundColor?: string;
  contentSurfaceColor?: string;
  headlineColor?: string;
  bodyColor?: string;
  ctaBackgroundColor?: string;
  ctaTextColor?: string;
  linkColor?: string;
  offerEmphasisColor?: string;
  fontStyle?: string;
  borderColor?: string;
  borderRadius?: string;
};

export type EmailDocument = CampaignEmailResponse & {
  /** Preview snippet shown after subject in inbox clients */
  preheader?: string;
  fromName?: string;
  replyTo?: string;
  /**
   * Campaign-level reply-handling override (optional).
   * When absent, Email workspace inherits the business Email & Replies policy.
   */
  replyHandling?: CampaignReplyHandlingOverride | null;
  /** Email surface visual overrides (Brand → Email theme → block preset → item) */
  visualTheme?: EmailVisualTheme;
  /** Campaign offer bind metadata */
  offerBlockId?: string;
  offerFactsFingerprint?: string;
  /** Deterministic plain-text companion */
  plainText?: string;
  plainTextOverride?: string;
  plainTextStale?: boolean;
  /** Audience / delivery readiness (authoring only — no live send) */
  audienceSegmentId?: string | null;
  audienceLabel?: string;
  consentReadinessSummary?: string;
  providerReadinessSummary?: string;
  approvalState?: EmailApprovalState;
  approvedAt?: string | null;
  schedule?: string | null;
  trackingConfig?: { utmCampaign?: string; utmSource?: string };
  version?: number;
  updatedAt?: string;
};

export const EMAIL_DOCUMENT_VERSION = 1;

export function defaultEmailDocument(businessName: string): EmailDocument {
  const base = defaultCampaignEmailResponse(businessName);
  return {
    ...base,
    preheader: "Your offer is inside — open to claim.",
    fromName: businessName,
    approvalState: "draft",
    version: EMAIL_DOCUMENT_VERSION,
    updatedAt: new Date().toISOString(),
  };
}

export function parseEmailDocument(
  raw: unknown,
  businessName = "us"
): EmailDocument {
  const base = parseCampaignEmailResponse(raw, businessName);
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const visualTheme =
    o.visualTheme && typeof o.visualTheme === "object"
      ? (o.visualTheme as EmailVisualTheme)
      : undefined;

  const approval =
    o.approvalState === "approved" || o.approvalState === "rejected"
      ? o.approvalState
      : "draft";

  return {
    ...base,
    preheader:
      typeof o.preheader === "string" ? o.preheader : "Your offer is inside — open to claim.",
    fromName: typeof o.fromName === "string" ? o.fromName : businessName,
    replyTo: typeof o.replyTo === "string" ? o.replyTo : undefined,
    replyHandling: parseCampaignReplyOverride(o.replyHandling),
    visualTheme,
    offerBlockId: typeof o.offerBlockId === "string" ? o.offerBlockId : undefined,
    offerFactsFingerprint:
      typeof o.offerFactsFingerprint === "string" ? o.offerFactsFingerprint : undefined,
    plainText: typeof o.plainText === "string" ? o.plainText : undefined,
    plainTextOverride:
      typeof o.plainTextOverride === "string" ? o.plainTextOverride : undefined,
    plainTextStale: o.plainTextStale === true,
    audienceSegmentId:
      o.audienceSegmentId === null
        ? null
        : typeof o.audienceSegmentId === "string"
          ? o.audienceSegmentId
          : undefined,
    audienceLabel: typeof o.audienceLabel === "string" ? o.audienceLabel : undefined,
    consentReadinessSummary:
      typeof o.consentReadinessSummary === "string"
        ? o.consentReadinessSummary
        : undefined,
    providerReadinessSummary:
      typeof o.providerReadinessSummary === "string"
        ? o.providerReadinessSummary
        : undefined,
    approvalState: approval,
    approvedAt: typeof o.approvedAt === "string" ? o.approvedAt : null,
    schedule: typeof o.schedule === "string" ? o.schedule : null,
    trackingConfig:
      o.trackingConfig && typeof o.trackingConfig === "object"
        ? (o.trackingConfig as EmailDocument["trackingConfig"])
        : undefined,
    version:
      typeof o.version === "number" ? o.version : EMAIL_DOCUMENT_VERSION,
    updatedAt:
      typeof o.updatedAt === "string" ? o.updatedAt : new Date().toISOString(),
  };
}

export function parseFormSettingsEmailDocument(
  formSettings: unknown,
  businessName: string
): EmailDocument {
  if (!formSettings || typeof formSettings !== "object") {
    return defaultEmailDocument(businessName);
  }
  const fs = formSettings as Record<string, unknown>;
  return parseEmailDocument(fs.emailResponse ?? fs.emailPromo, businessName);
}

export function serializeEmailDocument(doc: EmailDocument): EmailDocument {
  return {
    ...doc,
    version: EMAIL_DOCUMENT_VERSION,
    updatedAt: new Date().toISOString(),
  };
}

export function emailDocumentBlocks(doc: EmailDocument): ContentBlock[] {
  return [...(doc.blocks ?? [])]
    .filter((b) => b.enabled !== false)
    .sort((a, b) => a.order - b.order);
}
