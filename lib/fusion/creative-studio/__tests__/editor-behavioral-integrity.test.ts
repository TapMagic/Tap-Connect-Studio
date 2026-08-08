/**
 * Automated editor integrity crawler (Phase C/D/E) — registry-driven.
 * Exercises capability classes against representative families without
 * brute-forcing every numeric knob.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { OBJECT_CAPABILITY_REGISTRY, objectFamilyForNode, type ObjectFamily } from "../capabilities";
import { EDITOR_COMMAND_REGISTRY, dispatchEditorCommand, getEditorCommand } from "../editor-command-registry";
import {
  createCompositionNode,
  groupNodes,
  ungroupNodes,
  duplicateNodes,
  expandSelectionToGroups,
  type CreativeCompositionNode,
} from "../composition";
import {
  appearanceAdapterTargetForFamily,
  fanOutWithAdapter,
  inferFanOutCapability,
  isGroupParentSelection,
  mixedValueForCapability,
  resolveActiveGroupId,
} from "../group-authority";
import { applyEffectRecipe, applyGlyphMaterial, applySurfaceMaterial, EFFECT_RECIPES } from "../material-engine";
import { effectIdentitySignature, effectLayersCss } from "../effect-render";
import { appearanceCategoriesForFamily } from "../appearance-ia";
import { normalizeGradient, DEFAULT_GRADIENT, gradientToCss } from "../gradient";
import { applyBorderProps, clearBorderProps } from "../border";

const REPRESENTATIVE: Record<ObjectFamily, () => CreativeCompositionNode | null> = {
  card_root: () => null,
  text: () =>
    createCompositionNode("text", {
      id: "text-1",
      x: 0.1,
      y: 0.1,
      width: 0.4,
      height: 0.1,
      zIndex: 1,
      props: { text: "Hello", color: "#f8fafc", fontFamily: "Inter", fontSize: 22 },
    }),
  image: () =>
    createCompositionNode("image", {
      id: "image-1",
      x: 0.1,
      y: 0.3,
      width: 0.3,
      height: 0.2,
      zIndex: 2,
      props: { src: "https://example.com/a.jpg", alt: "Sample" },
    }),
  logo: () =>
    createCompositionNode("image", {
      id: "logo-1",
      x: 0.1,
      y: 0.55,
      width: 0.2,
      height: 0.1,
      zIndex: 3,
      props: { elementKind: "logo", src: "https://example.com/logo.png" },
    }),
  icon: () =>
    createCompositionNode("shape", {
      id: "icon-1",
      x: 0.5,
      y: 0.1,
      width: 0.12,
      height: 0.12,
      zIndex: 4,
      props: { elementKind: "icon", icon: "sparkles", fill: "#b8ff2c" },
    }),
  shape: () =>
    createCompositionNode("shape", {
      id: "shape-1",
      x: 0.5,
      y: 0.3,
      width: 0.2,
      height: 0.15,
      zIndex: 5,
      props: { shape: "rounded", fill: "#334155" },
    }),
  divider: () =>
    createCompositionNode("shape", {
      id: "divider-1",
      x: 0.1,
      y: 0.7,
      width: 0.6,
      height: 0.02,
      zIndex: 6,
      props: { elementKind: "divider", fill: "#b8ff2c" },
    }),
  badge: () =>
    createCompositionNode("shape", {
      id: "badge-1",
      x: 0.7,
      y: 0.1,
      width: 0.2,
      height: 0.1,
      zIndex: 7,
      props: { elementKind: "badge", text: "SALE", fill: "#ef4444", color: "#fff" },
    }),
  button: () =>
    createCompositionNode("button", {
      id: "button-1",
      x: 0.7,
      y: 0.3,
      width: 0.22,
      height: 0.1,
      zIndex: 8,
      props: { label: "Claim", fill: "#b8ff2c", labelColor: "#07100a" },
    }),
  coupon: () =>
    createCompositionNode("frame", {
      id: "coupon-1",
      x: 0.1,
      y: 0.75,
      width: 0.4,
      height: 0.2,
      zIndex: 9,
      props: { componentKind: "coupon", offerValue: "20% OFF", headline: "Special", code: "SAVE20" },
    }),
  ticket: () =>
    createCompositionNode("frame", {
      id: "ticket-1",
      x: 0.55,
      y: 0.75,
      width: 0.35,
      height: 0.2,
      zIndex: 10,
      props: { componentKind: "ticket", title: "ADMIT ONE", ticketId: "T-1" },
    }),
  map: () =>
    createCompositionNode("frame", {
      id: "map-1",
      x: 0.35,
      y: 0.45,
      width: 0.25,
      height: 0.2,
      zIndex: 11,
      props: { componentKind: "map", address: "1 Main St" },
    }),
  gallery: () =>
    createCompositionNode("frame", {
      id: "gallery-1",
      x: 0.1,
      y: 0.45,
      width: 0.2,
      height: 0.2,
      zIndex: 12,
      props: { componentKind: "gallery", media: [] },
    }),
  form: () =>
    createCompositionNode("frame", {
      id: "form-1",
      x: 0.65,
      y: 0.5,
      width: 0.25,
      height: 0.2,
      zIndex: 13,
      props: { componentKind: "form", fields: [{ id: "f1", label: "Email", type: "email" }] },
    }),
  container: () =>
    createCompositionNode("frame", {
      id: "container-1",
      x: 0.35,
      y: 0.2,
      width: 0.25,
      height: 0.2,
      zIndex: 14,
      props: { componentKind: "container", fill: "#111827" },
    }),
  group: () => null,
  qr: () =>
    createCompositionNode("image", {
      id: "qr-1",
      x: 0.8,
      y: 0.55,
      width: 0.12,
      height: 0.12,
      zIndex: 15,
      props: { elementKind: "qr_image" },
    }),
  video: () =>
    createCompositionNode("image", {
      id: "video-1",
      x: 0.8,
      y: 0.7,
      width: 0.15,
      height: 0.12,
      zIndex: 16,
      props: { elementKind: "video", src: "https://example.com/v.mp4" },
    }),
  utility: () => null, // utility family is setup/visibility only; no composition factory yet
};

test("Phase C — every registered family toolbar command is executable", () => {
  for (const [family, definition] of Object.entries(OBJECT_CAPABILITY_REGISTRY) as Array<[ObjectFamily, (typeof OBJECT_CAPABILITY_REGISTRY)[ObjectFamily]]>) {
    for (const id of definition.toolbarCommands) {
      assert.ok(EDITOR_COMMAND_REGISTRY.has(id), `${family} missing command ${id}`);
      const command = getEditorCommand(id);
      assert.ok(command.label.trim().length > 0, `${id} has empty label`);
      if (command.supportedObjectKinds !== "all") {
        assert.ok(
          command.supportedObjectKinds.includes(family) || family === "card_root" || family === "group",
          `${id} does not list ${family}`
        );
      }
    }
  }
});

test("Phase C — representative insert + capability mutation per family", () => {
  const families = Object.keys(OBJECT_CAPABILITY_REGISTRY) as ObjectFamily[];
  for (const family of families) {
    const factory = REPRESENTATIVE[family];
    const node = factory();
    if (!node) continue;
    assert.equal(objectFamilyForNode(node), family, `factory for ${family}`);
    const definition = OBJECT_CAPABILITY_REGISTRY[family];
    // Appearance categories exist when appearance is in drawer
    if (definition.editDrawerSections.includes("appearance") || definition.editDrawerSections.includes("surface")) {
      const cats = appearanceCategoriesForFamily(family === "group" ? "group" : family);
      assert.ok(cats.length >= 1, `${family} appearance categories`);
      const labels = cats.map((c) => c.label);
      assert.equal(new Set(labels).size, labels.length, `${family} duplicate appearance category labels`);
    }
    // Representative color/fill mutation
    if (family === "text" || family === "badge") {
      const next = { ...node, props: { ...node.props, color: "#22c55e" } };
      assert.equal(next.props.color, "#22c55e");
    }
    if (["button", "shape", "container", "coupon", "ticket", "badge"].includes(family)) {
      const bordered = applyBorderProps(node.props, { style: "solid", width: 2, color: "#ffffff" });
      assert.equal(bordered.borderWidth, 2);
      const cleared = clearBorderProps(bordered);
      assert.ok(cleared.borderWidth === 0 || cleared.borderStyle === "none" || cleared.borderWidth == null);
    }
  }
});

test("Phase C — no duplicate Appearance doors in command labels for same family focus", () => {
  // Icon Appearance and Element Appearance are OK because targets differ by family.
  // Within badge/button, Material must not also be labelled Appearance.
  const badgeCmds = OBJECT_CAPABILITY_REGISTRY.badge.toolbarCommands.map((id) => getEditorCommand(id));
  const appearanceLabels = badgeCmds.filter((c) => c.label === "Appearance");
  assert.equal(appearanceLabels.length, 1, "Badge should have exactly one Appearance command");
  const buttonCmds = OBJECT_CAPABILITY_REGISTRY.button.toolbarCommands.map((id) => getEditorCommand(id));
  assert.ok(buttonCmds.some((c) => c.id === "appearance.open"));
  assert.ok(buttonCmds.some((c) => c.id === "material.open"));
});

test("Phase D — Text Color mutation semantics match across contexts", () => {
  const single = REPRESENTATIVE.text()!;
  const a = { ...single, id: "a", props: { ...single.props, color: "#ff0000" } };
  const b = { ...single, id: "b", x: 0.5, props: { ...single.props, color: "#0000ff", text: "B" } };
  const grouped = groupNodes([a, b], ["a", "b"], "g-color");
  const fan = fanOutWithAdapter(grouped, ["a", "b"], "text_color", (node) => ({
    ...node.props,
    color: "#22c55e",
  }));
  assert.equal(fan.nodes.find((n) => n.id === "a")!.props.color, "#22c55e");
  assert.equal(fan.nodes.find((n) => n.id === "b")!.props.color, "#22c55e");

  const badge = REPRESENTATIVE.badge()!;
  const badgePatched = { ...badge, props: { ...badge.props, color: "#22c55e" } };
  assert.equal(badgePatched.props.color, "#22c55e");

  const button = REPRESENTATIVE.button()!;
  const buttonPatched = {
    ...button,
    props: { ...button.props, labelColor: "#22c55e", textColor: "#22c55e", color: "#22c55e" },
  };
  assert.equal(buttonPatched.props.labelColor, "#22c55e");
});

test("Phase D — Group Ungroup preserves child props and removes membership", () => {
  const a = REPRESENTATIVE.text()!;
  const b = { ...REPRESENTATIVE.icon()!, id: "icon-g" };
  const grouped = groupNodes([a, b], [a.id, b.id], "g-ungroup");
  assert.equal(resolveActiveGroupId(grouped, [a.id, b.id]), "g-ungroup");
  assert.equal(isGroupParentSelection(grouped, [a.id, b.id]), true);
  const colorBefore = grouped.find((n) => n.id === a.id)!.props.color;
  const ungrouped = ungroupNodes(grouped, "g-ungroup");
  assert.equal(ungrouped.find((n) => n.id === a.id)!.groupId, null);
  assert.equal(ungrouped.find((n) => n.id === b.id)!.groupId, null);
  assert.equal(ungrouped.find((n) => n.id === a.id)!.props.color, colorBefore);
  assert.equal(ungrouped.find((n) => n.id === b.id)!.props.fill, b.props.fill);
});

test("Phase E — order independence of color then effect then material", () => {
  const base = REPRESENTATIVE.text()!;
  const sequences = [
    ["color", "effect", "material"],
    ["effect", "color", "material"],
    ["material", "color", "effect"],
  ] as const;
  const apply = (node: CreativeCompositionNode, step: string) => {
    if (step === "color") return { ...node, props: { ...node.props, color: "#22c55e", gradientFill: undefined } };
    if (step === "effect") {
      return { ...node, props: applyEffectRecipe("glyph", "neon_edge", node.props) };
    }
    return { ...node, props: applyGlyphMaterial(node.props, "tube_neon") };
  };
  const finals = sequences.map((seq) => seq.reduce((node, step) => apply(node, step), base));
  // Color must survive regardless of order
  for (const final of finals) {
    assert.equal(final.props.color, "#22c55e");
    assert.equal(final.props.effectPreset, "neon_edge");
  }
});

test("Phase E — group fan-out material uses adapters after target switch", () => {
  const text = REPRESENTATIVE.text()!;
  const button = REPRESENTATIVE.button()!;
  const nodes = groupNodes([text, button], [text.id, button.id], "g-mat");
  const result = fanOutWithAdapter(nodes, [text.id, button.id], "material", (member, family) => {
    const target = appearanceAdapterTargetForFamily(family);
    if (target === "glyph") return applyGlyphMaterial(member.props, "gold");
    return applySurfaceMaterial(member.props, "gold", { asButtonSurface: family === "button", preserveTextColor: true });
  });
  assert.equal(result.nodes.find((n) => n.id === text.id)!.props.materialPreset, "gold");
  assert.equal(result.nodes.find((n) => n.id === button.id)!.props.materialPreset, "gold");
});

test("Phase F — named effects produce distinguishable signatures across targets", () => {
  const ids = ["soft_shadow", "soft_glow", "neon_edge", "double_neon", "aura", "electric"] as const;
  for (const target of ["glyph", "icon_artwork", "surface"] as const) {
    const signatures = new Set<string>();
    for (const id of ids) {
      const recipe = EFFECT_RECIPES.find((item) => item.id === id);
      assert.ok(recipe, id);
      const applied = applyEffectRecipe(target === "glyph" || target === "icon_artwork" ? target : "surface", id, {});
      const layers = effectLayersCss(target, {
        effectPreset: id,
        glow: Number(applied.glow ?? applied.boxGlow ?? 0),
        shadow: Number(applied.shadow ?? applied.boxShadow ?? 0),
        glowColor: typeof applied.glowColor === "string" ? applied.glowColor : "#22d3ee",
        secondaryGlow: Number(applied.secondaryGlow ?? 0),
        coreBrightness: Number(applied.coreBrightness ?? 1),
        edgeWidth: Number(applied.edgeWidth ?? 1.25),
        auraIntensity: Number(applied.auraIntensity ?? 0.45),
      });
      const sig = `${id}|${layers.textShadow || ""}|${layers.filter || ""}|${layers.boxShadow || ""}`;
      assert.ok(!signatures.has(sig), `collision ${target} ${id}`);
      signatures.add(sig);
      assert.notEqual(effectIdentitySignature({ effectPreset: id, glow: 12, glowColor: "#22d3ee" }), "");
    }
  }
});

test("Phase D — mixed values remain Mixed until replacement", () => {
  const a = REPRESENTATIVE.text()!;
  const b = { ...a, id: "t2", props: { ...a.props, color: "#111111", fontSize: 30 } };
  const nodes = groupNodes(
    [
      { ...a, props: { ...a.props, color: "#eeeeee" } },
      b,
    ],
    [a.id, "t2"],
    "g-mixed"
  );
  assert.equal(mixedValueForCapability(nodes, [a.id, "t2"], "text_color").kind, "mixed");
  assert.equal(mixedValueForCapability(nodes, [a.id, "t2"], "font_size").kind, "mixed");
  const unified = fanOutWithAdapter(nodes, [a.id, "t2"], "text_color", (node) => ({ ...node.props, color: "#00ff00" }));
  assert.equal(mixedValueForCapability(unified.nodes, [a.id, "t2"], "text_color").kind, "uniform");
});

test("Phase C — duplicate group selection remaps membership", () => {
  const a = REPRESENTATIVE.text()!;
  const b = { ...REPRESENTATIVE.icon()!, id: "icon-dup" };
  const grouped = groupNodes([a, b], [a.id, b.id], "g-dup");
  const expanded = expandSelectionToGroups(grouped, [a.id]);
  assert.ok(expanded.includes(a.id) && expanded.includes(b.id));
  const dup = duplicateNodes(grouped, expanded);
  assert.equal(dup.newIds.length, 2);
  const newGroupIds = dup.newIds.map((id) => dup.nodes.find((n) => n.id === id)!.groupId);
  assert.ok(newGroupIds[0]);
  assert.equal(newGroupIds[0], newGroupIds[1]);
  assert.notEqual(newGroupIds[0], "g-dup");
});

test("inferFanOutCapability + gradient normalize are first-use safe", () => {
  assert.equal(inferFanOutCapability({ color: "#abc" }), "text_color");
  const gradient = normalizeGradient(DEFAULT_GRADIENT);
  assert.ok(gradientToCss(gradient).includes("gradient"));
  let opened = "";
  dispatchEditorCommand("appearance.open", "text", (section) => {
    opened = section;
  });
  assert.equal(opened, "effects");
});
