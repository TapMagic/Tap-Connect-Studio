import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { listRegistryStatus } from "../resolve";
import {
  describeActivationState,
  isKillSwitchFeature,
  killSwitchConfirmTitle,
  requiresToggleConfirm,
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

  it("requires confirm for kill-switch and GA default-on disable", () => {
    assert.equal(requiresToggleConfirm(messaging, false), true);
    assert.equal(requiresToggleConfirm(messaging, true), false);
    assert.equal(requiresToggleConfirm(card, false), true);
    assert.equal(requiresToggleConfirm(card, true), false);
  });

  it("formats kill-switch confirm title", () => {
    assert.equal(killSwitchConfirmTitle("TapInbox"), "Confirm kill-switch — TapInbox");
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
