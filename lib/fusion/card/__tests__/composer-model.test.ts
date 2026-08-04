import assert from "node:assert/strict";
import test from "node:test";
import {
  CARD_ELEMENT_LIBRARY,
  CARD_SURFACE_LIBRARY,
  SECTION_PRESET_LIBRARY,
  addElementToSurface,
  composerBreadcrumb,
  composerSelection,
  composerWarnings,
  createCardElement,
  createCardSurface,
  createSectionPreset,
  fitCardSurfaceToContent,
  resizeCardSurface,
  resolveComposerSelectedObject,
} from "../composer-model";
import type { TapConnectCardConfig } from "@/lib/brand/tap-card";

test("composer library exposes one blank generic Section plus populated Section presets", () => {
  assert.deepEqual(CARD_SURFACE_LIBRARY.map((item) => item.kind), ["blank"]);
  assert.ok(SECTION_PRESET_LIBRARY.length >= 10);
  assert.ok(CARD_ELEMENT_LIBRARY.length >= 29);
  assert.ok(CARD_ELEMENT_LIBRARY.some((item) => item.kind === "badge"));
  assert.ok(CARD_ELEMENT_LIBRARY.some((item) => item.kind === "thumbnail"));
  assert.ok(CARD_ELEMENT_LIBRARY.some((item) => item.kind === "secondary_logo"));
  for (const [order, item] of CARD_SURFACE_LIBRARY.entries()) {
    const section = createCardSurface(item.kind as Parameters<typeof createCardSurface>[0], order);
    assert.equal(section.type, "surface");
    assert.equal(section.order, order);
    assert.deepEqual(section.composition?.nodes, []);
  }
  for (const [order, preset] of SECTION_PRESET_LIBRARY.entries()) {
    const section = createSectionPreset(preset.id, order);
    assert.equal(section.type, "surface");
    assert.equal(section.surfaceKind, "blank");
    assert.equal(section.sectionPresetId, preset.id);
    if (preset.id === "blank") assert.deepEqual(section.composition?.nodes, []);
    else assert.ok((section.composition?.nodes.length ?? 0) >= 3, `${preset.label} should contain editable children`);
  }
  for (const item of CARD_ELEMENT_LIBRARY) {
    const element = createCardElement(item.kind as Parameters<typeof createCardElement>[0]);
    assert.equal(element.props.elementKind, item.kind);
    assert.equal(element.props.borderWidth, 0);
  }
});

test("identity content lives as Elements inside one cohesive Section", () => {
  let section = createCardSurface("blank", 0);
  section = addElementToSurface(section, "logo");
  section = addElementToSurface(section, "business_name");
  section = addElementToSurface(section, "address");
  section = addElementToSurface(section, "hours");
  assert.equal(section.composition?.nodes.length, 4);
  assert.equal(section.surfaceBorderWidthPx, 0);
  assert.ok(section.composition?.nodes.every((node) => node.props.borderWidth === 0));
});

test("structured and free placement serialize deterministically on the canonical Card", () => {
  const section = addElementToSurface(createCardSurface("blank", 0), "heading");
  const config = {
    version: 3, accentColor: "#84cc16", surfaceColor: "#111827", textColor: "#ffffff",
    headerEnergy: 50, collapsible: false, defaultCollapsed: false, actionsLayout: "stack",
    defaultFinish: "soft", cardFinish: "soft", defaultShape: "pill", sections: [section],
  } satisfies TapConnectCardConfig;
  const copy = JSON.parse(JSON.stringify(config)) as TapConnectCardConfig;
  assert.deepEqual(copy, config);
  assert.equal(composerSelection(copy, section.id, section.composition!.nodes[0]!.id).element?.props.elementKind, "heading");
  assert.deepEqual(composerBreadcrumb(section, section.composition!.nodes[0]!), ["Card", "Blank Section", "Heading"]);
  assert.deepEqual(composerWarnings(section), []);
});

test("responsive warnings identify unsafe Element bounds and sizes", () => {
  const section = createCardSurface("blank", 0);
  section.composition!.nodes = [
    { ...createCardElement("button"), x: .9, width: .3, height: .05 },
    { ...createCardElement("text"), props: { ...createCardElement("text").props, fontSize: 9 } },
  ];
  const warnings = composerWarnings(section).join(" ");
  assert.match(warnings, /off canvas/);
  assert.match(warnings, /touch target/);
  assert.match(warnings, /unreadable/);
});

test("free Section resize changes bounds without changing child transforms", () => {
  let section = addElementToSurface(createCardSurface("blank", 0), "business_name");
  section = addElementToSurface(section, "address");
  section.surfaceLayout = "free";
  const before = structuredClone(section.composition!.nodes);
  const coordinateHeight = section.surfaceCoordinateHeightPx;
  const resized = resizeCardSurface(section, 520);
  assert.equal(resized.surfaceMinHeightPx, 520);
  assert.equal(resized.surfaceCoordinateHeightPx, coordinateHeight);
  assert.deepEqual(resized.composition!.nodes, before);
  assert.equal(resized.surfacePaddingPx, section.surfacePaddingPx);
  assert.equal(resized.surfaceGapPx, section.surfaceGapPx);
});

test("fit to content changes Section bounds only", () => {
  const section = addElementToSurface(createCardSurface("blank", 0), "text");
  const before = structuredClone(section.composition!.nodes);
  const fitted = fitCardSurfaceToContent(section);
  assert.equal(fitted.surfaceHeightMode, "auto");
  assert.ok((fitted.surfaceMinHeightPx ?? 0) >= 32);
  assert.deepEqual(fitted.composition!.nodes, before);
});

test("one canonical selection identity resolves Card, Section, and Element without stale inference", () => {
  const section = addElementToSurface(createCardSurface("blank", 0), "map");
  const config = {
    version: 3, accentColor: "#84cc16", surfaceColor: "#111827", textColor: "#ffffff",
    headerEnergy: 50, collapsible: false, defaultCollapsed: false, actionsLayout: "stack",
    defaultFinish: "soft", cardFinish: "soft", defaultShape: "pill", sections: [section],
  } satisfies TapConnectCardConfig;
  const elementId = section.composition!.nodes[0]!.id;
  assert.deepEqual(resolveComposerSelectedObject(config, null, [elementId]), { type: "card", id: "card", sectionId: null, elementId: null });
  assert.deepEqual(resolveComposerSelectedObject(config, section.id, ["stale-id"]), { type: "section", id: section.id, sectionId: section.id, elementId: null });
  assert.deepEqual(resolveComposerSelectedObject(config, section.id, [elementId]), { type: "element", id: elementId, sectionId: section.id, elementId });
});
