/**
 * TapFlow live visitor executor — runs ACTIVE JourneyDraft graphs on tap.
 * Side effects are queue-only (outbox); no email/SMS/provider calls from this path.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isIsolatedFusionDatabaseConfigured } from "@/lib/fusion/db/safety";
import { listFeatureOverrides, toResolveOverrides } from "@/lib/fusion/features/overrides";
import { isFeatureEnabled } from "@/lib/fusion/features/resolve";
import { createGovernedEvent, enqueueOutboxSync } from "@/lib/fusion/publication/events";
import type { JourneyDefinition } from "./types";
import { executeJourneyDryRun, type VisitorContext } from "./runtime";
import { type JourneyRunRecord, type JourneyRunStatus, listJourneyRuns } from "./runs";
import { precheckTapFlowEffect } from "./effect-guardian";

const liveRuns: JourneyRunRecord[] = [];

export function resetLiveJourneyRunsMemory() {
  liveRuns.length = 0;
}

export function listLiveJourneyRuns(businessId: string, limit = 30): JourneyRunRecord[] {
  return liveRuns.filter((r) => r.businessId === businessId).slice(0, limit);
}

/** All live run records in memory (Admin / failure analytics). */
export function listAllLiveJourneyRunRecords(limit = 200): JourneyRunRecord[] {
  return liveRuns.slice(0, limit);
}

function parseDefinition(raw: unknown): JourneyDefinition | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as JourneyDefinition;
  if (!Array.isArray(d.nodes) || !Array.isArray(d.edges)) return null;
  return d;
}

async function loadActiveDefinitions(
  businessId: string
): Promise<Array<{ id: string; name: string; definition: JourneyDefinition }>> {
  if (!isIsolatedFusionDatabaseConfigured()) {
    return [];
  }
  try {
    const rows = await prisma.journeyDraft.findMany({
      where: { businessId, status: "ACTIVE" },
      take: 5,
      orderBy: { activatedAt: "desc" },
    });
    return rows
      .map((r) => {
        const definition = parseDefinition(r.definition);
        if (!definition) return null;
        return { id: r.id, name: r.name, definition };
      })
      .filter((x): x is { id: string; name: string; definition: JourneyDefinition } => Boolean(x));
  } catch {
    return [];
  }
}

async function enqueueNodeEffects(input: {
  businessId: string;
  journeyId: string;
  journeyName: string;
  runId: string;
  visitorId: string;
  visitor: VisitorContext;
  events: Array<{
    nodeId: string;
    type: string;
    action: string;
    detail?: string;
    blocked?: boolean;
  }>;
  actorId?: string;
}) {
  for (const ev of input.events) {
    if (ev.blocked) continue;
    if (
      ev.action !== "award_loyalty" &&
      ev.action !== "email" &&
      ev.action !== "message" &&
      ev.action !== "create_case" &&
      ev.action !== "human_handoff"
    ) {
      continue;
    }
    const channel = ev.action === "message" ? ev.detail : undefined;
    const precheck = precheckTapFlowEffect({
      action: ev.action,
      visitor: input.visitor,
      channel,
      requireMarketingConsent: ev.detail?.includes("marketing consent"),
      recipientId: input.visitorId,
    });
    if (!precheck.queue) {
      continue;
    }
    const topic = precheck.topic ?? `tapflow.effect.${ev.action}`;
    const envelope = createGovernedEvent({
      name: topic,
      businessId: input.businessId,
      aggregateType: "JourneyDraft",
      aggregateId: input.journeyId,
      correlationId: input.runId,
      payload: {
        journeyName: input.journeyName,
        runId: input.runId,
        visitorId: input.visitorId,
        nodeId: ev.nodeId,
        type: ev.type,
        detail: ev.detail,
        actorId: input.actorId ?? "system:tapflow",
        guardian: precheck.guardian?.code ?? "ok",
      },
    });
    await enqueueOutboxSync(topic, envelope);
  }
}

/**
 * Pure helper for tests — execute one definition as a live (non-dry) run record.
 */
export function executeLiveJourneyDefinition(input: {
  businessId: string;
  journeyId: string;
  journeyName: string;
  definition: JourneyDefinition;
  visitor: VisitorContext;
}): { run: JourneyRunRecord; result: ReturnType<typeof executeJourneyDryRun> } {
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
        : `live_${Date.now().toString(36)}`,
    businessId: input.businessId,
    journeyId: input.journeyId,
    journeyName: input.journeyName,
    status,
    path: result.path,
    issues: result.issues,
    visitor: result.visitor,
    createdAt: new Date().toISOString(),
    dryRun: false,
  };
  liveRuns.unshift(run);
  return { run, result };
}

/**
 * Execute all ACTIVE journeys for a business against a visitor context.
 * Safe to call from public tap path — failures are swallowed by caller.
 */
export async function executeActiveJourneysForVisitor(input: {
  businessId: string;
  visitor: VisitorContext;
  deviceSlotId?: string;
  campaignId?: string;
  actorId?: string;
}): Promise<{
  ok: boolean;
  skipped?: string;
  runs: JourneyRunRecord[];
}> {
  const overrides = toResolveOverrides(await listFeatureOverrides().catch(() => []));
  if (!isFeatureEnabled("journey.tapflow", { overrides })) {
    return { ok: false, skipped: "journey.tapflow_disabled", runs: [] };
  }

  const active = await loadActiveDefinitions(input.businessId);
  if (active.length === 0) {
    return { ok: true, skipped: "no_active_journeys", runs: [] };
  }

  const recorded: JourneyRunRecord[] = [];

  for (const journey of active) {
    const { run, result } = executeLiveJourneyDefinition({
      businessId: input.businessId,
      journeyId: journey.id,
      journeyName: journey.name,
      definition: journey.definition,
      visitor: input.visitor,
    });
    recorded.push(run);

    await enqueueNodeEffects({
      businessId: input.businessId,
      journeyId: journey.id,
      journeyName: journey.name,
      runId: run.id,
      visitorId: input.visitor.visitorId ?? "anonymous",
      visitor: input.visitor,
      events: result.events,
      actorId: input.actorId,
    }).catch(() => undefined);

    if (isIsolatedFusionDatabaseConfigured()) {
      try {
        await prisma.platformAuditEvent.create({
          data: {
            businessId: input.businessId,
            actorType: "SYSTEM",
            actorId: input.actorId ?? "system:tapflow",
            action: "tapflow.live_run",
            resourceType: "JourneyDraft",
            resourceId: journey.id,
            correlationId: run.id,
            metadata: {
              runId: run.id,
              status: run.status,
              path: run.path,
              deviceSlotId: input.deviceSlotId,
              campaignId: input.campaignId,
              dryRun: false,
            } as Prisma.InputJsonValue,
          },
        });
      } catch {
        /* audit optional when table missing */
      }
    }
  }

  return { ok: true, runs: recorded };
}

/** Merge live + dry-run memory for analytics overlays */
export function listAllJourneyRuns(businessId: string, limit = 40): JourneyRunRecord[] {
  return [...listLiveJourneyRuns(businessId, limit), ...listJourneyRuns(businessId, limit)].slice(
    0,
    limit
  );
}
