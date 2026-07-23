import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { listRegistryStatus } from "../resolve";
import {
  describeActivationState,
  isKillSwitchFeature,
  toggleButtonLabel,
  toggleImpactWarning,
} from "../admin-copy";

describe("Feature registry admin copy", () => {
  const rows = listRegistryStatus({ internalOperator: true });
  const messaging = rows.find((r) => r.id === "comms.messaging")!;
  const card = rows.find((r) => r.id === "card.builder.v1")!;

  it("marks kill-switch features", () => {
    assert.equal(isKillSwitchFeature("comms.messaging"), true);
    assert.equal(isKillSwitchFeature("card.builder.v1"), false);
  });

  it("uses kill-switch label when disabling messaging", () => {
    assert.equal(toggleButtonLabel({ ...messaging, enabled: true }), "Kill-switch OFF");
    assert.equal(toggleButtonLabel({ ...messaging, enabled: false }), "Turn ON");
  });

  it("uses disable label for non kill-switch features", () => {
    assert.equal(toggleButtonLabel({ ...card, enabled: true }), "Disable");
  });

  it("warns on kill-switch disable", () => {
    const warning = toggleImpactWarning(messaging, false);
    assert.ok(warning);
    assert.match(warning!, /Kill-switch/);
  });

  it("describes activation when on but not executable", () => {
    const copy = describeActivationState({
      ...messaging,
      enabled: true,
      executable: false,
    });
    assert.match(copy, /Switch ON/);
  });
});
