import assert from "node:assert/strict";
import test from "node:test";
import { createCardElement, createSectionPreset } from "@/lib/fusion/card/composer-model";
import { APPEARANCE_GROUPS, appearanceTargetForNode, resetNodeAppearance, resetSectionAppearance } from "../appearance";

test("Appearance exposes relevant target subsets without text effects on images", () => {
  assert.equal(appearanceTargetForNode(createCardElement("text")), "text");
  assert.equal(appearanceTargetForNode(createCardElement("image")), "image");
  assert.equal(appearanceTargetForNode(createCardElement("button")), "button");
  assert.equal(appearanceTargetForNode(createCardElement("badge")), "badge");
  assert.ok(APPEARANCE_GROUPS.text.includes("materials_effects"));
  assert.ok(!APPEARANCE_GROUPS.image.includes("materials_effects"));
  assert.ok(APPEARANCE_GROUPS.button.includes("states"));
});

test("Appearance reset clears stale effects but preserves behavior and content", () => {
  const button = createCardElement("button");
  button.props = { ...button.props, label: "Claim", actionType: "claim_offer", href: "https://example.test", materialPreset: "gold", boxGlow: 24, shine: true };
  const reset = resetNodeAppearance(button);
  assert.equal(reset.props.label, "Claim");
  assert.equal(reset.props.actionType, "claim_offer");
  assert.equal(reset.props.href, "https://example.test");
  assert.equal(reset.props.boxGlow, undefined);
  assert.equal(reset.props.shine, undefined);
});

test("Section reset restores its inserted preset snapshot", () => {
  const offer = createSectionPreset("offer", 0);
  const changed = { ...offer, surfaceRadiusPx: 2, surfaceGlow: "strong" as const, composition: { ...offer.composition!, nodes: [] } };
  const reset = resetSectionAppearance(changed);
  assert.equal(reset.surfaceRadiusPx, 24);
  assert.equal(reset.composition?.nodes.length, offer.insertedPreset?.nodes.length);
});
