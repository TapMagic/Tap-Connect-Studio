import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createIconAsset,
  nativeIconAsset,
  replaceIconContentProps,
  sanitizeSvg,
  NATIVE_ICON_SVGS,
} from "../icon-asset";
import { normalizeIconifySearch } from "../iconify-normalize";

describe("Iconify canonical asset pipeline", () => {
  it("sanitizes SVG and strips scripts", () => {
    const dirty =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><script>alert(1)</script><path d="M0 0h24v24H0z" onclick="evil()"/></svg>';
    const clean = sanitizeSvg(dirty);
    assert.ok(clean);
    assert.ok(!clean!.includes("<script"));
    assert.ok(!/onclick/i.test(clean!));
    assert.ok(clean!.includes("<path"));
  });

  it("creates IconAsset with viewBox and renderMode", () => {
    const asset = createIconAsset({
      provider: "iconify",
      collection: "lucide",
      iconName: "ticket",
      svg: NATIVE_ICON_SVGS.ticket,
    });
    assert.ok(asset);
    assert.equal(asset!.canonicalId, "lucide:ticket");
    assert.equal(asset!.viewBox, "0 0 24 24");
    assert.ok(asset!.body.includes("<svg"));
    assert.ok(["fill", "stroke", "multicolor"].includes(asset!.renderMode));
  });

  it("recommended native icons expose real SVG bodies — never diamonds", () => {
    for (const id of Object.keys(NATIVE_ICON_SVGS)) {
      const asset = nativeIconAsset(id);
      assert.ok(asset, id);
      assert.ok(asset!.body.includes("<svg"), id);
      assert.ok(!asset!.body.includes("◇"), id);
      assert.ok(!asset!.body.includes("✦"), id);
    }
  });

  it("replaceIconContentProps preserves identity geometry action and a11y", () => {
    const asset = nativeIconAsset("phone")!;
    const next = replaceIconContentProps(
      {
        icon: "sparkles",
        accessibleLabel: "Call us",
        actionType: "call",
        href: "tel:+15551212",
        trackingName: "icon-call",
        motionPreset: "subtle_pulse",
        boxFill: "#111827",
        fill: "#b8ff2c",
        xKeep: true,
      },
      asset
    );
    assert.equal(next.iconName, "phone");
    assert.equal(next.iconSvg, asset.body);
    assert.equal(next.accessibleLabel, "Call us");
    assert.equal(next.actionType, "call");
    assert.equal(next.href, "tel:+15551212");
    assert.equal(next.trackingName, "icon-call");
    assert.equal(next.motionPreset, "subtle_pulse");
    assert.equal(next.boxFill, "#111827");
    assert.equal(next.fill, "#b8ff2c");
  });

  it("normalizeIconifySearch whitelists approved collections only", () => {
    const icons = normalizeIconifySearch({
      icons: ["lucide:ticket", "evil:hack", "tabler:phone", "mdi:home"],
    });
    assert.deepEqual(
      icons.map((icon) => icon.canonicalId),
      ["lucide:ticket", "tabler:phone"]
    );
  });
});
