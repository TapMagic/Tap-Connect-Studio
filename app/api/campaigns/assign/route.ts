import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assignCampaignToDevice, endDeviceAssignment } from "@/lib/services/campaigns";
import {
  recordPublicationSnapshot,
  snapshotCampaignBeforeUpdate,
  type CampaignPublishManifest,
} from "@/lib/fusion/publication/snapshots";
import { recordOperatorAlert } from "@/lib/fusion/studio/operator-alerts";
import type { Prisma } from "@prisma/client";

/** Builder owner-gate: PATCH records PublicationSnapshot on save/publish. */

const assignSchema = z.object({
  deviceSlotId: z.string(),
  campaignId: z.string(),
});

const unassignSchema = z.object({
  deviceSlotId: z.string(),
  reopenSlot: z.boolean().optional().default(true),
});

const updateSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(120).optional(),
  contentBlocks: z.array(z.unknown()).optional(),
  themeOverrides: z.record(z.string(), z.unknown()).optional(),
  status: z
    .enum(["DRAFT", "READY", "LIVE", "PAUSED", "ARCHIVED", "CLOSED", "SCHEDULED"])
    .optional(),
  scheduledStart: z.string().datetime().nullable().optional(),
  scheduledEnd: z.string().datetime().nullable().optional(),
  endExperience: z.any().optional(),
  formSettings: z.any().optional(),
});

export async function POST(request: Request) {
  let businessId: string | undefined;
  let campaignId: string | undefined;
  let deviceSlotId: string | undefined;
  try {
    const { user, business } = await requireBusiness();
    businessId = business.id;
    const body = assignSchema.parse(await request.json());
    campaignId = body.campaignId;
    deviceSlotId = body.deviceSlotId;

    const assignment = await assignCampaignToDevice({
      businessId: business.id,
      deviceSlotId: body.deviceSlotId,
      campaignId: body.campaignId,
      userId: user.id,
    });

    return NextResponse.json({ assignment });
  } catch (error) {
    if (businessId && campaignId) {
      const detail =
        error instanceof Error ? error.message : "Failed to assign campaign";
      void recordOperatorAlert({
        businessId,
        kind: "assign_failed",
        title: "Campaign assign failed",
        detail: deviceSlotId ? `${detail} · device ${deviceSlotId}` : detail,
        href: `/dashboard/campaigns/${campaignId}`,
        aggregateType: "campaign",
        aggregateId: campaignId,
      });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    console.error("Assign campaign error:", error);
    return NextResponse.json({ error: "Failed to assign campaign" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { business } = await requireBusiness();
    const body = unassignSchema.parse(await request.json());

    const device = await prisma.deviceSlot.findFirst({
      where: { id: body.deviceSlotId, businessId: business.id },
    });
    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    const result = await endDeviceAssignment({
      businessId: business.id,
      deviceSlotId: body.deviceSlotId,
      reopenSlot: body.reopenSlot,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    console.error("Unassign campaign error:", error);
    return NextResponse.json({ error: "Failed to clear assignment" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  let businessId: string | undefined;
  let campaignId: string | undefined;
  let publishIntent = false;
  try {
    const { user, business } = await requireBusiness();
    businessId = business.id;
    const body = updateSchema.parse(await request.json());
    const { id, ...updates } = body;
    campaignId = id;
    publishIntent = updates.status === "LIVE";

    const existing = await prisma.campaign.findFirst({
      where: { id, businessId: business.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const contentChanging =
      updates.contentBlocks !== undefined ||
      updates.themeOverrides !== undefined ||
      updates.title !== undefined ||
      updates.endExperience !== undefined ||
      updates.formSettings !== undefined;

    if (contentChanging) {
      await snapshotCampaignBeforeUpdate({
        businessId: business.id,
        campaign: existing,
        label: "pre-save",
        publishedById: user.id,
      });
    }

    const data: Prisma.CampaignUpdateInput = {
      ...(updates.title !== undefined ? { title: updates.title } : {}),
      ...(updates.contentBlocks !== undefined
        ? { contentBlocks: updates.contentBlocks as Prisma.InputJsonValue }
        : {}),
      ...(updates.themeOverrides !== undefined
        ? { themeOverrides: updates.themeOverrides as Prisma.InputJsonValue }
        : {}),
      ...(updates.status !== undefined ? { status: updates.status } : {}),
      ...(updates.scheduledStart !== undefined
        ? { scheduledStart: updates.scheduledStart ? new Date(updates.scheduledStart) : null }
        : {}),
      ...(updates.scheduledEnd !== undefined
        ? { scheduledEnd: updates.scheduledEnd ? new Date(updates.scheduledEnd) : null }
        : {}),
      ...(updates.endExperience !== undefined
        ? { endExperience: updates.endExperience as Prisma.InputJsonValue }
        : {}),
      ...(updates.formSettings !== undefined
        ? { formSettings: updates.formSettings as Prisma.InputJsonValue }
        : {}),
      updatedBy: { connect: { id: user.id } },
    };

    const campaign = await prisma.campaign.update({
      where: { id },
      data,
    });

    let snapshot = null;
    if (contentChanging || updates.status === "LIVE") {
      const label =
        updates.status === "LIVE" ? "publish" : contentChanging ? "save" : "status";
      const manifest: CampaignPublishManifest = {
        kind: "campaign",
        title: campaign.title,
        status: campaign.status,
        contentBlocks: campaign.contentBlocks,
        themeOverrides: campaign.themeOverrides,
        scheduledStart: campaign.scheduledStart?.toISOString() ?? null,
        scheduledEnd: campaign.scheduledEnd?.toISOString() ?? null,
        endExperience: campaign.endExperience,
        formSettings: campaign.formSettings,
        label,
      };
      const recorded = await recordPublicationSnapshot({
        businessId: business.id,
        subjectType: "campaign",
        subjectId: campaign.id,
        manifest,
        publishedById: user.id,
      });
      snapshot = {
        id: recorded.snapshot.id,
        version: recorded.snapshot.version,
        label: recorded.snapshot.label,
        created: recorded.created,
      };
    }

    return NextResponse.json({ campaign, snapshot });
  } catch (error) {
    if (businessId && campaignId) {
      const detail =
        error instanceof Error ? error.message : "Failed to update campaign";
      void recordOperatorAlert({
        businessId,
        kind: publishIntent ? "publish_failed" : "save_failed",
        title: publishIntent ? "Campaign publish failed" : "Campaign save failed",
        detail,
        href: `/dashboard/campaigns/${campaignId}`,
        aggregateType: "campaign",
        aggregateId: campaignId,
      });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid campaign data" }, { status: 400 });
    }
    console.error("Update campaign error:", error);
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 });
  }
}
