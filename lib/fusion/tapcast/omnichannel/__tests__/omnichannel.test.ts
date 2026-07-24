import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  listTapCastChannels,
  getTapCastChannel,
  registrySnapshot,
  evaluateChannelReadiness,
} from "../../registry";
import {
  resetOmnichannelMemory,
  connectChannel,
  createChannelVariant,
  createMultiChannelVariants,
  publishCampaignChannels,
  publishVariantMock,
  approveVariant,
  retryVariant,
  reAdaptVariant,
  buildCampaignDistributionGraph,
  runDistributionAction,
  listVariants,
  flushOmnichannelPersists,
} from "../../omnichannel";
import { resetTikTokMemory, listCasts, flushTikTokPersists } from "../../tiktok";
import { resetCanvasMemory } from "@/lib/fusion/canvas/store";

const BIZ = "biz_omni_test";

/** Unit tests stay memory-only — never FK against isolated DB with synthetic business ids */
const savedDatabaseUrl = process.env.DATABASE_URL;
beforeEach(() => {
  delete process.env.DATABASE_URL;
  resetOmnichannelMemory();
  resetTikTokMemory();
  resetCanvasMemory();
});
afterEach(async () => {
  await flushOmnichannelPersists().catch(() => undefined);
  await flushTikTokPersists().catch(() => undefined);
  if (savedDatabaseUrl) process.env.DATABASE_URL = savedDatabaseUrl;
  else delete process.env.DATABASE_URL;
});

describe("TapCast · Omnichannel registry", () => {
  it("registry lists publishing, conversation, and community channels with honest flags", () => {
    const snap = registrySnapshot();
    assert.ok(snap.channelCount >= 15);
    assert.ok(snap.byCategory.publishing_social >= 8);
    assert.ok(snap.byCategory.conversation_relationship >= 3);
    assert.ok(snap.byCategory.community_ops >= 2);
    assert.deepEqual(snap.firstClass, ["tiktok"]);

    const tiktok = getTapCastChannel("tiktok");
    assert.ok(tiktok);
    assert.equal(tiktok!.firstClass, true);
    assert.ok(tiktok!.capabilities.publishPaths.includes("direct"));
    assert.equal(tiktok!.capabilities.mockPublishPath, "draft_upload");

    const snapchat = getTapCastChannel("snapchat");
    assert.ok(snapchat);
    assert.equal(snapchat!.capabilities.livePublishPath, null);
    assert.ok(
      snapchat!.capabilities.publishPaths.includes("prepared_package")
    );
    assert.equal(snapchat!.capabilities.scheduling, false);

    const readiness = evaluateChannelReadiness("youtube");
    assert.equal(readiness.displayStatus, "verified_credentials_required");
    assert.equal(readiness.mockReady, true);
  });

  it("never claims unsupported analytics for discord", () => {
    const discord = getTapCastChannel("discord");
    assert.ok(discord);
    assert.equal(discord!.capabilities.analytics, false);
  });
});

describe("TapCast · Campaign channel variants", () => {
  it("creates channel-native variants (not blind identical cross-post)", () => {
    const multi = createMultiChannelVariants({
      businessId: BIZ,
      campaignId: "camp_1",
      channelIds: ["tiktok", "instagram", "x", "sms"],
      source: {
        id: "camp_1",
        title: "Weekend Special",
        offerText: "BOGO fries",
        body: "This weekend only",
        cta: "Keep Card",
        hashtags: ["#TapConnect", "#Weekend"],
      },
    });
    assert.equal(multi.ok, true);
    if (!multi.ok) return;
    assert.equal(multi.data.variants.length, 4);
    assert.equal(multi.data.failures.length, 0);

    const copies = multi.data.variants.map((v) => v.copy);
    const unique = new Set(copies);
    assert.ok(unique.size >= 3, "channel-native copy should differ across channels");

    const tt = multi.data.variants.find((v) => v.channelId === "tiktok");
    assert.ok(tt?.tikTokCastId);
    assert.equal(tt?.dimensions.aspectRatio, "9:16");
    assert.ok(tt?.preview.warnings.some((w) => /native adaptation/i.test(w)));

    const sms = multi.data.variants.find((v) => v.channelId === "sms");
    assert.ok(sms);
    assert.ok((sms!.dimensions.maxCaptionChars ?? 160) <= 160);
    assert.ok(listCasts(BIZ).length >= 1);
  });

  it("failure isolation: one channel fail does not roll back others", () => {
    createMultiChannelVariants({
      businessId: BIZ,
      campaignId: "camp_iso",
      channelIds: ["tiktok", "youtube", "x"],
      source: {
        id: "camp_iso",
        title: "Isolation Test",
        offerText: "Offer",
      },
    });

    const published = publishCampaignChannels({
      businessId: BIZ,
      campaignId: "camp_iso",
      forceFailChannels: ["x"],
    });
    assert.equal(published.ok, true);
    if (!published.ok) return;
    assert.equal(published.data.partialSuccess, true);
    assert.equal(published.data.succeeded, 2);
    assert.equal(published.data.failed, 1);

    const variants = listVariants(BIZ, { campaignId: "camp_iso" });
    const x = variants.find((v) => v.channelId === "x");
    const yt = variants.find((v) => v.channelId === "youtube");
    assert.equal(x?.status, "failed");
    assert.equal(yt?.status, "published");
    assert.ok(yt?.externalPostId);

    const retried = retryVariant(x!.id);
    assert.equal(retried.ok, true);
    if (!retried.ok) return;
    assert.equal(retried.data.status, "published");
    assert.ok(retried.data.retryCount >= 1);
  });

  it("TikTok coexistence: omnichannel variant bridges first-class cast", () => {
    connectChannel({ businessId: BIZ, channelId: "tiktok" });
    const created = createChannelVariant({
      businessId: BIZ,
      campaignId: "camp_tt",
      channelId: "tiktok",
      source: { id: "camp_tt", title: "TT Coexist", offerText: "Keep" },
    });
    assert.equal(created.ok, true);
    if (!created.ok) return;
    assert.ok(created.data.tikTokCastId);
    approveVariant(created.data.id, "approve");
    const posted = publishVariantMock(created.data.id);
    assert.equal(posted.ok, true);
    const casts = listCasts(BIZ);
    assert.ok(casts.some((c) => c.id === created.data.tikTokCastId));
  });

  it("re-adapt refreshes channel-native preview", () => {
    const created = createChannelVariant({
      businessId: BIZ,
      campaignId: "camp_ad",
      channelId: "linkedin",
      source: { id: "camp_ad", title: "Old", body: "v1" },
    });
    assert.ok(created.ok);
    if (!created.ok) return;
    const adapted = reAdaptVariant(created.data.id, {
      id: "camp_ad",
      title: "New Title",
      body: "Professional rewrite",
      cta: "Learn more",
    });
    assert.equal(adapted.ok, true);
    if (!adapted.ok) return;
    assert.match(adapted.data.copy, /New Title/);
    assert.equal(adapted.data.status, "adapted");
  });
});

describe("TapCast · TapCanvas distribution graph", () => {
  it("builds campaign → channel_variant graph and runs actions", () => {
    const graph = buildCampaignDistributionGraph({
      businessId: BIZ,
      campaignId: "camp_graph",
      campaignTitle: "Graph Special",
      channelIds: ["tiktok", "instagram"],
      source: {
        id: "camp_graph",
        title: "Graph Special",
        offerText: "50% off",
      },
    });
    assert.ok(graph.canvas.nodes.some((n) => n.kind === "campaign"));
    assert.equal(
      graph.canvas.nodes.filter((n) => n.kind === "channel_variant").length,
      2
    );
    assert.ok(graph.canvas.edges.length >= 2);

    const variantId = graph.variants[0]!.id;
    const approved = runDistributionAction({
      canvasId: graph.canvas.id,
      action: "approve",
      variantId,
      businessId: BIZ,
      decision: "approve",
    });
    assert.equal(approved.ok, true);

    const published = runDistributionAction({
      canvasId: graph.canvas.id,
      action: "publish",
      variantId,
      businessId: BIZ,
    });
    assert.equal(published.ok, true);

    const perf = runDistributionAction({
      canvasId: graph.canvas.id,
      action: "performance",
      variantId,
      businessId: BIZ,
    });
    assert.equal(perf.ok, true);
    assert.ok(perf.extra?.analytics);
  });
});

describe("TapCast · channel catalog completeness", () => {
  it("all listed channels have required env declarations", () => {
    for (const c of listTapCastChannels()) {
      assert.ok(c.requiredEnvVars.length > 0 || c.id === "unused", c.id);
      assert.equal(c.liveClassification, "verified_credentials_required");
      assert.ok(c.supportsMock);
      assert.ok(c.capabilities.publishPaths.length > 0);
    }
  });
});
