import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createEmptyJourney,
  executeJourneyDryRun,
  journeyIsValid,
  simulateJourney,
  transitionJourneyLifecycle,
  validateJourney,
  type JourneyDefinition,
} from "../index";

function branchedJourney(): JourneyDefinition {
  return {
    schemaVersion: 1,
    name: "Consent branch",
    nodes: [
      {
        id: "t1",
        type: "trigger",
        label: "Tap",
        config: { event: "tap" },
        position: { x: 0, y: 0 },
      },
      {
        id: "c1",
        type: "condition",
        label: "Has marketing consent?",
        config: { expression: "consent.marketing" },
        position: { x: 100, y: 0 },
      },
      {
        id: "m1",
        type: "message",
        label: "Promo",
        config: { channel: "email", body: "Hi" },
        position: { x: 200, y: 0 },
      },
      {
        id: "e1",
        type: "email",
        label: "Welcome email",
        config: { subject: "Welcome" },
        position: { x: 200, y: 80 },
      },
      {
        id: "a1",
        type: "award_loyalty",
        label: "Award",
        config: { points: 25 },
        position: { x: 300, y: 0 },
      },
      {
        id: "x1",
        type: "exit",
        label: "Done",
        config: {},
        position: { x: 400, y: 0 },
      },
    ],
    edges: [
      { id: "e_t_c", from: "t1", to: "c1" },
      { id: "e_c_m", from: "c1", to: "m1", label: "true" },
      { id: "e_c_mail", from: "c1", to: "e1", label: "false" },
      { id: "e_m_a", from: "m1", to: "a1" },
      { id: "e_mail_x", from: "e1", to: "x1" },
      { id: "e_a_x", from: "a1", to: "x1" },
    ],
  };
}

describe("journey validation", () => {
  it("accepts empty starter journey", () => {
    const def = createEmptyJourney("Test");
    assert.equal(journeyIsValid(def), true);
    assert.equal(validateJourney(def).filter((i) => i.severity === "error").length, 0);
  });

  it("rejects missing entry", () => {
    const def: JourneyDefinition = {
      schemaVersion: 1,
      name: "Broken",
      nodes: [{ id: "x", type: "exit", label: "X", config: {}, position: { x: 0, y: 0 } }],
      edges: [],
    };
    assert.equal(journeyIsValid(def), false);
    assert.ok(validateJourney(def).some((i) => i.code === "missing_entry"));
  });

  it("flags dangling edges", () => {
    const def = createEmptyJourney();
    def.edges.push({ id: "bad", from: "missing", to: "exit_1" });
    assert.equal(journeyIsValid(def), false);
  });
});

describe("journey simulation", () => {
  it("walks first-edge sample path to exit", () => {
    const result = simulateJourney(createEmptyJourney());
    assert.equal(result.completed, true);
    assert.deepEqual(
      result.steps.map((s) => s.nodeType),
      ["trigger", "exit"]
    );
  });
});

describe("journey runtime dry-run", () => {
  it("emits events for trigger → condition → message → award → exit", () => {
    const result = executeJourneyDryRun(branchedJourney(), {
      consent: { marketing: true, email: true },
      preferBranch: "true",
    });
    assert.equal(result.ok, true);
    assert.equal(result.completed, true);
    assert.ok(result.path.includes("m1"));
    assert.ok(result.events.some((e) => e.action === "award_loyalty"));
    assert.ok(result.events.some((e) => e.action === "exit"));
  });

  it("takes false branch to email node when no marketing consent", () => {
    const result = executeJourneyDryRun(branchedJourney(), {
      consent: { marketing: false, email: true },
      preferBranch: "false",
    });
    assert.equal(result.completed, true);
    assert.ok(result.path.includes("e1"));
    assert.ok(result.events.some((e) => e.action === "email"));
  });

  it("refuses invalid definitions when requireValid", () => {
    const bad: JourneyDefinition = {
      schemaVersion: 1,
      name: "",
      nodes: [],
      edges: [],
    };
    const result = executeJourneyDryRun(bad, {}, { requireValid: true });
    assert.equal(result.ok, false);
    assert.ok(result.issues.length > 0);
    assert.ok(result.events.some((e) => e.action === "error" || e.type === "error"));
  });
});

describe("journey lifecycle transitions", () => {
  it("draft → publish → activate → pause → resume", () => {
    const status = "DRAFT" as const;
    const pub = transitionJourneyLifecycle(status, "publish");
    assert.equal(pub.ok, true);
    if (!pub.ok) return;
    assert.equal(pub.status, "PUBLISHED");

    const act = transitionJourneyLifecycle(pub.status, "activate");
    assert.equal(act.ok, true);
    if (!act.ok) return;
    assert.equal(act.status, "ACTIVE");

    const pause = transitionJourneyLifecycle(act.status, "pause");
    assert.equal(pause.ok, true);
    if (!pause.ok) return;
    assert.equal(pause.status, "PAUSED");

    const resume = transitionJourneyLifecycle(pause.status, "resume");
    assert.equal(resume.ok, true);
    if (!resume.ok) return;
    assert.equal(resume.status, "ACTIVE");
  });

  it("blocks resume from draft", () => {
    const result = transitionJourneyLifecycle("DRAFT", "resume");
    assert.equal(result.ok, false);
  });

  it("blocks pause from draft", () => {
    const result = transitionJourneyLifecycle("DRAFT", "pause");
    assert.equal(result.ok, false);
  });
});
