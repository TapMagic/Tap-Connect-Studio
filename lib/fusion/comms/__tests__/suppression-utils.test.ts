import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatSuppressionRow,
  normalizeSuppressionAddress,
  validateSuppressionInput,
} from "../suppression-utils";

describe("Suppression utils", () => {
  it("normalizes address to lowercase trimmed", () => {
    assert.equal(normalizeSuppressionAddress("  User@Example.COM  "), "user@example.com");
    assert.equal(normalizeSuppressionAddress("   "), null);
  });

  it("validates email channel + address", () => {
    const ok = validateSuppressionInput("email", "User@Example.com");
    assert.equal(ok.ok, true);
    if (ok.ok) {
      assert.equal(ok.channel, "email");
      assert.equal(ok.address, "user@example.com");
    }

    const bad = validateSuppressionInput("email", "not-an-email");
    assert.equal(bad.ok, false);
  });

  it("rejects unknown channel", () => {
    const r = validateSuppressionInput("fax", "123");
    assert.equal(r.ok, false);
  });

  it("formats suppression row for API", () => {
    const row = formatSuppressionRow({
      id: "s1",
      channel: "email",
      address: "a@b.c",
      reason: "unsubscribe",
      sourceType: "manual",
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
    });
    assert.equal(row.createdAt, "2026-07-01T00:00:00.000Z");
    assert.equal(row.reason, "unsubscribe");
  });
});
