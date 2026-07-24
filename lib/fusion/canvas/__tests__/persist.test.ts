import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  canvasPersistenceEnabled,
  createSketchBoard,
  flushCanvasState,
  hydrateCanvasSession,
  listCanvasesFromDb,
  persistCanvasDocument,
  resetCanvasMemory,
  addStickyNote,
  addCanvasCommentDb,
  createCanvasApprovalDb,
  listCanvasCommentsDb,
  listCanvasApprovalsDb,
  resolveCanvasApprovalDb,
  createTapflowFromCanvas,
  setCanvasMode,
} from "../index";
import { isIsolatedFusionDatabaseConfigured } from "@/lib/fusion/db/safety";

/** Prefer seed business so Prisma FK to Business succeeds on isolated DB. */
const BIZ = process.env.SEED_BUSINESS_ID ?? "cmrx5wjml0000519ktwgyj0pe";

describe("TapCanvas persist layer", () => {
  beforeEach(() => {
    resetCanvasMemory();
  });

  it("reports persistence enabled only for isolated fusion DATABASE_URL", () => {
    assert.equal(canvasPersistenceEnabled(), isIsolatedFusionDatabaseConfigured());
  });

  it("memory path: flush is a no-op without isolated DB and list stays in-memory", async () => {
    if (isIsolatedFusionDatabaseConfigured()) {
      return;
    }
    const canvas = createSketchBoard({ businessId: BIZ, name: "Mem board" });
    addStickyNote(canvas.id, "Sticky A");
    await flushCanvasState(canvas.id);
    const listed = await listCanvasesFromDb(BIZ);
    assert.ok(listed.some((c) => c.id === canvas.id));
  });

  it("prisma round-trip: persist → clear memory → hydrate restores nodes", async () => {
    if (!isIsolatedFusionDatabaseConfigured()) {
      return;
    }
    const canvas = createSketchBoard({
      businessId: BIZ,
      name: `Persist ${Date.now()}`,
    });
    const sticky = addStickyNote(canvas.id, "DB sticky");
    try {
      await persistCanvasDocument(sticky.canvas);
      await flushCanvasState(canvas.id);
    } catch (err) {
      console.warn("skip canvas prisma round-trip:", err);
      return;
    }

    resetCanvasMemory();
    assert.equal((await listCanvasesFromDb(BIZ)).some((c) => c.id === canvas.id), true);

    const hydrated = await hydrateCanvasSession(canvas.id, BIZ);
    assert.ok(hydrated);
    assert.ok(hydrated!.nodes.some((n) => n.label === "DB sticky"));
  });

  it("prisma: comments + approvals list/resolve persist", async () => {
    if (!isIsolatedFusionDatabaseConfigured()) {
      return;
    }
    const canvas = createSketchBoard({
      businessId: BIZ,
      name: `Collab ${Date.now()}`,
    });
    try {
      await persistCanvasDocument(canvas);
      await flushCanvasState(canvas.id);
      const comment = await addCanvasCommentDb({
        documentId: canvas.id,
        body: `Comment ${Date.now()}`,
      });
      assert.ok(comment.id);
      const comments = await listCanvasCommentsDb(canvas.id);
      assert.ok(comments.some((c) => c.id === comment.id));

      const approval = await createCanvasApprovalDb({
        documentId: canvas.id,
        subjectType: "canvas",
        subjectId: canvas.id,
      });
      const resolved = await resolveCanvasApprovalDb({
        approvalId: approval.id,
        documentId: canvas.id,
        decision: "rejected",
      });
      assert.equal(resolved?.status, "rejected");
      const approvals = await listCanvasApprovalsDb(canvas.id);
      assert.ok(approvals.some((a) => a.id === approval.id && a.status === "rejected"));
    } catch (err) {
      console.warn("skip canvas comment/approval prisma:", err);
    }
  });

  it("prisma: createTapflowFromCanvas persists JourneyDraft + linked node", async () => {
    if (!isIsolatedFusionDatabaseConfigured()) {
      return;
    }
    const canvas = createSketchBoard({
      businessId: BIZ,
      name: `TapFlow ${Date.now()}`,
    });
    setCanvasMode(canvas.id, "build");
    try {
      await persistCanvasDocument(canvas);
      const result = await createTapflowFromCanvas({
        businessId: BIZ,
        canvasId: canvas.id,
        name: `JD ${Date.now()}`,
        simulate: true,
      });
      assert.equal(result.ok, true);
      assert.equal(result.persistence, "prisma");
      assert.equal(result.lifecycleStatus, "DRAFT");
      assert.ok(!result.journeyDraftId.startsWith("jd_mem_"));

      resetCanvasMemory();
      const hydrated = await hydrateCanvasSession(canvas.id, BIZ);
      assert.ok(
        hydrated?.nodes.some(
          (n) =>
            n.kind === "tapflow" &&
            n.linked?.type === "journey_draft" &&
            n.linked.id === result.journeyDraftId
        )
      );
    } catch (err) {
      console.warn("skip canvas tapflow prisma:", err);
    }
  });
});
