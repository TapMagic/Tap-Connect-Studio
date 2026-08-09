import test from "node:test";
import assert from "node:assert/strict";
import {
  BADGE_SHAPE_DEFS,
  badgeShapeSvgPoints,
  badgeUsesPathStroke,
} from "@/lib/fusion/creative-studio/badge-shape";

test("every clipped Badge shape exposes SVG silhouette points for Border", () => {
  for (const def of BADGE_SHAPE_DEFS) {
    if (!def.clipPath) {
      assert.equal(badgeUsesPathStroke(def.id), false);
      assert.equal(badgeShapeSvgPoints(def.id), null);
      continue;
    }
    assert.equal(badgeUsesPathStroke(def.id), true);
    const points = badgeShapeSvgPoints(def.id);
    assert.ok(points, `${def.id} must produce SVG points`);
    const pairs = points!.split(" ");
    assert.ok(pairs.length >= 3, `${def.id} needs a closed polygon`);
    for (const pair of pairs) {
      const [x, y] = pair.split(",").map(Number);
      assert.ok(Number.isFinite(x) && Number.isFinite(y), `${def.id} invalid point ${pair}`);
    }
  }
});

test("Starburst Border uses path stroke, not a rectangular box", () => {
  assert.equal(badgeUsesPathStroke("starburst"), true);
  assert.ok(badgeShapeSvgPoints("starburst")!.includes("50,0"));
});
