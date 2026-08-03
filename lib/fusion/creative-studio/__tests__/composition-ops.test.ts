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
  expandSelectionToGroups,
  frameMaskPath,
  groupNodes,
  resolveNodeBox,
  sendBackward,
  sendToBack,
  setNodeLocked,
  translateNodes,
  compositionAppliesMobileFallback,
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

  it("expands group selection and translates as a unit", () => {
    const nodes = [
      createCompositionNode("text", { id: "t1", x: 0.1, y: 0.1, width: 0.2, height: 0.1, zIndex: 1 }),
      createCompositionNode("text", { id: "t2", x: 0.4, y: 0.2, width: 0.2, height: 0.1, zIndex: 2 }),
    ];
    const grouped = groupNodes(nodes, ["t1", "t2"]);
    const expanded = expandSelectionToGroups(grouped, ["t1"]);
    assert.deepEqual(expanded.sort(), ["t1", "t2"]);
    const moved = translateNodes(grouped, expanded, 0.05, 0.05);
    assert.ok(Math.abs((moved.find((n) => n.id === "t1")!.x) - 0.15) < 1e-9);
    assert.ok(Math.abs((moved.find((n) => n.id === "t2")!.x) - 0.45) < 1e-9);
    const box = resolveNodeBox({
      ...createCompositionNode("text", { id: "a", x: 0.5, y: 0.5, width: 0.2, height: 0.1 }),
      anchor: "center",
    });
    assert.ok(Math.abs(box.left - 0.4) < 1e-9);
    assert.ok(Math.abs(box.top - 0.45) < 1e-9);
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

  it("preserves off-Card geometry so edit can expose it and preview can clip it", () => {
    const node = createCompositionNode("text", { id: "off-card", x: -0.25, y: 1.1, width: 0.3, height: 0.12 });
    const preview = resolveNodeBox(node);
    const edit = resolveNodeBox(node, true);
    assert.equal(preview.left, -0.25);
    assert.equal(preview.top, 1.1);
    assert.equal(edit.left, -0.25);
    assert.equal(edit.top, 1.1);
  });

  it("applies mobile fallback only when explicitly forced", () => {
    assert.equal(
      compositionAppliesMobileFallback({ editMode: true, forceMobileFallback: true }),
      false
    );
    assert.equal(
      compositionAppliesMobileFallback({ editMode: false, forceMobileFallback: false }),
      false
    );
    assert.equal(
      compositionAppliesMobileFallback({ editMode: false, forceMobileFallback: true }),
      true
    );
    const starter = createStarterCreativeComposition("c2");
    assert.equal(starter.mobileFallback, "scale");
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
