import test from "node:test";
import assert from "node:assert/strict";
import {
  createCardElement,
  ensureRootComposition,
  rootObjectPixelBounds,
  setRootPageHeightPreservingBounds,
} from "@/lib/fusion/card/composer-model";
import type { TapConnectCardConfig } from "@/lib/brand/tap-card";

function blankConfig(): TapConnectCardConfig {
  return {
    version: 1,
    accentColor: "#b8ff2c",
    surfaceColor: "#0b0f19",
    textColor: "#ffffff",
    sections: [],
    rootComposition: {
      version: 1,
      id: "card-root-composition",
      label: "Card root Elements",
      nodes: [],
      background: { kind: "none" },
      mobileFallback: "scale",
      pageHeightPx: 520,
    },
  } as unknown as TapConnectCardConfig;
}

test("page height extend/contract preserves absolute object bounds (zero artwork drift)", () => {
  const config = blankConfig();
  const kinds = ["text", "image", "logo", "icon", "badge", "button", "coupon", "ticket", "map", "form", "gallery", "composition", "decorative_graphic"] as const;
  const root = ensureRootComposition(config);
  root.nodes = kinds.map((kind, index) => {
    const node = createCardElement(kind as never, index);
    return {
      ...node,
      x: 0.1,
      y: 0.12 + index * 0.05,
      width: 0.4,
      height: 0.08,
      rotationDeg: index,
      props: { ...node.props, fontSize: 18 + index, fill: "#112233" },
    };
  });
  root.pageHeightPx = 520;
  const before = rootObjectPixelBounds(root);
  const propsBefore = root.nodes.map((n) => ({
    id: n.id,
    x: n.x,
    width: n.width,
    rotationDeg: n.rotationDeg,
    fontSize: n.props.fontSize,
    fill: n.props.fill,
  }));
  const extended = setRootPageHeightPreservingBounds(root, 900);
  const mid = rootObjectPixelBounds(extended);
  assert.equal(extended.pageHeightPx, 900);
  assert.deepEqual(mid, before);
  for (let i = 0; i < propsBefore.length; i++) {
    assert.equal(extended.nodes[i].x, propsBefore[i].x);
    assert.equal(extended.nodes[i].width, propsBefore[i].width);
    assert.equal(extended.nodes[i].rotationDeg, propsBefore[i].rotationDeg);
    assert.equal(extended.nodes[i].props.fontSize, propsBefore[i].fontSize);
    assert.equal(extended.nodes[i].props.fill, propsBefore[i].fill);
  }
  const contracted = setRootPageHeightPreservingBounds(extended, 400);
  const after = rootObjectPixelBounds(contracted);
  assert.equal(contracted.pageHeightPx, 400);
  assert.deepEqual(after, before);
});

test("page height mutation does not rewrite x/width; vertical fractions adapt to keep pixels", () => {
  const root = ensureRootComposition(blankConfig());
  const node = createCardElement("text", 0);
  root.nodes = [{ ...node, x: 0.25, y: 0.2, width: 0.5, height: 0.1, props: { ...node.props, fontSize: 22 } }];
  root.pageHeightPx = 600;
  const next = setRootPageHeightPreservingBounds(root, 1200);
  assert.equal(next.nodes[0].x, 0.25);
  assert.equal(next.nodes[0].width, 0.5);
  assert.equal(next.nodes[0].props.fontSize, 22);
  assert.ok(Math.abs(next.nodes[0].y - 0.1) < 0.0001);
  assert.ok(Math.abs(next.nodes[0].height - 0.05) < 0.0001);
});
