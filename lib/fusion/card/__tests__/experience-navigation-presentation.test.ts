import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveExperienceNavigationComposition,
  resolveLoveAndTheftNavigationArtwork,
} from "../experience-navigation-presentation";

test("composes three, four, and five visible navigation slots intentionally", () => {
  assert.deepEqual(resolveExperienceNavigationComposition(3), {
    tier: "clustered",
    clusterWidthPercent: 78,
    standardIconSizePx: 20,
  });
  assert.deepEqual(resolveExperienceNavigationComposition(4), {
    tier: "balanced",
    clusterWidthPercent: 90,
    standardIconSizePx: 19,
  });
  assert.deepEqual(resolveExperienceNavigationComposition(5), {
    tier: "full",
    clusterWidthPercent: 100,
    standardIconSizePx: 18,
  });
});

test("keeps supported two-item navigation as an intentional centered pair", () => {
  assert.deepEqual(resolveExperienceNavigationComposition(2), {
    tier: "paired",
    clusterWidthPercent: 62,
    standardIconSizePx: 21,
  });
});

test("Love & Theft artwork grows as slots become less dense without owning cluster geometry", () => {
  const five = resolveLoveAndTheftNavigationArtwork(5);
  const four = resolveLoveAndTheftNavigationArtwork(4);
  const three = resolveLoveAndTheftNavigationArtwork(3);

  assert.deepEqual(five, { tier: "compact", layoutWidthPx: 44, visualScale: 1.13 });
  assert.deepEqual(four, { tier: "medium", layoutWidthPx: 48, visualScale: 1.17 });
  assert.deepEqual(three, { tier: "large", layoutWidthPx: 53, visualScale: 1.18 });
  assert.ok(three.layoutWidthPx * three.visualScale > four.layoutWidthPx * four.visualScale);
  assert.ok(four.layoutWidthPx * four.visualScale > five.layoutWidthPx * five.visualScale);
});
