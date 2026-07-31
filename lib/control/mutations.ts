import { createHash, randomBytes, randomUUID } from "node:crypto";
import type {
  BusinessLifecycleState,
  PermissionEffect,
  PlatformInvitationStatus,
  PlatformUserStatus,
  Prisma,
  UserRole,
  WorkspaceKind,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { appendAuditEvent } from "@/lib/control/audit";
import { approvalDecisionAllowed, APPROVAL_REQUIRED_ACTIONS } from "@/lib/control/approval-policy";
import { DEMO_BLOCKED_ACTIONS, demoReadiness } from "@/lib/control/demo-policy";
import {
  assertControlPermission,
  resolveControlIdentity,
  type ControlActor,
} from "@/lib/control/identity";
import { isLocalDevAuthEnabled } from "@/lib/config/local-dev";
import { acceptControlInvitation } from "@/lib/control/invitation-acceptance";
import { isPlatformPermission, type PlatformPermission } from "@/lib/control/permissions";
import { supportSessionAllows } from "@/lib/control/support-policy";
import {
  hashPublishManifest,
  recordPublicationSnapshot,
} from "@/lib/fusion/publication/snapshots";
import { isTapConnectCardDraft } from "@/lib/fusion/card/draft";

type MutationInput = {
  operation?: unknown;
  data?: unknown;
};

type JsonObject = Record<string, unknown>;

export type ControlMutationResult = {
  ok: true;
  message: string;
  resourceId?: string;
  workspaceId?: string;
  invitationLink?: string;
  cookie?: {
    name: string;
    value: string;
    maxAge: number;
  };
};

const USER_STATUSES = new Set<PlatformUserStatus>([
  "ACTIVE",
  "INVITED",
  "SUSPENDED",
  "ARCHIVED",
  "DELETION_SCHEDULED",
]);
const BUSINESS_STATES = new Set<BusinessLifecycleState>([
  "PROVISIONING",
  "TRIAL",
  "ACTIVE",
  "PAST_DUE",
  "RESTRICTED",
  "SUSPENDED",
  "CANCELLED",
  "ARCHIVED",
  "DELETION_SCHEDULED",
  "DELETED",
  "LEGAL_HOLD",
]);
const WORKSPACE_KINDS = new Set<WorkspaceKind>([
  "CUSTOMER",
  "INTERNAL",
  "PERSONAL_SANDBOX",
  "DEMO",
  "PARTNER",
  "TEST_FIXTURE",
]);
const BUSINESS_ROLES = new Set<UserRole>([
  "OWNER",
  "MANAGER",
  "MARKETING",
  "STAFF_SCANNER",
  "VIEWER",
]);
const INVITATION_STATES = new Set<PlatformInvitationStatus>([
  "DRAFT",
  "SENT",
  "VIEWED",
  "ACCEPTED",
  "EXPIRED",
  "REVOKED",
  "FAILED",
]);

function object(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("A data object is required.");
  }
  return value as JsonObject;
}

function text(data: JsonObject, key: string, options?: { optional?: boolean; min?: number }): string {
  const value = data[key];
  if ((value === undefined || value === null || value === "") && options?.optional) return "";
  if (typeof value !== "string") throw new Error(`${key} must be text.`);
  const trimmed = value.trim();
  if (trimmed.length < (options?.min ?? 1)) throw new Error(`${key} is required.`);
  return trimmed;
}

function optionalText(data: JsonObject, key: string): string | null {
  const value = data[key];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new Error(`${key} must be text.`);
  return value.trim() || null;
}

function bool(data: JsonObject, key: string, fallback = false): boolean {
  const value = data[key];
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") throw new Error(`${key} must be true or false.`);
  return value;
}

function integer(data: JsonObject, key: string, fallback?: number): number {
  const raw = data[key];
  if (raw === undefined && fallback !== undefined) return fallback;
  const value = typeof raw === "string" ? Number(raw) : raw;
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`${key} must be a whole number.`);
  }
  return value;
}

function optionalDate(data: JsonObject, key: string): Date | null {
  const raw = data[key];
  if (!raw) return null;
  if (typeof raw !== "string") throw new Error(`${key} must be an ISO date.`);
  const value = new Date(raw);
  if (Number.isNaN(value.getTime())) throw new Error(`${key} must be a valid date.`);
  return value;
}

function reason(data: JsonObject): string {
  return text(data, "reason", { min: 4 });
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 55);
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function permissionForOperation(operation: string): PlatformPermission {
  const rules: [RegExp, PlatformPermission][] = [
    [/^identity\./, "platform.dashboard.view"],
    [/^heartbeat$/, "platform.dashboard.view"],
    [/^invitation\./, "users.invite"],
    [/^role\.(create|clone|update|retire)/, "roles.edit"],
    [/^role\.(assign|migrate)/, "roles.assign"],
    [/^user\.permission/, "users.permissions.manage"],
    [/^user\.session/, "users.sessions.revoke"],
    [/^user\.(suspend|restore_signin)/, "users.suspend"],
    [/^user\.(archive|restore_archive)/, "users.archive"],
    [/^user\.(schedule_deletion|cancel_deletion)/, "users.delete_schedule"],
    [/^user\./, "users.edit"],
    [/^business\.member/, "businesses.members.manage"],
    [/^business\.restrict/, "businesses.restrict"],
    [/^business\.(suspend|restore)/, "businesses.suspend"],
    [/^business\.(archive|restore_archive)/, "businesses.archive"],
    [/^business\.(schedule_deletion|cancel_deletion)/, "businesses.delete_schedule"],
    [/^business\.legal_hold/, "businesses.legal_hold"],
    [/^business\.create/, "businesses.create"],
    [/^business\./, "businesses.edit"],
    [/^service\.|^plan\./, "entitlements.plan_manage"],
    [/^entitlement\.restrict/, "entitlements.restrict"],
    [/^entitlement\./, "entitlements.override"],
    [/^view_as\./, "users.support_view"],
    [/^support\./, "users.support_impersonate"],
    [/^demo\.(publish)/, "demo.publish"],
    [/^demo\.(rollback|unpublish)/, "demo.rollback"],
    [/^demo\.binding/, "demo.bind_landing"],
    [/^demo\.reset/, "demo.reset"],
    [/^demo\.(submit|review)/, "demo.promote"],
    [/^demo\.(create|clone)/, "demo.create"],
    [/^demo\./, "demo.edit"],
    [/^approval\.decide/, "approvals.approve"],
    [/^approval\./, "approvals.request"],
    [/^configuration\./, "platform.settings.manage"],
  ];
  return rules.find(([pattern]) => pattern.test(operation))?.[1] ?? "platform.dashboard.view";
}

async function audit(input: {
  actor: ControlActor;
  operation: string;
  permission: PlatformPermission;
  resourceType: string;
  resourceId: string;
  reason?: string | null;
  businessId?: string | null;
  targetUserId?: string | null;
  prior?: unknown;
  next?: unknown;
  approvalId?: string | null;
  supportSessionId?: string | null;
}) {
  await appendAuditEvent({
    actorId: input.actor.id,
    targetUserId: input.targetUserId,
    businessId: input.businessId,
    action: input.operation,
    permissionUsed: input.permission,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    priorValue: input.prior,
    newValue: input.next,
    reason: input.reason,
    approvalId: input.approvalId,
    supportSessionId: input.supportSessionId,
  });
}

export async function performControlMutation(
  actor: ControlActor,
  input: MutationInput,
): Promise<ControlMutationResult> {
  if (typeof input.operation !== "string") throw new Error("operation is required.");
  const operation = input.operation;
  const data = object(input.data ?? {});
  const permission = permissionForOperation(operation);
  const businessId = optionalText(data, "businessId");
  assertControlPermission(actor, permission, businessId);

  if (operation === "heartbeat") {
    const sessionId = text(data, "sessionId");
    const occurredAt = new Date();
    const previous = await prisma.presenceHeartbeat.findFirst({
      where: { userId: actor.id, sessionId },
      orderBy: { occurredAt: "desc" },
    });
    if (previous && occurredAt.getTime() - previous.occurredAt.getTime() < 30_000) {
      return { ok: true, message: "Heartbeat already fresh.", resourceId: previous.id };
    }
    const heartbeat = await prisma.presenceHeartbeat.create({
      data: {
        userId: actor.id,
        sessionId,
        workspaceId: optionalText(data, "workspaceId"),
        majorArea: optionalText(data, "majorArea"),
        occurredAt,
        expiresAt: new Date(occurredAt.getTime() + 120_000),
      },
    });
    await prisma.user.update({
      where: { id: actor.id },
      data: {
        lastSeenAt: occurredAt,
        lastActiveWorkspaceId: optionalText(data, "workspaceId"),
      },
    });
    return { ok: true, message: "Presence updated.", resourceId: heartbeat.id };
  }

  if (operation === "identity.switch") {
    if (!isLocalDevAuthEnabled()) throw new Error("Identity switching is local-fixture only.");
    const identity = text(data, "identity").toLowerCase();
    if (!["rich", "daniel"].includes(identity)) throw new Error("Unknown fixture identity.");
    return {
      ok: true,
      message: `Local fixture identity switched to ${identity}.`,
      cookie: {
        name: "tapconnect_control_identity",
        value: identity,
        maxAge: 86_400,
      },
    };
  }

  if (operation === "invitation.create") {
    const status = (optionalText(data, "status") || "DRAFT") as PlatformInvitationStatus;
    if (!INVITATION_STATES.has(status) || !["DRAFT", "SENT"].includes(status)) {
      throw new Error("A new invitation must be a draft or sent fixture.");
    }
    const roleId = text(data, "roleId");
    const expiresAt =
      optionalDate(data, "expiresAt") ??
      new Date(Date.now() + 7 * 86_400_000);
    if (expiresAt <= new Date()) throw new Error("Invitation expiration must be in the future.");
    const rawToken = status === "SENT" ? randomBytes(32).toString("base64url") : null;
    const invitation = await prisma.platformInvitation.create({
      data: {
        email: text(data, "email").toLowerCase(),
        displayName: text(data, "displayName"),
        roleId,
        status,
        tokenHash: rawToken ? tokenHash(rawToken) : null,
        environmentScope: optionalText(data, "environmentScope") ?? actor.environment,
        expiresAt,
        internalNote: optionalText(data, "internalNote"),
        requireMfa: bool(data, "requireMfa", true),
        createSandbox: bool(data, "createSandbox", true),
        demoPortfolioAccess: bool(data, "demoPortfolioAccess", false),
        createdById: actor.id,
        sentAt: status === "SENT" ? new Date() : null,
      },
    });
    await audit({
      actor,
      operation,
      permission,
      resourceType: "PlatformInvitation",
      resourceId: invitation.id,
      reason: optionalText(data, "internalNote") ?? "Administrator invitation prepared",
      next: { email: invitation.email, roleId, status, expiresAt },
    });
    return {
      ok: true,
      message:
        status === "SENT"
          ? "Fixture invitation marked sent; no Email was sent."
          : "Invitation draft saved.",
      resourceId: invitation.id,
      invitationLink: rawToken
        ? `/control/invitations/accept?token=${encodeURIComponent(rawToken)}`
        : undefined,
    };
  }

  if (operation === "invitation.send" || operation === "invitation.resend") {
    if (!isLocalDevAuthEnabled()) {
      throw new Error("Email delivery is intentionally disabled in this implementation wave.");
    }
    const id = text(data, "id");
    const invitation = await prisma.platformInvitation.findUniqueOrThrow({ where: { id } });
    if (["ACCEPTED", "REVOKED"].includes(invitation.status)) {
      throw new Error("Accepted or revoked invitations cannot be sent.");
    }
    const rawToken = randomBytes(32).toString("base64url");
    const updated = await prisma.platformInvitation.update({
      where: { id },
      data: {
        status: "SENT",
        tokenHash: tokenHash(rawToken),
        sentAt: new Date(),
        expiresAt:
          invitation.expiresAt > new Date()
            ? invitation.expiresAt
            : new Date(Date.now() + 7 * 86_400_000),
        failedReason: null,
      },
    });
    await audit({
      actor,
      operation,
      permission,
      resourceType: "PlatformInvitation",
      resourceId: id,
      reason: reason(data),
      prior: { status: invitation.status },
      next: { status: updated.status, sentAt: updated.sentAt },
    });
    return {
      ok: true,
      message: "Fixture invitation link regenerated; no Email was sent.",
      resourceId: id,
      invitationLink: `/control/invitations/accept?token=${encodeURIComponent(rawToken)}`,
    };
  }

  if (operation === "invitation.revoke" || operation === "invitation.expire") {
    const id = text(data, "id");
    const invitation = await prisma.platformInvitation.findUniqueOrThrow({ where: { id } });
    if (invitation.status === "ACCEPTED") throw new Error("Accepted invitations cannot be revoked.");
    const status = operation === "invitation.revoke" ? "REVOKED" : "EXPIRED";
    const updated = await prisma.platformInvitation.update({
      where: { id },
      data: {
        status,
        revokedAt: status === "REVOKED" ? new Date() : undefined,
        tokenHash: null,
      },
    });
    await audit({
      actor,
      operation,
      permission,
      resourceType: "PlatformInvitation",
      resourceId: id,
      reason: reason(data),
      prior: { status: invitation.status },
      next: { status: updated.status },
    });
    return { ok: true, message: `Invitation ${status.toLowerCase()}.`, resourceId: id };
  }

  if (operation === "invitation.delete_draft") {
    const id = text(data, "id");
    const invitation = await prisma.platformInvitation.findUniqueOrThrow({ where: { id } });
    if (!["DRAFT", "EXPIRED"].includes(invitation.status)) {
      throw new Error("Only draft or expired invitations can be deleted.");
    }
    await prisma.platformInvitation.delete({ where: { id } });
    await audit({
      actor,
      operation,
      permission,
      resourceType: "PlatformInvitation",
      resourceId: id,
      reason: reason(data),
      prior: { email: invitation.email, status: invitation.status },
    });
    return { ok: true, message: "Invitation removed.", resourceId: id };
  }

  if (operation === "invitation.accept") {
    const identity = await resolveControlIdentity();
    if (!identity) throw new Error("Authentication is required to accept an invitation.");
    return acceptControlInvitation({ token: text(data, "token"), identity });
  }

  if (operation === "role.create" || operation === "role.clone") {
    const source =
      operation === "role.clone"
        ? await prisma.platformRole.findUniqueOrThrow({
            where: { id: text(data, "sourceRoleId") },
            include: { permissions: true },
          })
        : null;
    const name = text(data, "name");
    const role = await prisma.platformRole.create({
      data: {
        key: `${slugify(name)}-${randomUUID().slice(0, 6)}`,
        name,
        description: optionalText(data, "description") ?? source?.description ?? "Custom platform role",
        createdById: actor.id,
        permissions: {
          create: (source?.permissions ?? []).map((entry) => ({
            permissionKey: entry.permissionKey,
            effect: entry.effect,
          })),
        },
      },
    });
    await audit({
      actor,
      operation,
      permission,
      resourceType: "PlatformRole",
      resourceId: role.id,
      reason: reason(data),
      next: { name: role.name, clonedFrom: source?.id },
    });
    return { ok: true, message: source ? "Role cloned." : "Role created.", resourceId: role.id };
  }

  if (operation === "role.update") {
    const id = text(data, "id");
    const existing = await prisma.platformRole.findUniqueOrThrow({
      where: { id },
      include: { permissions: true },
    });
    const permissionKeys = Array.isArray(data.permissions)
      ? data.permissions.filter((value): value is string => typeof value === "string")
      : typeof data.permissions === "string"
        ? data.permissions
            .split(/[\s,]+/)
            .map((value) => value.trim())
            .filter(Boolean)
        : existing.permissions.map((entry) => entry.permissionKey);
    if (permissionKeys.some((value) => !isPlatformPermission(value))) {
      throw new Error("Role contains an unknown permission.");
    }
    const updated = await prisma.$transaction(async (tx) => {
      await tx.platformRolePermission.deleteMany({ where: { roleId: id } });
      return tx.platformRole.update({
        where: { id },
        data: {
          name: optionalText(data, "name") ?? existing.name,
          description: optionalText(data, "description") ?? existing.description,
          permissions: {
            create: permissionKeys.map((permissionKey) => ({
              permissionKey,
              effect: "ALLOW",
            })),
          },
        },
      });
    });
    await audit({
      actor,
      operation,
      permission,
      resourceType: "PlatformRole",
      resourceId: id,
      reason: reason(data),
      prior: { name: existing.name, permissions: existing.permissions },
      next: { name: updated.name, permissions: permissionKeys },
    });
    return { ok: true, message: "Role updated.", resourceId: id };
  }

  if (operation === "role.assign") {
    const userId = text(data, "userId");
    const roleId = text(data, "roleId");
    const role = await prisma.platformRole.findUniqueOrThrow({ where: { id: roleId } });
    if (role.ownerRole) {
      throw new Error("Platform Owner assignment requires the governed transfer approval workflow.");
    }
    const scopeBusinessId = businessId ?? "*";
    const binding = await prisma.platformRoleBinding.upsert({
      where: {
        userId_roleId_environmentScope_businessId: {
          userId,
          roleId,
          environmentScope: optionalText(data, "environmentScope") ?? actor.environment,
          businessId: scopeBusinessId,
        },
      },
      create: {
        userId,
        roleId,
        environmentScope: optionalText(data, "environmentScope") ?? actor.environment,
        businessId: scopeBusinessId,
        reason: reason(data),
        grantedById: actor.id,
        expiresAt: optionalDate(data, "expiresAt"),
      },
      update: {
        reason: reason(data),
        expiresAt: optionalDate(data, "expiresAt"),
      },
    });
    await audit({
      actor,
      operation,
      permission,
      resourceType: "PlatformRoleBinding",
      resourceId: binding.id,
      reason: reason(data),
      targetUserId: userId,
      businessId,
      next: { role: role.name },
    });
    return { ok: true, message: "Role assigned.", resourceId: binding.id };
  }

  if (operation === "role.retire") {
    const id = text(data, "id");
    const replacementRoleId = text(data, "replacementRoleId");
    const role = await prisma.platformRole.findUniqueOrThrow({ where: { id } });
    if (role.protected) throw new Error("Protected role templates cannot be retired.");
    if (id === replacementRoleId) throw new Error("Replacement role must be different.");
    await prisma.$transaction(async (tx) => {
      const bindings = await tx.platformRoleBinding.findMany({ where: { roleId: id } });
      for (const binding of bindings) {
        await tx.platformRoleBinding.upsert({
          where: {
            userId_roleId_environmentScope_businessId: {
              userId: binding.userId,
              roleId: replacementRoleId,
              environmentScope: binding.environmentScope,
              businessId: binding.businessId,
            },
          },
          create: {
            userId: binding.userId,
            roleId: replacementRoleId,
            environmentScope: binding.environmentScope,
            businessId: binding.businessId,
            reason: `Migration from retired role ${role.name}: ${reason(data)}`,
            grantedById: actor.id,
          },
          update: {},
        });
      }
      await tx.platformRoleBinding.deleteMany({ where: { roleId: id } });
      await tx.platformRole.update({
        where: { id },
        data: {
          status: "RETIRED",
          retiredAt: new Date(),
          replacementRoleId,
        },
      });
    });
    await audit({
      actor,
      operation,
      permission,
      resourceType: "PlatformRole",
      resourceId: id,
      reason: reason(data),
      prior: { status: role.status },
      next: { status: "RETIRED", replacementRoleId },
    });
    return { ok: true, message: "Role retired and assignments migrated.", resourceId: id };
  }

  if (operation === "user.permission") {
    const userId = text(data, "userId");
    const permissionKey = text(data, "permissionKey");
    if (!isPlatformPermission(permissionKey)) throw new Error("Unknown permission.");
    const effect = text(data, "effect") as PermissionEffect;
    if (!["ALLOW", "DENY"].includes(effect)) throw new Error("Effect must be ALLOW or DENY.");
    const scopeBusinessId = businessId ?? "*";
    const direct = await prisma.platformDirectPermission.upsert({
      where: {
        userId_permissionKey_environmentScope_businessId: {
          userId,
          permissionKey,
          environmentScope: optionalText(data, "environmentScope") ?? actor.environment,
          businessId: scopeBusinessId,
        },
      },
      create: {
        userId,
        permissionKey,
        effect,
        environmentScope: optionalText(data, "environmentScope") ?? actor.environment,
        businessId: scopeBusinessId,
        reason: reason(data),
        grantedById: actor.id,
        expiresAt: optionalDate(data, "expiresAt"),
      },
      update: { effect, reason: reason(data), expiresAt: optionalDate(data, "expiresAt") },
    });
    await audit({
      actor,
      operation,
      permission,
      resourceType: "PlatformDirectPermission",
      resourceId: direct.id,
      reason: reason(data),
      targetUserId: userId,
      businessId,
      next: { permissionKey, effect },
    });
    return { ok: true, message: `Direct ${effect.toLowerCase()} applied.`, resourceId: direct.id };
  }

  if (operation.startsWith("user.")) {
    const id = text(data, "id");
    const user = await prisma.user.findUniqueOrThrow({ where: { id } });
    if (operation === "user.update") {
      const updated = await prisma.user.update({
        where: { id },
        data: {
          displayName: optionalText(data, "displayName") ?? user.displayName,
          preferredTimezone:
            optionalText(data, "preferredTimezone") ?? user.preferredTimezone,
          locale: optionalText(data, "locale") ?? user.locale,
          profilePhotoMediaAssetId:
            data.profilePhotoMediaAssetId === null
              ? null
              : optionalText(data, "profilePhotoMediaAssetId") ??
                user.profilePhotoMediaAssetId,
          profilePhotoAlt:
            data.profilePhotoAlt === null
              ? null
              : optionalText(data, "profilePhotoAlt") ?? user.profilePhotoAlt,
        },
      });
      await audit({
        actor,
        operation,
        permission,
        resourceType: "User",
        resourceId: id,
        targetUserId: id,
        reason: reason(data),
        prior: user,
        next: updated,
      });
      return { ok: true, message: "Profile updated.", resourceId: id };
    }
    if (operation === "user.session_revoke" || operation === "user.session_revoke_all") {
      const sessionId = optionalText(data, "sessionId");
      const result = await prisma.platformSession.updateMany({
        where: {
          userId: id,
          status: "ACTIVE",
          ...(operation === "user.session_revoke" ? { id: sessionId ?? "" } : {}),
        },
        data: { status: "REVOKED", revokedAt: new Date(), revokedById: actor.id },
      });
      await audit({
        actor,
        operation,
        permission,
        resourceType: "PlatformSession",
        resourceId: sessionId ?? id,
        targetUserId: id,
        reason: reason(data),
        next: { revokedCount: result.count },
      });
      return { ok: true, message: `${result.count} session(s) revoked.`, resourceId: id };
    }
    if (operation === "user.require_reauthentication") {
      const result = await prisma.platformSession.updateMany({
        where: { userId: id, status: "ACTIVE" },
        data: { reauthenticationRequired: true },
      });
      await audit({
        actor,
        operation,
        permission,
        resourceType: "User",
        resourceId: id,
        targetUserId: id,
        reason: reason(data),
        next: { sessionsMarked: result.count },
      });
      return { ok: true, message: "Reauthentication required.", resourceId: id };
    }
    const statusMap: Record<string, PlatformUserStatus> = {
      "user.suspend": "SUSPENDED",
      "user.restore_signin": "ACTIVE",
      "user.archive": "ARCHIVED",
      "user.restore_archive": "ACTIVE",
      "user.schedule_deletion": "DELETION_SCHEDULED",
      "user.cancel_deletion": "ACTIVE",
    };
    const nextStatus = statusMap[operation];
    if (!nextStatus || !USER_STATUSES.has(nextStatus)) throw new Error("Unknown user action.");
    const updated = await prisma.user.update({
      where: { id },
      data: {
        platformStatus: nextStatus,
        archivedAt: nextStatus === "ARCHIVED" ? new Date() : nextStatus === "ACTIVE" ? null : undefined,
        deletionState:
          nextStatus === "DELETION_SCHEDULED"
            ? "SCHEDULED"
            : operation === "user.cancel_deletion"
              ? "NONE"
              : undefined,
      },
    });
    if (nextStatus === "DELETION_SCHEDULED") {
      await prisma.deletionRequest.create({
        data: {
          targetType: "User",
          targetId: id,
          requestedById: actor.id,
          reason: reason(data),
          consequence: "Sign-in and new activity will be blocked during the grace period.",
          graceEndsAt: new Date(Date.now() + 30 * 86_400_000),
          status: "GRACE_PERIOD",
        },
      });
    } else if (operation === "user.cancel_deletion") {
      await prisma.deletionRequest.updateMany({
        where: { targetType: "User", targetId: id, status: { notIn: ["APPLIED", "CANCELLED"] } },
        data: { status: "CANCELLED", cancelledAt: new Date(), cancelledById: actor.id },
      });
    }
    await audit({
      actor,
      operation,
      permission,
      resourceType: "User",
      resourceId: id,
      targetUserId: id,
      reason: reason(data),
      prior: { status: user.platformStatus, deletionState: user.deletionState },
      next: { status: updated.platformStatus, deletionState: updated.deletionState },
    });
    return { ok: true, message: `User is now ${nextStatus.toLowerCase().replaceAll("_", " ")}.`, resourceId: id };
  }

  if (operation === "business.create") {
    const name = text(data, "name");
    const kind = text(data, "workspaceKind") as WorkspaceKind;
    if (!WORKSPACE_KINDS.has(kind) || (kind === "TEST_FIXTURE" && !isLocalDevAuthEnabled())) {
      throw new Error("Invalid workspace kind.");
    }
    const baseSlug = optionalText(data, "slug") ?? slugify(name);
    const existingByName = await prisma.business.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
    if (existingByName) {
      throw new Error(`A business named ${name} already exists; choose it instead of creating a duplicate.`);
    }
    const business = await prisma.business.create({
      data: {
        name,
        slug: baseSlug,
        workspaceKind: kind,
        lifecycleState: "ACTIVE",
        planDefinitionId: optionalText(data, "planDefinitionId"),
      },
    });
    await audit({
      actor,
      operation,
      permission,
      resourceType: "Business",
      resourceId: business.id,
      businessId: business.id,
      reason: reason(data),
      next: business,
    });
    return { ok: true, message: "Workspace created.", resourceId: business.id };
  }

  if (operation.startsWith("business.")) {
    const id = text(data, "id");
    const business = await prisma.business.findUniqueOrThrow({
      where: { id },
      include: { legalHolds: { where: { releasedAt: null } } },
    });
    if (operation === "business.member_upsert") {
      const userId = text(data, "userId");
      const role = text(data, "role") as UserRole;
      if (!BUSINESS_ROLES.has(role)) throw new Error("Unknown business role.");
      const membership = await prisma.businessUser.upsert({
        where: { businessId_userId: { businessId: id, userId } },
        create: { businessId: id, userId, role },
        update: { role },
      });
      await audit({
        actor,
        operation,
        permission,
        resourceType: "BusinessUser",
        resourceId: membership.id,
        businessId: id,
        targetUserId: userId,
        reason: reason(data),
        next: { role },
      });
      return { ok: true, message: "Business membership updated.", resourceId: membership.id };
    }
    if (operation === "business.member_remove") {
      const userId = text(data, "userId");
      const membership = await prisma.businessUser.findUniqueOrThrow({
        where: { businessId_userId: { businessId: id, userId } },
      });
      if (membership.role === "OWNER") {
        const owners = await prisma.businessUser.count({ where: { businessId: id, role: "OWNER" } });
        if (owners <= 1) throw new Error("Assign another Owner before removing the only Owner.");
      }
      await prisma.businessUser.delete({ where: { id: membership.id } });
      await audit({
        actor,
        operation,
        permission,
        resourceType: "BusinessUser",
        resourceId: membership.id,
        businessId: id,
        targetUserId: userId,
        reason: reason(data),
        prior: membership,
      });
      return { ok: true, message: "Business membership removed.", resourceId: membership.id };
    }
    if (operation === "business.update") {
      const kind = (optionalText(data, "workspaceKind") ?? business.workspaceKind) as WorkspaceKind;
      if (!WORKSPACE_KINDS.has(kind)) throw new Error("Invalid workspace kind.");
      const updated = await prisma.business.update({
        where: { id },
        data: {
          name: optionalText(data, "name") ?? business.name,
          workspaceKind: kind,
          planDefinitionId:
            data.planDefinitionId === null
              ? null
              : optionalText(data, "planDefinitionId") ?? business.planDefinitionId,
        },
      });
      await audit({
        actor,
        operation,
        permission,
        resourceType: "Business",
        resourceId: id,
        businessId: id,
        reason: reason(data),
        prior: business,
        next: updated,
      });
      return { ok: true, message: "Workspace updated.", resourceId: id };
    }
    if (operation === "business.restrict") {
      const capability = text(data, "capability");
      const restriction = await prisma.accountRestriction.create({
        data: {
          businessId: id,
          capability,
          reason: reason(data),
          internalNote: optionalText(data, "internalNote"),
          customerVisibleExplanation: optionalText(data, "customerVisibleExplanation"),
          expiresAt: optionalDate(data, "expiresAt"),
          createdById: actor.id,
        },
      });
      if (business.lifecycleState === "ACTIVE") {
        await prisma.business.update({
          where: { id },
          data: { lifecycleState: "RESTRICTED" },
        });
      }
      await audit({
        actor,
        operation,
        permission,
        resourceType: "AccountRestriction",
        resourceId: restriction.id,
        businessId: id,
        reason: reason(data),
        next: { capability, expiresAt: restriction.expiresAt },
      });
      return { ok: true, message: `${capability} restricted without full suspension.`, resourceId: restriction.id };
    }
    if (operation === "business.restriction_revoke") {
      const restrictionId = text(data, "restrictionId");
      const updated = await prisma.accountRestriction.update({
        where: { id: restrictionId },
        data: { revokedAt: new Date(), revokedById: actor.id },
      });
      const remaining = await prisma.accountRestriction.count({
        where: { businessId: id, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      });
      if (remaining === 0 && business.lifecycleState === "RESTRICTED") {
        await prisma.business.update({ where: { id }, data: { lifecycleState: "ACTIVE" } });
      }
      await audit({
        actor,
        operation,
        permission,
        resourceType: "AccountRestriction",
        resourceId: restrictionId,
        businessId: id,
        reason: reason(data),
        next: { revokedAt: updated.revokedAt },
      });
      return { ok: true, message: "Restriction revoked.", resourceId: restrictionId };
    }
    if (operation === "business.legal_hold_place") {
      const hold = await prisma.legalHold.create({
        data: {
          businessId: id,
          reason: reason(data),
          authority: text(data, "authority"),
          placedById: actor.id,
        },
      });
      await prisma.business.update({ where: { id }, data: { lifecycleState: "LEGAL_HOLD" } });
      await audit({
        actor,
        operation,
        permission,
        resourceType: "LegalHold",
        resourceId: hold.id,
        businessId: id,
        reason: reason(data),
        next: { authority: hold.authority },
      });
      return { ok: true, message: "Legal hold placed; deletion is blocked.", resourceId: hold.id };
    }
    if (operation === "business.legal_hold_remove_request") {
      const hold = business.legalHolds[0];
      if (!hold) throw new Error("No active legal hold.");
      const approval = await prisma.approvalRequest.create({
        data: {
          actionKey: "legal_hold.remove",
          targetType: "LegalHold",
          targetId: hold.id,
          requesterId: actor.id,
          reason: reason(data),
          consequence: "Removal permits governed deletion workflows to continue.",
          requiredApproverRole: APPROVAL_REQUIRED_ACTIONS["legal_hold.remove"],
          expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
        },
      });
      await audit({
        actor,
        operation,
        permission,
        resourceType: "ApprovalRequest",
        resourceId: approval.id,
        businessId: id,
        reason: reason(data),
        approvalId: approval.id,
      });
      return { ok: true, message: "Legal-hold removal approval requested.", resourceId: approval.id };
    }
    if (operation === "business.schedule_deletion") {
      if (business.legalHolds.length > 0) throw new Error("Legal hold blocks deletion.");
      const graceDays = integer(data, "graceDays", 30);
      const request = await prisma.deletionRequest.create({
        data: {
          targetType: "Business",
          targetId: id,
          businessId: id,
          requestedById: actor.id,
          reason: reason(data),
          consequence: "New workspace activity is blocked while retained records enter a grace period.",
          retentionExceptions: "Audit and required financial records remain retained.",
          graceEndsAt: new Date(Date.now() + graceDays * 86_400_000),
          status: "GRACE_PERIOD",
        },
      });
      await prisma.business.update({
        where: { id },
        data: { lifecycleState: "DELETION_SCHEDULED", deletionScheduledAt: new Date() },
      });
      await audit({
        actor,
        operation,
        permission,
        resourceType: "DeletionRequest",
        resourceId: request.id,
        businessId: id,
        reason: reason(data),
        next: request,
      });
      return { ok: true, message: "Business deletion scheduled with a grace period.", resourceId: request.id };
    }
    if (operation === "business.cancel_deletion") {
      await prisma.deletionRequest.updateMany({
        where: { businessId: id, status: { notIn: ["APPLIED", "CANCELLED"] } },
        data: { status: "CANCELLED", cancelledAt: new Date(), cancelledById: actor.id },
      });
      await prisma.business.update({
        where: { id },
        data: { lifecycleState: "ACTIVE", deletionScheduledAt: null },
      });
      await audit({
        actor,
        operation,
        permission,
        resourceType: "Business",
        resourceId: id,
        businessId: id,
        reason: reason(data),
        prior: { lifecycleState: business.lifecycleState },
        next: { lifecycleState: "ACTIVE" },
      });
      return { ok: true, message: "Business deletion cancelled.", resourceId: id };
    }
    const stateMap: Record<string, BusinessLifecycleState> = {
      "business.suspend": "SUSPENDED",
      "business.restore": "ACTIVE",
      "business.archive": "ARCHIVED",
      "business.restore_archive": "ACTIVE",
    };
    const state = stateMap[operation];
    if (!state || !BUSINESS_STATES.has(state)) throw new Error("Unknown business action.");
    const updated = await prisma.business.update({
      where: { id },
      data: {
        lifecycleState: state,
        archivedAt: state === "ARCHIVED" ? new Date() : state === "ACTIVE" ? null : undefined,
      },
    });
    await audit({
      actor,
      operation,
      permission,
      resourceType: "Business",
      resourceId: id,
      businessId: id,
      reason: reason(data),
      prior: { lifecycleState: business.lifecycleState },
      next: { lifecycleState: updated.lifecycleState },
    });
    return { ok: true, message: `Business is now ${state.toLowerCase().replaceAll("_", " ")}.`, resourceId: id };
  }

  if (operation === "service.create") {
    const key = slugify(text(data, "key")).replaceAll("-", "_");
    const service = await prisma.serviceDefinition.create({
      data: {
        key,
        ownerFacingName: text(data, "name"),
        description: text(data, "description"),
        category: text(data, "category"),
        customerVisible: bool(data, "customerVisible", false),
        defaultEnabled: bool(data, "defaultEnabled", false),
      },
    });
    await audit({
      actor,
      operation,
      permission,
      resourceType: "ServiceDefinition",
      resourceId: service.id,
      reason: reason(data),
      next: service,
    });
    return { ok: true, message: "Service created.", resourceId: service.id };
  }

  if (operation === "service.retire") {
    const id = text(data, "id");
    const service = await prisma.serviceDefinition.update({
      where: { id },
      data: { status: "RETIRED" },
    });
    await audit({
      actor,
      operation,
      permission,
      resourceType: "ServiceDefinition",
      resourceId: id,
      reason: reason(data),
      next: { status: service.status },
    });
    return { ok: true, message: "Service retired.", resourceId: id };
  }

  if (operation === "plan.create" || operation === "plan.clone") {
    const source =
      operation === "plan.clone"
        ? await prisma.planDefinition.findUniqueOrThrow({
            where: { id: text(data, "sourcePlanId") },
            include: { entitlements: true },
          })
        : null;
    const name = text(data, "name");
    const plan = await prisma.planDefinition.create({
      data: {
        key: `${slugify(name)}-${randomUUID().slice(0, 6)}`,
        name,
        description: optionalText(data, "description") ?? source?.description ?? "Custom service plan",
        tapPointAllowance: integer(data, "tapPointAllowance", source?.tapPointAllowance ?? 0),
        locationAllowance: integer(data, "locationAllowance", source?.locationAllowance ?? 1),
          storageAllowanceBytes: BigInt(integer(data, "storageAllowanceBytes", Number(source?.storageAllowanceBytes ?? BigInt(0)))),
        campaignAllowance: integer(data, "campaignAllowance", source?.campaignAllowance ?? 0),
        emailAllowance: integer(data, "emailAllowance", source?.emailAllowance ?? 0),
        aiAllowance: integer(data, "aiAllowance", source?.aiAllowance ?? 0),
        entitlements: source
          ? {
              create: source.entitlements.map((entitlement) => ({
                serviceId: entitlement.serviceId,
                enabled: entitlement.enabled,
                allowance: entitlement.allowance,
              })),
            }
          : undefined,
      },
    });
    await audit({
      actor,
      operation,
      permission,
      resourceType: "PlanDefinition",
      resourceId: plan.id,
      reason: reason(data),
      next: { name: plan.name, clonedFrom: source?.id },
    });
    return { ok: true, message: source ? "Plan cloned." : "Plan created.", resourceId: plan.id };
  }

  if (operation === "plan.retire") {
    const id = text(data, "id");
    const plan = await prisma.planDefinition.update({ where: { id }, data: { status: "RETIRED" } });
    await audit({
      actor,
      operation,
      permission,
      resourceType: "PlanDefinition",
      resourceId: id,
      reason: reason(data),
      next: { status: plan.status },
    });
    return { ok: true, message: "Plan retired; assigned businesses retain the reference.", resourceId: id };
  }

  if (operation === "entitlement.override") {
    const allowance =
      data.allowance === undefined || data.allowance === null || data.allowance === ""
        ? null
        : integer(data, "allowance");
    if (allowance !== null && allowance >= 999_999) {
      assertControlPermission(actor, "entitlements.unlimited_grant", businessId);
      throw new Error("Unlimited grants require an approval request before application.");
    }
    const override = await prisma.businessEntitlementOverride.create({
      data: {
        businessId: text(data, "businessId"),
        serviceId: text(data, "serviceId"),
        enabled: data.enabled === null ? null : bool(data, "enabled", true),
        allowance,
        grantKind: optionalText(data, "grantKind") ?? "manual",
        startsAt: optionalDate(data, "startsAt") ?? new Date(),
        expiresAt: optionalDate(data, "expiresAt"),
        reason: reason(data),
        billingImpact: optionalText(data, "billingImpact"),
        customerVisibleNote: optionalText(data, "customerVisibleNote"),
        internalNote: optionalText(data, "internalNote"),
        grantedById: actor.id,
      },
    });
    await audit({
      actor,
      operation,
      permission,
      resourceType: "BusinessEntitlementOverride",
      resourceId: override.id,
      businessId: override.businessId,
      reason: override.reason,
      next: override,
    });
    return { ok: true, message: "Entitlement override granted with visible source and expiration.", resourceId: override.id };
  }

  if (operation === "entitlement.revoke") {
    const id = text(data, "id");
    const existing = await prisma.businessEntitlementOverride.findUniqueOrThrow({ where: { id } });
    const updated = await prisma.businessEntitlementOverride.update({
      where: { id },
      data: { status: "REVOKED", revokedAt: new Date(), revokedById: actor.id },
    });
    await audit({
      actor,
      operation,
      permission,
      resourceType: "BusinessEntitlementOverride",
      resourceId: id,
      businessId: existing.businessId,
      reason: reason(data),
      prior: existing,
      next: updated,
    });
    return { ok: true, message: "Entitlement override revoked.", resourceId: id };
  }

  if (operation === "view_as.start") {
    const userId = text(data, "userId");
    await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await audit({
      actor,
      operation,
      permission,
      resourceType: "User",
      resourceId: userId,
      targetUserId: userId,
      reason: reason(data),
      next: { readOnly: true },
    });
    return {
      ok: true,
      message: "Read-only View as User started.",
      cookie: { name: "tapconnect_view_as", value: userId, maxAge: 30 * 60 },
    };
  }

  if (operation === "view_as.exit") {
    return {
      ok: true,
      message: "View as User ended.",
      cookie: { name: "tapconnect_view_as", value: "", maxAge: 0 },
    };
  }

  if (operation === "support.start") {
    const subjectUserId = text(data, "subjectUserId");
    if (subjectUserId === actor.id) throw new Error("A support session must target another user.");
    const durationMinutes = integer(data, "durationMinutes", 30);
    if (durationMinutes < 1 || durationMinutes > 60) {
      throw new Error("Support Session duration must be between 1 and 60 minutes.");
    }
    const session = await prisma.supportSession.create({
      data: {
        actorUserId: actor.id,
        subjectUserId,
        businessId,
        reason: reason(data),
        expiresAt: new Date(Date.now() + durationMinutes * 60_000),
        localFixture: isLocalDevAuthEnabled(),
      },
    });
    await audit({
      actor,
      operation,
      permission,
      resourceType: "SupportSession",
      resourceId: session.id,
      targetUserId: subjectUserId,
      businessId,
      reason: session.reason,
      supportSessionId: session.id,
      next: { expiresAt: session.expiresAt, localFixture: session.localFixture },
    });
    return {
      ok: true,
      message: "Governed Support Session started.",
      resourceId: session.id,
      cookie: { name: "tapconnect_support_session", value: session.id, maxAge: durationMinutes * 60 },
    };
  }

  if (operation === "support.exit") {
    const id = text(data, "id");
    const session = await prisma.supportSession.findUniqueOrThrow({ where: { id } });
    if (session.actorUserId !== actor.id && !actor.roleNames.includes("Platform Owner")) {
      throw new Error("Only the acting administrator or Platform Owner can exit this session.");
    }
    await prisma.supportSession.update({
      where: { id },
      data: { status: "EXITED", endedAt: new Date(), endedById: actor.id },
    });
    await audit({
      actor,
      operation,
      permission,
      resourceType: "SupportSession",
      resourceId: id,
      targetUserId: session.subjectUserId,
      businessId: session.businessId,
      reason: reason(data),
    });
    return {
      ok: true,
      message: "Support Session exited.",
      resourceId: id,
      cookie: { name: "tapconnect_support_session", value: "", maxAge: 0 },
    };
  }

  if (operation === "demo.create" || operation === "demo.clone") {
    const source =
      operation === "demo.clone"
        ? await prisma.demoWorkspaceMetadata.findUniqueOrThrow({
            where: { id: text(data, "sourceDemoId") },
            include: { business: { include: { brandKit: true } } },
          })
        : null;
    const name = text(data, "name");
    const managerUserId = optionalText(data, "managerUserId");
    if (managerUserId === actor.id) {
      throw new Error("The owner is already a Demo manager.");
    }
    const manager = managerUserId
      ? await prisma.user.findFirst({
          where: { id: managerUserId, platformStatus: "ACTIVE" },
          select: { id: true },
        })
      : null;
    if (managerUserId && !manager) throw new Error("Choose an active Demo manager.");
    const plan = await prisma.planDefinition.findUnique({ where: { key: "demo-safe" } });
    const sourceCard = source?.business.brandKit?.tapCardDraft ??
      source?.business.brandKit?.tapCard;
    const initialCard = sourceCard && typeof sourceCard === "object"
      ? sourceCard
      : {
          version: 1,
          identity: { name, tagline: "Safe TapConnect demo" },
          sections: [],
        };
    const { business, demo } = await prisma.$transaction(async (tx) => {
      const createdBusiness = await tx.business.create({
        data: {
          name,
          slug: `${slugify(name)}-${randomUUID().slice(0, 6)}`,
          workspaceKind: "DEMO",
          lifecycleState: "ACTIVE",
          planDefinitionId: plan?.id,
          brandKit: {
            create: {
              primaryColor: source?.business.brandKit?.primaryColor,
              secondaryColor: source?.business.brandKit?.secondaryColor,
              accentColor: source?.business.brandKit?.accentColor,
              backgroundColor: source?.business.brandKit?.backgroundColor,
              textColor: source?.business.brandKit?.textColor,
              tapCard: initialCard as Prisma.InputJsonValue,
              tapCardDraft: initialCard as Prisma.InputJsonValue,
              tapCardDraftRevision: 1,
              tapCardDraftUpdatedAt: new Date(),
            },
          },
        },
      });
      await tx.mediaCollection.createMany({
        data: [
          {
            businessId: createdBusiness.id,
            name: "Brand assets",
            description: "Logos, colors, and approved brand media for this Demo.",
            pinned: true,
            sortOrder: 0,
          },
          {
            businessId: createdBusiness.id,
            name: "Demo content",
            description: "Safe fixture media used by the Demo Card and campaigns.",
            pinned: true,
            sortOrder: 1,
          },
        ],
      });
      await tx.businessUser.create({
        data: { businessId: createdBusiness.id, userId: actor.id, role: "OWNER" },
      });
      if (manager) {
        await tx.businessUser.create({
          data: { businessId: createdBusiness.id, userId: manager.id, role: "MANAGER" },
        });
      }
      const createdDemo = await tx.demoWorkspaceMetadata.create({
        data: {
          businessId: createdBusiness.id,
          description: optionalText(data, "description") ?? source?.description ?? "Safe TapConnect demo workspace",
          industryUseCase: optionalText(data, "industryUseCase") ?? source?.industryUseCase ?? "General",
          ownerUserId: actor.id,
          visibility: bool(data, "shared", false) ? "SHARED" : "PRIVATE",
          promotionStatus: bool(data, "shared", false) ? "APPROVED" : "DRAFT",
          allowedPublicActions: source?.allowedPublicActions ?? ["card.view", "card.keep"],
          blockedActions: [...DEMO_BLOCKED_ACTIONS],
          standaloneSlug: `${slugify(name)}-${randomUUID().slice(0, 6)}`,
          fixtureProvenance: optionalText(data, "fixtureProvenance") ?? "Administrator-authored demo fixture data",
          managers: {
            create: [
              { userId: actor.id },
              ...(manager ? [{ userId: manager.id }] : []),
            ],
          },
        },
      });
      return { business: createdBusiness, demo: createdDemo };
    });
    await audit({
      actor,
      operation,
      permission,
      resourceType: "DemoWorkspaceMetadata",
      resourceId: demo.id,
      businessId: business.id,
      reason: reason(data),
      next: {
        name,
        clonedFrom: source?.id,
        managerUserId: manager?.id,
        cardDraftRevision: 1,
        collections: ["Brand assets", "Demo content"],
        safetyBlocks: [...DEMO_BLOCKED_ACTIONS],
      },
    });
    return {
      ok: true,
      message: source
        ? "Demo cloned with a Studio-ready Card draft."
        : "Demo workspace is ready to operate in Studio.",
      resourceId: demo.id,
      workspaceId: business.id,
    };
  }

  if (operation === "demo.submit" || operation === "demo.review") {
    const id = text(data, "id");
    const demo = await prisma.demoWorkspaceMetadata.findUniqueOrThrow({ where: { id } });
    const next =
      operation === "demo.submit"
        ? { promotionStatus: "SUBMITTED" as const, submittedAt: new Date() }
        : {
            promotionStatus: bool(data, "approved") ? ("APPROVED" as const) : ("REJECTED" as const),
            visibility: bool(data, "approved") ? ("SHARED" as const) : demo.visibility,
            reviewedAt: new Date(),
            reviewedById: actor.id,
            reviewNote: reason(data),
          };
    const updated = await prisma.demoWorkspaceMetadata.update({ where: { id }, data: next });
    await audit({
      actor,
      operation,
      permission,
      resourceType: "DemoWorkspaceMetadata",
      resourceId: id,
      businessId: demo.businessId,
      reason: reason(data),
      prior: { status: demo.promotionStatus, visibility: demo.visibility },
      next: { status: updated.promotionStatus, visibility: updated.visibility },
    });
    return { ok: true, message: operation === "demo.submit" ? "Demo submitted for review." : "Demo review recorded.", resourceId: id };
  }

  if (operation === "demo.reset") {
    const id = text(data, "id");
    const demo = await prisma.demoWorkspaceMetadata.findUniqueOrThrow({ where: { id } });
    const updated = await prisma.demoWorkspaceMetadata.update({
      where: { id },
      data: { lastResetAt: new Date(), lastResetById: actor.id },
    });
    await audit({
      actor,
      operation,
      permission,
      resourceType: "DemoWorkspaceMetadata",
      resourceId: id,
      businessId: demo.businessId,
      reason: reason(data),
      next: { lastResetAt: updated.lastResetAt, fixtureProvenance: demo.fixtureProvenance },
    });
    return { ok: true, message: "Demo reset to its governed fixture baseline.", resourceId: id };
  }

  if (operation === "demo.publish") {
    const id = text(data, "id");
    const demo = await prisma.demoWorkspaceMetadata.findUniqueOrThrow({
      where: { id },
      include: { business: { include: { brandKit: true } }, publications: true },
    });
    const brandKit = demo.business.brandKit;
    const tapCard = brandKit?.tapCardDraft;
    const readiness = demoReadiness({
      workspaceKind: demo.business.workspaceKind,
      fixtureProvenance: demo.fixtureProvenance,
      blockedActions: demo.blockedActions,
      hasCardSnapshot: isTapConnectCardDraft(tapCard),
    });
    if (!readiness.passed) throw new Error(`Demo readiness failed: ${readiness.issues.join(" ")}`);
    const manifest = {
      kind: "card" as const,
      tapCard,
      label: `Demo publication ${demo.publications.length + 1}`,
    };
    const { snapshot } = await recordPublicationSnapshot({
      businessId: demo.businessId,
      subjectType: "card",
      subjectId: `demo:${demo.id}`,
      manifest,
      publishedById: actor.id,
    });
    const version = Math.max(0, ...demo.publications.map((publication) => publication.version)) + 1;
    const publication = await prisma.demoPublication.upsert({
      where: { publicationSnapshotId: snapshot.id },
      create: {
        demoMetadataId: demo.id,
        publicationSnapshotId: snapshot.id,
        version,
        status: "PUBLISHED",
        readinessPassed: true,
        readinessSummary: "Demo safety and immutable Card snapshot passed.",
        contentHash: hashPublishManifest(manifest),
        publishedById: actor.id,
        publishedAt: new Date(),
      },
      update: {
        status: "PUBLISHED",
        readinessPassed: true,
        readinessSummary: "Demo safety and immutable Card snapshot passed.",
        publishedById: actor.id,
        publishedAt: new Date(),
        unpublishedAt: null,
      },
    });
    await prisma.$transaction([
      prisma.demoWorkspaceMetadata.update({
        where: { id: demo.id },
        data: { currentPublicationId: publication.id },
      }),
      prisma.brandKit.update({
        where: { businessId: demo.businessId },
        data: {
          tapCard: tapCard as Prisma.InputJsonValue,
          tapCardPublishedAt: new Date(),
        },
      }),
    ]);
    await audit({
      actor,
      operation,
      permission,
      resourceType: "DemoPublication",
      resourceId: publication.id,
      businessId: demo.businessId,
      reason: reason(data),
      next: {
        version,
        snapshotId: snapshot.id,
        cardDraftRevision: brandKit?.tapCardDraftRevision ?? 0,
        cardDraftUpdatedAt: brandKit?.tapCardDraftUpdatedAt,
      },
    });
    return { ok: true, message: "Current saved Demo Card draft published safely.", resourceId: publication.id };
  }

  if (operation === "demo.rollback") {
    const id = text(data, "id");
    const publicationId = text(data, "publicationId");
    const demo = await prisma.demoWorkspaceMetadata.findUniqueOrThrow({
      where: { id },
      include: { publications: true },
    });
    const target = demo.publications.find((publication) => publication.id === publicationId);
    if (!target) throw new Error("Publication does not belong to this demo.");
    const prior = demo.currentPublicationId;
    await prisma.$transaction([
      prisma.demoWorkspaceMetadata.update({
        where: { id },
        data: { currentPublicationId: target.id },
      }),
      prisma.demoPublication.update({
        where: { id: target.id },
        data: { status: "PUBLISHED", rolledBackFromId: prior },
      }),
    ]);
    await audit({
      actor,
      operation,
      permission,
      resourceType: "DemoPublication",
      resourceId: target.id,
      businessId: demo.businessId,
      reason: reason(data),
      prior: { currentPublicationId: prior },
      next: { currentPublicationId: target.id },
    });
    return { ok: true, message: `Demo rolled back to revision ${target.version}.`, resourceId: target.id };
  }

  if (operation === "demo.binding.activate") {
    const demoMetadataId = text(data, "demoMetadataId");
    const demoPublicationId = text(data, "demoPublicationId");
    const slotKey = text(data, "slotKey");
    const demo = await prisma.demoWorkspaceMetadata.findUniqueOrThrow({
      where: { id: demoMetadataId },
      include: { publications: true },
    });
    const publication = demo.publications.find(
      (candidate) => candidate.id === demoPublicationId && candidate.status === "PUBLISHED",
    );
    if (!publication) throw new Error("Only a published revision can be bound.");
    const active = await prisma.landingDemoBinding.findFirst({
      where: { slotKey, active: true },
    });
    if (bool(data, "requireApproval", false)) {
      const approval = await prisma.approvalRequest.create({
        data: {
          actionKey: "demo.bind_landing",
          targetType: "DemoPublication",
          targetId: publication.id,
          requesterId: actor.id,
          reason: reason(data),
          consequence: "Changes the public landing-page Demo Card payload.",
          requiredApproverRole: APPROVAL_REQUIRED_ACTIONS["demo.bind_landing"],
          expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
        },
      });
      return { ok: true, message: "Landing binding approval requested.", resourceId: approval.id };
    }
    const binding = await prisma.$transaction(async (tx) => {
      await tx.landingDemoBinding.updateMany({
        where: { slotKey, active: true },
        data: { active: false, deactivatedAt: new Date() },
      });
      return tx.landingDemoBinding.create({
        data: {
          slotKey,
          businessId: demo.businessId,
          demoMetadataId,
          demoPublicationId,
          active: true,
          activatedById: actor.id,
          activatedAt: new Date(),
          priorBindingId: active?.id,
        },
      });
    });
    await audit({
      actor,
      operation,
      permission,
      resourceType: "LandingDemoBinding",
      resourceId: binding.id,
      businessId: demo.businessId,
      reason: reason(data),
      prior: active,
      next: binding,
    });
    return { ok: true, message: "Published Demo Card bound to the landing slot.", resourceId: binding.id };
  }

  if (operation === "demo.binding.unbind") {
    const id = text(data, "id");
    const binding = await prisma.landingDemoBinding.findUniqueOrThrow({
      where: { id },
    });
    await prisma.landingDemoBinding.updateMany({
      where: { slotKey: binding.slotKey, active: true },
      data: { active: false, deactivatedAt: new Date() },
    });
    await audit({
      actor,
      operation,
      permission,
      resourceType: "LandingDemoBinding",
      resourceId: id,
      businessId: binding.businessId,
      reason: reason(data),
      prior: { active: true },
      next: { active: false },
    });
    return { ok: true, message: "Landing Demo Card unbound; public fallback is active.", resourceId: id };
  }

  if (operation === "demo.binding.rollback") {
    const id = text(data, "id");
    const binding = await prisma.landingDemoBinding.findUniqueOrThrow({ where: { id } });
    if (!binding.priorBindingId) throw new Error("No prior binding exists.");
    const prior = await prisma.landingDemoBinding.findUniqueOrThrow({
      where: { id: binding.priorBindingId },
    });
    await prisma.$transaction([
      prisma.landingDemoBinding.updateMany({
        where: { slotKey: binding.slotKey, active: true },
        data: { active: false, deactivatedAt: new Date() },
      }),
      prisma.landingDemoBinding.update({
        where: { id: prior.id },
        data: {
          active: true,
          activatedAt: new Date(),
          activatedById: actor.id,
          rollbackOfBindingId: id,
        },
      }),
    ]);
    await audit({
      actor,
      operation,
      permission,
      resourceType: "LandingDemoBinding",
      resourceId: prior.id,
      businessId: prior.businessId,
      reason: reason(data),
      prior: binding,
      next: prior,
    });
    return { ok: true, message: "Landing Demo binding rolled back.", resourceId: prior.id };
  }

  if (operation === "approval.create") {
    const actionKey = text(data, "actionKey");
    const requiredApproverRole =
      APPROVAL_REQUIRED_ACTIONS[actionKey as keyof typeof APPROVAL_REQUIRED_ACTIONS] ??
      text(data, "requiredApproverRole");
    const approval = await prisma.approvalRequest.create({
      data: {
        actionKey,
        targetType: text(data, "targetType"),
        targetId: text(data, "targetId"),
        requesterId: actor.id,
        reason: reason(data),
        consequence: text(data, "consequence"),
        requiredApproverRole,
        separationRequired: bool(data, "separationRequired", true),
        expiresAt: optionalDate(data, "expiresAt") ?? new Date(Date.now() + 24 * 60 * 60_000),
      },
    });
    await audit({
      actor,
      operation,
      permission,
      resourceType: "ApprovalRequest",
      resourceId: approval.id,
      reason: approval.reason,
      approvalId: approval.id,
      next: approval,
    });
    return { ok: true, message: "Approval requested.", resourceId: approval.id };
  }

  if (operation === "approval.decide") {
    const id = text(data, "id");
    const approval = await prisma.approvalRequest.findUniqueOrThrow({ where: { id } });
    const decision = approvalDecisionAllowed({
      requesterId: approval.requesterId,
      approverId: actor.id,
      separationRequired: approval.separationRequired,
      status: approval.status,
      expiresAt: approval.expiresAt,
    });
    if (!decision.allowed) throw new Error(decision.reason);
    if (!actor.roleNames.includes(approval.requiredApproverRole) && !actor.roleNames.includes("Platform Owner")) {
      throw new Error(`Approval requires ${approval.requiredApproverRole}.`);
    }
    const approved = bool(data, "approved");
    const updated = await prisma.approvalRequest.update({
      where: { id },
      data: {
        status: approved ? "APPROVED" : "REJECTED",
        decidedById: actor.id,
        decidedAt: new Date(),
        decisionNote: reason(data),
      },
    });
    await audit({
      actor,
      operation,
      permission,
      resourceType: "ApprovalRequest",
      resourceId: id,
      reason: reason(data),
      approvalId: id,
      prior: { status: approval.status },
      next: { status: updated.status, decidedById: actor.id },
    });
    return { ok: true, message: `Approval ${updated.status.toLowerCase()}.`, resourceId: id };
  }

  if (operation === "configuration.update") {
    const key = text(data, "key");
    if (/secret|token|password|credential/i.test(key)) {
      throw new Error("Secrets cannot be stored in platform settings.");
    }
    const existing = await prisma.platformConfiguration.findUnique({ where: { key } });
    const setting = await prisma.platformConfiguration.upsert({
      where: { key },
      create: {
        key,
        value: text(data, "value"),
        description: text(data, "description"),
        updatedById: actor.id,
        reason: reason(data),
      },
      update: {
        value: text(data, "value"),
        description: text(data, "description"),
        updatedById: actor.id,
        reason: reason(data),
      },
    });
    await audit({
      actor,
      operation,
      permission,
      resourceType: "PlatformConfiguration",
      resourceId: setting.id,
      reason: reason(data),
      prior: existing,
      next: setting,
    });
    return { ok: true, message: "Platform configuration updated.", resourceId: setting.id };
  }

  const supportDecision = supportSessionAllows(operation);
  if (!supportDecision.allowed) throw new Error(supportDecision.reason);
  throw new Error(`Unsupported Control Room operation: ${operation}`);
}
