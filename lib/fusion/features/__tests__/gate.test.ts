import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkAnyFeatureGate,
  checkFeatureGate,
  featureGateJsonBody,
} from "../gate";
import { isFeatureEnabled } from "../resolve";
import { resolveSectionReadiness } from "../../readiness/display-status";
import { sectionsForDestination } from "../../studio/ia";

describe("feature gate helpers", () => {
  const disabledAutopilot = {
    overrides: [{ featureId: "ai.autopilot", enabled: false, scope: "global" }],
  };

  it("checkFeatureGate blocks when admin override disables feature", () => {
    const gate = checkFeatureGate("ai.autopilot", disabledAutopilot);
    assert.equal(gate.ok, false);
    if (!gate.ok) {
      assert.equal(gate.featureId, "ai.autopilot");
      assert.match(gate.message, /disabled/i);
    }
  });

  it("checkFeatureGate passes when feature enabled by default", () => {
    assert.equal(checkFeatureGate("audience.leads", {}).ok, true);
  });

  it("checkAnyFeatureGate passes when one of several features is on", () => {
    const gate = checkAnyFeatureGate(["comms.inbox", "comms.email"], {});
    assert.equal(gate.ok, true);
  });

  it("checkAnyFeatureGate blocks when all listed features are off", () => {
    const gate = checkAnyFeatureGate(["comms.inbox", "comms.email"], {
      overrides: [
        { featureId: "comms.inbox", enabled: false, scope: "global" },
        { featureId: "comms.email", enabled: false, scope: "global" },
      ],
    });
    assert.equal(gate.ok, false);
  });

  it("featureGateJsonBody matches API contract for kill-switch responses", () => {
    const gate = checkFeatureGate("wallet.apple_google", {
      overrides: [{ featureId: "wallet.apple_google", enabled: false, scope: "global" }],
    });
    assert.equal(gate.ok, false);
    if (!gate.ok) {
      const body = featureGateJsonBody(gate);
      assert.equal(body.code, "feature_off");
      assert.equal(body.feature, "wallet.apple_google");
      assert.equal(body.placeholder, true);
      assert.match(body.error, /wallet\.apple_google/);
    }
  });
});

describe("feature gate: deterministic scoped overrides", () => {
  const overrides = [
    { featureId: "card.studio.reconstitution_v1", enabled: true, scope: "global" },
    { featureId: "card.studio.reconstitution_v1", enabled: false, scope: "business:biz-1" },
    { featureId: "card.studio.reconstitution_v1", enabled: true, scope: "cohort:pilot" },
    { featureId: "card.studio.reconstitution_v1", enabled: false, scope: "user:user-1" },
  ];

  it("uses user then cohort then business then global precedence", () => {
    assert.equal(
      isFeatureEnabled("card.studio.reconstitution_v1", {
        overrides,
        subject: { userId: "user-1", businessId: "biz-1", cohortIds: ["pilot"] },
      }),
      false
    );
    assert.equal(
      isFeatureEnabled("card.studio.reconstitution_v1", {
        overrides,
        subject: { userId: "user-2", businessId: "biz-1", cohortIds: ["pilot"] },
      }),
      true
    );
    assert.equal(
      isFeatureEnabled("card.studio.reconstitution_v1", {
        overrides,
        subject: { userId: "user-2", businessId: "biz-1" },
      }),
      false
    );
    assert.equal(
      isFeatureEnabled("card.studio.reconstitution_v1", {
        overrides,
        subject: { userId: "user-2", businessId: "biz-2" },
      }),
      true
    );
  });

  it("is default-off when no matching scoped override exists", () => {
    assert.equal(
      isFeatureEnabled("card.studio.reconstitution_v1", {
        overrides: overrides.filter((override) => override.scope !== "global"),
        subject: { userId: "other", businessId: "other" },
      }),
      false
    );
  });

  it("ignores an unrelated scoped override instead of treating it as global", () => {
    assert.equal(
      isFeatureEnabled("card.studio.reconstitution_v1", {
        overrides: [{ featureId: "card.studio.reconstitution_v1", enabled: true, scope: "user:someone-else" }],
        subject: { userId: "user-1" },
      }),
      false
    );
  });
});

describe("feature gate: Studio IA readiness", () => {
  it("marks wallet section DISABLED when registry override is off", () => {
    const wallet = sectionsForDestination("audience").find((s) => s.id === "wallet");
    assert.ok(wallet);
    const readiness = resolveSectionReadiness(wallet, {
      overrides: [{ featureId: "wallet.apple_google", enabled: false, scope: "global" }],
    });
    assert.equal(readiness.display, "disabled");
    assert.equal(readiness.label, "DISABLED");
  });

  it("resolve + gate agree for journey.tapflow default-off without override", () => {
    assert.equal(isFeatureEnabled("journey.tapflow", {}), false);
    const tapflow = sectionsForDestination("experiences").find((s) => s.id === "tapflow");
    assert.ok(tapflow);
    const readiness = resolveSectionReadiness(tapflow, {});
    assert.equal(readiness.display, "disabled");
  });
});
