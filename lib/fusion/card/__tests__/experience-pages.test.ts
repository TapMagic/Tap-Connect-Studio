import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TapConnectCardConfig, TapExperienceConfig } from "@/lib/brand/tap-card";
import { actionProps, reconcileActionIntent, validateActionDestination } from "@/lib/fusion/card/action-intent-presentation";
import {
  canonicalizeExperienceConfig,
  clearExperiencePageReferences,
  createBlankExperiencePage,
  createExperienceFromLegacyCard,
  duplicateExperiencePage,
  findExperiencePageReferences,
  projectExperiencePage,
  visibleExperienceNavPages,
} from "@/lib/fusion/card/experience-pages";
import { compactActionGridNodeProps, createCompactActionGrid, createCompactActionTile } from "@/lib/fusion/creative-studio/platform/compact-action-grid";

function card(): TapConnectCardConfig {
  return {
    version: 3,
    accentColor: "#b8ff2c",
    surfaceColor: "#07100a",
    textColor: "#ffffff",
    headerEnergy: 50,
    collapsible: false,
    defaultCollapsed: false,
    actionsLayout: "stack",
    defaultFinish: "soft",
    cardFinish: "soft",
    defaultShape: "rounded_md",
    sections: [],
    rootComposition: {
      version: 1,
      id: "legacy-root",
      label: "Legacy",
      nodes: [{ id: "legacy-title", primitive: "text", x: 0, y: 0, width: 1, height: .1, zIndex: 1, props: { text: "Legacy Home" } }],
      mobileFallback: "scale",
    },
  };
}

describe("Experience Page authority", () => {
  it("converts a legacy Card without duplicating the canonical root and projects it for the existing editor", () => {
    const converted = createExperienceFromLegacyCard(card());
    assert.ok(converted.experience);
    assert.equal(converted.rootComposition, undefined);
    assert.deepEqual(converted.sections, []);
    const pageId = converted.experience!.defaultPageId;
    const projected = projectExperiencePage(converted, pageId);
    assert.equal(projected.rootComposition?.id, "legacy-root");
    assert.equal(projected.rootComposition?.nodes[0]?.props.text, "Legacy Home");
  });

  it("keeps page composition isolated and commits only the active projection", () => {
    const first = createExperienceFromLegacyCard(card());
    const experience = first.experience!;
    const secondPage = createBlankExperiencePage(experience, "Music");
    const withSecond = { ...first, experience: { ...experience, pages: [...experience.pages, secondPage] } };
    const musicProjection = projectExperiencePage(withSecond, secondPage.pageId);
    musicProjection.rootComposition!.nodes.push({ id: "music-only", primitive: "text", x: 0, y: 0, width: 1, height: .1, zIndex: 1, props: { text: "Music only" } });
    const committed = canonicalizeExperienceConfig(musicProjection, secondPage.pageId);
    assert.equal(committed.experience!.pages[0]!.composition.rootComposition?.nodes.some((node) => node.id === "music-only"), false);
    assert.equal(committed.experience!.pages[1]!.composition.rootComposition?.nodes.some((node) => node.id === "music-only"), true);
    assert.equal(committed.rootComposition, undefined);
  });

  it("duplicates with new page, composition, component, and analytics identities", () => {
    const converted = createExperienceFromLegacyCard(card());
    const source = converted.experience!.pages[0]!;
    const copy = duplicateExperiencePage(converted.experience!, source.pageId)!;
    assert.notEqual(copy.pageId, source.pageId);
    assert.notEqual(copy.analyticsId, source.analyticsId);
    assert.notEqual(copy.composition.rootComposition?.id, source.composition.rootComposition?.id);
    assert.notEqual(copy.composition.rootComposition?.nodes[0]?.id, source.composition.rootComposition?.nodes[0]?.id);
    assert.equal(copy.navVisible, false);
  });

  it("separates Page visibility, nav visibility, locked-hidden behavior, and five-slot capacity", () => {
    const converted = createExperienceFromLegacyCard(card());
    let experience = converted.experience!;
    const additions = Array.from({ length: 6 }, (_, index) => ({
      ...createBlankExperiencePage(experience, `Page ${index + 2}`),
      navVisible: index !== 0,
      pageVisible: index !== 1,
      navOrder: index + 1,
      access: index === 2 ? { state: "locked" as const, lockedBehavior: { mode: "hidden" as const } } : { state: "public" as const },
    }));
    experience = { ...experience, pages: [...experience.pages, ...additions], navigation: { ...experience.navigation, maxVisibleSlots: 5 } };
    const nav = visibleExperienceNavPages(experience);
    assert.equal(nav.length, 4);
    assert.ok(nav.every((page) => page.navVisible && page.pageVisible && page.access?.lockedBehavior?.mode !== "hidden"));
  });

  it("finds and clears internal references before Page deletion", () => {
    const converted = createExperienceFromLegacyCard(card());
    const experience = converted.experience!;
    const target = createBlankExperiencePage(experience, "Backstage");
    const source = experience.pages[0]!;
    source.composition.rootComposition!.nodes.push({ id: "go-backstage", primitive: "button", x: 0, y: 0, width: 1, height: .1, zIndex: 2, props: actionProps("internal_page", target.pageId) });
    const withTarget: TapExperienceConfig = { ...experience, pages: [{ ...source, navDestinationPageId: target.pageId }, target] };
    assert.equal(findExperiencePageReferences(withTarget, target.pageId).length, 2);
    const cleared = clearExperiencePageReferences(withTarget, target.pageId);
    assert.equal(findExperiencePageReferences(cleared, target.pageId).length, 0);
    assert.equal(cleared.pages[0]!.navDestinationPageId, source.pageId);
  });

  it("stores INTERNAL PAGE destinations by stable Page ID rather than URL", () => {
    assert.equal(validateActionDestination("internal_page", "page-music"), null);
    assert.deepEqual(actionProps("internal_page", "page-music"), { actionType: "internal_page", internalPageId: "page-music", destinationRef: "page-music", href: "" });
    assert.equal(reconcileActionIntent("internal_page", "page-music").kind, "internal_page");
  });

  it("tracks, clears, and re-identifies internal destinations nested in Compact Action Grids", () => {
    const converted = createExperienceFromLegacyCard(card());
    const experience = converted.experience!;
    const target = createBlankExperiencePage(experience, "Backstage");
    const tile = createCompactActionTile({ componentId:"tile-stable", actionId:"action-stable", analyticsId:"analytics-stable", label:"Backstage", actionType:"internal_page", destinationRef:target.pageId });
    experience.pages[0]!.composition.rootComposition!.nodes.push({ id:"compact-grid-node", primitive:"button", x:0, y:0, width:1, height:.3, zIndex:2, props:compactActionGridNodeProps(createCompactActionGrid({componentId:"grid-stable",tiles:[tile]})) });
    const withTarget: TapExperienceConfig = { ...experience, pages:[...experience.pages,target] };
    assert.equal(findExperiencePageReferences(withTarget,target.pageId).length,1);
    const cleared=clearExperiencePageReferences(withTarget,target.pageId);
    assert.equal(findExperiencePageReferences(cleared,target.pageId).length,0);
    const copy=duplicateExperiencePage(withTarget,experience.pages[0]!.pageId)!;
    const sourceGrid=experience.pages[0]!.composition.rootComposition!.nodes.at(-1)!.props.compactActionGrid as {componentId:string;tiles:Array<{componentId:string;actionId:string;analyticsId:string}>};
    const copiedGrid=copy.composition.rootComposition!.nodes.at(-1)!.props.compactActionGrid as typeof sourceGrid;
    assert.notEqual(copiedGrid.componentId,sourceGrid.componentId);
    assert.notEqual(copiedGrid.tiles[0]!.componentId,sourceGrid.tiles[0]!.componentId);
    assert.notEqual(copiedGrid.tiles[0]!.actionId,sourceGrid.tiles[0]!.actionId);
  });
});
