import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseCreativeComposition, type CreativeCompositionBlock, type CreativeCompositionNode } from "@/lib/fusion/creative-studio/composition";
import {
  compositionChildren,
  copyCompositionNodeSubtree,
  createFlowContainerNode,
  deleteCompositionNode,
  duplicateCompositionNode,
  establishCompositionParentAuthority,
  insertCompositionContainer,
  insertCompositionModule,
  pasteCompositionNodeSubtree,
  reparentCompositionModule,
  unwrapCompositionContainer,
  validateCompositionParentAuthority,
  wrapCompositionModules,
} from "../composition-parent-authority";
import { prepareCompositionParentReviewDraft } from "../review-composition-fixture";
import type { TapConnectCardConfig } from "@/lib/brand/tap-card";

function expect<T>(actual: T) {
  return {
    toBe(expected: unknown) { assert.equal(actual, expected); },
    toEqual(expected: unknown) { assert.deepEqual(actual, expected); },
    toMatchObject(expected: Record<string, unknown>) {
      for (const [key, value] of Object.entries(expected)) assert.deepEqual((actual as Record<string, unknown>)[key], value);
    },
    toContain(expected: unknown) { assert.ok(Array.isArray(actual) && actual.includes(expected)); },
    toHaveLength(expected: number) { assert.equal((actual as { length: number }).length, expected); },
  };
}

function node(id: string, primitive: CreativeCompositionNode["primitive"] = "text"): CreativeCompositionNode {
  return { id, primitive, x: .13, y: .21, width: .64, height: .18, zIndex: 4, name: id, props: { text: id, actionType: "website", href: "/kept", provenance: { source: "host" }, entitlement: "kept" } };
}

function legacy(nodes: CreativeCompositionNode[] = []): CreativeCompositionBlock {
  return { version: 1, id: "root", label: "Card root", nodes, background: { kind: "none" }, mobileFallback: "scale" };
}

function reviewRoot(config: TapConnectCardConfig): CreativeCompositionBlock {
  const experienceRoot = config.experience?.pages.find((page) => page.pageId === config.experience?.defaultPageId)?.composition.rootComposition;
  return experienceRoot ?? config.rootComposition!;
}

describe("Composition Parent Authority", () => {
  it("establishes one direct parent/order truth without changing module identity or state", () => {
    const original = node("copy");
    const block = establishCompositionParentAuthority(legacy([original]));
    expect(block.nodes[0]).toMatchObject({ ...original, compositionKind: "module", parentId: null, siblingOrder: 0 });
    expect(validateCompositionParentAuthority(block)).toEqual([]);
  });

  it("allows three governed Container levels and rejects missing, cyclic, or deeper parents", () => {
    const root = establishCompositionParentAuthority(legacy());
    const container = createFlowContainerNode("Primary");
    const inserted = insertCompositionContainer(root, container);
    expect(inserted.ok).toBe(true);
    if (!inserted.ok) return;
    const nested = insertCompositionContainer(inserted.block, { ...createFlowContainerNode("Nested"), parentId: container.id });
    expect(nested.ok).toBe(true);
    if (!nested.ok) return;
    const nestedId = nested.block.nodes.find((candidate) => candidate.name === "Nested")!.id;
    const third = insertCompositionContainer(nested.block, { ...createFlowContainerNode("Third"), parentId: nestedId });
    expect(third.ok).toBe(true);
    if (!third.ok) return;
    const thirdId = third.block.nodes.find((candidate) => candidate.name === "Third")!.id;
    const fourth = insertCompositionContainer(third.block, { ...createFlowContainerNode("Too deep"), parentId: thirdId });
    expect(fourth.ok).toBe(false);
    if (!fourth.ok) expect(fourth.issues.map((issue) => issue.code)).toContain("nesting_depth");
    const missing = insertCompositionModule(third.block, node("m"), "missing");
    expect(missing.ok).toBe(false);
    const invalid = { ...third.block, nodes: third.block.nodes.map((candidate) => candidate.id === container.id ? { ...candidate, parentId: "other" } : candidate) };
    expect(validateCompositionParentAuthority(invalid).map((issue) => issue.code)).toContain("invalid_parent");
    const cycle = {
      ...inserted.block,
      nodes: [
        { ...createFlowContainerNode("A"), id: "a", parentId: "b" },
        { ...createFlowContainerNode("B"), id: "b", parentId: "a" },
      ],
    };
    expect(validateCompositionParentAuthority(cycle).map((issue) => issue.code)).toContain("cycle");
  });

  it("round-trips the parent authority through canonical composition parsing", () => {
    const block = establishCompositionParentAuthority(legacy([node("parsed")]));
    expect(parseCreativeComposition(block)?.parentAuthority).toEqual(block.parentAuthority);
  });

  it("reparents without transforming geometry, action, assets, provenance, or entitlement", () => {
    let root = establishCompositionParentAuthority(legacy());
    const container = createFlowContainerNode("Flow");
    const c = insertCompositionContainer(root, container); expect(c.ok).toBe(true); if (!c.ok) return; root = c.block;
    const original = { ...node("action", "button"), props: { ...node("action").props, mediaAssetId: "asset-1", accessibleLabel: "Kept" } };
    const m = insertCompositionModule(root, original); expect(m.ok).toBe(true); if (!m.ok) return;
    const moved = reparentCompositionModule(m.block, original.id, container.id); expect(moved.ok).toBe(true); if (!moved.ok) return;
    const after = moved.block.nodes.find((candidate) => candidate.id === original.id)!;
    expect({ ...after, compositionKind: undefined, parentId: undefined, siblingOrder: undefined }).toEqual({ ...original, compositionKind: undefined, parentId: undefined, siblingOrder: undefined });
    expect(after.parentId).toBe(container.id);
  });

  it("wraps contiguous Modules and unwraps at the Container position preserving IDs and order", () => {
    const root = establishCompositionParentAuthority(legacy([node("a"), node("b"), node("c"), node("d")]));
    const container = createFlowContainerNode("Wrapped");
    const wrapped = wrapCompositionModules(root, ["b", "c"], container); expect(wrapped.ok).toBe(true); if (!wrapped.ok) return;
    expect(compositionChildren(wrapped.block, null).map((item) => item.id)).toEqual(["a", container.id, "d"]);
    expect(compositionChildren(wrapped.block, container.id).map((item) => item.id)).toEqual(["b", "c"]);
    const unwrapped = unwrapCompositionContainer(wrapped.block, container.id); expect(unwrapped.ok).toBe(true); if (!unwrapped.ok) return;
    expect(compositionChildren(unwrapped.block, null).map((item) => item.id)).toEqual(["a", "b", "c", "d"]);
    expect(unwrapped.block.nodes.some((item) => item.id === container.id)).toBe(false);
  });

  it("duplicates a Container with copied Modules and separates unwrap from destructive delete", () => {
    let root = establishCompositionParentAuthority(legacy([node("a")]));
    const container = createFlowContainerNode("Original");
    const wrapped = wrapCompositionModules(root, ["a"], container); expect(wrapped.ok).toBe(true); if (!wrapped.ok) return; root = wrapped.block;
    const duplicated = duplicateCompositionNode(root, container.id); expect(duplicated.ok).toBe(true); if (!duplicated.ok) return;
    expect(compositionChildren(duplicated.block, null)).toHaveLength(2);
    expect(compositionChildren(duplicated.block, duplicated.selectedNodeId!)).toHaveLength(1);
    expect(deleteCompositionNode(root, container.id).ok).toBe(false);
    const deleted = deleteCompositionNode(root, container.id, { deleteContainerContents: true }); expect(deleted.ok).toBe(true); if (!deleted.ok) return;
    expect(deleted.block.nodes).toEqual([]);
  });

  it("duplicates and unwraps nested Container structure without flattening child identity", () => {
    let root = establishCompositionParentAuthority(legacy());
    const hero = createFlowContainerNode("Hero");
    const heroResult = insertCompositionContainer(root, hero); assert.equal(heroResult.ok, true); if (!heroResult.ok) return; root = heroResult.block;
    const left = { ...createFlowContainerNode("Left"), parentId: hero.id, props: { ...createFlowContainerNode("Left").props, widthPercent: 35 } };
    const leftResult = insertCompositionContainer(root, left); assert.equal(leftResult.ok, true); if (!leftResult.ok) return; root = leftResult.block;
    const logo = insertCompositionModule(root, node("logo", "image"), left.id); assert.equal(logo.ok, true); if (!logo.ok) return; root = logo.block;
    const copy = duplicateCompositionNode(root, hero.id); assert.equal(copy.ok, true); if (!copy.ok) return;
    const copiedHero = copy.block.nodes.find((candidate) => candidate.id === copy.selectedNodeId)!;
    const copiedLeft = compositionChildren(copy.block, copiedHero.id).find((candidate) => candidate.compositionKind === "container")!;
    assert.ok(copiedLeft);
    assert.equal(copiedLeft.props.widthPercent, 35);
    assert.equal(compositionChildren(copy.block, copiedLeft.id).length, 1);
    assert.notEqual(compositionChildren(copy.block, copiedLeft.id)[0]?.id, "logo");
  });

  it("duplicates a hosted Curated Module without sharing assembly or action identity", () => {
    const hosted = legacy([{ ...node("inner", "button"), props: { signatureAssemblyInstanceId: "hosted", signatureActionId: "action-a" } }]);
    hosted.id = "hosted";
    hosted.signatureAssembly = { contractId: "signatureAssemblyAuthoring@1.0.0", input: { familyId: "cabinet-noir", familyVersion: "1.0.0", recipeId: "recipe", recipeVersion: "1.0.0", requestedActionCount: 1, layoutMode: "standalone", actions: [{ id: "action-a", label: "Call", actionType: "phone", destination: "tel:+1", plugComponentId: "plug", accessibilityLabel: "Call", state: "default", analyticsId: "call" }] } } as never;
    const outer = { ...node("outer", "frame"), moduleComposition: hosted };
    const inserted = insertCompositionModule(establishCompositionParentAuthority(legacy()), outer); assert.equal(inserted.ok, true); if (!inserted.ok) return;
    const duplicated = duplicateCompositionNode(inserted.block, "outer"); assert.equal(duplicated.ok, true); if (!duplicated.ok) return;
    const copy = duplicated.block.nodes.find((candidate) => candidate.id === duplicated.selectedNodeId)!;
    assert.notEqual(copy.moduleComposition?.id, hosted.id);
    assert.notEqual(copy.moduleComposition?.signatureAssembly?.input.actions[0]?.id, "action-a");
    assert.notEqual(copy.moduleComposition?.nodes[0]?.id, "inner");
  });

  it("copies a complete Container subtree across Pages and pastes fresh canonical identities", () => {
    let source = establishCompositionParentAuthority(legacy());
    const container = createFlowContainerNode("Tour logistics");
    const insertedContainer = insertCompositionContainer(source, container); assert.equal(insertedContainer.ok, true); if (!insertedContainer.ok) return; source = insertedContainer.block;
    const map = { ...node("map", "image"), props: { elementKind: "map", componentKind: "map", analyticsId: "map:source", mapActions: [{ actionId: "tickets", analyticsId: "map:tickets", label: "Tickets" }] } };
    const insertedMap = insertCompositionModule(source, map, container.id); assert.equal(insertedMap.ok, true); if (!insertedMap.ok) return;
    const payload = copyCompositionNodeSubtree(insertedMap.block, container.id);
    assert.ok(payload);
    const destination = establishCompositionParentAuthority(legacy([node("existing")]));
    const pasted = pasteCompositionNodeSubtree(destination, payload!, null, 1); assert.equal(pasted.ok, true); if (!pasted.ok) return;
    const pastedContainer = pasted.block.nodes.find((candidate) => candidate.id === pasted.selectedNodeId)!;
    const pastedMap = compositionChildren(pasted.block, pastedContainer.id)[0]!;
    assert.notEqual(pastedContainer.id, container.id);
    assert.notEqual(pastedMap.id, map.id);
    assert.equal(pastedMap.props.elementKind, "map");
    assert.notEqual(pastedMap.props.analyticsId, "map:source");
    assert.notEqual((pastedMap.props.mapActions as Array<{ actionId: string }>)[0]?.actionId, "tickets");
    assert.deepEqual(compositionChildren(pasted.block, null).map((candidate) => candidate.name), ["existing", "Tour logistics copy"]);
    assert.equal(insertedMap.block.nodes.length, 2, "copy/paste must not mutate the source Page");
  });

  it("rebuilds the deterministic local review root and hosts Curated sections as ordinary outer Modules", () => {
    const signatureAssembly = { contractId: "signatureAssemblyAuthoring@1.0.0", input: { familyId: "cabinet-noir", familyVersion: "1.0.0", recipeId: "recipe", recipeVersion: "1.0.0", requestedActionCount: 1, layoutMode: "standalone", actions: [] } } as never;
    const config = { version: 3 as const, identity: { name: "Review" }, sections: [{ id: "cn", type: "surface" as const, enabled: true, order: 0, composition: { ...legacy(), signatureAssembly } }] } as unknown as TapConnectCardConfig;
    const first = prepareCompositionParentReviewDraft(config);
    expect(first.changed).toBe(true);
    expect(compositionChildren(reviewRoot(first.config), null).map((item) => item.id)).toEqual([
      "review-text",
      "review-standard-button",
      "review-divider",
      "review-container",
      "review-module-single-stack",
      "review-module-twin-rail",
    ]);
    assert.equal(compositionChildren(reviewRoot(first.config), null).at(-1)?.moduleComposition?.label, "Cabinet Noir Twin Rail");
    const second = prepareCompositionParentReviewDraft(first.config);
    expect(second.changed).toBe(false);
    expect(reviewRoot(second.config)).toEqual(reviewRoot(first.config));
  });

  it("replaces a root-level Curated proof with the exact clean review composition", () => {
    const signatureAssembly = { contractId: "signatureAssemblyAuthoring@1.0.0", input: { familyId: "cabinet-noir", familyVersion: "1.0.0", recipeId: "recipe", recipeVersion: "1.0.0", requestedActionCount: 1, layoutMode: "single-stack", actions: [] } } as never;
    const member = { ...node("cn-member", "button"), props: { ...node("cn-member").props, signatureAssemblyInstanceId: "root", signatureRecipeId: "recipe" } };
    const residue = { ...node("proof"), name: "Introduction", props: { text: "Build stronger customer connections." } };
    const root = { ...legacy([member, residue]), signatureAssembly, pageHeightPx: 412 };
    const first = prepareCompositionParentReviewDraft({ version: 3, identity: { name: "Review" }, sections: [], rootComposition: root } as unknown as TapConnectCardConfig);
    assert.equal(first.changed, true);
    assert.equal(reviewRoot(first.config).signatureAssembly, undefined);
    const children = compositionChildren(reviewRoot(first.config), null);
    assert.deepEqual(children.map((candidate) => candidate.id), [
      "review-text",
      "review-standard-button",
      "review-divider",
      "review-container",
      "review-module-single-stack",
      "review-module-twin-rail",
    ]);
    assert.equal(children.some((candidate) => candidate.id === "proof" || candidate.id === "cn-member"), false);
    const second = prepareCompositionParentReviewDraft(first.config);
    assert.equal(second.changed, false);
    assert.deepEqual(reviewRoot(second.config), reviewRoot(first.config));
  });

  it("removes only acceptance-created Curated identity media from the local review fixture", () => {
    const signatureAssembly = {
      contractId: "signatureAssemblyAuthoring@1.0.0",
      input: { familyId: "cabinet-noir", familyVersion: "1.0.0", recipeId: "recipe", recipeVersion: "1.0.0", requestedActionCount: 1, layoutMode: "single-stack", actions: [] },
      identityContent: { src: "/api/media/local?key=proof.png", alt: "Owner Private Demo ms8jfzoi identity" },
    } as never;
    const outer = { ...node("curated"), moduleComposition: { ...legacy(), signatureAssembly } };
    const root = establishCompositionParentAuthority({ ...legacy([outer]), nodes: [{ ...outer, compositionKind: "module", parentId: null, siblingOrder: 0 }] });
    const result = prepareCompositionParentReviewDraft({ version: 3, identity: { name: "Review" }, sections: [], rootComposition: root } as unknown as TapConnectCardConfig);
    assert.equal(result.changed, true);
    assert.equal(compositionChildren(reviewRoot(result.config), null)[0]?.moduleComposition?.signatureAssembly?.identityContent, undefined);
  });

  it("replaces an interrupted composition acceptance fixture with the exact review composition", () => {
    const container = { ...createFlowContainerNode("Smoked Glass Container"), id: "proof-container" };
    const proofText = { ...node("proof-text"), compositionKind: "module" as const, parentId: container.id, siblingOrder: 0, props: { text: "A longer accessible paragraph proves interrupted acceptance cleanup." } };
    const retained = { ...node("retained"), compositionKind: "module" as const, parentId: null, siblingOrder: 1 };
    const root = { ...establishCompositionParentAuthority(legacy()), nodes: [container, proofText, retained] };
    const result = prepareCompositionParentReviewDraft({ version: 3, identity: { name: "Review" }, sections: [], rootComposition: root } as unknown as TapConnectCardConfig);
    assert.equal(result.changed, true);
    assert.deepEqual(compositionChildren(reviewRoot(result.config), null).map((candidate) => candidate.id), [
      "review-text",
      "review-standard-button",
      "review-divider",
      "review-container",
      "review-module-single-stack",
      "review-module-twin-rail",
    ]);
  });

  it("replaces an interrupted Add Image action with the exact clean review composition", () => {
    const emptyProof = { ...node("empty-image", "image"), name: "Image", props: { src: "", alt: "Image", sourceMode: "LOCAL" } };
    const authored = { ...node("authored-image", "image"), name: "Image", props: { src: "/api/media/local?key=kept.png", alt: "Store interior" } };
    const root = establishCompositionParentAuthority(legacy([emptyProof, authored]));
    const result = prepareCompositionParentReviewDraft({ version: 3, identity: { name: "Review" }, sections: [], rootComposition: root } as unknown as TapConnectCardConfig);
    assert.equal(result.changed, true);
    assert.deepEqual(compositionChildren(reviewRoot(result.config), null).map((candidate) => candidate.id), [
      "review-text",
      "review-standard-button",
      "review-divider",
      "review-container",
      "review-module-single-stack",
      "review-module-twin-rail",
    ]);
  });
});
