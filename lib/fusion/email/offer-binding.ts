/**
 * Campaign offer binding for Email — authoritative facts from Campaign, presentation on Email.
 */

import type { ContentBlock } from "@/lib/types/campaign";
import {
  extractAuthoritativeOffer,
  fingerprintOfferFacts,
  type AuthoritativeOffer,
} from "@/lib/fusion/card/offer";
import type { EmailDocument } from "./document";

export type EmailOfferProjectionState = "current" | "stale" | "unbound" | "campaign_missing";

export function bindEmailToCampaignOffer(input: {
  document: EmailDocument;
  campaignId: string;
  campaignTitle: string;
  campaignStatus: string;
  pageBlocks: ContentBlock[];
  preferBlockId?: string;
  preservePresentation?: boolean;
}): { document: EmailDocument; offer: AuthoritativeOffer | null } {
  const offer = extractAuthoritativeOffer({
    campaignId: input.campaignId,
    campaignTitle: input.campaignTitle,
    campaignStatus: input.campaignStatus,
    blocks: input.pageBlocks,
    preferBlockId: input.preferBlockId ?? input.document.offerBlockId,
  });

  if (!offer) {
    return {
      document: {
        ...input.document,
        offerBlockId: undefined,
        offerFactsFingerprint: undefined,
      },
      offer: null,
    };
  }

  let blocks = [...(input.document.blocks ?? [])];
  const emailOfferBlock = blocks.find(
    (b) => b.type === "offer_coupon" && b.id === offer.offerBlockId
  );

  if (!emailOfferBlock && !input.preservePresentation) {
    blocks.push({
      id: offer.offerBlockId,
      type: "offer_coupon",
      order: blocks.length,
      enabled: true,
      label: "Offer",
      channel: "email",
      data: {
        title: offer.title,
        description: offer.description,
        code: offer.code,
        expiresAt: offer.expiresAt,
        ctaLabel: offer.ctaLabel,
        lockedUntilContact: offer.lockedUntilContact,
        _authoritative: true,
      },
    });
  } else if (emailOfferBlock && !input.preservePresentation) {
    blocks = blocks.map((b) => {
      if (b.id !== offer.offerBlockId) return b;
      const data = b.data as Record<string, unknown>;
      return {
        ...b,
        data: {
          ...data,
          title: data.title || offer.title,
          description: data.description || offer.description,
          code: data.code ?? offer.code,
          expiresAt: data.expiresAt ?? offer.expiresAt,
          ctaLabel: data.ctaLabel || offer.ctaLabel,
          _authoritative: true,
        },
      };
    });
  }

  return {
    document: {
      ...input.document,
      blocks,
      offerBlockId: offer.offerBlockId,
      offerFactsFingerprint: offer.factsFingerprint,
      subject:
        input.document.subject?.trim() ||
        `${offer.title} · from ${input.campaignTitle}`,
    },
    offer,
  };
}

export function detectEmailOfferProjectionState(input: {
  document: EmailDocument;
  offer: AuthoritativeOffer | null;
}): EmailOfferProjectionState {
  if (!input.document.offerBlockId && !input.document.offerFactsFingerprint) {
    return "unbound";
  }
  if (!input.offer) return "campaign_missing";
  const stored = input.document.offerFactsFingerprint;
  if (!stored) return "stale";
  return stored === input.offer.factsFingerprint ? "current" : "stale";
}

export function staleOfferReviewMessage(state: EmailOfferProjectionState): string | null {
  switch (state) {
    case "stale":
      return "The Campaign offer changed. Review this email before using it.";
    case "campaign_missing":
      return "The linked Campaign offer is no longer available. Review this email.";
    default:
      return null;
  }
}

export function refreshEmailOfferFacts(input: {
  document: EmailDocument;
  offer: AuthoritativeOffer;
  preservePresentation?: boolean;
}): EmailDocument {
  const { document, offer, preservePresentation = true } = input;
  const blocks = (document.blocks ?? []).map((b) => {
    if (b.type !== "offer_coupon" || b.id !== offer.offerBlockId) return b;
    const data = b.data as Record<string, unknown>;
    return {
      ...b,
      data: {
        ...data,
        title: preservePresentation && data.title ? data.title : offer.title,
        description:
          preservePresentation && data.description
            ? data.description
            : offer.description,
        code: preservePresentation && data.code ? data.code : offer.code,
        expiresAt:
          preservePresentation && data.expiresAt ? data.expiresAt : offer.expiresAt,
        ctaLabel:
          preservePresentation && data.ctaLabel ? data.ctaLabel : offer.ctaLabel,
        _authoritative: true,
      },
    };
  });

  return {
    ...document,
    blocks,
    offerBlockId: offer.offerBlockId,
    offerFactsFingerprint: offer.factsFingerprint,
    approvalState: document.approvalState === "approved" ? "draft" : document.approvalState,
    plainTextStale: true,
  };
}

export { fingerprintOfferFacts, type AuthoritativeOffer };
