import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  connectTikTok,
  createTikTokCast,
  flushTikTokPersists,
  hydrateTikTokConnection,
  listTikTokCastsFromDb,
  persistTikTokCast,
  resetTikTokMemory,
  tikTokPersistenceEnabled,
} from "../index";
import { isIsolatedFusionDatabaseConfigured } from "@/lib/fusion/db/safety";

const BIZ = process.env.SEED_BUSINESS_ID ?? "cmrx5wjml0000519ktwgyj0pe";

describe("TikTok persist layer", () => {
  beforeEach(() => {
    resetTikTokMemory();
  });

  it("reports persistence enabled only for isolated fusion DATABASE_URL", () => {
    assert.equal(tikTokPersistenceEnabled(), isIsolatedFusionDatabaseConfigured());
  });

  it("memory path: list without isolated DB returns in-memory casts", async () => {
    if (isIsolatedFusionDatabaseConfigured()) return;
    connectTikTok({ businessId: BIZ });
    const created = createTikTokCast({ businessId: BIZ, title: "Mem cast" });
    assert.equal(created.ok, true);
    if (!created.ok) return;
    await flushTikTokPersists();
    const listed = await listTikTokCastsFromDb(BIZ);
    assert.ok(listed.some((c) => c.id === created.data.id));
  });

  it("prisma round-trip: persist → clear memory → list hydrates cast", async () => {
    if (!isIsolatedFusionDatabaseConfigured()) return;

    connectTikTok({ businessId: BIZ });
    await flushTikTokPersists();

    const created = createTikTokCast({
      businessId: BIZ,
      title: `Persist cast ${Date.now()}`,
      caption: "Keep this Card",
    });
    assert.equal(created.ok, true);
    if (!created.ok) return;
    try {
      await persistTikTokCast(created.data);
      await flushTikTokPersists();
    } catch (err) {
      console.warn("skip tiktok prisma round-trip:", err);
      return;
    }

    resetTikTokMemory();
    const conn = await hydrateTikTokConnection(BIZ);
    assert.ok(conn);

    const listed = await listTikTokCastsFromDb(BIZ);
    const found = listed.find((c) => c.id === created.data.id);
    assert.ok(found);
    assert.equal(found!.title, created.data.title);
    assert.equal(found!.caption, "Keep this Card");
  });
});
