import { Prisma, type CampaignStatus, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";

type CampaignCommandClient = Pick<PrismaClient, "campaign" | "campaignLifecycleEvent">;

export type CampaignCommand =
  | "save_draft"
  | "mark_ready"
  | "schedule"
  | "activate"
  | "pause"
  | "complete"
  | "fail"
  | "archive"
  | "restore";

const TRANSITIONS: Record<CampaignStatus, readonly CampaignStatus[]> = {
  DRAFT: ["READY", "ARCHIVED"],
  READY: ["DRAFT", "SCHEDULED", "LIVE", "ARCHIVED"],
  SCHEDULED: ["DRAFT", "LIVE", "PAUSED", "COMPLETED", "FAILED", "ARCHIVED"],
  LIVE: ["PAUSED", "COMPLETED", "FAILED", "ARCHIVED"],
  PAUSED: ["DRAFT", "SCHEDULED", "LIVE", "ARCHIVED"],
  COMPLETED: ["ARCHIVED"],
  FAILED: ["DRAFT", "ARCHIVED"],
  ARCHIVED: ["DRAFT"],
  CLOSED: ["ARCHIVED"],
};

export class CampaignCommandError extends Error {
  constructor(
    message: string,
    readonly code: "not_found" | "invalid_transition" | "invalid_schedule",
    readonly status: number,
  ) {
    super(message);
    this.name = "CampaignCommandError";
  }
}

export function canTransitionCampaign(from: CampaignStatus, to: CampaignStatus) {
  return from === to || TRANSITIONS[from].includes(to);
}

export function ownerCampaignStatus(status: CampaignStatus) {
  return status === "LIVE" ? "ACTIVE" : status;
}

export async function transitionCampaign(input: {
  businessId: string;
  campaignId: string;
  toStatus: CampaignStatus;
  command: CampaignCommand;
  actorId?: string | null;
  reason?: string | null;
  scheduledStart?: Date | null;
  scheduledEnd?: Date | null;
  externalSchedule?: boolean;
  client?: CampaignCommandClient;
}) {
  const client = input.client ?? prisma;
  const execute = async (tx: CampaignCommandClient) => {
    const campaign = await tx.campaign.findFirst({
      where: { id: input.campaignId, businessId: input.businessId },
    });
    if (!campaign) throw new CampaignCommandError("Campaign not found.", "not_found", 404);
    if (!canTransitionCampaign(campaign.status, input.toStatus)) {
      throw new CampaignCommandError(
        `${ownerCampaignStatus(campaign.status)} Campaigns cannot move directly to ${ownerCampaignStatus(input.toStatus)}.`,
        "invalid_transition",
        409,
      );
    }
    if (input.toStatus === "SCHEDULED") {
      if (!input.externalSchedule && (!input.scheduledStart || !input.scheduledEnd || input.scheduledEnd <= input.scheduledStart)) {
        throw new CampaignCommandError(
          "Choose a schedule with an end after its start.",
          "invalid_schedule",
          400,
        );
      }
    }
    const updated = await tx.campaign.update({
      where: { id: campaign.id },
      data: {
        status: input.toStatus,
        ...(input.scheduledStart !== undefined ? { scheduledStart: input.scheduledStart } : {}),
        ...(input.scheduledEnd !== undefined ? { scheduledEnd: input.scheduledEnd } : {}),
        ...(input.actorId ? { updatedById: input.actorId } : {}),
      },
    });
    if (campaign.status !== input.toStatus) {
      await tx.campaignLifecycleEvent.create({
        data: {
          businessId: input.businessId,
          campaignId: campaign.id,
          fromStatus: campaign.status,
          toStatus: input.toStatus,
          command: input.command,
          reason: input.reason,
          actorId: input.actorId,
          metadata: {
            scheduledStart: input.scheduledStart?.toISOString(),
            scheduledEnd: input.scheduledEnd?.toISOString(),
          } as Prisma.InputJsonValue,
        },
      });
    }
    return updated;
  };
  if (input.client) return execute(client);
  return prisma.$transaction((tx) => execute(tx));
}

export async function inspectCampaignLifecycle(businessId: string, campaignId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, businessId },
    include: { lifecycleEvents: { orderBy: { occurredAt: "desc" }, take: 50 } },
  });
  if (!campaign) throw new CampaignCommandError("Campaign not found.", "not_found", 404);
  return {
    campaign,
    ownerStatus: ownerCampaignStatus(campaign.status),
    allowedNext: TRANSITIONS[campaign.status].map(ownerCampaignStatus),
  };
}
