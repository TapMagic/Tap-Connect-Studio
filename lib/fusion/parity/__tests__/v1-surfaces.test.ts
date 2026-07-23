import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertV1ParityInventoryComplete, V1_PARITY_SURFACES } from "../v1-surfaces";

describe("V1 parity inventory", () => {
  it("includes builder campaigns scan and public tap", () => {
    const result = assertV1ParityInventoryComplete();
    assert.equal(result.ok, true);
    assert.ok(V1_PARITY_SURFACES.some((s) => s.route.includes("builder")));
  });
});
