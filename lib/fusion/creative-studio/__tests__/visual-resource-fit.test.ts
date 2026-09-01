import assert from "node:assert/strict";
import test from "node:test";
import { createIdentityVisualResourceFitContract, STUDIO_VISUAL_RESOURCE_FIT_CONTRACT } from "../platform/semantic-resource-slot";
import { clampStudioVisualResourceCrop, detectStudioVisibleArtworkBounds, resolveStudioVisualResourceBackingPlate, resolveStudioVisualResourcePlacement, resolveStudioVisualResourceTranslationBounds, studioVisualResourceCompatibility, studioVisualResourceLegibilityGuidance } from "../platform/visual-resource-fit";

function pixels(width: number, height: number, background: [number, number, number, number], subject: { x: number; y: number; width: number; height: number; color: [number, number, number, number] }) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const color = x >= subject.x && x < subject.x + subject.width && y >= subject.y && y < subject.y + subject.height ? subject.color : background;
    data.set(color, (y * width + x) * 4);
  }
  return { data, width, height };
}

test("identity fit contract declares reusable circular crop governance", () => {
  const contract = createIdentityVisualResourceFitContract();
  assert.equal(contract.contractId, STUDIO_VISUAL_RESOURCE_FIT_CONTRACT);
  assert.equal(contract.maskShape, "circle");
  assert.deepEqual(contract.visibleBounds, { coordinateSpace: "normalized-source", committedOnResource: true });
  assert.equal(contract.cropCapability, "focal-zoom");
  assert.equal(contract.preserveAspectRatio, true);
  assert.equal(contract.rendererMapping, "canonical-visible-bounds-transform");
  assert.ok(contract.safeInset > 0);
  assert.ok(contract.scale.min < 1 && contract.scale.max > 1);
  assert.ok(contract.translation.minX < 0 && contract.translation.maxX > 0);
  assert.deepEqual(contract.backingPlate.allowedModes, ["transparent", "light", "dark", "auto-contrast"]);
});

test("visible bounds remove transparent padding without mutating source pixels", () => {
  const source = pixels(100, 80, [0, 0, 0, 0], { x: 30, y: 20, width: 40, height: 32, color: [184, 255, 44, 255] });
  const before = source.data.slice();
  const result = detectStudioVisibleArtworkBounds(source);
  assert.equal(result.boundsSource, "alpha");
  assert.equal(result.compatibility, "compatible");
  assert.ok(result.visibleBounds!.x > 0.2 && result.visibleBounds!.x < 0.31);
  assert.ok(result.visibleBounds!.width > 0.4 && result.visibleBounds!.width < 0.46);
  assert.deepEqual(source.data, before, "visible-bound analysis never alters the canonical Asset");
});

test("opaque white or black logo canvases use stable edge-background bounds", () => {
  for (const background of [[255, 255, 255, 255], [0, 0, 0, 255]] as const) {
    const result = detectStudioVisibleArtworkBounds(pixels(120, 80, [...background], { x: 24, y: 16, width: 72, height: 48, color: [82, 210, 140, 255] }));
    assert.equal(result.boundsSource, "edge-background");
    assert.equal(result.compatibility, "compatible");
    assert.ok(result.visibleBounds!.width < 0.7);
    assert.equal(result.legibility?.opaqueBackground, "baked-in-likely");
    assert.match(studioVisualResourceLegibilityGuidance(result) || "", /backing plate cannot remove/i);
  }
});

test("transparent dark artwork receives a family-neutral Light Plate recommendation", () => {
  const metadata = detectStudioVisibleArtworkBounds(pixels(100, 100, [0, 0, 0, 0], { x: 20, y: 20, width: 60, height: 60, color: [12, 18, 28, 255] }));
  assert.equal(metadata.legibility?.sourceTransparency, "transparent");
  assert.equal(metadata.legibility?.recommendedBacking, "light");
  assert.match(studioVisualResourceLegibilityGuidance(metadata) || "", /Light Plate/);
  const backing = resolveStudioVisualResourceBackingPlate({ metadata, contract: createIdentityVisualResourceFitContract(), requestedMode: "auto-contrast" });
  assert.equal(backing.mode, "auto-contrast");
  assert.equal(backing.resolvedColor, "#ffffff");
  assert.equal(backing.resolution, "auto-contrast");
});

test("backing plate selection is non-destructive and Auto Contrast is honest for baked backgrounds", () => {
  const metadata = detectStudioVisibleArtworkBounds(pixels(100, 100, [255, 255, 255, 255], { x: 20, y: 20, width: 60, height: 60, color: [8, 12, 20, 255] }));
  const contract = createIdentityVisualResourceFitContract();
  const auto = resolveStudioVisualResourceBackingPlate({ metadata, contract, requestedMode: "auto-contrast" });
  assert.equal(auto.resolvedColor, "transparent", "a plate must not pretend to remove source pixels");
  const dark = resolveStudioVisualResourceBackingPlate({ metadata, contract, requestedMode: "dark" });
  assert.equal(dark.resolvedColor, contract.backingPlate.darkColor);
  assert.equal(metadata.legibility?.detectedBackgroundColor, "#ffffff");
});

test("photographic/noisy edges fall back honestly to raw containment", () => {
  const source = pixels(12, 12, [0, 0, 0, 255], { x: 2, y: 2, width: 8, height: 8, color: [255, 255, 255, 255] });
  for (let x = 0; x < source.width; x += 1) source.data.set(x % 2 ? [255, 0, 0, 255] : [0, 0, 255, 255], x * 4);
  const result = detectStudioVisibleArtworkBounds(source);
  assert.equal(result.boundsSource, "raw");
  assert.equal(result.compatibility, "safe-fallback");
});

test("square, wide, and tall artwork preserve aspect ratio inside the governed safe area", () => {
  const contract = createIdentityVisualResourceFitContract();
  for (const [width, height] of [[100, 100], [240, 80], [80, 240]]) {
    const placement = resolveStudioVisualResourcePlacement({ slotWidth: 120, slotHeight: 120, intrinsicWidth: width, intrinsicHeight: height, contract });
    assert.equal(Math.round((placement.widthPx / placement.heightPx) * 1000), Math.round((width / height) * 1000));
    assert.ok(placement.widthPx <= 120 && placement.heightPx <= 120);
  }
});

test("committed zoom and focal treatment are clamped to slot governance", () => {
  const contract = createIdentityVisualResourceFitContract();
  const centered = resolveStudioVisualResourcePlacement({ slotWidth: 100, slotHeight: 100, intrinsicWidth: 100, intrinsicHeight: 100, requestedScale: 99, contract });
  const moved = resolveStudioVisualResourcePlacement({ slotWidth: 100, slotHeight: 100, intrinsicWidth: 100, intrinsicHeight: 100, requestedScale: 99, offsetX: 99, offsetY: -99, contract });
  assert.equal(moved.scale, contract.scale.max);
  assert.ok(moved.leftPx > centered.leftPx);
  assert.ok(moved.topPx < centered.topPx);
});

test("shared translation governance permits intentional framing but prevents invalid escape", () => {
  const contract = createIdentityVisualResourceFitContract();
  const bounds = resolveStudioVisualResourceTranslationBounds({ intrinsicWidth: 100, intrinsicHeight: 100, requestedScale: 1, contract });
  assert.ok(bounds.maxX > 0, "a contained identity has governed framing room");
  const crop = clampStudioVisualResourceCrop({ crop: { zoom: 1, offsetX: 9, offsetY: -9 }, intrinsicWidth: 100, intrinsicHeight: 100, contract });
  assert.equal(crop.offsetX, bounds.maxX);
  assert.equal(crop.offsetY, bounds.minY);
});

test("incompatible and safe-fallback Assets are reported rather than silently accepted", () => {
  const contract = createIdentityVisualResourceFitContract();
  assert.equal(studioVisualResourceCompatibility({ compatibility: "incompatible" }, contract).ok, false);
  const fallback = studioVisualResourceCompatibility({ compatibility: "safe-fallback" }, contract);
  assert.equal(fallback.ok, true);
  assert.ok("warning" in fallback);
});
