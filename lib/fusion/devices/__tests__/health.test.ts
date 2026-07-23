import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeTapPointHealth, summarizeFleetHealth } from "../health";

describe("TapPoint health badges", () => {
  it("marks unbridged as warning", () => {
    const h = computeTapPointHealth({
      status: "ACTIVE",
      hasAddress: true,
      bridged: false,
      totalTapCount: 10,
    });
    assert.equal(h.tone, "warning");
    assert.equal(h.label, "Unbridged");
  });

  it("marks missing address critical", () => {
    const h = computeTapPointHealth({
      status: "ACTIVE",
      hasAddress: false,
      bridged: true,
    });
    assert.equal(h.tone, "critical");
  });

  it("marks healthy active with taps", () => {
    const h = computeTapPointHealth({
      status: "ACTIVE",
      hasAddress: true,
      bridged: true,
      totalTapCount: 12,
      deviceStatus: "ACTIVE",
    });
    assert.equal(h.tone, "healthy");
    assert.equal(h.label, "Healthy");
    assert.ok(h.capacityScore > 0);
  });

  it("marks lost as critical", () => {
    const h = computeTapPointHealth({
      status: "LOST",
      hasAddress: true,
      bridged: true,
    });
    assert.equal(h.tone, "critical");
  });

  it("warns near capacity soft limit", () => {
    const h = computeTapPointHealth({
      status: "ACTIVE",
      hasAddress: true,
      bridged: true,
      totalTapCount: 9500,
      capacitySoftLimit: 10_000,
    });
    assert.equal(h.tone, "warning");
    assert.ok(h.errors.includes("near_capacity"));
  });

  it("rolls up fleet tones", () => {
    const fleet = summarizeFleetHealth([
      computeTapPointHealth({
        status: "ACTIVE",
        hasAddress: true,
        bridged: true,
        totalTapCount: 1,
      }),
      computeTapPointHealth({
        status: "LOST",
        hasAddress: true,
        bridged: true,
      }),
    ]);
    assert.equal(fleet.healthy, 1);
    assert.equal(fleet.critical, 1);
  });
});
