import assert from "node:assert/strict";
import test from "node:test";
import { buttonContent, buttonContentNode, createButtonContentComposition, updateButtonLabel } from "../button-composition";

test("Button presets create real nested Text and Icon Elements", () => {
  const content = createButtonContentComposition({ buttonId: "button-1", label: "Call now", icon: "phone" });
  assert.equal(content.nodes.length, 2);
  assert.equal(content.nodes[0].primitive, "text");
  assert.equal(content.nodes[0].props.buttonContentRole, "label");
  assert.equal(content.nodes[1].props.buttonContentRole, "icon");
  assert.notEqual(content.nodes[0].id, content.nodes[1].id);
});

test("Button label uses the shared nested Text node while preserving legacy read compatibility", () => {
  const props = updateButtonLabel({ label: "Before", icon: "phone" }, "After", "button-1");
  assert.equal(props.label, "After");
  assert.equal(buttonContentNode(props, "label", "button-1")?.props.text, "After");
});

test("ephemeral Button content inherits parent labelColor instead of masking it", () => {
  const content = buttonContent({ label: "Get started", labelColor: "#ff00aa", icon: "none" }, "btn-1");
  assert.equal(content.nodes.find((n) => n.props.buttonContentRole === "label")?.props.color, "#ff00aa");
});

