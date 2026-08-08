import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createCompositionNode,
  groupNodes,
} from "../composition";
import {
  computeGroupUnionBounds,
  compatibleDescendants,
  enterGroupContentEditing,
  exitGroupContentEditing,
  fanOutProps,
  isGroupParentSelection,
  mixedValueForCapability,
  moveGroupComposition,
  resizeGroupComposition,
  resolveActiveGroupId,
  rotateGroupComposition,
} from "../group-authority";
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
