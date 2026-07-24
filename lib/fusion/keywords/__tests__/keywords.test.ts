import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  EMPTY_BRAND_PACK,
  KEYWORD_FEATURE_ID,
  BRAND_VOCABULARY_FEATURE_ID,
  adaptTermForChannel,
  buildConversationalKeywordSet,
  buildGroundContext,
  createMemoryVocabularyRepository,
  detectTriggerCollisions,
  getChannelRules,
  listKeywordAnalytics,
  lockTerm,
  mergeAcceptedTerms,
  parseKeywordBrandPack,
  recordKeywordAnalytics,
  resetKeywordAnalyticsMemory,
  resetMemoryVocabularyRepository,
  setVocabularyRepositoryForTests,
  suggestKeywords,
  suggestVocabulary,
  acceptVocabularyTerms,
  detectAndBindTrigger,
  summarizeKeywordAnalytics,
  termKey,
  matchesTrigger,
} from "../index";

describe("Keywords Brand Pack", () => {
  it("parses empty / partial JSON safely", () => {
    assert.equal(parseKeywordBrandPack(null).version, 1);
    assert.equal(parseKeywordBrandPack({}).approvedTerms.length, 0);
    const pack = parseKeywordBrandPack({
      locale: "es",
      approvedTerms: [{ id: "a1", value: " Café ", kind: "keyword" }],
    });
    assert.equal(pack.locale, "es");
    assert.equal(pack.approvedTerms[0]?.value, "Café");
  });

  it("merges accepted terms without duplicates", () => {
    let pack = { ...EMPTY_BRAND_PACK };
    pack = mergeAcceptedTerms(pack, [
      { id: "1", value: "Demo Cafe", kind: "keyword" },
      { id: "2", value: "demo cafe", kind: "keyword" },
    ]);
    assert.equal(pack.approvedTerms.length, 1);
  });

  it("locks terms by id", () => {
    let pack = mergeAcceptedTerms(EMPTY_BRAND_PACK, [
      { id: "lock_me", value: "Keep", kind: "keyword" },
    ]);
    pack = lockTerm(pack, "lock_me", true);
    assert.equal(pack.approvedTerms[0]?.locked, true);
  });
});

describe("Grounded suggest engine", () => {
  it("does not invent products when ground is empty", () => {
    const result = suggestKeywords({
      ground: buildGroundContext({ businessId: "b1" }),
      channel: "instagram",
    });
    assert.equal(result.suggestions.length, 0);
    assert.equal(result.trendEnrichment.status, "verified_credentials_required");
    assert.match(result.trendEnrichment.label, /VERIFIED/);
  });

  it("grounds primary + branded hashtag from business name only", () => {
    const result = suggestKeywords({
      ground: buildGroundContext({
        businessId: "b1",
        businessName: "Demo Cafe",
      }),
      channel: "tiktok",
    });
    assert.ok(result.suggestions.some((s) => s.family === "primary"));
    assert.ok(result.suggestions.some((s) => s.family === "branded_hashtag"));
    for (const s of result.suggestions) {
      assert.ok(s.sourceFacts.length > 0);
      assert.ok(!/trending/i.test(s.rationale));
    }
  });

  it("only uses provided location / product facts", () => {
    const result = suggestKeywords({
      ground: buildGroundContext({
        businessId: "b1",
        businessName: "Demo Cafe",
        locationLabels: ["River North"],
        knownProducts: ["Cold Brew"],
      }),
      channel: "gbp",
      mode: "more_local",
    });
    const values = result.suggestions.map((s) => s.value.toLowerCase());
    assert.ok(values.some((v) => v.includes("river")));
    assert.ok(values.some((v) => v.includes("cold") || v.includes("brew")));
    assert.ok(!values.some((v) => v.includes("invented-offer-xyz")));
  });

  it("marks prior performance as correlation stub not causation", () => {
    const result = suggestKeywords({
      ground: buildGroundContext({
        businessId: "b1",
        priorPerformanceStubs: [
          {
            term: "weekend",
            impressionsStub: 100,
            note: "correlation_stub_not_causation",
          },
        ],
      }),
      channel: "instagram",
    });
    const stub = result.suggestions.find((s) => s.value.toLowerCase().includes("weekend"));
    assert.ok(stub);
    assert.ok(stub?.warnings?.includes("correlation_stub_not_causation"));
    assert.equal(stub?.confidence, "low");
  });

  it("surfaces banned terms as avoid_exclusion and warns", () => {
    const pack = parseKeywordBrandPack({
      bannedTerms: [{ id: "b", value: "spammy", kind: "keyword" }],
      approvedTerms: [{ id: "a", value: "Demo", kind: "keyword" }],
    });
    const result = suggestKeywords({
      ground: buildGroundContext({
        businessId: "b1",
        businessName: "Demo",
        brandPack: pack,
      }),
      channel: "x",
    });
    assert.ok(result.suggestions.some((s) => s.family === "avoid_exclusion"));
  });

  it("adapts hashtags away for email channel", () => {
    const adapted = adaptTermForChannel("#WeeklySpecial", "hashtag", "email");
    assert.notEqual(adapted.kind, "hashtag");
    assert.ok(!adapted.value.startsWith("#"));
  });

  it("produces distinct channel priority rules", () => {
    assert.notEqual(
      getChannelRules("tiktok").hashtagSuitable,
      getChannelRules("linkedin").hashtagSuitable
    );
    assert.equal(getChannelRules("email").hashtagSuitable, false);
    assert.equal(getChannelRules("tapcanvas").triggerSuitable, true);
    assert.equal(getChannelRules("whatsapp").triggerSuitable, true);
    assert.ok(getChannelRules("tiktok").recommendedCount.max <= 8);
  });

  it("exposes feature id constants", () => {
    assert.equal(KEYWORD_FEATURE_ID, "ai.keywords");
    assert.equal(BRAND_VOCABULARY_FEATURE_ID, "brand.vocabulary");
  });
});

describe("Conversational keyword set + collisions", () => {
  it("flags reserved keywords and documents guardian note", () => {
    const pack = parseKeywordBrandPack({
      approvedTerms: [
        { id: "1", value: "menu", kind: "keyword" },
        { id: "2", value: "stop", kind: "keyword" },
      ],
    });
    const set = buildConversationalKeywordSet(pack);
    assert.ok(set.triggers.includes("menu"));
    assert.ok(set.reservedHits.some((h) => h.term === "stop"));
    assert.match(set.guardianNote, /Channel Guardian/);
  });

  it("detects collisions between synonym variants", () => {
    const pack = parseKeywordBrandPack({
      approvedTerms: [
        { id: "1", value: "cold brew", kind: "keyword" },
        { id: "2", value: "coldbrew", kind: "keyword" },
      ],
    });
    const set = buildConversationalKeywordSet(pack);
    assert.ok(termKey("Cold Brew") === termKey("coldbrew") || set.synonyms.includes("coldbrew"));
  });

  it("detects overlapping active flow triggers", () => {
    const warnings = detectTriggerCollisions({
      existing: [
        {
          id: "1",
          flowId: "flow_a",
          flowLabel: "Wings flow",
          canonicalValue: "WINGS",
          normalizedValue: "wings",
          channel: "tapcanvas",
          matchMode: "contains",
          active: true,
        },
      ],
      candidate: {
        flowId: "flow_b",
        flowLabel: "Other",
        canonicalValue: "wings",
        channel: "tapcanvas",
      },
    });
    assert.ok(warnings.some((w) => w.code === "collision"));
  });

  it("matches triggers by mode", () => {
    assert.equal(matchesTrigger("I want WINGS please", "wings", "contains"), true);
    assert.equal(matchesTrigger("WINGS", "wings", "exact"), true);
    assert.equal(matchesTrigger("menu please", "wings", "exact"), false);
  });
});

describe("Durable vocabulary service (memory)", () => {
  beforeEach(() => {
    resetMemoryVocabularyRepository();
    setVocabularyRepositoryForTests(createMemoryVocabularyRepository());
  });

  it("suggests, accepts, and persists approved terms", async () => {
    const suggested = await suggestVocabulary({
      businessId: "biz_mem",
      businessName: "Ocala Grill",
      channel: "tiktok",
      ground: { locationLabels: ["Ocala"], knownProducts: ["Wings"] },
    });
    assert.ok(suggested.suggestions.length > 0);
    assert.ok(suggested.runId);

    const accepted = await acceptVocabularyTerms({
      businessId: "biz_mem",
      terms: suggested.suggestions.slice(0, 2),
      runId: suggested.runId,
    });
    assert.ok(accepted.accepted >= 1);
    assert.ok(
      accepted.pack.approvedTerms.length + accepted.pack.brandedHashtags.length >= 1
    );
  });

  it("records trigger collision analytics when binding overlaps", async () => {
    await detectAndBindTrigger({
      businessId: "biz_mem",
      binding: {
        flowId: "flow_1",
        flowLabel: "Menu",
        canonicalValue: "MENU",
        channel: "tapcanvas",
      },
    });
    const second = await detectAndBindTrigger({
      businessId: "biz_mem",
      binding: {
        flowId: "flow_2",
        flowLabel: "Other menu",
        canonicalValue: "menu",
        channel: "tapcanvas",
      },
    });
    assert.ok(second.collisions.some((c) => c.code === "collision"));
  });
});

describe("Keywords analytics", () => {
  beforeEach(() => resetKeywordAnalyticsMemory());

  it("records counts without causal claims", () => {
    recordKeywordAnalytics({
      businessId: "b1",
      event: "keywords.suggest",
      count: 5,
      channel: "tiktok",
    });
    recordKeywordAnalytics({ businessId: "b1", event: "keywords.accept", count: 2 });
    recordKeywordAnalytics({ businessId: "b1", event: "keywords.save_brand", count: 1 });
    const summary = summarizeKeywordAnalytics("b1");
    assert.equal(summary.generated, 5);
    assert.equal(summary.accepted, 2);
    assert.equal(summary.brandPackSaves, 1);
    assert.equal(summary.disclaimer, "counts_only_no_causal_claim");
    assert.equal(listKeywordAnalytics("b1").length, 3);
  });
});
