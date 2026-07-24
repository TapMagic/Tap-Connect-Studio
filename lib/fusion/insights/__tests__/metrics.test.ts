import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { insightKpiEvidenceCaption, insightsToCsv, type InsightsSnapshot } from "../metrics";
import { csvEscapeField, parseInsightsRangeDays } from "../range";
import { formatEvidenceCaption } from "../evidence-display";
import { assertNotPresentedAsFact, labelEvidence } from "../tapproof";
import { computeKpiDeltas, formatDeltaCaption } from "../comparisons";
import {
  buildProvenanceFromKpis,
  confidenceForEvidence,
  freshnessLabel,
} from "../provenance";
import {
  builtinSavedViewPresets,
  createSavedView,
  parseEvidenceFilter,
  parseSavedViews,
  serializeSavedViews,
} from "../saved-views";
import {
  buildInsightsHref,
  kpiBelongsToView,
  parseInsightsView,
} from "../views";

describe("Insights evidence + CSV", () => {
  it("labels evidence classes", () => {
    assert.equal(labelEvidence("confirmed"), "Confirmed");
    assert.equal(labelEvidence("modeled"), "Modeled (not fact)");
    assert.equal(assertNotPresentedAsFact("modeled"), false);
    assert.equal(assertNotPresentedAsFact("confirmed"), true);
  });

  it("parses and clamps range days", () => {
    assert.equal(parseInsightsRangeDays("14"), 14);
    assert.equal(parseInsightsRangeDays(0), 14);
    assert.equal(parseInsightsRangeDays(-5), 14);
    assert.equal(parseInsightsRangeDays(999), 90);
    assert.equal(parseInsightsRangeDays("bad"), 14);
  });

  it("csvEscapeField handles commas and quotes", () => {
    assert.equal(csvEscapeField("plain"), "plain");
    assert.equal(csvEscapeField('say "hi"'), '"say ""hi"""');
    assert.equal(csvEscapeField("a,b"), '"a,b"');
  });

  it("exports CSV of current view with escaping + provenance", () => {
    const snapshot: InsightsSnapshot = {
      rangeDays: 14,
      from: "2026-07-01T00:00:00.000Z",
      to: "2026-07-14T00:00:00.000Z",
      view: "overview",
      compare: true,
      evidenceFilter: "all",
      drillKey: "taps_range",
      campaignId: null,
      empty: false,
      fetchedAt: "2026-07-14T12:00:00.000Z",
      freshness: { ageSeconds: 0, label: "Just now" },
      deltas: [
        {
          key: "taps_range",
          label: "Taps",
          current: 3,
          previous: 1,
          delta: 2,
          deltaPct: 200,
          evidenceClass: "derived",
        },
      ],
      previousFrom: "2026-06-17T00:00:00.000Z",
      previousTo: "2026-06-30T23:59:59.000Z",
      drillRows: [
        {
          id: "tap_c1",
          kpiKey: "taps_range",
          label: "Welcome",
          value: 3,
          evidenceClass: "confirmed",
          source: "TapEvent",
          drillThroughHref: "/dashboard/campaigns/c1",
        },
      ],
      provenance: [
        {
          id: "tp_taps_range",
          businessId: "b1",
          subjectType: "insight_kpi",
          subjectId: "taps_range",
          claim: "Taps = 3",
          evidenceClass: "confirmed",
          confidence: 0.95,
          sources: [{ ref: "TapEvent", at: "2026-07-14T12:00:00.000Z" }],
          humanVerified: false,
          createdAt: "2026-07-14T12:00:00.000Z",
        },
      ],
      allKpis: [],
      kpis: [
        {
          key: "taps_range",
          label: 'Taps (14d, "live")',
          value: 3,
          evidenceClass: "confirmed",
          source: "TapEvent",
          seeded: false,
          drillThroughHref: "/dashboard/analytics",
        },
      ],
    };
    const csv = insightsToCsv(snapshot);
    assert.match(csv, /key,label,value/);
    assert.match(csv, /evidence_caption/);
    assert.match(csv, /taps_range/);
    assert.match(csv, /confirmed/);
    assert.match(csv, /""live""/);
    assert.match(csv, /delta_pct/);
    assert.match(csv, /drill_kpi_key/);
    assert.match(csv, /proof_id/);
    const caption = insightKpiEvidenceCaption(snapshot.kpis[0]!);
    assert.equal(
      caption,
      formatEvidenceCaption({
        evidenceClass: "confirmed",
        source: "TapEvent",
        seeded: false,
      })
    );
    assert.ok(csv.includes(csvEscapeField(caption)));
  });
});

describe("Insights views / compare / provenance / saved views", () => {
  it("parses views and builds hrefs", () => {
    assert.equal(parseInsightsView("campaign"), "campaign");
    assert.equal(parseInsightsView("nope"), "overview");
    assert.equal(kpiBelongsToView("taps_range", "campaign"), true);
    assert.equal(kpiBelongsToView("loyalty_enrollments", "campaign"), false);
    assert.match(buildInsightsHref({ days: 14, view: "commerce", compare: true }), /view=commerce/);
    assert.match(buildInsightsHref({ days: 7, compare: true }), /compare=1/);
  });

  it("computes deltas honestly when prior is zero", () => {
    const deltas = computeKpiDeltas(
      [
        {
          key: "taps_range",
          label: "Taps",
          value: 5,
          evidenceClass: "confirmed",
          source: "TapEvent",
          seeded: false,
        },
      ],
      [
        {
          key: "taps_range",
          label: "Taps",
          value: 0,
          evidenceClass: "confirmed",
          source: "TapEvent",
          seeded: false,
        },
      ]
    );
    assert.equal(deltas[0]!.delta, 5);
    assert.equal(deltas[0]!.deltaPct, null);
    assert.match(formatDeltaCaption(deltas[0]!), /incomplete %/);
  });

  it("builds TapProof provenance + freshness", () => {
    assert.equal(confidenceForEvidence("modeled"), 0.45);
    const proofs = buildProvenanceFromKpis({
      businessId: "b1",
      fetchedAt: "2026-07-14T12:00:00.000Z",
      rangeFrom: "2026-07-01T00:00:00.000Z",
      rangeTo: "2026-07-14T00:00:00.000Z",
      kpis: [
        {
          key: "conversion",
          label: "Conversion",
          value: 12.5,
          evidenceClass: "derived",
          source: "Lead/TapEvent",
          seeded: false,
        },
      ],
    });
    assert.equal(proofs.length, 1);
    assert.equal(proofs[0]!.evidenceClass, "derived");
    assert.equal(proofs[0]!.humanVerified, false);
    const fresh = freshnessLabel("2026-07-14T12:00:00.000Z", new Date("2026-07-14T12:00:30.000Z"));
    assert.equal(fresh.ageSeconds, 30);
    assert.equal(fresh.label, "30s ago");
  });

  it("serializes saved views + evidence filter", () => {
    assert.equal(parseEvidenceFilter("modeled"), "modeled");
    assert.equal(parseEvidenceFilter("x"), "all");
    const v = createSavedView({
      name: "My view",
      days: 30,
      view: "loyalty",
      compare: true,
      evidence: "confirmed",
    });
    const raw = serializeSavedViews([v]);
    const parsed = parseSavedViews(raw);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0]!.view, "loyalty");
    assert.equal(parsed[0]!.compare, true);
    assert.ok(builtinSavedViewPresets().length >= 3);
    assert.deepEqual(parseSavedViews("not-json"), []);
  });
});
