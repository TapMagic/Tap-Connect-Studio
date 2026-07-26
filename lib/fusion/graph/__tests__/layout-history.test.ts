import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AuthoringHistory } from "../history";
import { autoLayoutGraph, edgePath, snapPoint } from "../layout";

describe("graph layout + history", () => {
  it("snaps to grid", () => {
    const p = snapPoint({ x: 23, y: 41 }, 16);
    assert.equal(p.x, 16);
    assert.equal(p.y, 48);
  });

  it("auto-layouts layered graph deterministically", () => {
    const nodes = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const edges = [
      { id: "e1", from: "a", to: "b" },
      { id: "e2", from: "b", to: "c" },
    ];
    const a = autoLayoutGraph(nodes, edges, { entryId: "a" });
    const b = autoLayoutGraph(nodes, edges, { entryId: "a" });
    assert.deepEqual(a, b);
    assert.ok(a.a!.x < a.b!.x);
    assert.ok(a.b!.x < a.c!.x);
  });

  it("builds svg edge paths", () => {
    const d = edgePath({ x: 0, y: 0 }, { x: 200, y: 40 });
    assert.ok(d.startsWith("M "));
    assert.ok(d.includes("C "));
  });

  it("undo/redo history", () => {
    const h = new AuthoringHistory({ n: 1 });
    h.push({ n: 2 }, "inc");
    h.push({ n: 3 }, "inc");
    assert.equal(h.value.n, 3);
    assert.equal(h.undo().n, 2);
    assert.equal(h.redo().n, 3);
    assert.equal(h.canUndo, true);
  });

  it("completed drag commits one history entry (not each live move)", () => {
    type Graph = { nodes: Record<string, { x: number; y: number }> };
    const initial: Graph = { nodes: { a: { x: 0, y: 0 }, b: { x: 100, y: 0 } } };
    const history = new AuthoringHistory(initial);
    let live = history.value;

    // Simulate pointermove flood — live only, no push
    for (let i = 1; i <= 12; i++) {
      live = {
        nodes: {
          ...live.nodes,
          a: { x: i * 8, y: 0 },
        },
      };
    }
    assert.equal(history.canUndo, false);
    assert.equal(history.value.nodes.a.x, 0);

    // Pointer up — one meaningful entry
    history.push(live, "Move nodes");
    assert.equal(history.value.nodes.a.x, 96);
    assert.equal(history.canUndo, true);

    const undone = history.undo();
    assert.equal(undone.nodes.a.x, 0);
    const redone = history.redo();
    assert.equal(redone.nodes.a.x, 96);

    // Second completed drag → still one new entry (not 12)
    const afterSecond: Graph = {
      nodes: { ...redone.nodes, a: { x: 200, y: 40 } },
    };
    history.push(afterSecond, "Move nodes");
    assert.equal(history.undo().nodes.a.x, 96);
    assert.equal(history.undo().nodes.a.x, 0);
  });
});
