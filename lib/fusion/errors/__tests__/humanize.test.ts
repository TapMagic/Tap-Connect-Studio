import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { humanizeError } from "@/lib/fusion/errors/humanize";

describe("humanizeError", () => {
  it("translates Prisma scent into host language with details", () => {
    const h = humanizeError(
      "Invalid `prisma.campaign.create()` invocation in /app/api/campaigns/route.ts"
    );
    assert.match(h.title, /couldn.t save|couldn.t load|went wrong/i);
    assert.ok(h.details?.includes("prisma"));
  });

  it("keeps short human messages as title", () => {
    const h = humanizeError("Campaign title is required");
    assert.equal(h.title, "Campaign title is required");
  });

  it("handles empty input with fallback", () => {
    const h = humanizeError("");
    assert.ok(h.title.length > 10);
  });

  it("maps network failures", () => {
    const h = humanizeError("fetch failed: ECONNREFUSED");
    assert.match(h.title, /connection/i);
  });
});
