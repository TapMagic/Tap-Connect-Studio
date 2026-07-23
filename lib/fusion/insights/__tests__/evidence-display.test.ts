import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evidenceClassTone,
  formatEvidenceCaption,
} from "../evidence-display";

describe("Insights evidence display", () => {
  it("formats KPI-style captions consistently", () => {
    assert.equal(
      formatEvidenceCaption({
        evidenceClass: "confirmed",
        source: "TapEvent",
        seeded: false,
      }),
      "Confirmed · Live source · TapEvent"
    );
    assert.equal(
      formatEvidenceCaption({
        evidenceClass: "derived",
        source: "Lead/TapEvent",
        seeded: false,
      }),
      "Derived · Live source · Lead/TapEvent"
    );
  });

  it("includes mock path note for wallet modeled passes", () => {
    const caption = formatEvidenceCaption({
      evidenceClass: "modeled",
      source: "WalletPass",
      mockPath: true,
    });
    assert.match(caption, /Modeled \(not fact\)/);
    assert.match(caption, /Mock adapter path/);
  });

  it("maps tone for evidence classes", () => {
    assert.equal(evidenceClassTone("confirmed"), "primary");
    assert.equal(evidenceClassTone("incomplete"), "muted");
    assert.equal(evidenceClassTone("modeled"), "primary");
  });
});
