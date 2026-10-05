import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { CreativeCompositionBlock, CreativeCompositionNode } from "../composition";
import { fitCardToContent, resolveCardExtent, setExplicitCardMinimum } from "../platform/card-extent";
import { resolveFlowDropTarget } from "../platform/flow-drop-target";
import { positionCapabilities } from "../platform/position-capability";

const moduleNode = (id: string, parentId: string | null, siblingOrder: number): CreativeCompositionNode => ({
  id, primitive: "button", compositionKind: "module", parentId, siblingOrder,
  x: 0, y: 0, width: 1, height: .1, zIndex: siblingOrder + 1, props: { elementKind: "button" },
});

const block = (): CreativeCompositionBlock => ({
  version: 1, id: "root", label: "Card", mobileFallback: "scale",
  parentAuthority: { version: 1, layout: "flow", cardGapPx: 16 },
  explicitMinimumHeightPx: 520,
  nodes: [
    moduleNode("a", null, 0),
    { ...moduleNode("panel", null, 1), primitive: "frame", compositionKind: "container", props: { componentKind: "container" } },
    moduleNode("b", "panel", 0),
  ],
});

describe("Interaction and Composure shared authorities", () => {
  it("keeps authored minimum separate from derived content height", () => {
    assert.deepEqual(resolveCardExtent(block(), 880), { contractId: "studioCardExtent@1.0.0", contentRequiredHeightPx: 880, explicitMinimumHeightPx: 520, actualHeightPx: 880 });
    assert.equal(resolveCardExtent(block(), 320).actualHeightPx, 520);
    assert.equal(resolveCardExtent(setExplicitCardMinimum(block(), 700), 320).actualHeightPx, 700);
    assert.equal(fitCardToContent(block(), 610).explicitMinimumHeightPx, 610);
  });

  it("resolves shared flow targets, including governed nested Containers, without permitting cycles", () => {
    assert.deepEqual(resolveFlowDropTarget(block(), "a", "panel", 4), { ok: true, target: { contractId: "studioFlowDropTarget@1.0.0", parentId: "panel", index: 1 } });
    const nestedCandidate = { ...moduleNode("nested", null, 2), primitive: "frame" as const, compositionKind: "container" as const, props: { componentKind: "container" } };
    const withNestedCandidate = { ...block(), nodes: [...block().nodes, nestedCandidate] };
    assert.deepEqual(resolveFlowDropTarget(withNestedCandidate, "nested", "panel", 0), { ok: true, target: { contractId: "studioFlowDropTarget@1.0.0", parentId: "panel", index: 0 } });
    assert.deepEqual(resolveFlowDropTarget(block(), "panel", "panel", 0), { ok: false, reason: "A Container cannot be placed inside one of its descendants." });
  });

  it("separates flow Position from future freeform and z-order", () => {
    assert.deepEqual(positionCapabilities(block(), block().nodes[0]!), ["parent", "flow-order", "width", "alignment", "inset"]);
    const legacy = { ...block(), parentAuthority: undefined };
    assert.ok(positionCapabilities(legacy, legacy.nodes[0]!).includes("z-order"));
    assert.ok(!positionCapabilities(block(), block().nodes[0]!).includes("z-order"));
  });
});
