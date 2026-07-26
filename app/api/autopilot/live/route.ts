import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseTapConnectCard } from "@/lib/brand/tap-card";
import { parseBrandContactProfile } from "@/lib/brand/contact-profile";
import {
  persistActivateCardOfferMeasurable,
  loadCurrentLiveActivation,
  deriveAuthoritativeLiveState,
  loadObservationCounts,
} from "@/lib/fusion/autopilot/live-persist";
import { refreshObservation } from "@/lib/fusion/autopilot/live-orchestrator";
import type { AutopilotPlan } from "@/lib/fusion/autopilot/plan";
import type { PreparedExecution } from "@/lib/fusion/autopilot/prepared-execution";
import type { KnowledgeFact } from "@/lib/fusion/autopilot/knowledge-fact";
import type { ContentBlock } from "@/lib/types/campaign";

export const dynamic = "force-dynamic";

const activateSchema = z.object({
  plan: z.unknown(),
  execution: z.unknown(),
  campaignId: z.string().min(1),
  cardId: z.string().min(1),
  finalApprovalGranted: z.literal(true),
  approvalId: z.string().optional(),
  deviceCode: z.string().optional(),
  facts: z.array(z.unknown()).optional(),
  readiness: z.object({
    featureOfferEnabled: z.boolean(),
    featureAutopilotEnabled: z.boolean().optional(),
    emailConnected: z.boolean().optional(),
    consentPathAvailable: z.boolean().optional(),
    approvedTapPoints: z
      .array(z.object({ code: z.string(), label: z.string().optional() }))
      .optional(),
    cardFirstApproved: z.boolean().optional(),
    askQuestionAvailable: z.boolean().optional(),
    keepCardAvailable: z.boolean().optional(),
  }),
  existingActivationId: z.string().optional(),
});

/**
 * POST — authoritative Make it live
 * GET  — reload durable activation + derived live state
 */
export async function POST(request: Request) {
  try {
    const { business, user } = await requireBusiness();
    const body = activateSchema.parse(await request.json());

    const campaign = await prisma.campaign.findFirst({
      where: { id: body.campaignId, businessId: business.id },
      select: {
        id: true,
        title: true,
        status: true,
        contentBlocks: true,
        scheduledStart: true,
        scheduledEnd: true,
      },
    });
    if (!campaign) {
      return NextResponse.json(
        { ok: false, error: "Campaign not found", code: "campaign_not_found" },
        { status: 404 }
      );
    }

    const brandKit = await prisma.brandKit.findUnique({
      where: { businessId: business.id },
    });
    const profile = parseBrandContactProfile(brandKit?.socialLinks);
    const card = parseTapConnectCard(brandKit?.tapCard, {
      businessName: business.name,
      profile,
      logoUrl: business.logoUrl,
    });

    const existing = body.existingActivationId
      ? await loadCurrentLiveActivation({
          businessId: business.id,
          campaignId: body.campaignId,
        })
      : await loadCurrentLiveActivation({
          businessId: business.id,
          campaignId: body.campaignId,
        });

    const result = await persistActivateCardOfferMeasurable({
      businessId: business.id,
      businessName: business.name,
      logoUrl: business.logoUrl,
      actorId: user?.id ?? null,
      plan: body.plan as unknown as AutopilotPlan,
      execution: body.execution as unknown as PreparedExecution,
      campaign: {
        id: campaign.id,
        title: campaign.title,
        status: campaign.status,
        contentBlocks: campaign.contentBlocks as unknown as ContentBlock[],
        scheduledStart: campaign.scheduledStart?.toISOString() ?? null,
        scheduledEnd: campaign.scheduledEnd?.toISOString() ?? null,
      },
      card: {
        id: body.cardId,
        sections: card.sections,
        retired: false,
      },
      facts: (body.facts as unknown as KnowledgeFact[]) ?? [],
      readiness: body.readiness,
      finalApprovalGranted: true,
      approvalId: body.approvalId,
      deviceCode: body.deviceCode,
      existingActivation: existing?.activation ?? null,
      allowAssignApprovedTapPoint: true,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          code: result.activation.failure?.code || "activation_failed",
          error: result.message,
          activation: result.activation,
          execution: result.execution,
          domain: {
            campaignStatus: result.domain.campaignStatus,
          },
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      ok: true,
      activation: result.activation,
      execution: result.execution,
      plan: result.plan,
      observation: result.observation,
      idempotent: result.idempotent,
      verifiedPublic: result.verifiedPublic,
      domain: {
        campaignStatus: result.domain.campaignStatus,
        insightsObservationActive: result.domain.insightsObservationActive,
      },
      honesty: {
        distributionSent: false,
        customerContactOccurred: false,
      },
      record: {
        activationId: result.record.activation.activationId,
        verification: result.record.verification,
        prior: {
          campaignStatus: result.record.prior.campaignStatus,
          createdByF3Assignment: result.record.prior.assignment?.createdByF3 ?? false,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Invalid activation request", code: "validation" },
        { status: 400 }
      );
    }
    console.error("Autopilot live activate error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Autopilot could not safely make the offer live. Nothing was left half-finished.",
        code: "server",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { business } = await requireBusiness();
    const url = new URL(request.url);
    const campaignId = url.searchParams.get("campaignId") || undefined;
    const deviceCode = url.searchParams.get("deviceCode") || undefined;

    if (!campaignId) {
      const record = await loadCurrentLiveActivation({ businessId: business.id });
      return NextResponse.json({
        ok: true,
        activation: record?.activation ?? null,
        plan: record?.plan ?? null,
        execution: record?.execution ?? null,
        verification: record?.verification ?? null,
      });
    }

    const derived = await deriveAuthoritativeLiveState({
      businessId: business.id,
      businessName: business.name,
      logoUrl: business.logoUrl,
      campaignId,
      deviceCode: deviceCode || undefined,
    });

    let observation = derived.observation;
    if (derived.record) {
      const counts = await loadObservationCounts({
        businessId: business.id,
        campaignId,
      });
      observation = refreshObservation({
        activation: {
          ...derived.record.activation,
          hostStateLabel: derived.hostLabel,
        },
        events: counts,
      });
    }

    return NextResponse.json({
      ok: true,
      hostLabel: derived.hostLabel,
      maySayYourOfferIsLive: derived.maySayYourOfferIsLive,
      reason: derived.reason,
      campaignStatus: derived.campaignStatus,
      activation: derived.record?.activation ?? null,
      plan: derived.record?.plan ?? null,
      execution: derived.record?.execution ?? null,
      verification: derived.record?.verification ?? null,
      observation,
      honesty: {
        distributionSent: false,
        customerContactOccurred: false,
        externalBoundary:
          "Email and social are prepared but have not been sent.",
      },
    });
  } catch (error) {
    console.error("Autopilot live GET error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to load live status", code: "server" },
      { status: 500 }
    );
  }
}
