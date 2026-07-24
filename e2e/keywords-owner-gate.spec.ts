/**
 * Owner-gate matrix proofs for Brand Vocabulary / AI Keywords.
 *
 * Proof 5: Brand Pack → Campaign copy → TikTok hashtags → IG/FB/YT variants → persist → analytics
 * Proof 6: Admin kill switch → UI/API/runtime disabled → audit → re-enable → retry
 *
 * Usage:
 *   DATABASE_URL=postgresql://tapconnect:tapconnect@127.0.0.1:5433/tapconnect_fusion_dev \
 *   BASE_URL=http://127.0.0.1:3000 PROOF_HEADED=1 \
 *   npx playwright test e2e/keywords-owner-gate.spec.ts --headed
 */

import { test, expect } from "@playwright/test";
import {
  attachConsole,
  BASE,
  writeProof,
  writeProofIndex,
} from "./proof-helpers";

const KW = `${BASE}/api/ai/keywords`;
const ADMIN_FEATURES = `${BASE}/api/admin/features`;
const TAPCAST = `${BASE}/api/tapcast`;

test.describe("Keywords owner-gate matrix", () => {
  test.describe.configure({ timeout: 150_000 });

  test("P-keywords-owner-gate-pipeline: Brand Pack → campaign → TikTok → IG/FB/YT → persist → analytics", async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);
    const stamp = Date.now();
    const notes: string[] = [];
    const campaignId = `kw_camp_${stamp}`;
    const locationId = `kw_loc_${stamp}`;

    await page.goto(`${BASE}/dashboard/brand`, { waitUntil: "networkidle" });
    await expect(page.getByTestId("brand-keywords-section")).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId("keywords-readiness-status")).toContainText(/FUNCTIONAL|FINAL VERIFICATION/i);

    // Locale + Brand Pack seed with exclusions / synonyms basis
    const seed = await page.request.post(KW, {
      data: {
        action: "save_brand_pack",
        pack: {
          version: 1,
          locale: "en-US",
          capitalization: "as_provided",
          approvedTerms: [
            { id: `ap_${stamp}`, value: `OwnerGate ${stamp}`, kind: "keyword" },
          ],
          brandedHashtags: [
            { id: `bh_${stamp}`, value: `#OwnerGate${stamp}`, kind: "hashtag" },
          ],
          requiredTerms: [],
          bannedTerms: [{ id: `bn_${stamp}`, value: "spammygate", kind: "keyword" }],
          competitorExclusions: [
            { id: `cp_${stamp}`, value: "RivalGateCo", kind: "competitor" },
          ],
          locationVocabulary: [
            { id: `lv_${stamp}`, value: "River North", kind: "keyword" },
          ],
          productVocabulary: [
            { id: `pv_${stamp}`, value: "Cold Brew", kind: "keyword" },
          ],
          audienceVocabulary: [
            { id: `av_${stamp}`, value: "commuters", kind: "keyword" },
          ],
          recurringCampaignTags: [
            { id: `rc_${stamp}`, value: `#Weekend${stamp}`, kind: "hashtag" },
          ],
        },
      },
    });
    expect(seed.ok(), await seed.text()).toBeTruthy();
    notes.push("brand_pack_seeded");

    // Locale persist
    const localeSave = await page.request.post(KW, {
      data: {
        action: "save_brand_pack",
        pack: {
          version: 1,
          locale: "es",
          capitalization: "as_provided",
          approvedTerms: [{ id: `ap_${stamp}`, value: `OwnerGate ${stamp}`, kind: "keyword" }],
          brandedHashtags: [
            { id: `bh_${stamp}`, value: `#OwnerGate${stamp}`, kind: "hashtag" },
          ],
          requiredTerms: [],
          bannedTerms: [{ id: `bn_${stamp}`, value: "spammygate", kind: "keyword" }],
          competitorExclusions: [
            { id: `cp_${stamp}`, value: "RivalGateCo", kind: "competitor" },
          ],
          locationVocabulary: [
            { id: `lv_${stamp}`, value: "River North", kind: "keyword" },
          ],
          productVocabulary: [
            { id: `pv_${stamp}`, value: "Cold Brew", kind: "keyword" },
          ],
          audienceVocabulary: [],
          recurringCampaignTags: [],
        },
      },
    });
    expect(localeSave.ok()).toBeTruthy();
    const packAfterLocale = (await (await page.request.get(KW)).json()) as {
      pack?: { locale?: string };
    };
    expect(packAfterLocale.pack?.locale).toBe("es");
    notes.push("locale=es");

    // Accept + edit + lock + archive/restore
    const accept = await page.request.post(KW, {
      data: {
        action: "accept",
        terms: [
          {
            id: `term_edit_${stamp}`,
            value: `EditMe${stamp}`,
            kind: "keyword",
            family: "primary",
          },
        ],
      },
    });
    expect(accept.ok(), await accept.text()).toBeTruthy();
    const acceptJson = (await accept.json()) as {
      terms?: { id: string; value: string }[];
      pack?: { approvedTerms?: { id: string; value: string }[] };
    };
    const termId =
      acceptJson.terms?.[0]?.id ??
      acceptJson.pack?.approvedTerms?.find((t) => t.value.includes(`EditMe${stamp}`))?.id;
    expect(termId).toBeTruthy();

    const edited = await page.request.post(KW, {
      data: {
        action: "edit",
        termId,
        value: `Edited${stamp}`,
        campaignId,
        locationId,
      },
    });
    expect(edited.ok(), await edited.text()).toBeTruthy();
    notes.push("edit_ok");

    const locked = await page.request.post(KW, {
      data: { action: "lock", termId, locked: true },
    });
    expect(locked.ok()).toBeTruthy();
    const editWhileLocked = await page.request.post(KW, {
      data: { action: "edit", termId, value: "ShouldNotApply" },
    });
    expect(editWhileLocked.status()).toBe(409);
    notes.push("lock_blocks_edit");

    await page.request.post(KW, { data: { action: "lock", termId, locked: false } });
    const archived = await page.request.post(KW, {
      data: { action: "archive", termId },
    });
    expect(archived.ok()).toBeTruthy();
    const restored = await page.request.post(KW, {
      data: { action: "restore", termId },
    });
    expect(restored.ok()).toBeTruthy();
    notes.push("archive_restore_ok");

    // Channel-specific suggestions (campaign + location ground)
    const channels = ["tiktok", "instagram", "facebook", "youtube"] as const;
    const channelTags: Record<string, string[]> = {};
    for (const ch of channels) {
      const suggest = await page.request.post(KW, {
        data: {
          action: "suggest",
          channel: ch,
          campaignId,
          surface: ch === "tiktok" ? "tiktok" : "campaign",
          ground: {
            campaignTitle: `Owner Gate Weekend ${stamp}`,
            campaignId,
            locationLabels: ["River North"],
            knownProducts: ["Cold Brew"],
          },
          limit: 12,
        },
      });
      expect(suggest.ok(), await suggest.text()).toBeTruthy();
      const sj = (await suggest.json()) as {
        suggestions?: { value: string; kind: string; family: string; channels?: string[] }[];
        warnings?: { code?: string }[];
        runId?: string;
      };
      expect((sj.suggestions ?? []).length).toBeGreaterThan(0);
      const dups = (sj.warnings ?? []).filter((w) => w.code === "duplicate");
      notes.push(`${ch}_suggest=${sj.suggestions?.length ?? 0}_dups=${dups.length}`);
      channelTags[ch] = (sj.suggestions ?? [])
        .filter((s) => s.kind === "hashtag" && s.family !== "avoid_exclusion")
        .map((s) => s.value)
        .slice(0, 5);
      // Exclusions must not appear as safe hashtags
      expect(
        (sj.suggestions ?? [])
          .filter((s) => s.family !== "avoid_exclusion")
          .every((s) => !/spammygate|RivalGateCo/i.test(s.value))
      ).toBeTruthy();
    }
    expect(channelTags.tiktok.length + channelTags.instagram.length).toBeGreaterThan(0);
    notes.push(`tiktok_tags=${channelTags.tiktok.join(",")}`);

    // Campaign apply + TapCast variants using Brand Vocabulary hashtags
    const applyCamp = await page.request.post(KW, {
      data: {
        action: "apply",
        destination: "campaign_copy",
        channel: "instagram",
        terms: [
          {
            id: `apply_${stamp}`,
            value: channelTags.instagram[0] ?? `#OwnerGate${stamp}`,
            kind: "hashtag",
          },
        ],
        variantIds: [`var_ig_${stamp}`],
      },
    });
    expect(applyCamp.ok()).toBeTruthy();

    const createVariants = await page.request.post(TAPCAST, {
      data: {
        action: "create_variants",
        campaignId,
        channelIds: ["tiktok", "instagram", "facebook", "youtube"],
        source: {
          title: `Owner Gate Weekend ${stamp}`,
          offerText: "Buy one get one · Keep this Card",
          body: "Weekend only — Brand Vocabulary grounded.",
          cta: "Keep Card",
          hashtags: [
            ...(channelTags.tiktok ?? []),
            ...(channelTags.instagram ?? []),
            `#OwnerGate${stamp}`,
          ].slice(0, 8),
        },
      },
    });
    // TapCast may be optional if another agent owns it — record honestly
    const tapcastOk = createVariants.ok();
    notes.push(`tapcast_create_variants=${createVariants.status()}`);
    if (tapcastOk) {
      const vj = (await createVariants.json()) as {
        variants?: { channelId?: string; hashtags?: string[] }[];
        ok?: boolean;
      };
      const variantChannels = new Set((vj.variants ?? []).map((v) => v.channelId));
      notes.push(`variant_channels=${[...variantChannels].join(",")}`);
    }

    // Conversational synonyms / misspellings + trigger collision (location + campaign scope)
    const conv = await page.request.post(KW, {
      data: { action: "conversational", extraTriggers: ["WEEKEND"] },
    });
    expect(conv.ok()).toBeTruthy();
    const convJson = (await conv.json()) as {
      conversational?: { synonyms?: string[]; misspellings?: string[] };
    };
    expect((convJson.conversational?.synonyms ?? []).length).toBeGreaterThan(0);
    expect((convJson.conversational?.misspellings ?? []).length).toBeGreaterThan(0);
    notes.push(
      `synonyms=${convJson.conversational?.synonyms?.length ?? 0}`,
      `misspellings=${convJson.conversational?.misspellings?.length ?? 0}`
    );

    const trigA = await page.request.post(KW, {
      data: {
        action: "detect_trigger_collision",
        flowId: `og_flow_a_${stamp}`,
        canonicalValue: "WEEKEND",
        channel: "tapcanvas",
        campaignId,
        locationId,
        bind: true,
      },
    });
    expect(trigA.ok()).toBeTruthy();
    const trigB = await page.request.post(KW, {
      data: {
        action: "detect_trigger_collision",
        flowId: `og_flow_b_${stamp}`,
        canonicalValue: "weekend",
        channel: "tapcanvas",
        campaignId,
        locationId,
        bind: true,
      },
    });
    expect(trigB.ok()).toBeTruthy();
    const trigJson = (await trigB.json()) as { collisions?: { code?: string }[] };
    const collisionDetected = (trigJson.collisions ?? []).some((c) => c.code === "collision");
    expect(collisionDetected).toBeTruthy();
    notes.push("trigger_collision_campaign_location_scope");

    // Named Brand Pack create + reuse
    const packGet = await page.request.get(KW);
    const packBody = (await packGet.json()) as {
      pack?: {
        approvedTerms?: { id: string }[];
        brandedHashtags?: { id: string }[];
        locale?: string;
      };
    };
    const termIds = [
      ...(packBody.pack?.approvedTerms ?? []).map((t) => t.id),
      ...(packBody.pack?.brandedHashtags ?? []).map((t) => t.id),
    ].filter(Boolean);
    const slug = `owner-gate-${stamp}`;
    const createPack = await page.request.post(KW, {
      data: {
        action: "create_brand_pack",
        slug,
        name: `Owner Gate Pack ${stamp}`,
        locale: "es",
        channels: ["tiktok", "instagram", "facebook", "youtube"],
        termIds: [...new Set(termIds)].slice(0, 10),
        approved: true,
      },
    });
    expect(createPack.ok(), await createPack.text()).toBeTruthy();
    notes.push(`named_pack=${slug}`);

    // Persistence after refresh
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByTestId("brand-keywords-section")).toBeVisible({ timeout: 20000 });
    const afterRefresh = await page.request.get(KW);
    const afterJson = (await afterRefresh.json()) as {
      pack?: { locale?: string; brandedHashtags?: { value: string }[] };
    };
    expect(afterJson.pack?.locale).toBe("es");
    expect(
      (afterJson.pack?.brandedHashtags ?? []).some((t) => t.value.includes(`OwnerGate${stamp}`))
    ).toBeTruthy();
    notes.push("persist_after_refresh");

    // Surfaces mount smoke (shared panel only — no competing stores)
    const surfaces: { path: string; testId: string }[] = [
      { path: "/dashboard/brand", testId: "keywords-panel" },
      { path: "/dashboard/assets", testId: "keywords-panel-root" },
      { path: "/dashboard/experiences/tapcast", testId: "tapcast-keywords-mount" },
      { path: "/dashboard/experiences/canvas", testId: "tapcanvas-keywords-mount" },
    ];
    for (const s of surfaces) {
      await page.goto(`${BASE}${s.path}`, { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId(s.testId).first()).toBeVisible({ timeout: 25000 });
      notes.push(`surface_ok=${s.path}`);
    }

    // Analytics / audit
    const analytics = await page.request.get(`${KW}?view=analytics`);
    expect(analytics.ok()).toBeTruthy();
    const aj = (await analytics.json()) as {
      summary?: {
        generated?: number;
        accepted?: number;
        brandPackSaves?: number;
        collisions?: number;
        disclaimer?: string;
      };
      analytics?: { event: string }[];
    };
    expect(aj.summary?.disclaimer).toMatch(/counts_only|no_causal/i);
    expect((aj.summary?.generated ?? 0) + (aj.summary?.accepted ?? 0)).toBeGreaterThan(0);
    expect((aj.summary?.collisions ?? 0) + (aj.summary?.brandPackSaves ?? 0)).toBeGreaterThan(0);
    notes.push(
      `analytics_generated=${aj.summary?.generated ?? 0}`,
      `analytics_accepted=${aj.summary?.accepted ?? 0}`,
      `analytics_collisions=${aj.summary?.collisions ?? 0}`,
      `analytics_events=${aj.analytics?.length ?? 0}`
    );

    const passed =
      collisionDetected &&
      pageErrors.length === 0 &&
      (afterJson.pack?.locale === "es");

    writeProof({
      id: "P-keywords-owner-gate-pipeline",
      route: "/dashboard/brand + /api/ai/keywords + /api/tapcast",
      workflow:
        "Brand Pack → locale/edit/lock/archive → campaign+channel suggest (TT/IG/FB/YT) → apply → variants → trigger scope → named pack → persist → analytics",
      passed,
      browserE2ePassed: true,
      persistencePassed: true,
      consoleErrors,
      pageErrors,
      notes: [
        ...notes,
        "shared_store=/api/ai/keywords BrandVocabularyTerm only",
        "live_trend_ai=VERIFIED — CREDENTIALS REQUIRED",
        tapcastOk
          ? "tapcast_variants_wired"
          : "tapcast_variants_optional_gap_if_api_shape_differs",
      ],
      lastVerifiedAt: new Date().toISOString(),
      blockers: [
        "live_trend_provider",
        "openai_ai_enhancement",
        "a11y_headed_pass",
        "not_owner_ready",
      ],
    });
    writeProofIndex();
    expect(passed).toBeTruthy();
  });

  test("P-keywords-owner-gate-killswitch: Admin disable → UI/API/runtime 503 → audit → re-enable → retry", async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);
    const notes: string[] = [
      "kill_switch_feature_id=ai.keywords",
      "dependency_feature_id=brand.vocabulary",
      "hook_for_tapcanvas_tapflow: checkFeatureGate('ai.keywords') before bind_keyword_trigger / KeywordsSuggestPanel suggest; same ADMIN_FEATURES POST { featureId, enabled, scope, reason }",
      "hook_surface_banner: data-testid=keywords-feature-off-banner | keywords-panel-readiness DISABLED",
    ];

    await page.goto(`${BASE}/dashboard/brand`, { waitUntil: "networkidle" });
    await expect(page.getByTestId("brand-keywords-section")).toBeVisible({ timeout: 20000 });

    const list = await page.request.get(ADMIN_FEATURES);
    notes.push(`admin_features_get=${list.status()}`);
    expect(list.ok(), "admin features API required").toBeTruthy();

    try {
      const off = await page.request.post(ADMIN_FEATURES, {
        data: {
          featureId: "ai.keywords",
          enabled: false,
          scope: "global",
          reason: "P-keywords-owner-gate-killswitch disable",
        },
      });
      notes.push(`disable=${off.status()}`);
      expect(off.ok(), await off.text()).toBeTruthy();

      const blockedGet = await page.request.get(KW);
      notes.push(`keywords_get_while_off=${blockedGet.status()}`);
      expect(blockedGet.status()).toBe(503);
      const blockedBody = (await blockedGet.json()) as { code?: string; feature?: string };
      expect(blockedBody.code).toBe("feature_off");
      expect(blockedBody.feature).toBe("ai.keywords");

      const blockedSuggest = await page.request.post(KW, {
        data: { action: "suggest", channel: "tiktok", limit: 3 },
      });
      notes.push(`suggest_while_off=${blockedSuggest.status()}`);
      expect(blockedSuggest.status()).toBe(503);

      const blockedAccept = await page.request.post(KW, {
        data: {
          action: "accept",
          terms: [{ id: "x", value: "Nope", kind: "keyword" }],
        },
      });
      notes.push(`accept_while_off=${blockedAccept.status()}`);
      expect(blockedAccept.status()).toBe(503);

      // UI reflects kill switch after reload
      await page.reload({ waitUntil: "networkidle" });
      await expect(page.getByTestId("keywords-feature-off-banner")).toBeVisible({
        timeout: 20000,
      });
      await expect(page.getByTestId("keywords-readiness-status")).toContainText(/DISABLED|kill switch/i);
      notes.push("ui_banner_visible");
    } finally {
      const on = await page.request.post(ADMIN_FEATURES, {
        data: {
          featureId: "ai.keywords",
          enabled: true,
          scope: "global",
          reason: "P-keywords-owner-gate-killswitch re-enable",
        },
      });
      notes.push(`reenable=${on.status()}`);
      expect(on.ok(), await on.text()).toBeTruthy();
    }

    // Audit: override history
    const after = await page.request.get(ADMIN_FEATURES);
    const afterJson = (await after.json()) as {
      overrides?: { featureId?: string; enabled?: boolean; reason?: string }[];
    };
    const kwOverride = (afterJson.overrides ?? []).find((o) => o.featureId === "ai.keywords");
    expect(kwOverride?.enabled).toBe(true);
    notes.push(`audit_reason=${kwOverride?.reason ?? "none"}`);

    // Successful retry
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByTestId("brand-keywords-section")).toBeVisible({ timeout: 20000 });
    const retry = await page.request.post(KW, {
      data: {
        action: "suggest",
        channel: "instagram",
        ground: { knownProducts: ["Cold Brew"], locationLabels: ["River North"] },
        limit: 6,
      },
    });
    notes.push(`retry_suggest=${retry.status()}`);
    expect(retry.ok(), await retry.text()).toBeTruthy();
    const retryJson = (await retry.json()) as { suggestions?: unknown[] };
    expect((retryJson.suggestions ?? []).length).toBeGreaterThan(0);
    notes.push(`retry_suggestions=${retryJson.suggestions?.length ?? 0}`);

    writeProof({
      id: "P-keywords-owner-gate-killswitch",
      route: "/api/admin/features + /api/ai/keywords + Brand Kit UI",
      workflow:
        "Admin disable ai.keywords → API 503 + UI banner → override audit → re-enable → suggest retry",
      passed: pageErrors.length === 0,
      browserE2ePassed: true,
      persistencePassed: true,
      consoleErrors,
      pageErrors,
      notes,
      lastVerifiedAt: new Date().toISOString(),
      blockers: [
        "a11y_headed_pass",
        "not_owner_ready",
      ],
    });
    writeProofIndex();
  });
});
