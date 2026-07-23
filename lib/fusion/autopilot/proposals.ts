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
  type ProposalAuditEntry,
  type ProposalGovernanceAction,
  canApplyArtifacts,
} from "./types";

const memoryProposals = new Map<string, AutopilotProposal>();
const memoryAuditTrail = new Map<string, ProposalAuditEntry[]>();

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
  const appliedAt = extractAppliedAt(warnings);
  const revisionRaw = extractRevision(warnings);
  const supersedesId = extractSupersedesId(warnings);

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
    warnings: stripInternalMeta(warnings),
    acceptedArtifactKinds: Array.isArray(row.acceptedArtifactKinds)
      ? (row.acceptedArtifactKinds as string[])
      : [],
    previousStatus: row.previousStatus ? fromPrismaStatus(row.previousStatus) : null,
    actorId: row.actorId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    decidedAt: row.decidedAt?.toISOString() ?? null,
    appliedAt: appliedAt ?? null,
    revision: revisionRaw ? Number(revisionRaw) : undefined,
    supersedesId: supersedesId ?? null,
  };
}

const RECIPE_VERSION_PREFIX = "__recipeVersion:";
const APPLIED_AT_PREFIX = "__appliedAt:";
const REVISION_PREFIX = "__revision:";
const SUPERSEDES_PREFIX = "__supersedes:";

function encodeRecipeVersionMeta(version: string): string {
  return `${RECIPE_VERSION_PREFIX}${version}`;
}

function encodeAppliedAtMeta(at: string): string {
  return `${APPLIED_AT_PREFIX}${at}`;
}

function encodeRevisionMeta(revision: number): string {
  return `${REVISION_PREFIX}${revision}`;
}

function encodeSupersedesMeta(id: string): string {
  return `${SUPERSEDES_PREFIX}${id}`;
}

function extractRecipeVersion(warnings: string[]): string | undefined {
  const hit = warnings.find((w) => w.startsWith(RECIPE_VERSION_PREFIX));
  return hit ? hit.slice(RECIPE_VERSION_PREFIX.length) : undefined;
}

function extractAppliedAt(warnings: string[]): string | undefined {
  const hit = warnings.find((w) => w.startsWith(APPLIED_AT_PREFIX));
  return hit ? hit.slice(APPLIED_AT_PREFIX.length) : undefined;
}

function extractRevision(warnings: string[]): string | undefined {
  const hit = warnings.find((w) => w.startsWith(REVISION_PREFIX));
  return hit ? hit.slice(REVISION_PREFIX.length) : undefined;
}

function extractSupersedesId(warnings: string[]): string | undefined {
  const hit = warnings.find((w) => w.startsWith(SUPERSEDES_PREFIX));
  return hit ? hit.slice(SUPERSEDES_PREFIX.length) : undefined;
}

function stripInternalMeta(warnings: string[]): string[] {
  return warnings.filter(
    (w) =>
      !w.startsWith(RECIPE_VERSION_PREFIX) &&
      !w.startsWith(APPLIED_AT_PREFIX) &&
      !w.startsWith(REVISION_PREFIX) &&
      !w.startsWith(SUPERSEDES_PREFIX)
  );
}

function withProposalMeta(
  warnings: string[],
  meta: {
    recipeVersion?: string;
    appliedAt?: string | null;
    revision?: number;
    supersedesId?: string | null;
  }
): string[] {
  let next = stripInternalMeta(warnings);
  if (meta.recipeVersion) next = [...next, encodeRecipeVersionMeta(meta.recipeVersion)];
  if (meta.appliedAt) next = [...next, encodeAppliedAtMeta(meta.appliedAt)];
  if (meta.revision != null) next = [...next, encodeRevisionMeta(meta.revision)];
  if (meta.supersedesId) next = [...next, encodeSupersedesMeta(meta.supersedesId)];
  return next;
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
  supersedesId?: string;
  revision?: number;
};

function appendAudit(
  proposalId: string,
  entry: Omit<ProposalAuditEntry, "proposalId">
): ProposalAuditEntry {
  const full: ProposalAuditEntry = { proposalId, ...entry };
  const list = memoryAuditTrail.get(proposalId) ?? [];
  list.push(full);
  memoryAuditTrail.set(proposalId, list);
  return full;
}

async function persistAudit(
  businessId: string,
  proposalId: string,
  action: ProposalGovernanceAction,
  actorId: string | undefined,
  metadata: Record<string, unknown>
) {
  appendAudit(proposalId, {
    action,
    actorId: actorId ?? null,
    at: new Date().toISOString(),
    metadata,
  });

  if (!isIsolatedFusionDatabaseConfigured()) return;

  const corr = correlationId();
  try {
    await prisma.platformAuditEvent.create({
      data: {
        businessId,
        actorType: "USER",
        actorId,
        action,
        resourceType: "autopilot_proposal",
        resourceId: proposalId,
        correlationId: corr,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  } catch {
    // optional
  }

  await enqueueOutbox(
    "autopilot.proposal",
    createGovernedEvent({
      name: action,
      businessId,
      aggregateType: "autopilot_proposal",
      aggregateId: proposalId,
      correlationId: corr,
      payload: metadata,
    })
  );
}

export function getProposalGovernanceTrail(proposalId: string): ProposalAuditEntry[] {
  return [...(memoryAuditTrail.get(proposalId) ?? [])];
}

export async function nextProposalRevision(
  businessId: string,
  recipeId: string
): Promise<number> {
  const existing = await listProposals(businessId, { limit: 200 });
  const sameRecipe = existing.filter((p) => p.recipeId === recipeId);
  const maxRev = sameRecipe.reduce((n, p) => Math.max(n, p.revision ?? 1), 0);
  return maxRev + 1;
}

export async function createProposal(input: CreateProposalInput): Promise<AutopilotProposal> {
  const status = input.status ?? "pending";
  const id =
    input.id ??
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `prop_${Date.now().toString(36)}`);

  const revision =
    input.revision ??
    (input.businessId
      ? await nextProposalRevision(input.businessId, input.recipeId)
      : 1);

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
    appliedAt: null,
    revision,
    supersedesId: input.supersedesId ?? null,
  };

  memoryProposals.set(id, proposal);

  if (isIsolatedFusionDatabaseConfigured()) {
    try {
      const persistWarnings = withProposalMeta(input.warnings ?? [], {
        recipeVersion: input.recipeVersion,
        revision,
        supersedesId: input.supersedesId,
      });
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

      await persistAudit(input.businessId, id, "autopilot.proposal.create", input.actorId, {
        status,
        recipeId: input.recipeId,
        recipeVersion: input.recipeVersion,
        mode: input.mode,
        revision,
        supersedesId: input.supersedesId,
      });

      if (input.supersedesId) {
        await decideProposal({
          proposalId: input.supersedesId,
          businessId: input.businessId,
          action: { type: "supersede" },
          actorId: input.actorId,
        });
      }

      return mapped;
    } catch (err) {
      console.warn("[autopilot] proposal persist failed; using memory", err);
    }
  }

  await persistAudit(input.businessId, id, "autopilot.proposal.create", input.actorId, {
    status,
    recipeId: input.recipeId,
    recipeVersion: input.recipeVersion,
    mode: input.mode,
    revision,
    supersedesId: input.supersedesId,
  });

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
    decidedAt: transition.status === "undone" ? null : new Date().toISOString(),
    appliedAt: transition.status === "undone" ? null : existing.appliedAt,
  };

  memoryProposals.set(next.id, next);

  if (isIsolatedFusionDatabaseConfigured()) {
    try {
      const persistWarnings = withProposalMeta(existing.warnings, {
        recipeVersion: existing.recipeVersion,
        appliedAt: next.appliedAt,
        revision: existing.revision,
        supersedesId: existing.supersedesId,
      });
      const row = await prisma.autopilotProposal.update({
        where: { id: next.id },
        data: {
          status: toPrismaStatus(next.status),
          previousStatus: toPrismaStatus(transition.previousStatus),
          acceptedArtifactKinds: acceptedKinds as unknown as Prisma.InputJsonValue,
          actorId: input.actorId,
          decidedAt: next.decidedAt ? new Date(next.decidedAt) : null,
          warnings: persistWarnings as unknown as Prisma.InputJsonValue,
        },
      });
      const mapped = mapRow(row);
      memoryProposals.set(mapped.id, mapped);

      const actionName: ProposalGovernanceAction =
        input.action.type === "partial"
          ? "autopilot.proposal.partial"
          : input.action.type === "accept"
            ? "autopilot.proposal.accept"
            : input.action.type === "reject"
              ? "autopilot.proposal.reject"
              : input.action.type === "undo"
                ? "autopilot.proposal.undo"
                : "autopilot.proposal.supersede";

      await persistAudit(input.businessId, next.id, actionName, input.actorId, {
        from: transition.previousStatus,
        to: transition.status,
        acceptedKinds,
      });

      if (input.action.type === "undo" && existing.appliedAt) {
        await persistAudit(
          input.businessId,
          next.id,
          "autopilot.proposal.undo_apply",
          input.actorId,
          { priorAppliedAt: existing.appliedAt }
        );
      }

      return { ok: true, proposal: mapped };
    } catch (err) {
      console.warn("[autopilot] decide persist failed; using memory", err);
    }
  }

  const actionName: ProposalGovernanceAction =
    input.action.type === "partial"
      ? "autopilot.proposal.partial"
      : input.action.type === "accept"
        ? "autopilot.proposal.accept"
        : input.action.type === "reject"
          ? "autopilot.proposal.reject"
          : input.action.type === "undo"
            ? "autopilot.proposal.undo"
            : "autopilot.proposal.supersede";

  await persistAudit(input.businessId, next.id, actionName, input.actorId, {
    from: transition.previousStatus,
    to: transition.status,
    acceptedKinds,
  });

  if (input.action.type === "undo" && existing.appliedAt) {
    await persistAudit(input.businessId, next.id, "autopilot.proposal.undo_apply", input.actorId, {
      priorAppliedAt: existing.appliedAt,
    });
  }

  return { ok: true, proposal: next };
}

export type ApplyProposalInput = {
  proposalId: string;
  businessId: string;
  actorId?: string;
  targetResourceId?: string;
};

export async function applyProposal(
  input: ApplyProposalInput
): Promise<
  | { ok: true; proposal: AutopilotProposal }
  | {
      ok: false;
      code: "not_found" | "not_decided" | "already_applied" | "persist_failed";
      message: string;
    }
> {
  const existing = await getProposal(input.proposalId, input.businessId);
  if (!existing) {
    return { ok: false, code: "not_found", message: "Proposal not found" };
  }
  if (!canApplyArtifacts(existing.status)) {
    return {
      ok: false,
      code: "not_decided",
      message: `Cannot apply from status ${existing.status} — accept or partial-accept first`,
    };
  }
  if (existing.appliedAt) {
    return {
      ok: false,
      code: "already_applied",
      message: "Proposal artifacts were already applied",
    };
  }

  const appliedAt = new Date().toISOString();
  const next: AutopilotProposal = {
    ...existing,
    appliedAt,
    actorId: input.actorId ?? existing.actorId,
    updatedAt: appliedAt,
  };

  memoryProposals.set(next.id, next);

  if (isIsolatedFusionDatabaseConfigured()) {
    try {
      const persistWarnings = withProposalMeta(existing.warnings, {
        recipeVersion: existing.recipeVersion,
        appliedAt,
        revision: existing.revision,
        supersedesId: existing.supersedesId,
      });
      const row = await prisma.autopilotProposal.update({
        where: { id: next.id },
        data: {
          warnings: persistWarnings as unknown as Prisma.InputJsonValue,
          actorId: input.actorId,
        },
      });
      const mapped = mapRow(row);
      memoryProposals.set(mapped.id, mapped);

      await persistAudit(input.businessId, next.id, "autopilot.proposal.apply", input.actorId, {
        status: existing.status,
        acceptedArtifactKinds: existing.acceptedArtifactKinds,
        targetResourceId: input.targetResourceId,
        appliedAt,
      });

      return { ok: true, proposal: mapped };
    } catch (err) {
      console.warn("[autopilot] apply persist failed; using memory", err);
    }
  }

  await persistAudit(input.businessId, next.id, "autopilot.proposal.apply", input.actorId, {
    status: existing.status,
    acceptedArtifactKinds: existing.acceptedArtifactKinds,
    targetResourceId: input.targetResourceId,
    appliedAt,
  });

  return { ok: true, proposal: next };
}

export function resetProposalMemory() {
  memoryProposals.clear();
  memoryAuditTrail.clear();
}
