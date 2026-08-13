import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  applyCosmicGlassSignature,
  COSMIC_GLASS_ASSETS,
  COSMIC_GLASS_CANONICAL_RECIPE_ID,
  COSMIC_GLASS_CURATED_FAMILY_ID,
  CURATED_FAMILY_COSMIC_GLASS_ID,
  getVisualPart,
  readCosmicGlassParams,
  readVisualPartsState,
  resetCosmicGlassToCanonical,
  writeCosmicGlassParams,
} from "../visual-parts";

describe("Cosmic Glass Signature recipe", () => {
  it("is filed in Curated → Signature with recovered recipe identity", () => {
    const family = getVisualPart(CURATED_FAMILY_COSMIC_GLASS_ID);
    assert.ok(family);
    assert.equal(family.collection, "tapconnect_signature");
    assert.equal(family.expressionTier, "signature");
    assert.equal(family.lifecycleStatus, "approved");
    assert.equal(family.canonicalRecipeId, COSMIC_GLASS_CANONICAL_RECIPE_ID);
  });

  it("preserves live identity, copy, accessible label, and Action exactly", () => {
    const before = {
      label: "Shop The Monkey Cage",
      eyebrow: "SIGNATURE ACTION",
      description: "One tap. Your world, connected.",
      iconMediaUrl: "/host-logo.png",
      actionType: "website",
      href: "https://example.com/monkey-cage",
      accessibleLabel: "Shop The Monkey Cage",
      trackingId: "trk-cosmic",
    };
    const next = applyCosmicGlassSignature(before, "button");
    for (const [key, value] of Object.entries(before)) assert.equal(next[key], value, key);
    const state = readVisualPartsState(next);
    assert.equal(state.curatedFamilyId, COSMIC_GLASS_CURATED_FAMILY_ID);
    assert.equal(state.assemblyRecipeId, COSMIC_GLASS_CANONICAL_RECIPE_ID);
    assert.equal(state.dividerLinePartId, "divider_cosmic_glass");
  });

  it("persists visual variants and reset never rewrites business content", () => {
    let props = applyCosmicGlassSignature({ label: "Call", actionType: "phone", phoneNumber: "+15555550123" });
    props = writeCosmicGlassParams(props, {
      ringFinish: "copper", ringShape: "soft_square", dividerCenter: "identity",
      identityBezel: "open_lens", identityScale: 1.12, identityFit: "cover",
      dividerScale: .9, dividerSpan: .84, dividerPositionX: .2, dividerIntensity: .72, dividerOpacity: .86,
    });
    const customized = readCosmicGlassParams(props);
    assert.deepEqual(
      (({ ringFinish, ringShape, dividerCenter, identityBezel, identityScale, identityFit, dividerScale, dividerSpan, dividerPositionX, dividerIntensity, dividerOpacity }) =>
        ({ ringFinish, ringShape, dividerCenter, identityBezel, identityScale, identityFit, dividerScale, dividerSpan, dividerPositionX, dividerIntensity, dividerOpacity }))(customized),
      { ringFinish: "copper", ringShape: "soft_square", dividerCenter: "identity", identityBezel: "open_lens", identityScale: 1.12, identityFit: "cover", dividerScale: .9, dividerSpan: .84, dividerPositionX: .2, dividerIntensity: .72, dividerOpacity: .86 }
    );
    props = JSON.parse(JSON.stringify(props)) as Record<string, unknown>;
    assert.equal(readCosmicGlassParams(props).ringFinish, "copper");
    assert.equal(readCosmicGlassParams(props).identityBezel, "open_lens");
    assert.equal(readCosmicGlassParams(props).identityScale, 1.12);
    assert.equal(readCosmicGlassParams(props).dividerSpan, .84);
    props = resetCosmicGlassToCanonical(props);
    assert.equal(props.phoneNumber, "+15555550123");
    assert.equal(props.actionType, "phone");
    assert.equal(readCosmicGlassParams(props).ringFinish, "gold");
    assert.equal(readCosmicGlassParams(props).identityBezel, "medallion");
    assert.equal(readCosmicGlassParams(props).dividerSpan, 1);
  });

  it("preserves the recovered finished divider assets verbatim", () => {
    for (const asset of Object.values(COSMIC_GLASS_ASSETS)) {
      const file = path.join(process.cwd(), "public", asset.replace(/^\//, ""));
      assert.ok(fs.existsSync(file), `${asset} missing`);
      const svg = fs.readFileSync(file, "utf8");
      assert.match(svg, /<svg/);
    }
    const left = fs.readFileSync(path.join(process.cwd(), "public", COSMIC_GLASS_ASSETS.leftRod.slice(1)), "utf8");
    assert.match(left, /energy wisps|cgWisp/);
    assert.doesNotMatch(left, /<script/i);
  });

  it("keeps one adaptive receiver authority beneath round and non-round rings", () => {
    const css = fs.readFileSync(
      path.join(process.cwd(), "lib/fusion/creative-studio/visual-parts/packages/cosmic-glass/cosmic-glass.css"),
      "utf8"
    );
    assert.match(css, /\.cg-ring-receiver\s*\{/);
    assert.match(css, /data-cg-ring-shape="soft_square"[^}]*\.cg-ring-receiver/);
    assert.match(css, /\.cg-ring-contact-shadow/);
    assert.match(css, /\.cg-action > \.cg-chassis/);
  });
});
