import assert from "node:assert/strict";
import test from "node:test";
import {
  CARD_ELEMENT_LIBRARY,
  CARD_SURFACE_LIBRARY,
  addElementToSurface,
  composerBreadcrumb,
  composerSelection,
  composerWarnings,
  createCardElement,
  createCardSurface,
} from "../composer-model";
import type { TapConnectCardConfig } from "@/lib/brand/tap-card";

test("composer library exposes every promised Section and Element as a real mutation", () => {
  assert.deepEqual(CARD_SURFACE_LIBRARY.map((item) => item.kind), [
    "blank", "identity", "hero", "content", "actions", "offer", "contact", "location", "gallery",
  ]);
  assert.equal(CARD_ELEMENT_LIBRARY.length, 23);
  for (const [order, item] of CARD_SURFACE_LIBRARY.entries()) {
    const section = createCardSurface(item.kind as Parameters<typeof createCardSurface>[0], order);
    assert.equal(section.type, "surface");
    assert.equal(section.order, order);
    assert.deepEqual(section.composition?.nodes, []);
  }
  for (const item of CARD_ELEMENT_LIBRARY) {
    const element = createCardElement(item.kind as Parameters<typeof createCardElement>[0]);
    assert.equal(element.props.elementKind, item.kind);
    assert.equal(element.props.borderWidth, 0);
  }
});

test("identity content lives as Elements inside one cohesive Section", () => {
  let section = createCardSurface("identity", 0);
  section = addElementToSurface(section, "logo");
  section = addElementToSurface(section, "business_name");
  section = addElementToSurface(section, "address");
  section = addElementToSurface(section, "hours");
  assert.equal(section.composition?.nodes.length, 4);
  assert.equal(section.surfaceBorderWidthPx, 0);
  assert.ok(section.composition?.nodes.every((node) => node.props.borderWidth === 0));
});

test("structured and free placement serialize deterministically on the canonical Card", () => {
  const section = addElementToSurface(createCardSurface("content", 0), "heading");
  const config = {
    version: 3, accentColor: "#84cc16", surfaceColor: "#111827", textColor: "#ffffff",
    headerEnergy: 50, collapsible: false, defaultCollapsed: false, actionsLayout: "stack",
    defaultFinish: "soft", cardFinish: "soft", defaultShape: "pill", sections: [section],
  } satisfies TapConnectCardConfig;
  const copy = JSON.parse(JSON.stringify(config)) as TapConnectCardConfig;
  assert.deepEqual(copy, config);
  assert.equal(composerSelection(copy, section.id, section.composition!.nodes[0]!.id).element?.props.elementKind, "heading");
  assert.deepEqual(composerBreadcrumb(section, section.composition!.nodes[0]!), ["Card", "Content Section", "Heading"]);
  assert.deepEqual(composerWarnings(section), []);
});

test("responsive warnings identify unsafe Element bounds and sizes", () => {
  const section = createCardSurface("actions", 0);
  section.composition!.nodes = [
    { ...createCardElement("button"), x: .9, width: .3, height: .05 },
    { ...createCardElement("text"), props: { ...createCardElement("text").props, fontSize: 9 } },
  ];
  const warnings = composerWarnings(section).join(" ");
  assert.match(warnings, /off canvas/);
  assert.match(warnings, /touch target/);
  assert.match(warnings, /unreadable/);
});
