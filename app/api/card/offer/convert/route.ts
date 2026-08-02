import { NextResponse } from "next/server";
import { z } from "zod";
import { appendAuditEvent } from "@/lib/control/audit";
import { requireBusinessCapability } from "@/lib/fusion/authz/business-capability";
import { createCampaignFromCardOffer } from "@/lib/fusion/card/offer-conversion";
import type { TapCardSection } from "@/lib/brand/tap-card";

export const runtime = "nodejs";

const schema = z.object({
  section: z.object({
    id: z.string().min(1),
    type: z.enum(["special_offer", "coupon", "ticket", "announcement", "special_event"]),
    enabled: z.boolean(), order: z.number(), label: z.string().optional(),
    headline: z.string().optional(), description: z.string().optional(), imageUrl: z.string().optional(), mediaAssetId: z.string().optional(), altText: z.string().optional(),
    offerTitle: z.string().optional(), offerDescription: z.string().optional(), offerCode: z.string().optional(), offerValue: z.string().optional(), offerStart: z.string().optional(), offerExpires: z.string().optional(), offerCta: z.string().optional(), offerTerms: z.string().optional(), redemptionInstructions: z.string().optional(),
    specialStyle: z.enum(["banner", "ribbon", "tile", "card"]).optional(), finish: z.string().optional(), backgroundColor: z.string().optional(), textColor: z.string().optional(), accentColor: z.string().optional(),
  }).passthrough(),
});

export async function POST(request: Request) {
  try {
    const { business, user } = await requireBusinessCapability("card.draft.edit");
    const body = schema.parse(await request.json());
    const result = await createCampaignFromCardOffer({ businessId: business.id, userId: user.id, section: body.section as TapCardSection });
    await appendAuditEvent({
      actorId: user.id, businessId: business.id,
      action: "studio.card_offer.converted_to_campaign",
      permissionUsed: "card.draft.edit",
      resourceType: "Campaign", resourceId: result.campaign.id,
      reason: "Created a draft Campaign from a local Card Offer",
      newValue: { cardSectionId: body.section.id, campaignTitle: result.campaign.title },
    });
    return NextResponse.json({ ok: true, campaign: { id: result.campaign.id, title: result.campaign.title, status: result.campaign.status }, returnTo: { surface: "card", sectionId: body.section.id } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, error: "Invalid local Offer" }, { status: 400 });
    console.error("Card Offer conversion failed:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Campaign creation failed" }, { status: 500 });
  }
}
