import assert from "node:assert/strict";
import test from "node:test";
import type { CreativeCompositionBlock, CreativeCompositionNode } from "../composition";
import { applyStudioTextRole, evaluateStudioTextAccessibility, STUDIO_TEXT_AUTHORING_DECLARATIONS, STUDIO_TEXT_CAPABILITY_DECLARATIONS, STUDIO_TEXT_ROLES, textRoleCanonicalProps } from "../platform/text-authoring";

test("Text launches as a small excellent set of five meaningfully distinct roles", () => {
  assert.deepEqual(STUDIO_TEXT_ROLES.map((role) => role.id), ["heading", "subheading", "body", "label", "quote"]);
  assert.equal(new Set(STUDIO_TEXT_ROLES.map((role) => `${role.defaults.fontSize}:${role.defaults.fontWeight}:${role.defaults.lineHeight}:${role.defaults.letterSpacingEm}`)).size, 5);
  for (const role of STUDIO_TEXT_ROLES) {
    const props = textRoleCanonicalProps(role.id, { businessName: "Test", headingFontFamily: "Brand Display", bodyFontFamily: "Brand Body", textColor: "#ffffff" });
    assert.equal(props.textRole, role.id);
    assert.equal(props.colorSource, "brand");
    assert.equal(props.fontSource, "brand");
  }
});

test("role application preserves copy while resettable style values come from Brand", () => {
  const result = applyStudioTextRole({ text: "Keep me", color: "#ff0000" }, "heading", { businessName: "Test", headingFontFamily: "Brand Display", textColor: "#fefefe" });
  assert.equal(result.text, "Keep me");
  assert.equal(result.fontFamily, "Brand Display");
  assert.equal(result.color, "#fefefe");
  assert.equal(result.textStyleSource, "brand");
});

test("Text accessibility is honest about solid and layered surfaces", () => {
  const node: CreativeCompositionNode = { id: "text", primitive: "text", compositionKind: "module", parentId: null, siblingOrder: 0, x: 0, y: 0, width: 1, height: .1, zIndex: 1, props: { elementKind: "text", text: "Readable", color: "#ffffff", fontSize: 16, fontWeight: 400 } };
  const solid: CreativeCompositionBlock = { id: "root", version: 1, label: "Card", nodes: [node], background: { kind: "solid", value: "#000000" }, mobileFallback: "scale", parentAuthority: { version: 1, layout: "flow", cardGapPx: 12 } };
  assert.equal(evaluateStudioTextAccessibility(node, solid).contrast, "pass");
  assert.equal(evaluateStudioTextAccessibility(node, { ...solid, background: { kind: "gradient" } }).contrast, "unknown");
  assert.ok(STUDIO_TEXT_CAPABILITY_DECLARATIONS.deferred.includes("dynamic-data"));
  assert.ok(STUDIO_TEXT_AUTHORING_DECLARATIONS.filter((declaration) => declaration.classification === "editable-reachable").every((declaration) => declaration.stateAuthority && declaration.historyAuthority && declaration.parityAuthorities?.length === 4));
  assert.ok(STUDIO_TEXT_AUTHORING_DECLARATIONS.filter((declaration) => declaration.classification === "deliberately-deferred").every((declaration) => declaration.deferralReason));
});
