import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDeterministicAskPreview,
  detectConsequentialIntent,
  evaluateAskAction,
} from "@/lib/fusion/ask/policy";

describe("Ask TapConnect policy", () => {
  it("allows explain and draft transforms", () => {
    assert.equal(evaluateAskAction({ action: "explain" }).allowed, true);
    assert.equal(evaluateAskAction({ action: "draft_transform" }).allowed, true);
  });

  it("denies publish/send/charge/contact/assign without Owner controls", () => {
    for (const action of [
      "publish",
      "send",
      "charge",
      "contact_customers",
      "assign_tap_points",
      "irreversible_delete",
    ] as const) {
      const decision = evaluateAskAction({ action });
      assert.equal(decision.allowed, false);
      assert.equal(decision.requiresExplicitAuthorization, true);
    }
  });

  it("detects consequential intent from freeform prompts", () => {
    assert.equal(detectConsequentialIntent("Please publish this Card"), "publish");
    assert.equal(detectConsequentialIntent("Send email to everyone"), "send");
    assert.equal(detectConsequentialIntent("Assign tap point now"), "assign_tap_points");
  });

  it("builds proposal preview with sources, uncertainty, and blocks", () => {
    const blocked = buildDeterministicAskPreview({
      prompt: "Publish this now",
      workspace: "Card",
      aiLive: false,
    });
    assert.equal(blocked.blockedAction, "publish");
    assert.ok(blocked.blockedReason);

    const ok = buildDeterministicAskPreview({
      prompt: "Explain this screen",
      workspace: "/dashboard/card",
      selectionLabel: "Visit website",
      aiLive: false,
    });
    assert.equal(ok.blockedAction, null);
    assert.ok(ok.usedSources.some((s) => /Workspace/i.test(s)));
    assert.ok(ok.uncertain.some((s) => /not active/i.test(s)));
  });
});
