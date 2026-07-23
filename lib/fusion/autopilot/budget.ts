/**
 * Autopilot monthly generation budget stub.
 * Uses in-memory counter; optionally cross-checks PlatformAuditEvent when isolated DB is up.
 */

import { prisma } from "@/lib/db";
import { isIsolatedFusionDatabaseConfigured } from "@/lib/fusion/db/safety";

/** Soft monthly cap per business (overridden by plan tier when provided) */
export const AUTOPILOT_MONTHLY_BUDGET_DEFAULT = 100;

const PLAN_BUDGET_LIMITS: Record<string, number> = {
  BASIC: 0,
  STUDIO: 50,
  PRO: 200,
  GROWTH: 500,
  ENTERPRISE: 2000,
};

export function autopilotBudgetLimitForPlan(planTier?: string): number {
  if (!planTier) return AUTOPILOT_MONTHLY_BUDGET_DEFAULT;
  return PLAN_BUDGET_LIMITS[planTier] ?? AUTOPILOT_MONTHLY_BUDGET_DEFAULT;
}

type MonthBucket = { monthKey: string; count: number };

const memoryUsage = new Map<string, MonthBucket>();

export function currentMonthKey(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function resetAutopilotBudgetMemory() {
  memoryUsage.clear();
}

export type BudgetCheckResult = {
  ok: boolean;
  used: number;
  limit: number;
  monthKey: string;
  source: "memory" | "audit";
  message?: string;
};

function getMemoryBucket(businessId: string, monthKey: string): MonthBucket {
  const existing = memoryUsage.get(businessId);
  if (!existing || existing.monthKey !== monthKey) {
    const fresh = { monthKey, count: 0 };
    memoryUsage.set(businessId, fresh);
    return fresh;
  }
  return existing;
}

export function checkAutopilotBudgetSync(
  businessId: string,
  limit = AUTOPILOT_MONTHLY_BUDGET_DEFAULT,
  now = new Date()
): BudgetCheckResult {
  const monthKey = currentMonthKey(now);
  const bucket = getMemoryBucket(businessId, monthKey);
  const ok = bucket.count < limit;
  return {
    ok,
    used: bucket.count,
    limit,
    monthKey,
    source: "memory",
    message: ok
      ? undefined
      : `Automation Team monthly budget exhausted (${bucket.count}/${limit} for ${monthKey}).`,
  };
}

export function recordAutopilotBudgetUse(
  businessId: string,
  now = new Date()
): BudgetCheckResult {
  const monthKey = currentMonthKey(now);
  const bucket = getMemoryBucket(businessId, monthKey);
  bucket.count += 1;
  memoryUsage.set(businessId, bucket);
  return {
    ok: bucket.count <= AUTOPILOT_MONTHLY_BUDGET_DEFAULT,
    used: bucket.count,
    limit: AUTOPILOT_MONTHLY_BUDGET_DEFAULT,
    monthKey,
    source: "memory",
  };
}

/**
 * Prefer audit-event count when isolated DB is configured; fall back to memory.
 */
export async function checkAutopilotBudget(
  businessId: string,
  limit = AUTOPILOT_MONTHLY_BUDGET_DEFAULT,
  planTier?: string
): Promise<BudgetCheckResult> {
  const effectiveLimit = planTier ? autopilotBudgetLimitForPlan(planTier) : limit;
  const monthKey = currentMonthKey();
  const mem = checkAutopilotBudgetSync(businessId, effectiveLimit);

  if (!isIsolatedFusionDatabaseConfigured()) {
    return mem;
  }

  try {
    const start = new Date();
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);

    const used = await prisma.platformAuditEvent.count({
      where: {
        businessId,
        action: "autopilot.proposal.create",
        occurredAt: { gte: start },
      },
    });

    const combined = Math.max(used, mem.used);
    const ok = combined < effectiveLimit;
    return {
      ok,
      used: combined,
      limit: effectiveLimit,
      monthKey,
      source: "audit",
      message: ok
        ? undefined
        : `Automation Team monthly budget exhausted (${combined}/${effectiveLimit} for ${monthKey}).`,
    };
  } catch {
    return mem;
  }
}

export type AutopilotBudgetSummary = BudgetCheckResult & {
  estimatedUsdMonth: number;
  ledgerEntryCount: number;
};

/** Budget + cost ledger rollup for settings / API surfaces */
export async function getAutopilotBudgetSummary(
  businessId: string,
  planTier?: string
): Promise<AutopilotBudgetSummary> {
  const { sumCostUsd, listCostLedger } = await import("./knowledge");
  const budget = await checkAutopilotBudget(businessId, AUTOPILOT_MONTHLY_BUDGET_DEFAULT, planTier);
  const ledger = listCostLedger(businessId, 500);
  const monthKey = budget.monthKey;
  const monthEntries = ledger.filter((e) => e.createdAt.startsWith(monthKey));
  return {
    ...budget,
    estimatedUsdMonth: sumCostUsd(businessId),
    ledgerEntryCount: monthEntries.length,
  };
}

/** Pure compare helper for two proposal summaries (UI + tests) */
export type ComparableProposal = {
  id: string;
  recipeId: string;
  recipeVersion?: string;
  revision?: number;
  summary: string;
  status: string;
  artifacts: { kind: string; label: string }[];
  warnings?: string[];
};

export type ProposalCompareResult = {
  leftId: string;
  rightId: string;
  sameRecipe: boolean;
  sameVersion: boolean;
  sameRevision: boolean;
  artifactDiff: {
    onlyLeft: string[];
    onlyRight: string[];
    both: string[];
  };
  summaryEqual: boolean;
};

export function compareProposals(
  left: ComparableProposal,
  right: ComparableProposal
): ProposalCompareResult {
  const leftKinds = new Set(left.artifacts.map((a) => a.kind));
  const rightKinds = new Set(right.artifacts.map((a) => a.kind));
  const both: string[] = [];
  const onlyLeft: string[] = [];
  const onlyRight: string[] = [];

  for (const k of leftKinds) {
    if (rightKinds.has(k)) both.push(k);
    else onlyLeft.push(k);
  }
  for (const k of rightKinds) {
    if (!leftKinds.has(k)) onlyRight.push(k);
  }

  return {
    leftId: left.id,
    rightId: right.id,
    sameRecipe: left.recipeId === right.recipeId,
    sameVersion: (left.recipeVersion ?? "1") === (right.recipeVersion ?? "1"),
    sameRevision: (left.revision ?? 1) === (right.revision ?? 1),
    artifactDiff: { onlyLeft, onlyRight, both },
    summaryEqual: left.summary === right.summary,
  };
}
