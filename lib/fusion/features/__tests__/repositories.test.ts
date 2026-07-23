import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PrismaFeatureOverrideRepository } from "../prisma-repository";
import type { FeatureOverridePrismaLike } from "../prisma-repository";
import { FileFeatureOverrideRepository } from "../file-repository";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { assertSafeFusionDatabaseUrl } from "../../db/safety";

describe("assertSafeFusionDatabaseUrl", () => {
  it("accepts local tapconnect_fusion_dev", () => {
    const result = assertSafeFusionDatabaseUrl(
      "postgresql://tapconnect:tapconnect@127.0.0.1:5433/tapconnect_fusion_dev"
    );
    assert.equal(result.ok, true);
  });

  it("rejects railway hosts", () => {
    const result = assertSafeFusionDatabaseUrl(
      "postgresql://user:pass@containers-us-west-1.railway.app:5432/railway"
    );
    assert.equal(result.ok, false);
  });

  it("rejects generic local db names", () => {
    const result = assertSafeFusionDatabaseUrl(
      "postgresql://tapconnect:tapconnect@127.0.0.1:5432/tapconnect"
    );
    assert.equal(result.ok, false);
  });
});

describe("PrismaFeatureOverrideRepository (mocked client)", () => {
  it("lists and sets overrides without a live database", async () => {
    const store = new Map<string, {
      featureId: string;
      scope: string;
      enabled: boolean;
      reason: string | null;
      actorId: string | null;
      actorEmail: string | null;
      updatedAt: Date;
    }>();

    const db: FeatureOverridePrismaLike = {
      featureFlagOverride: {
        async findMany() {
          return Array.from(store.values()).sort((a, b) =>
            a.featureId.localeCompare(b.featureId)
          );
        },
        async upsert({ where, create, update }) {
          const key = `${where.featureId_scope.featureId}::${where.featureId_scope.scope}`;
          const existing = store.get(key);
          if (!existing) {
            store.set(key, {
              featureId: create.featureId as string,
              scope: create.scope as string,
              enabled: create.enabled as boolean,
              reason: (create.reason as string | null) ?? null,
              actorId: (create.actorId as string | null) ?? null,
              actorEmail: (create.actorEmail as string | null) ?? null,
              updatedAt: new Date(),
            });
          } else {
            store.set(key, {
              ...existing,
              enabled: update.enabled as boolean,
              reason: (update.reason as string | null) ?? null,
              actorId: (update.actorId as string | null) ?? null,
              actorEmail: (update.actorEmail as string | null) ?? null,
              updatedAt: new Date(),
            });
          }
          return store.get(key);
        },
      },
      platformAuditEvent: {
        async create() {
          return {};
        },
      },
    };

    const repo = new PrismaFeatureOverrideRepository(db);
    const set = await repo.set({
      featureId: "card.builder.freeform",
      enabled: true,
      reason: "unit test",
      actorEmail: "dev@tapconnect.local",
    });
    assert.equal(set.ok, true);
    if (set.ok) assert.equal(set.storage, "prisma");

    const rows = await repo.list();
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.featureId, "card.builder.freeform");
    assert.equal(rows[0]?.enabled, true);
  });
});

describe("FileFeatureOverrideRepository (dev-only)", () => {
  it("persists to a temp json file", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "fusion-fo-"));
    const file = path.join(dir, "feature-overrides.json");
    try {
      const repo = new FileFeatureOverrideRepository(file);
      const set = await repo.set({
        featureId: "admin.feature_flags",
        enabled: false,
        reason: "pause",
      });
      assert.equal(set.ok, true);
      if (set.ok) assert.equal(set.storage, "file");
      const rows = await repo.list();
      assert.equal(rows.length, 1);
      assert.equal(rows[0]?.enabled, false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
