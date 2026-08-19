import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CONTROL_SERVICE_CATALOG,
  seededPlanServiceEnabled,
} from "@/lib/control/bootstrap";
import { CABINET_NOIR_ENTITLEMENT_KEY } from "@/lib/fusion/creative-studio/signature-assets/cabinet-noir";

describe("Signature family Control entitlement catalog", () => {
  it("registers the canonical family entitlement key as a customer-visible Creative service", () => {
    const entry = CONTROL_SERVICE_CATALOG.find(([key]) => key === CABINET_NOIR_ENTITLEMENT_KEY);
    assert.deepEqual(entry, [
      CABINET_NOIR_ENTITLEMENT_KEY,
      "Cabinet Noir Signature family",
      "Creative",
      true,
    ]);
  });

  it("grants the service to seeded safe demo/test workspaces", () => {
    assert.equal(seededPlanServiceEnabled(CABINET_NOIR_ENTITLEMENT_KEY, false), true);
  });

  it("grants the service to seeded internal workspaces", () => {
    assert.equal(seededPlanServiceEnabled(CABINET_NOIR_ENTITLEMENT_KEY, true), true);
  });

  it("does not weaken the external-effect restrictions of safe seeded plans", () => {
    assert.equal(seededPlanServiceEnabled("campaign_send", false), false);
    assert.equal(seededPlanServiceEnabled("email_send", false), false);
  });
});
