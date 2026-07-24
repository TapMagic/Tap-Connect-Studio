import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkFeatureGate, featureGateJsonBody } from "@/lib/fusion/features/gate";
import { loadFeatureContext } from "@/lib/fusion/features/server";
import {
  KEYWORD_FEATURE_ID,
  acceptVocabularyTerms,
  applyVocabularyTerms,
  archiveVocabularyTerm,
  configureVocabularyRepository,
  createNamedBrandPack,
  deleteNamedBrandPack,
  detectAndBindTrigger,
  editVocabularyTerm,
  getConversationalSet,
  getVocabularyAnalytics,
  listNamedBrandPacks,
  loadVocabularyPack,
  lockVocabularyTerm,
  observePerformanceStub,
  parseKeywordBrandPack,
  rejectVocabularyTerms,
  restoreVocabularyTerm,
  saveBrandPackView,
  suggestVocabulary,
  updateNamedBrandPack,
} from "@/lib/fusion/keywords";
import {
  createPrismaVocabularyRepository,
  vocabularyPersistenceEnabled,
} from "@/lib/fusion/keywords/prisma-repository";

function ensureVocabularyRepo() {
  if (vocabularyPersistenceEnabled()) {
    configureVocabularyRepository(createPrismaVocabularyRepository());
  }
}

const channelSchema = z.enum([
  "tiktok",
  "instagram",
  "facebook",
  "threads",
  "youtube",
  "youtube_shorts",
  "linkedin",
  "pinterest",
  "x",
  "bluesky",
  "gbp",
  "snapchat",
  "reddit",
  "mastodon",
  "nextdoor",
  "email",
  "messenger",
  "instagram_direct",
  "whatsapp",
  "telegram",
  "sms",
  "discord",
  "tapcanvas",
  "tapflow",
  "assets_templates",
]);

const termSchema = z.object({
  id: z.string().min(1).max(80),
  value: z.string().trim().min(1).max(120),
  kind: z.enum([
    "keyword",
    "hashtag",
    "phrase",
    "trigger",
    "synonym",
    "asset_tag",
    "misspelling",
    "required",
    "excluded",
    "competitor",
  ]),
  family: z
    .enum([
      "primary",
      "local",
      "audience",
      "intent",
      "branded_keyword",
      "branded_hashtag",
      "niche",
      "campaign_hashtag",
      "seo_phrase",
      "social_discovery",
      "caption_title",
      "comment_dm_trigger",
      "synonym",
      "asset_tag",
      "avoid_exclusion",
    ])
    .optional(),
  locked: z.boolean().optional(),
  channels: z.array(channelSchema).optional(),
  notes: z.string().max(240).optional(),
  acceptedAt: z.string().optional(),
  rationale: z.string().max(400).optional(),
  confidence: z.enum(["high", "medium", "low"]).optional(),
  vocabularyKind: z.string().optional(),
  sourceFacts: z.array(z.unknown()).optional(),
  warnings: z.array(z.string()).optional(),
});

const groundExtrasSchema = z.object({
  locationLabels: z.array(z.string().max(80)).max(24).optional(),
  knownProducts: z.array(z.string().max(80)).max(24).optional(),
  knownOffers: z.array(z.string().max(120)).max(12).optional(),
  audienceHints: z.array(z.string().max(80)).max(24).optional(),
  seasonHint: z.string().max(80).optional(),
  campaignTitle: z.string().max(160).optional(),
  campaignId: z.string().max(80).optional(),
  existingContentSnippets: z.array(z.string().max(400)).max(12).optional(),
  priorPerformanceStubs: z
    .array(
      z.object({
        term: z.string().max(80),
        impressionsStub: z.number().optional(),
        engagementsStub: z.number().optional(),
        note: z.literal("correlation_stub_not_causation"),
      })
    )
    .max(12)
    .optional(),
});

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("suggest"),
    channel: channelSchema.optional(),
    mode: z
      .enum([
        "more_local",
        "more_niche",
        "broader",
        "shorter",
        "channel_specific",
        "more_professional",
        "more_playful",
        "language_specific",
      ])
      .optional(),
    limit: z.number().int().min(1).max(48).optional(),
    surface: z.string().max(40).optional(),
    campaignId: z.string().max(80).optional(),
    ground: groundExtrasSchema.optional(),
  }),
  z.object({
    action: z.literal("regenerate"),
    channel: channelSchema.optional(),
    mode: z.enum([
      "more_local",
      "more_niche",
      "broader",
      "shorter",
      "channel_specific",
      "more_professional",
      "more_playful",
      "language_specific",
    ]),
    limit: z.number().int().min(1).max(48).optional(),
    surface: z.string().max(40).optional(),
    campaignId: z.string().max(80).optional(),
    ground: groundExtrasSchema.optional(),
  }),
  z.object({
    action: z.literal("list"),
    includeArchived: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("save"),
    pack: z.record(z.string(), z.unknown()),
  }),
  z.object({
    action: z.literal("accept"),
    terms: z.array(termSchema).min(1).max(48),
    persist: z.boolean().optional(),
    runId: z.string().max(80).optional(),
  }),
  z.object({
    action: z.literal("approve"),
    terms: z.array(termSchema).min(1).max(48),
    persist: z.boolean().optional(),
    runId: z.string().max(80).optional(),
  }),
  z.object({
    action: z.literal("reject"),
    termIds: z.array(z.string().max(80)).max(48).optional(),
    suggestions: z.array(termSchema).max(48).optional(),
    runId: z.string().max(80).optional(),
  }),
  z.object({
    action: z.literal("archive"),
    termId: z.string().min(1).max(80),
  }),
  z.object({
    action: z.literal("restore"),
    termId: z.string().min(1).max(80),
  }),
  z.object({
    action: z.literal("edit"),
    termId: z.string().min(1).max(80),
    value: z.string().min(1).max(120).optional(),
    locale: z.string().max(16).optional(),
    campaignId: z.string().max(80).nullable().optional(),
    locationId: z.string().max(80).nullable().optional(),
  }),
  z.object({
    action: z.literal("apply"),
    terms: z.array(termSchema).min(1).max(48),
    variantIds: z.array(z.string().max(80)).max(24).optional(),
    channel: channelSchema.optional(),
    destination: z.string().max(80).optional(),
    runId: z.string().max(80).optional(),
  }),
  z.object({
    action: z.literal("create_brand_pack"),
    slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
    name: z.string().min(1).max(120),
    description: z.string().max(400).optional(),
    locale: z.string().max(16).optional(),
    channels: z.array(channelSchema).max(24).optional(),
    termIds: z.array(z.string().max(80)).max(100).optional(),
    approved: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("update_brand_pack"),
    packId: z.string().min(1).max(80),
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(400).optional(),
    locale: z.string().max(16).optional(),
    channels: z.array(channelSchema).max(24).optional(),
    termIds: z.array(z.string().max(80)).max(100).optional(),
    approved: z.boolean().optional(),
    archived: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("delete_brand_pack"),
    packId: z.string().min(1).max(80),
  }),
  z.object({
    action: z.literal("save_brand_pack"),
    pack: z.record(z.string(), z.unknown()),
  }),
  z.object({
    action: z.literal("lock"),
    termId: z.string().min(1).max(80),
    locked: z.boolean().default(true),
  }),
  z.object({
    action: z.literal("copy_metadata"),
    terms: z.array(termSchema).min(1).max(48),
  }),
  z.object({
    action: z.literal("conversational"),
    extraTriggers: z.array(z.string().max(80)).max(24).optional(),
  }),
  z.object({
    action: z.literal("detect_trigger_collision"),
    flowId: z.string().min(1).max(80),
    flowLabel: z.string().max(120).optional(),
    canonicalValue: z.string().min(1).max(80),
    matchMode: z.enum(["exact", "contains", "starts_with", "case_insensitive"]).optional(),
    channel: channelSchema.optional(),
    locationId: z.string().max(80).optional(),
    campaignId: z.string().max(80).optional(),
    termId: z.string().max(80).optional(),
    bind: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("performance"),
    term: z.string().min(1).max(80),
    channel: channelSchema.optional(),
    campaignId: z.string().max(80).optional(),
    metrics: z.record(z.string(), z.number()).optional(),
    evidenceClass: z.enum(["confirmed", "correlated", "modeled", "incomplete"]).optional(),
  }),
]);

async function gateOr503() {
  const featureCtx = await loadFeatureContext();
  const gate = checkFeatureGate(KEYWORD_FEATURE_ID, featureCtx);
  if (!gate.ok) {
    return NextResponse.json(featureGateJsonBody(gate), { status: 503 });
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const { business } = await requireBusiness();
    const blocked = await gateOr503();
    if (blocked) return blocked;
    ensureVocabularyRepo();

    const url = new URL(request.url);
    const view = url.searchParams.get("view");
    const pack = await loadVocabularyPack(business.id);

    if (view === "analytics" || view === "performance") {
      const data = await getVocabularyAnalytics(business.id);
      return NextResponse.json({
        ok: true,
        ...data,
        evidence: "modeled",
        disclaimer: "counts_only_no_causal_claim",
      });
    }

    if (view === "conversational") {
      const set = await getConversationalSet(business.id);
      return NextResponse.json({ ok: true, conversational: set, pack });
    }

    if (view === "packs") {
      const packs = await listNamedBrandPacks(business.id);
      return NextResponse.json({ ok: true, packs, pack });
    }

    return NextResponse.json({
      ok: true,
      pack,
      trendEnrichment: {
        status: "verified_credentials_required",
        label: "VERIFIED — CREDENTIALS REQUIRED",
      },
      aiEnhancement: {
        status: "verified_credentials_required",
        label: "VERIFIED — CREDENTIALS REQUIRED",
        note: "Local grounded generation works without OpenAI; live AI enhancement needs credentials + budget.",
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const { business, user } = await requireBusiness();
    const blocked = await gateOr503();
    if (blocked) return blocked;
    ensureVocabularyRepo();

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const body = parsed.data;
    const brandKit = await prisma.brandKit.findUnique({
      where: { businessId: business.id },
      select: { tone: true, defaultLanguage: true },
    });
    const actorId = user?.id;

    if (body.action === "suggest") {
      const result = await suggestVocabulary({
        businessId: business.id,
        businessName: business.name,
        brandKitTone: brandKit?.tone,
        locale: brandKit?.defaultLanguage,
        channel: body.channel,
        mode: body.mode,
        limit: body.limit,
        surface: body.surface,
        campaignId: body.campaignId ?? body.ground?.campaignId,
        ground: body.ground,
        actorId,
      });
      return NextResponse.json({
        ok: true,
        ...result,
        copyMetadata: {
          generatedAt: new Date().toISOString(),
          channel: result.channel,
          trendStatus: result.trendEnrichment.label,
          disclaimer:
            "Grounded suggestions only — no invented business facts; no causal claims; no fake trends",
        },
      });
    }

    if (body.action === "regenerate") {
      const result = await suggestVocabulary({
        businessId: business.id,
        businessName: business.name,
        brandKitTone: brandKit?.tone,
        locale: brandKit?.defaultLanguage,
        channel: body.channel,
        mode: body.mode ?? "channel_specific",
        limit: body.limit,
        surface: body.surface,
        campaignId: body.campaignId ?? body.ground?.campaignId,
        ground: body.ground,
        actorId,
      });
      return NextResponse.json({
        ok: true,
        ...result,
        copyMetadata: {
          generatedAt: new Date().toISOString(),
          channel: result.channel,
          trendStatus: result.trendEnrichment.label,
          disclaimer:
            "Grounded suggestions only — no invented business facts; no causal claims; no fake trends",
        },
      });
    }

    if (body.action === "list") {
      const pack = await loadVocabularyPack(business.id);
      const packs = await listNamedBrandPacks(business.id);
      return NextResponse.json({ ok: true, pack, packs });
    }

    if (body.action === "accept" || body.action === "approve") {
      const result = await acceptVocabularyTerms({
        businessId: business.id,
        terms: body.terms as Parameters<typeof acceptVocabularyTerms>[0]["terms"],
        runId: body.runId,
        actorId,
      });
      return NextResponse.json(result);
    }

    if (body.action === "reject") {
      const result = await rejectVocabularyTerms({
        businessId: business.id,
        termIds: body.termIds,
        suggestions: body.suggestions as Parameters<typeof rejectVocabularyTerms>[0]["suggestions"],
        runId: body.runId,
        actorId,
      });
      return NextResponse.json(result);
    }

    if (body.action === "archive") {
      const row = await archiveVocabularyTerm(business.id, body.termId, actorId);
      return NextResponse.json({ ok: true, term: row });
    }

    if (body.action === "restore") {
      const row = await restoreVocabularyTerm(business.id, body.termId, actorId);
      return NextResponse.json({ ok: true, term: row });
    }

    if (body.action === "edit") {
      const row = await editVocabularyTerm(
        business.id,
        body.termId,
        {
          value: body.value,
          locale: body.locale,
          campaignId: body.campaignId,
          locationId: body.locationId,
        },
        actorId
      );
      if (!row) {
        return NextResponse.json(
          { ok: false, error: "Term not found or locked — unlock before editing value" },
          { status: 409 }
        );
      }
      const pack = await loadVocabularyPack(business.id);
      return NextResponse.json({ ok: true, term: row, pack });
    }

    if (body.action === "apply") {
      const result = await applyVocabularyTerms({
        businessId: business.id,
        terms: body.terms as Parameters<typeof applyVocabularyTerms>[0]["terms"],
        variantIds: body.variantIds,
        destination: body.destination,
        runId: body.runId,
        actorId,
      });
      return NextResponse.json(result);
    }

    if (body.action === "save" || body.action === "save_brand_pack") {
      const pack = await saveBrandPackView({
        businessId: business.id,
        pack: parseKeywordBrandPack(body.pack),
        actorId,
      });
      return NextResponse.json({ ok: true, pack });
    }

    if (body.action === "create_brand_pack") {
      const named = await createNamedBrandPack({
        businessId: business.id,
        ...body,
        actorId,
      });
      return NextResponse.json({ ok: true, brandPack: named });
    }

    if (body.action === "update_brand_pack") {
      const named = await updateNamedBrandPack(business.id, body.packId, {
        name: body.name,
        description: body.description,
        locale: body.locale,
        channels: body.channels,
        termIds: body.termIds,
        approved: body.approved,
        archived: body.archived,
      });
      return NextResponse.json({ ok: true, brandPack: named });
    }

    if (body.action === "delete_brand_pack") {
      const deleted = await deleteNamedBrandPack(business.id, body.packId);
      return NextResponse.json({ ok: true, deleted });
    }

    if (body.action === "lock") {
      const term = await lockVocabularyTerm(business.id, body.termId, body.locked, actorId);
      const pack = await loadVocabularyPack(business.id);
      return NextResponse.json({ ok: true, term, pack });
    }

    if (body.action === "copy_metadata") {
      const text = body.terms.map((t) => t.value).join(" ");
      return NextResponse.json({
        ok: true,
        text,
        metadata: {
          count: body.terms.length,
          kinds: [...new Set(body.terms.map((t) => t.kind))],
          disclaimer:
            "Copied values from grounded suggestions / Brand Kit — not trend claims",
        },
      });
    }

    if (body.action === "conversational") {
      const set = await getConversationalSet(business.id, body.extraTriggers);
      const pack = await loadVocabularyPack(business.id);
      return NextResponse.json({ ok: true, conversational: set, pack });
    }

    if (body.action === "detect_trigger_collision") {
      if (body.bind === false) {
        const { detectTriggerCollisions } = await import("@/lib/fusion/keywords");
        const { getVocabularyRepository } = await import("@/lib/fusion/keywords");
        const r = await getVocabularyRepository();
        const existing = await r.listTriggerBindings(business.id, body.channel);
        const collisions = detectTriggerCollisions({
          existing,
          candidate: body,
        });
        return NextResponse.json({ ok: true, collisions, bound: false });
      }
      const result = await detectAndBindTrigger({
        businessId: business.id,
        binding: body,
        actorId,
      });
      return NextResponse.json({ ok: true, ...result, bound: true });
    }

    if (body.action === "performance") {
      const result = await observePerformanceStub({
        businessId: business.id,
        term: body.term,
        channel: body.channel,
        campaignId: body.campaignId,
        metrics: body.metrics,
        evidenceClass: body.evidenceClass,
        actorId,
      });
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Keywords API error:", error);
    const message = error instanceof Error ? error.message : "Keywords request failed";
    if (/unauthorized|unauthenticated|clerk/i.test(message)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
