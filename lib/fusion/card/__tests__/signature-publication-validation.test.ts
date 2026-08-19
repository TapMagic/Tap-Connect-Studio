import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TapConnectCardConfig } from "@/lib/brand/tap-card";
import {
  collectPublishedSignatureFamilyUses,
  SIGNATURE_FAMILY_NOT_PUBLISHABLE,
  validateSignaturePublication,
} from "@/lib/fusion/card/signature-publication-validation";
import {
  ARC_EMBER_SIGNATURE_FAMILY_ID,
  SIGNATURE_SYSTEM_V1_FAMILY_ID,
  SIGNATURE_ASSETS,
} from "@/lib/fusion/creative-studio/signature-assets/registry";
import {
  CABINET_NOIR_ENTITLEMENT_KEY,
  CABINET_NOIR_FAMILY_ID,
  CABINET_NOIR_FAMILY_VERSION,
} from "@/lib/fusion/creative-studio/signature-assets/cabinet-noir";
import {
  APPROVED_SIGNATURE_CONTRACT_IDS,
  type SignatureFamilyDefinition,
} from "@/lib/fusion/creative-studio/signature-assets/types";

function card(input: {
  root?: Record<string, unknown>;
  sectionComposition?: Record<string, unknown>;
  children?: unknown[];
} = {}): TapConnectCardConfig {
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
    rootComposition: input.root as never,
    sections: input.sectionComposition || input.children
      ? [{ id: "section", type: "surface", enabled: true, order: 0, composition: input.sectionComposition as never, children: input.children as never }]
      : [],
  };
}

function block(nodes: Array<Record<string, unknown>> = [], familyId?: string) {
  return {
    version: 1,
    id: "block",
    label: "Block",
    nodes: nodes.map((props, index) => ({
      id: `node-${index}`,
      primitive: "image",
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      rotation: 0,
      zIndex: index,
      opacity: 1,
      visible: true,
      locked: false,
      props,
    })),
    mobileFallback: "scale",
    ...(familyId ? {
      signatureAssembly: {
        contractId: "signatureAssemblyAuthoring@1.0.0",
        input: { familyId, familyVersion: CABINET_NOIR_FAMILY_VERSION },
      },
    } : {}),
  };
}

function restrictedFamily(id: string, key: `signature.family.${string}`): SignatureFamilyDefinition {
  return {
    id,
    slug: id,
    label: id,
    lifecycle: "production",
    sortOrder: 1,
    version: "1.0.0",
    entitlement: {
      contractId: APPROVED_SIGNATURE_CONTRACT_IDS.entitlementResolution,
      entitlementKey: key,
      entitled: { visible: true, selectable: true, publishable: true },
      nonEntitled: { visible: true, selectable: false, publishable: false },
      afterLoss: {
        existingObjects: "read-only",
        existingPublishedOutput: "remain-live",
        newInsertion: "block",
        restrictedReplacement: "block",
      },
      publicRenderRequiresCurrentEntitlement: false,
      publicationEnforcement: "server-required",
    },
  };
}

describe("Signature publication entitlement validation", () => {
  it("allows a Card with no Signature content", () => {
    assert.equal(validateSignaturePublication(card(), []).ok, true);
  });

  it("allows an entitled normalized Signature assembly", () => {
    const result = validateSignaturePublication(
      card({ root: block([], CABINET_NOIR_FAMILY_ID) }),
      [CABINET_NOIR_ENTITLEMENT_KEY],
    );
    assert.equal(result.ok, true);
  });

  it("blocks a non-entitled normalized Signature assembly", () => {
    const result = validateSignaturePublication(card({ root: block([], CABINET_NOIR_FAMILY_ID) }), []);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.findings[0].code, SIGNATURE_FAMILY_NOT_PUBLISHABLE);
    assert.equal(result.findings[0].familyId, CABINET_NOIR_FAMILY_ID);
    assert.equal(result.findings[0].familyVersion, CABINET_NOIR_FAMILY_VERSION);
    assert.equal(result.findings[0].entitlementKey, CABINET_NOIR_ENTITLEMENT_KEY);
    assert.equal(result.findings[0].operation, "card.publish");
    assert.equal(result.findings[0].severity, "error");
  });

  it("detects a standalone Signature component outside an assembly", () => {
    const root = block([{ signatureFamilyId: CABINET_NOIR_FAMILY_ID, signatureFamilyVersion: "1.0.0" }]);
    assert.equal(validateSignaturePublication(card({ root }), []).ok, false);
  });

  it("recovers family authority from a registered Signature asset id", () => {
    const asset = SIGNATURE_ASSETS.find((candidate) => candidate.familyId === CABINET_NOIR_FAMILY_ID && !candidate.referenceOnly)!;
    const root = block([{ signatureAssetId: asset.id }]);
    assert.equal(validateSignaturePublication(card({ root }), []).ok, false);
  });

  it("detects restricted content in a Section composition", () => {
    const sectionComposition = block([], CABINET_NOIR_FAMILY_ID);
    assert.equal(validateSignaturePublication(card({ sectionComposition }), []).ok, false);
  });

  it("detects restricted content in nested component content", () => {
    const nested = block([], CABINET_NOIR_FAMILY_ID);
    const root = block([{ contentComposition: nested }]);
    assert.equal(validateSignaturePublication(card({ root }), []).ok, false);
  });

  it("detects restricted content in child Sections", () => {
    const children = [{ id: "child", type: "surface", enabled: true, order: 0, composition: block([], CABINET_NOIR_FAMILY_ID) }];
    assert.equal(validateSignaturePublication(card({ children }), []).ok, false);
  });

  it("deduplicates repeated uses of one restricted family", () => {
    const root = block([
      { signatureFamilyId: CABINET_NOIR_FAMILY_ID },
      { signatureFamilyId: CABINET_NOIR_FAMILY_ID },
    ], CABINET_NOIR_FAMILY_ID);
    const result = validateSignaturePublication(card({ root }), []);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.findings.length, 1);
    assert.equal(result.findings[0].occurrenceCount, 3);
  });

  it("reports every restricted family in one response", () => {
    const first = restrictedFamily("family-one", "signature.family.one");
    const second = restrictedFamily("family-two", "signature.family.two");
    const root = block([
      { signatureFamilyId: first.id, signatureFamilyVersion: "1.0.0" },
      { signatureFamilyId: second.id, signatureFamilyVersion: "1.0.0" },
      { signatureFamilyId: first.id, signatureFamilyVersion: "1.0.0" },
    ]);
    const result = validateSignaturePublication(card({ root }), [], [first, second]);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.deepEqual(result.findings.map((finding) => finding.entitlementKey).sort(), ["signature.family.one", "signature.family.two"]);
    assert.equal(result.findings.find((finding) => finding.familyId === first.id)?.occurrenceCount, 2);
  });

  it("checks publishable independently from visible and selectable", () => {
    const family = restrictedFamily("publish-gated", "signature.family.publish_gated");
    family.entitlement!.nonEntitled = { visible: true, selectable: true, publishable: false };
    const root = block([{ signatureFamilyId: family.id }]);
    assert.equal(validateSignaturePublication(card({ root }), [], [family]).ok, false);
  });

  it("allows publishable content even when it is not visible or selectable", () => {
    const family = restrictedFamily("publish-allowed", "signature.family.publish_allowed");
    family.entitlement!.nonEntitled = { visible: false, selectable: false, publishable: true };
    const root = block([{ signatureFamilyId: family.id }]);
    assert.equal(validateSignaturePublication(card({ root }), [], [family]).ok, true);
  });

  it("leaves legacy non-entitled Signature families unchanged", () => {
    const root = block([
      { signatureFamilyId: ARC_EMBER_SIGNATURE_FAMILY_ID },
      { signatureFamilyId: SIGNATURE_SYSTEM_V1_FAMILY_ID },
    ]);
    assert.equal(validateSignaturePublication(card({ root }), []).ok, true);
  });

  it("allows publication after restricted Signature content is removed", () => {
    const restricted = card({ root: block([], CABINET_NOIR_FAMILY_ID) });
    assert.equal(validateSignaturePublication(restricted, []).ok, false);
    assert.equal(validateSignaturePublication({ ...restricted, rootComposition: block() as never }, []).ok, true);
  });

  it("collects family and version metadata without changing serialization", () => {
    const draft = card({ root: block([], CABINET_NOIR_FAMILY_ID) });
    const roundTrip = JSON.parse(JSON.stringify(draft)) as TapConnectCardConfig;
    assert.deepEqual(collectPublishedSignatureFamilyUses(roundTrip), [{
      familyId: CABINET_NOIR_FAMILY_ID,
      familyVersion: CABINET_NOIR_FAMILY_VERSION,
      occurrenceCount: 1,
    }]);
  });

  it("contains no family-specific branch in the generic validator", () => {
    assert.doesNotMatch(validateSignaturePublication.toString(), /cabinet|noir|CN-/i);
  });
});
