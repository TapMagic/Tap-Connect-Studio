/**
 * Top Shelf Premium Action — content independence + recipe identity proofs.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PNG } from "pngjs";
import fs from "node:fs";
import path from "node:path";
import {
  applyTopShelfPremiumAction,
  CURATED_FAMILY_TOP_SHELF_PREMIUM_ACTION_ID,
  getVisualPart,
  readTopShelfParams,
  readVisualPartsState,
  resetTopShelfToCanonical,
  TOP_SHELF_ANCHOR_CHARCOAL,
  TOP_SHELF_ANCHOR_COBALT,
  TOP_SHELF_CANONICAL_RECIPE_ID,
  TOP_SHELF_COMPONENT_IDS,
  TOP_SHELF_PACKAGE_REFERENCE_PATH,
  TOP_SHELF_STUDIO_GOLDEN_PATH,
  writeTopShelfParams,
} from "../visual-parts";
import { comparePngBuffers } from "../visual-parts/image-parity";

describe("Top Shelf registry + recipe", () => {
  it("registers Enhanced family with canonical recipe id (approved→certified lifecycle)", () => {
    const family = getVisualPart(CURATED_FAMILY_TOP_SHELF_PREMIUM_ACTION_ID);
    assert.ok(family);
    assert.equal(family!.lifecycleStatus, "certified");
    assert.equal(family!.expressionTier, "enhanced");
    assert.equal(family!.canonicalRecipeId, TOP_SHELF_CANONICAL_RECIPE_ID);
    assert.equal(family!.payload.kind, "curated_family");
  });

  it("apply preserves content/Action fields exactly", () => {
    const before = {
      label: "Unlock Access",
      description: "Member benefits",
      icon: "lock",
      actionType: "website",
      href: "https://example.com/safe-test",
      accessibleLabel: "Unlock Access",
      trackingId: "trk-123",
      campaignId: "camp-9",
    };
    const next = applyTopShelfPremiumAction({ ...before }, "button");
    assert.equal(next.label, before.label);
    assert.equal(next.description, before.description);
    assert.equal(next.icon, before.icon);
    assert.equal(next.actionType, before.actionType);
    assert.equal(next.href, before.href);
    assert.equal(next.trackingId, before.trackingId);
    assert.equal(next.campaignId, before.campaignId);
    const state = readVisualPartsState(next);
    assert.equal(state.assemblyRecipeId, TOP_SHELF_CANONICAL_RECIPE_ID);
    assert.equal(state.curatedFamilyId, CURATED_FAMILY_TOP_SHELF_PREMIUM_ACTION_ID);
    assert.deepEqual(next.vpTopShelfComponentIds, { ...TOP_SHELF_COMPONENT_IDS });
  });

  it("parameter edits do not rewrite destinations; reset restores canonical", () => {
    let props = applyTopShelfPremiumAction(
      {
        label: "Unlock Access",
        description: "Member benefits",
        icon: "lock",
        actionType: "website",
        href: "https://example.com/safe-test",
      },
      "button"
    );
    props = writeTopShelfParams(props, {
      anchorColor: TOP_SHELF_ANCHOR_COBALT,
      iconRingPlacement: "left",
      haloIntensity: 0.85,
    });
    assert.equal(props.href, "https://example.com/safe-test");
    assert.equal(props.actionType, "website");
    assert.equal(readTopShelfParams(props).anchorColor, TOP_SHELF_ANCHOR_COBALT);
    assert.equal(readTopShelfParams(props).iconRingPlacement, "left");
    props = resetTopShelfToCanonical(props);
    assert.equal(props.href, "https://example.com/safe-test");
    assert.equal(props.label, "Unlock Access");
    assert.equal(readTopShelfParams(props).anchorColor, TOP_SHELF_ANCHOR_CHARCOAL);
    assert.equal(readTopShelfParams(props).iconRingPlacement, "right");
    assert.equal(readTopShelfParams(props).haloIntensity, 0.5);
  });
});

describe("Top Shelf reference regression gate", () => {
  it("preserves supplied package reference master (never overwritten)", () => {
    const packageMaster = path.join(process.cwd(), TOP_SHELF_PACKAGE_REFERENCE_PATH);
    const reviewCopy = path.join(
      process.cwd(),
      "tmp/top-shelf-first-component-slice/01-reference-supplied.png"
    );
    assert.ok(fs.existsSync(packageMaster), "package reference master missing");
    const buf = fs.readFileSync(packageMaster);
    const png = PNG.sync.read(buf);
    assert.ok(png.width >= 400 && png.height >= 200);
    assert.ok(buf.length > 100_000, "package reference appears truncated");
    if (fs.existsSync(reviewCopy)) {
      assert.equal(fs.readFileSync(reviewCopy).length, buf.length, "review copy drifted from package master");
    }
  });

  it("Studio-integrated golden retains layered Top Shelf appearance (no specimen frame)", () => {
    const goldenPath = path.join(process.cwd(), TOP_SHELF_STUDIO_GOLDEN_PATH);
    const livePath = path.join(
      process.cwd(),
      "tmp/top-shelf-first-component-slice/02-live-integrated-button.png"
    );
    assert.ok(fs.existsSync(goldenPath), "PO-approved Studio golden missing — regenerate isolate evidence");
    const golden = fs.readFileSync(goldenPath);
    const goldenPng = PNG.sync.read(golden);
    assert.ok(goldenPng.width > 80 && goldenPng.height > 40);

    let max = 0;
    let min = 255;
    let tintedHalo = 0;
    let brightEdge = 0;
    for (let i = 0; i < goldenPng.data.length; i += 4) {
      const r = goldenPng.data[i]!;
      const g = goldenPng.data[i + 1]!;
      const b = goldenPng.data[i + 2]!;
      const a = goldenPng.data[i + 3]!;
      if (a < 8) continue;
      const lum = Math.max(r, g, b);
      max = Math.max(max, lum);
      min = Math.min(min, lum);
      if (b > g + 8 && b > r + 4 && lum > 20 && lum < 180) tintedHalo += 1;
      if (lum > 200) brightEdge += 1;
    }
    assert.ok(max - min > 40, "golden looks flat — layered metallic/gloss missing");
    assert.ok(tintedHalo > 40, "golden missing ambient halo tint signature");
    assert.ok(brightEdge > 10, "golden missing upper gloss / bright edge pixels");

    if (!fs.existsSync(livePath)) return;
    const parity = comparePngBuffers(golden, fs.readFileSync(livePath), {
      maxChannelDelta: 36,
      maxDiffRatio: 0.08,
    });
    assert.ok(
      parity.ok,
      `live isolate drifted from Studio golden: ${parity.reason || ""} ratio=${(
        parity.differingPixels / Math.max(1, parity.comparedPixels)
      ).toFixed(4)}`
    );
  });
});


