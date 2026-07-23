/**
 * Authoritative production persistence for feature overrides.
 * Testable without live credentials via injected Prisma-like client.
 */

import type {
  FeatureOverrideRepository,
  SetFeatureOverrideInput,
  SetFeatureOverrideResult,
  StoredFeatureOverride,
} from "./repository";
import { createGovernedEvent, enqueueOutboxSync } from "@/lib/fusion/publication/events";

/** Minimal surface used by this repository — keeps unit tests free of real DB. */
export type FeatureOverridePrismaLike = {
  featureFlagOverride: {
    findMany: (args: {
      orderBy: Array<Record<string, "asc" | "desc">>;
    }) => Promise<
      Array<{
        featureId: string;
        scope: string;
        enabled: boolean;
        reason: string | null;
        actorId: string | null;
        actorEmail: string | null;
        updatedAt: Date;
      }>
    >;
    upsert: (args: {
      where: { featureId_scope: { featureId: string; scope: string } };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => Promise<unknown>;
  };
  platformAuditEvent: {
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  };
};

function mapRow(r: {
  featureId: string;
  scope: string;
  enabled: boolean;
  reason: string | null;
  actorId: string | null;
  actorEmail: string | null;
  updatedAt: Date;
}): StoredFeatureOverride {
  return {
    featureId: r.featureId,
    scope: r.scope,
    enabled: r.enabled,
    reason: r.reason ?? undefined,
    actorId: r.actorId ?? undefined,
    actorEmail: r.actorEmail ?? undefined,
    actor: r.actorEmail ?? r.actorId ?? undefined,
    updatedAt: r.updatedAt.toISOString(),
  };
}

export class PrismaFeatureOverrideRepository implements FeatureOverrideRepository {
  readonly kind = "prisma" as const;

  constructor(private readonly db: FeatureOverridePrismaLike) {}

  async list(): Promise<StoredFeatureOverride[]> {
    const rows = await this.db.featureFlagOverride.findMany({
      orderBy: [{ featureId: "asc" }, { scope: "asc" }],
    });
    return rows.map(mapRow);
  }

  async set(input: SetFeatureOverrideInput): Promise<SetFeatureOverrideResult> {
    const scope = input.scope?.trim() || "global";
    const now = new Date();
    const override: StoredFeatureOverride = {
      featureId: input.featureId,
      enabled: input.enabled,
      scope,
      reason: input.reason,
      actorId: input.actorId,
      actorEmail: input.actorEmail,
      actor: input.actorEmail ?? input.actorId,
      updatedAt: now.toISOString(),
    };

    try {
      await this.db.featureFlagOverride.upsert({
        where: { featureId_scope: { featureId: input.featureId, scope } },
        create: {
          featureId: input.featureId,
          scope,
          enabled: input.enabled,
          reason: input.reason,
          actorId: input.actorId,
          actorEmail: input.actorEmail,
        },
        update: {
          enabled: input.enabled,
          reason: input.reason,
          actorId: input.actorId,
          actorEmail: input.actorEmail,
        },
      });

      try {
        await this.db.platformAuditEvent.create({
          data: {
            actorType: "ADMIN",
            actorId: input.actorId,
            action: input.enabled ? "feature.enable" : "feature.disable",
            resourceType: "feature",
            resourceId: input.featureId,
            correlationId: crypto.randomUUID(),
            metadata: { scope, reason: input.reason ?? null },
          },
        });
      } catch {
        // audit optional mid-migration
      }

      enqueueOutboxSync(
        "feature.override",
        createGovernedEvent({
          name: input.enabled ? "feature.enabled" : "feature.disabled",
          aggregateType: "feature",
          aggregateId: input.featureId,
          correlationId: crypto.randomUUID(),
          payload: { scope, reason: input.reason ?? null },
        })
      );

      return { ok: true, storage: "prisma", override };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Prisma feature override failed";
      return { ok: false, error: message };
    }
  }
}
