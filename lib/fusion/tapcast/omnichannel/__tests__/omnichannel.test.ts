import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  listTapCastChannels,
  getTapCastChannel,
  registrySnapshot,
  evaluateChannelReadiness,
  PUBLISH_PATH_LADDER,
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
  scheduleVariant,
  refreshVariantAnalytics,
  openProviderComposer,
  buildCampaignDistributionGraph,
  runDistributionAction,
  listVariants,
  flushOmnichannelPersists,
  upsertVariant,
  adaptCampaignToChannel,
} from "../../omnichannel";
import { resetTikTokMemory, listCasts, flushTikTokPersists } from "../../tiktok";
import { resetCanvasMemory } from "@/lib/fusion/canvas/store";
import type { PublishPath } from "../../registry/types";

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

const FORBIDDEN_DEFAULT_TAGS = ["#TapConnect", "#FYP", "#TapTheMagic", "#WeeklySpecial"];

describe("TapCast · Omnichannel registry", () => {
  it("registry lists exactly 18 channels across three categories with honest flags", () => {
    const snap = registrySnapshot();
    assert.equal(snap.channelCount, 18);
    assert.equal(listTapCastChannels().length, 18);
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
    assert.ok(!snapchat!.capabilities.publishPaths.includes("direct"));

    const readiness = evaluateChannelReadiness("youtube");
    assert.equal(readiness.displayStatus, "verified_credentials_required");
    assert.equal(readiness.mockReady, true);
  });

  it("capability declarations are honest for every registered channel", () => {
    for (const c of listTapCastChannels()) {
      assert.equal(c.liveClassification, "verified_credentials_required", c.id);
      assert.ok(c.supportsMock, c.id);
      assert.ok(c.requiredEnvVars.length > 0, c.id);
      assert.ok(c.capabilities.publishPaths.length > 0, c.id);
      assert.ok(
        c.capabilities.publishPaths.includes(c.capabilities.mockPublishPath),
        `${c.id}: mockPublishPath must be in publishPaths`
      );
      if (c.capabilities.livePublishPath) {
        assert.ok(
          c.capabilities.publishPaths.includes(c.capabilities.livePublishPath),
          `${c.id}: livePublishPath must be in publishPaths`
        );
      }
      for (const p of c.capabilities.publishPaths) {
        assert.ok(
          (PUBLISH_PATH_LADDER as readonly string[]).includes(p),
          `${c.id}: unknown path ${p}`
        );
      }
      // Never claim scheduled path when scheduling capability is false
      if (!c.capabilities.scheduling) {
        assert.ok(
          !c.capabilities.publishPaths.includes("scheduled"),
          `${c.id}: scheduling=false must not list scheduled path`
        );
      }
      assert.ok(c.capabilities.dimensions.length > 0, c.id);
      assert.ok(c.capabilities.media.length > 0, c.id);
    }
  });

  it("never claims unsupported analytics for discord / snapchat / slack_community", () => {
    for (const id of ["discord", "snapchat", "slack_community"] as const) {
      const ch = getTapCastChannel(id);
      assert.ok(ch);
      assert.equal(ch!.capabilities.analytics, false, id);
    }
  });
});

describe("TapCast · Brand vocabulary hashtags (no invented defaults)", () => {
  it("adapt does not invent #TapConnect / #FYP when source hashtags empty", () => {
    for (const c of listTapCastChannels()) {
      const adapted = adaptCampaignToChannel(c.id, {
        id: "camp_tags",
        title: "Silent Special",
        offerText: "No tags",
        businessId: BIZ,
      });
      for (const tag of adapted.hashtags) {
        assert.ok(
          !FORBIDDEN_DEFAULT_TAGS.includes(tag),
          `${c.id} invented forbidden tag ${tag}`
        );
      }
    }
  });

  it("adapt shapes provided Brand Vocabulary hashtags per channel", () => {
    const sourceTags = ["#WeekendSpecial", "#LocalEats", "#KeepCard"];
    const tt = adaptCampaignToChannel("tiktok", {
      id: "camp_vocab",
      title: "Vocab",
      hashtags: sourceTags,
    });
    assert.ok(tt.hashtags.length > 0);
    assert.ok(tt.hashtags.every((h) => sourceTags.includes(h)));
    assert.ok(!tt.hashtags.includes("#FYP"));

    const li = adaptCampaignToChannel("linkedin", {
      id: "camp_vocab",
      title: "Vocab",
      hashtags: sourceTags,
    });
    assert.deepEqual(li.hashtags, []);

    const sms = adaptCampaignToChannel("sms", {
      id: "camp_vocab",
      title: "Vocab",
      hashtags: sourceTags,
    });
    assert.deepEqual(sms.hashtags, []);
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

  it("creates variants for all 18 registered channels", () => {
    const ids = listTapCastChannels().map((c) => c.id);
    const multi = createMultiChannelVariants({
      businessId: BIZ,
      campaignId: "camp_all18",
      channelIds: ids,
      source: {
        id: "camp_all18",
        title: "All Channels",
        offerText: "Proof",
        hashtags: ["#WeekendSpecial"],
      },
    });
    assert.equal(multi.ok, true);
    if (!multi.ok) return;
    assert.equal(multi.data.variants.length, 18);
    assert.equal(multi.data.failures.length, 0);
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

describe("TapCast · mock publish path ladder (18 channels)", () => {
  it("default mock path succeeds with external ids where live publish is claimed", () => {
    for (const c of listTapCastChannels()) {
      const created = createChannelVariant({
        businessId: BIZ,
        campaignId: `camp_pub_${c.id}`,
        channelId: c.id,
        source: { id: `camp_pub_${c.id}`, title: `${c.name} Offer`, offerText: "Keep" },
      });
      assert.equal(created.ok, true, c.id);
      if (!created.ok) continue;

      const posted = publishVariantMock(created.data.id);
      if (c.capabilities.livePublishPath === null) {
        // Snapchat: package-only — ok without post id / published claim
        assert.equal(posted.ok, true, c.id);
        if (!posted.ok) continue;
        assert.ok(posted.data.externalDraftId, c.id);
        assert.equal(posted.data.externalPostId, undefined, c.id);
        assert.notEqual(posted.data.status, "published", c.id);
      } else if (
        c.capabilities.mockPublishPath === "open_composer" ||
        c.capabilities.mockPublishPath === "manual_checklist"
      ) {
        assert.equal(posted.ok, false, c.id);
        assert.equal(posted.code, "manual_publish_required");
      } else {
        assert.equal(posted.ok, true, c.id);
        if (!posted.ok) continue;
        assert.ok(posted.data.externalPostId, `${c.id} missing externalPostId`);
        assert.ok(posted.data.externalDraftId, `${c.id} missing externalDraftId`);
        assert.equal(posted.data.status, "published");
      }
    }
  });

  it("ladder rungs: schedule / open_composer / manual_checklist behave honestly", () => {
    // scheduled (publishing)
    const yt = createChannelVariant({
      businessId: BIZ,
      campaignId: "camp_sched",
      channelId: "youtube",
      source: { id: "camp_sched", title: "Shorts", offerText: "Offer" },
    });
    assert.ok(yt.ok);
    if (!yt.ok) return;
    const when = new Date(Date.now() + 3600_000).toISOString();
    const scheduled = scheduleVariant(yt.data.id, when);
    assert.equal(scheduled.ok, true);
    if (!scheduled.ok) return;
    assert.equal(scheduled.data.status, "scheduled");
    assert.equal(scheduled.data.scheduledAt, when);

    // Snapchat rejects scheduling
    const sc = createChannelVariant({
      businessId: BIZ,
      campaignId: "camp_sc_sched",
      channelId: "snapchat",
      source: { id: "camp_sc_sched", title: "Snap", offerText: "Offer" },
    });
    assert.ok(sc.ok);
    if (!sc.ok) return;
    const scSched = scheduleVariant(sc.data.id, when);
    assert.equal(scSched.ok, false);
    assert.equal(scSched.code, "scheduling_unsupported");

    // open_composer checklist (no live claim)
    const open = openProviderComposer(sc.data.id);
    assert.equal(open.ok, true);
    if (!open.ok) return;
    assert.ok(open.data.url.includes("snapchat"));
    assert.ok(open.data.checklist.length >= 3);

    // Force manual_checklist publish path → fails without post claim
    const forced = { ...sc.data, readiness: { ...sc.data.readiness, publishPath: "manual_checklist" as PublishPath } };
    upsertVariant(forced);
    const manual = publishVariantMock(forced.id);
    assert.equal(manual.ok, false);
    assert.equal(manual.code, "manual_publish_required");
    const after = listVariants(BIZ, { campaignId: "camp_sc_sched" })[0];
    assert.equal(after?.externalPostId, undefined);
  });

  it("exercises each publish path rung for at least one supporting channel", () => {
    const pathToChannel: Partial<Record<PublishPath, string>> = {
      direct: "tiktok",
      scheduled: "instagram",
      draft_upload: "youtube",
      provider_draft: "instagram",
      prepared_package: "facebook",
      open_composer: "messenger",
      manual_checklist: "reddit",
    };

    for (const path of PUBLISH_PATH_LADDER) {
      const channelId = pathToChannel[path]!;
      const def = getTapCastChannel(channelId)!;
      assert.ok(
        def.capabilities.publishPaths.includes(path),
        `${channelId} should declare ${path}`
      );
      const created = createChannelVariant({
        businessId: BIZ,
        campaignId: `camp_ladder_${path}`,
        channelId,
        source: { id: `camp_ladder_${path}`, title: `Ladder ${path}`, offerText: "Offer" },
      });
      assert.ok(created.ok, path);
      if (!created.ok) continue;

      if (path === "scheduled") {
        const r = scheduleVariant(
          created.data.id,
          new Date(Date.now() + 7200_000).toISOString()
        );
        assert.equal(r.ok, true, path);
        continue;
      }

      if (path === "open_composer") {
        const r = openProviderComposer(created.data.id);
        assert.equal(r.ok, true, path);
        continue;
      }

      upsertVariant({
        ...created.data,
        readiness: { ...created.data.readiness, publishPath: path },
      });
      const r = publishVariantMock(created.data.id);
      if (path === "manual_checklist") {
        assert.equal(r.ok, false, path);
        assert.equal(r.code, "manual_publish_required");
      } else {
        assert.equal(r.ok, true, path);
        if (r.ok) {
          assert.ok(r.data.externalDraftId || r.data.externalPostId, path);
        }
      }
    }
  });
});

describe("TapCast · media constraints / readiness / analytics", () => {
  it("evaluates readiness + dimensions for all 18 channels", () => {
    for (const c of listTapCastChannels()) {
      const adapted = adaptCampaignToChannel(c.id, {
        id: "camp_ready",
        title: "Ready check with a reasonably long title for clipping",
        offerText: "Offer text body",
        body: "Extra body",
        cta: "Keep Card",
      });
      assert.equal(adapted.readiness.publishPath, c.capabilities.mockPublishPath, c.id);
      assert.ok(adapted.dimensions.width >= 0, c.id);
      assert.ok(adapted.dimensions.aspectRatio, c.id);
      if (c.id === "sms") {
        assert.ok(adapted.copy.length <= 160, "sms clip");
      }
      if (c.id === "youtube") {
        assert.ok(adapted.copy.length <= 100, "youtube title clip");
      }
      if (c.id === "snapchat") {
        assert.ok(
          adapted.preview.warnings.some((w) => /no organic public post/i.test(w))
        );
      }
    }
  });

  it("analytics stub refresh works when claimed; refuses when unsupported", () => {
    const ig = createChannelVariant({
      businessId: BIZ,
      campaignId: "camp_an",
      channelId: "instagram",
      source: { id: "camp_an", title: "Analytics", offerText: "Offer" },
    });
    assert.ok(ig.ok);
    if (!ig.ok) return;
    publishVariantMock(ig.data.id);
    const refreshed = refreshVariantAnalytics(ig.data.id);
    assert.equal(refreshed.ok, true);
    if (!refreshed.ok) return;
    assert.ok((refreshed.data.analytics?.impressions ?? 0) > 0);

    const discord = createChannelVariant({
      businessId: BIZ,
      campaignId: "camp_an_d",
      channelId: "discord",
      source: { id: "camp_an_d", title: "Discord", offerText: "Offer" },
    });
    assert.ok(discord.ok);
    if (!discord.ok) return;
    const denied = refreshVariantAnalytics(discord.data.id);
    assert.equal(denied.ok, false);
    assert.equal(denied.code, "analytics_unsupported");
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
      assert.ok(c.requiredEnvVars.length > 0, c.id);
      assert.equal(c.liveClassification, "verified_credentials_required");
      assert.ok(c.supportsMock);
      assert.ok(c.capabilities.publishPaths.length > 0);
    }
  });
});
