import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { notifyOnLeadCapture } from "@/lib/services/lead-notify";
import { upsertAudienceFromLeadCapture } from "@/lib/fusion/audience";

const schema = z.object({
  businessId: z.string(),
  campaignId: z.string().optional(),
  deviceSlotId: z.string().optional(),
  name: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().optional(),
  type: z.enum(["email_capture", "feedback"]).default("email_capture"),
  blockId: z.string().optional(),
  consentGiven: z.boolean().default(false),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());

    const lead = await prisma.lead.create({
      data: {
        businessId: body.businessId,
        campaignId: body.campaignId,
        deviceSlotId: body.deviceSlotId,
        name: body.name,
        email: body.email,
        phone: body.phone,
        consentGiven: body.consentGiven,
        metadata: {
          type: body.type,
          message: body.message,
          blockId: body.blockId,
        },
      },
    });

    if (body.type === "email_capture") {
      await prisma.clickEvent.create({
        data: {
          businessId: body.businessId,
          campaignId: body.campaignId,
          deviceSlotId: body.deviceSlotId,
          eventType: "lead_submission",
          blockId: body.blockId,
        },
      });
    }

    let myTapPath: string | undefined;
    let relationshipToken: string | undefined;
    try {
      const audience = await upsertAudienceFromLeadCapture({
        businessId: body.businessId,
        leadId: lead.id,
        email: body.email,
        name: body.name,
        phone: body.phone,
        consentGiven: body.consentGiven,
        campaignId: body.campaignId,
        deviceSlotId: body.deviceSlotId,
        captureType: body.type,
      });
      relationshipToken = audience.publicToken;
      myTapPath = audience.publicToken ? `/mytap/${audience.publicToken}` : undefined;
    } catch (audienceError) {
      console.warn("Audience upsert skipped:", audienceError);
    }

    // Don't block the visitor response on email delivery
    void notifyOnLeadCapture({
      businessId: body.businessId,
      leadId: lead.id,
      leadEmail: body.email,
      leadName: body.name,
      leadPhone: body.phone,
      campaignId: body.campaignId,
      deviceSlotId: body.deviceSlotId,
      message: body.message,
      type: body.type,
    });

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      myTapPath,
      relationshipToken,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }
    console.error("Lead submission error:", error);
    return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
  }
}
