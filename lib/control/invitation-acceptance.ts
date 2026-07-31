import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { appendAuditEvent } from "@/lib/control/audit";
import type { ExternalIdentity } from "@/lib/control/identity";
import { isLocalDevAuthEnabled } from "@/lib/config/local-dev";

function invitationTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function sandboxSlug(value: string): string {
  return `${value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 46)}-sandbox`;
}

export async function acceptControlInvitation(input: {
  token: string;
  identity: ExternalIdentity;
}) {
  const invitation = await prisma.platformInvitation.findUnique({
    where: { tokenHash: invitationTokenHash(input.token) },
    include: {
      role: true,
      permissions: true,
      businessMemberships: true,
    },
  });
  if (!invitation || !["SENT", "VIEWED"].includes(invitation.status)) {
    throw new Error("Invitation is not available for acceptance.");
  }
  if (invitation.expiresAt <= new Date()) {
    await prisma.platformInvitation.update({
      where: { id: invitation.id },
      data: { status: "EXPIRED", tokenHash: null },
    });
    throw new Error("Invitation has expired.");
  }

  const localFixture = isLocalDevAuthEnabled();
  if (
    !localFixture &&
    input.identity.primaryEmail.trim().toLowerCase() !== invitation.email.trim().toLowerCase()
  ) {
    throw new Error("The authenticated identity does not match the invited email address.");
  }
  const externalUserId = localFixture
    ? `local:invited:${invitation.id}`
    : input.identity.externalUserId;
  const existing = await prisma.user.findUnique({ where: { clerkId: externalUserId } });
  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: { platformStatus: "ACTIVE", displayName: invitation.displayName },
      })
    : await prisma.user.create({
        data: {
          clerkId: externalUserId,
          email: invitation.email,
          displayName: invitation.displayName,
          firstName: invitation.displayName.split(/\s+/)[0],
          platformStatus: "ACTIVE",
          imageUrl: input.identity.imageUrl,
          locale: input.identity.locale,
        },
      });

  await prisma.$transaction(async (tx) => {
    await tx.platformRoleBinding.upsert({
      where: {
        userId_roleId_environmentScope_businessId: {
          userId: user.id,
          roleId: invitation.roleId,
          environmentScope: invitation.environmentScope,
          businessId: "*",
        },
      },
      create: {
        userId: user.id,
        roleId: invitation.roleId,
        environmentScope: invitation.environmentScope,
        reason: `Accepted invitation ${invitation.id}`,
        grantedById: invitation.createdById,
      },
      update: {},
    });
    for (const direct of invitation.permissions) {
      await tx.platformDirectPermission.upsert({
        where: {
          userId_permissionKey_environmentScope_businessId: {
            userId: user.id,
            permissionKey: direct.permissionKey,
            environmentScope: invitation.environmentScope,
            businessId: "*",
          },
        },
        create: {
          userId: user.id,
          permissionKey: direct.permissionKey,
          effect: direct.effect,
          environmentScope: invitation.environmentScope,
          reason: `Accepted invitation ${invitation.id}`,
          grantedById: invitation.createdById,
        },
        update: { effect: direct.effect },
      });
    }
    for (const membership of invitation.businessMemberships) {
      await tx.businessUser.upsert({
        where: {
          businessId_userId: {
            businessId: membership.businessId,
            userId: user.id,
          },
        },
        create: {
          businessId: membership.businessId,
          userId: user.id,
          role: membership.role,
        },
        update: { role: membership.role },
      });
    }
    if (invitation.createSandbox) {
      const sandboxPlan = await tx.planDefinition.findUnique({
        where: { key: "sandbox-safe" },
      });
      const sandbox = await tx.business.upsert({
        where: { slug: sandboxSlug(invitation.displayName) },
        create: {
          slug: sandboxSlug(invitation.displayName),
          name: `${invitation.displayName}’s Sandbox`,
          workspaceKind: "PERSONAL_SANDBOX",
          lifecycleState: "ACTIVE",
          planDefinitionId: sandboxPlan?.id,
        },
        update: {},
      });
      await tx.businessUser.upsert({
        where: {
          businessId_userId: { businessId: sandbox.id, userId: user.id },
        },
        create: { businessId: sandbox.id, userId: user.id, role: "OWNER" },
        update: { role: "OWNER" },
      });
    }
    await tx.platformInvitation.update({
      where: { id: invitation.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        acceptedByClerkUserId: externalUserId,
        tokenHash: null,
      },
    });
    await appendAuditEvent({
      client: tx,
      actorId: user.id,
      targetUserId: user.id,
      action: "invitation.accept",
      permissionUsed: "authenticated invitation token",
      resourceType: "PlatformInvitation",
      resourceId: invitation.id,
      reason: "Authenticated invitation acceptance",
      newValue: {
        userId: user.id,
        externalUserId,
        role: invitation.role.name,
        sandboxCreated: invitation.createSandbox,
      },
    });
  });
  return {
    ok: true as const,
    message: "Invitation accepted and immutable identity bound.",
    resourceId: user.id,
  };
}
