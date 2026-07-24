import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buttonLayoutClassNames,
  buttonLayoutInlineStyle,
  iconSizePx,
  isIconAfterPlacement,
  normalizeIconPlacement,
  resolveAppearance,
} from "@/lib/design/button-layout";
import { chromaKeyImageData } from "@/lib/media/bg-remove/local-mock";
import { findBgRemoveWhereUsed, type BgRemoveProvenance } from "@/lib/media/bg-remove";

describe("button layout matrix", () => {
  it("keeps left/right as first-class placements", () => {
    assert.equal(normalizeIconPlacement("left"), "left");
    assert.equal(normalizeIconPlacement("right"), "right");
    assert.equal(normalizeIconPlacement("above"), "above");
    assert.equal(normalizeIconPlacement(undefined), "before");
  });

  it("emits distinct left/right placement classes", () => {
    assert.ok(buttonLayoutClassNames({ iconPosition: "left" }).includes("tap-btn-place-left"));
    assert.ok(buttonLayoutClassNames({ iconPosition: "right" }).includes("tap-btn-place-right"));
    assert.ok(buttonLayoutClassNames({ iconPosition: "before" }).includes("tap-btn-place-before"));
  });

  it("orders icon after label for after/right/below", () => {
    assert.equal(isIconAfterPlacement("after"), true);
    assert.equal(isIconAfterPlacement("right"), true);
    assert.equal(isIconAfterPlacement("below"), true);
    assert.equal(isIconAfterPlacement("before"), false);
    assert.equal(isIconAfterPlacement("left"), false);
  });

  it("resolves appearance from Look + placement", () => {
    assert.equal(resolveAppearance({ appearance: "text" }), "text");
    assert.equal(resolveAppearance({ iconPosition: "only" }), "icon_only");
    assert.equal(resolveAppearance({ iconPosition: "none" }), "text");
    assert.equal(
      resolveAppearance({ appearance: "icon_text", iconPosition: "after" }),
      "icon_text"
    );
  });

  it("emits placement / align / size classes", () => {
    const classes = buttonLayoutClassNames({
      iconPosition: "above",
      iconSize: "lg",
      contentAlign: "start",
      wrap: true,
      fullWidth: false,
    });
    assert.ok(classes.includes("tap-btn-place-above"));
    assert.ok(classes.includes("tap-btn-align-start"));
    assert.ok(classes.includes("tap-btn-icon-lg"));
    assert.ok(classes.includes("tap-btn-wrap"));
    assert.ok(classes.includes("tap-btn-fit"));
  });

  it("maps gap/padding/minHeight to inline style", () => {
    assert.deepEqual(buttonLayoutInlineStyle({ iconGap: 12, paddingX: 20, minHeight: 48 }), {
      gap: "12px",
      paddingLeft: "20px",
      paddingRight: "20px",
      minHeight: "48px",
    });
    assert.equal(iconSizePx("sm"), 14);
    assert.equal(iconSizePx("lg"), 24);
  });
});

describe("bg-remove local mock", () => {
  it("keys near-corner background toward transparent", () => {
    const w = 8;
    const h = 8;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 240;
      data[i + 1] = 240;
      data[i + 2] = 240;
      data[i + 3] = 255;
    }
    const cx = (3 * w + 3) * 4;
    data[cx] = 10;
    data[cx + 1] = 10;
    data[cx + 2] = 10;
    data[cx + 3] = 255;

    const imageData = {
      data,
      width: w,
      height: h,
      colorSpace: "srgb" as const,
    } as ImageData;

    const keyed = chromaKeyImageData(imageData, 40, false);
    assert.ok(keyed.data[3] < 40);
    assert.equal(keyed.data[cx + 3], 255);
  });

  it("reports where-used for original + derived", () => {
    const p: BgRemoveProvenance = {
      provider: "local-mock",
      originalUrl: "https://example.com/a.png",
      derivedUrl: "data:image/png;base64,abc",
      createdAt: new Date().toISOString(),
      refined: false,
    };
    const hits = findBgRemoveWhereUsed(p, [
      { imageUrl: p.originalUrl },
      { hero: p.derivedUrl },
      { other: "nope" },
    ]);
    assert.equal(hits.find((h) => h.url === p.originalUrl)?.count, 1);
    assert.equal(hits.find((h) => h.url === p.derivedUrl)?.count, 1);
  });
});
