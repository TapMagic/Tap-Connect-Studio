-- CreateEnum
CREATE TYPE "PlatformUserStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED', 'ARCHIVED', 'DELETION_SCHEDULED');

-- CreateEnum
CREATE TYPE "PlatformDeletionState" AS ENUM ('NONE', 'SCHEDULED', 'BLOCKED_BY_HOLD', 'RETAINED_TOMBSTONE');

-- CreateEnum
CREATE TYPE "WorkspaceKind" AS ENUM ('CUSTOMER', 'INTERNAL', 'PERSONAL_SANDBOX', 'DEMO', 'PARTNER', 'TEST_FIXTURE');

-- CreateEnum
CREATE TYPE "BusinessLifecycleState" AS ENUM ('PROVISIONING', 'TRIAL', 'ACTIVE', 'PAST_DUE', 'RESTRICTED', 'SUSPENDED', 'CANCELLED', 'ARCHIVED', 'DELETION_SCHEDULED', 'DELETED', 'LEGAL_HOLD');

-- CreateEnum
CREATE TYPE "PlatformRoleStatus" AS ENUM ('ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "PermissionEffect" AS ENUM ('ALLOW', 'DENY');

-- CreateEnum
CREATE TYPE "PlatformInvitationStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'EXPIRED', 'REVOKED', 'FAILED');

-- CreateEnum
CREATE TYPE "PlatformSessionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SupportSessionStatus" AS ENUM ('ACTIVE', 'EXITED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "CatalogStatus" AS ENUM ('ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "ServiceAvailability" AS ENUM ('INTERNAL', 'PRIVATE_BETA', 'PUBLIC');

-- CreateEnum
CREATE TYPE "EntitlementOverrideStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DeletionRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'CANCELLED', 'BLOCKED', 'GRACE_PERIOD', 'READY', 'APPLIED', 'FAILED');

-- CreateEnum
CREATE TYPE "DemoVisibility" AS ENUM ('PRIVATE', 'SHARED');

-- CreateEnum
CREATE TYPE "DemoPromotionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DemoPublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ROLLED_BACK', 'UNPUBLISHED');

-- CreateEnum
CREATE TYPE "ApprovalRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'APPLIED', 'FAILED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "deletionState" "PlatformDeletionState" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "lastActiveWorkspaceId" TEXT,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3),
ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'en-US',
ADD COLUMN     "platformStatus" "PlatformUserStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "preferredTimezone" TEXT NOT NULL DEFAULT 'America/New_York',
ADD COLUMN     "profilePhotoAlt" TEXT,
ADD COLUMN     "profilePhotoMediaAssetId" TEXT;

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "deletionScheduledAt" TIMESTAMP(3),
ADD COLUMN     "lifecycleState" "BusinessLifecycleState" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "planDefinitionId" TEXT,
ADD COLUMN     "workspaceKind" "WorkspaceKind" NOT NULL DEFAULT 'CUSTOMER';

-- AlterTable
ALTER TABLE "PlatformAuditEvent" ADD COLUMN     "actingSubjectId" TEXT,
ADD COLUMN     "approvalId" TEXT,
ADD COLUMN     "environment" TEXT NOT NULL DEFAULT 'local',
ADD COLUMN     "newValue" JSONB,
ADD COLUMN     "permissionUsed" TEXT,
ADD COLUMN     "priorValue" JSONB,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "sessionId" TEXT,
ADD COLUMN     "success" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "supportSessionId" TEXT,
ADD COLUMN     "targetUserId" TEXT;

-- CreateTable
CREATE TABLE "PlatformRole" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "PlatformRoleStatus" NOT NULL DEFAULT 'ACTIVE',
    "protected" BOOLEAN NOT NULL DEFAULT false,
    "ownerRole" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "retiredAt" TIMESTAMP(3),
    "replacementRoleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformRolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionKey" TEXT NOT NULL,
    "effect" "PermissionEffect" NOT NULL DEFAULT 'ALLOW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformRolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformRoleBinding" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "environmentScope" TEXT NOT NULL DEFAULT '*',
    "businessId" TEXT NOT NULL DEFAULT '*',
    "grantedById" TEXT,
    "reason" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformRoleBinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformDirectPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissionKey" TEXT NOT NULL,
    "effect" "PermissionEffect" NOT NULL,
    "environmentScope" TEXT NOT NULL DEFAULT '*',
    "businessId" TEXT NOT NULL DEFAULT '*',
    "reason" TEXT NOT NULL,
    "grantedById" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformDirectPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "status" "PlatformInvitationStatus" NOT NULL DEFAULT 'DRAFT',
    "tokenHash" TEXT,
    "environmentScope" TEXT NOT NULL DEFAULT '*',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "internalNote" TEXT,
    "requireMfa" BOOLEAN NOT NULL DEFAULT true,
    "createSandbox" BOOLEAN NOT NULL DEFAULT true,
    "demoPortfolioAccess" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "acceptedByClerkUserId" TEXT,
    "revokedAt" TIMESTAMP(3),
    "failedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformInvitationPermission" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "permissionKey" TEXT NOT NULL,
    "effect" "PermissionEffect" NOT NULL,

    CONSTRAINT "PlatformInvitationPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformInvitationBusinessScope" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,

    CONSTRAINT "PlatformInvitationBusinessScope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformInvitationMembership" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',

    CONSTRAINT "PlatformInvitationMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "externalSessionId" TEXT,
    "status" "PlatformSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "deviceSummary" TEXT,
    "browserSummary" TEXT,
    "ipAddressRedacted" TEXT,
    "currentWorkspaceId" TEXT,
    "currentArea" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "reauthenticationRequired" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PlatformSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresenceHeartbeat" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "majorArea" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PresenceHeartbeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportSession" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "subjectUserId" TEXT NOT NULL,
    "businessId" TEXT,
    "externalActorTokenId" TEXT,
    "reason" TEXT NOT NULL,
    "status" "SupportSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "endedById" TEXT,
    "localFixture" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "ownerFacingName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "availability" "ServiceAvailability" NOT NULL DEFAULT 'INTERNAL',
    "usageUnit" TEXT,
    "defaultEnabled" BOOLEAN NOT NULL DEFAULT false,
    "customerVisible" BOOLEAN NOT NULL DEFAULT false,
    "diagnosticsPath" TEXT,
    "status" "CatalogStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceDependency" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "requiredServiceId" TEXT NOT NULL,

    CONSTRAINT "ServiceDependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "CatalogStatus" NOT NULL DEFAULT 'ACTIVE',
    "tapPointAllowance" INTEGER NOT NULL DEFAULT 0,
    "locationAllowance" INTEGER NOT NULL DEFAULT 1,
    "storageAllowanceBytes" BIGINT NOT NULL DEFAULT 0,
    "campaignAllowance" INTEGER NOT NULL DEFAULT 0,
    "emailAllowance" INTEGER NOT NULL DEFAULT 0,
    "aiAllowance" INTEGER NOT NULL DEFAULT 0,
    "trialDays" INTEGER NOT NULL DEFAULT 0,
    "upgradePathKey" TEXT,
    "grandfatheringBehavior" TEXT NOT NULL DEFAULT 'preserve',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanEntitlement" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "allowance" INTEGER,

    CONSTRAINT "PlanEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessEntitlementOverride" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "enabled" BOOLEAN,
    "allowance" INTEGER,
    "grantKind" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "billingImpact" TEXT,
    "customerVisibleNote" TEXT,
    "internalNote" TEXT,
    "grantedById" TEXT NOT NULL,
    "approvalId" TEXT,
    "status" "EntitlementOverrideStatus" NOT NULL DEFAULT 'ACTIVE',
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessEntitlementOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountRestriction" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT,
    "serviceId" TEXT,
    "capability" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "internalNote" TEXT,
    "customerVisibleExplanation" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "approvalId" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountRestriction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeletionRequest" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "businessId" TEXT,
    "requestedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "consequence" TEXT NOT NULL,
    "retentionExceptions" TEXT,
    "graceEndsAt" TIMESTAMP(3) NOT NULL,
    "status" "DeletionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "approvalId" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" TEXT,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalHold" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "authority" TEXT NOT NULL,
    "placedById" TEXT NOT NULL,
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),
    "releasedById" TEXT,
    "approvalId" TEXT,

    CONSTRAINT "LegalHold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemoWorkspaceMetadata" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "industryUseCase" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "visibility" "DemoVisibility" NOT NULL DEFAULT 'PRIVATE',
    "promotionStatus" "DemoPromotionStatus" NOT NULL DEFAULT 'DRAFT',
    "allowedPublicActions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "blockedActions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "resetPolicy" TEXT NOT NULL DEFAULT 'manual',
    "standaloneSlug" TEXT NOT NULL,
    "fixtureProvenance" TEXT NOT NULL,
    "currentPublicationId" TEXT,
    "lastResetAt" TIMESTAMP(3),
    "lastResetById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemoWorkspaceMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemoManager" (
    "id" TEXT NOT NULL,
    "demoMetadataId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "DemoManager_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemoPublication" (
    "id" TEXT NOT NULL,
    "demoMetadataId" TEXT NOT NULL,
    "publicationSnapshotId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "DemoPublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "readinessPassed" BOOLEAN NOT NULL DEFAULT false,
    "readinessSummary" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "publishedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "rolledBackFromId" TEXT,
    "unpublishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemoPublication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingDemoBinding" (
    "id" TEXT NOT NULL,
    "slotKey" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "demoMetadataId" TEXT NOT NULL,
    "demoPublicationId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "activatedById" TEXT,
    "activatedAt" TIMESTAMP(3),
    "deactivatedAt" TIMESTAMP(3),
    "priorBindingId" TEXT,
    "rollbackOfBindingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandingDemoBinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "actionKey" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "consequence" TEXT NOT NULL,
    "requiredApproverRole" TEXT NOT NULL,
    "separationRequired" BOOLEAN NOT NULL DEFAULT true,
    "status" "ApprovalRequestStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "appliedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalNote" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "businessId" TEXT,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternalNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformConfiguration" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "updatedById" TEXT,
    "reason" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformRole_key_key" ON "PlatformRole"("key");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformRole_name_key" ON "PlatformRole"("name");

-- CreateIndex
CREATE INDEX "PlatformRole_status_name_idx" ON "PlatformRole"("status", "name");

-- CreateIndex
CREATE INDEX "PlatformRolePermission_permissionKey_effect_idx" ON "PlatformRolePermission"("permissionKey", "effect");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformRolePermission_roleId_permissionKey_key" ON "PlatformRolePermission"("roleId", "permissionKey");

-- CreateIndex
CREATE INDEX "PlatformRoleBinding_userId_expiresAt_idx" ON "PlatformRoleBinding"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "PlatformRoleBinding_businessId_idx" ON "PlatformRoleBinding"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformRoleBinding_userId_roleId_environmentScope_business_key" ON "PlatformRoleBinding"("userId", "roleId", "environmentScope", "businessId");

-- CreateIndex
CREATE INDEX "PlatformDirectPermission_userId_effect_expiresAt_idx" ON "PlatformDirectPermission"("userId", "effect", "expiresAt");

-- CreateIndex
CREATE INDEX "PlatformDirectPermission_permissionKey_idx" ON "PlatformDirectPermission"("permissionKey");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformDirectPermission_userId_permissionKey_environmentSc_key" ON "PlatformDirectPermission"("userId", "permissionKey", "environmentScope", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformInvitation_tokenHash_key" ON "PlatformInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "PlatformInvitation_status_expiresAt_idx" ON "PlatformInvitation"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "PlatformInvitation_email_status_idx" ON "PlatformInvitation"("email", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformInvitationPermission_invitationId_permissionKey_key" ON "PlatformInvitationPermission"("invitationId", "permissionKey");

-- CreateIndex
CREATE INDEX "PlatformInvitationBusinessScope_businessId_idx" ON "PlatformInvitationBusinessScope"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformInvitationBusinessScope_invitationId_businessId_key" ON "PlatformInvitationBusinessScope"("invitationId", "businessId");

-- CreateIndex
CREATE INDEX "PlatformInvitationMembership_businessId_idx" ON "PlatformInvitationMembership"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformInvitationMembership_invitationId_businessId_key" ON "PlatformInvitationMembership"("invitationId", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformSession_externalSessionId_key" ON "PlatformSession"("externalSessionId");

-- CreateIndex
CREATE INDEX "PlatformSession_userId_status_lastSeenAt_idx" ON "PlatformSession"("userId", "status", "lastSeenAt");

-- CreateIndex
CREATE INDEX "PlatformSession_status_lastSeenAt_idx" ON "PlatformSession"("status", "lastSeenAt");

-- CreateIndex
CREATE INDEX "PresenceHeartbeat_userId_expiresAt_idx" ON "PresenceHeartbeat"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "PresenceHeartbeat_sessionId_occurredAt_idx" ON "PresenceHeartbeat"("sessionId", "occurredAt");

-- CreateIndex
CREATE INDEX "SupportSession_actorUserId_status_expiresAt_idx" ON "SupportSession"("actorUserId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "SupportSession_subjectUserId_status_idx" ON "SupportSession"("subjectUserId", "status");

-- CreateIndex
CREATE INDEX "SupportSession_businessId_status_idx" ON "SupportSession"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceDefinition_key_key" ON "ServiceDefinition"("key");

-- CreateIndex
CREATE INDEX "ServiceDefinition_status_category_idx" ON "ServiceDefinition"("status", "category");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceDependency_serviceId_requiredServiceId_key" ON "ServiceDependency"("serviceId", "requiredServiceId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanDefinition_key_key" ON "PlanDefinition"("key");

-- CreateIndex
CREATE UNIQUE INDEX "PlanDefinition_name_key" ON "PlanDefinition"("name");

-- CreateIndex
CREATE INDEX "PlanDefinition_status_name_idx" ON "PlanDefinition"("status", "name");

-- CreateIndex
CREATE INDEX "PlanEntitlement_serviceId_enabled_idx" ON "PlanEntitlement"("serviceId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "PlanEntitlement_planId_serviceId_key" ON "PlanEntitlement"("planId", "serviceId");

-- CreateIndex
CREATE INDEX "BusinessEntitlementOverride_businessId_status_expiresAt_idx" ON "BusinessEntitlementOverride"("businessId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "BusinessEntitlementOverride_serviceId_status_idx" ON "BusinessEntitlementOverride"("serviceId", "status");

-- CreateIndex
CREATE INDEX "AccountRestriction_businessId_capability_expiresAt_idx" ON "AccountRestriction"("businessId", "capability", "expiresAt");

-- CreateIndex
CREATE INDEX "AccountRestriction_userId_expiresAt_idx" ON "AccountRestriction"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "DeletionRequest_targetType_targetId_status_idx" ON "DeletionRequest"("targetType", "targetId", "status");

-- CreateIndex
CREATE INDEX "DeletionRequest_businessId_status_idx" ON "DeletionRequest"("businessId", "status");

-- CreateIndex
CREATE INDEX "DeletionRequest_status_graceEndsAt_idx" ON "DeletionRequest"("status", "graceEndsAt");

-- CreateIndex
CREATE INDEX "LegalHold_businessId_releasedAt_idx" ON "LegalHold"("businessId", "releasedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DemoWorkspaceMetadata_businessId_key" ON "DemoWorkspaceMetadata"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "DemoWorkspaceMetadata_standaloneSlug_key" ON "DemoWorkspaceMetadata"("standaloneSlug");

-- CreateIndex
CREATE INDEX "DemoWorkspaceMetadata_visibility_promotionStatus_idx" ON "DemoWorkspaceMetadata"("visibility", "promotionStatus");

-- CreateIndex
CREATE INDEX "DemoWorkspaceMetadata_ownerUserId_visibility_idx" ON "DemoWorkspaceMetadata"("ownerUserId", "visibility");

-- CreateIndex
CREATE INDEX "DemoManager_userId_idx" ON "DemoManager"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DemoManager_demoMetadataId_userId_key" ON "DemoManager"("demoMetadataId", "userId");

-- CreateIndex
CREATE INDEX "DemoPublication_demoMetadataId_status_publishedAt_idx" ON "DemoPublication"("demoMetadataId", "status", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DemoPublication_demoMetadataId_version_key" ON "DemoPublication"("demoMetadataId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "DemoPublication_publicationSnapshotId_key" ON "DemoPublication"("publicationSnapshotId");

-- CreateIndex
CREATE INDEX "LandingDemoBinding_slotKey_active_activatedAt_idx" ON "LandingDemoBinding"("slotKey", "active", "activatedAt");

-- CreateIndex
CREATE INDEX "LandingDemoBinding_demoPublicationId_idx" ON "LandingDemoBinding"("demoPublicationId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_status_expiresAt_idx" ON "ApprovalRequest"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "ApprovalRequest_targetType_targetId_idx" ON "ApprovalRequest"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_requesterId_status_idx" ON "ApprovalRequest"("requesterId", "status");

-- CreateIndex
CREATE INDEX "InternalNote_targetType_targetId_createdAt_idx" ON "InternalNote"("targetType", "targetId", "createdAt");

-- CreateIndex
CREATE INDEX "InternalNote_businessId_createdAt_idx" ON "InternalNote"("businessId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformConfiguration_key_key" ON "PlatformConfiguration"("key");

-- CreateIndex
CREATE INDEX "User_platformStatus_lastSeenAt_idx" ON "User"("platformStatus", "lastSeenAt");

-- CreateIndex
CREATE INDEX "Business_workspaceKind_lifecycleState_idx" ON "Business"("workspaceKind", "lifecycleState");

-- CreateIndex
CREATE INDEX "Business_lifecycleState_deletionScheduledAt_idx" ON "Business"("lifecycleState", "deletionScheduledAt");

-- CreateIndex
CREATE INDEX "PlatformAuditEvent_actorId_occurredAt_idx" ON "PlatformAuditEvent"("actorId", "occurredAt");

-- CreateIndex
CREATE INDEX "PlatformAuditEvent_correlationId_idx" ON "PlatformAuditEvent"("correlationId");

-- CreateIndex
CREATE INDEX "PlatformAuditEvent_approvalId_idx" ON "PlatformAuditEvent"("approvalId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_profilePhotoMediaAssetId_fkey" FOREIGN KEY ("profilePhotoMediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_planDefinitionId_fkey" FOREIGN KEY ("planDefinitionId") REFERENCES "PlanDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformRole" ADD CONSTRAINT "PlatformRole_replacementRoleId_fkey" FOREIGN KEY ("replacementRoleId") REFERENCES "PlatformRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformRolePermission" ADD CONSTRAINT "PlatformRolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "PlatformRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformRoleBinding" ADD CONSTRAINT "PlatformRoleBinding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformRoleBinding" ADD CONSTRAINT "PlatformRoleBinding_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "PlatformRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformDirectPermission" ADD CONSTRAINT "PlatformDirectPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformInvitation" ADD CONSTRAINT "PlatformInvitation_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "PlatformRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformInvitationPermission" ADD CONSTRAINT "PlatformInvitationPermission_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "PlatformInvitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformInvitationBusinessScope" ADD CONSTRAINT "PlatformInvitationBusinessScope_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "PlatformInvitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformInvitationMembership" ADD CONSTRAINT "PlatformInvitationMembership_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "PlatformInvitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformSession" ADD CONSTRAINT "PlatformSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresenceHeartbeat" ADD CONSTRAINT "PresenceHeartbeat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportSession" ADD CONSTRAINT "SupportSession_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportSession" ADD CONSTRAINT "SupportSession_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceDependency" ADD CONSTRAINT "ServiceDependency_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceDependency" ADD CONSTRAINT "ServiceDependency_requiredServiceId_fkey" FOREIGN KEY ("requiredServiceId") REFERENCES "ServiceDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanEntitlement" ADD CONSTRAINT "PlanEntitlement_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PlanDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanEntitlement" ADD CONSTRAINT "PlanEntitlement_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessEntitlementOverride" ADD CONSTRAINT "BusinessEntitlementOverride_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessEntitlementOverride" ADD CONSTRAINT "BusinessEntitlementOverride_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountRestriction" ADD CONSTRAINT "AccountRestriction_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountRestriction" ADD CONSTRAINT "AccountRestriction_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeletionRequest" ADD CONSTRAINT "DeletionRequest_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalHold" ADD CONSTRAINT "LegalHold_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoWorkspaceMetadata" ADD CONSTRAINT "DemoWorkspaceMetadata_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoWorkspaceMetadata" ADD CONSTRAINT "DemoWorkspaceMetadata_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoManager" ADD CONSTRAINT "DemoManager_demoMetadataId_fkey" FOREIGN KEY ("demoMetadataId") REFERENCES "DemoWorkspaceMetadata"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoManager" ADD CONSTRAINT "DemoManager_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoPublication" ADD CONSTRAINT "DemoPublication_demoMetadataId_fkey" FOREIGN KEY ("demoMetadataId") REFERENCES "DemoWorkspaceMetadata"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingDemoBinding" ADD CONSTRAINT "LandingDemoBinding_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingDemoBinding" ADD CONSTRAINT "LandingDemoBinding_demoMetadataId_fkey" FOREIGN KEY ("demoMetadataId") REFERENCES "DemoWorkspaceMetadata"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
