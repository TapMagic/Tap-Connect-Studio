/**
 * Governed event envelope — selectively ported from Cody V2 spine.
 * Fusion keeps an open event-name string (expand via registry) rather than Slice-1 enum only.
 *
 * Outbox: always writes in-memory; also persists FusionOutboxEvent via Prisma when an
 * isolated fusion DATABASE_URL is configured. Falls back to memory-only when DB unavailable.
 */

import { z } from "zod";
import type { FusionOutboxStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isIsolatedFusionDatabaseConfigured } from "@/lib/fusion/db/safety";
import { hashPayload } from "./idempotency";

export const governedEventSchema = z.object({
  name: z.string().min(1),
  schemaVersion: z.literal(1),
  workspaceId: z.string().optional(),
  businessId: z.string().optional(),
  aggregateType: z.string().min(1),
  aggregateId: z.string().min(1),
  correlationId: z.string().min(1),
  occurredAt: z.string().datetime(),
  payload: z.record(z.string(), z.unknown()),
});

export type GovernedEvent = z.infer<typeof governedEventSchema>;

export function createGovernedEvent(
  input: Omit<GovernedEvent, "schemaVersion" | "occurredAt"> & {
    occurredAt?: string;
  }
): GovernedEvent {
  return governedEventSchema.parse({
    ...input,
    schemaVersion: 1,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
  });
}

export type OutboxStatus = "PENDING" | "PROCESSING" | "PUBLISHED" | "FAILED";

export type OutboxRecord = {
  id: string;
  topic: string;
  envelope: GovernedEvent;
  status: OutboxStatus;
  attempts: number;
  availableAt: string;
  lastError?: string;
  source: "memory" | "prisma";
};

const memoryOutbox: OutboxRecord[] = [];

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function toMemoryRecord(
  topic: string,
  envelope: GovernedEvent,
  id?: string
): OutboxRecord {
  return {
    id: id ?? newId(),
    topic,
    envelope,
    status: "PENDING",
    attempts: 0,
    availableAt: new Date().toISOString(),
    source: "memory",
  };
}

function mapPrismaRow(row: {
  id: string;
  topic: string;
  schemaVersion: number;
  aggregateType: string;
  aggregateId: string;
  correlationId: string;
  payload: unknown;
  status: FusionOutboxStatus;
  attempts: number;
  availableAt: Date;
  lastError: string | null;
  businessId: string | null;
}): OutboxRecord {
  const payload =
    typeof row.payload === "object" && row.payload && !Array.isArray(row.payload)
      ? (row.payload as Record<string, unknown>)
      : {};
  const occurredAt =
    typeof payload.occurredAt === "string"
      ? payload.occurredAt
      : row.availableAt.toISOString();
  const envelopePayload =
    typeof payload.payload === "object" && payload.payload && !Array.isArray(payload.payload)
      ? (payload.payload as Record<string, unknown>)
      : payload;

  return {
    id: row.id,
    topic: row.topic,
    envelope: {
      name: typeof payload.name === "string" ? payload.name : row.topic,
      schemaVersion: 1,
      workspaceId: typeof payload.workspaceId === "string" ? payload.workspaceId : undefined,
      businessId: row.businessId ?? undefined,
      aggregateType: row.aggregateType,
      aggregateId: row.aggregateId,
      correlationId: row.correlationId,
      occurredAt,
      payload: envelopePayload,
    },
    status: row.status,
    attempts: row.attempts,
    availableAt: row.availableAt.toISOString(),
    lastError: row.lastError ?? undefined,
    source: "prisma",
  };
}

/**
 * Enqueue an outbox record. Always keeps an in-memory copy; persists to Prisma when
 * isolated fusion DB is configured. Prisma failures do not throw — memory remains authoritative.
 */
export async function enqueueOutbox(
  topic: string,
  envelope: GovernedEvent
): Promise<OutboxRecord> {
  const record = toMemoryRecord(topic, envelope);
  memoryOutbox.push(record);

  if (!isIsolatedFusionDatabaseConfigured()) {
    return record;
  }

  try {
    const created = await prisma.fusionOutboxEvent.create({
      data: {
        id: record.id,
        businessId: envelope.businessId,
        topic,
        schemaVersion: envelope.schemaVersion,
        aggregateType: envelope.aggregateType,
        aggregateId: envelope.aggregateId,
        correlationId: envelope.correlationId,
        payload: {
          name: envelope.name,
          schemaVersion: envelope.schemaVersion,
          workspaceId: envelope.workspaceId,
          businessId: envelope.businessId,
          occurredAt: envelope.occurredAt,
          payload: envelope.payload,
        } as Prisma.InputJsonValue,
        status: "PENDING",
        attempts: 0,
        availableAt: new Date(record.availableAt),
      },
    });
    return mapPrismaRow(created);
  } catch (err) {
    console.warn("[outbox] Prisma persist failed; using in-memory only", err);
    return record;
  }
}

/** Sync enqueue for fire-and-forget call sites — schedules durable persist when possible. */
export function enqueueOutboxSync(topic: string, envelope: GovernedEvent): OutboxRecord {
  const record = toMemoryRecord(topic, envelope);
  memoryOutbox.push(record);
  if (isIsolatedFusionDatabaseConfigured()) {
    void prisma.fusionOutboxEvent
      .create({
        data: {
          id: record.id,
          businessId: envelope.businessId,
          topic,
          schemaVersion: envelope.schemaVersion,
          aggregateType: envelope.aggregateType,
          aggregateId: envelope.aggregateId,
          correlationId: envelope.correlationId,
          payload: {
            name: envelope.name,
            schemaVersion: envelope.schemaVersion,
            workspaceId: envelope.workspaceId,
            businessId: envelope.businessId,
            occurredAt: envelope.occurredAt,
            payload: envelope.payload,
          } as Prisma.InputJsonValue,
          status: "PENDING",
          attempts: 0,
          availableAt: new Date(record.availableAt),
        },
      })
      .catch((err) => console.warn("[outbox] sync persist failed", err));
  }
  return record;
}

export type ListOutboxOptions = {
  limit?: number;
  status?: OutboxStatus | OutboxStatus[];
  businessId?: string;
};

/** List outbox records — prefers Prisma when isolated DB is configured. */
export async function listOutbox(opts: ListOutboxOptions = {}): Promise<OutboxRecord[]> {
  const limit = opts.limit ?? 50;
  const statuses = opts.status
    ? Array.isArray(opts.status)
      ? opts.status
      : [opts.status]
    : undefined;

  if (isIsolatedFusionDatabaseConfigured()) {
    try {
      const rows = await prisma.fusionOutboxEvent.findMany({
        where: {
          ...(statuses ? { status: { in: statuses } } : {}),
          ...(opts.businessId ? { businessId: opts.businessId } : {}),
        },
        orderBy: { availableAt: "asc" },
        take: limit,
      });
      return rows.map(mapPrismaRow);
    } catch (err) {
      console.warn("[outbox] list from Prisma failed; falling back to memory", err);
    }
  }

  return memoryOutbox
    .filter((r) => {
      if (statuses && !statuses.includes(r.status)) return false;
      if (opts.businessId && r.envelope.businessId !== opts.businessId) return false;
      return true;
    })
    .slice(0, limit);
}

export function listPendingOutbox(limit = 50): OutboxRecord[] {
  return memoryOutbox.filter((r) => r.status === "PENDING").slice(0, limit);
}

export type DrainOutboxResult = {
  drained: OutboxRecord[];
  source: "memory" | "prisma";
};

/**
 * Claim PENDING records (→ PROCESSING → PUBLISHED) for a simple drain worker.
 * Prefer Prisma when isolated DB is configured; otherwise drain memory.
 */
export async function drainOutbox(limit = 50): Promise<DrainOutboxResult> {
  const now = new Date();

  if (isIsolatedFusionDatabaseConfigured()) {
    try {
      const pending = await prisma.fusionOutboxEvent.findMany({
        where: { status: "PENDING", availableAt: { lte: now } },
        orderBy: { availableAt: "asc" },
        take: limit,
      });

      const drained: OutboxRecord[] = [];
      for (const row of pending) {
        const updated = await prisma.fusionOutboxEvent.update({
          where: { id: row.id },
          data: {
            status: "PUBLISHED",
            attempts: { increment: 1 },
            publishedAt: now,
            lastError: null,
          },
        });
        const mapped = mapPrismaRow(updated);
        const mem = memoryOutbox.find((r) => r.id === row.id);
        if (mem) {
          mem.status = "PUBLISHED";
          mem.attempts = mapped.attempts;
        }
        drained.push(mapped);
      }
      return { drained, source: "prisma" };
    } catch (err) {
      console.warn("[outbox] Prisma drain failed; falling back to memory", err);
    }
  }

  const pending = memoryOutbox.filter((r) => r.status === "PENDING").slice(0, limit);
  for (const record of pending) {
    record.status = "PUBLISHED";
    record.attempts += 1;
  }
  return { drained: pending, source: "memory" };
}

/** Test helper — clear in-memory outbox */
export function resetMemoryOutbox() {
  memoryOutbox.length = 0;
}

/** Mark a record FAILED (dead letter) — used by workers / tests */
export async function markOutboxFailed(
  id: string,
  lastError: string
): Promise<OutboxRecord | null> {
  const mem = memoryOutbox.find((r) => r.id === id);
  if (mem) {
    mem.status = "FAILED";
    mem.lastError = lastError;
    mem.attempts += 1;
  }

  if (isIsolatedFusionDatabaseConfigured()) {
    try {
      const updated = await prisma.fusionOutboxEvent.update({
        where: { id },
        data: {
          status: "FAILED",
          lastError,
          attempts: { increment: 1 },
        },
      });
      return mapPrismaRow(updated);
    } catch {
      // fall through to memory
    }
  }

  return mem ?? null;
}

/** List dead letters (FAILED outbox events) for recovery UI */
export async function listDeadLetters(opts: {
  businessId?: string;
  limit?: number;
} = {}): Promise<OutboxRecord[]> {
  return listOutbox({
    status: "FAILED",
    businessId: opts.businessId,
    limit: opts.limit ?? 50,
  });
}

/** Retry a dead letter — reset to PENDING */
export async function retryDeadLetter(id: string): Promise<OutboxRecord | null> {
  const mem = memoryOutbox.find((r) => r.id === id);
  if (mem) {
    mem.status = "PENDING";
    mem.lastError = undefined;
    mem.availableAt = new Date().toISOString();
  }

  if (isIsolatedFusionDatabaseConfigured()) {
    try {
      const updated = await prisma.fusionOutboxEvent.update({
        where: { id },
        data: {
          status: "PENDING",
          lastError: null,
          availableAt: new Date(),
        },
      });
      return mapPrismaRow(updated);
    } catch {
      // fall through
    }
  }

  return mem ?? null;
}

/**
 * Discard a dead letter — marks PUBLISHED with lastError retained as discarded note.
 * Removes from retry queue without re-delivery.
 */
export async function discardDeadLetter(
  id: string,
  reason = "discarded_by_operator"
): Promise<OutboxRecord | null> {
  const mem = memoryOutbox.find((r) => r.id === id);
  if (mem) {
    mem.status = "PUBLISHED";
    mem.lastError = reason;
  }

  if (isIsolatedFusionDatabaseConfigured()) {
    try {
      const updated = await prisma.fusionOutboxEvent.update({
        where: { id },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
          lastError: reason.slice(0, 2000),
        },
      });
      return mapPrismaRow(updated);
    } catch {
      // fall through
    }
  }

  return mem ?? null;
}

/**
 * Simple outbox worker tick — drains PENDING records via handler.
 * Intended for Admin "Process now" and future cron against isolated DB only.
 */
export async function processOutboxTick(
  handler: (record: OutboxRecord) => Promise<void>,
  opts: { limit?: number; businessId?: string } = {}
): Promise<{ processed: number; failed: number; ids: string[] }> {
  const pending = await listOutbox({
    status: "PENDING",
    businessId: opts.businessId,
    limit: opts.limit ?? 20,
  });
  let processed = 0;
  let failed = 0;
  const ids: string[] = [];

  for (const record of pending) {
    try {
      await handler(record);
      // mark published via drain helper path
      const mem = memoryOutbox.find((r) => r.id === record.id);
      if (mem) {
        mem.status = "PUBLISHED";
        mem.attempts += 1;
      }
      if (isIsolatedFusionDatabaseConfigured()) {
        try {
          await prisma.fusionOutboxEvent.update({
            where: { id: record.id },
            data: {
              status: "PUBLISHED",
              attempts: { increment: 1 },
              publishedAt: new Date(),
              lastError: null,
            },
          });
        } catch {
          // memory already updated
        }
      }
      processed += 1;
      ids.push(record.id);
    } catch (err) {
      failed += 1;
      await markOutboxFailed(
        record.id,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  return { processed, failed, ids };
}

const idempotencyMemory = new Map<
  string,
  { response: unknown; expiresAt: number; requestHash: string }
>();

export function rememberIdempotent<T>(
  businessId: string,
  operation: string,
  key: string,
  request: unknown,
  response: T,
  ttlMs = 24 * 60 * 60 * 1000
): T {
  idempotencyMemory.set(`${businessId}:${operation}:${key}`, {
    response,
    requestHash: hashPayload(request),
    expiresAt: Date.now() + ttlMs,
  });
  return response;
}

export function recallIdempotent<T>(
  businessId: string,
  operation: string,
  key: string,
  request?: unknown
): T | undefined {
  const hit = idempotencyMemory.get(`${businessId}:${operation}:${key}`);
  if (!hit) return undefined;
  if (hit.expiresAt < Date.now()) {
    idempotencyMemory.delete(`${businessId}:${operation}:${key}`);
    return undefined;
  }
  if (request !== undefined && hit.requestHash !== hashPayload(request)) {
    return undefined;
  }
  return hit.response as T;
}

/** @deprecated Prefer createGovernedEvent — kept for early fusion call sites */
export type EventEnvelope<T = unknown> = {
  schemaVersion: 1;
  eventName: string;
  occurredAt: string;
  correlationId: string;
  workspaceId?: string;
  businessId?: string;
  actorType: "USER" | "SYSTEM" | "PUBLIC" | "ADMIN";
  actorId?: string;
  idempotencyKey?: string;
  payload: T;
};

export function createEventEnvelope<T>(
  eventName: string,
  payload: T,
  opts: Partial<Omit<EventEnvelope<T>, "schemaVersion" | "eventName" | "payload" | "occurredAt">> & {
    correlationId?: string;
  } = {}
): EventEnvelope<T> {
  return {
    schemaVersion: 1,
    eventName,
    occurredAt: new Date().toISOString(),
    correlationId: opts.correlationId ?? newId(),
    workspaceId: opts.workspaceId,
    businessId: opts.businessId,
    actorType: opts.actorType ?? "SYSTEM",
    actorId: opts.actorId,
    idempotencyKey: opts.idempotencyKey,
    payload,
  };
}
