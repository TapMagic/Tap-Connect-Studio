import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { insightKpiEvidenceCaption, insightsToCsv, type InsightsSnapshot } from "../metrics";
import { csvEscapeField, parseInsightsRangeDays } from "../range";
import { formatEvidenceCaption } from "../evidence-display";
import { assertNotPresentedAsFact, labelEvidence } from "../tapproof";

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

  it("exports CSV of current view with escaping", () => {
    const snapshot: InsightsSnapshot = {
      rangeDays: 14,
      from: "2026-07-01T00:00:00.000Z",
      to: "2026-07-14T00:00:00.000Z",
      empty: false,
      fetchedAt: "2026-07-14T12:00:00.000Z",
      kpis: [
        {
          key: "taps_range",
          label: 'Taps (14d, "live")',
          value: 3,
          evidenceClass: "confirmed",
          source: "TapEvent",
          seeded: false,
        },
      ],
    };
    const csv = insightsToCsv(snapshot);
    assert.match(csv, /key,label,value/);
    assert.match(csv, /evidence_caption/);
    assert.match(csv, /taps_range/);
    assert.match(csv, /confirmed/);
    assert.match(csv, /""live""/);
    const caption = insightKpiEvidenceCaption(snapshot.kpis[0]!);
    assert.equal(caption, formatEvidenceCaption({
      evidenceClass: "confirmed",
      source: "TapEvent",
      seeded: false,
    }));
    assert.ok(csv.includes(csvEscapeField(caption)));
  });
});
