/**
 * Omnichannel TapCast API — registry, connect, variants, publish, canvas distribution.
 * TikTok first-class remains at /api/tapcast/tiktok.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { DISPLAY_READINESS_LABEL } from "@/lib/fusion/readiness/display-status";
import {
  evaluateAllChannelReadiness,
  getTapCastChannel,
  listTapCastChannels,
  registrySnapshot,
} from "@/lib/fusion/tapcast/registry";
import {
  approveVariant,
  buildCampaignDistributionGraph,
  connectChannel,
  createChannelVariant,
  createMultiChannelVariants,
  DISTRIBUTION_ACTIONS,
  flushOmnichannelPersists,
  getOmnichannelSnapshot,
  hydrateChannelConnections,
  listOmnichannelAuditFromDb,
  listVariantsFromDb,
  omnichannelPersistenceEnabled,
  openProviderComposer,
  publishCampaignChannels,
  publishVariantMock,
  reAdaptVariant,
  refreshVariantAnalytics,
  retryVariant,
  runDistributionAction,
  scheduleVariant,
  connectionsMap,
} from "@/lib/fusion/tapcast/omnichannel";

export const dynamic = "force-dynamic";

const sourceSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(200),
  body: z.string().optional(),
  offerText: z.string().optional(),
  cta: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  mediaUrl: z.string().optional(),
  tapPointId: z.string().optional(),
  cardId: z.string().optional(),
});

export async function GET(req: Request) {
  const { business } = await requireBusiness();
  await flushOmnichannelPersists();
  await hydrateChannelConnections(business.id);
  const url = new URL(req.url);
  const view = url.searchParams.get("view") ?? "hub";
  const campaignId = url.searchParams.get("campaignId") ?? undefined;
  const channelId = url.searchParams.get("channelId") ?? undefined;

  if (view === "registry") {
    return NextResponse.json({
      ok: true,
      ...registrySnapshot(),
      statusLabel: DISPLAY_READINESS_LABEL.verified_credentials_required,
      readiness: evaluateAllChannelReadiness(connectionsMap(business.id)),
      persistence: omnichannelPersistenceEnabled() ? "prisma" : "memory",
    });
  }

  const variants = await listVariantsFromDb(business.id, { campaignId, channelId });
  const snapshot = getOmnichannelSnapshot(business.id);

  return NextResponse.json({
    ok: true,
    ...snapshot,
    variants,
    registry: registrySnapshot(),
    readiness: evaluateAllChannelReadiness(connectionsMap(business.id)),
    distributionActions: DISTRIBUTION_ACTIONS,
    channels: listTapCastChannels(),
    audit: await listOmnichannelAuditFromDb(business.id),
    statusLabel: DISPLAY_READINESS_LABEL.verified_credentials_required,
    persistence: omnichannelPersistenceEnabled() ? "prisma" : "memory",
  });
}

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("connect"),
    channelId: z.string(),
    preferLive: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("create_variant"),
    campaignId: z.string(),
    channelId: z.string(),
    source: sourceSchema,
  }),
  z.object({
    action: z.literal("create_variants"),
    campaignId: z.string(),
    channelIds: z.array(z.string()).min(1),
    source: sourceSchema,
  }),
  z.object({
    action: z.literal("adapt"),
    variantId: z.string(),
    source: sourceSchema,
  }),
  z.object({
    action: z.literal("approve"),
    variantId: z.string(),
    decision: z.enum(["approve", "reject"]),
  }),
  z.object({
    action: z.literal("schedule"),
    variantId: z.string(),
    scheduledAt: z.string(),
  }),
  z.object({
    action: z.literal("publish_mock"),
    variantId: z.string(),
    forceFail: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("publish_campaign"),
    campaignId: z.string(),
    variantIds: z.array(z.string()).optional(),
    forceFailChannels: z.array(z.string()).optional(),
  }),
  z.object({
    action: z.literal("retry"),
    variantId: z.string(),
  }),
  z.object({
    action: z.literal("analytics"),
    variantId: z.string(),
  }),
  z.object({
    action: z.literal("open_provider"),
    variantId: z.string(),
  }),
  z.object({
    action: z.literal("distribution_graph"),
    campaignId: z.string(),
    campaignTitle: z.string(),
    channelIds: z.array(z.string()).min(1),
    source: sourceSchema,
    canvasId: z.string().optional(),
    canvasName: z.string().optional(),
  }),
  z.object({
    action: z.literal("distribution_action"),
    canvasId: z.string(),
    distributionAction: z.enum([
      "create_variant",
      "adapt",
      "approve",
      "schedule",
      "publish",
      "retry",
      "open_provider",
      "performance",
    ]),
    variantId: z.string().optional(),
    channelId: z.string().optional(),
    campaignId: z.string().optional(),
    source: sourceSchema.optional(),
    scheduledAt: z.string().optional(),
    decision: z.enum(["approve", "reject"]).optional(),
  }),
  z.object({
    action: z.literal("registry"),
  }),
]);

export async function POST(req: Request) {
  const { business } = await requireBusiness();
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid body", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const body = parsed.data;

  let result:
    | { ok: true; data: unknown; mode?: "mock" | "live" }
    | { ok: false; error: string; code?: string };

  switch (body.action) {
    case "connect": {
      if (!getTapCastChannel(body.channelId)) {
        return NextResponse.json(
          { ok: false, error: "Unknown channel", code: "unknown_channel" },
          { status: 400 }
        );
      }
      result = connectChannel({
        businessId: business.id,
        channelId: body.channelId,
        preferLive: body.preferLive,
      });
      break;
    }
    case "create_variant": {
      result = createChannelVariant({
        businessId: business.id,
        campaignId: body.campaignId,
        channelId: body.channelId,
        source: { ...body.source, id: body.campaignId },
      });
      break;
    }
    case "create_variants": {
      result = createMultiChannelVariants({
        businessId: business.id,
        campaignId: body.campaignId,
        channelIds: body.channelIds,
        source: { ...body.source, id: body.campaignId },
      });
      break;
    }
    case "adapt": {
      result = reAdaptVariant(body.variantId, {
        ...body.source,
        id: body.source.id ?? "campaign",
      });
      break;
    }
    case "approve": {
      result = approveVariant(body.variantId, body.decision);
      break;
    }
    case "schedule": {
      result = scheduleVariant(body.variantId, body.scheduledAt);
      break;
    }
    case "publish_mock": {
      result = publishVariantMock(body.variantId, { forceFail: body.forceFail });
      break;
    }
    case "publish_campaign": {
      result = publishCampaignChannels({
        businessId: business.id,
        campaignId: body.campaignId,
        variantIds: body.variantIds,
        forceFailChannels: body.forceFailChannels,
      });
      break;
    }
    case "retry": {
      result = retryVariant(body.variantId);
      break;
    }
    case "analytics": {
      result = refreshVariantAnalytics(body.variantId);
      break;
    }
    case "open_provider": {
      result = openProviderComposer(body.variantId);
      break;
    }
    case "distribution_graph": {
      const graph = buildCampaignDistributionGraph({
        businessId: business.id,
        campaignId: body.campaignId,
        campaignTitle: body.campaignTitle,
        channelIds: body.channelIds,
        source: { ...body.source, id: body.campaignId },
        canvasId: body.canvasId,
        canvasName: body.canvasName,
      });
      result = { ok: true, data: graph, mode: "mock" };
      break;
    }
    case "distribution_action": {
      const actionResult = runDistributionAction({
        canvasId: body.canvasId,
        action: body.distributionAction,
        variantId: body.variantId,
        channelId: body.channelId,
        campaignId: body.campaignId,
        businessId: business.id,
        source: body.source
          ? { ...body.source, id: body.source.id ?? body.campaignId ?? "campaign" }
          : undefined,
        scheduledAt: body.scheduledAt,
        decision: body.decision,
      });
      result = actionResult.ok
        ? { ok: true, data: actionResult, mode: "mock" }
        : { ok: false, error: actionResult.error ?? "failed", code: "distribution_action_failed" };
      break;
    }
    case "registry": {
      result = {
        ok: true,
        data: registrySnapshot(),
        mode: "mock",
      };
      break;
    }
  }

  await flushOmnichannelPersists();

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json({
    ...result,
    statusLabel: DISPLAY_READINESS_LABEL.verified_credentials_required,
    persistence: omnichannelPersistenceEnabled() ? "prisma" : "memory",
  });
}
