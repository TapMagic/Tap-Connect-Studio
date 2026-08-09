import test from "node:test";
import assert from "node:assert/strict";
import {
  applySurfaceMaterial,
  getMaterialRecipe,
  MATERIAL_CATALOG,
  materialPreviewCss,
} from "@/lib/fusion/creative-studio/material-engine";
import {
  materialSurfaceParityKey,
  resolveMaterialSurfaceFromProps,
  resolveMaterialSurfaceFromRecipe,
} from "@/lib/fusion/creative-studio/material-surface";

const PREMIUM_IDS = [
  "flat",
  "soft_touch",
  "raised_resin",
  "gloss_lacquer",
  "acrylic",
  "polished_metal",
] as const;

test("preview and applied Button surfaces share identical Material parity keys", () => {
  for (const id of PREMIUM_IDS) {
    const recipe = getMaterialRecipe(id);
    assert.ok(recipe, id);
    const fromRecipe = resolveMaterialSurfaceFromRecipe(recipe!);
    const applied = applySurfaceMaterial({}, id, { asButtonSurface: true, preserveTextColor: true });
    const fromProps = resolveMaterialSurfaceFromProps(applied, "button");
    assert.equal(
      materialSurfaceParityKey(fromProps),
      materialSurfaceParityKey(fromRecipe),
      `parity drift for ${id}`
    );
    assert.equal(materialPreviewCss(recipe!), fromProps.background);
  }
});

test("multi-stop Materials preserve full gradientFill authority (not two-stop collapse)", () => {
  for (const id of ["raised_resin", "gloss_lacquer", "polished_metal", "polished_silver", "holographic"] as const) {
    const recipe = getMaterialRecipe(id);
    assert.ok(recipe?.gradient);
    const applied = applySurfaceMaterial({}, id, { asButtonSurface: true, preserveTextColor: true });
    assert.equal(applied.gradientFill, recipe!.gradient);
    assert.equal(applied.buttonSurfaceKind, "gradient");
    const surface = resolveMaterialSurfaceFromProps(applied, "button");
    assert.equal(surface.fillAuthority, "gradientFill");
    assert.equal(surface.background, recipe!.gradient);
    assert.ok(surface.gradientStopCount >= 3, `${id} should keep 3+ stops, got ${surface.gradientStopCount}`);
    // Two-stop reconstruction must not win when gradientFill is present.
    const collapsed = `linear-gradient(120deg, ${applied.gradientStart}, ${applied.gradientEnd})`;
    assert.notEqual(surface.background, collapsed);
  }
});

test("highlight and shine layers survive apply → resolve for premium finishes", () => {
  const resin = resolveMaterialSurfaceFromProps(
    applySurfaceMaterial({}, "raised_resin", { asButtonSurface: true, preserveTextColor: true }),
    "button"
  );
  assert.ok(resin.highlight);
  assert.equal(resin.shine, true);
  assert.ok((resin.boxShadow || "").length > 0);
  assert.ok(resin.borderWidth >= 1);

  const metal = resolveMaterialSurfaceFromProps(
    applySurfaceMaterial({}, "polished_metal", { asButtonSurface: true, preserveTextColor: true }),
    "button"
  );
  assert.ok(metal.highlight);
  assert.equal(metal.shine, true);
  assert.ok(metal.gradientStopCount >= 5);

  const flat = resolveMaterialSurfaceFromProps(
    applySurfaceMaterial({}, "flat", { asButtonSurface: true, preserveTextColor: true }),
    "button"
  );
  assert.equal(flat.fillAuthority, "solid");
  assert.equal(flat.shine, false);
  assert.equal(flat.highlight, null);
});

test("Material apply does not mutate Button Action / Icon identity / label wording", () => {
  const before = {
    label: "Order now",
    actionType: "website",
    href: "https://example.com/menu",
    icon: "mdi:heart",
    iconSvg: "<svg></svg>",
    showIcon: true,
    width: 0.5,
    height: 0.1,
  };
  const after = applySurfaceMaterial(before, "polished_metal", {
    asButtonSurface: true,
    preserveTextColor: true,
  });
  assert.equal(after.label, "Order now");
  assert.equal(after.actionType, "website");
  assert.equal(after.href, "https://example.com/menu");
  assert.equal(after.icon, "mdi:heart");
  assert.equal(after.iconSvg, "<svg></svg>");
  assert.equal(after.showIcon, true);
});

test("Material reset clears stale surface layers", () => {
  const applied = applySurfaceMaterial({}, "gloss_lacquer", { asButtonSurface: true });
  const reset = applySurfaceMaterial(applied, null, { asButtonSurface: true });
  assert.equal(reset.materialPreset, undefined);
  assert.equal(reset.gradientFill, undefined);
  assert.equal(reset.highlight, undefined);
  assert.equal(reset.shine, undefined);
  assert.equal(reset.innerShadow, undefined);
  assert.equal(reset.texture, undefined);
});

test("catalog overload note: near-duplicate glass/metal pairs remain but are distinguishable", () => {
  // Report-only: do not delete in this assignment.
  const labels = MATERIAL_CATALOG.map((r) => r.label);
  assert.ok(labels.includes("Glossy"));
  assert.ok(labels.includes("Gloss lacquer"));
  assert.ok(labels.includes("High gloss"));
  assert.ok(labels.includes("Glass"));
  assert.ok(labels.includes("Acrylic"));
});
