-- Idempotent V1 baseline required before additive Fusion migrations.
-- Existing isolated databases already contain these objects; fresh databases do not.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('OWNER', 'MANAGER', 'MARKETING', 'STAFF_SCANNER', 'VIEWER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "PlanTier" AS ENUM ('BASIC', 'STUDIO', 'PRO', 'GROWTH', 'ENTERPRISE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'INCOMPLETE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "DeviceStatus" AS ENUM ('UNASSIGNED', 'ACTIVE', 'INACTIVE', 'ARCHIVED', 'LOST', 'REPLACED', 'SUSPENDED', 'CLOSED', 'RETIRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "DeviceType" AS ENUM ('BUSINESS_CARD', 'PRODUCT_DISC', 'SHELF_TAG', 'TABLE_TENT', 'WINDOW_SIGN', 'EVENT_SIGN', 'PACKAGE_INSERT', 'REVIEW_STAND', 'STAFF_INTERNAL', 'GENERIC_NFC');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "AuthMode" AS ENUM ('STANDARD', 'LOCKED_STANDARD', 'VERIFIED', 'MANUAL', 'INTERNAL_TEST');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'READY', 'SCHEDULED', 'LIVE', 'PAUSED', 'ARCHIVED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "CampaignType" AS ENUM ('PRODUCT_STORY', 'VIDEO_DEMO', 'COUPON_OFFER', 'REVIEW_REQUEST', 'FEEDBACK_FORM', 'CONTACT_VCARD', 'EVENT_ANNOUNCEMENT', 'STAFF_PICK', 'LINK_HUB', 'MENU_INFO', 'MULTI_LOCATION', 'LEAD_CAPTURE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "AssignmentStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'ENDED', 'REPLACED', 'CANCELED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ScanSessionStatus" AS ENUM ('WAITING', 'SCANNED', 'EXPIRED', 'CANCELED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ScanSessionType" AS ENUM ('OWNER_PHONE', 'DESKTOP_PHONE', 'REMOTE_STAFF', 'SUPPORT_ASSISTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ComplianceCategory" AS ENUM ('GENERAL', 'TOBACCO', 'VAPE', 'CANNABIS', 'ALCOHOL', 'SUPPLEMENTS', 'HEALTH_WELLNESS', 'WEAPONS', 'ADULT', 'FINANCIAL', 'MEDICAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "FontStyle" AS ENUM ('MODERN', 'CLASSIC', 'PLAYFUL', 'PREMIUM', 'MINIMAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ButtonStyle" AS ENUM ('ROUNDED', 'PILL', 'SHARP', 'SOFT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Business" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "googleReviewUrl" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "complianceCategory" "ComplianceCategory" NOT NULL DEFAULT 'GENERAL',
    "subscriptionTier" "PlanTier" NOT NULL DEFAULT 'BASIC',
    "activeDeviceLimit" INTEGER NOT NULL DEFAULT 1,
    "activeCampaignLimit" INTEGER NOT NULL DEFAULT 3,
    "billingStatus" "SubscriptionStatus" NOT NULL DEFAULT 'INCOMPLETE',
    "stripeCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BusinessUser" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Location" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "phone" TEXT,
    "mapUrl" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BrandKit" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "primaryColor" TEXT NOT NULL DEFAULT '#22c55e',
    "secondaryColor" TEXT NOT NULL DEFAULT '#0ea5e9',
    "accentColor" TEXT NOT NULL DEFAULT '#f59e0b',
    "backgroundColor" TEXT NOT NULL DEFAULT '#0b0f19',
    "textColor" TEXT NOT NULL DEFAULT '#f8fafc',
    "fontStyle" "FontStyle" NOT NULL DEFAULT 'MODERN',
    "buttonStyle" "ButtonStyle" NOT NULL DEFAULT 'ROUNDED',
    "defaultLanguage" TEXT NOT NULL DEFAULT 'en',
    "tone" TEXT NOT NULL DEFAULT 'professional',
    "defaultDisclaimer" TEXT,
    "ageGateEnabled" BOOLEAN NOT NULL DEFAULT false,
    "ageGateMinAge" INTEGER NOT NULL DEFAULT 21,
    "socialLinks" JSONB NOT NULL DEFAULT '{}',
    "defaultFooter" JSONB NOT NULL DEFAULT '[]',
    "endExperience" JSONB NOT NULL DEFAULT '{}',
    "emailPromo" JSONB NOT NULL DEFAULT '{}',
    "otherLinks" JSONB NOT NULL DEFAULT '[]',
    "tapCard" JSONB NOT NULL DEFAULT '{}',
    "iconName" TEXT,
    "iconColor" TEXT NOT NULL DEFAULT '#000000',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandKit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BrandLink" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "brandKitId" TEXT,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT,
    "href" TEXT NOT NULL DEFAULT '',
    "iconName" TEXT,
    "iconColor" TEXT NOT NULL DEFAULT '#000000',
    "logoUrl" TEXT,
    "platform" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Subscription" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "tier" "PlanTier" NOT NULL DEFAULT 'BASIC',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'INCOMPLETE',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DeviceSlot" (
    "id" TEXT NOT NULL,
    "businessId" TEXT,
    "deviceCode" TEXT NOT NULL,
    "deviceType" "DeviceType" NOT NULL DEFAULT 'GENERIC_NFC',
    "status" "DeviceStatus" NOT NULL DEFAULT 'UNASSIGNED',
    "authMode" "AuthMode" NOT NULL DEFAULT 'STANDARD',
    "nickname" TEXT,
    "locationId" TEXT,
    "locationNote" TEXT,
    "totalTapCount" INTEGER NOT NULL DEFAULT 0,
    "lastTappedAt" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),
    "batchId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "campaignGroupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Campaign" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "campaignType" "CampaignType" NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "templateId" TEXT,
    "contentBlocks" JSONB NOT NULL DEFAULT '[]',
    "primaryMedia" JSONB NOT NULL DEFAULT '{}',
    "offerSettings" JSONB NOT NULL DEFAULT '{}',
    "formSettings" JSONB NOT NULL DEFAULT '{}',
    "complianceSettings" JSONB NOT NULL DEFAULT '{}',
    "themeOverrides" JSONB NOT NULL DEFAULT '{}',
    "scheduledStart" TIMESTAMP(3),
    "scheduledEnd" TIMESTAMP(3),
    "endExperience" JSONB NOT NULL DEFAULT '{}',
    "isLandingDemo" BOOLEAN NOT NULL DEFAULT false,
    "groupId" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CampaignGroup" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'LIVE',
    "timezone" TEXT,
    "showUpcomingOnPages" BOOLEAN NOT NULL DEFAULT true,
    "industryHint" TEXT,
    "defaultCampaignId" TEXT,
    "endCampaignId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CampaignGroupSlot" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "daysOfWeek" JSONB NOT NULL DEFAULT '[]',
    "startTime" TEXT,
    "endTime" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignGroupSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DeviceAssignment" (
    "id" TEXT NOT NULL,
    "deviceSlotId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "assignedById" TEXT,
    "replacedAssignmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TapEvent" (
    "id" TEXT NOT NULL,
    "businessId" TEXT,
    "deviceSlotId" TEXT NOT NULL,
    "campaignId" TEXT,
    "visitorHash" TEXT,
    "userAgent" TEXT,
    "referrer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TapEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ClickEvent" (
    "id" TEXT NOT NULL,
    "businessId" TEXT,
    "deviceSlotId" TEXT,
    "campaignId" TEXT,
    "eventType" TEXT NOT NULL,
    "blockId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClickEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Lead" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "campaignId" TEXT,
    "deviceSlotId" TEXT,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "couponClaimed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ScanSession" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "status" "ScanSessionStatus" NOT NULL DEFAULT 'WAITING',
    "sessionType" "ScanSessionType" NOT NULL DEFAULT 'OWNER_PHONE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scannedDeviceSlotId" TEXT,
    "scannedByUserId" TEXT,
    "scannedAt" TIMESTAMP(3),
    "accessCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScanSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MediaAsset" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "campaignId" TEXT,
    "url" TEXT NOT NULL,
    "filename" TEXT,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'upload',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SavedTemplate" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "campaignType" "CampaignType" NOT NULL,
    "contentBlocks" JSONB NOT NULL DEFAULT '[]',
    "themeOverrides" JSONB NOT NULL DEFAULT '{}',
    "thumbnailUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ScheduleRule" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "deviceSlotId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "daysOfWeek" JSONB NOT NULL DEFAULT '[]',
    "startTime" TEXT,
    "endTime" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LandingUseCase" (
    "id" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imageAlt" TEXT NOT NULL DEFAULT '',
    "tap" TEXT NOT NULL DEFAULT '',
    "opens" TEXT NOT NULL DEFAULT '',
    "action" TEXT NOT NULL DEFAULT '',
    "captures" TEXT NOT NULL DEFAULT '',
    "imageFit" TEXT NOT NULL DEFAULT 'cover',
    "imagePositionX" INTEGER NOT NULL DEFAULT 50,
    "imagePositionY" INTEGER NOT NULL DEFAULT 50,
    "imageScale" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "imagePanelPercent" INTEGER NOT NULL DEFAULT 38,
    "glowColor" TEXT NOT NULL DEFAULT '#3b82f6',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingUseCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LandingDemoSlot" (
    "mode" TEXT NOT NULL,
    "campaignId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "showLogo" BOOLEAN NOT NULL DEFAULT true,
    "logoUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingDemoSlot_pkey" PRIMARY KEY ("mode")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Business_slug_key" ON "Business"("slug");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Business_stripeCustomerId_key" ON "Business"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BusinessUser_businessId_userId_key" ON "BusinessUser"("businessId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BrandKit_businessId_key" ON "BrandKit"("businessId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BrandLink_businessId_idx" ON "BrandLink"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_businessId_key" ON "Subscription"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DeviceSlot_deviceCode_key" ON "DeviceSlot"("deviceCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CampaignGroup_businessId_idx" ON "CampaignGroup"("businessId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CampaignGroupSlot_groupId_enabled_idx" ON "CampaignGroupSlot"("groupId", "enabled");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TapEvent_deviceSlotId_createdAt_idx" ON "TapEvent"("deviceSlotId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TapEvent_businessId_createdAt_idx" ON "TapEvent"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClickEvent_campaignId_eventType_idx" ON "ClickEvent"("campaignId", "eventType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lead_businessId_createdAt_idx" ON "Lead"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ScanSession_businessId_status_idx" ON "ScanSession"("businessId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MediaAsset_businessId_idx" ON "MediaAsset"("businessId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SavedTemplate_businessId_idx" ON "SavedTemplate"("businessId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ScheduleRule_deviceSlotId_enabled_idx" ON "ScheduleRule"("deviceSlotId", "enabled");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LandingUseCase_enabled_sortOrder_idx" ON "LandingUseCase"("enabled", "sortOrder");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "BusinessUser" ADD CONSTRAINT "BusinessUser_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "BusinessUser" ADD CONSTRAINT "BusinessUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Location" ADD CONSTRAINT "Location_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "BrandKit" ADD CONSTRAINT "BrandKit_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "BrandLink" ADD CONSTRAINT "BrandLink_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "BrandLink" ADD CONSTRAINT "BrandLink_brandKitId_fkey" FOREIGN KEY ("brandKitId") REFERENCES "BrandKit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DeviceSlot" ADD CONSTRAINT "DeviceSlot_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DeviceSlot" ADD CONSTRAINT "DeviceSlot_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DeviceSlot" ADD CONSTRAINT "DeviceSlot_campaignGroupId_fkey" FOREIGN KEY ("campaignGroupId") REFERENCES "CampaignGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CampaignGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "CampaignGroup" ADD CONSTRAINT "CampaignGroup_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "CampaignGroup" ADD CONSTRAINT "CampaignGroup_defaultCampaignId_fkey" FOREIGN KEY ("defaultCampaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "CampaignGroup" ADD CONSTRAINT "CampaignGroup_endCampaignId_fkey" FOREIGN KEY ("endCampaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "CampaignGroupSlot" ADD CONSTRAINT "CampaignGroupSlot_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "CampaignGroupSlot" ADD CONSTRAINT "CampaignGroupSlot_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CampaignGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "CampaignGroupSlot" ADD CONSTRAINT "CampaignGroupSlot_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DeviceAssignment" ADD CONSTRAINT "DeviceAssignment_deviceSlotId_fkey" FOREIGN KEY ("deviceSlotId") REFERENCES "DeviceSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DeviceAssignment" ADD CONSTRAINT "DeviceAssignment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DeviceAssignment" ADD CONSTRAINT "DeviceAssignment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DeviceAssignment" ADD CONSTRAINT "DeviceAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "TapEvent" ADD CONSTRAINT "TapEvent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "TapEvent" ADD CONSTRAINT "TapEvent_deviceSlotId_fkey" FOREIGN KEY ("deviceSlotId") REFERENCES "DeviceSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "TapEvent" ADD CONSTRAINT "TapEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ClickEvent" ADD CONSTRAINT "ClickEvent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ClickEvent" ADD CONSTRAINT "ClickEvent_deviceSlotId_fkey" FOREIGN KEY ("deviceSlotId") REFERENCES "DeviceSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ClickEvent" ADD CONSTRAINT "ClickEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Lead" ADD CONSTRAINT "Lead_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Lead" ADD CONSTRAINT "Lead_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Lead" ADD CONSTRAINT "Lead_deviceSlotId_fkey" FOREIGN KEY ("deviceSlotId") REFERENCES "DeviceSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ScanSession" ADD CONSTRAINT "ScanSession_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ScanSession" ADD CONSTRAINT "ScanSession_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "SavedTemplate" ADD CONSTRAINT "SavedTemplate_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ScheduleRule" ADD CONSTRAINT "ScheduleRule_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ScheduleRule" ADD CONSTRAINT "ScheduleRule_deviceSlotId_fkey" FOREIGN KEY ("deviceSlotId") REFERENCES "DeviceSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ScheduleRule" ADD CONSTRAINT "ScheduleRule_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
