import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createCompositionNode } from "@/lib/fusion/creative-studio/composition";
import { snapCompositionNodes } from "@/lib/fusion/creative-studio/composition-snap";

describe("composition precision snapping", () => {
  it("snaps moving edges to nearby sibling edges", () => {
    const fixed = createCompositionNode("shape", {
      id: "fixed",
      x: 0.5,
      y: 0.2,
      width: 0.2,
      height: 0.2,
    });
    const moving = createCompositionNode("text", {
      id: "moving",
      x: 0.291,
      y: 0.6,
      width: 0.2,
      height: 0.1,
    });
    const result = snapCompositionNodes({
      nodes: [fixed, moving],
      movingIds: ["moving"],
      threshold: 0.012,
    });
    assert.equal(result.nodes.find((node) => node.id === "moving")?.x, 0.3);
    assert.ok(result.guides.some((guide) => guide.axis === "x"));
  });

  it("snaps a group as one unit and emits grid guides", () => {
    const one = createCompositionNode("text", {
      id: "one",
      x: 0.101,
      y: 0.101,
      width: 0.1,
      height: 0.1,
    });
    const two = createCompositionNode("image", {
      id: "two",
      x: 0.301,
      y: 0.201,
      width: 0.1,
      height: 0.1,
    });
    const result = snapCompositionNodes({
      nodes: [one, two],
      movingIds: ["one", "two"],
      threshold: 0.01,
      grid: 0.05,
    });
    assert.equal(result.nodes[0].x, 0.1);
    assert.equal(result.nodes[1].x, 0.3);
    assert.ok(result.guides.some((guide) => guide.kind === "grid"));
  });

  it("does not jump when all targets are outside threshold", () => {
    const moving = createCompositionNode("text", {
      id: "moving",
      x: 0.113,
      y: 0.187,
      width: 0.1,
      height: 0.1,
    });
    const result = snapCompositionNodes({
      nodes: [moving],
      movingIds: ["moving"],
      threshold: 0.001,
      grid: 0.05,
    });
    assert.equal(result.nodes[0].x, moving.x);
    assert.equal(result.nodes[0].y, moving.y);
  });

  it("emits Section center, safe-margin, and equal-spacing guides", () => {
    const centered = createCompositionNode("text", { id: "centered", x: 0.399, y: 0.4, width: 0.2, height: 0.1 });
    const centerResult = snapCompositionNodes({ nodes: [centered], movingIds: ["centered"], threshold: 0.003 });
    assert.equal(centerResult.nodes[0].x, 0.4);
    assert.ok(centerResult.guides.some((guide) => guide.kind === "center"));

    const safe = createCompositionNode("text", { id: "safe", x: 0.031, y: 0.031, width: 0.1, height: 0.1 });
    const safeResult = snapCompositionNodes({ nodes: [safe], movingIds: ["safe"], threshold: 0.003 });
    assert.equal(safeResult.nodes[0].x, 0.03);
    assert.ok(safeResult.guides.some((guide) => guide.kind === "safe-margin"));

    const left = createCompositionNode("shape", { id: "left", x: 0.05, y: 0.2, width: 0.1, height: 0.1 });
    const middle = createCompositionNode("shape", { id: "middle", x: 0.25, y: 0.2, width: 0.1, height: 0.1 });
    const moving = createCompositionNode("shape", { id: "moving-spacing", x: 0.449, y: 0.2, width: 0.1, height: 0.1 });
    const spacingResult = snapCompositionNodes({ nodes: [left, middle, moving], movingIds: ["moving-spacing"], threshold: 0.003 });
    assert.ok(Math.abs(spacingResult.nodes[2].x - 0.45) < 1e-9);
    assert.ok(spacingResult.guides.some((guide) => guide.kind === "equal-spacing"));
  });
});
