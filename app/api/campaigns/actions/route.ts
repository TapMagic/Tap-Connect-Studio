import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { archiveCampaign, cloneCampaign, deleteCampaign } from "@/lib/services/campaigns";
import { prisma } from "@/lib/db";

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("clone"),
    campaignId: z.string(),
  }),
  z.object({
    action: z.literal("status"),
    campaignId: z.string(),
    status: z.enum(["DRAFT", "READY", "LIVE", "PAUSED", "ARCHIVED", "CLOSED", "SCHEDULED"]),
  }),
  z.object({
    action: z.literal("archive"),
    campaignId: z.string(),
  }),
  z.object({
    action: z.literal("delete"),
    campaignId: z.string(),
  }),
  z.object({
    action: z.literal("restore"),
    campaignId: z.string(),
  }),
]);

function revalidateCampaignViews() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/campaigns");
  revalidatePath("/dashboard/devices");
  revalidatePath("/dashboard/workbench");
}

export async function POST(request: Request) {
  try {
    const { user, business } = await requireBusiness();
    const raw = await request.json();

    // Back-compat: old clients sent { campaignId } for clone
    const body = actionSchema.parse(
      raw.action ? raw : { action: "clone", campaignId: raw.campaignId }
    );

    if (body.action === "clone") {
      const source = await prisma.campaign.findFirst({
        where: { id: body.campaignId, businessId: business.id },
      });
      if (!source) {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      }
      const campaign = await cloneCampaign(body.campaignId, user.id);
      revalidateCampaignViews();
      return NextResponse.json({ campaign });
    }

    if (body.action === "delete") {
      await deleteCampaign({ businessId: business.id, campaignId: body.campaignId });
      revalidateCampaignViews();
      return NextResponse.json({ ok: true });
    }

    if (body.action === "archive") {
      const campaign = await archiveCampaign({
        businessId: business.id,
        campaignId: body.campaignId,
        status: "ARCHIVED",
      });
      revalidateCampaignViews();
      return NextResponse.json({ campaign });
    }

    if (body.action === "restore") {
      const existing = await prisma.campaign.findFirst({
        where: { id: body.campaignId, businessId: business.id },
      });
      if (!existing) {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      }
      const campaign = await prisma.campaign.update({
        where: { id: body.campaignId },
        data: { status: "DRAFT" },
      });
      revalidateCampaignViews();
      return NextResponse.json({ campaign });
    }

    // status
    if (body.status === "ARCHIVED" || body.status === "CLOSED") {
      const campaign = await archiveCampaign({
        businessId: business.id,
        campaignId: body.campaignId,
        status: body.status,
      });
      revalidateCampaignViews();
      return NextResponse.json({ campaign });
    }

    const existing = await prisma.campaign.findFirst({
      where: { id: body.campaignId, businessId: business.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const campaign = await prisma.campaign.update({
      where: { id: body.campaignId },
      data: { status: body.status },
    });
    revalidateCampaignViews();
    return NextResponse.json({ campaign });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid action", details: error.flatten() }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Campaign not found") {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    console.error("Campaign action error:", error);
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}

/** @deprecated Prefer POST { action: "status" | "delete" | ... } — kept for older clients */
export async function PATCH(request: Request) {
  try {
    const { business } = await requireBusiness();
    const body = z
      .object({
        campaignId: z.string(),
        status: z.enum(["DRAFT", "READY", "LIVE", "PAUSED", "ARCHIVED", "CLOSED", "SCHEDULED"]),
      })
      .parse(await request.json());

    if (body.status === "ARCHIVED" || body.status === "CLOSED") {
      const campaign = await archiveCampaign({
        businessId: business.id,
        campaignId: body.campaignId,
        status: body.status,
      });
      revalidateCampaignViews();
      return NextResponse.json({ campaign });
    }

    const existing = await prisma.campaign.findFirst({
      where: { id: body.campaignId, businessId: business.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const campaign = await prisma.campaign.update({
      where: { id: body.campaignId },
      data: { status: body.status },
    });
    revalidateCampaignViews();
    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("Update campaign status error:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}

/** @deprecated Prefer POST { action: "delete" } */
export async function DELETE(request: Request) {
  try {
    const { business } = await requireBusiness();
    let campaignId: string | undefined;
    try {
      const body = z.object({ campaignId: z.string() }).parse(await request.json());
      campaignId = body.campaignId;
    } catch {
      const url = new URL(request.url);
      campaignId = url.searchParams.get("campaignId") ?? undefined;
    }
    if (!campaignId) {
      return NextResponse.json({ error: "campaignId required" }, { status: 400 });
    }
    await deleteCampaign({ businessId: business.id, campaignId });
    revalidateCampaignViews();
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Campaign not found") {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    console.error("Delete campaign error:", error);
    return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 });
  }
}
