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
});

