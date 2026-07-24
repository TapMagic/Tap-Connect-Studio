/**
 * Persist real Campaign / CampaignGroup objects from TapCanvas guided creation.
 */

import { prisma } from "@/lib/db";
import { isIsolatedFusionDatabaseConfigured } from "@/lib/fusion/db/safety";
import { createExternalWorkItem } from "@/lib/fusion/connectors/productivity/adapter";
import { applyCanvasTemplate, createWeeklySpecialsGroup } from "./templates";
import { createCanvasApprovalDb, flushCanvasState, persistCanvasDocument } from "./persist";
import { updateNode, requireCanvas } from "./graph";
import type { TapCanvas } from "./types";

export type PersistedCampaignCreation = {
  ok: boolean;
  canvas: TapCanvas;
  campaignIds: string[];
  groupId?: string;
  workItemIds: string[];
  persistence: "prisma" | "memory_stub";
  message: string;
};

export async function createSimpleCampaignViaCanvas(opts: {
  businessId: string;
  title: string;
  timezone?: string;
}): Promise<PersistedCampaignCreation> {
  const templated = applyCanvasTemplate({
    businessId: opts.businessId,
    templateId: "simple_campaign",
    name: opts.title,
  });
  const canvas = templated.canvas;

  if (!isIsolatedFusionDatabaseConfigured()) {
    await flushCanvasState(canvas.id);
    return {
      ok: true,
      canvas,
      campaignIds: templated.createdObjectStubs
        .filter((s) => s.type === "campaign")
        .map((s) => s.id),
      workItemIds: templated.workItemIds,
      persistence: "memory_stub",
      message: "DATABASE_URL not isolated — stubs only",
    };
  }

  const campaign = await prisma.campaign.create({
    data: {
      businessId: opts.businessId,
      title: opts.title,
      campaignType: "COUPON_OFFER",
      status: "DRAFT",
      contentBlocks: [
        {
          type: "heading",
          props: { text: opts.title },
          enabled: true,
        },
        {
          type: "text",
          props: { text: "Created via TapCanvas guided Simple Campaign" },
          enabled: true,
        },
        {
          type: "offer",
          props: { title: opts.title, expiresLabel: "This week" },
          enabled: true,
        },
      ],
    },
  });

  const campaignNode = canvas.nodes.find((n) => n.kind === "campaign");
  if (campaignNode) {
    updateNode(canvas.id, campaignNode.id, {
      linked: { type: "campaign", id: campaign.id },
      label: campaign.title,
      data: { sketch: false, authority: "tapconnect" },
    });
  }

  const fresh = requireCanvas(canvas.id);
  await persistCanvasDocument(fresh);
  await flushCanvasState(fresh.id);

  const approval = createExternalWorkItem({
    provider: "monday",
    businessId: opts.businessId,
    title: `Approve campaign: ${campaign.title}`,
    sourceType: "campaign_approval",
    sourceId: campaign.id,
    priority: "high",
    idempotencyKey: `campaign_approval:${campaign.id}:monday`,
  });
  const workItemIds = [...templated.workItemIds];
  if (approval.ok) {
    workItemIds.push(approval.data.id);
    try {
      await createCanvasApprovalDb({
        documentId: fresh.id,
        subjectType: "campaign",
        subjectId: campaign.id,
        workItemId: approval.data.id,
      });
    } catch {
      // Approval projection is best-effort; campaign + canvas already persisted
    }
  }

  return {
    ok: true,
    canvas: fresh,
    campaignIds: [campaign.id],
    workItemIds,
    persistence: "prisma",
    message: "Campaign persisted + TapCanvas document saved",
  };
}

export async function createWeeklySpecialsViaCanvas(opts: {
  businessId: string;
  name?: string;
  timezone?: string;
}): Promise<PersistedCampaignCreation> {
  const recipe = createWeeklySpecialsGroup({
    businessId: opts.businessId,
    name: opts.name ?? "Weekly Specials",
  });
  const canvas = recipe.canvas;

  if (!isIsolatedFusionDatabaseConfigured()) {
    await flushCanvasState(canvas.id);
    return {
      ok: true,
      canvas,
      campaignIds: [],
      workItemIds: recipe.workItemIds,
      persistence: "memory_stub",
      message: "DATABASE_URL not isolated — canvas stubs only",
    };
  }

  const group = await prisma.campaignGroup.create({
    data: {
      businessId: opts.businessId,
      title: opts.name ?? "Weekly Specials",
      timezone: opts.timezone ?? "America/New_York",
    },
  });

  const days = [
    { title: "Monday burgers", dow: 1 },
    { title: "Tuesday tacos", dow: 2 },
    { title: "Wednesday trivia", dow: 3 },
    { title: "Friday wings", dow: 5 },
  ];

  const campaignIds: string[] = [];
  for (const day of days) {
    const c = await prisma.campaign.create({
      data: {
        businessId: opts.businessId,
        title: day.title,
        campaignType: "COUPON_OFFER",
        status: "DRAFT",
        groupId: group.id,
        contentBlocks: [
          {
            type: "heading",
            props: { text: day.title },
            enabled: true,
          },
          {
            type: "offer",
            props: { title: day.title },
            enabled: true,
          },
        ],
      },
    });
    campaignIds.push(c.id);
    await prisma.campaignGroupSlot.create({
      data: {
        businessId: opts.businessId,
        groupId: group.id,
        campaignId: c.id,
        label: day.title,
        daysOfWeek: [day.dow],
        startTime: "17:00",
        endTime: "19:00",
        priority: day.dow,
        enabled: true,
      },
    });
  }

  const fallback = await prisma.campaign.create({
    data: {
      businessId: opts.businessId,
      title: `${group.title} fallback`,
      campaignType: "COUPON_OFFER",
      status: "DRAFT",
      groupId: group.id,
      contentBlocks: [
        {
          type: "heading",
          props: { text: "Standard Card fallback" },
          enabled: true,
        },
      ],
    },
  });
  campaignIds.push(fallback.id);

  await prisma.campaignGroup.update({
    where: { id: group.id },
    data: { defaultCampaignId: fallback.id },
  });

  const groupNode = canvas.nodes.find((n) => n.kind === "campaign_group");
  if (groupNode) {
    updateNode(canvas.id, groupNode.id, {
      linked: { type: "campaign_group", id: group.id },
      label: group.title,
      data: { sketch: false, authority: "tapconnect" },
    });
  }

  const fresh = requireCanvas(canvas.id);
  await persistCanvasDocument(fresh);
  await flushCanvasState(fresh.id);

  const approval = createExternalWorkItem({
    provider: "asana",
    businessId: opts.businessId,
    title: `Approve weekly specials: ${group.title}`,
    sourceType: "campaign_approval",
    sourceId: group.id,
    priority: "high",
    idempotencyKey: `campaign_approval:${group.id}:asana`,
  });
  const workItemIds = [...recipe.workItemIds];
  if (approval.ok) {
    workItemIds.push(approval.data.id);
    try {
      await createCanvasApprovalDb({
        documentId: fresh.id,
        subjectType: "campaign_group",
        subjectId: group.id,
        workItemId: approval.data.id,
      });
    } catch {
      // Approval projection is best-effort; group + canvas already persisted
    }
  }

  return {
    ok: true,
    canvas: fresh,
    campaignIds,
    groupId: group.id,
    workItemIds,
    persistence: "prisma",
    message: "Weekly specials group + campaigns persisted",
  };
}
