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
  } as TapConnectCardConfig;
}

test("page height extend/contract preserves absolute object bounds", () => {
  const config = blankConfig();
  const kinds = ["text", "image", "logo", "icon", "badge", "button", "coupon", "ticket", "map", "form", "gallery", "composition", "decorative_graphic"] as const;
  const root = ensureRootComposition(config);
  root.nodes = kinds.map((kind, index) => {
    const node = createCardElement(kind as never, index);
    return { ...node, x: 0.1, y: 0.12 + index * 0.05, width: 0.4, height: 0.08 };
  });
  root.pageHeightPx = 520;
  const before = rootObjectPixelBounds(root);
  const extended = setRootPageHeightPreservingBounds(root, 900);
  const mid = rootObjectPixelBounds(extended);
  assert.equal(extended.pageHeightPx, 900);
  assert.deepEqual(mid, before);
  const contracted = setRootPageHeightPreservingBounds(extended, 400);
  const after = rootObjectPixelBounds(contracted);
  assert.equal(contracted.pageHeightPx, 400);
  assert.deepEqual(after, before);
});

test("page height mutation does not rewrite x/width fractions incorrectly", () => {
  const root = ensureRootComposition(blankConfig());
  const node = createCardElement("text", 0);
  root.nodes = [{ ...node, x: 0.25, y: 0.2, width: 0.5, height: 0.1 }];
  root.pageHeightPx = 600;
  const next = setRootPageHeightPreservingBounds(root, 1200);
  assert.equal(next.nodes[0].x, 0.25);
  assert.equal(next.nodes[0].width, 0.5);
  assert.ok(Math.abs(next.nodes[0].y - 0.1) < 0.0001);
  assert.ok(Math.abs(next.nodes[0].height - 0.05) < 0.0001);
});
