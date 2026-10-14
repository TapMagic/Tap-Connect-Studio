import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";
import {
  backgroundRecipeCacheKey,
  normalizeBackgroundRecipe,
  renderBackgroundVariant,
} from "@/lib/media/background-treatment";

async function fixture(): Promise<Buffer> {
  const width = 12;
  const height = 12;
  const data = Buffer.alloc(width * height * 4, 255);
  for (let y = 3; y <= 8; y += 1) {
    for (let x = 3; x <= 8; x += 1) {
      const offset = (y * width + x) * 4;
      data[offset] = 25;
      data[offset + 1] = 25;
      data[offset + 2] = 25;
    }
  }
  // A white engraved detail enclosed by the subject must not be treated as exterior.
  const detail = (5 * width + 5) * 4;
  data[detail] = 255;
  data[detail + 1] = 255;
  data[detail + 2] = 255;
  return sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

describe("durable background treatment", () => {
  it("removes only border-connected background in automatic mode", async () => {
    const result = await renderBackgroundVariant(await fixture(), {
      mode: "auto",
      tolerance: 25,
      featherPx: 0,
      edgeCleanup: 0,
      colorDecontamination: 0,
      transparencyThreshold: 8,
      strokes: [],
    });
    const decoded = await sharp(result.bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(decoded.data[3], 0);
    assert.equal(decoded.data[(4 * decoded.info.width + 4) * 4 + 3], 255);
    assert.equal(decoded.data[(5 * decoded.info.width + 5) * 4 + 3], 255);
  });

  it("supports exact solid-color removal and Keep refinement without mutating source bytes", async () => {
    const source = await fixture();
    const sourceHash = Buffer.from(source);
    const result = await renderBackgroundVariant(source, {
      mode: "solid-color",
      targetColor: "#ffffff",
      tolerance: 10,
      featherPx: 0,
      edgeCleanup: 0,
      colorDecontamination: 0,
      transparencyThreshold: 8,
      strokes: [{ intent: "keep", radius: 0.08, points: [{ x: 5 / 11, y: 5 / 11 }] }],
    });
    const decoded = await sharp(result.bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(decoded.data[3], 0);
    assert.equal(decoded.data[(5 * decoded.info.width + 5) * 4 + 3], 255);
    assert.deepEqual(source, sourceHash);
  });

  it("normalizes recipes and produces stable cache identities", () => {
    const recipe = normalizeBackgroundRecipe({ mode: "auto", tolerance: 36 });
    const asset = { id: "asset-1", contentHash: "source-hash" };
    assert.equal(backgroundRecipeCacheKey(asset, recipe), backgroundRecipeCacheKey(asset, recipe));
    assert.notEqual(
      backgroundRecipeCacheKey(asset, recipe),
      backgroundRecipeCacheKey(asset, { ...recipe, tolerance: 37 }),
    );
  });
});
