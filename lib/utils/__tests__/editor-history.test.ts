import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canRedoEditorHistory,
  canUndoEditorHistory,
  createEditorHistory,
  pushEditorHistory,
  redoEditorHistory,
  undoEditorHistory,
} from "../editor-history";

describe("editor-history", () => {
  it("pushes, undoes, and redoes block snapshots", () => {
    let h = createEditorHistory([{ id: "a", order: 0 }]);
    h = pushEditorHistory(h, [{ id: "a", order: 0 }, { id: "b", order: 1 }]);
    h = pushEditorHistory(h, [{ id: "b", order: 0 }]);

    assert.equal(h.present.length, 1);
    assert.equal(h.present[0].id, "b");
    assert.ok(canUndoEditorHistory(h));

    const undone = undoEditorHistory(h);
    assert.ok(undone);
    assert.equal(undone!.present.length, 2);
    assert.ok(canRedoEditorHistory(undone!));

    const redone = redoEditorHistory(undone!);
    assert.ok(redone);
    assert.equal(redone!.present[0].id, "b");
  });

  it("skips duplicate snapshots", () => {
    const initial = [{ id: "x" }];
    let h = createEditorHistory(initial);
    const again = pushEditorHistory(h, [{ id: "x" }]);
    assert.equal(again.past.length, 0);
    assert.equal(again, h);
  });
});
