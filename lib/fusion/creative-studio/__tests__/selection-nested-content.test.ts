import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TapConnectCardConfig } from "@/lib/brand/tap-card";
import { insertRootContainerPreset, SECTION_PRESET_LIBRARY } from "@/lib/fusion/card/composer-model";
import { expandSelectionToGroups } from "@/lib/fusion/creative-studio/composition";
import {
  applyContainerResize,
  containerChildrenOutsideBounds,
  findOverlappingPairs,
  layoutStackChildren,
  moveContainerWithChildren,
  normalizeResizePolicy,
} from "@/lib/fusion/creative-studio/container-resize";
import {
  buildObjectSelectionRef,
  containerChildIds,
  enterContentMode,
  exitContentMode,
  nestedTargetLabel,
  selectionModeForNode,
  selectionTargetLabelForNode,
} from "@/lib/fusion/creative-studio/selection-mode";
import {
  createSelectionRef,
  requireCurrentSelection,
  StaleSelectionError,
  validateSelectionRef,
} from "@/lib/fusion/creative-studio/selection-ref";
import { gradientToCss, normalizeGradient, rotateGradient } from "@/lib/fusion/creative-studio/gradient";
import { OBJECT_CAPABILITY_REGISTRY } from "@/lib/fusion/creative-studio/capabilities";
import { getEditorCommand } from "@/lib/fusion/creative-studio/editor-command-registry";

function blankCard(): TapConnectCardConfig {
  return {
    version: 3,
    accentColor: "#b8ff2c",
    surfaceColor: "#10131a",
    textColor: "#ffffff",
    headerEnergy: 50,
    collapsible: false,
    defaultCollapsed: false,
    actionsLayout: "stack",
    defaultFinish: "soft",
    cardFinish: "soft",
    defaultShape: "pill",
    sections: [],
  };
}

describe("parent/child selection and nested content", () => {
  it("does not expand Container trees through group selection", () => {
    const { config, containerId, objectIds } = insertRootContainerPreset(blankCard(), "offer");
    const nodes = config.rootComposition!.nodes;
    const expanded = expandSelectionToGroups(nodes, [containerId]);
    assert.deepEqual(expanded, [containerId]);
    assert.equal(objectIds.length > 1, true);
    assert.equal(nodes.find((node) => node.id === containerId)?.groupId, null);
    assert.ok(nodes.every((node) => !node.groupId || node.props.componentKind === "container"));
  });

  it("enters and exits content mode without selecting every child", () => {
    const { config, containerId } = insertRootContainerPreset(blankCard(), "offer");
    const container = config.rootComposition!.nodes.find((node) => node.id === containerId)!;
    const entered = enterContentMode(container);
    assert.equal(selectionModeForNode(entered), "content");
    const exited = exitContentMode(entered);
    assert.equal(selectionModeForNode(exited), "parent");
  });

  it("labels nested targets for toolbar routing", () => {
    const { config, containerId } = insertRootContainerPreset(blankCard(), "offer");
    const nodes = config.rootComposition!.nodes;
    const parent = nodes.find((node) => node.id === containerId)!;
    const child = nodes.find((node) => node.props.containerId === containerId && node.props.presetChildRole === "heading")!;
    assert.equal(nestedTargetLabel(parent, null).display, "Container");
    assert.match(nestedTargetLabel(parent, child).display, /Container › /);
  });

  it("labels standalone Icon as Icon — never Card Root", () => {
    const icon = {
      id: "icon-1",
      name: "Phone",
      primitive: "shape" as const,
      x: 0.1,
      y: 0.1,
      width: 0.2,
      height: 0.2,
      rotationDeg: 0,
      zIndex: 1,
      props: { elementKind: "icon", icon: "phone", iconName: "phone" },
    };
    assert.equal(nestedTargetLabel(icon, null).display, "Icon");
    assert.notEqual(nestedTargetLabel(icon, null).display.toLowerCase(), "card root");
    assert.equal(selectionTargetLabelForNode([icon], icon).display, "Icon");
    assert.equal(nestedTargetLabel(null, null).display, "None");
  });

  it("rejects stale SelectionRef mutations", () => {
    const { config, containerId } = insertRootContainerPreset(blankCard(), "offer");
    const ref = buildObjectSelectionRef({
      documentId: "doc-1",
      pageId: "page-1",
      revision: 1,
      selectionGeneration: 1,
      node: config.rootComposition!.nodes.find((node) => node.id === containerId)!,
      parent: null,
    });
    const ok = validateSelectionRef(ref, {
      documentId: "doc-1",
      pageId: "page-1",
      revision: 1,
      selectionGeneration: 1,
      objects: new Map([[containerId, { kind: "nested_composition", parentId: null }]]),
    });
    assert.equal(ok.ok, true);
    assert.throws(
      () =>
        requireCurrentSelection(ref, {
          documentId: "doc-1",
          pageId: "page-1",
          revision: 1,
          selectionGeneration: 2,
          objects: new Map([[containerId, { kind: "nested_composition", parentId: null }]]),
        }),
      StaleSelectionError
    );
    const frozen = createSelectionRef({ ...ref, childPath: ["a", "b"] });
    assert.deepEqual(frozen.childPath, ["a", "b"]);
  });
});

describe("Container resize policies and preset layout", () => {
  it("defaults populated Containers to reflow and registers full policy set", () => {
    assert.deepEqual(OBJECT_CAPABILITY_REGISTRY.container.resizePolicies, [
      "reflow",
      "frame",
      "scale",
      "fit-content",
    ]);
    assert.equal(normalizeResizePolicy("free"), "frame");
    assert.ok(getEditorCommand("component.editChildren").supportedObjectKinds === "all" || getEditorCommand("component.editChildren").supportedObjectKinds.includes("container"));
  });

  it("reflow keeps child font sizes stable while scale enlarges them", () => {
    const { config, containerId } = insertRootContainerPreset(blankCard(), "offer");
    const nodes = config.rootComposition!.nodes;
    const heading = nodes.find((node) => node.props.containerId === containerId && node.props.presetChildRole === "heading")!;
    const beforeSize = Number(heading.props.fontSize || 34);
    const reflowed = applyContainerResize(nodes, containerId, { x: 0.04, y: 0.04, width: 0.92, height: 0.9 }, "reflow");
    const reflowHeading = reflowed.find((node) => node.id === heading.id)!;
    assert.equal(Number(reflowHeading.props.fontSize || 34), beforeSize);
    const scaled = applyContainerResize(nodes, containerId, { x: 0.04, y: 0.04, width: 0.92, height: 0.9 }, "scale");
    const scaledHeading = scaled.find((node) => node.id === heading.id)!;
    assert.ok(Number(scaledHeading.props.fontSize || 34) > beforeSize);
  });

  it("frame-only leaves child geometry unchanged", () => {
    const { config, containerId } = insertRootContainerPreset(blankCard(), "offer");
    const nodes = config.rootComposition!.nodes;
    const child = nodes.find((node) => node.props.containerId === containerId)!;
    const framed = applyContainerResize(nodes, containerId, { x: 0.02, y: 0.02, width: 0.96, height: 0.8 }, "frame");
    const after = framed.find((node) => node.id === child.id)!;
    assert.equal(after.x, child.x);
    assert.equal(after.y, child.y);
    assert.equal(after.width, child.width);
    assert.equal(after.height, child.height);
  });

  it("moves Container with children without requiring child selection", () => {
    const { config, containerId } = insertRootContainerPreset(blankCard(), "offer");
    const nodes = config.rootComposition!.nodes;
    const child = nodes.find((node) => node.props.containerId === containerId)!;
    const moved = moveContainerWithChildren(nodes, containerId, 0.05, 0.04);
    assert.ok(Math.abs(moved.find((node) => node.id === containerId)!.x - (nodes.find((node) => node.id === containerId)!.x + 0.05)) < 1e-9);
    assert.ok(Math.abs(moved.find((node) => node.id === child.id)!.y - (child.y + 0.04)) < 1e-9);
  });

  for (const preset of SECTION_PRESET_LIBRARY.filter((item) => item.id !== "blank")) {
    it(`inserts ${preset.label} without overlapping children`, () => {
      const { config, containerId } = insertRootContainerPreset(blankCard(), preset.id);
      const nodes = config.rootComposition!.nodes;
      const container = nodes.find((node) => node.id === containerId)!;
      const children = nodes.filter((node) => node.props.containerId === containerId);
      assert.equal(String(container.props.resizePolicy), "reflow");
      assert.deepEqual(containerChildIds(nodes, containerId).sort(), children.map((node) => node.id).sort());
      const boxes = children.map((node) => ({
        id: node.id,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
      }));
      assert.deepEqual(findOverlappingPairs(boxes), []);
      assert.deepEqual(
        containerChildrenOutsideBounds(
          { id: container.id, x: container.x, y: container.y, width: container.width, height: container.height },
          boxes
        ),
        []
      );
    });
  }

  it("stack layout helper produces non-overlapping role-weighted rows", () => {
    const laid = layoutStackChildren({
      container: { x: 0.1, y: 0.1, width: 0.8, height: 0.7 },
      children: [
        { id: "a", primitive: "text", x: 0, y: 0, width: 0.1, height: 0.1, zIndex: 1, props: { presetChildRole: "badge" } },
        { id: "b", primitive: "text", x: 0, y: 0, width: 0.1, height: 0.1, zIndex: 2, props: { presetChildRole: "heading" } },
        { id: "c", primitive: "image", x: 0, y: 0, width: 0.1, height: 0.1, zIndex: 3, props: { presetChildRole: "image" } },
      ] as never,
    });
    assert.deepEqual(
      findOverlappingPairs(laid.map((node) => ({ id: node.id, x: node.x, y: node.y, width: node.width, height: node.height }))),
      []
    );
  });
});

describe("gradient completion", () => {
  it("renders linear, radial, and conic CSS", () => {
    assert.match(gradientToCss({ ...normalizeGradient(null), kind: "linear", angle: 45 }), /linear-gradient\(45deg/);
    assert.match(gradientToCss({ ...normalizeGradient(null), kind: "radial", centerX: 20, centerY: 80 }), /radial-gradient/);
    assert.match(gradientToCss({ ...normalizeGradient(null), kind: "conic", angle: 90 }), /conic-gradient\(from 90deg/);
    assert.equal(rotateGradient(normalizeGradient(null), 30).angle, 165);
  });
});
