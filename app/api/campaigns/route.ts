import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { createCampaignFromTemplate } from "@/lib/services/campaigns";

const schema = z.object({
  templateId: z.string(),
  title: z.string().min(2).max(120),
});

export async function POST(request: Request) {
  try {
    const { user, business } = await requireBusiness();
    const body = schema.parse(await request.json());

    const activeCount = await import("@/lib/db").then(({ prisma }) =>
      prisma.campaign.count({
        where: { businessId: business.id, status: { notIn: ["ARCHIVED", "CLOSED"] } },
      })
    );

    if (activeCount >= business.activeCampaignLimit) {
      return NextResponse.json(
        { error: `Campaign limit reached (${business.activeCampaignLimit})` },
        { status: 400 }
      );
    }

    const campaign = await createCampaignFromTemplate({
      businessId: business.id,
      templateId: body.templateId,
      title: body.title,
      userId: user.id,
    });

    return NextResponse.json({ campaign });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    console.error("Create campaign error:", error);
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
