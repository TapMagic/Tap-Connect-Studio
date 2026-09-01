import assert from "node:assert/strict";
import test from "node:test";
import type { CreativeCompositionBlock, CreativeCompositionNode } from "../composition";
import { createSelectionRef } from "../selection-ref";
import { resolveStudioSelectionTarget } from "../platform/studio-selection-target";

const moduleNode: CreativeCompositionNode = { id: "module-1", primitive: "frame", compositionKind: "module", parentId: null, siblingOrder: 0, x: 0, y: 0, width: 1, height: 1, zIndex: 1, name: "Cabinet Noir", props: {} };
const root: CreativeCompositionBlock = { id: "root", version: 1, label: "Card", nodes: [moduleNode], background: { kind: "none" }, mobileFallback: "scale", parentAuthority: { version: 1, layout: "flow", cardGapPx: 16 } };
const selection = createSelectionRef({ documentId: "card", pageId: "root", revision: 1, selectionGeneration: 1, objectKind: "element", objectId: moduleNode.id, parentId: null });

test("derives flow movement and hides z-order from one canonical SelectionRef", () => {
  const result = resolveStudioSelectionTarget({ selection, root, selectedNode: moduleNode });
  assert.equal(result.semanticKind, "flow-module");
  assert.ok(result.capabilities.includes("move-directly"));
  assert.ok(result.position.includes("flow-order"));
  assert.ok(!result.position.includes("z-order"));
});

test("classifies the outer Curated host as one recipe-owned object", () => {
  const curated = { ...moduleNode, moduleComposition: { ...root, id: "curated", parentAuthority: undefined, signatureAssembly: { familyId: "cabinet-noir" } as unknown as CreativeCompositionBlock["signatureAssembly"] } };
  const curatedRoot = { ...root, nodes: [curated] };
  const result = resolveStudioSelectionTarget({ selection, root: curatedRoot, selectedNode: curated });
  assert.equal(result.semanticKind, "curated-system");
  assert.equal(result.ownership, "curated-recipe");
  assert.ok(result.capabilities.includes("edit-content"));
});
