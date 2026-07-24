/**
 * Unit tests for persisted promotion + TapFlow canvas bridge (memory path).
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  addStickyNote,
  createSketchBoard,
  createTapflowFromCanvas,
  previewPromotion,
  promoteSketchNodes,
  resetCanvasMemory,
  setCanvasMode,
} from "../index";
import { transitionJourneyLifecycle } from "@/lib/fusion/journey/lifecycle";
import { createEmptyJourney } from "@/lib/fusion/journey/types";
import { journeyIsValid, validateJourney } from "@/lib/fusion/journey/validation";
import { executeJourneyDryRun, SAMPLE_VISITOR } from "@/lib/fusion/journey/runtime";
import { planJourneyRecovery, recoverJourneyDryRun } from "@/lib/fusion/journey/recovery";
import { buildJourneyAnalyticsOverlay } from "@/lib/fusion/journey/analytics";

const BIZ = "biz_canvas_ab_test";
const originalUrl = process.env.DATABASE_URL;

describe("TapCanvas promotion + TapFlow bridge (A+B)", () => {
  beforeEach(() => {
    resetCanvasMemory();
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    resetCanvasMemory();
    if (originalUrl !== undefined) process.env.DATABASE_URL = originalUrl;
    else delete process.env.DATABASE_URL;
  });

  it("promote preview lists promotable sketch nodes without executing", () => {
    const canvas = createSketchBoard({ businessId: BIZ });
    const { node } = addStickyNote(canvas.id, "Weekly special idea");
    const preview = previewPromotion(canvas.id, [node.id]);
    assert.ok(preview.promotable.includes(node.id));
    assert.equal(node.data?.executes, false);
  });

  it("promote sets planningOnly and does not auto-execute", () => {
    const canvas = createSketchBoard({ businessId: BIZ });
    setCanvasMode(canvas.id, "build");
    const { node } = addStickyNote(canvas.id, "Promo");
    const result = promoteSketchNodes({
      canvasId: canvas.id,
      nodeIds: [node.id],
      confirm: true,
      businessId: BIZ,
    });
    assert.equal(result.ok, true);
    const promoted = result.canvas.nodes.find((n) => n.id === node.id);
    assert.equal(promoted?.sketch, false);
    assert.equal(promoted?.data?.executes, false);
    assert.equal(promoted?.data?.planningOnly, true);
  });

  it("createTapflowFromCanvas binds DRAFT without isolated DB (memory stub)", async () => {
    const canvas = createSketchBoard({ businessId: BIZ });
    setCanvasMode(canvas.id, "build");
    const result = await createTapflowFromCanvas({
      businessId: BIZ,
      canvasId: canvas.id,
      name: "Bridge flow",
      simulate: true,
    });
    assert.equal(result.ok, true);
    assert.equal(result.lifecycleStatus, "DRAFT");
    assert.equal(result.persistence, "memory_stub");
    assert.ok(result.journeyDraftId);
    const node = result.canvas.nodes.find((n) => n.id === result.nodeId);
    assert.equal(node?.kind, "tapflow");
    assert.equal(node?.data?.executes, false);
    assert.equal(result.simulate?.stub, false);
    assert.ok(result.simulate?.dryRun);
  });

  it("shared journey engine validates, dry-runs, recovers, analytics", () => {
    const def = createEmptyJourney("Unit journey");
    // Expand with branch + email + loyalty + handoff + case for matrix coverage
    def.nodes = [
      {
        id: "t1",
        type: "trigger",
        label: "Tap",
        config: { event: "tap" },
        position: { x: 0, y: 0 },
      },
      {
        id: "b1",
        type: "branch",
        label: "Consent?",
        config: { attribute: "consent.marketing", equals: true },
        position: { x: 100, y: 0 },
      },
      {
        id: "w1",
        type: "wait",
        label: "Wait",
        config: { seconds: 5 },
        position: { x: 200, y: 0 },
      },
      {
        id: "e1",
        type: "email",
        label: "Email",
        config: { requiresConsent: true },
        position: { x: 300, y: 0 },
      },
      {
        id: "l1",
        type: "award_loyalty",
        label: "Loyalty",
        config: { points: 10 },
        position: { x: 400, y: 0 },
      },
      {
        id: "c1",
        type: "create_case",
        label: "TapCase",
        config: {},
        position: { x: 500, y: 0 },
      },
      {
        id: "h1",
        type: "human_handoff",
        label: "Handoff",
        config: {},
        position: { x: 600, y: 0 },
      },
      {
        id: "x1",
        type: "exit",
        label: "Done",
        config: {},
        position: { x: 700, y: 0 },
      },
    ];
    def.edges = [
      { id: "e1", from: "t1", to: "b1" },
      { id: "e2", from: "b1", to: "w1", label: "true" },
      { id: "e3", from: "w1", to: "e1" },
      { id: "e4", from: "e1", to: "l1" },
      { id: "e5", from: "l1", to: "c1" },
      { id: "e6", from: "c1", to: "h1" },
      { id: "e7", from: "h1", to: "x1" },
    ];

    const issues = validateJourney(def);
    assert.equal(journeyIsValid(def), true, JSON.stringify(issues));

    const blocked = executeJourneyDryRun(
      def,
      { ...SAMPLE_VISITOR, consent: { email: false, marketing: false, sms: false } },
      { requireValid: false }
    );
    assert.ok(!blocked.completed || blocked.blockedAt || blocked.events.some((e) => e.blocked));

    const plan = planJourneyRecovery(blocked);
    const recovered = recoverJourneyDryRun(def, blocked, {
      ...plan.suggestedPatch,
      operatorBypassGuardian: true,
      consent: { email: true, marketing: true, sms: true },
    });
    assert.ok(recovered.path.length >= 1);

    const overlay = buildJourneyAnalyticsOverlay(def, [
      {
        journeyName: def.name,
        status: recovered.completed ? "completed" : "blocked",
        path: recovered.path,
        dryRun: true,
      },
    ]);
    assert.equal(overlay.evidence, "confirmed");
    assert.ok(overlay.nodeVisitEstimates.length >= 1);

    const pub = transitionJourneyLifecycle("DRAFT", "publish");
    assert.equal(pub.ok, true);
    if (pub.ok) {
      const act = transitionJourneyLifecycle(pub.status, "activate");
      assert.equal(act.ok, true);
      if (act.ok) {
        const pause = transitionJourneyLifecycle(act.status, "pause");
        assert.equal(pause.ok, true);
        if (pause.ok) {
          const resume = transitionJourneyLifecycle(pause.status, "resume");
          assert.equal(resume.ok, true);
        }
      }
    }
  });
});
