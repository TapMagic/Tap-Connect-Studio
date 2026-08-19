import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TapConnectCardConfig } from "@/lib/brand/tap-card";
import {
  CardPublicationError,
  publishSavedCard,
  rollbackPublishedCard,
} from "@/lib/fusion/card/publication";
import {
  CABINET_NOIR_ENTITLEMENT_KEY,
  CABINET_NOIR_FAMILY_ID,
} from "@/lib/fusion/creative-studio/signature-assets/cabinet-noir";

function draft(restricted = true): TapConnectCardConfig {
  return {
    version: 3,
    accentColor: "#111111",
    surfaceColor: "#ffffff",
    textColor: "#000000",
    headerEnergy: 50,
    collapsible: true,
    defaultCollapsed: false,
    actionsLayout: "stack",
    defaultFinish: "soft",
    cardFinish: "soft",
    defaultShape: "pill",
    sections: [],
    rootComposition: restricted ? {
      version: 1,
      id: "root",
      label: "Restricted Signature assembly",
      nodes: [],
      mobileFallback: "scale",
      signatureAssembly: {
        contractId: "signatureAssemblyAuthoring@1.0.0",
        input: {
          familyId: CABINET_NOIR_FAMILY_ID,
          familyVersion: "1.0.0",
          recipeId: "single-stack",
          recipeVersion: "1.0.0",
          requestedActionCount: 1,
          layoutMode: "single-stack",
          actions: [],
          componentVariants: {},
          decorativeFurniture: {},
        },
      },
    } : undefined,
  };
}

describe("canonical publication Signature enforcement", () => {
  it("keeps an entitled publication publicly readable after loss while blocking only the next publish", async () => {
    const state = {
      tapCard: draft(false),
      tapCardDraft: draft(true),
      revision: 3,
      currentCardPublicationId: null as string | null,
      snapshotCreates: 0,
      publicationCreates: 0,
    };
    const snapshot = { id: "snapshot-entitled", version: 1 };
    const publication = {
      id: "publication-entitled",
      version: 1,
      sourceDraftRevision: 3,
      publishedAt: new Date(),
    };
    const client = {
      brandKit: {
        findUnique: async () => ({
          id: "kit-1",
          tapCard: state.tapCard,
          tapCardDraft: state.tapCardDraft,
          tapCardDraftRevision: state.revision,
          currentCardPublicationId: state.currentCardPublicationId,
        }),
        updateMany: async (args: { data: { tapCard: TapConnectCardConfig; currentCardPublicationId: string } }) => {
          state.tapCard = args.data.tapCard;
          state.currentCardPublicationId = args.data.currentCardPublicationId;
          return { count: 1 };
        },
      },
      publicationSnapshot: {
        findUnique: async () => null,
        findFirst: async () => null,
        create: async () => { state.snapshotCreates += 1; return snapshot; },
      },
      cardPublication: {
        findUnique: async () => null,
        create: async () => { state.publicationCreates += 1; return publication; },
      },
    };

    await publishSavedCard({
      businessId: "business-1",
      expectedDraftRevision: 3,
      signatureEntitlementKeys: [CABINET_NOIR_ENTITLEMENT_KEY],
      client: client as never,
    });

    const publicCardAfterLoss = state.tapCard;
    assert.equal(publicCardAfterLoss.rootComposition?.signatureAssembly?.input.familyId, CABINET_NOIR_FAMILY_ID);
    assert.equal(state.currentCardPublicationId, "publication-entitled");

    await assert.rejects(publishSavedCard({
      businessId: "business-1",
      expectedDraftRevision: 3,
      signatureEntitlementKeys: [],
      client: client as never,
    }), (error: unknown) => error instanceof CardPublicationError && error.code === "signature_family_not_publishable");

    assert.equal(state.tapCard, publicCardAfterLoss);
    assert.equal(state.currentCardPublicationId, "publication-entitled");
    assert.equal(state.snapshotCreates, 1);
    assert.equal(state.publicationCreates, 1);
  });

  it("blocks before any immutable snapshot, publication, or public pointer write", async () => {
    const priorPublicCard = draft(true);
    const state = {
      currentCardPublicationId: "publication-existing",
      tapCard: priorPublicCard,
      writes: [] as string[],
    };
    const client = {
      brandKit: {
        findUnique: async () => ({
          id: "kit-1",
          tapCard: state.tapCard,
          tapCardDraft: draft(true),
          tapCardDraftRevision: 7,
          currentCardPublicationId: state.currentCardPublicationId,
        }),
        updateMany: async () => { state.writes.push("brandKit.updateMany"); return { count: 1 }; },
      },
      publicationSnapshot: {
        findUnique: async () => { state.writes.push("publicationSnapshot.findUnique"); return null; },
        findFirst: async () => { state.writes.push("publicationSnapshot.findFirst"); return null; },
        create: async () => { state.writes.push("publicationSnapshot.create"); return null; },
      },
      cardPublication: {
        findUnique: async () => { state.writes.push("cardPublication.findUnique"); return null; },
        create: async () => { state.writes.push("cardPublication.create"); return null; },
      },
    };

    await assert.rejects(
      publishSavedCard({
        businessId: "business-1",
        expectedDraftRevision: 7,
        signatureEntitlementKeys: [],
        client: client as never,
      }),
      (error: unknown) => error instanceof CardPublicationError
        && error.code === "signature_family_not_publishable"
        && error.status === 403
        && error.findings.length === 1,
    );
    assert.deepEqual(state.writes, []);
    assert.equal(state.currentCardPublicationId, "publication-existing");
    assert.equal(state.tapCard, priorPublicCard);
  });

  it("publishes the same saved draft after entitlement is restored", async () => {
    let updated = false;
    const snapshot = { id: "snapshot-2", version: 2 };
    const publication = {
      id: "publication-2",
      version: 2,
      sourceDraftRevision: 7,
      publishedAt: new Date(),
    };
    const client = {
      brandKit: {
        findUnique: async () => ({ id: "kit-1", tapCard: draft(false), tapCardDraft: draft(true), tapCardDraftRevision: 7, currentCardPublicationId: "publication-1" }),
        updateMany: async () => { updated = true; return { count: 1 }; },
      },
      publicationSnapshot: {
        findUnique: async () => null,
        findFirst: async () => ({ version: 1 }),
        create: async () => snapshot,
      },
      cardPublication: {
        findUnique: async () => null,
        create: async () => publication,
      },
    };
    const result = await publishSavedCard({
      businessId: "business-1",
      expectedDraftRevision: 7,
      signatureEntitlementKeys: [CABINET_NOIR_ENTITLEMENT_KEY],
      client: client as never,
    });
    assert.equal(result.publication.id, "publication-2");
    assert.equal(updated, true);
  });

  it("publishes after restricted content is removed without restoring entitlement", async () => {
    let updated = false;
    const client = {
      brandKit: {
        findUnique: async () => ({ id: "kit-1", tapCard: draft(true), tapCardDraft: draft(false), tapCardDraftRevision: 8, currentCardPublicationId: "publication-1" }),
        updateMany: async () => { updated = true; return { count: 1 }; },
      },
      publicationSnapshot: {
        findUnique: async () => ({ id: "snapshot-2", version: 2 }),
        findFirst: async () => null,
        create: async () => null,
      },
      cardPublication: {
        findUnique: async () => ({ id: "publication-2", version: 2, sourceDraftRevision: 8 }),
        create: async () => null,
      },
    };
    await publishSavedCard({
      businessId: "business-1",
      expectedDraftRevision: 8,
      signatureEntitlementKeys: [],
      client: client as never,
    });
    assert.equal(updated, true);
  });

  it("blocks rollback before changing the public revision pointer", async () => {
    let updateCount = 0;
    const client = {
      brandKit: {
        findUnique: async () => ({ id: "kit-1", currentCardPublicationId: "publication-current" }),
        update: async () => { updateCount += 1; return {}; },
      },
      cardPublication: {
        findFirst: async () => ({ id: "publication-old", brandKitId: "kit-1", status: "PUBLISHED", publicationSnapshotId: "snapshot-old" }),
      },
      publicationSnapshot: {
        findUnique: async () => ({ id: "snapshot-old", manifest: { kind: "card", tapCard: draft(true) } }),
      },
    };
    await assert.rejects(
      rollbackPublishedCard({
        businessId: "business-1",
        publicationId: "publication-old",
        signatureEntitlementKeys: [],
        client: client as never,
      }),
      (error: unknown) => error instanceof CardPublicationError
        && error.code === "signature_family_not_publishable"
        && error.findings[0]?.operation === "card.rollback",
    );
    assert.equal(updateCount, 0);
  });

  it("allows rollback when the target revision's family is publishable", async () => {
    let updateCount = 0;
    const client = {
      brandKit: {
        findUnique: async () => ({ id: "kit-1", currentCardPublicationId: "publication-current" }),
        update: async () => { updateCount += 1; return {}; },
      },
      cardPublication: {
        findFirst: async () => ({ id: "publication-old", brandKitId: "kit-1", status: "PUBLISHED", publicationSnapshotId: "snapshot-old" }),
      },
      publicationSnapshot: {
        findUnique: async () => ({ id: "snapshot-old", manifest: { kind: "card", tapCard: draft(true) } }),
      },
    };
    await rollbackPublishedCard({
      businessId: "business-1",
      publicationId: "publication-old",
      signatureEntitlementKeys: [CABINET_NOIR_ENTITLEMENT_KEY],
      client: client as never,
    });
    assert.equal(updateCount, 1);
  });
});
