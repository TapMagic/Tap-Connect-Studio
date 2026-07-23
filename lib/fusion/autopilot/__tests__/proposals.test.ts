import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { createProposal, decideProposal, resetProposalMemory } from "../proposals";
import { canApplyArtifacts, transitionProposal } from "../types";

describe("autopilot proposal lifecycle", () => {
  beforeEach(() => resetProposalMemory());

  it("accepts then undoes", async () => {
    const created = await createProposal({
      id: "prop_1",
      businessId: "biz_1",
      recipeId: "campaign_draft_v1",
      mode: "recommend",
      prompt: "Weekend promo",
      summary: "Test proposal",
      artifacts: [{ kind: "theme", label: "Theme", payload: {} }],
    });
    assert.equal(created.status, "pending");

    const accepted = await decideProposal({
      proposalId: "prop_1",
      businessId: "biz_1",
      action: { type: "accept" },
    });
    assert.equal(accepted.ok, true);
    if (!accepted.ok) return;
    assert.equal(accepted.proposal.status, "accepted");

    const undone = await decideProposal({
      proposalId: "prop_1",
      businessId: "biz_1",
      action: { type: "undo" },
    });
    assert.equal(undone.ok, true);
    if (!undone.ok) return;
    assert.equal(undone.proposal.status, "undone");
  });

  it("rejects pending proposals", async () => {
    await createProposal({
      id: "prop_2",
      businessId: "biz_1",
      recipeId: "campaign_draft_v1",
      mode: "recommend",
      prompt: "x",
      summary: "y",
      artifacts: [],
    });
    const rejected = await decideProposal({
      proposalId: "prop_2",
      businessId: "biz_1",
      action: { type: "reject" },
    });
    assert.equal(rejected.ok, true);
    if (!rejected.ok) return;
    assert.equal(rejected.proposal.status, "rejected");
  });

  it("partial-accepts selected artifact kinds", async () => {
    await createProposal({
      id: "prop_3",
      businessId: "biz_1",
      recipeId: "campaign_draft_v1",
      mode: "recommend",
      prompt: "x",
      summary: "y",
      artifacts: [
        { kind: "campaign_draft", label: "Draft", payload: {} },
        { kind: "theme", label: "Theme", payload: {} },
      ],
    });
    const partial = await decideProposal({
      proposalId: "prop_3",
      businessId: "biz_1",
      action: { type: "partial", artifactKinds: ["campaign_draft"] },
    });
    assert.equal(partial.ok, true);
    if (!partial.ok) return;
    assert.equal(partial.proposal.status, "partial");
    assert.deepEqual(partial.proposal.acceptedArtifactKinds, ["campaign_draft"]);
    assert.equal(canApplyArtifacts("partial"), true);
  });

  it("blocks invalid accept after reject via state machine", () => {
    const result = transitionProposal("rejected", { type: "accept" });
    assert.equal(result.ok, false);
  });

  it("re-accepts after undo", () => {
    const result = transitionProposal("undone", { type: "accept" });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.status, "accepted");
  });
});
