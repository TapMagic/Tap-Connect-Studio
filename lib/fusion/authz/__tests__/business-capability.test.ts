import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { roleHasBusinessCapability } from "../business-capability";

describe("onboarding business capabilities", () => {
  it("allows Owner and Manager approval and locking", () => {
    for (const role of ["OWNER", "MANAGER"] as const) {
      assert.equal(roleHasBusinessCapability(role, "knowledge.approve"), true);
      assert.equal(roleHasBusinessCapability(role, "brand.approve"), true);
      assert.equal(roleHasBusinessCapability(role, "brand.lock"), true);
    }
  });

  it("allows Marketing proposals but not approval or locking", () => {
    assert.equal(roleHasBusinessCapability("MARKETING", "knowledge.propose"), true);
    assert.equal(roleHasBusinessCapability("MARKETING", "card.draft.edit"), true);
    assert.equal(roleHasBusinessCapability("MARKETING", "knowledge.approve"), false);
    assert.equal(roleHasBusinessCapability("MARKETING", "brand.approve"), false);
    assert.equal(roleHasBusinessCapability("MARKETING", "brand.lock"), false);
  });

  it("keeps Viewer read-only and scanner out of onboarding", () => {
    assert.equal(roleHasBusinessCapability("VIEWER", "onboarding.read"), true);
    assert.equal(roleHasBusinessCapability("VIEWER", "onboarding.edit"), false);
    assert.equal(roleHasBusinessCapability("STAFF_SCANNER", "onboarding.read"), false);
  });
});
