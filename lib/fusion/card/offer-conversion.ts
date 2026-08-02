import { nanoid } from "nanoid";
import type { Prisma } from "@prisma/client";
import type { TapCardSection } from "@/lib/brand/tap-card";
import type { ContentBlock } from "@/lib/types/campaign";
import { prisma } from "@/lib/db";

export function cardOfferToCampaignBlocks(section: TapCardSection): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  if (section.imageUrl) {
    blocks.push({
      id: nanoid(8), type: "hero_image", order: blocks.length, enabled: true,
      label: "Offer artwork",
      data: { imageUrl: section.imageUrl, mediaAssetId: section.mediaAssetId, altText: section.altText || section.headline || "Offer artwork" },
    });
  }
  blocks.push({
    id: nanoid(8), type: "offer_coupon", order: blocks.length, enabled: true,
    label: section.offerTitle || section.headline || "Offer",
    data: {
      title: section.offerTitle || section.headline || "Offer",
      description: section.offerDescription || section.description || "",
      code: section.offerCode || undefined,
      expiresAt: section.offerExpires || undefined,
      ctaLabel: section.offerCta || "Claim",
      value: section.offerValue || undefined,
      startsAt: section.offerStart || undefined,
      terms: section.offerTerms || undefined,
      redemptionInstructions: section.redemptionInstructions || undefined,
      presentation: section.specialStyle || "card",
      cardSectionId: section.id,
    },
    style: {
      backgroundColor: section.backgroundColor,
      textColor: section.textColor,
      finish: section.finish,
    },
  });
  return blocks;
}

export async function createCampaignFromCardOffer(params: {
  businessId: string;
  userId: string;
  section: TapCardSection;
}) {
  const title = params.section.offerTitle || params.section.headline || "Card Offer";
  const blocks = cardOfferToCampaignBlocks(params.section);
  return prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.create({
      data: {
        businessId: params.businessId,
        title,
        campaignType: "COUPON_OFFER",
        status: "DRAFT",
        contentBlocks: blocks as unknown as Prisma.InputJsonValue,
        primaryMedia: {
          imageUrl: params.section.imageUrl,
          mediaAssetId: params.section.mediaAssetId,
        } as Prisma.InputJsonValue,
        offerSettings: {
          source: "card_local_offer",
          sourceSectionId: params.section.id,
          startsAt: params.section.offerStart,
          endsAt: params.section.offerExpires,
          terms: params.section.offerTerms,
          redemptionInstructions: params.section.redemptionInstructions,
        } as Prisma.InputJsonValue,
        themeOverrides: {
          backgroundColor: params.section.backgroundColor,
          textColor: params.section.textColor,
          accentColor: params.section.accentColor,
          finish: params.section.finish,
        } as Prisma.InputJsonValue,
        scheduledStart: params.section.offerStart ? new Date(params.section.offerStart) : undefined,
        scheduledEnd: params.section.offerExpires ? new Date(params.section.offerExpires) : undefined,
        createdById: params.userId,
        updatedById: params.userId,
      },
    });
    await tx.campaignLifecycleEvent.create({
      data: {
        businessId: params.businessId,
        campaignId: campaign.id,
        toStatus: "DRAFT",
        command: "create_from_card_offer",
        actorId: params.userId,
        metadata: { cardSectionId: params.section.id } as Prisma.InputJsonValue,
      },
    });
    return { campaign, blocks };
  });
}
