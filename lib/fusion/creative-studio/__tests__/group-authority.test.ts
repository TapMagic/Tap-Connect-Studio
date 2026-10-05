import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createCompositionNode,
  groupNodes,
  parseCreativeComposition,
  type CreativeCompositionNode,
} from "../composition";
import {
  appearanceAdapterTargetForFamily,
  computeGroupUnionBounds,
  compatibleDescendants,
  enterGroupContentEditing,
  exitGroupContentEditing,
  fanOutProps,
  fanOutWithAdapter,
  inferFanOutCapability,
  isGroupParentSelection,
  mixedValueForCapability,
  moveGroupComposition,
  readCompositionGroupSettings,
  resizeGroupComposition,
  resolveActiveGroupId,
  rotateGroupComposition,
  setCompositionGroupSettings,
  compositionGroupRecord,
  groupCompositionBlock,
  reorderCompositionGroupZ,
  setCompositionGroupScaleMode,
  ungroupCompositionBlock,
} from "../group-authority";
import { applyEffectRecipe } from "../material-engine";
import { effectIdentitySignature } from "../effect-render";
import { appearanceCategoriesForFamily } from "../appearance-ia";
import { buildCouponContentComposition, couponThumbnailSignature } from "../coupon-composition";
import { parseMagicWriteResponse } from "../magic-write";

function twoTexts() {
  const a = createCompositionNode("text", {
    id: "t1",
    x: 0.1,
    y: 0.1,
    width: 0.3,
    height: 0.1,
    zIndex: 1,
    props: { text: "A", color: "#ff0000", fontFamily: "Inter", fontSize: 18 },
  });
  const b = createCompositionNode("text", {
    id: "t2",
    x: 0.5,
    y: 0.2,
    width: 0.3,
    height: 0.1,
    zIndex: 2,
    props: { text: "B", color: "#0000ff", fontFamily: "Georgia", fontSize: 22 },
  });
  const nodes = groupNodes([a, b], ["t1", "t2"], "g1");
  return nodes;
}

test("group parent selection resolves shared groupId and union bounds", () => {
  const nodes = twoTexts();
  assert.equal(resolveActiveGroupId(nodes, ["t1"]), "g1");
  assert.equal(isGroupParentSelection(nodes, ["t1", "t2"]), true);
  const bounds = computeGroupUnionBounds(nodes, "g1");
  assert.ok(bounds);
  assert.ok(bounds!.width > 0.3);
  assert.ok(bounds!.height > 0.1);
  assert.deepEqual(bounds!.memberIds.sort(), ["t1", "t2"]);
});

test("group move keeps relative placement", () => {
  const nodes = twoTexts();
  const before = nodes.map((n) => ({ id: n.id, x: n.x, y: n.y }));
  const moved = moveGroupComposition(nodes, "g1", 0.05, 0.05);
  const deltaX = moved.find((n) => n.id === "t1")!.x - before[0].x;
  const deltaY = moved.find((n) => n.id === "t1")!.y - before[0].y;
  assert.ok(Math.abs(deltaX - 0.05) < 1e-9);
  assert.ok(Math.abs(deltaY - 0.05) < 1e-9);
  assert.ok(
    Math.abs(moved.find((n) => n.id === "t2")!.x - before[1].x - deltaX) < 1e-9
  );
});

test("group resize and rotate transform both members", () => {
  const nodes = twoTexts();
  const bounds = computeGroupUnionBounds(nodes, "g1")!;
  const resized = resizeGroupComposition(nodes, "g1", {
    left: bounds.left,
    top: bounds.top,
    width: bounds.width * 1.2,
    height: bounds.height * 1.2,
  });
  assert.ok(resized.find((n) => n.id === "t1")!.width > nodes[0].width);
  assert.ok(resized.find((n) => n.id === "t2")!.width > nodes[1].width);
  const rotated = rotateGroupComposition(nodes, "g1", 25);
  assert.notEqual(rotated.find((n) => n.id === "t1")!.rotationDeg || 0, 0);
  assert.notEqual(rotated.find((n) => n.id === "t2")!.rotationDeg || 0, 0);
});

test("canonical sibling Modules form one persisted Group without creating a second parent hierarchy", () => {
  const nodes = twoTexts().map((node, index) => ({
    ...node,
    groupId: null,
    compositionKind: "module" as const,
    parentId: "container-1",
    siblingOrder: index,
  }));
  const grouped = groupNodes(nodes, ["t1", "t2"], "canonical-group");
  assert.ok(grouped.every((node) => node.groupId === "canonical-group"));
  assert.ok(grouped.every((node) => node.parentId === "container-1"));
  assert.equal(resolveActiveGroupId(grouped, ["t1"]), "canonical-group");
  const rejected = groupNodes([{ ...nodes[0], parentId: null }, nodes[1]], ["t1", "t2"], "invalid-cross-parent");
  assert.ok(rejected.every((node) => node.groupId == null));
});

test("canonical Group record persists responsive transform, scale mode, and local z-order", () => {
  const nodes = twoTexts().map((node, index) => ({ ...node, groupId: null, compositionKind: "module" as const, parentId: null, siblingOrder: index }));
  const peer = { ...nodes[0], id: "peer", groupId: null, x: .02, y: .6, zIndex: 8, siblingOrder: 2 };
  const block = { version: 1 as const, id: "root", label: "Root", nodes: [...nodes, peer], parentAuthority: { version: 1 as const, layout: "flow" as const, cardGapPx: 12 }, background: { kind: "none" as const }, mobileFallback: "scale" as const };
  const grouped = groupCompositionBlock(block, ["t1", "t2"], "persisted-group");
  const record = compositionGroupRecord(grouped, "persisted-group");
  assert.ok(record);
  assert.equal(grouped.groups?.length, 1);
  assert.equal(record?.parentId, null);
  const compact = setCompositionGroupScaleMode(grouped, "persisted-group", "compact", { minChildWidth: 28 / 390, minChildHeight: 44 / 620 });
  assert.equal(compositionGroupRecord(compact, "persisted-group")?.scaleMode, "compact");
  assert.ok((compositionGroupRecord(compact, "persisted-group")?.width ?? 1) <= .79);
  assert.ok((compositionGroupRecord(compact, "persisted-group")?.width ?? 0) >= .77);
  assert.deepEqual(parseCreativeComposition(JSON.parse(JSON.stringify(compact)))?.groups, compact.groups);
  const front = reorderCompositionGroupZ(compact, "persisted-group", "front");
  assert.ok((compositionGroupRecord(front, "persisted-group")?.zIndex ?? 0) > (front.nodes.find((node) => node.id === "peer")?.zIndex ?? 0));
  const ungrouped = ungroupCompositionBlock(front, "persisted-group");
  assert.equal(ungrouped.groups?.length, 0);
  assert.ok(ungrouped.nodes.filter((node) => node.id !== "peer").every((node) => node.groupId == null));
});

test("Group density and layout reflow are canonical member state and keep readable Text height", () => {
  const nodes = twoTexts();
  const originalHeights = new Map(nodes.map((node) => [node.id, node.height]));
  const dense = setCompositionGroupSettings(nodes, "g1", { layout: "flow_vertical", density: "dense" }, { widthPx: 390, heightPx: 620 });
  const settings = readCompositionGroupSettings(dense, "g1");
  assert.deepEqual(settings, { layout: "flow_vertical", density: "dense", rowGapPx: 4, columnGapPx: 6, internalGapPx: 2 });
  assert.ok(dense.every((node) => node.props.compositionGroupLayout === "flow_vertical"));
  assert.ok(dense.find((node) => node.id === "t2")!.y > dense.find((node) => node.id === "t1")!.y);
  const bounds = computeGroupUnionBounds(dense, "g1")!;
  const resized = resizeGroupComposition(dense, "g1", { ...bounds, width: bounds.width * .75, height: bounds.height * .5 });
  assert.equal(resized.find((node) => node.id === "t1")!.height, originalHeights.get("t1"));
  assert.equal(resized.find((node) => node.id === "t2")!.height, originalHeights.get("t2"));
});

test("dense Group reflow removes phantom Curated wrapper height while preserving a 44px target", () => {
  const nodes = twoTexts().map((node, index) => ({
    ...node,
    primitive: "frame" as const,
    width: index === 0 ? .6 : .5,
    height: .18,
    moduleComposition: { pageHeightPx: index === 0 ? 82 : 64, signatureAssembly: {} } as CreativeCompositionNode["moduleComposition"],
  }));
  const dense = setCompositionGroupSettings(nodes, "g1", { layout: "flow_vertical", density: "dense" }, { widthPx: 390, heightPx: 680 });
  const first = dense.find((node) => node.id === "t1")!;
  const second = dense.find((node) => node.id === "t2")!;
  assert.ok(first.height < .18);
  assert.ok(second.height < .18);
  assert.ok(first.height * 680 >= 44);
  assert.ok(second.height * 680 >= 44);
  assert.ok(Math.abs(second.y - (first.y + first.height + 4 / 680)) < 1e-9);
});

test("Grid Group reflow fits full-width parent-authority actions inside one bounded plane", () => {
  const nodes = Array.from({ length: 6 }, (_, index) => ({
    ...createCompositionNode("frame", {
      id: `action-${index}`,
      x: .03,
      y: .22 + index * .01,
      width: .94,
      height: .12,
      zIndex: index + 1,
      groupId: "action-grid",
      props: { minimumTouchTargetPx: 44 },
    }),
    compositionKind: "module" as const,
    parentId: null,
    siblingOrder: index,
    anchor: index % 2 ? "right" as const : "top-left" as const,
    moduleComposition: { pageHeightPx: 72, signatureAssembly: {} } as CreativeCompositionNode["moduleComposition"],
  }));
  const arranged = setCompositionGroupSettings(nodes, "action-grid", { layout: "grid", density: "dense" }, { widthPx: 390, heightPx: 760 });
  const bounds = computeGroupUnionBounds(arranged, "action-grid", true)!;
  assert.ok(bounds.left >= 0);
  assert.ok(bounds.left + bounds.width <= 1 + Number.EPSILON);
  assert.ok(arranged.every((node) => node.width < .5));
  assert.ok(arranged.every((node) => node.height * 760 >= 44));
});

test("capability fan-out applies color to all text and reports mixed", () => {
  const nodes = twoTexts();
  const mixed = mixedValueForCapability(nodes, ["t1", "t2"], "text_color");
  assert.equal(mixed.kind, "mixed");
  const icon = createCompositionNode("shape", {
    id: "i1",
    x: 0.2,
    y: 0.5,
    width: 0.1,
    height: 0.1,
    zIndex: 3,
    props: { elementKind: "icon", fill: "#fff" },
    groupId: "g1",
  });
  const withIcon = [...nodes, icon];
  const compatible = compatibleDescendants(withIcon, ["t1", "t2", "i1"], "text_color");
  assert.equal(compatible.length, 2);
  const result = fanOutProps(withIcon, ["t1", "t2", "i1"], "text_color", { color: "#00ff00" });
  assert.equal(result.nodes.find((n) => n.id === "t1")!.props.color, "#00ff00");
  assert.equal(result.nodes.find((n) => n.id === "t2")!.props.color, "#00ff00");
  assert.equal(result.nodes.find((n) => n.id === "i1")!.props.fill, "#fff");
});

test("per-descendant effect adapter does not clone primary surface keys onto text", () => {
  const text = createCompositionNode("text", {
    id: "t1",
    x: 0.1,
    y: 0.1,
    width: 0.3,
    height: 0.1,
    zIndex: 1,
    props: { text: "A", color: "#fff" },
  });
  const button = createCompositionNode("button", {
    id: "b1",
    x: 0.5,
    y: 0.2,
    width: 0.3,
    height: 0.12,
    zIndex: 2,
    props: { label: "Go", fill: "#111" },
  });
  const nodes = groupNodes([text, button], ["t1", "b1"], "g1");
  const result = fanOutWithAdapter(nodes, ["t1", "b1"], "effect", (member, family) =>
    applyEffectRecipe(appearanceAdapterTargetForFamily(family), "neon_edge", member.props)
  );
  const textProps = result.nodes.find((n) => n.id === "t1")!.props;
  const buttonProps = result.nodes.find((n) => n.id === "b1")!.props;
  assert.equal(textProps.effectPreset, "neon_edge");
  assert.equal(buttonProps.effectPreset, "neon_edge");
  // Glyph adapter uses glow; surface adapter uses boxGlow.
  assert.ok(Number(textProps.glow) > 0);
  assert.ok(Number(buttonProps.boxGlow) > 0);
});

test("fill and border fan-out target surface-compatible descendants", () => {
  const text = createCompositionNode("text", {
    id: "t1",
    x: 0.1,
    y: 0.1,
    width: 0.3,
    height: 0.1,
    zIndex: 1,
    props: { text: "A", color: "#fff" },
  });
  const badge = createCompositionNode("shape", {
    id: "bd1",
    x: 0.5,
    y: 0.2,
    width: 0.2,
    height: 0.1,
    zIndex: 2,
    props: { elementKind: "badge", text: "SALE", fill: "#ef4444" },
  });
  const nodes = groupNodes([text, badge], ["t1", "bd1"], "g1");
  const fillTargets = compatibleDescendants(nodes, ["t1", "bd1"], "fill");
  assert.equal(fillTargets.length, 2);
  const filled = fanOutProps(nodes, ["t1", "bd1"], "fill", { fill: "#00aa00" });
  assert.equal(filled.nodes.find((n) => n.id === "t1")!.props.color, "#00aa00");
  assert.equal(filled.nodes.find((n) => n.id === "bd1")!.props.fill, "#00aa00");
  const bordered = fanOutProps(nodes, ["t1", "bd1"], "border", { borderWidth: 2, borderStyle: "solid", borderColor: "#fff" });
  assert.equal(bordered.nodes.find((n) => n.id === "bd1")!.props.borderWidth, 2);
});

test("inferFanOutCapability classifies appearance patches", () => {
  assert.equal(inferFanOutCapability({ color: "#0f0" }), "text_color");
  assert.equal(inferFanOutCapability({ effectPreset: "neon_edge" }), "effect");
  assert.equal(inferFanOutCapability({ materialPreset: "gold" }), "material");
  assert.equal(inferFanOutCapability({ gradientFill: "linear-gradient(#000,#fff)" }), "gradient");
  assert.equal(inferFanOutCapability({ borderWidth: 2 }), "border");
  assert.equal(inferFanOutCapability({ fill: "#111" }), "fill");
  assert.equal(inferFanOutCapability({ label: "x" }), null);
});

test("group edit contents enters and exits without destroying membership", () => {
  const nodes = twoTexts();
  const editing = enterGroupContentEditing(nodes, "g1", "t1");
  assert.equal(editing.find((n) => n.id === "t1")!.props.groupContentEditing, true);
  assert.equal(editing.find((n) => n.id === "t1")!.groupId, "g1");
  const exited = exitGroupContentEditing(editing, "g1");
  assert.equal(exited.find((n) => n.id === "t1")!.props.groupContentEditing, undefined);
  assert.equal(exited.find((n) => n.id === "t1")!.groupId, "g1");
  assert.equal(exited.find((n) => n.id === "t2")!.groupId, "g1");
});

test("named effects produce distinguishable CSS signatures", () => {
  const neon = effectIdentitySignature({ effectPreset: "neon_edge", glow: 10, glowColor: "#22d3ee" });
  const soft = effectIdentitySignature({ effectPreset: "soft_glow", glow: 16, glowColor: "#a5b4fc" });
  const aura = effectIdentitySignature({ effectPreset: "aura", glow: 28, secondaryGlow: 48, glowColor: "#c4b5fd" });
  const double = effectIdentitySignature({ effectPreset: "double_neon", glow: 12, secondaryGlow: 28, glowColor: "#f0abfc" });
  assert.notEqual(neon, soft);
  assert.notEqual(soft, aura);
  assert.notEqual(neon, double);
  assert.match(neon, /neon_edge/);
});

test("appearance categories are semantic and not a fixed count", () => {
  const textCats = appearanceCategoriesForFamily("text").map((c) => c.id);
  const iconCats = appearanceCategoriesForFamily("icon").map((c) => c.id);
  assert.ok(textCats.includes("color"));
  assert.ok(textCats.includes("effects"));
  assert.ok(iconCats.includes("artwork"));
  assert.notEqual(textCats.length, iconCats.length);
});

test("coupon layouts are structurally different with matching thumbnails", () => {
  const retail = buildCouponContentComposition("retail_card", "c1");
  const perforated = buildCouponContentComposition("perforated_stub", "c2");
  const split = buildCouponContentComposition("split_image", "c3");
  const qr = buildCouponContentComposition("qr_first", "c4");
  const roles = (block: typeof retail) =>
    new Set(block.nodes.map((n) => String(n.props.componentContentRole)));
  assert.ok(roles(perforated).has("perforation"));
  assert.ok(roles(perforated).has("stub_code"));
  assert.ok(roles(split).has("image"));
  assert.ok(roles(qr).has("qr"));
  assert.ok(roles(retail).has("cta"));
  assert.deepEqual(couponThumbnailSignature("perforated_stub").regions, [
    "offer",
    "perforation",
    "stub",
    "qr",
  ]);
  assert.deepEqual(couponThumbnailSignature("split_image").regions, [
    "image",
    "offer",
    "content",
  ]);
});

test("magic write parser preserves separate targets", () => {
  const proposals = parseMagicWriteResponse(
    {
      results: [
        { id: "a", text: "Hello" },
        { id: "b", text: "World" },
      ],
    },
    [
      { id: "a", text: "A" },
      { id: "b", text: "B" },
    ]
  );
  assert.equal(proposals.length, 2);
  assert.equal(proposals[0].proposed, "Hello");
  assert.equal(proposals[1].proposed, "World");
});
