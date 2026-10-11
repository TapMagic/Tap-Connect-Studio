import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const visualPartsBarrel = readFileSync(
  "lib/fusion/creative-studio/visual-parts/index.ts",
  "utf8",
);
const productionTypeScriptConfig = JSON.parse(
  readFileSync("tsconfig.json", "utf8"),
) as { exclude?: string[] };

describe("visual-parts production runtime boundary", () => {
  it("does not export the pngjs-backed visual comparison test helper", () => {
    assert.doesNotMatch(visualPartsBarrel, /image-parity/);
  });

  it("keeps test-only sources out of the production Next.js typecheck", () => {
    assert.ok(productionTypeScriptConfig.exclude?.includes("e2e"));
    assert.ok(productionTypeScriptConfig.exclude?.includes("**/__tests__/**"));
    assert.ok(
      productionTypeScriptConfig.exclude?.includes(
        "lib/fusion/creative-studio/visual-parts/image-parity.ts",
      ),
    );
  });
});
