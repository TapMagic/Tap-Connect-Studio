import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  describeMoveAboveBelow,
  moveByDelta,
  moveToExtreme,
  reorderById,
  withOrder,
} from "@/lib/fusion/authoring/reorder-list";
import { describeSectionReorder } from "@/lib/fusion/creative-studio/history-labels";
import type { TapCardSection } from "@/lib/brand/tap-card";

function sec(id: string, label: string, order: number): TapCardSection {
  return { id, type: "text", enabled: true, order, label };
}

describe("reorder-list", () => {
  it("reorders by id", () => {
    const items = [
      { id: "a" },
      { id: "b" },
      { id: "c" },
    ];
    assert.deepEqual(
      reorderById(items, "c", "a")?.map((i) => i.id),
      ["c", "a", "b"]
    );
  });

  it("moves by delta and to extremes", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
    assert.deepEqual(moveByDelta(items, "a", 1)?.map((i) => i.id), ["b", "a", "c"]);
    assert.deepEqual(moveToExtreme(items, "c", "top")?.map((i) => i.id), [
      "c",
      "a",
      "b",
    ]);
    assert.deepEqual(moveToExtreme(items, "a", "bottom")?.map((i) => i.id), [
      "b",
      "c",
      "a",
    ]);
  });

  it("assigns order indices", () => {
    assert.deepEqual(
      withOrder([{ id: "x" }, { id: "y" }]).map((i) => i.order),
      [0, 1]
    );
  });

  it("describes move above/below", () => {
    assert.equal(
      describeMoveAboveBelow("Email", "Call", 2, 0),
      'Moved "Email" above "Call"'
    );
    assert.equal(
      describeMoveAboveBelow("Call", "Email", 0, 2),
      'Moved "Call" below "Email"'
    );
  });
});

describe("describeSectionReorder", () => {
  it("labels moving a section above another", () => {
    const prev = [
      sec("a", "Call The Monkey Cage", 0),
      sec("b", "Email The Monkey Cage", 1),
    ];
    const next = [
      sec("b", "Email The Monkey Cage", 0),
      sec("a", "Call The Monkey Cage", 1),
    ];
    assert.equal(
      describeSectionReorder(prev, next),
      'Moved "Email The Monkey Cage" above "Call The Monkey Cage"'
    );
  });
});
