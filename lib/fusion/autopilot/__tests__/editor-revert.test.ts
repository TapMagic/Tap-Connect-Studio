import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ContentBlock } from "@/lib/types/campaign";
import {
  captureEditorSnapshot,
  revertEditorToSnapshot,
  shouldRevertEditorOnUndo,
} from "../editor-revert";

const blocks: ContentBlock[] = [
  {
    id: "b1",
    type: "headline",
    order: 0,
    enabled: true,
    label: "Headline",
    data: { headline: "Before" },
  },
];

describe("Autopilot editor revert helpers", () => {
  it("captures deep clone before apply", () => {
    const snap = captureEditorSnapshot({
      title: "Old title",
      blocks,
      theme: { primaryColor: "#111", secondaryColor: "#222", backgroundColor: "#000", textColor: "#fff" },
    });
    blocks[0]!.data = { headline: "Mutated" };
    assert.equal(snap.blocks[0]!.data.headline, "Before");
    assert.equal(snap.title, "Old title");
  });

  it("reverts to captured snapshot", () => {
    const freshBlocks: ContentBlock[] = [
      {
        id: "b1",
        type: "headline",
        order: 0,
        enabled: true,
        label: "Headline",
        data: { headline: "Before" },
      },
    ];
    const snap = captureEditorSnapshot({ title: "Restore me", blocks: freshBlocks });
    freshBlocks[0]!.data = { headline: "Mutated" };
    const restored = revertEditorToSnapshot(snap);
    assert.equal(restored.title, "Restore me");
    assert.equal(restored.blocks[0]!.data.headline, "Before");
  });

  it("should revert on undo only after apply from accepted/partial", () => {
    assert.equal(
      shouldRevertEditorOnUndo({ previousStatus: "accepted", editorWasApplied: true }),
      true
    );
    assert.equal(
      shouldRevertEditorOnUndo({ previousStatus: "partial", editorWasApplied: true }),
      true
    );
    assert.equal(
      shouldRevertEditorOnUndo({ previousStatus: "rejected", editorWasApplied: false }),
      false
    );
    assert.equal(
      shouldRevertEditorOnUndo({ previousStatus: "accepted", editorWasApplied: false }),
      false
    );
  });
});
