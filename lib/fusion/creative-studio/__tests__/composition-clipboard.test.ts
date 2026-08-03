import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { createCompositionNode } from "@/lib/fusion/creative-studio/composition";
import { copyCompositionNodes, copyCompositionNodeStyle, pasteCompositionNodes, pasteCompositionNodeStyle, resetCompositionClipboardForTests } from "@/lib/fusion/creative-studio/composition-clipboard";

describe("composition clipboard", () => {
  afterEach(resetCompositionClipboardForTests);
  it("pastes independent nodes with new canonical identities", () => {
    const source = createCompositionNode("text", { id: "source", props: { text: "Hello", fontSize: 24 } });
    copyCompositionNodes([source], [source.id]);
    const result = pasteCompositionNodes([source]);
    assert.equal(result.nodes.length, 2);
    assert.notEqual(result.newIds[0], source.id);
    assert.notEqual(result.nodes[1].props, source.props);
  });
  it("copies style without replacing content", () => {
    const source = createCompositionNode("text", { id: "source", props: { text: "Source", color: "#ff0000" } });
    const target = createCompositionNode("text", { id: "target", props: { text: "Target", color: "#ffffff" } });
    copyCompositionNodeStyle(source);
    const [styled] = pasteCompositionNodeStyle([target], target.id);
    assert.equal(styled.props.text, "Target");
    assert.equal(styled.props.color, "#ff0000");
  });
});
