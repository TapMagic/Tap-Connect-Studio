import { prisma } from "@/lib/db";
import { isMissingRelationError } from "@/lib/db/ensure-schedule";

let groupTablesReady: boolean | null = null;

/** Create CampaignGroup / CampaignGroupSlot + DeviceSlot.campaignGroupId if DB lag. */
export async function ensureCampaignGroupTables(): Promise<boolean> {
  if (groupTablesReady === true) return true;

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CampaignGroup" (
        "id" TEXT NOT NULL,
        "businessId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "status" TEXT NOT NULL DEFAULT 'LIVE',
        "timezone" TEXT,
        "showUpcomingOnPages" BOOLEAN NOT NULL DEFAULT true,
        "industryHint" TEXT,
        "defaultCampaignId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "CampaignGroup_pkey" PRIMARY KEY ("id")
      );
    `);

    await prisma.$executeRawUnsafe(`
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
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "CampaignGroupSlot_pkey" PRIMARY KEY ("id")
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "CampaignGroup_businessId_idx"
      ON "CampaignGroup"("businessId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "CampaignGroupSlot_groupId_enabled_idx"
      ON "CampaignGroupSlot"("groupId", "enabled");
    `);

    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "DeviceSlot" ADD COLUMN IF NOT EXISTS "campaignGroupId" TEXT;
      `);
    } catch {
      /* exists or unsupported */
    }

    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "groupId" TEXT;
      `);
    } catch {
      /* exists */
    }

    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "timezone" TEXT DEFAULT 'America/New_York';
      `);
    } catch {
      /* exists */
    }

    for (const col of [
      `ALTER TABLE "CampaignGroup" ADD COLUMN IF NOT EXISTS "timezone" TEXT`,
      `ALTER TABLE "CampaignGroup" ADD COLUMN IF NOT EXISTS "showUpcomingOnPages" BOOLEAN DEFAULT true`,
      `ALTER TABLE "CampaignGroup" ADD COLUMN IF NOT EXISTS "industryHint" TEXT`,
    ]) {
      try {
        await prisma.$executeRawUnsafe(col);
      } catch {
        /* exists */
      }
    }

    for (const sql of [
      `ALTER TABLE "CampaignGroup" ADD CONSTRAINT "CampaignGroup_businessId_fkey"
        FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "CampaignGroupSlot" ADD CONSTRAINT "CampaignGroupSlot_groupId_fkey"
        FOREIGN KEY ("groupId") REFERENCES "CampaignGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "CampaignGroupSlot" ADD CONSTRAINT "CampaignGroupSlot_campaignId_fkey"
        FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "CampaignGroupSlot" ADD CONSTRAINT "CampaignGroupSlot_businessId_fkey"
        FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    ]) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch {
        /* exists */
      }
    }

    groupTablesReady = true;
    return true;
  } catch (error) {
    console.error("ensureCampaignGroupTables failed:", error);
    groupTablesReady = false;
    return false;
  }
}

export { isMissingRelationError };
