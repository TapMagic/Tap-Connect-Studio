import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FRAME_MASK_CATALOG,
  accessibleReadingOrder,
  alignNodes,
  bringForward,
  bringToFront,
  createCompositionNode,
  createStarterCreativeComposition,
  distributeNodes,
  frameMaskPath,
  groupNodes,
  sendBackward,
  sendToBack,
  setNodeLocked,
  ungroupNodes,
} from "@/lib/fusion/creative-studio/composition";

describe("creative composition operations", () => {
  it("includes shirt mask and starter layering", () => {
    assert.ok(FRAME_MASK_CATALOG.some((m) => m.id === "shirt"));
    assert.ok(FRAME_MASK_CATALOG.some((m) => m.id === "polygon"));
    assert.ok(FRAME_MASK_CATALOG.some((m) => m.id === "organic"));
    assert.ok(frameMaskPath("shirt").includes("M35"));
    const starter = createStarterCreativeComposition("c1");
    assert.equal(starter.nodes.length, 3);
    assert.ok(starter.nodes.some((n) => n.primitive === "text"));
    assert.ok(starter.nodes.some((n) => n.primitive === "frame"));
    assert.ok(starter.nodes.some((n) => n.primitive === "image"));
  });

  it("reorders layers with bring/send helpers", () => {
    const a = createCompositionNode("shape", { id: "a", zIndex: 1 });
    const b = createCompositionNode("text", { id: "b", zIndex: 2 });
    const c = createCompositionNode("image", { id: "c", zIndex: 3 });
    let nodes = [a, b, c];
    nodes = bringForward(nodes, "a");
    assert.equal(nodes.find((n) => n.id === "a")?.zIndex, 2);
    nodes = bringToFront(nodes, "a");
    assert.equal(nodes.find((n) => n.id === "a")?.zIndex, 3);
    nodes = sendBackward(nodes, "a");
    assert.equal(nodes.find((n) => n.id === "a")?.zIndex, 2);
    nodes = sendToBack(nodes, "a");
    assert.equal(nodes.find((n) => n.id === "a")?.zIndex, 1);
  });

  it("groups, locks, aligns, and distributes", () => {
    const nodes = [
      createCompositionNode("text", { id: "t1", x: 0.1, y: 0.1, width: 0.2, height: 0.1, zIndex: 1 }),
      createCompositionNode("text", { id: "t2", x: 0.5, y: 0.2, width: 0.2, height: 0.1, zIndex: 2 }),
      createCompositionNode("text", { id: "t3", x: 0.7, y: 0.4, width: 0.2, height: 0.1, zIndex: 3 }),
    ];
    const grouped = groupNodes(nodes, ["t1", "t2"]);
    const gid = grouped.find((n) => n.id === "t1")?.groupId;
    assert.ok(gid);
    assert.equal(grouped.find((n) => n.id === "t2")?.groupId, gid);
    const ungrouped = ungroupNodes(grouped, gid!);
    assert.equal(ungrouped.find((n) => n.id === "t1")?.groupId, null);
    const locked = setNodeLocked(nodes, ["t1"], true);
    assert.equal(locked.find((n) => n.id === "t1")?.locked, true);
    const aligned = alignNodes(nodes, ["t1", "t2", "t3"], "left");
    assert.equal(aligned.find((n) => n.id === "t2")?.x, 0.1);
    const dist = distributeNodes(nodes, ["t1", "t2", "t3"], "horizontal");
    assert.ok(dist.find((n) => n.id === "t2")!.x > dist.find((n) => n.id === "t1")!.x);
  });

  it("preserves accessible reading order independent of zIndex", () => {
    const nodes = [
      createCompositionNode("text", {
        id: "bottom",
        x: 0.1,
        y: 0.8,
        zIndex: 99,
        props: { text: "Bottom" },
      }),
      createCompositionNode("text", {
        id: "top",
        x: 0.1,
        y: 0.1,
        zIndex: 1,
        props: { text: "Top" },
      }),
    ];
    const order = accessibleReadingOrder(nodes).map((n) => n.id);
    assert.deepEqual(order, ["top", "bottom"]);
  });

  it("duplicates and deletes selected nodes", async () => {
    const { duplicateNodes, deleteNodes } = await import(
      "@/lib/fusion/creative-studio/composition"
    );
    const nodes = [
      createCompositionNode("text", { id: "t1", zIndex: 1 }),
      createCompositionNode("shape", { id: "s1", zIndex: 2 }),
    ];
    const dup = duplicateNodes(nodes, ["t1"]);
    assert.equal(dup.nodes.length, 3);
    assert.equal(dup.newIds.length, 1);
    assert.ok(dup.nodes.some((n) => n.id === dup.newIds[0]));
    const deleted = deleteNodes(dup.nodes, ["s1"]);
    assert.equal(deleted.length, 2);
    assert.equal(
      deleted.find((n) => n.id === "s1"),
      undefined
    );
  });
});
