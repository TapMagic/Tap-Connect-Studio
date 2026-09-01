import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterStudioDiscoveryResources, type StudioDiscoveryContext, type StudioDiscoveryResource } from "../../platform/discovery";
import { applyStudioPresentation, type StudioPresentationApplication } from "../../platform/presentation-application";
import { isQualifyingStudioUsageOperation, LEGACY_STUDIO_RECENCY_SOURCES } from "../../platform/activity";
import { buildStudioButtonFamilyCatalog } from "../button-family-provider.server";
import { CABINET_NOIR_ENTITLEMENT_KEY, CABINET_NOIR_FAMILY_ID } from "../../signature-assets/cabinet-noir";
import { ARC_EMBER_SIGNATURE_FAMILY_ID } from "../../signature-assets/registry";
import { compileSignatureAuthoringState, createSignatureAssemblyAuthoringState } from "../../signature-assets/authoring";
import { selectedStructuredAssembly } from "../signature-assembly-entry";
import { STUDIO_STRUCTURED_ASSEMBLY_CONTRACT } from "../../platform/structured-assembly";
import { curatedCompoundObjectForNode, curatedCompoundObjects } from "../../platform/curated-compound-object";

const context: StudioDiscoveryContext = {
  authoringJob: "design-surface",
  target: { kind: "section", capabilities: ["presentation"] },
  resourceKinds: ["section-presentation"],
  readiness: ["ready"],
  approval: ["approved"],
  brandRelationship: "compatible",
};

function sectionFixture(overrides: Partial<StudioDiscoveryResource<StudioPresentationApplication>> = {}): StudioDiscoveryResource<StudioPresentationApplication> {
  return {
    ref: { provider: "fixture", resourceId: "section:calm", version: 3 },
    kind: "section-presentation",
    label: "Calm Section",
    preview: { authority: "fixture-renderer", payload: {} },
    taxonomy: { category: "sections", tags: ["calm"] },
    compatibility: { targetKinds: ["section"], requiredCapabilities: ["presentation"] },
    source: { authority: "fixture-catalog", provenance: "fixture:section:calm@3" },
    brand: { relationship: "compatible" },
    governance: { readiness: "ready", approval: "approved", available: true },
    search: { text: "Calm Section quiet layout" },
    application: { presentation: { fill: "#112233", radius: 18 }, supportedOperations: ["apply", "replace"] },
    ...overrides,
  };
}

describe("shared Studio discovery", () => {
  it("filters a non-Button resource through the same readiness, query, and compatibility contract", () => {
    const ready = sectionFixture();
    const disabled = sectionFixture({ ref: { provider: "fixture", resourceId: "section:disabled" }, governance: { readiness: "disabled", approval: "approved", available: true } });
    const result = filterStudioDiscoveryResources([ready, disabled], { ...context, query: "quiet" });
    assert.deepEqual(result.resources.map((resource) => resource.ref.resourceId), ["section:calm"]);
  });

  it("rejects incompatible targets before a resource appears actionable", () => {
    const result = filterStudioDiscoveryResources([sectionFixture()], { ...context, target: { kind: "button", capabilities: ["presentation"] } });
    assert.equal(result.resources.length, 0);
  });
});

describe("shared presentation application", () => {
  it("applies a non-Button presentation while preserving identity, content, behavior, accessibility, analytics, Brand linkage, and provenance", () => {
    const result = applyStudioPresentation({
      operation: "apply",
      target: { id: "section-1", kind: "section", capabilities: ["presentation"], props: { objectId: "section-1", text: "About us", actionType: "website", href: "https://example.com", accessibleName: "About us", trackingId: "about", brandRole: "primary", contentProvenance: { owner: "host" }, fill: "#ffffff" } },
      resource: sectionFixture(),
      context,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.props.fill, "#112233");
    assert.equal(result.props.text, "About us");
    assert.equal(result.props.href, "https://example.com");
    assert.equal(result.props.accessibleName, "About us");
    assert.equal(result.props.trackingId, "about");
    assert.equal(result.props.brandRole, "primary");
    assert.deepEqual(result.props.contentProvenance, { owner: "host" });
    assert.equal((result.props.presentationProvenance as { resource: { version: number } }).resource.version, 3);
  });

  it("surfaces destructive protected-field conflicts and keeps Convert explicit", () => {
    const destructive = sectionFixture({ application: { presentation: {}, supportedOperations: ["replace"], destructiveFields: ["text"] } });
    const conflict = applyStudioPresentation({ operation: "replace", target: { id: "s", kind: "section", capabilities: ["presentation"], props: { text: "Keep me" } }, resource: destructive, context });
    assert.deepEqual(conflict, { ok: false, code: "conflict", conflicts: ["Protected field would be destroyed: text"] });
    const convert = applyStudioPresentation({ operation: "convert", target: { id: "s", kind: "section", capabilities: ["presentation"], props: {} }, resource: sectionFixture(), context });
    assert.equal(convert.ok, false);
    if (!convert.ok) assert.equal(convert.code, "conversion_required");
  });

  it("can be committed as exactly one canonical history transaction and undone coherently", () => {
    const history: Record<string, unknown>[] = [{ fill: "#ffffff", text: "Keep me" }];
    const result = applyStudioPresentation({ operation: "apply", target: { id: "s", kind: "section", capabilities: ["presentation"], props: history[0] }, resource: sectionFixture(), context });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    history.push(result.props);
    assert.equal(history.length, 2);
    history.pop();
    assert.deepEqual(history[0], { fill: "#ffffff", text: "Keep me" });
  });
});

describe("shared Studio activity", () => {
  it("records only semantic use operations and identifies legacy browser-local migration inputs", () => {
    assert.equal(isQualifyingStudioUsageOperation("place"), true);
    assert.equal(isQualifyingStudioUsageOperation("apply"), true);
    assert.equal(isQualifyingStudioUsageOperation("view"), false);
    assert.ok(LEGACY_STUDIO_RECENCY_SOURCES.some((source) => source.capability === "icons"));
    assert.ok(LEGACY_STUDIO_RECENCY_SOURCES.every((source) => source.disposition === "migration_input"));
  });
});

describe("shared Button-family discovery", () => {
  it("presents standalone, Brand, governed, and saved resource models through one contract", () => {
    const catalog = buildStudioButtonFamilyCatalog([CABINET_NOIR_ENTITLEMENT_KEY]);
    assert.deepEqual(catalog.entries.map((entry) => entry.id), ["standard", "brand", ARC_EMBER_SIGNATURE_FAMILY_ID, CABINET_NOIR_FAMILY_ID, "saved"]);
    const cabinet = catalog.entries.find((entry) => entry.id === CABINET_NOIR_FAMILY_ID)!;
    assert.equal(cabinet.model, "governed-signature");
    assert.equal(cabinet.available, true);
    assert.ok(cabinet.sections.some((section) => section.id === "assembly-starts"));
    assert.equal(cabinet.sections.flatMap((section) => section.resources).some((resource) => resource.classification === "assembly-managed"), false);
    assert.equal(cabinet.sections.some((section) => section.id === "actions"), false);
    assert.ok(cabinet.sections.find((section) => section.id === "assembly-starts")?.resources.every((resource) => resource.previewSrc?.includes("/reference/presets/")));
    assert.equal(cabinet.sections.flatMap((section) => section.resources).some((resource) => resource.label.toLowerCase().includes("spine")), false);
    const arc = catalog.entries.find((entry) => entry.id === ARC_EMBER_SIGNATURE_FAMILY_ID)!;
    assert.equal(arc.model, "governed-signature");
    assert.equal(arc.sections.flatMap((section) => section.resources).some((resource) => resource.classification === "assembly-managed"), false);
  });
});

describe("shared Structured Assembly cockpit contract", () => {
  it("maps existing signatureAssembly inputs without exposing generated furniture as editable slots", () => {
    const identity = { src: "/brand.png", alt: "Brand identity", source: "brand" as const, provenance: "brand" as const };
    const state = createSignatureAssemblyAuthoringState(CABINET_NOIR_FAMILY_ID, "twin-rail", { idFactory: (() => { let id = 0; return () => `action-${++id}`; })(), identityContent: identity, identityDefault: identity });
    assert.ok(state);
    const compiled = compileSignatureAuthoringState(state!);
    assert.equal(compiled.ok, true);
    if (!compiled.ok) return;
    const block = compiled.composition.block;
    const selected = block.nodes.find((node) => typeof node.props.signatureAssemblyInstanceId === "string")!;
    const descriptor = selectedStructuredAssembly([block], selected);
    assert.ok(descriptor);
    assert.equal(descriptor?.contractId, STUDIO_STRUCTURED_ASSEMBLY_CONTRACT);
    assert.equal(descriptor?.familyId, CABINET_NOIR_FAMILY_ID);
    assert.equal(descriptor?.slots.length, state!.input.actions.length);
    assert.equal(descriptor?.slots.every((slot) => slot.contentType === "action"), true);
    assert.equal(descriptor?.resourceSlots?.[0]?.semanticRole, "identity");
    assert.equal(descriptor?.resourceSlots?.[0]?.value?.src, "/brand.png");
    assert.equal(descriptor?.resourceSlots?.[0]?.presentation.ownership, "governed");
    assert.equal(descriptor?.resourceSlots?.[0]?.presentation.visualFit?.maskShape, "circle");
    assert.equal(descriptor?.resourceSlots?.[0]?.presentation.visualFit?.cropCapability, "focal-zoom");
    assert.ok(descriptor?.resourceSlots?.[0]?.operations.includes("adjust"));
    assert.equal(descriptor?.mutationReadiness, "ready");
    assert.deepEqual(descriptor?.allowedActionCounts, [2, 4, 6], "Twin Rail exposes only visually certified paired counts until an intentional odd termination exists");
    assert.equal(descriptor?.compatiblePlugs.length, 24);
    const compound = curatedCompoundObjectForNode(block, selected.id);
    assert.ok(compound);
    assert.equal(curatedCompoundObjects(block).length, 1);
    assert.ok(compound!.memberNodeIds.length > descriptor!.slots.length);
    assert.ok(compound!.memberNodeIds.includes(compound!.anchorNodeId));
    const historical = {
      ...block,
      signatureAssembly: {
        ...block.signatureAssembly!,
        input: {
          ...block.signatureAssembly!.input,
          actions: block.signatureAssembly!.input.actions.map((action, index) => index === 0 ? { ...action, actionType: "website", destination: "tel:+13525550123" } : action),
        },
      },
    };
    assert.equal(selectedStructuredAssembly([historical], selected)?.slots[0]?.actionType, "call", "tel: remains family-neutral destination authority during authoring");
  });
});
