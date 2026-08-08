import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_GRADIENT, gradientToCss, normalizeGradient, addGradientStop } from "../gradient";

describe("glyph vs Text Box gradient targeting", () => {
  it("glyph mutation writes gradientFill/gradientModel only", () => {
    const props: Record<string, unknown> = {
      boxFill: "transparent",
      boxGradient: undefined,
      color: "#ffffff",
    };
    const gradient = normalizeGradient({
      ...DEFAULT_GRADIENT,
      stops: [
        { id: "start", color: "#ff0000", position: 0, opacity: 1 },
        { id: "end", color: "#00ff88", position: 100, opacity: 1 },
      ],
      angle: 120,
    });
    const next: Record<string, unknown> = {
      ...props,
      gradientFill: gradientToCss(gradient),
      gradientModel: gradient,
      sourceMode: "LOCAL",
    };
    assert.match(String(next.gradientFill), /linear-gradient|radial-gradient|conic-gradient/);
    assert.equal(next.boxFill, "transparent");
    assert.equal(next.boxGradient, undefined);
  });

  it("text box mutation writes boxGradient only", () => {
    const glyphCss = "linear-gradient(90deg,#fff,#000)";
    const props: Record<string, unknown> = {
      gradientFill: glyphCss,
      gradientModel: DEFAULT_GRADIENT,
      boxFill: "transparent",
    };
    const box = addGradientStop(normalizeGradient(DEFAULT_GRADIENT));
    const next: Record<string, unknown> = {
      ...props,
      boxGradient: gradientToCss(box),
      boxGradientModel: box,
      boxFill: undefined,
    };
    assert.equal(next.gradientFill, glyphCss);
    assert.match(String(next.boxGradient), /gradient/);
    assert.notEqual(next.boxGradient, next.gradientFill);
  });
});
