import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { publishSavedCard, summarizeCardComparison } from "@/lib/fusion/card/publication";

const published = {
  version: 3 as const,
  accentColor: "#111111",
  surfaceColor: "#ffffff",
  textColor: "#000000",
  headerEnergy: 50,
  collapsible: true,
  defaultCollapsed: false,
  actionsLayout: "stack" as const,
  defaultFinish: "soft" as const,
  cardFinish: "soft" as const,
  defaultShape: "pill" as const,
  sections: [
    { id: "a", type: "action" as const, order: 0, enabled: true, label: "Call" },
    { id: "b", type: "action" as const, order: 1, enabled: true, label: "Visit" },
  ],
};

describe("canonical Card publication", () => {
  it("summarizes visibility, content, and order changes", () => {
    const next = {
      ...published,
      sections: [
        { ...published.sections[1], order: 0 },
        { ...published.sections[0], order: 1, enabled: false },
      ],
    };
    const summary = summarizeCardComparison(published, next);
    assert.equal(summary.reordered, true);
    assert.deepEqual(summary.changed.sort(), ["a", "b"]);
    assert.match(summary.summary, /changed/);
  });

  it("publishes only the saved draft and moves the compatibility pointer atomically", async () => {
    const draft = { ...published, accentColor: "#ff5500" };
    let brandUpdate: Record<string, unknown> | null = null;
    const snapshot = {
      id: "snapshot-1",
      businessId: "business-1",
      subjectType: "card",
      subjectId: "kit-1",
      version: 1,
      schemaVersion: 2,
      manifest: {},
      contentHash: "hash",
      publishedById: "user-1",
      publishedAt: new Date(),
      tapPointId: null,
    };
    const publication = {
      id: "publication-1",
      businessId: "business-1",
      brandKitId: "kit-1",
      publicationSnapshotId: "snapshot-1",
      version: 1,
      sourceDraftRevision: 4,
      status: "PUBLISHED" as const,
      comparisonSummary: {},
      publishedById: "user-1",
      publishedAt: new Date(),
      archivedAt: null,
      rolledBackFromId: null,
    };
    const client = {
      brandKit: {
        findUnique: async () => ({
          id: "kit-1",
          businessId: "business-1",
          tapCard: published,
          tapCardDraft: draft,
          tapCardDraftRevision: 4,
          currentCardPublicationId: null,
        }),
        updateMany: async (args: Record<string, unknown>) => {
          brandUpdate = args;
          return { count: 1 };
        },
      },
      publicationSnapshot: {
        findUnique: async () => null,
        findFirst: async () => null,
        create: async () => snapshot,
      },
      cardPublication: {
        findUnique: async () => null,
        create: async () => publication,
      },
    };
    const result = await publishSavedCard({
      businessId: "business-1",
      expectedDraftRevision: 4,
      publishedById: "user-1",
      client: client as never,
    });
    assert.equal(result.publication.id, "publication-1");
    assert.ok(brandUpdate);
    const data = (brandUpdate as { data: Record<string, unknown> }).data;
    assert.deepEqual(data.tapCard, draft);
    assert.equal(data.currentCardPublicationId, "publication-1");
    assert.equal("tapCardDraft" in data, false);
  });
});
