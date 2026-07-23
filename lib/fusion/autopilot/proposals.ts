/**
 * Autopilot proposal persistence + lifecycle (accept / reject / partial / undo).
 */

import type { AutopilotProposalStatus as PrismaStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isIsolatedFusionDatabaseConfigured } from "@/lib/fusion/db/safety";
import { createGovernedEvent, enqueueOutbox } from "@/lib/fusion/publication/events";
import {
  transitionProposal,
  type AutopilotArtifact,
  type AutopilotMode,
  type AutopilotProposal,
  type AutopilotProposalStatus,
  type ProposalAction,
} from "./types";

const memoryProposals = new Map<string, AutopilotProposal>();

function correlationId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `ap_${Date.now().toString(36)}`;
}

function toPrismaStatus(status: AutopilotProposalStatus): PrismaStatus {
  return status.toUpperCase() as PrismaStatus;
}

function fromPrismaStatus(status: PrismaStatus): AutopilotProposalStatus {
  return status.toLowerCase() as AutopilotProposalStatus;
}

function mapRow(row: {
  id: string;
  businessId: string;
  recipeId: string;
  mode: string;
  status: PrismaStatus;
  prompt: string;
  summary: string;
  artifacts: unknown;
  warnings: unknown;
  acceptedArtifactKinds: unknown;
  previousStatus: PrismaStatus | null;
  actorId: string | null;
  createdAt: Date;
  updatedAt: Date;
  decidedAt: Date | null;
}): AutopilotProposal {
  const warnings = Array.isArray(row.warnings) ? (row.warnings as string[]) : [];
  const recipeVersion =
    extractRecipeVersion(warnings) ??
    (typeof (row as { recipeVersion?: string }).recipeVersion === "string"
      ? (row as { recipeVersion?: string }).recipeVersion
      : undefined);

  return {
    id: row.id,
    businessId: row.businessId,
    recipeId: row.recipeId,
    recipeVersion,
    mode: row.mode as AutopilotMode,
    status: fromPrismaStatus(row.status),
    prompt: row.prompt,
    summary: row.summary,
    artifacts: Array.isArray(row.artifacts) ? (row.artifacts as AutopilotArtifact[]) : [],
    warnings: stripRecipeVersionMeta(warnings),
    acceptedArtifactKinds: Array.isArray(row.acceptedArtifactKinds)
      ? (row.acceptedArtifactKinds as string[])
      : [],
    previousStatus: row.previousStatus ? fromPrismaStatus(row.previousStatus) : null,
    actorId: row.actorId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    decidedAt: row.decidedAt?.toISOString() ?? null,
  };
}

const RECIPE_VERSION_PREFIX = "__recipeVersion:";

function encodeRecipeVersionMeta(version: string): string {
  return `${RECIPE_VERSION_PREFIX}${version}`;
}

function extractRecipeVersion(warnings: string[]): string | undefined {
  const hit = warnings.find((w) => w.startsWith(RECIPE_VERSION_PREFIX));
  return hit ? hit.slice(RECIPE_VERSION_PREFIX.length) : undefined;
}

function stripRecipeVersionMeta(warnings: string[]): string[] {
  return warnings.filter((w) => !w.startsWith(RECIPE_VERSION_PREFIX));
}

function withRecipeVersionMeta(warnings: string[], recipeVersion?: string): string[] {
  const cleaned = stripRecipeVersionMeta(warnings);
  if (!recipeVersion) return cleaned;
  return [...cleaned, encodeRecipeVersionMeta(recipeVersion)];
}

export type CreateProposalInput = {
  id?: string;
  businessId: string;
  recipeId: string;
  recipeVersion?: string;
  mode: AutopilotMode;
  status?: AutopilotProposalStatus;
  prompt: string;
  summary: string;
  artifacts: AutopilotArtifact[];
  warnings?: string[];
  actorId?: string;
};

export async function createProposal(input: CreateProposalInput): Promise<AutopilotProposal> {
  const status = input.status ?? "pending";
  const id =
    input.id ??
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `prop_${Date.now().toString(36)}`);

  const proposal: AutopilotProposal = {
    id,
    businessId: input.businessId,
    recipeId: input.recipeId,
    recipeVersion: input.recipeVersion,
    mode: input.mode,
    status,
    prompt: input.prompt,
    summary: input.summary,
    artifacts: input.artifacts,
    warnings: input.warnings ?? [],
    acceptedArtifactKinds: [],
    previousStatus: null,
    actorId: input.actorId ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    decidedAt: status === "accepted" ? new Date().toISOString() : null,
  };

  memoryProposals.set(id, proposal);

  if (isIsolatedFusionDatabaseConfigured()) {
    try {
      const persistWarnings = withRecipeVersionMeta(
        input.warnings ?? [],
        input.recipeVersion
      );
      const row = await prisma.autopilotProposal.create({
        data: {
          id,
          businessId: input.businessId,
          recipeId: input.recipeId,
          mode: input.mode,
          status: toPrismaStatus(status),
          prompt: input.prompt,
          summary: input.summary,
          artifacts: input.artifacts as unknown as Prisma.InputJsonValue,
          warnings: persistWarnings as unknown as Prisma.InputJsonValue,
          acceptedArtifactKinds: [],
          actorId: input.actorId,
          decidedAt: status === "accepted" ? new Date() : null,
        },
      });
      const mapped = mapRow(row);
      mapped.recipeVersion = mapped.recipeVersion ?? input.recipeVersion;
      memoryProposals.set(id, mapped);

      const corr = correlationId();
      try {
        await prisma.platformAuditEvent.create({
          data: {
            businessId: input.businessId,
            actorType: "USER",
            actorId: input.actorId,
            action: "autopilot.proposal.create",
            resourceType: "autopilot_proposal",
            resourceId: id,
            correlationId: corr,
            metadata: {
              status,
              recipeId: input.recipeId,
              recipeVersion: input.recipeVersion,
              mode: input.mode,
            },
          },
        });
      } catch {
        // optional
      }

      await enqueueOutbox(
        "autopilot.proposal",
        createGovernedEvent({
          name: "autopilot.proposal.created",
          businessId: input.businessId,
          aggregateType: "autopilot_proposal",
          aggregateId: id,
          correlationId: corr,
          payload: {
            status,
            recipeId: input.recipeId,
            recipeVersion: input.recipeVersion,
          },
        })
      );

      return mapped;
    } catch (err) {
      console.warn("[autopilot] proposal persist failed; using memory", err);
    }
  }

  return proposal;
}

export async function listProposals(
  businessId: string,
  opts: { limit?: number; status?: AutopilotProposalStatus } = {}
): Promise<AutopilotProposal[]> {
  const limit = opts.limit ?? 50;

  if (isIsolatedFusionDatabaseConfigured()) {
    try {
      const rows = await prisma.autopilotProposal.findMany({
        where: {
          businessId,
          ...(opts.status ? { status: toPrismaStatus(opts.status) } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return rows.map(mapRow);
    } catch (err) {
      console.warn("[autopilot] list proposals failed", err);
    }
  }

  return Array.from(memoryProposals.values())
    .filter((p) => p.businessId === businessId)
    .filter((p) => (opts.status ? p.status === opts.status : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function getProposal(
  id: string,
  businessId?: string
): Promise<AutopilotProposal | null> {
  if (isIsolatedFusionDatabaseConfigured()) {
    try {
      const row = await prisma.autopilotProposal.findFirst({
        where: { id, ...(businessId ? { businessId } : {}) },
      });
      if (row) return mapRow(row);
    } catch (err) {
      console.warn("[autopilot] get proposal failed", err);
    }
  }
  const mem = memoryProposals.get(id);
  if (!mem) return null;
  if (businessId && mem.businessId !== businessId) return null;
  return mem;
}

export type DecideProposalInput = {
  proposalId: string;
  businessId: string;
  action: ProposalAction;
  actorId?: string;
};

export async function decideProposal(
  input: DecideProposalInput
): Promise<
  | { ok: true; proposal: AutopilotProposal }
  | { ok: false; code: "not_found" | "invalid_transition" | "persist_failed"; message: string }
> {
  const existing = await getProposal(input.proposalId, input.businessId);
  if (!existing) {
    return { ok: false, code: "not_found", message: "Proposal not found" };
  }

  const transition = transitionProposal(existing.status, input.action);
  if (!transition.ok) {
    return { ok: false, code: "invalid_transition", message: transition.message };
  }

  const acceptedKinds =
    input.action.type === "partial"
      ? input.action.artifactKinds
      : input.action.type === "accept"
        ? existing.artifacts.map((a) => a.kind)
        : input.action.type === "undo"
          ? []
          : existing.acceptedArtifactKinds ?? [];

  const next: AutopilotProposal = {
    ...existing,
    status: transition.status,
    previousStatus: transition.previousStatus,
    acceptedArtifactKinds: acceptedKinds,
    actorId: input.actorId ?? existing.actorId,
    updatedAt: new Date().toISOString(),
    decidedAt:
      transition.status === "undone" ? null : new Date().toISOString(),
  };

  memoryProposals.set(next.id, next);

  if (isIsolatedFusionDatabaseConfigured()) {
    try {
      const row = await prisma.autopilotProposal.update({
        where: { id: next.id },
        data: {
          status: toPrismaStatus(next.status),
          previousStatus: toPrismaStatus(transition.previousStatus),
          acceptedArtifactKinds: acceptedKinds as unknown as Prisma.InputJsonValue,
          actorId: input.actorId,
          decidedAt: next.decidedAt ? new Date(next.decidedAt) : null,
        },
      });
      const mapped = mapRow(row);
      memoryProposals.set(mapped.id, mapped);

      const corr = correlationId();
      const actionName =
        input.action.type === "partial"
          ? "autopilot.proposal.partial"
          : `autopilot.proposal.${input.action.type}`;

      try {
        await prisma.platformAuditEvent.create({
          data: {
            businessId: input.businessId,
            actorType: "USER",
            actorId: input.actorId,
            action: actionName,
            resourceType: "autopilot_proposal",
            resourceId: next.id,
            correlationId: corr,
            metadata: {
              from: transition.previousStatus,
              to: transition.status,
              acceptedKinds,
            },
          },
        });
      } catch {
        // optional
      }

      await enqueueOutbox(
        "autopilot.proposal",
        createGovernedEvent({
          name: actionName,
          businessId: input.businessId,
          aggregateType: "autopilot_proposal",
          aggregateId: next.id,
          correlationId: corr,
          payload: {
            from: transition.previousStatus,
            to: transition.status,
            acceptedKinds,
          },
        })
      );

      return { ok: true, proposal: mapped };
    } catch (err) {
      console.warn("[autopilot] decide persist failed; using memory", err);
    }
  }

  return { ok: true, proposal: next };
}

export function resetProposalMemory() {
  memoryProposals.clear();
}
