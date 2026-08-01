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

    // PostgreSQL has no ADD CONSTRAINT IF NOT EXISTS, so make the compatibility
    // bootstrap idempotent without generating an expected database error.
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ScheduleRule_businessId_fkey') THEN
          ALTER TABLE "ScheduleRule" ADD CONSTRAINT "ScheduleRule_businessId_fkey"
          FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ScheduleRule_deviceSlotId_fkey') THEN
          ALTER TABLE "ScheduleRule" ADD CONSTRAINT "ScheduleRule_deviceSlotId_fkey"
          FOREIGN KEY ("deviceSlotId") REFERENCES "DeviceSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ScheduleRule_campaignId_fkey') THEN
          ALTER TABLE "ScheduleRule" ADD CONSTRAINT "ScheduleRule_campaignId_fkey"
          FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

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
