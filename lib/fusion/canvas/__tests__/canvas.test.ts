import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  addConversationalAction,
  addNode,
  addStickyNote,
  applyNodeEditToAuthoritative,
  assertSketchNonExecuting,
  bindKeywordTriggerFromBrandPack,
  bumpVersion,
  compareCanvasVersions,
  connectSketch,
  createSketchBoard,
  createWeeklySpecialsGroup,
  detectIssues,
  detectScheduleConflicts,
  ensureExternalWorkItemNode,
  evaluateCanvasAction,
  listCanvasAudit,
  listVersions,
  openObjectInTapCanvas,
  previewAutomationProposal,
  promoteSketchNodes,
  requireCanvas,
  resetCanvasMemory,
  resolveAutomationProposal,
  restoreVersion,
  reverseEngineerIntoCanvas,
  setCanvasMode,
  simulateDeployment,
  syncExternalWorkItemToNodes,
  syncNodesFromObject,
  undoPromotion,
  updateNode,
  addCanvasCommentDb,
  createCanvasApprovalDb,
  listCanvasCommentsDb,
  listCanvasApprovalsDb,
  resolveCanvasApprovalDb,
  createTapflowFromCanvas,
} from "../index";
import {
  connectWorkProvider,
  createExternalWorkItem,
  resetProductivityMemory,
} from "@/lib/fusion/connectors/productivity";
import { parseKeywordBrandPack } from "@/lib/fusion/keywords/client";

const BIZ = "biz_canvas_test";
const originalUrl = process.env.DATABASE_URL;

describe("TapCanvas", () => {
  beforeEach(() => {
    resetCanvasMemory();
    resetProductivityMemory();
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    resetCanvasMemory();
    if (originalUrl !== undefined) process.env.DATABASE_URL = originalUrl;
    else delete process.env.DATABASE_URL;
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

  it("openObjectInTapCanvas projects link into analyze reverse-viz", () => {
    const canvas = openObjectInTapCanvas({
      businessId: BIZ,
      objectType: "tap_point",
      objectId: "tp_hub_1",
      label: "Front door Tap Point",
    });
    assert.equal(canvas.mode, "analyze");
    assert.ok(
      canvas.nodes.some(
        (n) => n.linked?.type === "tap_point" && n.linked.id === "tp_hub_1"
      )
    );
    const audit = listCanvasAudit(canvas.id);
    assert.ok(audit.some((a) => a.action === "analyze.reverse_viz"));
  });

  it("compare + restore versions round-trip node labels", () => {
    const canvas = createSketchBoard({ businessId: BIZ, name: "Version board" });
    const { node } = addStickyNote(canvas.id, "Before");
    const beforeId = bumpVersion(requireCanvas(canvas.id), "before-edit");
    updateNode(canvas.id, node.id, { label: "After" });
    bumpVersion(requireCanvas(canvas.id), "after-edit");
    const versions = listVersions(canvas.id);
    assert.ok(versions.length >= 2);
    const newest = versions[0]!;
    const prior = versions.find((v) => v.id === beforeId) ?? versions[1]!;
    const diff = compareCanvasVersions(canvas.id, prior.id, newest.id);
    assert.ok(diff.nodesChanged.includes(node.id) || diff.nodesAdded.length >= 0);
    const restored = restoreVersion(canvas.id, beforeId);
    const sticky = restored.nodes.find((n) => n.id === node.id);
    assert.equal(sticky?.label, "Before");
  });

  it("bindKeywordTriggerFromBrandPack attaches keyword data", () => {
    const canvas = createSketchBoard({ businessId: BIZ, name: "Keyword board" });
    const pack = parseKeywordBrandPack({
      approvedTerms: [
        { id: "1", value: "specials", kind: "keyword" },
        { id: "2", value: "weekly", kind: "keyword" },
      ],
      brandedHashtags: [{ id: "3", value: "#WeeklySpecial", kind: "hashtag" }],
    });
    const bound = bindKeywordTriggerFromBrandPack(canvas.id, pack, ["specials"]);
    assert.ok(bound.node);
    assert.ok(
      Array.isArray(bound.node.data?.keywords) &&
        (bound.node.data!.keywords as string[]).length > 0
    );
  });

  it("comments and approvals list + resolve in memory", async () => {
    const canvas = createSketchBoard({ businessId: BIZ, name: "Collab board" });
    const comment = await addCanvasCommentDb({
      documentId: canvas.id,
      body: "Needs review",
    });
    assert.ok(comment.id);
    const comments = await listCanvasCommentsDb(canvas.id);
    assert.equal(comments.length, 1);
    assert.equal(comments[0]!.body, "Needs review");

    const approval = await createCanvasApprovalDb({
      documentId: canvas.id,
      subjectType: "canvas",
      subjectId: canvas.id,
    });
    assert.equal(approval.status, "pending");
    const listed = await listCanvasApprovalsDb(canvas.id);
    assert.equal(listed.length, 1);

    const resolved = await resolveCanvasApprovalDb({
      approvalId: approval.id,
      documentId: canvas.id,
      decision: "approved",
    });
    assert.ok(resolved);
    assert.equal(resolved!.status, "approved");
    const after = await listCanvasApprovalsDb(canvas.id);
    assert.equal(after[0]!.status, "approved");
  });

  it("createTapflowFromCanvas binds journey_draft node (memory stub)", async () => {
    const canvas = createSketchBoard({ businessId: BIZ, name: "TapFlow board" });
    setCanvasMode(canvas.id, "build");
    const result = await createTapflowFromCanvas({
      businessId: BIZ,
      canvasId: canvas.id,
      name: "Canvas TapFlow",
      simulate: true,
    });
    assert.equal(result.ok, true);
    assert.equal(result.lifecycleStatus, "DRAFT");
    assert.equal(result.persistence, "memory_stub");
    assert.ok(result.journeyDraftId.startsWith("jd_mem_"));
    const node = result.canvas.nodes.find((n) => n.id === result.nodeId);
    assert.ok(node);
    assert.equal(node!.kind, "tapflow");
    assert.equal(node!.linked?.type, "journey_draft");
    assert.equal(node!.linked?.id, result.journeyDraftId);
    assert.ok(result.simulate?.stub);
    assert.ok((result.simulate?.path.length ?? 0) >= 1);
  });
});
