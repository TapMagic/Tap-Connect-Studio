import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createCompositionNode,
  groupNodes,
} from "../composition";
import {
  activateGroupContentChild,
  enterGroupContentMode,
  exitGroupContentEditing,
  inferFanOutCapability,
  isGroupContentScope,
  isGroupParentSelection,
  mixedValueForCapability,
  scaleFontSizes,
  setAllFontSizes,
  triStateForCapability,
  fanOutProps,
} from "../group-authority";
import { resolveEditorContext, toolbarChromeForContext } from "../editor-context";
import { auditBadgeGeometryUniqueness, getBadgeShapeDef } from "../badge-shape";
import { MATERIAL_CATALOG, EFFECT_RECIPES, getMaterialRecipe } from "../material-engine";
import { STARTER_BUTTON_PRESETS, buttonPresetThumbnailStyle } from "../starter-preset-registry";

function threeTexts() {
  const a = createCompositionNode("text", {
    id: "t1",
    x: 0.1,
    y: 0.1,
    width: 0.3,
    height: 0.08,
    zIndex: 1,
    props: { text: "TODAY ONLY", fontSize: 14, fontFamily: "Inter", italic: false, underline: false, fontWeight: 400, color: "#fff" },
  });
  const b = createCompositionNode("text", {
    id: "t2",
    x: 0.1,
    y: 0.22,
    width: 0.5,
    height: 0.14,
    zIndex: 2,
    props: { text: "BIG", fontSize: 40, fontFamily: "Oswald", italic: true, underline: false, fontWeight: 800, color: "#b8ff2c" },
  });
  const c = createCompositionNode("text", {
    id: "t3",
    x: 0.1,
    y: 0.4,
    width: 0.45,
    height: 0.1,
    zIndex: 3,
    props: { text: "SAVINGS", fontSize: 28, fontFamily: "Oswald", italic: false, underline: true, fontWeight: 700, color: "#67e8f9" },
  });
  return groupNodes([a, b, c], ["t1", "t2", "t3"], "g1");
}

test("resolveEditorContext: GROUP_PARENT is exclusive toolbar chrome", () => {
  const nodes = threeTexts();
  const ctx = resolveEditorContext({ nodes, selectedIds: ["t1", "t2", "t3"] });
  assert.equal(ctx.selectionMode, "GROUP_PARENT");
  assert.equal(ctx.exclusiveGroupToolbar, true);
  assert.equal(toolbarChromeForContext(ctx), "group_parent");
  assert.equal(ctx.objectFamily, "group");
});

test("Edit contents enters GROUP_CONTENT with no auto-selected child", () => {
  const nodes = threeTexts();
  const next = enterGroupContentMode(nodes, "g1");
  assert.equal(isGroupContentScope(next, "g1"), true);
  assert.equal(isGroupParentSelection(next, ["t1", "t2", "t3"]), false);
  const ctx = resolveEditorContext({ nodes: next, selectedIds: ["t1", "t2", "t3"] });
  assert.equal(ctx.selectionMode, "GROUP_CONTENT");
  assert.equal(ctx.awaitingContentChild, true);
  assert.equal(ctx.childTarget, null);
  assert.equal(toolbarChromeForContext(ctx), "group_content_awaiting");
});

test("Owner-chosen Group child activates object chrome for that child only", () => {
  let nodes = enterGroupContentMode(threeTexts(), "g1");
  nodes = activateGroupContentChild(nodes, "g1", "t2");
  const ctx = resolveEditorContext({ nodes, selectedIds: ["t2"] });
  assert.equal(ctx.selectionMode, "GROUP_CONTENT");
  assert.equal(ctx.childTarget, "t2");
  assert.equal(ctx.awaitingContentChild, false);
  assert.equal(ctx.objectFamily, "text");
  assert.equal(toolbarChromeForContext(ctx), "object");
  const finished = exitGroupContentEditing(nodes, "g1");
  assert.equal(isGroupContentScope(finished, "g1"), false);
  assert.equal(isGroupParentSelection(finished, ["t1", "t2", "t3"]), true);
});

test("Group Mixed font size + scale preserves hierarchy + set-all normalizes", () => {
  const nodes = threeTexts();
  const mixed = mixedValueForCapability(nodes, ["t1", "t2", "t3"], "font_size");
  assert.equal(mixed.kind, "mixed");
  const scaled = scaleFontSizes(nodes, ["t1", "t2", "t3"], 1.1);
  assert.equal(scaled.nodes.find((n) => n.id === "t1")!.props.fontSize, 15.4);
  assert.equal(scaled.nodes.find((n) => n.id === "t2")!.props.fontSize, 44);
  assert.equal(scaled.nodes.find((n) => n.id === "t3")!.props.fontSize, 30.8);
  const setAll = setAllFontSizes(nodes, ["t1", "t2", "t3"], 25);
  assert.ok(setAll.nodes.every((n) => ["t1", "t2", "t3"].includes(n.id) ? n.props.fontSize === 25 : true));
});

test("Group Bold/Italic/Underline tri-state and fan-out", () => {
  const nodes = threeTexts();
  assert.equal(triStateForCapability(nodes, ["t1", "t2", "t3"], "italic"), "mixed");
  assert.equal(triStateForCapability(nodes, ["t1", "t2", "t3"], "underline"), "mixed");
  assert.equal(triStateForCapability(nodes, ["t1", "t2", "t3"], "font_weight"), "mixed");
  assert.equal(inferFanOutCapability({ italic: true }), "italic");
  assert.equal(inferFanOutCapability({ underline: true }), "underline");
  const italicOn = fanOutProps(nodes, ["t1", "t2", "t3"], "italic", { italic: true });
  assert.equal(triStateForCapability(italicOn.nodes, ["t1", "t2", "t3"], "italic"), "on");
  const underlineOn = fanOutProps(nodes, ["t1", "t2", "t3"], "underline", { underline: true });
  assert.equal(triStateForCapability(underlineOn.nodes, ["t1", "t2", "t3"], "underline"), "on");
});

test("Group solid color clears glyph gradient so color is visible", () => {
  const a = createCompositionNode("text", {
    id: "t1",
    x: 0.1,
    y: 0.1,
    width: 0.3,
    height: 0.1,
    zIndex: 1,
    props: { text: "A", color: "#fff", gradientFill: "linear-gradient(90deg,#f00,#0f0)", fontSize: 18 },
  });
  const b = createCompositionNode("text", {
    id: "t2",
    x: 0.4,
    y: 0.1,
    width: 0.3,
    height: 0.1,
    zIndex: 2,
    props: { text: "B", color: "#0ff", fontSize: 18 },
  });
  const nodes = groupNodes([a, b], ["t1", "t2"], "g1");
  const next = fanOutProps(nodes, ["t1", "t2"], "text_color", { color: "#112233" });
  const t1 = next.nodes.find((n) => n.id === "t1")!;
  assert.equal(t1.props.color, "#112233");
  assert.equal(t1.props.gradientFill, undefined);
});

test("Badge geometries are unique; Burst ≠ Starburst", () => {
  const audit = auditBadgeGeometryUniqueness();
  assert.equal(audit.ok, true, JSON.stringify(audit.duplicates));
  assert.notEqual(getBadgeShapeDef("burst").clipPath, getBadgeShapeDef("starburst").clipPath);
  assert.ok(getBadgeShapeDef("seal").clipPath);
});

test("Material catalog no longer duplicates Neon Edge as a Material", () => {
  assert.equal(getMaterialRecipe("neon_edge")?.id, "neon");
  assert.equal(MATERIAL_CATALOG.some((item) => item.id === "neon_edge"), false);
  assert.equal(MATERIAL_CATALOG.some((item) => item.id === "soft_glow"), false);
  assert.ok(EFFECT_RECIPES.some((item) => item.id === "neon_edge"));
  assert.ok(EFFECT_RECIPES.some((item) => item.id === "soft_glow"));
});

test("Button library is structure/function — not material species", () => {
  const labels = STARTER_BUTTON_PRESETS.map((item) => item.label.toLowerCase());
  for (const banned of ["glass", "metallic", "neon", "beveled", "embossed", "high gloss", "soft raised", "hard raised"]) {
    assert.equal(labels.includes(banned), false, `unexpected material species: ${banned}`);
  }
  assert.ok(STARTER_BUTTON_PRESETS.some((item) => item.id === "primary-cta"));
  assert.ok(STARTER_BUTTON_PRESETS.some((item) => item.id === "icon-label"));
  const neonish = STARTER_BUTTON_PRESETS.find((item) => item.id === "action-rsvp")!;
  const thumb = buttonPresetThumbnailStyle(neonish.props as Record<string, unknown>);
  assert.equal(thumb.background, String(neonish.props.fill));
  assert.ok(String(thumb.border).includes(String(neonish.props.borderColor)));
});
