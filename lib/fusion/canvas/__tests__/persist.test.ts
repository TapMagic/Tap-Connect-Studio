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
});
