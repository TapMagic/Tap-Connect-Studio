import { prisma } from "@/lib/db";
import type { ControlActor } from "@/lib/control/identity";
import {
  PLATFORM_PERMISSIONS,
  resolveEffectivePermission,
  type PlatformPermission,
} from "@/lib/control/permissions";
import { resolvePresenceState } from "@/lib/control/presence";
import { calculateEffectiveEntitlement } from "@/lib/control/entitlements";

function iso(value: Date | null | undefined): string | null {
  return value?.toISOString() ?? null;
}

function allowed(actor: ControlActor, permission: PlatformPermission): boolean {
  return resolveEffectivePermission({
    permission,
    assignments: actor.permissions,
    environment: actor.environment,
  }).allowed;
}

export async function getControlSnapshot(actor: ControlActor) {
  const now = new Date();
  const can = (permission: PlatformPermission) => allowed(actor, permission);
  const [
    users,
    invitations,
    businesses,
    roles,
    services,
    plans,
    overrides,
    supportSessions,
    demos,
    landingBindings,
    approvals,
    audit,
    configuration,
    deletionRequests,
  ] = await Promise.all([
    can("users.view")
      ? prisma.user.findMany({
          include: {
            memberships: {
              include: { business: { select: { id: true, name: true, workspaceKind: true } } },
            },
            platformRoleBindings: { include: { role: true } },
            platformDirectPermissions: true,
            platformSessions: { orderBy: { lastSeenAt: "desc" }, take: 8 },
            presenceHeartbeats: { orderBy: { occurredAt: "desc" }, take: 1 },
            _count: { select: { platformSessions: true } },
          },
          orderBy: [{ platformStatus: "asc" }, { displayName: "asc" }, { email: "asc" }],
          take: 500,
        })
      : [],
    can("users.view")
      ? prisma.platformInvitation.findMany({
          include: { role: true, permissions: true, businessMemberships: true },
          orderBy: { createdAt: "desc" },
          take: 200,
        })
      : [],
    can("businesses.view")
      ? prisma.business.findMany({
          include: {
            users: { include: { user: true } },
            planDefinition: true,
            accountRestrictions: { where: { revokedAt: null } },
            entitlementOverrides: {
              include: { service: true },
              orderBy: { createdAt: "desc" },
            },
            legalHolds: { where: { releasedAt: null } },
            demoMetadata: true,
            _count: {
              select: {
                users: true,
                devices: true,
                campaigns: true,
                mediaAssets: true,
              },
            },
          },
          orderBy: [{ lifecycleState: "asc" }, { name: "asc" }],
          take: 500,
        })
      : [],
    can("roles.view")
      ? prisma.platformRole.findMany({
          include: {
            permissions: true,
            bindings: { include: { user: true } },
          },
          orderBy: [{ status: "asc" }, { name: "asc" }],
        })
      : [],
    can("entitlements.view")
      ? prisma.serviceDefinition.findMany({
          include: {
            dependencies: { include: { requiredService: true } },
            _count: { select: { planEntitlements: true, overrides: true, restrictions: true } },
          },
          orderBy: [{ status: "asc" }, { category: "asc" }, { ownerFacingName: "asc" }],
        })
      : [],
    can("entitlements.view")
      ? prisma.planDefinition.findMany({
          include: {
            entitlements: { include: { service: true } },
            _count: { select: { businesses: true } },
          },
          orderBy: [{ status: "asc" }, { name: "asc" }],
        })
      : [],
    can("entitlements.view")
      ? prisma.businessEntitlementOverride.findMany({
          include: { service: true, business: true },
          orderBy: { createdAt: "desc" },
          take: 500,
        })
      : [],
    can("users.support_view")
      ? prisma.supportSession.findMany({
          include: { actor: true, subject: true },
          orderBy: { startedAt: "desc" },
          take: 200,
        })
      : [],
    can("demo.view")
      ? prisma.demoWorkspaceMetadata.findMany({
          include: {
            business: { include: { brandKit: true } },
            owner: true,
            managers: { include: { user: true } },
            publications: { orderBy: { version: "desc" } },
            landingBindings: { orderBy: { createdAt: "desc" } },
          },
          orderBy: [{ visibility: "desc" }, { updatedAt: "desc" }],
        })
      : [],
    can("demo.view")
      ? prisma.landingDemoBinding.findMany({
          include: { business: true, demoMetadata: true },
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      : [],
    can("approvals.view")
      ? prisma.approvalRequest.findMany({
          orderBy: { createdAt: "desc" },
          take: 300,
        })
      : [],
    can("audit.view")
      ? prisma.platformAuditEvent.findMany({
          orderBy: { occurredAt: "desc" },
          take: 500,
        })
      : [],
    can("platform.settings.view")
      ? prisma.platformConfiguration.findMany({ orderBy: { key: "asc" } })
      : [],
    can("businesses.view") || can("users.view")
      ? prisma.deletionRequest.findMany({
          orderBy: { createdAt: "desc" },
          take: 200,
        })
      : [],
  ]);

  const serializedUsers = users.map((user) => {
    const heartbeat = user.presenceHeartbeats[0];
    const activeSession = user.platformSessions.find((session) => session.status === "ACTIVE");
    return {
      id: user.id,
      clerkId: user.clerkId,
      displayName:
        user.displayName ||
        [user.firstName, user.lastName].filter(Boolean).join(" ") ||
        user.email,
      email: user.email,
      imageUrl: user.imageUrl,
      profilePhotoAlt: user.profilePhotoAlt,
      status: user.platformStatus,
      deletionState: user.deletionState,
      lastSeenAt: iso(user.lastSeenAt),
      createdAt: user.createdAt.toISOString(),
      roles: user.platformRoleBindings.map((binding) => ({
        id: binding.role.id,
        name: binding.role.name,
        status: binding.role.status,
        environmentScope: binding.environmentScope,
        businessId: binding.businessId,
      })),
      directPermissions: user.platformDirectPermissions.map((permission) => ({
        key: permission.permissionKey,
        effect: permission.effect,
        reason: permission.reason,
      })),
      memberships: user.memberships.map((membership) => ({
        businessId: membership.businessId,
        businessName: membership.business.name,
        workspaceKind: membership.business.workspaceKind,
        role: membership.role,
      })),
      sessions: user.platformSessions.map((session) => ({
        id: session.id,
        status: session.status,
        deviceSummary: session.deviceSummary,
        browserSummary: session.browserSummary,
        currentWorkspaceId: session.currentWorkspaceId,
        currentArea: session.currentArea,
        startedAt: session.startedAt.toISOString(),
        lastSeenAt: session.lastSeenAt.toISOString(),
        reauthenticationRequired: session.reauthenticationRequired,
      })),
      sessionCount: user._count.platformSessions,
      presence: resolvePresenceState({
        now,
        lastHeartbeatAt: heartbeat?.occurredAt,
        lastMeaningfulActivityAt: user.lastSeenAt,
        authenticatedSessionActive: Boolean(activeSession),
      }),
      currentWorkspaceId: heartbeat?.workspaceId ?? activeSession?.currentWorkspaceId ?? null,
      currentArea: heartbeat?.majorArea ?? activeSession?.currentArea ?? null,
    };
  });

  const serializedBusinesses = businesses.map((business) => ({
    id: business.id,
    name: business.name,
    slug: business.slug,
    workspaceKind: business.workspaceKind,
    lifecycleState: business.lifecycleState,
    subscriptionTier: business.subscriptionTier,
    plan: business.planDefinition
      ? { id: business.planDefinition.id, name: business.planDefinition.name }
      : null,
    members: business.users.map((membership) => ({
      userId: membership.userId,
      name:
        membership.user.displayName ||
        [membership.user.firstName, membership.user.lastName].filter(Boolean).join(" ") ||
        membership.user.email,
      role: membership.role,
    })),
    restrictions: business.accountRestrictions.map((restriction) => ({
      id: restriction.id,
      capability: restriction.capability,
      reason: restriction.reason,
      expiresAt: iso(restriction.expiresAt),
    })),
    overrides: business.entitlementOverrides.map((override) => ({
      id: override.id,
      service: override.service.ownerFacingName,
      serviceKey: override.service.key,
      status: override.status,
      enabled: override.enabled,
      allowance: override.allowance,
      reason: override.reason,
      expiresAt: iso(override.expiresAt),
    })),
    legalHold: business.legalHolds.length > 0,
    demoMetadataId: business.demoMetadata?.id ?? null,
    counts: business._count,
    createdAt: business.createdAt.toISOString(),
  }));

  const effectivePermissions = PLATFORM_PERMISSIONS.map((permission) =>
    resolveEffectivePermission({
      permission,
      assignments: actor.permissions,
      environment: actor.environment,
    }),
  );

  const counts = {
    usersOnline: serializedUsers.filter((user) => user.presence === "Online").length,
    usersRecentlyActive: serializedUsers.filter(
      (user) => user.presence === "Recently active",
    ).length,
    activeBusinesses: serializedBusinesses.filter(
      (business) => business.lifecycleState === "ACTIVE",
    ).length,
    internalWorkspaces: serializedBusinesses.filter(
      (business) => business.workspaceKind === "INTERNAL",
    ).length,
    demoWorkspaces: serializedBusinesses.filter(
      (business) => business.workspaceKind === "DEMO",
    ).length,
    personalSandboxes: serializedBusinesses.filter(
      (business) => business.workspaceKind === "PERSONAL_SANDBOX",
    ).length,
    suspendedBusinesses: serializedBusinesses.filter(
      (business) => business.lifecycleState === "SUSPENDED",
    ).length,
    deletionRequests: deletionRequests.filter(
      (request) => !["CANCELLED", "APPLIED", "FAILED"].includes(request.status),
    ).length,
    expiringGrants: overrides.filter(
      (override) =>
        override.status === "ACTIVE" &&
        override.expiresAt &&
        override.expiresAt <= new Date(now.getTime() + 30 * 86_400_000),
    ).length,
    activeSupportSessions: supportSessions.filter(
      (session) => session.status === "ACTIVE" && session.expiresAt > now,
    ).length,
    pendingInvitations: invitations.filter((invitation) =>
      ["DRAFT", "SENT", "VIEWED"].includes(invitation.status),
    ).length,
    pendingApprovals: approvals.filter((approval) => approval.status === "PENDING").length,
  };

  return {
    generatedAt: now.toISOString(),
    actor: {
      id: actor.id,
      clerkId: actor.clerkId,
      displayName: actor.displayName,
      email: actor.email,
      imageUrl: actor.imageUrl,
      roleNames: actor.roleNames,
      adapter: actor.adapter,
      environment: actor.environment,
    },
    effectivePermissions: effectivePermissions.map((entry) => ({
      permission: entry.permission,
      allowed: entry.allowed,
      explanation: entry.explanation,
    })),
    counts,
    users: serializedUsers,
    invitations: invitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      displayName: invitation.displayName,
      role: invitation.role.name,
      roleId: invitation.roleId,
      status: invitation.status,
      expiresAt: invitation.expiresAt.toISOString(),
      requireMfa: invitation.requireMfa,
      createSandbox: invitation.createSandbox,
      demoPortfolioAccess: invitation.demoPortfolioAccess,
      sentAt: iso(invitation.sentAt),
      acceptedAt: iso(invitation.acceptedAt),
      failedReason: invitation.failedReason,
    })),
    businesses: serializedBusinesses,
    roles: roles.map((role) => ({
      id: role.id,
      key: role.key,
      name: role.name,
      description: role.description,
      status: role.status,
      protected: role.protected,
      ownerRole: role.ownerRole,
      permissions: role.permissions.map((permission) => ({
        key: permission.permissionKey,
        effect: permission.effect,
      })),
      users: role.bindings.map((binding) => ({
        id: binding.user.id,
        name: binding.user.displayName ?? binding.user.email,
      })),
    })),
    services: services.map((service) => ({
      id: service.id,
      key: service.key,
      name: service.ownerFacingName,
      description: service.description,
      category: service.category,
      status: service.status,
      availability: service.availability,
      customerVisible: service.customerVisible,
      dependencies: service.dependencies.map(
        (dependency) => dependency.requiredService.ownerFacingName,
      ),
      counts: service._count,
    })),
    plans: plans.map((plan) => ({
      id: plan.id,
      key: plan.key,
      name: plan.name,
      description: plan.description,
      status: plan.status,
      allowances: {
        tapPoints: plan.tapPointAllowance,
        locations: plan.locationAllowance,
        storageBytes: plan.storageAllowanceBytes.toString(),
        campaigns: plan.campaignAllowance,
        email: plan.emailAllowance,
        ai: plan.aiAllowance,
      },
      assignedBusinessCount: plan._count.businesses,
      entitlements: plan.entitlements.map((entitlement) => ({
        serviceId: entitlement.serviceId,
        serviceKey: entitlement.service.key,
        serviceName: entitlement.service.ownerFacingName,
        enabled: entitlement.enabled,
        allowance: entitlement.allowance,
      })),
    })),
    overrides: overrides.map((override) => ({
      id: override.id,
      businessId: override.businessId,
      businessName: override.business.name,
      serviceId: override.serviceId,
      serviceName: override.service.ownerFacingName,
      status: override.status,
      enabled: override.enabled,
      allowance: override.allowance,
      grantKind: override.grantKind,
      reason: override.reason,
      startsAt: override.startsAt.toISOString(),
      expiresAt: iso(override.expiresAt),
      effective: calculateEffectiveEntitlement({
        overrides: [
          {
            source: `Override: ${override.reason}`,
            enabled: override.enabled,
            allowance: override.allowance,
            startsAt: override.startsAt,
            expiresAt: override.expiresAt,
          },
        ],
      }),
    })),
    supportSessions: supportSessions.map((session) => ({
      id: session.id,
      actorName: session.actor.displayName ?? session.actor.email,
      subjectName: session.subject.displayName ?? session.subject.email,
      businessId: session.businessId,
      reason: session.reason,
      status:
        session.status === "ACTIVE" && session.expiresAt <= now
          ? "EXPIRED"
          : session.status,
      startedAt: session.startedAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      localFixture: session.localFixture,
    })),
    demos: demos.map((demo) => ({
      id: demo.id,
      businessId: demo.businessId,
      name: demo.business.name,
      description: demo.description,
      industryUseCase: demo.industryUseCase,
      ownerName: demo.owner.displayName ?? demo.owner.email,
      managers: demo.managers.map(
        (manager) => manager.user.displayName ?? manager.user.email,
      ),
      visibility: demo.visibility,
      promotionStatus: demo.promotionStatus,
      allowedPublicActions: demo.allowedPublicActions,
      blockedActions: demo.blockedActions,
      standaloneSlug: demo.standaloneSlug,
      fixtureProvenance: demo.fixtureProvenance,
      currentPublicationId: demo.currentPublicationId,
      lastResetAt: iso(demo.lastResetAt),
      publications: demo.publications.map((publication) => ({
        id: publication.id,
        version: publication.version,
        status: publication.status,
        readinessPassed: publication.readinessPassed,
        readinessSummary: publication.readinessSummary,
        publishedAt: iso(publication.publishedAt),
      })),
    })),
    landingBindings: landingBindings.map((binding) => ({
      id: binding.id,
      slotKey: binding.slotKey,
      demoName: binding.business.name,
      demoPublicationId: binding.demoPublicationId,
      active: binding.active,
      activatedAt: iso(binding.activatedAt),
      priorBindingId: binding.priorBindingId,
    })),
    approvals: approvals.map((approval) => ({
      id: approval.id,
      actionKey: approval.actionKey,
      targetType: approval.targetType,
      targetId: approval.targetId,
      requesterId: approval.requesterId,
      reason: approval.reason,
      consequence: approval.consequence,
      requiredApproverRole: approval.requiredApproverRole,
      status: approval.status,
      expiresAt: approval.expiresAt.toISOString(),
      decidedById: approval.decidedById,
      decisionNote: approval.decisionNote,
      createdAt: approval.createdAt.toISOString(),
    })),
    audit: audit.map((event) => ({
      id: event.id,
      actorId: event.actorId,
      actingSubjectId: event.actingSubjectId,
      targetUserId: event.targetUserId,
      businessId: event.businessId,
      action: event.action,
      permissionUsed: event.permissionUsed,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      reason: event.reason,
      environment: event.environment,
      success: event.success,
      correlationId: event.correlationId,
      approvalId: event.approvalId,
      priorValue: event.priorValue,
      newValue: event.newValue,
      occurredAt: event.occurredAt.toISOString(),
    })),
    configuration: configuration.map((setting) => ({
      id: setting.id,
      key: setting.key,
      value: setting.value,
      description: setting.description,
      reason: setting.reason,
      updatedAt: setting.updatedAt.toISOString(),
    })),
    deletionRequests: deletionRequests.map((request) => ({
      id: request.id,
      targetType: request.targetType,
      targetId: request.targetId,
      businessId: request.businessId,
      reason: request.reason,
      consequence: request.consequence,
      graceEndsAt: request.graceEndsAt.toISOString(),
      status: request.status,
    })),
  };
}

export type ControlSnapshot = Awaited<ReturnType<typeof getControlSnapshot>>;

