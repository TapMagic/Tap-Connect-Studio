import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyJourneyPatch,
  analyzeJourney,
  canConnectNodes,
  describeJourneyDiff,
  reviewJourney,
} from "../review";
import { createEmptyJourney, type JourneyDefinition } from "../types";

function deadEndJourney(): JourneyDefinition {
  return {
    schemaVersion: 1,
    name: "Dead end",
    nodes: [
      {
        id: "t1",
        type: "trigger",
        label: "Tap",
        config: {},
        position: { x: 0, y: 0 },
      },
      {
        id: "m1",
        type: "message",
        label: "Hello",
        config: { body: "Hi" },
        position: { x: 200, y: 0 },
      },
    ],
    edges: [{ id: "e1", from: "t1", to: "m1" }],
  };
}

describe("journey review (deterministic rules)", () => {
  it("detects dead ends and missing exit", () => {
    const findings = analyzeJourney(deadEndJourney());
    assert.ok(findings.some((f) => f.code === "dead_end"));
    assert.ok(findings.some((f) => f.code === "missing_exit"));
  });

  it("proposes fixes without mutating the original", () => {
    const original = deadEndJourney();
    const snapshot = JSON.stringify(original);
    const result = reviewJourney(original);
    assert.equal(JSON.stringify(original), snapshot);
    assert.ok(result.proposal);
    assert.ok((result.proposal?.proposedOps.length ?? 0) > 0);
    assert.ok(result.customerSummary.length > 10);
  });

  it("supports partial accept of proposed ops", () => {
    const original = deadEndJourney();
    const { proposal } = reviewJourney(original);
    assert.ok(proposal);
    const onlyFirst = applyJourneyPatch(original, proposal!.proposedOps, [0]);
    assert.notEqual(JSON.stringify(onlyFirst), JSON.stringify(original));
    const all = applyJourneyPatch(original, proposal!.proposedOps);
    assert.ok(all.nodes.length >= onlyFirst.nodes.length);
    const diff = describeJourneyDiff(original, all, proposal!.proposedOps);
    assert.ok(diff.opSummaries.length === proposal!.proposedOps.length);
  });

  it("rejects invalid edges", () => {
    const def = createEmptyJourney();
    const exit = def.nodes.find((n) => n.type === "exit")!;
    const trigger = def.nodes.find((n) => n.type === "trigger")!;
    assert.equal(canConnectNodes(def, exit.id, trigger.id).ok, false);
    assert.equal(canConnectNodes(def, trigger.id, trigger.id).ok, false);
  });

  it("marks consent findings on message without consent flags", () => {
    const def = deadEndJourney();
    const findings = analyzeJourney(def);
    assert.ok(findings.some((f) => f.code === "consent_guardian"));
  });

  it("simulates multiple branch scenarios in review", () => {
    const def: JourneyDefinition = {
      schemaVersion: 1,
      name: "Branched",
      nodes: [
        { id: "t1", type: "trigger", label: "Tap", config: {}, position: { x: 0, y: 0 } },
        {
          id: "c1",
          type: "condition",
          label: "Consent?",
          config: {},
          position: { x: 100, y: 0 },
        },
        {
          id: "m1",
          type: "message",
          label: "Yes path",
          config: { requireConsent: true, consentAware: true },
          position: { x: 200, y: -40 },
        },
        {
          id: "m2",
          type: "message",
          label: "No path",
          config: { requireConsent: true, consentAware: true },
          position: { x: 200, y: 40 },
        },
        { id: "x1", type: "exit", label: "Done", config: {}, position: { x: 360, y: 0 } },
      ],
      edges: [
        { id: "e1", from: "t1", to: "c1" },
        { id: "e2", from: "c1", to: "m1", label: "yes" },
        { id: "e3", from: "c1", to: "m2", label: "no" },
        { id: "e4", from: "m1", to: "x1" },
        { id: "e5", from: "m2", to: "x1" },
      ],
    };
    const result = reviewJourney(def);
    assert.ok(result.simulationPaths.length >= 2);
  });
});
