import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

const schema = z.object({
  publish: z.boolean(),
  tapCard: z.any().optional(),
});

/** Admin-only: publish this workspace's Tap Connect Card to the public landing demo. */
export async function POST(request: Request) {
  try {
    const { business } = await requirePlatformAdmin();
    const body = schema.parse(await request.json());

    if (body.tapCard) {
      await prisma.brandKit.upsert({
        where: { businessId: business.id },
        create: {
          businessId: business.id,
          tapCard: body.tapCard as Prisma.InputJsonValue,
        },
        update: { tapCard: body.tapCard as Prisma.InputJsonValue },
      });
    }

    // Clear any prior landing demos platform-wide
    await prisma.campaign.updateMany({
      where: { isLandingDemo: true },
      data: { isLandingDemo: false },
    });

    if (!body.publish) {
      return NextResponse.json({ ok: true, published: false });
    }

    let campaign = await prisma.campaign.findFirst({
      where: { businessId: business.id, campaignType: "CONTACT_VCARD" },
      orderBy: { updatedAt: "desc" },
    });

    if (!campaign) {
      const user = await prisma.user.findFirst({
        where: { memberships: { some: { businessId: business.id } } },
      });
      campaign = await prisma.campaign.create({
        data: {
          businessId: business.id,
          title: "Landing Demo · Tap Connect Card",
          campaignType: "CONTACT_VCARD",
          status: "LIVE",
          isLandingDemo: true,
          createdById: user?.id,
          contentBlocks: [
            {
              id: "demo-card",
              type: "digital_card",
              order: 0,
              enabled: true,
              label: "Digital Card",
              data: {
                headline: "Landing demo card",
                showSaveContact: true,
                showShare: true,
                showSocials: true,
              },
            },
          ],
        },
      });
    } else {
      campaign = await prisma.campaign.update({
        where: { id: campaign.id },
        data: { isLandingDemo: true, status: "LIVE" },
      });
    }

    return NextResponse.json({ ok: true, published: true, campaignId: campaign.id });
  } catch (error) {
    console.error("landing-demo publish", error);
    return NextResponse.json({ error: "Failed to publish landing demo" }, { status: 500 });
  }
}
