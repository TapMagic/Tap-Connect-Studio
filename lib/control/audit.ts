import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { controlEnvironment } from "@/lib/control/environment";

type AuditClient = Pick<Prisma.TransactionClient, "platformAuditEvent">;

const REDACTED_KEYS = /token|secret|password|credential|authorization|cookie/i;

export function redactAuditValue(value: unknown): Prisma.InputJsonValue {
  if (value === undefined) return {};
  if (value === null) return "[NULL]";
  if (Array.isArray(value)) return value.map(redactAuditValue);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, child]) => [
        key,
        REDACTED_KEYS.test(key) ? "[REDACTED]" : redactAuditValue(child),
      ]),
    );
  }
  if (typeof value === "bigint") return value.toString();
  return value as Prisma.InputJsonValue;
}

export async function appendAuditEvent(input: {
  client?: AuditClient;
  actorId?: string | null;
  actingSubjectId?: string | null;
  targetUserId?: string | null;
  businessId?: string | null;
  action: string;
  permissionUsed?: string | null;
  resourceType: string;
  resourceId: string;
  priorValue?: unknown;
  newValue?: unknown;
  reason?: string | null;
  sessionId?: string | null;
  supportSessionId?: string | null;
  success?: boolean;
  correlationId?: string;
  approvalId?: string | null;
  metadata?: unknown;
}) {
  const client = input.client ?? prisma;
  return client.platformAuditEvent.create({
    data: {
      actorType: input.actorId ? "ADMIN" : "SYSTEM",
      actorId: input.actorId,
      actingSubjectId: input.actingSubjectId,
      targetUserId: input.targetUserId,
      businessId: input.businessId,
      action: input.action,
      permissionUsed: input.permissionUsed,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      priorValue:
        input.priorValue === undefined ? undefined : redactAuditValue(input.priorValue),
      newValue:
        input.newValue === undefined ? undefined : redactAuditValue(input.newValue),
      reason: input.reason,
      environment: controlEnvironment(),
      sessionId: input.sessionId,
      supportSessionId: input.supportSessionId,
      success: input.success ?? true,
      correlationId: input.correlationId ?? randomUUID(),
      approvalId: input.approvalId,
      metadata: redactAuditValue(input.metadata ?? {}),
    },
  });
}
