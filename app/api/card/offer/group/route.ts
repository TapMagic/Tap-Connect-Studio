import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { appendAuditEvent } from "@/lib/control/audit";
import { requireBusinessCapability } from "@/lib/fusion/authz/business-capability";

const schema = z.object({ campaignId: z.string().min(1), groupId: z.string().min(1).nullable() });

export async function POST(request: Request) {
  try {
    const { business, user } = await requireBusinessCapability("card.draft.edit");
    const body = schema.parse(await request.json());
    const [campaign, group] = await Promise.all([
      prisma.campaign.findFirst({ where: { id: body.campaignId, businessId: business.id }, select: { id: true, title: true } }),
      body.groupId ? prisma.campaignGroup.findFirst({ where: { id: body.groupId, businessId: business.id }, select: { id: true, title: true } }) : Promise.resolve(null),
    ]);
    if (!campaign) return NextResponse.json({ ok: false, error: "Campaign not found" }, { status: 404 });
    if (body.groupId && !group) return NextResponse.json({ ok: false, error: "Campaign Group not found" }, { status: 404 });
    await prisma.campaign.update({ where: { id: campaign.id }, data: { groupId: group?.id ?? null, updatedById: user.id } });
    await appendAuditEvent({ actorId: user.id, businessId: business.id, action: "studio.card_campaign.group_changed", permissionUsed: "card.draft.edit", resourceType: "Campaign", resourceId: campaign.id, reason: group ? "Added Card-linked Campaign to Campaign Group" : "Removed Card-linked Campaign from Campaign Group", newValue: { groupId: group?.id ?? null, groupTitle: group?.title ?? null } });
    return NextResponse.json({ ok: true, group });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, error: "Invalid Campaign Group link" }, { status: 400 });
    console.error("Card Campaign Group link failed:", error);
    return NextResponse.json({ ok: false, error: "Campaign Group link failed" }, { status: 500 });
  }
}
