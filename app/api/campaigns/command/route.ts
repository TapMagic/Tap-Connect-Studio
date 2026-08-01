import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import {
  CampaignCommandError,
  inspectCampaignLifecycle,
  transitionCampaign,
} from "@/lib/services/campaign-commands";

const commandSchema = z.discriminatedUnion("command", [
  z.object({ command: z.literal("mark_ready"), campaignId: z.string() }),
  z.object({
    command: z.literal("schedule"),
    campaignId: z.string(),
    scheduledStart: z.string().datetime(),
    scheduledEnd: z.string().datetime(),
  }),
  z.object({ command: z.literal("activate"), campaignId: z.string() }),
  z.object({ command: z.literal("pause"), campaignId: z.string() }),
  z.object({ command: z.literal("complete"), campaignId: z.string() }),
  z.object({ command: z.literal("fail"), campaignId: z.string(), reason: z.string().min(1) }),
  z.object({ command: z.literal("archive"), campaignId: z.string() }),
  z.object({ command: z.literal("restore"), campaignId: z.string() }),
]);

const TARGETS = {
  mark_ready: "READY",
  schedule: "SCHEDULED",
  activate: "LIVE",
  pause: "PAUSED",
  complete: "COMPLETED",
  fail: "FAILED",
  archive: "ARCHIVED",
  restore: "DRAFT",
} as const;

function errorResponse(error: unknown) {
  if (error instanceof CampaignCommandError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: "Invalid Campaign command." }, { status: 400 });
  }
  console.error("Campaign command error:", error);
  return NextResponse.json({ error: "Campaign command failed." }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const { business } = await requireBusiness();
    const campaignId = new URL(request.url).searchParams.get("campaignId");
    if (!campaignId) return NextResponse.json({ error: "campaignId is required." }, { status: 400 });
    return NextResponse.json(await inspectCampaignLifecycle(business.id, campaignId));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { business, user } = await requireBusiness();
    const body = commandSchema.parse(await request.json());
    const campaign = await transitionCampaign({
      businessId: business.id,
      campaignId: body.campaignId,
      toStatus: TARGETS[body.command],
      command: body.command,
      actorId: user.id,
      reason: "reason" in body ? body.reason : undefined,
      scheduledStart: body.command === "schedule" ? new Date(body.scheduledStart) : undefined,
      scheduledEnd: body.command === "schedule" ? new Date(body.scheduledEnd) : undefined,
    });
    return NextResponse.json({ campaign, status: campaign.status === "LIVE" ? "ACTIVE" : campaign.status });
  } catch (error) {
    return errorResponse(error);
  }
}
