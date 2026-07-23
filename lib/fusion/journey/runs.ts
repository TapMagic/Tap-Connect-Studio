/**
 * TapFlow execution run log — dry-run and future live runs.
 * Persists in memory; mirrors to PlatformAuditEvent when isolated DB configured.
 */

import {
  executeJourneyDryRun,
  type DryRunResult,
  type VisitorContext,
} from "./runtime";
import type { JourneyDefinition } from "./types";
import { createGovernedEvent, enqueueOutboxSync } from "@/lib/fusion/publication/events";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isIsolatedFusionDatabaseConfigured } from "@/lib/fusion/db/safety";

export type JourneyRunStatus = "completed" | "blocked" | "failed" | "partial";

export type JourneyRunRecord = {
  id: string;
  businessId: string;
  journeyId?: string;
  journeyName: string;
  status: JourneyRunStatus;
  path: string[];
  issues: string[];
  visitor: VisitorContext;
  createdAt: string;
  dryRun: boolean;
};

const runs: JourneyRunRecord[] = [];

export function resetJourneyRunsMemory() {
  runs.length = 0;
}

export function listJourneyRuns(businessId: string, limit = 30): JourneyRunRecord[] {
  return runs.filter((r) => r.businessId === businessId).slice(0, limit);
}

export function getJourneyRun(id: string): JourneyRunRecord | undefined {
  return runs.find((r) => r.id === id);
}

export async function recordJourneyDryRun(input: {
  businessId: string;
  journeyId?: string;
  definition: JourneyDefinition;
  visitor?: VisitorContext;
  actorId?: string;
}): Promise<{ run: JourneyRunRecord; result: DryRunResult }> {
  const result = executeJourneyDryRun(input.definition, input.visitor, {
    requireValid: true,
  });

  const status: JourneyRunStatus = result.completed
    ? "completed"
    : result.blockedAt
      ? "blocked"
      : result.ok
        ? "partial"
        : "failed";

  const run: JourneyRunRecord = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `run_${Date.now().toString(36)}`,
    businessId: input.businessId,
    journeyId: input.journeyId,
    journeyName: input.definition.name,
    status,
    path: result.path,
    issues: result.issues,
    visitor: result.visitor,
    createdAt: new Date().toISOString(),
    dryRun: true,
  };
  runs.unshift(run);

  enqueueOutboxSync(
    "journey.run",
    createGovernedEvent({
      name: "journey.dry_run.recorded",
      businessId: input.businessId,
      aggregateType: "journey_run",
      aggregateId: run.id,
      correlationId: run.id,
      payload: {
        status: run.status,
        journeyId: input.journeyId,
        pathLength: run.path.length,
        dryRun: true,
      },
    })
  );

  if (isIsolatedFusionDatabaseConfigured()) {
    try {
      await prisma.platformAuditEvent.create({
        data: {
          businessId: input.businessId,
          actorType: "USER",
          actorId: input.actorId,
          action: "journey.dry_run",
          resourceType: "journey_run",
          resourceId: run.id,
          correlationId: run.id,
          metadata: {
            status: run.status,
            path: run.path,
            issues: run.issues,
            journeyId: input.journeyId ?? null,
          } as Prisma.InputJsonValue,
        },
      });
    } catch {
      // optional
    }
  }

  return { run, result };
}
