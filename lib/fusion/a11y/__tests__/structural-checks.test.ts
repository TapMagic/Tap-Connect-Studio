import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertA11yStructuralInventory, A11Y_STRUCTURAL_CHECKS } from "../structural-checks";

describe("a11y structural inventory", () => {
  it("lists studio surfaces for manual P-17 pairing", () => {
    const r = assertA11yStructuralInventory();
    assert.equal(r.ok, true);
    assert.ok(A11Y_STRUCTURAL_CHECKS.some((c) => c.id === "a11y-mytap-skip"));
  });
});
