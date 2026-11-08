import assert from "node:assert/strict";
import { test } from "node:test";
import type { CreativeCompositionBlock, CreativeCompositionNode } from "../composition";
import { applyLayeredResize, layeredCompositionParentSizePx, moveLayeredNode, resizeLayeredNodeDimension, resizeLayeredPlacement, setCardSurfaceCompositionMode, setContainerCompositionMode } from "../platform/layered-region";
import { normalizedGeometryToDisplay } from "../platform/geometry-units";
import { resolveStudioFrameSemantics } from "../platform/frame-semantics";

const item: CreativeCompositionNode = { id: "image", primitive: "image", compositionKind: "module", parentId: null, x: .2, y: .2, width: .3, height: .2, zIndex: 1, props: { fit: "cover" } };
const block: CreativeCompositionBlock = { version: 1, id: "resize", label: "Resize", mobileFallback: "scale", safeAreaPaddingPx: 12, compositionMode: { version: 1, mode: "layered", layeredHeightPx: 600 }, nodes: [item] };
const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < .00001, `${a} != ${b}`);

test("Flow-placed Layered Containers use Flow width and the renderer's default padding", () => {
  const container = { ...item, id: "container", primitive: "frame" as const, compositionKind: "container" as const, width: .1, props: { layout: "layered", widthPercent: 80, layeredHeightPx: 300 } };
  const flow = { ...block, compositionMode: { ...block.compositionMode!, mode: "flow" as const }, nodes: [container] };
  const size = layeredCompositionParentSizePx(flow, container.id);
  close(size.widthPx, 366 * .8 - 32);
  close(size.heightPx, 300);
  const layered = layeredCompositionParentSizePx({ ...flow, compositionMode: block.compositionMode }, container.id);
  close(layered.widthPx, 366 * .1 - 32);
  close(layered.heightPx, 600 * .2 - 32);
});

test("nested padding is subtracted once; decorative borders never reduce content geometry", () => {
  const outer = { ...item, id: "outer", primitive: "frame" as const, compositionKind: "container" as const, width: .8, height: .7, props: { layout: "layered", padding: 16, borderWidthPx: 8 } };
  const inner = { ...outer, id: "inner", parentId: "outer", width: .6, height: .5, props: { layout: "layered", padding: 8 } };
  const size = layeredCompositionParentSizePx({ ...block, nodes: [outer, inner] }, "inner");
  close(size.widthPx, (366 * .8 - 32) * .6 - 16);
  close(size.heightPx, (600 * .7 - 32) * .5 - 16);
});

test("exact aspect-constrained resizing scales both dimensions and respects locked/content-owned frames", () => {
  const governed = { ...block, nodes: [{ ...item, props: { fit: "contain" } }] };
  const resized = resizeLayeredNodeDimension(governed, item.id, "width", .45).nodes[0];
  close(resized.width, .45); close(resized.height, .3);
  const locked = { ...block, nodes: [{ ...item, locked: true }] };
  assert.equal(resizeLayeredNodeDimension(locked, item.id, "width", .5), locked);
  assert.equal(moveLayeredNode(locked, item.id, { x: .5 }), locked);
  const auto = { ...block, nodes: [{ ...item, primitive: "text" as const, props: { textHeightMode: "auto" } }] };
  assert.equal(resizeLayeredNodeDimension(auto, item.id, "height", .5), auto);
});

test("pointer resize preserves the opposite rotated corner in physical parent coordinates", () => {
  const parent = { widthPx: 261.4, heightPx: 388 };
  const node = { ...item, rotationDeg: 31 };
  const result = resizeLayeredPlacement(node, "se", { xPx: 25, yPx: 38 }, parent);
  const corner = (n: { x: number; y: number; width: number; height: number }) => {
    const a = 31 * Math.PI / 180, w = n.width * parent.widthPx, h = n.height * parent.heightPx;
    return [n.x * parent.widthPx + w / 2 - w / 2 * Math.cos(a) + h / 2 * Math.sin(a), n.y * parent.heightPx + h / 2 - w / 2 * Math.sin(a) - h / 2 * Math.cos(a)];
  };
  const before = corner(node), after = corner(result);
  close(before[0], after[0]); close(before[1], after[1]);
});

test("parent constraints stop a resize without shifting the anchored corner", () => {
  const bounded = applyLayeredResize(block, item.id, { x: .2, y: .2, width: .95, height: .2 }).nodes[0];
  close(bounded.x, .2); close(bounded.width, .8);
  const exact = resizeLayeredNodeDimension(block, item.id, "width", .95).nodes[0];
  close(exact.x, .2); close(exact.width, .8);
  const overflow = { ...block, compositionMode: { ...block.compositionMode!, bounds: "allow-overflow" as const } };
  close(resizeLayeredNodeDimension(overflow, item.id, "width", .95).nodes[0].width, .95);
});

test("fractional pixel display and transient measured diagnostics retain authored geometry", () => {
  const before = JSON.stringify(block);
  const parent = { widthPx: 53.2, heightPx: 120 };
  close(normalizedGeometryToDisplay(.2, "width", "px", parent), 10.64);
  const image = resolveStudioFrameSemantics(block, { ...item, width: .1, height: .1 }, parent);
  close(image.touch.width, image.placement.width);
  const button = resolveStudioFrameSemantics(block, { ...item, primitive: "button", width: .1, height: .1 }, parent);
  close(button.touch.width * parent.widthPx, 44); close(button.touch.height * parent.heightPx, 44);
  assert.equal(JSON.stringify(block), before);
});

test("returning from Flow preserves existing Layered placement even without a legacy initialization flag", () => {
  const authored = { ...block, nodes: [{ ...item, x: -.05, width: .09, rotationDeg: 30 }] };
  const restored = setCardSurfaceCompositionMode(setCardSurfaceCompositionMode(authored, "flow"), "layered");
  assert.deepEqual(restored.nodes, authored.nodes);
  const container = { ...item, id: "container", primitive: "frame" as const, compositionKind: "container" as const, props: { layout: "layered" } };
  const nested = { ...authored, nodes: [container, { ...authored.nodes[0], parentId: "container" }] };
  const nestedRestored = setContainerCompositionMode(setContainerCompositionMode(nested, "container", "flow"), "container", "layered");
  assert.deepEqual(nestedRestored.nodes[1], nested.nodes[1]);
});
