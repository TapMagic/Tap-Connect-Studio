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

  it("emits placement / align / size / text classes", () => {
    const classes = buttonLayoutClassNames({
      iconPosition: "above",
      iconSize: "lg",
      textSize: "sm",
      contentAlign: "start",
      verticalAlign: "end",
      wrap: true,
      fullWidth: false,
    });
    assert.ok(classes.includes("tap-btn-place-above"));
    assert.ok(classes.includes("tap-btn-align-start"));
    assert.ok(classes.includes("tap-btn-valign-end"));
    assert.ok(classes.includes("tap-btn-icon-lg"));
    assert.ok(classes.includes("tap-btn-text-sm"));
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
