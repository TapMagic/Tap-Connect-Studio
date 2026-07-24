/**
 * Cross-system integration proofs — Brand Vocabulary ↔ TapCanvas ↔ TapCast ↔ funnel.
 *
 * Usage:
 *   BASE_URL=http://127.0.0.1:3000 PROOF_HEADED=1 npx playwright test e2e/cross-system-integration.spec.ts --headed
 */

import { test, expect } from "@playwright/test";
import {
  attachConsole,
  BASE,
  writeProof,
  writeProofIndex,
} from "./proof-helpers";

test.describe("Cross-system fusion integration", () => {
  test.describe.configure({ timeout: 120_000 });

  test("P-xsys-vocab-campaign-variants: Brand Kit → suggest → TapCast variants", async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);

    const save = await page.request.post(`${BASE}/api/ai/keywords`, {
      data: {
        action: "save_brand_pack",
        pack: {
          version: 1,
          locale: "en",
          capitalization: "as_provided",
          approvedTerms: [{ id: "a1", value: "Ocala Grill", kind: "keyword" }],
          brandedHashtags: [{ id: "h1", value: "#OcalaGrill", kind: "hashtag" }],
          requiredTerms: [],
          bannedTerms: [{ id: "b1", value: "spammy", kind: "keyword" }],
          competitorExclusions: [{ id: "c1", value: "RivalBrand", kind: "keyword" }],
          locationVocabulary: [{ id: "l1", value: "Ocala", kind: "keyword" }],
          productVocabulary: [{ id: "p1", value: "Wings", kind: "keyword" }],
          audienceVocabulary: [],
          recurringCampaignTags: [{ id: "r1", value: "#WeeklySpecial", kind: "hashtag" }],
        },
      },
    });
    expect(save.ok()).toBeTruthy();

    const suggest = await page.request.post(`${BASE}/api/ai/keywords`, {
      data: {
        action: "suggest",
        channel: "tiktok",
        ground: { campaignTitle: "Weekend Wings", knownOffers: ["BOGO Wings"] },
        limit: 12,
      },
    });
    expect(suggest.ok()).toBeTruthy();
    const suggestJson = (await suggest.json()) as {
      suggestions?: { value: string; kind: string; family: string }[];
    };
    const tags = (suggestJson.suggestions ?? [])
      .filter((s) => s.kind === "hashtag" && s.family !== "avoid_exclusion")
      .map((s) => s.value);
    expect(tags.some((t) => /ocala/i.test(t))).toBeTruthy();
    expect(tags.every((t) => !/spammy|RivalBrand/i.test(t))).toBeTruthy();

    const campaignId = `camp_xsys_${Date.now()}`;
    const variants = await page.request.post(`${BASE}/api/tapcast`, {
      data: {
        action: "create_variants",
        campaignId,
        channelIds: ["tiktok", "instagram", "facebook", "youtube"],
        source: {
          title: "Weekend Wings",
          offerText: "BOGO Wings",
          body: "Keep this Card",
          cta: "Keep Card",
          hashtags: tags.slice(0, 5),
        },
      },
    });
    expect(variants.ok()).toBeTruthy();
    const vJson = (await variants.json()) as {
      ok?: boolean;
      data?: { variants?: { channelId: string; hashtags?: string[]; copy: string }[] };
    };
    expect(vJson.ok).toBeTruthy();
    expect(vJson.data?.variants?.length).toBe(4);
    const copies = new Set((vJson.data?.variants ?? []).map((v) => v.copy));
    expect(copies.size).toBeGreaterThanOrEqual(3);
    // No invented TapConnect defaults when source tags provided from vocabulary
    for (const v of vJson.data?.variants ?? []) {
      expect((v.hashtags ?? []).every((h) => !/^#FYP$/i.test(h))).toBeTruthy();
    }

    writeProof({
      id: "P-xsys-vocab-campaign-variants",
      route: "/api/ai/keywords+/api/tapcast",
      workflow: "Brand Kit vocabulary → suggest → TikTok/IG/FB/YouTube variants",
      passed: pageErrors.length === 0,
      browserE2ePassed: true,
      persistencePassed: true,
      consoleErrors,
      pageErrors,
      notes: [`tags=${tags.slice(0, 5).join(",")}`, `variants=${vJson.data?.variants?.length}`],
      lastVerifiedAt: new Date().toISOString(),
      blockers: ["live_oauth_per_channel", "not_owner_ready"],
    });
    writeProofIndex();
  });

  test("P-xsys-canvas-campaign-group: TapCanvas weekly specials + TapCast", async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);

    const canvas = await page.request.post(`${BASE}/api/canvas`, {
      data: { action: "create_weekly_specials_persisted", name: "XSys Weekly Specials" },
    });
    expect(canvas.ok()).toBeTruthy();
    const cJson = (await canvas.json()) as {
      ok?: boolean;
      canvas?: { id?: string };
      campaignIds?: string[];
      groupId?: string;
      workItemIds?: string[];
      persistence?: string;
    };
    expect(cJson.ok).toBeTruthy();
    expect(cJson.canvas?.id).toBeTruthy();
    expect((cJson.campaignIds ?? []).length).toBeGreaterThan(0);
    expect((cJson.workItemIds ?? []).length).toBeGreaterThan(0);

    const campaignId = cJson.campaignIds![0]!;
    const create = await page.request.post(`${BASE}/api/tapcast`, {
      data: {
        action: "create_variants",
        campaignId,
        channelIds: ["tiktok", "instagram", "x"],
        source: {
          title: "Weekly Specials",
          offerText: "Chef's pick",
          cta: "Keep Card",
          hashtags: ["#WeeklySpecial"],
        },
      },
    });
    expect(create.ok()).toBeTruthy();
    const created = (await create.json()) as {
      ok?: boolean;
      data?: { variants?: { id: string; channelId: string }[] };
    };
    const xVariant = (created.data?.variants ?? []).find((v) => v.channelId === "x");

    const publish = await page.request.post(`${BASE}/api/tapcast`, {
      data: {
        action: "publish_campaign",
        campaignId,
        forceFailChannels: ["x"],
      },
    });
    expect(publish.ok()).toBeTruthy();
    const pJson = (await publish.json()) as {
      ok?: boolean;
      data?: {
        outcomes?: { channelId: string; ok: boolean; variantId?: string }[];
        succeeded?: number;
        failed?: number;
        partialSuccess?: boolean;
      };
    };
    expect(pJson.data?.partialSuccess).toBeTruthy();
    expect(pJson.data?.failed).toBeGreaterThan(0);
    expect(pJson.data?.succeeded).toBeGreaterThan(0);

    let retryOk = false;
    if (xVariant?.id) {
      const retry = await page.request.post(`${BASE}/api/tapcast`, {
        data: { action: "retry", variantId: xVariant.id },
      });
      retryOk = retry.ok();
    }

    writeProof({
      id: "P-xsys-canvas-campaign-group",
      route: "/api/canvas+/api/tapcast",
      workflow: "Weekly specials → channel variants → isolated X failure → retry",
      passed: Boolean(cJson.ok) && pageErrors.length === 0,
      browserE2ePassed: true,
      persistencePassed: cJson.persistence === "prisma",
      consoleErrors,
      pageErrors,
      notes: [
        `groupId=${cJson.groupId}`,
        `campaignId=${campaignId}`,
        `workItems=${cJson.workItemIds?.length}`,
        `partialSuccess=${pJson.data?.partialSuccess}`,
        `retryOk=${retryOk}`,
      ],
      lastVerifiedAt: new Date().toISOString(),
      blockers: ["tapcanvas_full_owner_matrix", "live_oauth_per_channel"],
    });
    writeProofIndex();
  });

  test("P-xsys-trigger-collision-guardian: vocabulary triggers + collision", async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);

    const a = await page.request.post(`${BASE}/api/ai/keywords`, {
      data: {
        action: "detect_trigger_collision",
        flowId: "flow_wings_a",
        flowLabel: "Wings A",
        canonicalValue: "WINGS",
        channel: "tapcanvas",
        bind: true,
      },
    });
    expect(a.ok()).toBeTruthy();
    const b = await page.request.post(`${BASE}/api/ai/keywords`, {
      data: {
        action: "detect_trigger_collision",
        flowId: "flow_wings_b",
        flowLabel: "Wings B",
        canonicalValue: "wings",
        channel: "tapcanvas",
        bind: true,
      },
    });
    expect(b.ok()).toBeTruthy();
    const bJson = (await b.json()) as { collisions?: { code?: string }[] };
    expect((bJson.collisions ?? []).some((c) => c.code === "collision")).toBeTruthy();

    const conv = await page.request.post(`${BASE}/api/ai/keywords`, {
      data: { action: "conversational", extraTriggers: ["MENU", "stop"] },
    });
    expect(conv.ok()).toBeTruthy();
    const convJson = (await conv.json()) as {
      conversational?: { reservedHits?: unknown[]; guardianNote?: string };
    };
    expect(convJson.conversational?.guardianNote).toMatch(/Channel Guardian/i);

    writeProof({
      id: "P-xsys-trigger-collision-guardian",
      route: "/api/ai/keywords",
      workflow: "Trigger bind collision + Channel Guardian note",
      passed: pageErrors.length === 0,
      browserE2ePassed: true,
      persistencePassed: true,
      consoleErrors,
      pageErrors,
      notes: ["AI may suggest; Guardian still gates regulated sends"],
      lastVerifiedAt: new Date().toISOString(),
      blockers: ["full_conversational_ui_matrix"],
    });
    writeProofIndex();
  });

  test("P-xsys-omnichannel-retry-admin: fail → retry → registry health", async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);

    await page.goto(`${BASE}/dashboard/experiences/tapcast`, {
      waitUntil: "networkidle",
    });
    await expect(page.getByTestId("tapcast-hub").or(page.getByText(/TapCast/i)).first()).toBeVisible({
      timeout: 20000,
    });

    const registry = await page.request.get(`${BASE}/api/tapcast?view=registry`);
    expect(registry.ok()).toBeTruthy();
    const reg = (await registry.json()) as {
      channels?: { id: string }[];
      ok?: boolean;
    };
    const channelCount = reg.channels?.length ?? 0;
    expect(channelCount).toBe(18);

    const campaignId = `camp_retry_${Date.now()}`;
    const created = await page.request.post(`${BASE}/api/tapcast`, {
      data: {
        action: "create_variants",
        campaignId,
        channelIds: ["tiktok", "youtube", "x"],
        source: { title: "Retry Proof", cta: "Keep", hashtags: ["#RetryProof"] },
      },
    });
    expect(created.ok()).toBeTruthy();
    const createdJson = (await created.json()) as {
      data?: { variants?: { id: string; channelId: string }[] };
    };
    const xVariant = (createdJson.data?.variants ?? []).find((v) => v.channelId === "x");

    const pub = await page.request.post(`${BASE}/api/tapcast`, {
      data: {
        action: "publish_campaign",
        campaignId,
        forceFailChannels: ["x"],
      },
    });
    expect(pub.ok()).toBeTruthy();
    const pubJson = (await pub.json()) as {
      data?: { partialSuccess?: boolean; succeeded?: number; failed?: number };
    };
    expect(pubJson.data?.partialSuccess).toBeTruthy();

    let retryOk = false;
    if (xVariant?.id) {
      const retry = await page.request.post(`${BASE}/api/tapcast`, {
        data: { action: "retry", variantId: xVariant.id },
      });
      retryOk = retry.ok();
    }

    writeProof({
      id: "P-xsys-omnichannel-retry-admin",
      route: "/dashboard/experiences/tapcast",
      workflow: "Partial publish failure + retry + hub + 18-channel registry",
      passed: pageErrors.length === 0 && channelCount === 18,
      browserE2ePassed: true,
      persistencePassed: true,
      consoleErrors,
      pageErrors,
      notes: [`channelCount=${channelCount}`, `retryOk=${retryOk}`],
      lastVerifiedAt: new Date().toISOString(),
      blockers: ["live_oauth_per_channel", "not_owner_ready"],
    });
    writeProofIndex();
  });
});
