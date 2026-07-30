import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_GRADIENT,
  addGradientStop,
  gradientToCss,
  normalizeGradient,
  removeGradientStop,
  reverseGradient,
} from "@/lib/fusion/creative-studio/gradient";
import {
  DEFAULT_SURFACE_PATTERN,
  SURFACE_PATTERN_CATALOG,
  surfacePatternStyle,
} from "@/lib/fusion/creative-studio/patterns";

describe("typed Creative Studio gradients", () => {
  it("renders linear and radial gradients without raw Owner CSS", () => {
    assert.match(gradientToCss(DEFAULT_GRADIENT), /^linear-gradient\(135deg/);
    assert.match(
      gradientToCss({ ...DEFAULT_GRADIENT, kind: "radial", centerX: 35, centerY: 60 }),
      /^radial-gradient\(circle at 35% 60%/
    );
  });

  it("adds, positions, removes, and reverses typed stops", () => {
    const added = addGradientStop(DEFAULT_GRADIENT);
    assert.equal(added.stops.length, 3);
    assert.equal(added.stops[1].position, 50);
    const reversed = reverseGradient({
      ...added,
      stops: added.stops.map((stop, index) => ({
        ...stop,
        color: index === 0 ? "#111111" : stop.color,
      })),
    });
    assert.equal(reversed.stops.at(-1)?.color, "#111111");
    assert.equal(removeGradientStop(added, added.stops[1].id).stops.length, 2);
  });

  it("normalizes unsafe or incomplete values", () => {
    const normalized = normalizeGradient({
      ...DEFAULT_GRADIENT,
      angle: -90,
      stops: [
        { id: "one", color: "not-css", position: -20, opacity: 3 },
        { id: "two", color: "#ffffff", position: 120, opacity: -1 },
      ],
    });
    assert.equal(normalized.angle, 270);
    assert.equal(normalized.stops[0].color, "#000000");
    assert.equal(normalized.stops[0].position, 0);
    assert.equal(normalized.stops[1].position, 100);
  });
});

describe("licensed procedural pattern registry", () => {
  it("contains searchable pattern and texture categories", () => {
    assert.ok(SURFACE_PATTERN_CATALOG.some((item) => item.kind === "pattern"));
    assert.ok(SURFACE_PATTERN_CATALOG.some((item) => item.kind === "texture"));
    assert.ok(SURFACE_PATTERN_CATALOG.some((item) => item.category === "Botanical"));
    assert.ok(SURFACE_PATTERN_CATALOG.some((item) => item.category === "Paper"));
  });

  it("renders procedural CSS without bundled unlicensed imagery", () => {
    const style = surfacePatternStyle(DEFAULT_SURFACE_PATTERN);
    assert.equal(style.backgroundColor, DEFAULT_SURFACE_PATTERN.background);
    assert.match(style.backgroundImage, /gradient/);
    assert.equal(
      SURFACE_PATTERN_CATALOG.some((item) =>
        JSON.stringify(item).includes("http")
      ),
      false
    );
  });
});

