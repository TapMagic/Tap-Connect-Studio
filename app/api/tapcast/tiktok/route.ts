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
  flushTikTokPersists,
  getCast,
  getTikTokSnapshot,
  hydrateTikTokConnection,
  listTikTokAuditFromDb,
  listTikTokCastsFromDb,
  refreshTikTokAnalytics,
  requestTikTokApproval,
  resolveTikTokApproval,
  runTikTokRelationshipFunnel,
  scheduleTikTokCast,
  setTikTokCaption,
  tikTokEnvSnapshot,
  tikTokPersistenceEnabled,
  updateTikTokStoryboard,
  uploadTikTokDraft,
} from "@/lib/fusion/tapcast/tiktok";

export const dynamic = "force-dynamic";

export async function GET() {
  const { business } = await requireBusiness();
  await flushTikTokPersists();
  await hydrateTikTokConnection(business.id);
  const casts = await listTikTokCastsFromDb(business.id);
  return NextResponse.json({
    ...getTikTokSnapshot(business.id),
    casts,
    env: tikTokEnvSnapshot(),
    audit: await listTikTokAuditFromDb(business.id),
    persistence: tikTokPersistenceEnabled() ? "prisma" : "memory",
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
  let response: NextResponse;
  switch (body.action) {
    case "connect":
      response = NextResponse.json(
        connectTikTok({ businessId: business.id, preferLive: body.preferLive })
      );
      break;
    case "create":
      response = NextResponse.json(
        createTikTokCast({ businessId: business.id, ...body })
      );
      break;
    case "storyboard":
      response = NextResponse.json(updateTikTokStoryboard(body.castId, body.beats));
      break;
    case "compose":
      response = NextResponse.json(
        composeTikTok916(body.castId, {
          durationSec: body.durationSec,
          coverNote: body.coverNote,
        })
      );
      break;
    case "caption":
      response = NextResponse.json(
        setTikTokCaption(body.castId, body.caption, body.hashtags)
      );
      break;
    case "upload_draft":
      response = NextResponse.json(uploadTikTokDraft(body.castId));
      break;
    case "request_approval":
      response = NextResponse.json(requestTikTokApproval(body.castId));
      break;
    case "resolve_approval":
      response = NextResponse.json(
        resolveTikTokApproval(body.castId, body.decision)
      );
      break;
    case "schedule":
      response = NextResponse.json(
        scheduleTikTokCast(body.castId, body.scheduledAt)
      );
      break;
    case "direct_post":
      response = NextResponse.json(directPostTikTok(body.castId));
      break;
    case "retry":
      response = NextResponse.json(failAndRetryTikTok(body.castId));
      break;
    case "associate":
      response = NextResponse.json(
        associateTikTokCast(body.castId, {
          campaignId: body.campaignId,
          cardId: body.cardId,
          tapPointId: body.tapPointId,
        })
      );
      break;
    case "analytics":
      response = NextResponse.json(refreshTikTokAnalytics(body.castId));
      break;
    case "adapt":
      response = NextResponse.json(adaptTikTokToReelsShorts(body.castId));
      break;
    case "funnel_workflow":
      response = NextResponse.json(
        runTikTokRelationshipFunnel({
          businessId: business.id,
          title: body.title,
          script: body.script,
        })
      );
      break;
    case "get": {
      const cast = getCast(body.castId);
      if (!cast || cast.businessId !== business.id) {
        return NextResponse.json(
          { ok: false, error: "Not found", code: "not_found" },
          { status: 404 }
        );
      }
      response = NextResponse.json({ ok: true, data: cast, mode: cast.mode });
      break;
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
  await flushTikTokPersists();
  return response;
}
