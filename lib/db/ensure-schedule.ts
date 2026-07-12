import { prisma } from "@/lib/db";

let scheduleTableReady: boolean | null = null;

/** Create ScheduleRule if Railway/DB was never pushed with the latest schema. */
export async function ensureScheduleRuleTable(): Promise<boolean> {
  if (scheduleTableReady === true) return true;

  try {
    await prisma.$executeRawUnsafe(`
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
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ScheduleRule_pkey" PRIMARY KEY ("id")
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "ScheduleRule_deviceSlotId_enabled_idx"
      ON "ScheduleRule"("deviceSlotId", "enabled");
    `);

    // FKs — ignore if already exist or parent missing
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "ScheduleRule"
        ADD CONSTRAINT "ScheduleRule_businessId_fkey"
        FOREIGN KEY ("businessId") REFERENCES "Business"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
      `);
    } catch {
      /* exists */
    }
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "ScheduleRule"
        ADD CONSTRAINT "ScheduleRule_deviceSlotId_fkey"
        FOREIGN KEY ("deviceSlotId") REFERENCES "DeviceSlot"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
      `);
    } catch {
      /* exists */
    }
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "ScheduleRule"
        ADD CONSTRAINT "ScheduleRule_campaignId_fkey"
        FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
      `);
    } catch {
      /* exists */
    }

    scheduleTableReady = true;
    return true;
  } catch (error) {
    console.error("ensureScheduleRuleTable failed:", error);
    scheduleTableReady = false;
    return false;
  }
}

export function isMissingRelationError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes("does not exist") ||
    msg.includes("P2021") ||
    (msg.includes("ScheduleRule") && msg.includes("findMany"))
  );
}
