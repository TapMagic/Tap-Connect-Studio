import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SURFACE_PATTERN_CATALOG,
  surfacePatternFromTextureToken,
  surfacePatternStyle,
  textureTokenToPatternId,
} from "../patterns";

describe("surface pattern catalog", () => {
  it("includes architectural and ornamental V1 patterns with real CSS imagery", () => {
    for (const id of ["brick", "marble", "wood-grain", "baroque", "hex", "chevron", "brushed-metal", "kraft", "damask", "linen", "leather"]) {
      const definition = SURFACE_PATTERN_CATALOG.find((item) => item.id === id);
      assert.ok(definition, `missing pattern ${id}`);
      const style = surfacePatternStyle({
        version: 1,
        id,
        kind: definition.kind,
        scale: 1,
        rotation: 0,
        opacity: 0.3,
        foreground: "#ffffff",
        background: "#1f2937",
        blendMode: "normal",
      });
      assert.ok(style.backgroundImage && style.backgroundImage !== "none", `${id} must paint a backgroundImage`);
      assert.notEqual(style.backgroundImage, style.backgroundColor);
    }
  });

  it("maps material texture tokens onto catalog overlays", () => {
    assert.equal(textureTokenToPatternId("linen"), "linen");
    assert.equal(textureTokenToPatternId("leather"), "leather");
    assert.equal(textureTokenToPatternId("brushed"), "brushed-metal");
    assert.equal(textureTokenToPatternId("kraft"), "kraft");
    const model = surfacePatternFromTextureToken("linen", { background: "#e7e5e4", foreground: "#78716c" });
    assert.ok(model);
    assert.equal(model?.id, "linen");
    const style = surfacePatternStyle(model!);
    assert.match(style.backgroundImage, /repeating-linear-gradient/);
  });
});
