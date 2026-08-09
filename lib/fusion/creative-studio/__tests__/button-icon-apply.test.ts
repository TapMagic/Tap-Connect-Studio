import test from "node:test";
import assert from "node:assert/strict";
import { applyButtonIconAsset, buttonContentNode } from "@/lib/fusion/creative-studio/button-composition";
import { createIconAsset } from "@/lib/fusion/creative-studio/icon-asset";

test("Button Iconify selection installs exact SVG without mutating Surface fill", () => {
  const asset = createIconAsset({
    provider: "iconify",
    collection: "lucide",
    iconName: "paw-print",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2z"/></svg>',
    source: "iconify",
  });
  assert.ok(asset);
  const before = {
    fill: "#22c55e",
    buttonSurfaceKind: "solid",
    label: "Book",
    icon: "arrow-up-right",
    showIcon: true,
  };
  const next = applyButtonIconAsset(before, asset!, "btn-1");
  assert.equal(next.fill, "#22c55e");
  assert.equal(next.buttonSurfaceKind, "solid");
  assert.notEqual(next.fill, "#b8ff2c");
  assert.equal(next.icon, asset!.canonicalId);
  assert.equal(next.showIcon, true);
  assert.match(String(next.iconSvg), /<svg/);
  assert.match(String(next.iconSvg), /paw|M12 2z/i);
  const nested = buttonContentNode(next, "icon", "btn-1");
  assert.ok(nested);
  assert.equal(nested!.props.icon, asset!.canonicalId);
  assert.match(String(nested!.props.iconSvg), /<svg/);
});
