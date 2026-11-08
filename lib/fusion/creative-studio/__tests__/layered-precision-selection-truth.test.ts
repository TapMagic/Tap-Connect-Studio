import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { CreativeCompositionBlock, CreativeCompositionNode } from "../composition";
import { rotateGroupComposition } from "../group-authority";
import { resolveStudioFrameSemantics } from "../platform/frame-semantics";
import { displayGeometryToNormalized, geometryParentSize, normalizedGeometryToDisplay } from "../platform/geometry-units";
import { positionCapabilities } from "../platform/position-capability";
import { applySelectionGeometryOperation, selectionGeometryCompatibility, selectionOperationAvailability, selectionOperationHistoryLabel } from "../platform/selection-geometry";

function node(id: string, parentId: string | null, x: number, y: number, props: Record<string, unknown> = {}): CreativeCompositionNode {
  return { id, primitive: "button", compositionKind: "module", parentId, siblingOrder: 0, x, y, width: .2, height: .1, zIndex: 1, props: { elementKind: "button", placementFrameHeightMode: "custom", ...props } };
}

function fixture(): CreativeCompositionBlock {
  return {
    version: 1,
    id: "fixture",
    label: "Layered fixture",
    mobileFallback: "scale",
    safeAreaPaddingPx: 12,
    parentAuthority: { version: 1, layout: "flow", cardGapPx: 12 },
    compositionMode: { version: 1, mode: "layered", layeredHeightPx: 600, layeredPlacementInitialized: true, bounds: "constrain" },
    nodes: [
      node("a", null, .1, .1, { effectPreset: "glow" }),
      node("b", null, .45, .25),
      node("c", null, .7, .55),
      { ...node("container", null, .1, .7), primitive: "frame", compositionKind: "container", height: .2, props: { componentKind: "container", layout: "layered", layeredHeightPx: 240, padding: 10 } },
      node("nested-a", "container", .12, .15),
      node("nested-b", "container", .6, .5),
    ],
  };
}

describe("Layered precision and selection truth", () => {
  it("declares exact Layered position, rotation, layer, bounds, and visibility capabilities", () => {
    const block = fixture();
    const capabilities = positionCapabilities(block, block.nodes[0]!);
    for (const capability of ["x", "y", "width", "height", "rotation", "z-order", "lock", "visibility", "bounds", "overflow"] as const) {
      assert.ok(capabilities.includes(capability), capability);
    }
    assert.equal(capabilities.includes("anchor"), false, "inactive Layered anchor metadata is not an editable capability");
  });

  it("derives px from the active parent and round-trips without a second stored truth", () => {
    const block = fixture();
    const root = block.nodes[0]!;
    const nested = block.nodes.find((candidate) => candidate.id === "nested-a")!;
    const before = structuredClone(block);
    for (const selected of [root, nested]) {
      const parent = geometryParentSize(block, selected);
      for (const axis of ["x", "y", "width", "height"] as const) {
        const px = normalizedGeometryToDisplay(selected[axis], axis, "px", parent);
        const normalized = displayGeometryToNormalized(px, axis, "px", parent);
        assert.ok(Math.abs(normalized - selected[axis]) <= .0005, `${selected.id}:${axis}`);
      }
    }
    assert.deepEqual(block, before, "display-unit reads never mutate canonical geometry");
  });

  it("limits operations to compatible siblings and keeps root and nested scopes independent", () => {
    const block = fixture();
    assert.equal(selectionGeometryCompatibility(block, ["a", "nested-a"]).compatible, false);
    assert.equal(applySelectionGeometryOperation(block, ["a", "nested-a"], { kind: "align", mode: "left" }), block);

    const aligned = applySelectionGeometryOperation(block, ["nested-a", "nested-b"], { kind: "align", mode: "left" });
    assert.equal(aligned.nodes.find((candidate) => candidate.id === "nested-b")!.x, .12);
    assert.equal(aligned.nodes.find((candidate) => candidate.id === "a")!.x, .1, "root sibling remains unchanged");
    assert.equal(aligned.nodes.find((candidate) => candidate.id === "nested-b")!.parentId, "container");
    assert.equal(selectionOperationHistoryLabel({ kind: "align", mode: "left" }), "Aligned selection left");
  });

  it("does not offer Layered arrange operations inside a Flow parent", () => {
    const block = fixture();
    block.compositionMode = { version: 1, mode: "flow" };
    const compatibility = selectionGeometryCompatibility(block, ["a", "b"]);
    assert.equal(compatibility.compatible, false);
    assert.equal(compatibility.reason, "Arrange tools require a Layered Card Surface or Container.");
  });

  it("aligns and distributes placement frames without visual overflow influencing the math", () => {
    const block = fixture();
    const aligned = applySelectionGeometryOperation(block, ["a", "b", "c"], { kind: "align", mode: "left" });
    assert.deepEqual(aligned.nodes.filter((candidate) => ["a", "b", "c"].includes(candidate.id)).map((candidate) => candidate.x), [.1, .1, .1]);
    const distributed = applySelectionGeometryOperation(block, ["a", "b", "c"], { kind: "distribute", axis: "vertical" });
    const selected = ["a", "b", "c"].map((id) => distributed.nodes.find((candidate) => candidate.id === id)!);
    const firstGap = selected[1]!.y - (selected[0]!.y + selected[0]!.height);
    const secondGap = selected[2]!.y - (selected[1]!.y + selected[1]!.height);
    assert.ok(Math.abs(firstGap - secondGap) < 1e-9);
  });

  it("exposes every canonical toolbar operation and emits one stable history label per command", () => {
    const block = fixture();
    const ids = ["a", "b", "c"];
    const operations = [
      ...(["left", "center", "right", "top", "middle", "bottom"] as const).flatMap((mode) => [
        { kind: "align", mode } as const,
        { kind: "align-parent", mode } as const,
      ]),
      { kind: "distribute", axis: "horizontal" } as const,
      { kind: "distribute", axis: "vertical" } as const,
      { kind: "match", mode: "width" } as const,
      { kind: "match", mode: "height" } as const,
      { kind: "match", mode: "both" } as const,
      { kind: "tidy" } as const,
    ];
    for (const operation of operations) {
      assert.equal(selectionOperationAvailability(block, ids, operation).enabled, true, JSON.stringify(operation));
      assert.notEqual(applySelectionGeometryOperation(block, ids, operation), block, JSON.stringify(operation));
      assert.ok(selectionOperationHistoryLabel(operation).length > 6);
    }
  });

  it("supports mixed compatible siblings without changing semantic identity or parent scope", () => {
    const block = fixture();
    block.nodes[0] = { ...block.nodes[0]!, primitive: "text", props: { elementKind: "text", text: "Precision" } };
    block.nodes[1] = { ...block.nodes[1]!, primitive: "button", props: { elementKind: "button", text: "Act", actionType: "url", url: "https://example.com" } };
    block.nodes[2] = { ...block.nodes[2]!, primitive: "frame", props: { elementKind: "compact-action-grid", items: [{ id: "item-1", label: "One" }] } };
    const before = block.nodes.slice(0, 3).map(({ id, primitive, parentId, props }) => ({ id, primitive, parentId, props: structuredClone(props) }));
    const next = applySelectionGeometryOperation(block, ["a", "b", "c"], { kind: "align", mode: "middle" });
    assert.deepEqual(next.nodes.slice(0, 3).map(({ id, primitive, parentId, props }) => ({ id, primitive, parentId, props })), before);
  });

  it("reports governed resize incompatibility instead of distorting mastered or intrinsic content", () => {
    const block = fixture();
    block.nodes[1] = { ...block.nodes[1]!, height: .2, primitive: "image", props: { elementKind: "image", fit: "contain" } };
    const availability = selectionOperationAvailability(block, ["a", "b"], { kind: "match", mode: "both" });
    assert.equal(availability.enabled, false);
    assert.match(availability.reason || "", /governed aspect ratio/);
  });

  it("projects distinct placement, visual, and touch frames without persisting either derivative", () => {
    const block = fixture();
    const selected = block.nodes[0]!;
    const before = structuredClone(selected);
    const frames = resolveStudioFrameSemantics(block, selected);
    assert.deepEqual(frames.placement, { left: .1, top: .1, width: .2, height: .1 });
    assert.ok(frames.visual.width > frames.placement.width);
    assert.ok(frames.touch.height >= frames.placement.height);
    assert.equal(frames.actionBearing, true);
    assert.deepEqual(selected, before);
    assert.doesNotMatch(JSON.stringify(block), /visualFrame|touchFrame|geometryUnit|frameDiagnostics/);
  });

  it("rotates a Group without changing member identity, actions, content, or parent membership", () => {
    const block = fixture();
    block.nodes[0] = { ...block.nodes[0]!, groupId: "group-1", props: { ...block.nodes[0]!.props, text: "First", actionType: "url", url: "https://example.com/a" } };
    block.nodes[1] = { ...block.nodes[1]!, groupId: "group-1", props: { ...block.nodes[1]!.props, text: "Second", actionType: "url", url: "https://example.com/b" } };
    const rotated = rotateGroupComposition(block.nodes, "group-1", 45);
    for (const id of ["a", "b"]) {
      const before = block.nodes.find((candidate) => candidate.id === id)!;
      const after = rotated.find((candidate) => candidate.id === id)!;
      assert.equal(after.id, before.id);
      assert.equal(after.parentId, before.parentId);
      assert.deepEqual(after.props, before.props);
    }
  });

  it("keeps the complete authority reachable in the canonical desktop and phone Studio shell", () => {
    const workspace = readFileSync("components/fusion/card/reconstitution/card-studio-reconstitution-workspace.tsx", "utf8");
    const inspector = readFileSync("components/fusion/card/reconstitution/studio-composition-inspector.tsx", "utf8");
    const canvas = readFileSync("components/fusion/creative-studio/creative-composition-canvas.tsx", "utf8");
    for (const token of [
      "studio-select-multiple",
      "studio-select-multiple-mobile",
      "studio-composition-multi-toolbar",
      "studio-multi-align-${mode}",
      "studio-multi-align-parent-${mode}",
      "studio-multi-distribute-${axis}",
      "studio-multi-match-${mode}",
      "studio-multi-tidy",
      "studio-composition-group-selected",
    ]) assert.ok(workspace.includes(token), token);
    for (const token of ["studio-layered-${key}", "studio-layered-rotation", "studio-group-rotation", "studio-frame-diagnostics-control"]) {
      assert.ok(inspector.includes(token), token);
    }
    assert.match(canvas, /studio-layer-rotate-/);
    // Group rotation is exercised by the native acceptance journey; its ID is
    // assembled by the shared handle component, not a literal in this file.
    assert.match(canvas, /pointerEvent\.shiftKey \? Math\.round\(angle \/ 15\) \* 15/);
    assert.match(canvas, /data-frame="placement"/);
    assert.match(canvas, /data-frame="visual"/);
    assert.match(canvas, /data-frame="touch"/);
  });
});
