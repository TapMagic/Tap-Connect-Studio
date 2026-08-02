import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TapConnectCardConfig } from "@/lib/brand/tap-card";
import {
  addElementToCardRoot,
  addElementToSurface,
  createCardSurface,
  moveCardElements,
  removeSectionKeepElements,
  resizeCardSurface,
  resolveComposerSelectedObject,
  wrapCardElementsInSection,
} from "@/lib/fusion/card/composer-model";
import { groupNodes, ungroupNodes } from "@/lib/fusion/creative-studio/composition";

function card(): TapConnectCardConfig {
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

describe("Card root canvas truth", () => {
  it("stores transparent Elements directly on Card root without fake Sections", () => {
    const heading = addElementToCardRoot(card(), "heading");
    const withText = addElementToCardRoot(heading, "text");
    assert.equal(withText.sections.length, 0);
    assert.equal(withText.rootComposition?.nodes.length, 2);
    assert.ok(withText.rootComposition?.nodes.every((node) => node.props.borderWidth === 0));
    assert.ok(withText.rootComposition?.nodes.every((node) => node.props.padding === undefined));
    const id = withText.rootComposition!.nodes[0]!.id;
    assert.deepEqual(resolveComposerSelectedObject(withText, null, [id]), {
      type: "element", id, sectionId: null, elementId: id,
    });
  });

  it("uses a neutral tiny Blank Section and preserves children across extreme resize", () => {
    let section = addElementToSurface(createCardSurface("blank", 0), "button");
    const before = structuredClone(section.composition!.nodes);
    assert.equal(section.backgroundColor, "transparent");
    assert.equal(section.surfaceBorderWidthPx, 0);
    assert.equal(section.surfaceShadow, "none");
    assert.equal(section.surfaceRadiusPx, 0);
    section = resizeCardSurface(section, 32);
    assert.equal(section.surfaceMinHeightPx, 32);
    assert.deepEqual(section.composition!.nodes, before);
    section = resizeCardSurface(section, 2200);
    assert.equal(section.surfaceMinHeightPx, 2200);
    assert.deepEqual(section.composition!.nodes, before);
  });

  it("moves Elements into and out of Sections without deletion or duplication", () => {
    const root = addElementToCardRoot(card(), "heading");
    const id = root.rootComposition!.nodes[0]!.id;
    const surface = createCardSurface("identity", 0);
    const withSurface = { ...root, sections: [surface] };
    const movedIn = moveCardElements(withSurface, [id], null, surface.id);
    assert.equal(movedIn.rootComposition?.nodes.length, 0);
    assert.equal(movedIn.sections[0]!.composition?.nodes[0]?.id, id);
    const movedOut = moveCardElements(movedIn, [id], surface.id, null);
    assert.equal(movedOut.sections[0]!.composition?.nodes.length, 0);
    assert.equal(movedOut.rootComposition?.nodes[0]?.id, id);
  });

  it("wraps and removes a Section while preserving Element transforms and order", () => {
    let config = addElementToCardRoot(card(), "heading");
    config = addElementToCardRoot(config, "text");
    const ids = config.rootComposition!.nodes.map((node) => node.id);
    const before = structuredClone(config.rootComposition!.nodes);
    const wrapped = wrapCardElementsInSection(config, ids, null, "blank");
    assert.deepEqual(wrapped.config.sections[0]!.composition?.nodes, before);
    assert.equal(wrapped.config.sections[0]!.surfaceLayout, "free");
    assert.equal(wrapped.config.sections[0]!.surfaceCoordinateHeightPx, 496);
    const unwrapped = removeSectionKeepElements(wrapped.config, wrapped.sectionId);
    assert.equal(unwrapped.sections.length, 0);
    assert.deepEqual(unwrapped.rootComposition?.nodes, before);
  });

  it("groups and ungroups as a manipulation relationship without container styles", () => {
    let config = addElementToCardRoot(card(), "heading");
    config = addElementToCardRoot(config, "text");
    const nodes = config.rootComposition!.nodes;
    const grouped = groupNodes(nodes, nodes.map((node) => node.id), "group-root");
    assert.ok(grouped.every((node) => node.groupId === "group-root"));
    assert.ok(grouped.every((node) => node.props.borderWidth === 0));
    assert.ok(grouped.every((node) => node.props.background === undefined));
    const ungrouped = ungroupNodes(grouped, "group-root");
    assert.ok(ungrouped.every((node) => node.groupId === null));
  });
});
