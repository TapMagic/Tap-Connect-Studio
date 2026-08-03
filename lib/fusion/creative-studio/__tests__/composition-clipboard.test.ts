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
  it("pastes Button appearance without replacing action, identity, accessibility, or content", () => {
    const source = createCompositionNode("button", { id: "source", props: { label: "Source", actionType: "call", href: "+13525550100", accessibleLabel: "Call source", fill: "#22c55e", radius: 999, motionPreset: "subtle_pulse" } });
    const target = createCompositionNode("button", { id: "target", props: { label: "Claim", description: "Friday only", actionType: "website", href: "https://example.com/claim", accessibleLabel: "Claim Friday deal", trackingName: "claim-friday", fill: "#111827", radius: 4, motionPreset: "none" } });
    copyCompositionNodeStyle(source);
    const [styled] = pasteCompositionNodeStyle([target], target.id);
    assert.equal(styled.props.fill, "#22c55e");
    assert.equal(styled.props.radius, 999);
    assert.equal(styled.props.motionPreset, "subtle_pulse");
    assert.equal(styled.props.label, "Claim");
    assert.equal(styled.props.description, "Friday only");
    assert.equal(styled.props.actionType, "website");
    assert.equal(styled.props.href, "https://example.com/claim");
    assert.equal(styled.props.accessibleLabel, "Claim Friday deal");
    assert.equal(styled.props.trackingName, "claim-friday");
  });
});
