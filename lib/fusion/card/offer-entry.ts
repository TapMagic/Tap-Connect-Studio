/**
 * Public Card Offer entry — view / claim / lead with consent, mock follow-up,
 * Contact/Relationship dual-write, TapProof evidence.
 */

import { prisma } from "@/lib/db";
import { upsertContact } from "@/lib/fusion/audience/contacts";
import { recordConsent } from "@/lib/fusion/audience/consent";
import { ensureCustomerRelationship } from "@/lib/fusion/audience/relationships";
import { recordContactTimelineEvent } from "@/lib/fusion/audience/timeline";
import { sendEmailViaMock } from "@/lib/fusion/comms/email-mock";
import { isFeatureEnabled } from "@/lib/fusion/features";
import { createGovernedEvent, enqueueOutboxSync } from "@/lib/fusion/publication/events";
import { parseContentBlocks } from "@/lib/services/devices";
import { keepCard } from "@/lib/fusion/tapsave/service";
import {
  buildOfferEmailVariant,
  CARD_OFFER_FUSE_FEATURE,
  extractAuthoritativeOffer,
  type AuthoritativeOffer,
} from "./offer";

export type CardOfferAction = "view" | "claim" | "lead" | "keep";

export type CardOfferEntryInput = {
  businessId: string;
  action: CardOfferAction;
  campaignId: string;
  sectionId?: string;
  offerBlockId?: string;
  deviceSlotId?: string;
  email?: string;
  name?: string;
  phone?: string;
  consentGiven?: boolean;
  /** Queue mock follow-up after successful claim/lead when consent granted */
  requestFollowUp?: boolean;
  featureOverrides?: Parameters<typeof isFeatureEnabled>[1];
};

export type CardOfferEntryResult =
  | {
      ok: true;
      action: CardOfferAction;
      offer: AuthoritativeOffer;
      leadId?: string;
      contactId?: string;
      relationshipId?: string;
      publicToken?: string;
      myTapPath?: string;
      followUp?: { queued: boolean; mock: true; providerRef?: string; reason?: string };
      confirmation: string;
      statusLabel: "Available" | "Claimed" | "Requested" | "Saved";
      mock: true;
      classification: "IMPLEMENTED BUT NOT OWNER-READY";
    }
  | {
      ok: false;
      code:
        | "feature_off"
        | "consent_required"
        | "validation"
        | "business_not_found"
        | "offer_not_found"
        | "campaign_not_found";
      error: string;
    };

export async function loadAuthoritativeOfferForCampaign(input: {
  businessId: string;
  campaignId: string;
  preferBlockId?: string;
}): Promise<AuthoritativeOffer | null> {
  const campaign = await prisma.campaign.findFirst({
    where: { id: input.campaignId, businessId: input.businessId },
    select: {
      id: true,
      title: true,
      status: true,
      contentBlocks: true,
    },
  });
  if (!campaign) return null;
  const blocks = parseContentBlocks(campaign.contentBlocks);
  return extractAuthoritativeOffer({
    campaignId: campaign.id,
    campaignTitle: campaign.title,
    campaignStatus: campaign.status,
    blocks,
    preferBlockId: input.preferBlockId,
  });
}

export async function submitCardOfferEntry(
  input: CardOfferEntryInput
): Promise<CardOfferEntryResult> {
  const featureOn = isFeatureEnabled(
    CARD_OFFER_FUSE_FEATURE,
    input.featureOverrides ?? {}
  );
  if (!featureOn) {
    return {
      ok: false,
      code: "feature_off",
      error: "Card Offer fuse is not enabled.",
    };
  }

  if (!input.campaignId?.trim()) {
    return { ok: false, code: "validation", error: "Campaign id is required." };
  }

  // Consent gates before any persistence (unit-testable without DB)
  if (
    (input.action === "lead" || input.action === "claim" || input.action === "keep") &&
    input.email?.trim() &&
    !input.consentGiven
  ) {
    return {
      ok: false,
      code: "consent_required",
      error: "Consent is required to save this offer and follow up by email.",
    };
  }
  if (input.action === "lead" && !input.consentGiven) {
    return {
      ok: false,
      code: "consent_required",
      error: "Consent is required to save this offer and follow up by email.",
    };
  }

  const business = await prisma.business.findUnique({
    where: { id: input.businessId },
    select: { id: true, name: true },
  });
  if (!business) {
    return { ok: false, code: "business_not_found", error: "Business not found." };
  }

  const offer = await loadAuthoritativeOfferForCampaign({
    businessId: input.businessId,
    campaignId: input.campaignId,
    preferBlockId: input.offerBlockId,
  });
  if (!offer) {
    return {
      ok: false,
      code: "offer_not_found",
      error: "No authoritative offer found on this campaign.",
    };
  }

  if (input.action === "view") {
    await recordOfferEvent({
      businessId: input.businessId,
      campaignId: offer.campaignId,
      deviceSlotId: input.deviceSlotId,
      sectionId: input.sectionId,
      eventType: "card_offer_viewed",
      metadata: { offerBlockId: offer.offerBlockId, fingerprint: offer.factsFingerprint },
    });
    emitGoverned("card.offer.viewed", input.businessId, offer, {
      sectionId: input.sectionId,
      claim: "Customer viewed Card Spotlight offer",
    });
    return {
      ok: true,
      action: "view",
      offer,
      confirmation: "Offer viewed.",
      statusLabel: "Available",
      mock: true,
      classification: "IMPLEMENTED BUT NOT OWNER-READY",
    };
  }

  const needsIdentity = input.action === "lead" || input.action === "keep" || input.requestFollowUp;
  const email = input.email?.trim().toLowerCase();

  if (input.action === "lead" || (input.action === "claim" && offer.lockedUntilContact)) {
    if (!email) {
      return {
        ok: false,
        code: "validation",
        error: "Email is required to claim this offer.",
      };
    }
    if (!input.consentGiven) {
      return {
        ok: false,
        code: "consent_required",
        error: "Consent is required to save this offer and follow up by email.",
      };
    }
  }

  if (input.action === "keep") {
    if (!email) {
      return { ok: false, code: "validation", error: "Email is required to Keep this Card." };
    }
    const kept = await keepCard({
      businessId: input.businessId,
      email,
      name: input.name,
      phone: input.phone,
      campaignId: offer.campaignId,
      deviceSlotId: input.deviceSlotId,
      consentGiven: Boolean(input.consentGiven),
      overrides: undefined,
    });
    if (!kept.ok) {
      return {
        ok: false,
        code: kept.code === "feature_disabled" ? "feature_off" : "validation",
        error: kept.message,
      };
    }
    await recordOfferEvent({
      businessId: input.businessId,
      campaignId: offer.campaignId,
      deviceSlotId: input.deviceSlotId,
      sectionId: input.sectionId,
      eventType: "card_offer_kept",
      metadata: {
        offerBlockId: offer.offerBlockId,
        relationshipId: kept.relationshipId,
      },
    });
    emitGoverned("card.offer.kept", input.businessId, offer, {
      sectionId: input.sectionId,
      relationshipId: kept.relationshipId,
      claim: "Customer kept Card with offer attribution",
    });
    return {
      ok: true,
      action: "keep",
      offer,
      contactId: kept.contactId,
      relationshipId: kept.relationshipId,
      publicToken: kept.publicToken,
      myTapPath: kept.myTapUrl,
      confirmation: "Card saved. Your offer is available in MyTap.",
      statusLabel: "Saved",
      mock: true,
      classification: "IMPLEMENTED BUT NOT OWNER-READY",
    };
  }

  // claim or lead
  let contactId: string | undefined;
  let relationshipId: string | undefined;
  let publicToken: string | undefined;
  let myTapPath: string | undefined;
  let leadId: string | undefined;

  if (email && input.consentGiven) {
    const contact = await upsertContact({
      businessId: input.businessId,
      email,
      name: input.name,
      phone: input.phone,
      metadata: {
        lastOfferSource: "card",
        lastOfferAt: new Date().toISOString(),
        lastOfferCampaignId: offer.campaignId,
      },
    });
    contactId = contact.id;

    let sourceTapPointId: string | undefined;
    if (input.deviceSlotId) {
      const tapPoint = await prisma.tapPoint.findUnique({
        where: { deviceSlotId: input.deviceSlotId },
        select: { id: true },
      });
      sourceTapPointId = tapPoint?.id;
    }

    const relationship = await ensureCustomerRelationship({
      businessId: input.businessId,
      contactId: contact.id,
      sourceType: "card_offer",
      sourceTapPointId,
    });
    relationshipId = relationship.id;
    publicToken = relationship.publicToken;
    myTapPath = `/mytap/${relationship.publicToken}`;

    await recordConsent({
      businessId: input.businessId,
      contactId: contact.id,
      channel: "EMAIL",
      status: "GRANTED",
      legalBasis: "consent",
      sourceType: "card_offer",
      sourceId: input.sectionId ?? offer.offerBlockId,
    });

    const lead = await prisma.lead.create({
      data: {
        businessId: input.businessId,
        campaignId: offer.campaignId,
        deviceSlotId: input.deviceSlotId,
        contactId: contact.id,
        name: input.name,
        email,
        phone: input.phone,
        consentGiven: true,
        couponClaimed: input.action === "claim" || input.action === "lead",
        metadata: {
          type: "card_offer",
          action: input.action,
          sectionId: input.sectionId ?? null,
          offerBlockId: offer.offerBlockId,
          factsFingerprint: offer.factsFingerprint,
          offerTitle: offer.title,
          offerCode: offer.code ?? null,
        },
      },
    });
    leadId = lead.id;

    await recordContactTimelineEvent({
      businessId: input.businessId,
      contactId: contact.id,
      relationshipId: relationship.id,
      kind: "lead_capture",
      metadata: {
        source: "card_offer",
        action: input.action,
        campaignId: offer.campaignId,
        offerBlockId: offer.offerBlockId,
        leadId: lead.id,
      },
    }).catch(() => undefined);
  } else if (input.action === "claim" && !offer.lockedUntilContact) {
    // Code reveal without email — analytics only
  } else if (needsIdentity && !email) {
    return { ok: false, code: "validation", error: "Email is required." };
  }

  const eventType =
    input.action === "lead" ? "card_offer_lead" : "card_offer_claimed";
  await recordOfferEvent({
    businessId: input.businessId,
    campaignId: offer.campaignId,
    deviceSlotId: input.deviceSlotId,
    sectionId: input.sectionId,
    eventType,
    metadata: {
      offerBlockId: offer.offerBlockId,
      leadId: leadId ?? null,
      fingerprint: offer.factsFingerprint,
    },
  });

  emitGoverned(
    input.action === "lead" ? "card.offer.lead" : "card.offer.claimed",
    input.businessId,
    offer,
    {
      sectionId: input.sectionId,
      leadId,
      contactId,
      relationshipId,
      claim:
        input.action === "lead"
          ? "Customer submitted lead for Card Spotlight offer"
          : "Customer claimed Card Spotlight offer",
    }
  );

  let followUpResult: {
    queued: boolean;
    mock: true;
    providerRef?: string;
    reason?: string;
  } | undefined;

  if (input.requestFollowUp && email && input.consentGiven) {
    const variant = buildOfferEmailVariant(offer, business.name);
    const sent = await sendEmailViaMock({
      businessId: input.businessId,
      to: email,
      subject: variant.subject,
      body: variant.body,
      purpose: "promo",
      consentGiven: true,
      link: {
        contactId,
        relationshipId,
        leadId,
      },
    });
    if (sent.ok) {
      followUpResult = { queued: true, mock: true, providerRef: sent.providerRef };
      await recordOfferEvent({
        businessId: input.businessId,
        campaignId: offer.campaignId,
        deviceSlotId: input.deviceSlotId,
        sectionId: input.sectionId,
        eventType: "card_offer_followup_queued",
        metadata: { providerRef: sent.providerRef, mock: true },
      });
      emitGoverned("card.offer.followup_queued", input.businessId, offer, {
        sectionId: input.sectionId,
        claim: "Mock offer follow-up queued",
      });
    } else {
      followUpResult = { queued: false, mock: true, reason: sent.error };
    }
  }

  const statusLabel =
    input.action === "lead" ? "Requested" : ("Claimed" as const);
  const confirmation =
    input.action === "lead"
      ? "Thanks — we saved your request for this offer."
      : offer.code
        ? `Offer claimed. Your code is ${offer.code}.`
        : "Offer claimed. Show this confirmation when you visit.";

  try {
    const correlationId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `card_offer_audit_${Date.now()}`;
    await prisma.platformAuditEvent.create({
      data: {
        businessId: input.businessId,
        actorType: "PUBLIC",
        action: `card.offer.${input.action}`,
        resourceType: "campaign",
        resourceId: offer.campaignId,
        correlationId,
        metadata: {
          sectionId: input.sectionId ?? null,
          offerBlockId: offer.offerBlockId,
          leadId: leadId ?? null,
          consent: input.consentGiven ? "GRANTED" : "none",
        },
      },
    });
  } catch {
    // audit optional
  }

  return {
    ok: true,
    action: input.action,
    offer,
    leadId,
    contactId,
    relationshipId,
    publicToken,
    myTapPath,
    followUp: followUpResult,
    confirmation,
    statusLabel,
    mock: true,
    classification: "IMPLEMENTED BUT NOT OWNER-READY",
  };
}

async function recordOfferEvent(input: {
  businessId: string;
  campaignId: string;
  deviceSlotId?: string;
  sectionId?: string;
  eventType: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.clickEvent.create({
      data: {
        businessId: input.businessId,
        campaignId: input.campaignId,
        deviceSlotId: input.deviceSlotId,
        eventType: input.eventType,
        blockId: input.sectionId,
        metadata: (input.metadata ?? {}) as object,
      },
    });
  } catch {
    // analytics best-effort
  }
}

function emitGoverned(
  name: string,
  businessId: string,
  offer: AuthoritativeOffer,
  extra: Record<string, unknown>
) {
  const correlationId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `card_offer_${Date.now()}`;
  enqueueOutboxSync(
    name,
    createGovernedEvent({
      name,
      businessId,
      aggregateType: "campaign",
      aggregateId: offer.campaignId,
      correlationId,
      payload: {
        offerBlockId: offer.offerBlockId,
        factsFingerprint: offer.factsFingerprint,
        evidenceClass: "confirmed",
        ...extra,
      },
    })
  );
}
