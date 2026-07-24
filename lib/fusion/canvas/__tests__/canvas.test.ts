import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  addConversationalAction,
  addNode,
  addStickyNote,
  applyNodeEditToAuthoritative,
  assertSketchNonExecuting,
  connectSketch,
  createSketchBoard,
  createWeeklySpecialsGroup,
  detectIssues,
  detectScheduleConflicts,
  ensureExternalWorkItemNode,
  evaluateCanvasAction,
  listCanvasAudit,
  previewAutomationProposal,
  promoteSketchNodes,
  resetCanvasMemory,
  resolveAutomationProposal,
  reverseEngineerIntoCanvas,
  setCanvasMode,
  simulateDeployment,
  syncExternalWorkItemToNodes,
  syncNodesFromObject,
  undoPromotion,
} from "../index";
import {
  connectWorkProvider,
  createExternalWorkItem,
  resetProductivityMemory,
} from "@/lib/fusion/connectors/productivity";

const BIZ = "biz_canvas_test";

describe("TapCanvas", () => {
  beforeEach(() => {
    resetCanvasMemory();
    resetProductivityMemory();
  });

  it("sketch create — stickies and connectors do not execute", () => {
    const canvas = createSketchBoard({ businessId: BIZ, name: "Sketch A" });
    assert.equal(canvas.mode, "sketch");
    const a = addStickyNote(canvas.id, "Idea A");
    const b = addStickyNote(canvas.id, "Idea B");
    const edge = connectSketch(canvas.id, a.node.id, b.node.id, "maybe");
    assert.equal(edge.edge.sketch, true);
    const guard = assertSketchNonExecuting(a.canvas);
    assert.equal(guard.ok, true);
    assert.ok(guard.sketchNodeCount >= 2);
    assert.equal(a.node.data?.executes, false);
  });

  it("promotion requires confirm and supports undo via version", () => {
    const canvas = createSketchBoard({ businessId: BIZ });
    setCanvasMode(canvas.id, "build");
    const { node } = addStickyNote(canvas.id, "Promo campaign");
    const denied = promoteSketchNodes({
      canvasId: canvas.id,
      nodeIds: [node.id],
      confirm: false,
    });
    assert.equal(denied.ok, false);

    connectWorkProvider({ businessId: BIZ, provider: "monday" });
    const promoted = promoteSketchNodes({
      canvasId: canvas.id,
      nodeIds: [node.id],
      confirm: true,
      createApprovalTasks: true,
      businessId: BIZ,
    });
    assert.equal(promoted.ok, true);
    assert.ok(promoted.promoted.length >= 1);
    assert.ok(promoted.undoVersionId);

    const undone = undoPromotion(canvas.id, promoted.undoVersionId);
    const stickyAgain = undone.nodes.find((n) => n.id === node.id);
    assert.ok(stickyAgain?.sketch === true || stickyAgain?.kind === "sticky");
  });

  it("weekly-specials group creation with approval ExternalWorkItem", () => {
    const result = createWeeklySpecialsGroup({
      businessId: BIZ,
      name: "Weeklies",
    });
    assert.equal(result.readiness.ok, true);
    assert.ok(result.createdObjectStubs.some((s) => s.type === "campaign_group"));
    assert.ok(result.createdObjectStubs.filter((s) => s.type === "campaign").length >= 6);
    assert.ok(result.workItemIds.length >= 1);
    assert.ok(
      result.canvas.nodes.some((n) => n.kind === "external_work_item")
    );
    assert.ok(
      result.canvas.nodes.every(
        (n) => n.kind !== "tap_point" || n.data?.deviceUrlImmutable === true
      )
    );
  });

  it("reverse visualization projects objects into analyze mode", () => {
    const canvas = reverseEngineerIntoCanvas({
      businessId: BIZ,
      objects: [
        { type: "campaign", id: "c1", label: "Camp", status: "live" },
        {
          type: "external_work_item",
          id: "w1",
          label: "Task",
          provider: "asana",
          status: "open",
        },
      ],
      associations: [{ fromId: "c1", toId: "w1", label: "approval" }],
    });
    assert.equal(canvas.mode, "analyze");
    assert.equal(canvas.nodes.length, 2);
    assert.equal(canvas.edges.length, 1);
    assert.ok(canvas.nodes.every((n) => n.linked));
  });

  it("link sync is bidirectional with confirm gate", () => {
    const canvas = createSketchBoard({ businessId: BIZ });
    connectWorkProvider({ businessId: BIZ, provider: "monday" });
    const work = createExternalWorkItem({
      provider: "monday",
      businessId: BIZ,
      title: "Review",
      sourceType: "manual",
    });
    assert.equal(work.ok, true);
    if (!work.ok) return;

    const withNode = ensureExternalWorkItemNode({
      canvasId: canvas.id,
      workItem: work.data,
    });
    const node = withNode.nodes.find((n) => n.linked?.id === work.data.id);
    assert.ok(node);

    const denied = applyNodeEditToAuthoritative({
      canvasId: canvas.id,
      nodeId: node!.id,
      patch: { label: "Renamed" },
      confirm: false,
    });
    assert.equal(denied.ok, false);

    const applied = applyNodeEditToAuthoritative({
      canvasId: canvas.id,
      nodeId: node!.id,
      patch: { label: "Renamed", status: "done" },
      confirm: true,
    });
    assert.equal(applied.ok, true);
    assert.equal(applied.workItem?.title, "Renamed");

    const synced = syncNodesFromObject({
      businessId: BIZ,
      objectType: "external_work_item",
      objectId: work.data.id,
      patch: { label: "From object", status: "synced" },
    });
    assert.ok(synced.updatedNodeIds.length >= 1);

    syncExternalWorkItemToNodes({
      ...work.data,
      title: "Again",
      status: "open",
      businessId: BIZ,
    });
  });

  it("guardian blocks regulated canvas actions without consent", () => {
    const blocked = evaluateCanvasAction({
      actionId: "send_email",
      businessId: BIZ,
      consentGiven: false,
    });
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.code, "no_consent");
    assert.ok(blocked.alternatives.length > 0);

    const canvas = createSketchBoard({ businessId: BIZ });
    const added = addConversationalAction(canvas.id, "send_dm", {
      businessId: BIZ,
      consentGiven: false,
    });
    assert.equal(added.evaluation.allowed, false);
    assert.equal(added.node.data?.guardianBlocked, true);

    const allowed = evaluateCanvasAction({
      actionId: "create_work_item",
      businessId: BIZ,
    });
    assert.equal(allowed.allowed, true);
  });

  it("ExternalWorkItem node sync after create", () => {
    connectWorkProvider({ businessId: BIZ, provider: "asana" });
    const canvas = createSketchBoard({ businessId: BIZ });
    const work = createExternalWorkItem({
      provider: "asana",
      businessId: BIZ,
      title: "Deploy checklist",
      sourceType: "tap_point_failure",
    });
    assert.ok(work.ok);
    if (!work.ok) return;
    const updated = ensureExternalWorkItemNode({
      canvasId: canvas.id,
      workItem: work.data,
    });
    assert.ok(
      updated.nodes.some(
        (n) => n.kind === "external_work_item" && n.linked?.id === work.data.id
      )
    );
  });

  it("deployment simulation detects conflicts and never mutates device URL", () => {
    const canvas = createSketchBoard({ businessId: BIZ, name: "Deploy" });
    connectWorkProvider({ businessId: BIZ, provider: "asana" });
    const sim = simulateDeployment({
      canvasId: canvas.id,
      createChecklistTask: true,
      placements: [
        {
          slotId: "s1",
          label: "Door",
          locationHint: "front",
          tapPointId: "tp_1",
          deviceUrl: "https://tap.example/t/abc",
        },
        {
          slotId: "s2",
          label: "Bar",
          locationHint: "overlap weekend",
          tapPointId: "tp_1",
          deviceUrl: "https://tap.example/t/abc",
        },
        {
          slotId: "s3",
          label: "Patio",
          locationHint: "outside",
        },
      ],
    });
    assert.equal(sim.deviceUrlsUnchanged, true);
    assert.ok(sim.conflicts.some((c) => c.code === "double_assign"));
    assert.ok(sim.conflicts.some((c) => c.code === "schedule_overlap"));
    assert.ok(sim.conflicts.some((c) => c.code === "missing_tap_point"));
    assert.ok(sim.workItemId);

    const scheduleConflicts = detectScheduleConflicts({
      slots: [
        {
          id: "a",
          start: "2026-08-01T10:00:00.000Z",
          end: "2026-08-01T14:00:00.000Z",
          campaignId: "c1",
        },
        {
          id: "b",
          start: "2026-08-01T12:00:00.000Z",
          end: "2026-08-01T16:00:00.000Z",
          campaignId: "c2",
        },
      ],
    });
    assert.ok(scheduleConflicts.length >= 1);
  });

  it("AI / Automation Team proposals require accept or reject — never silent", () => {
    const canvas = reverseEngineerIntoCanvas({
      businessId: BIZ,
      objects: [{ type: "campaign", id: "c1", label: "Orphan-ish" }],
    });
    // Add unlinked operational node
    addNode(canvas.id, {
      kind: "campaign",
      label: "Unlinked camp",
      sketch: false,
    });
    const proposals = detectIssues(canvas.id);
    assert.ok(proposals.length >= 1);
    const p = proposals[0]!;
    const preview = previewAutomationProposal(p.id);
    assert.equal(preview.applied, false);
    assert.equal(preview.proposal.status, "previewed");

    const rejected = resolveAutomationProposal({
      proposalId: p.id,
      decision: "reject",
    });
    assert.equal(rejected.proposal.status, "rejected");

    const more = detectIssues(canvas.id);
    const p2 = more[0]!;
    const accepted = resolveAutomationProposal({
      proposalId: p2.id,
      decision: "accept",
    });
    assert.equal(accepted.proposal.status, "accepted");
    const audit = listCanvasAudit(canvas.id);
    assert.ok(audit.some((a) => a.action === "automation.rejected"));
    assert.ok(audit.some((a) => a.action === "automation.accepted"));
  });
});
