import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const visualPartsBarrel = readFileSync(
  "lib/fusion/creative-studio/visual-parts/index.ts",
  "utf8",
);

describe("visual-parts production runtime boundary", () => {
  it("does not export the pngjs-backed visual comparison test helper", () => {
    assert.doesNotMatch(visualPartsBarrel, /image-parity/);
  });
});
