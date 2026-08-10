/**
 * Visual Renderer Repair — unit authority proofs (Evict Enrique).
 * Pixel ladders for continuous controls live in e2e cert + renderer lab.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyFinishToSurface,
  applySurfaceParameters,
  applyVisualPart,
  composeDepthShadow,
  depthDescriptor,
  deriveFinishSurface,
  finishSurfaceCssVars,
  geometryClassFromPresentation,
  poundedCopperRimBackground,
  readVisualPartsState,
  resolveMountDescriptor,
  resolveRimDescriptor,
  rimEdgeBoxShadow,
  rimKindFromDescriptor,
  themedBottomStopBackground,
} from "../visual-parts";
import { resolveMaterialSurfaceFromProps } from "../material-surface";

describe("Visual Renderer Repair — continuous Depth intensity", () => {
  it("Depth 0 / .25 / .5 / .75 / 1 produce distinct shadow strings", () => {
    const steps = [0, 0.25, 0.5, 0.75, 1] as const;
    const shadows = steps.map((i) => composeDepthShadow(3, i));
    assert.equal(shadows[0], "none");
    const unique = new Set(shadows);
    assert.equal(unique.size, steps.length, `expected ${steps.length} distinct shadows, got ${[...unique].join(" | ")}`);
    const dLow = depthDescriptor(2, 0.25);
    const dHigh = depthDescriptor(2, 1);
    assert.ok((dHigh.elevationPx || 0) > (dLow.elevationPx || 0));
    assert.notEqual(dLow.castShadow, dHigh.castShadow);
  });

  it("relational levels 1–5 all emit non-empty shadows at intensity 0.6", () => {
    for (const level of [1, 2, 3, 4, 5] as const) {
      const s = composeDepthShadow(level, 0.6);
      assert.notEqual(s, "none", `level ${level}`);
      assert.match(s, /rgba\(0,0,0/);
    }
  });
});

describe("Visual Renderer Repair — Finish composes Material channels", () => {
  it("Finish does not leave Material fillAuthority empty — feeds gradientFill + highlight", () => {
    const props = applyFinishToSurface({}, "finish_lacquer", "#16a34a", true, {
      lightResponse: 0.8,
      depth: 0.7,
      roughness: 0.2,
    });
    assert.equal(props.materialFillAuthority, "finish");
    assert.ok(typeof props.gradientFill === "string" && props.gradientFill.includes("gradient"));
    assert.ok(typeof props.highlight === "string" && props.highlight.length > 0);
    const surface = resolveMaterialSurfaceFromProps(props, "button");
    assert.equal(surface.fillAuthority, "gradientFill");
    assert.ok(surface.highlight);
    assert.ok(isCssShadowString(surface.boxShadow), String(surface.boxShadow));
    const vars = finishSurfaceCssVars(deriveFinishSurface("lacquer", "#16a34a"));
    assert.ok(vars["--vp-finish-gradient"]);
    assert.ok(vars["--vp-finish-highlight"]);
  });

  it("geometry classes change Finish highlight / fill profile", () => {
    const rect = deriveFinishSurface("lacquer", "#b10d1a", { lightResponse: 0.7 }, "rect");
    const circle = deriveFinishSurface("lacquer", "#b10d1a", { lightResponse: 0.7 }, "circle");
    const angular = deriveFinishSurface("lacquer", "#b10d1a", { lightResponse: 0.7 }, "angular");
    assert.notEqual(rect.gradient, circle.gradient);
    assert.notEqual(rect.highlight, angular.highlight);
    assert.equal(geometryClassFromPresentation("circle"), "circle");
    assert.equal(geometryClassFromPresentation("angular"), "angular");
  });

  it("Lacquer vs Acrylic differ for same base color", () => {
    const lacquer = deriveFinishSurface("lacquer", "#155eef", { lightResponse: 0.65 });
    const acrylic = deriveFinishSurface("acrylic", "#155eef", { lightResponse: 0.65 });
    assert.notEqual(lacquer.gradient, acrylic.gradient);
    assert.notEqual(lacquer.materialResponse.roughness, acrylic.materialResponse.roughness);
  });
});

describe("Visual Renderer Repair — Surface Intensity / Depth", () => {
  it("Surface Intensity ladder mutates gradient / opacity / glow", () => {
    let props = applyVisualPart({}, "action_surface_energy_field", { targetFamily: "container" });
    assert.equal(props.ok, true);
    if (!props.ok) return;
    const ladder = [0, 0.25, 0.5, 0.75, 1].map((intensity) =>
      applySurfaceParameters(props.props, { intensity, depth: 0.5 }, "container")
    );
    const fills = ladder.map((p) => String(p.gradientFill || ""));
    const uniqueFills = new Set(fills);
    assert.ok(uniqueFills.size >= 4, `expected intensity to change fill, got ${uniqueFills.size}`);
    const depths = [0, 0.25, 0.5, 0.75, 1].map((depth) =>
      applySurfaceParameters(props.props, { intensity: 0.55, depth }, "container")
    );
    const shadows = depths.map((p) => String(p.boxShadow || ""));
    assert.ok(new Set(shadows).size >= 4, `expected depth to change shadow, got ${new Set(shadows).size}`);
  });

  it("Quiet Field Intensity changes opacity/gradient without touching page background keys", () => {
    let base = applyVisualPart(
      { pageBackground: "#112233", compositionBackground: "solid:#112233" },
      "action_surface_quiet_field",
      { targetFamily: "container" }
    );
    assert.equal(base.ok, true);
    if (!base.ok) return;
    const low = applySurfaceParameters(base.props, { intensity: 0.1 }, "container");
    const high = applySurfaceParameters(base.props, { intensity: 0.95 }, "container");
    assert.notEqual(low.gradientFill, high.gradientFill);
    assert.equal(low.pageBackground, "#112233");
    assert.equal(high.compositionBackground, "solid:#112233");
  });
});

describe("Visual Renderer Repair — canonical Copper / Rim authority", () => {
  it("Action rim, Icon Station rim path, and Bottom Stop share poundedCopperRimBackground", () => {
    const rim = resolveRimDescriptor({ rimPartId: "rim_pounded_copper" });
    assert.ok(rim);
    assert.equal(rim!.background, poundedCopperRimBackground());
    assert.equal(rimKindFromDescriptor(rim!), "copper");
    assert.equal(themedBottomStopBackground("rim_pounded_copper"), poundedCopperRimBackground());
    assert.equal(rimEdgeBoxShadow("copper"), rimEdgeBoxShadow(rimKindFromDescriptor(rim!)));
    // No local imitation helper remains.
    assert.equal(typeof (globalThis as { poundedCopperLike?: unknown }).poundedCopperLike, "undefined");
  });

  it("Mount descriptor uses shared Depth intensity", () => {
    const applied = applyVisualPart({}, "mount_dark_plaque", { targetFamily: "button" });
    assert.equal(applied.ok, true);
    if (!applied.ok) return;
    const state = readVisualPartsState(applied.props);
    const low = resolveMountDescriptor({ ...state, surfaceDepth: 0.2 });
    const high = resolveMountDescriptor({ ...state, surfaceDepth: 0.95 });
    assert.ok(low && high);
    assert.notEqual(low!.shadow, high!.shadow);
  });

  it("Mechanical interaction clears perpetual motion presets", () => {
    const applied = applyVisualPart(
      { motionPreset: "glow_pulse", motionPlay: true },
      "interaction_mechanical",
      { targetFamily: "button" }
    );
    assert.equal(applied.ok, true);
    if (!applied.ok) return;
    assert.equal(applied.props.vpInteractionMode, "mechanical");
    assert.equal(applied.props.motionPreset, "none");
    assert.equal(applied.props.motionPlay, false);
  });
});

function isCssShadowString(value: unknown): boolean {
  return typeof value === "string" && /(?:px|inset|rgba?\()/i.test(value);
}
