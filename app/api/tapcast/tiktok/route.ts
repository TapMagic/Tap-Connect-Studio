import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import {
  adaptTikTokToReelsShorts,
  associateTikTokCast,
  composeTikTok916,
  connectTikTok,
  createTikTokCast,
  directPostTikTok,
  failAndRetryTikTok,
  getCast,
  getTikTokSnapshot,
  listTikTokAudit,
  refreshTikTokAnalytics,
  requestTikTokApproval,
  resolveTikTokApproval,
  runTikTokRelationshipFunnel,
  scheduleTikTokCast,
  setTikTokCaption,
  tikTokEnvSnapshot,
  updateTikTokStoryboard,
  uploadTikTokDraft,
} from "@/lib/fusion/tapcast/tiktok";

export const dynamic = "force-dynamic";

export async function GET() {
  const { business } = await requireBusiness();
  return NextResponse.json({
    ...getTikTokSnapshot(business.id),
    env: tikTokEnvSnapshot(),
    audit: listTikTokAudit(business.id),
  });
}

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("connect"),
    preferLive: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("create"),
    title: z.string().min(1).max(200),
    script: z.string().optional(),
    caption: z.string().optional(),
    hashtags: z.array(z.string()).optional(),
    campaignId: z.string().optional(),
    cardId: z.string().optional(),
    tapPointId: z.string().optional(),
  }),
  z.object({
    action: z.literal("storyboard"),
    castId: z.string(),
    beats: z.array(
      z.object({
        order: z.number(),
        narration: z.string(),
        visual: z.string(),
        durationSec: z.number(),
      })
    ),
  }),
  z.object({
    action: z.literal("compose"),
    castId: z.string(),
    durationSec: z.number().optional(),
    coverNote: z.string().optional(),
  }),
  z.object({
    action: z.literal("caption"),
    castId: z.string(),
    caption: z.string(),
    hashtags: z.array(z.string()).optional(),
  }),
  z.object({
    action: z.literal("upload_draft"),
    castId: z.string(),
  }),
  z.object({
    action: z.literal("request_approval"),
    castId: z.string(),
  }),
  z.object({
    action: z.literal("resolve_approval"),
    castId: z.string(),
    decision: z.enum(["approve", "reject"]),
  }),
  z.object({
    action: z.literal("schedule"),
    castId: z.string(),
    scheduledAt: z.string(),
  }),
  z.object({
    action: z.literal("direct_post"),
    castId: z.string(),
  }),
  z.object({
    action: z.literal("retry"),
    castId: z.string(),
  }),
  z.object({
    action: z.literal("associate"),
    castId: z.string(),
    campaignId: z.string().optional(),
    cardId: z.string().optional(),
    tapPointId: z.string().optional(),
  }),
  z.object({
    action: z.literal("analytics"),
    castId: z.string(),
  }),
  z.object({
    action: z.literal("adapt"),
    castId: z.string(),
  }),
  z.object({
    action: z.literal("funnel_workflow"),
    title: z.string().min(1),
    script: z.string().optional(),
  }),
  z.object({
    action: z.literal("get"),
    castId: z.string(),
  }),
]);

export async function POST(req: Request) {
  const { business } = await requireBusiness();
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const body = parsed.data;
  switch (body.action) {
    case "connect":
      return NextResponse.json(connectTikTok({ businessId: business.id, preferLive: body.preferLive }));
    case "create":
      return NextResponse.json(
        createTikTokCast({ businessId: business.id, ...body })
      );
    case "storyboard":
      return NextResponse.json(updateTikTokStoryboard(body.castId, body.beats));
    case "compose":
      return NextResponse.json(
        composeTikTok916(body.castId, {
          durationSec: body.durationSec,
          coverNote: body.coverNote,
        })
      );
    case "caption":
      return NextResponse.json(
        setTikTokCaption(body.castId, body.caption, body.hashtags)
      );
    case "upload_draft":
      return NextResponse.json(uploadTikTokDraft(body.castId));
    case "request_approval":
      return NextResponse.json(requestTikTokApproval(body.castId));
    case "resolve_approval":
      return NextResponse.json(
        resolveTikTokApproval(body.castId, body.decision)
      );
    case "schedule":
      return NextResponse.json(
        scheduleTikTokCast(body.castId, body.scheduledAt)
      );
    case "direct_post":
      return NextResponse.json(directPostTikTok(body.castId));
    case "retry":
      return NextResponse.json(failAndRetryTikTok(body.castId));
    case "associate":
      return NextResponse.json(
        associateTikTokCast(body.castId, {
          campaignId: body.campaignId,
          cardId: body.cardId,
          tapPointId: body.tapPointId,
        })
      );
    case "analytics":
      return NextResponse.json(refreshTikTokAnalytics(body.castId));
    case "adapt":
      return NextResponse.json(adaptTikTokToReelsShorts(body.castId));
    case "funnel_workflow":
      return NextResponse.json(
        runTikTokRelationshipFunnel({
          businessId: business.id,
          title: body.title,
          script: body.script,
        })
      );
    case "get": {
      const cast = getCast(body.castId);
      if (!cast || cast.businessId !== business.id) {
        return NextResponse.json({ ok: false, error: "Not found", code: "not_found" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, data: cast, mode: cast.mode });
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
