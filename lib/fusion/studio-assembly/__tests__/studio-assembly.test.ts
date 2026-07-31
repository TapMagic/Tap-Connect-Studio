import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ASSEMBLY_CAPABILITIES,
  CAPABILITY_DEMO_BEATS,
  capabilitiesForMode,
  createAssemblyMachine,
  entryKindToMode,
  frameFromCardSnapshot,
  ILLUSTRATIVE_FRAME,
  isTerminalPhase,
  modeUnfoldsToHome,
  nextPhase,
  phaseSequenceForMode,
  reduceAssembly,
  timingForMode,
  totalDurationMs,
} from "@/lib/fusion/studio-assembly";
import { FORBIDDEN_CLAIM_PATTERNS, LANDING_HERO, OPERATING_IDEAS, PRODUCT_PATHS, FINAL_CTA, USE_CASES, AUTOPILOT_SECTION, INTEGRATIONS_SECTION, TAPPROOF_SECTION, FULL_VALUE_FRAME_COPY } from "@/lib/marketing/landing-card-centered";
import {
  PRODUCT_EXPLORER_CAPABILITIES,
  explorerForSelector,
  getExplorerCapability,
} from "@/lib/marketing/product-explorer";
import { ASSEMBLY_DESTINATION_SELECTORS } from "@/lib/fusion/studio-assembly/capabilities";
import { STUDIO_NAV } from "@/lib/fusion/studio/ia";
import { ZONE_TOKENS } from "@/lib/fusion/studio/zone-tokens";

describe("studio assembly state machine", () => {
  it("starts into dark and advances through landing sequence", () => {
    let s = createAssemblyMachine("LANDING_FULL");
    s = reduceAssembly(s, { type: "START" });
    assert.equal(s.phase, "dark");
    const seq = phaseSequenceForMode("LANDING_FULL");
    assert.ok(seq.includes("card_resolve"));
    assert.ok(!seq.includes("card_unfold"));
    while (!isTerminalPhase(s.phase) && s.phase !== "idle") {
      const n = nextPhase(s.mode, s.phase);
      if (!n || n === "complete") {
        s = reduceAssembly(s, { type: "COMPLETE" });
        break;
      }
      s = reduceAssembly(s, { type: "TICK", phase: n });
    }
    assert.equal(s.phase, "complete");
  });

  it("supports FIRST_STUDIO_ENTRY with unfold", () => {
    assert.ok(modeUnfoldsToHome("FIRST_STUDIO_ENTRY"));
    const seq = phaseSequenceForMode("FIRST_STUDIO_ENTRY");
    assert.ok(seq.includes("card_forward"));
    assert.ok(seq.includes("card_unfold"));
  });

  it("landing cinematic sequence includes demo, crescendo, and pullback", () => {
    const seq = phaseSequenceForMode("LANDING_FULL");
    assert.ok(seq.indexOf("tap_pulse") < seq.indexOf("card_resolve"));
    assert.ok(seq.indexOf("card_resolve") < seq.indexOf("card_forward"));
    assert.ok(seq.indexOf("card_forward") < seq.indexOf("retention_choice"));
    assert.ok(seq.indexOf("retention_choice") < seq.indexOf("save_home"));
    assert.ok(seq.indexOf("save_home") < seq.indexOf("reopen_card"));
    assert.ok(seq.indexOf("reopen_card") < seq.indexOf("capabilities_emerge"));
    assert.ok(seq.includes("capability_demo"));
    assert.ok(seq.includes("crescendo"));
    assert.ok(seq.includes("pullback"));
    assert.ok(seq.indexOf("capability_demo") < seq.indexOf("crescendo"));
    assert.ok(seq.indexOf("crescendo") < seq.indexOf("full_value_frame"));
    assert.ok(seq.indexOf("full_value_frame") < seq.indexOf("pullback"));
  });

  it("accelerate jumps toward pullback then settle", () => {
    let s = reduceAssembly(createAssemblyMachine("LANDING_FULL"), { type: "START" });
    s = reduceAssembly(s, { type: "TICK", phase: "capabilities_emerge" });
    s = reduceAssembly(s, { type: "ACCELERATE" });
    assert.equal(s.phase, "pullback");
    s = reduceAssembly(s, { type: "ACCELERATE" });
    assert.equal(s.phase, "icons_settle");
    s = reduceAssembly(s, { type: "ACCELERATE" });
    assert.equal(s.phase, "complete");
  });

  it("meaningful capability demo beats are ordered", () => {
    assert.ok(CAPABILITY_DEMO_BEATS.some((b) => b.id === "campaigns"));
    assert.ok(CAPABILITY_DEMO_BEATS.some((b) => b.id === "tapsave"));
    assert.ok(CAPABILITY_DEMO_BEATS.some((b) => b.id === "autopilot"));
    assert.ok(CAPABILITY_DEMO_BEATS.some((b) => b.id === "integrations"));
    assert.ok(CAPABILITY_DEMO_BEATS.some((b) => b.id === "insights"));
  });

  it("everyday is shorter than first entry and landing", () => {
    const everyday = totalDurationMs("EVERYDAY_ENTRY", false);
    const first = totalDurationMs("FIRST_STUDIO_ENTRY", false);
    const landing = totalDurationMs("LANDING_FULL", false);
    assert.ok(everyday < first);
    assert.ok(first < landing);
    assert.ok(everyday >= 1500 && everyday <= 3000);
    assert.ok(first >= 5000 && first <= 9000);
    assert.ok(landing >= 9000 && landing <= 16000);
  });

  it("skip and fail are terminal and do not trap", () => {
    let s = reduceAssembly(createAssemblyMachine("EVERYDAY_ENTRY"), { type: "START" });
    s = reduceAssembly(s, { type: "SKIP" });
    assert.equal(s.phase, "skipped");
    s = reduceAssembly(createAssemblyMachine("EVERYDAY_ENTRY"), {
      type: "FAIL",
      reason: "test",
    });
    assert.equal(s.phase, "failed");
    assert.equal(s.error, "test");
  });

  it("reduced motion timing is short", () => {
    const t = timingForMode("LANDING_FULL", true);
    assert.ok((t.capabilities_emerge ?? 0) <= 300);
    assert.ok(totalDurationMs("LANDING_FULL", true) < 2000);
  });

  it("replay resets to idle machine", () => {
    let s = reduceAssembly(createAssemblyMachine("LANDING_FULL"), { type: "START" });
    s = reduceAssembly(s, { type: "COMPLETE" });
    s = reduceAssembly(s, { type: "REPLAY" });
    assert.equal(s.phase, "idle");
  });
});

describe("studio assembly capabilities choreography", () => {
  it("Card-supporting capabilities emerge in semantic order", () => {
    const ordered = [...ASSEMBLY_CAPABILITIES].sort((a, b) => a.order - b.order);
    assert.equal(ordered[0].id, "brand");
    assert.ok(ordered.some((c) => c.id === "tap_points"));
    assert.ok(ordered.some((c) => c.id === "campaigns"));
    assert.ok(ordered.some((c) => c.id === "tapsave"));
    assert.ok(ordered.some((c) => c.id === "audience"));
    assert.ok(ordered.some((c) => c.id === "email"));
    assert.ok(ordered.some((c) => c.id === "autopilot"));
    assert.ok(ordered.some((c) => c.id === "insights"));
    assert.ok(ordered.some((c) => c.id === "integrations"));
    assert.ok(ordered.some((c) => c.id === "trust_fabric"));
  });

  it("TapConnect mode shows only core capabilities", () => {
    const core = capabilitiesForMode("tapconnect");
    assert.ok(core.every((c) => c.tapconnectCore));
    assert.ok(core.length < ASSEMBLY_CAPABILITIES.length);
  });

  it("destinations map to real Studio nav or special anchors", () => {
    const navIds = new Set(STUDIO_NAV.map((n) => n.id));
    for (const cap of ASSEMBLY_CAPABILITIES) {
      if (cap.destinationId === "autopilot_next" || cap.destinationId === "trust_underlay") {
        assert.ok(ASSEMBLY_DESTINATION_SELECTORS[cap.destinationId]);
        continue;
      }
      assert.ok(navIds.has(cap.destinationId), cap.destinationId);
      assert.ok(ZONE_TOKENS[cap.zone], cap.zone);
    }
  });

  it("Trust Fabric is cross-cutting not a peer product", () => {
    const trust = ASSEMBLY_CAPABILITIES.find((c) => c.id === "trust_fabric");
    assert.equal(trust?.crossCutting, true);
  });
});

describe("full-value frame", () => {
  it("illustrative frame is labeled", () => {
    assert.equal(ILLUSTRATIVE_FRAME.illustrative, true);
    assert.ok(ILLUSTRATIVE_FRAME.items.length >= 5);
  });

  it("account frame uses real snapshot without claiming illustrative", () => {
    const frame = frameFromCardSnapshot({
      cardName: "Acme",
      publicStateLabel: "Published",
      tapPointHealthy: 1,
      tapPointCount: 2,
      spotlightTitle: "Sale",
      tapSaveEnabled: true,
      nextActionLabel: "Open Card",
      proofSummary: "3 taps",
      safeForPublicAnalytics: true,
    });
    assert.equal(frame.illustrative, false);
    assert.ok(frame.items.some((i) => i.label.includes("Sale")));
  });

  it("frame copy avoids superiority claims", () => {
    for (const pat of FORBIDDEN_CLAIM_PATTERNS) {
      assert.equal(pat.test(FULL_VALUE_FRAME_COPY), false);
    }
  });
});

describe("frequency prefs helpers", () => {
  it("entryKindToMode maps correctly", () => {
    assert.equal(entryKindToMode("first"), "FIRST_STUDIO_ENTRY");
    assert.equal(entryKindToMode("replay"), "FIRST_STUDIO_ENTRY");
    assert.equal(entryKindToMode("everyday"), "EVERYDAY_ENTRY");
    assert.equal(entryKindToMode("none"), null);
  });
});

describe("product explorer source of truth", () => {
  it("covers required major capabilities", () => {
    for (const id of [
      "brand",
      "tap_points",
      "campaigns",
      "tapsave",
      "audience",
      "email",
      "autopilot",
      "insights",
      "integrations",
      "trust_fabric",
    ]) {
      assert.ok(getExplorerCapability(id), id);
    }
  });

  it("selector modes filter without entitlement enforcement fields", () => {
    const tc = explorerForSelector("tapconnect");
    const st = explorerForSelector("studio");
    assert.ok(tc.length < st.length);
    assert.ok(tc.every((c) => c.planAvailability === "tapconnect_core"));
    for (const c of PRODUCT_EXPLORER_CAPABILITIES) {
      assert.ok(c.features.length >= 1);
      assert.ok(c.cardRelationship.length > 10);
    }
  });
});

describe("landing claims discipline", () => {
  it("rejects uniqueness and superiority phrases in landing copy inventory", () => {
    const corpus = [
      LANDING_HERO.headline,
      LANDING_HERO.subhead,
      LANDING_HERO.note,
      ...OPERATING_IDEAS.map((o) => `${o.title} ${o.body}`),
      PRODUCT_PATHS.tapconnect.body,
      PRODUCT_PATHS.studio.body,
      ...PRODUCT_PATHS.tapconnect.bullets,
      ...PRODUCT_PATHS.studio.bullets,
      INTEGRATIONS_SECTION.body,
      INTEGRATIONS_SECTION.honesty,
      AUTOPILOT_SECTION.body,
      TAPPROOF_SECTION.body,
      ...USE_CASES.map((u) => `${u.title} ${u.body}`),
      FINAL_CTA.title,
      FINAL_CTA.body,
      FULL_VALUE_FRAME_COPY,
      ...PRODUCT_EXPLORER_CAPABILITIES.flatMap((c) => [
        c.shortDescription,
        c.cardRelationship,
        c.customerValue,
        ...c.features.map((f) => f.description),
      ]),
    ].join("\n");

    for (const pat of FORBIDDEN_CLAIM_PATTERNS) {
      assert.equal(pat.test(corpus), false, String(pat));
    }
  });

  it("includes required product story headings content", () => {
    assert.match(LANDING_HERO.headline, /Card/i);
    assert.match(LANDING_HERO.subhead, /Studio/i);
    assert.equal(OPERATING_IDEAS.length, 5);
    assert.ok(USE_CASES.some((u) => u.id === "small-business"));
    assert.ok(USE_CASES.some((u) => u.id === "established-monday"));
  });
});
