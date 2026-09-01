import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { defaultTapConnectCard, parseTapConnectCard, type TapConnectCardConfig } from "@/lib/brand/tap-card";
import { resolveSignatureEntitlementInspection } from "@/lib/control/signature-entitlement-administration";
import {
  CardPublicationError,
  publishSavedCard,
  rollbackPublishedCard,
} from "@/lib/fusion/card/publication";
import {
  CABINET_NOIR_ENTITLEMENT_KEY,
  CABINET_NOIR_FAMILY,
  CABINET_NOIR_FAMILY_ID,
} from "../signature-assets/cabinet-noir";
import {
  compileSignatureAuthoringState,
  createSignatureAssemblyAuthoringState,
  listSignatureAuthoringFamilies,
  setSignatureActionCount,
  setSignatureComponentVariant,
  setSignatureDecorativeFurniture,
  updateSignatureAction,
} from "../signature-assets/authoring";
import { adaptSignatureStandaloneComponent } from "../signature-assets/composition-adapter";
import type { SignatureEntitlementKey } from "../signature-assets/types";

const cssRequire = createRequire(import.meta.url) as NodeJS.Require & {
  extensions: Record<string, (module: NodeModule) => void>;
};
cssRequire.extensions[".css"] = () => undefined;

function entitlement(restricted = false) {
  return resolveSignatureEntitlementInspection({
    businessId: "business-acceptance",
    businessName: "Cabinet Noir Acceptance",
    family: CABINET_NOIR_FAMILY,
    service: { id: "service-cabinet-noir", status: "ACTIVE", defaultEnabled: false },
    plan: null,
    overrides: [{ id: "authorized-grant", source: "Control override", enabled: true, status: "ACTIVE" }],
    restrictions: restricted
      ? [{ id: "authorized-revoke", source: "Control account restriction", enabled: false }]
      : [],
    now: new Date("2026-08-18T12:00:00Z"),
  })!;
}

function keysFor(access: ReturnType<typeof entitlement>): readonly SignatureEntitlementKey[] {
  return access.effective.enabled ? [access.entitlementKey as SignatureEntitlementKey] : [];
}

function buildAuthoredCard(actionLabel = "Call the atelier") {
  let nextId = 0;
  const idFactory = () => `acceptance-action-${++nextId}`;
  let state = createSignatureAssemblyAuthoringState(CABINET_NOIR_FAMILY_ID, "single-stack", {
    idFactory,
    identityContent: { src: "/acceptance/identity-mark.png", alt: "Atelier identity" },
  });
  assert.ok(state);
  state = setSignatureActionCount(state, 3, idFactory);
  const family = listSignatureAuthoringFamilies([CABINET_NOIR_ENTITLEMENT_KEY])
    .find((entry) => entry.family.id === CABINET_NOIR_FAMILY_ID)!;
  assert.equal(family.access.selectable, true);
  const topper = family.variants.find((variant) => variant.componentId !== "CN-037") ?? family.variants[0];
  state = setSignatureComponentVariant(state, topper.role, topper.componentId);
  state = setSignatureDecorativeFurniture(state, "decorative-termination", true);
  const selections = [
    { label: actionLabel, destination: "tel:+15551212", plugComponentId: "CN-013", accessibilityLabel: actionLabel },
    { label: "Visit the collection", destination: "https://example.test/collection", plugComponentId: "CN-026", accessibilityLabel: "Visit the collection" },
    { label: "Follow the atelier", destination: "https://example.test/social", plugComponentId: "CN-036", accessibilityLabel: "Follow the atelier" },
  ];
  for (let index = 0; index < state.input.actions.length; index += 1) {
    state = updateSignatureAction(state, state.input.actions[index].id, selections[index]);
  }
  const compiled = compileSignatureAuthoringState(state, { blockId: "acceptance-signature-root" });
  assert.equal(compiled.ok, true, JSON.stringify(compiled));
  if (!compiled.ok) throw new Error("Acceptance assembly did not compile");
  const informational = adaptSignatureStandaloneComponent({
    familyId: CABINET_NOIR_FAMILY_ID,
    familyVersion: "1.0.0",
    componentId: "CN-011",
    componentVersion: "1.0.0",
    instanceId: "acceptance-informational-line",
    liveText: "Private appointments · Tuesday–Saturday",
  });
  assert.ok(informational);
  const config = defaultTapConnectCard({ businessName: "Cabinet Noir Acceptance" });
  config.sections = [];
  config.rootComposition = {
    ...compiled.composition.block,
    nodes: [...compiled.composition.block.nodes, informational.nodes[0]],
  };
  return { state, compiled, config };
}

type Publication = {
  id: string;
  version: number;
  sourceDraftRevision: number;
  publicationSnapshotId: string;
  brandKitId: string;
  status: "PUBLISHED";
  publishedAt: Date;
};

function publicationClient(initialDraft: TapConnectCardConfig) {
  const state = {
    kit: {
      id: "kit-acceptance",
      tapCard: defaultTapConnectCard({ businessName: "Prior public Card" }),
      tapCardDraft: initialDraft,
      tapCardDraftRevision: 1,
      currentCardPublicationId: null as string | null,
    },
    snapshots: [] as Array<{ id: string; version: number; contentHash: string; manifest: unknown }>,
    publications: [] as Publication[],
    pointerWrites: 0,
  };
  const client = {
    brandKit: {
      findUnique: async () => ({ ...state.kit }),
      updateMany: async (args: { where: { tapCardDraftRevision: number }; data: { tapCard: TapConnectCardConfig; currentCardPublicationId: string } }) => {
        if (args.where.tapCardDraftRevision !== state.kit.tapCardDraftRevision) return { count: 0 };
        state.kit.tapCard = args.data.tapCard;
        state.kit.currentCardPublicationId = args.data.currentCardPublicationId;
        state.pointerWrites += 1;
        return { count: 1 };
      },
      update: async (args: { data: { tapCard: TapConnectCardConfig; currentCardPublicationId: string } }) => {
        state.kit.tapCard = args.data.tapCard;
        state.kit.currentCardPublicationId = args.data.currentCardPublicationId;
        state.pointerWrites += 1;
        return { ...state.kit };
      },
    },
    publicationSnapshot: {
      findUnique: async (args: { where: { subjectType_subjectId_contentHash?: { contentHash: string }; id?: string } }) => {
        const id = args.where.id;
        if (id) return state.snapshots.find((snapshot) => snapshot.id === id) ?? null;
        const hash = args.where.subjectType_subjectId_contentHash?.contentHash;
        return state.snapshots.find((snapshot) => snapshot.contentHash === hash) ?? null;
      },
      findFirst: async () => state.snapshots.at(-1) ?? null,
      create: async (args: { data: { version: number; contentHash: string; manifest: unknown } }) => {
        const snapshot = { id: `snapshot-${args.data.version}`, ...args.data };
        state.snapshots.push(snapshot);
        return snapshot;
      },
    },
    cardPublication: {
      findUnique: async (args: { where: { publicationSnapshotId: string } }) => state.publications
        .find((publication) => publication.publicationSnapshotId === args.where.publicationSnapshotId) ?? null,
      findFirst: async (args: { where: { id: string } }) => state.publications
        .find((publication) => publication.id === args.where.id) ?? null,
      create: async (args: { data: { publicationSnapshotId: string; version: number; sourceDraftRevision: number } }) => {
        const publication: Publication = {
          id: `publication-${args.data.version}`,
          version: args.data.version,
          sourceDraftRevision: args.data.sourceDraftRevision,
          publicationSnapshotId: args.data.publicationSnapshotId,
          brandKitId: state.kit.id,
          status: "PUBLISHED",
          publishedAt: new Date("2026-08-18T12:00:00Z"),
        };
        state.publications.push(publication);
        return publication;
      },
    },
  };
  return { state, client };
}

async function renderPublicSignature(config: TapConnectCardConfig) {
  const { SignatureMasterBridge } = await import("../signature-assets/SignatureMasterBridge");
  return (config.rootComposition?.nodes ?? [])
    .map((node) => renderToStaticMarkup(createElement(SignatureMasterBridge, { props: node.props })))
    .join("\n");
}

describe("Signature controlled operational lifecycle", () => {
  it("proves entitlement administration through public continuity, remediation, and rollback", async () => {
    const granted = entitlement(false);
    assert.deepEqual(granted.effective.access, { visible: true, selectable: true, publishable: true });
    assert.match(granted.effective.explanation.join(" "), /Control override/);

    const discovered = listSignatureAuthoringFamilies(keysFor(granted))
      .find((entry) => entry.family.id === CABINET_NOIR_FAMILY_ID)!;
    assert.equal(discovered.access.selectable, true);
    const authored = buildAuthoredCard();
    assert.equal(authored.compiled.composition.phone390.widthPx, 390);
    assert.ok(authored.compiled.composition.phone390.heightPx > 0);

    const savedJson = JSON.stringify(authored.config);
    const reloaded = parseTapConnectCard(JSON.parse(savedJson), { businessName: "Cabinet Noir Acceptance" });
    assert.deepEqual(reloaded.rootComposition?.signatureAssembly, authored.state);
    const recompiled = compileSignatureAuthoringState(reloaded.rootComposition!.signatureAssembly!, {
      blockId: reloaded.rootComposition!.id,
    });
    assert.equal(recompiled.ok, true);
    if (!recompiled.ok) throw new Error("Reloaded assembly did not compile");
    assert.deepEqual(recompiled.composition.block.nodes, authored.compiled.composition.block.nodes);

    const runtime = publicationClient(reloaded);
    const initial = await publishSavedCard({
      businessId: "business-acceptance",
      expectedDraftRevision: 1,
      signatureEntitlementKeys: keysFor(granted),
      client: runtime.client as never,
    });
    assert.equal(initial.publication.id, "publication-1");
    assert.equal(runtime.state.kit.currentCardPublicationId, "publication-1");
    const initialPublicCard = runtime.state.kit.tapCard;
    const publicMarkup = await renderPublicSignature(initialPublicCard);
    assert.match(publicMarkup, /data-signature-family="cabinet-noir"/);
    assert.match(publicMarkup, /data-signature-source-sha="[a-f0-9]{64}"/);
    assert.match(publicMarkup, /data-signature-depth-renderer="portable-layer-v1"/);
    assert.match(publicMarkup, /\?tcv=[a-f0-9]{16}/);
    assert.match(publicMarkup, /\/visual-parts\/signature\/cabinet-noir\/source\/01-production-assets\//);
    assert.match(publicMarkup, /Call the atelier/);
    assert.match(publicMarkup, /href="tel:\+15551212"/);
    const historicalActionCard=structuredClone(initialPublicCard);
    const historicalCall=historicalActionCard.rootComposition?.nodes.find((node)=>node.props.href==="tel:+15551212");
    assert.ok(historicalCall);
    historicalCall.props.actionType="website";
    assert.match(await renderPublicSignature(historicalActionCard),/href="tel:\+15551212"/);
    assert.match(publicMarkup, /Private appointments · Tuesday–Saturday/);
    assert.match(publicMarkup, /aria-label="Atelier identity"/);

    const revoked = entitlement(true);
    assert.deepEqual(revoked.effective.access, { visible: true, selectable: false, publishable: false });
    const locked = listSignatureAuthoringFamilies(keysFor(revoked))
      .find((entry) => entry.family.id === CABINET_NOIR_FAMILY_ID)!;
    assert.equal(locked.access.visible, true);
    assert.equal(locked.access.selectable, false);
    assert.deepEqual(runtime.state.kit.tapCardDraft.rootComposition, reloaded.rootComposition);
    const publicPointerAtRevoke = runtime.state.kit.currentCardPublicationId;
    const snapshotsAtRevoke = runtime.state.snapshots.length;
    const pointerWritesAtRevoke = runtime.state.pointerWrites;
    await assert.rejects(
      publishSavedCard({
        businessId: "business-acceptance",
        expectedDraftRevision: 1,
        signatureEntitlementKeys: keysFor(revoked),
        client: runtime.client as never,
      }),
      (error: unknown) => error instanceof CardPublicationError
        && error.code === "signature_family_not_publishable"
        && error.findings[0]?.familyId === CABINET_NOIR_FAMILY_ID,
    );
    assert.equal(runtime.state.snapshots.length, snapshotsAtRevoke);
    assert.equal(runtime.state.pointerWrites, pointerWritesAtRevoke);
    assert.equal(runtime.state.kit.currentCardPublicationId, publicPointerAtRevoke);
    assert.equal(runtime.state.kit.tapCard, initialPublicCard);
    assert.match(await renderPublicSignature(runtime.state.kit.tapCard), /Call the atelier/);

    const restored = entitlement(false);
    assert.equal(listSignatureAuthoringFamilies(keysFor(restored))
      .find((entry) => entry.family.id === CABINET_NOIR_FAMILY_ID)?.access.selectable, true);
    const edited = buildAuthoredCard("Call the private salon");
    runtime.state.kit.tapCardDraft = parseTapConnectCard(JSON.parse(JSON.stringify(edited.config)), {
      businessName: "Cabinet Noir Acceptance",
    });
    runtime.state.kit.tapCardDraftRevision = 2;
    const republished = await publishSavedCard({
      businessId: "business-acceptance",
      expectedDraftRevision: 2,
      signatureEntitlementKeys: keysFor(restored),
      client: runtime.client as never,
    });
    assert.equal(republished.publication.id, "publication-2");
    assert.equal(runtime.state.kit.currentCardPublicationId, "publication-2");
    assert.equal(runtime.state.snapshots.length, 2);
    assert.match(await renderPublicSignature(runtime.state.kit.tapCard), /Call the private salon/);

    const unrestricted = defaultTapConnectCard({ businessName: "Unrestricted remediation" });
    unrestricted.rootComposition = undefined;
    runtime.state.kit.tapCardDraft = unrestricted;
    runtime.state.kit.tapCardDraftRevision = 3;
    const remediated = await publishSavedCard({
      businessId: "business-acceptance",
      expectedDraftRevision: 3,
      signatureEntitlementKeys: keysFor(revoked),
      client: runtime.client as never,
    });
    assert.equal(remediated.publication.id, "publication-3");
    assert.equal(runtime.state.kit.tapCard.rootComposition, undefined);

    await rollbackPublishedCard({
      businessId: "business-acceptance",
      publicationId: "publication-1",
      signatureEntitlementKeys: keysFor(restored),
      client: runtime.client as never,
    });
    assert.equal(runtime.state.kit.currentCardPublicationId, "publication-1");
    assert.match(await renderPublicSignature(runtime.state.kit.tapCard), /Call the atelier/);
    const pointerBeforeBlockedRollback = runtime.state.kit.currentCardPublicationId;
    const writesBeforeBlockedRollback = runtime.state.pointerWrites;
    await assert.rejects(
      rollbackPublishedCard({
        businessId: "business-acceptance",
        publicationId: "publication-2",
        signatureEntitlementKeys: keysFor(revoked),
        client: runtime.client as never,
      }),
      (error: unknown) => error instanceof CardPublicationError
        && error.code === "signature_family_not_publishable"
        && error.findings[0]?.operation === "card.rollback",
    );
    assert.equal(runtime.state.kit.currentCardPublicationId, pointerBeforeBlockedRollback);
    assert.equal(runtime.state.pointerWrites, writesBeforeBlockedRollback);
    assert.match(await renderPublicSignature(runtime.state.kit.tapCard), /Call the atelier/);
  });

  it("does not impose premium entitlement semantics on legacy Signature families", () => {
    const legacy = listSignatureAuthoringFamilies([])
      .filter((entry) => entry.family.id !== CABINET_NOIR_FAMILY_ID);
    assert.ok(legacy.some((entry) => /arc ember/i.test(entry.family.label)));
    assert.ok(legacy.every((entry) => !entry.family.entitlement));
    assert.ok(legacy.every((entry) => entry.access.visible && entry.access.selectable && entry.access.publishable));
  });
});
