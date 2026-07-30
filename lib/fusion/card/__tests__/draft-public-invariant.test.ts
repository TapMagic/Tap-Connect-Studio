import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { saveCardDraft } from "@/lib/fusion/card/draft";
import { buildFirstCardDraft } from "@/lib/fusion/card/first-card-draft";

describe("Card draft/public invariant", () => {
  it("writes only draft fields and keeps the published representation unchanged", async () => {
    const published = { version: 3, sections: [{ id: "published", type: "identity" }] };
    let updateArgs: Record<string, unknown> | null = null;
    const draft = buildFirstCardDraft({
      businessName: "Northstar Workshop",
      outcome: "ESSENTIALS",
      facts: [],
    }).draft;
    const client = {
      brandKit: {
        updateMany: async (args: Record<string, unknown>) => {
          updateArgs = args;
          return { count: 1 };
        },
        findUnique: async () => ({
          id: "kit",
          tapCard: published,
          tapCardDraft: draft,
          tapCardDraftRevision: 2,
          tapCardDraftUpdatedAt: new Date(),
          tapCardPublishedAt: new Date("2026-01-01"),
        }),
      },
    };

    const result = await saveCardDraft({
      businessId: "business",
      draft,
      expectedRevision: 1,
      client: client as never,
    });

    assert.deepEqual(result.tapCard, published);
    assert.ok(updateArgs);
    const data = (updateArgs as { data: Record<string, unknown> }).data;
    assert.ok("tapCardDraft" in data);
    assert.equal("tapCard" in data, false);
    assert.equal("tapCardPublishedAt" in data, false);
  });
});
