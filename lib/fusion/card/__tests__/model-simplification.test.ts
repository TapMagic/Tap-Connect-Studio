import assert from "node:assert/strict";
import test from "node:test";
import type { TapConnectCardConfig } from "@/lib/brand/tap-card";
import { createCardElement, createSectionPreset, fitRootCanvasToContent, rootCanvasAutoHeight, SECTION_PRESET_LIBRARY } from "../composer-model";
import { insertObject, readableTextColor } from "../object-kernel";
import { buttonContent } from "../../creative-studio/button-composition";
import { parseCreativeComposition } from "../../creative-studio/composition";

function blankCard(): TapConnectCardConfig {
  return { version: 3, accentColor: "#84cc16", surfaceColor: "#111827", textColor: "#fff", headerEnergy: 50, collapsible: false, defaultCollapsed: false, actionsLayout: "stack", defaultFinish: "soft", cardFinish: "soft", defaultShape: "pill", sections: [] };
}

test("root Text Image Button and Badge insertion creates no synthetic Section", () => {
  let config = blankCard();
  for (const kind of ["text", "image", "button", "badge"] as const) config = insertObject({ config, parentId: null, kind }).config;
  assert.equal(config.sections.length, 0);
  assert.deepEqual(config.rootComposition?.nodes.map((node) => node.props.elementKind), ["text", "image", "button", "badge"]);
});

test("Card root automatically grows for objects extending below its current plane", () => {
  const config = blankCard();
  const element = createCardElement("text");
  element.y = 1.12;
  element.height = 0.2;
  config.rootCanvasMinHeightPx = 500;
  config.rootComposition = { version: 1, id: "root", label: "Root", nodes: [element], mobileFallback: "scale" };
  assert.equal(rootCanvasAutoHeight(config), 660);
});

test("canonical Card page height survives composition parsing and overrides legacy height", () => {
  const parsed = parseCreativeComposition({
    version: 1,
    id: "root",
    label: "Root",
    nodes: [],
    mobileFallback: "scale",
    pageHeightPx: 616.4,
  });
  assert.equal(parsed?.pageHeightPx, 616);
  const config = blankCard();
  config.rootCanvasMinHeightPx = 900;
  config.rootComposition = parsed!;
  assert.equal(rootCanvasAutoHeight(config), 616);
});

test("Card root Fit to content ignores editor chrome and returns a modest blank height", () => {
  const blank = blankCard();
  blank.rootCanvasMinHeightPx = 900;
  assert.equal(fitRootCanvasToContent(blank), 320);
  const element = createCardElement("text");
  element.y = .4;
  element.height = .2;
  blank.rootComposition = { version: 1, id: "root", label: "Root", nodes: [element], mobileFallback: "scale" };
  assert.equal(fitRootCanvasToContent(blank), 565);
});

test("Text insertion chooses readable contrast from its actual parent surface", () => {
  assert.equal(readableTextColor("#ffffff"), "#111827");
  assert.equal(readableTextColor("#05070a"), "#f8fafc");
  const light = blankCard();
  light.surfaceColor = "#ffffff";
  const result = insertObject({ config: light, parentId: null, kind: "text" });
  assert.equal(result.config.rootComposition?.nodes[0]?.props.color, "#111827");
});

test("all named Section presets use one generic model and contain selectable children", () => {
  for (const [order, preset] of SECTION_PRESET_LIBRARY.entries()) {
    const section = createSectionPreset(preset.id, order);
    assert.equal(section.type, "surface");
    assert.equal(section.surfaceKind, "blank");
    if (preset.id !== "blank") {
      assert.ok((section.composition?.nodes.length ?? 0) > 0);
      assert.equal(new Set(section.composition?.nodes.map((node) => node.id)).size, section.composition?.nodes.length);
    }
  }
});

test("Button content label and Icon are real nested canonical children", () => {
  const button = createCardElement("button");
  const children = buttonContent(button.props, button.id).nodes;
  assert.deepEqual(children.map((child) => child.props.elementKind), ["text", "icon"]);
  assert.equal(children[0]?.props.buttonContentRole, "label");
});

test("Coupon Ticket Gallery and Form are canonical Components with editable data", () => {
  const coupon = createCardElement("coupon");
  const ticket = createCardElement("ticket");
  const gallery = createCardElement("gallery");
  const form = createCardElement("form");
  assert.equal(coupon.props.componentKind, "coupon");
  assert.equal(ticket.props.componentKind, "ticket");
  assert.deepEqual(gallery.props.media, []);
  assert.equal(form.props.liveSubmission, false);
  assert.ok(Array.isArray(form.props.fields));
  for (const component of [coupon, ticket, gallery, form]) {
    const content = component.props.contentComposition as { nodes?: Array<{ id: string; props: Record<string, unknown> }> };
    assert.ok(Array.isArray(content.nodes));
    assert.ok((content.nodes?.length ?? 0) > 0);
    assert.equal(new Set(content.nodes?.map((node) => node.id)).size, content.nodes?.length);
    assert.ok(content.nodes?.every((node) => node.props.componentContentRole));
  }
});
