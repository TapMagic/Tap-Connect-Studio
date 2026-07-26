import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  buildOfferDistributionPackage,
  extractAuthoritativeOffer,
} from "@/lib/fusion/card/offer";
import { createGovernedEvent, enqueueOutboxSync } from "@/lib/fusion/publication/events";
import { parseContentBlocks } from "@/lib/services/devices";

export const dynamic = "force-dynamic";

const schema = z.object({
  campaignId: z.string().min(1),
  offerBlockId: z.string().optional(),
  sectionId: z.string().optional(),
});

/**
 * Host: prepare mock Distribution package (email + one TapCast social) from
 * the same Campaign-owned offer. Never live-publishes.
 */
export async function POST(request: Request) {
  try {
    const { business } = await requireBusiness();
    const body = schema.parse(await request.json());

    const campaign = await prisma.campaign.findFirst({
      where: { id: body.campaignId, businessId: business.id },
      select: { id: true, title: true, status: true, contentBlocks: true },
    });
    if (!campaign) {
      return NextResponse.json(
        { ok: false, error: "Campaign not found", code: "campaign_not_found" },
        { status: 404 }
      );
    }

    const offer = extractAuthoritativeOffer({
      campaignId: campaign.id,
      campaignTitle: campaign.title,
      campaignStatus: campaign.status,
      blocks: parseContentBlocks(campaign.contentBlocks),
      preferBlockId: body.offerBlockId,
    });
    if (!offer) {
      return NextResponse.json(
        { ok: false, error: "No offer_coupon on campaign", code: "offer_not_found" },
        { status: 400 }
      );
    }

    const pkg = buildOfferDistributionPackage({
      offer,
      businessName: business.name,
      sectionId: body.sectionId,
    });

    const correlationId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `odp_${Date.now().toString(36)}`;

    enqueueOutboxSync(
      "card.offer.distribution_prepared",
      createGovernedEvent({
        name: "card.offer.distribution_prepared",
        businessId: business.id,
        aggregateType: "campaign",
        aggregateId: offer.campaignId,
        correlationId,
        payload: {
          packageId: pkg.id,
          channels: pkg.channels,
          factsFingerprint: pkg.factsFingerprint,
          mock: true,
          published: false,
          evidenceClass: "confirmed",
          claim: "Host prepared mock offer Distribution package",
        },
      })
    );

    try {
      await prisma.clickEvent.create({
        data: {
          businessId: business.id,
          campaignId: offer.campaignId,
          eventType: "card_offer_distribution_prepared",
          blockId: body.sectionId ?? offer.offerBlockId,
          metadata: {
            packageId: pkg.id,
            channels: pkg.channels,
            mock: true,
          },
        },
      });
    } catch {
      // best-effort
    }

    try {
      await prisma.platformAuditEvent.create({
        data: {
          businessId: business.id,
          actorType: "USER",
          action: "card.offer.distribution.prepare",
          resourceType: "campaign",
          resourceId: offer.campaignId,
          correlationId,
          metadata: { packageId: pkg.id, mock: true, published: false },
        },
      });
    } catch {
      // optional
    }

    return NextResponse.json({
      ok: true,
      package: pkg,
      honesty: {
        mock: true,
        livePublish: false,
        requiresHumanApproval: true,
        providers: "None required — mock email + TapCast package only",
      },
      classification: "IMPLEMENTED BUT NOT OWNER-READY",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Invalid distribution request", code: "validation" },
        { status: 400 }
      );
    }
    console.error("Offer distribution error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to prepare distribution", code: "server" },
      { status: 500 }
    );
  }
}
