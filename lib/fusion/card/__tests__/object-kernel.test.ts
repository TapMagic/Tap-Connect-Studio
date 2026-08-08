import assert from "node:assert/strict";
import test from "node:test";
import type { TapConnectCardConfig } from "@/lib/brand/tap-card";
import { createCardSurface } from "@/lib/fusion/card/composer-model";
import {
  convertObject,
  deleteObject,
  duplicateObject,
  insertObject,
  moveObject,
  replaceObject,
  unwrapSection,
  wrapObjects,
} from "@/lib/fusion/card/object-kernel";

function card(): TapConnectCardConfig {
  return {
    version: 3,
    accentColor: "#84cc16",
    surfaceColor: "#111827",
    textColor: "#ffffff",
    headerEnergy: 50,
    collapsible: false,
    defaultCollapsed: false,
    actionsLayout: "stack",
    defaultFinish: "soft",
    cardFinish: "soft",
    defaultShape: "pill",
    sections: [createCardSurface("content", 0)],
  };
}

test("insertObject is additive, preserves previous identities, and avoids exact overlap", () => {
  let config = card();
  const parentId = config.sections[0]!.id;
  const first = insertObject({ config, parentId, kind: "badge", initialProps: { text: "SALE" } });
  config = first.config;
  const second = insertObject({ config, parentId, kind: "badge", initialProps: { text: "VIP" } });
  config = second.config;
  const third = insertObject({ config, parentId, kind: "badge", initialProps: { text: "LIMITED" } });
  const nodes = third.config.sections[0]!.composition!.nodes;
  assert.equal(nodes.length, 3);
  assert.deepEqual(nodes.map((node) => node.id), [first.objectIds[0], second.objectIds[0], third.objectIds[0]]);
  assert.equal(new Set(nodes.map((node) => `${node.x}:${node.y}`)).size, 3);
  assert.deepEqual(nodes.map((node) => node.props.text), ["SALE", "VIP", "LIMITED"]);
});

test("saturated plane cascade avoids near-identical coordinates of occupied nodes", () => {
  let config = card();
  // Fill with large coupons so the fine grid has no open slot.
  for (let index = 0; index < 4; index += 1) {
    const next = insertObject({ config, parentId: null, kind: "coupon" });
    config = next.config;
  }
  const before = config.rootComposition!.nodes;
  const icon = insertObject({ config, parentId: null, kind: "icon" });
  const placed = icon.config.rootComposition!.nodes.find((node) => node.id === icon.objectIds[0]);
  assert.ok(placed);
  const nearIdentical = before.some(
    (node) => Math.abs(node.x - placed!.x) < 0.04 && Math.abs(node.y - placed!.y) < 0.04
  );
  assert.equal(nearIdentical, false, `icon landed too close to an occupied node at ${placed!.x},${placed!.y}`);
});

test("large coupon insert does not cover existing text when an open band exists", () => {
  let config = card();
  const text = insertObject({ config, parentId: null, kind: "text", initialProps: { text: "Type here" } });
  config = text.config;
  const textNode = config.rootComposition!.nodes[0]!;
  const coupon = insertObject({ config, parentId: null, kind: "coupon" });
  const couponNode = coupon.config.rootComposition!.nodes.find((node) => node.id === coupon.objectIds[0])!;
  const coversText =
    couponNode.x < textNode.x + textNode.width
    && couponNode.x + couponNode.width > textNode.x
    && couponNode.y < textNode.y + textNode.height
    && couponNode.y + couponNode.height > textNode.y;
  assert.equal(coversText, false, `coupon at ${couponNode.x},${couponNode.y} covered text at ${textNode.x},${textNode.y}`);
});

test("null explicitly targets Card root while a Section id explicitly targets that Section", () => {
  const initial = card();
  const root = insertObject({ config: initial, parentId: null, kind: "heading" });
  assert.equal(root.config.rootComposition?.nodes.length, 1);
  assert.equal(root.config.sections[0]!.composition?.nodes.length, 0);
  const section = insertObject({ config: root.config, parentId: initial.sections[0]!.id, kind: "button" });
  assert.equal(section.config.rootComposition?.nodes.length, 1);
  assert.equal(section.config.sections[0]!.composition?.nodes.length, 1);
});

test("unknown insertion parents fail instead of falling back to current selection or Card root", () => {
  assert.throws(
    () => insertObject({ config: card(), parentId: "missing-section", kind: "badge" }),
    /unknown or non-surface parent/
  );
});

test("canonical object operations preserve explicit parentage and identity semantics", () => {
  const base = card();
  const sectionId = base.sections[0]!.id;
  const inserted = insertObject({ config: base, parentId: null, kind: "badge" });
  const id = inserted.objectIds[0]!;
  const moved = moveObject(inserted.config, [id], null, sectionId);
  assert.equal(moved.config.rootComposition?.nodes.length, 0);
  assert.equal(moved.config.sections[0]!.composition?.nodes[0]!.id, id);

  const converted = convertObject(moved.config, sectionId, id, "button");
  assert.equal(converted.config.sections[0]!.composition?.nodes[0]!.props.elementKind, "button");
  assert.equal(converted.config.sections[0]!.composition?.nodes[0]!.id, id);

  const replacement = { ...converted.config.sections[0]!.composition!.nodes[0]!, name: "Replaced deliberately" };
  const replaced = replaceObject(converted.config, sectionId, id, replacement);
  assert.equal(replaced.config.sections[0]!.composition?.nodes[0]!.name, "Replaced deliberately");

  const duplicated = duplicateObject(replaced.config, sectionId, [id]);
  assert.equal(duplicated.config.sections[0]!.composition?.nodes.length, 2);
  assert.notEqual(duplicated.objectIds[0], id);

  const wrapped = wrapObjects(duplicated.config, [id], sectionId, "blank");
  assert.ok(wrapped.config.sections.some((section) => section.id === wrapped.parentId));
  const unwrapped = unwrapSection(wrapped.config, wrapped.parentId!, null);
  assert.ok(unwrapped.config.rootComposition?.nodes.some((node) => node.id === id));

  const deleted = deleteObject(unwrapped.config, null, [id]);
  assert.ok(!deleted.config.rootComposition?.nodes.some((node) => node.id === id));
});
