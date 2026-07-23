/**
 * TapLoop — loyalty domain services with Prisma persistence.
 * Feature Registry: `loyalty.taploop` (TapLoop core). Consent required to enroll.
 */

import type { LoyaltyLedgerType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getLatestConsentForContact } from "@/lib/fusion/audience/consent";
import { createGovernedEvent, enqueueOutboxSync } from "@/lib/fusion/publication/events";
import { computeBalance, resolveTier, validateLedgerAppend, type LoyaltyTierDef } from "./ledger-math";

export type EarnRule = { id: string; label: string; points: number; event: string };

export type ProgramDto = {
  id: string;
  businessId: string;
  name: string;
  active: boolean;
  earnRules: EarnRule[];
  tiers: LoyaltyTierDef[];
  rewards: { id: string; name: string; pointsCost: number; active: boolean }[];
  createdAt: string;
};

export type EnrollmentDto = {
  id: string;
  programId: string;
  contactId: string;
  relationshipId: string | null;
  status: string;
  consentedAt: string;
  balance: number;
};

export type LedgerEntryDto = {
  id: string;
  programId: string;
  enrollmentId: string;
  contactId: string;
  type: LoyaltyLedgerType;
  points: number;
  reason: string;
  idempotencyKey: string;
  reversesEntryId: string | null;
  createdBy: string;
  createdAt: string;
};

function correlationId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${prefix}_${Date.now()}`;
}

function parseEarnRules(raw: unknown): EarnRule[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
    .map((r, i) => ({
      id: typeof r.id === "string" ? r.id : `rule_${i}`,
      label: typeof r.label === "string" ? r.label : "Earn",
      points: typeof r.points === "number" ? r.points : 0,
      event: typeof r.event === "string" ? r.event : "custom",
    }));
}

function mapTier(row: {
  id: string;
  name: string;
  rank: number;
  thresholdPoints: number;
  perks: unknown;
}): LoyaltyTierDef {
  const perks = Array.isArray(row.perks)
    ? row.perks.filter((p): p is string => typeof p === "string")
    : [];
  return {
    id: row.id,
    name: row.name,
    rank: row.rank,
    thresholdPoints: row.thresholdPoints,
    perks,
  };
}

async function loadProgramOrThrow(programId: string, businessId: string) {
  const program = await prisma.loyaltyProgram.findFirst({
    where: { id: programId, businessId },
    include: { tiers: { orderBy: { rank: "asc" } }, rewards: true },
  });
  if (!program) throw new Error("Program not found");
  return program;
}

export async function createProgram(params: {
  businessId: string;
  name: string;
  earnRules?: EarnRule[];
  tiers?: Array<{ name: string; rank: number; thresholdPoints: number; perks?: string[] }>;
}): Promise<ProgramDto> {
  const program = await prisma.loyaltyProgram.create({
    data: {
      businessId: params.businessId,
      name: params.name.trim(),
      active: true,
      earnRules: (params.earnRules ?? [
        { id: "visit", label: "Visit / tap", points: 10, event: "tap" },
        { id: "purchase", label: "Purchase", points: 50, event: "purchase" },
      ]) as unknown as Prisma.InputJsonValue,
      tiers: params.tiers?.length
        ? {
            create: params.tiers.map((t) => ({
              name: t.name,
              rank: t.rank,
              thresholdPoints: t.thresholdPoints,
              perks: (t.perks ?? []) as unknown as Prisma.InputJsonValue,
            })),
          }
        : {
            create: [
              { name: "Member", rank: 0, thresholdPoints: 0, perks: ["Welcome"] },
              { name: "Silver", rank: 1, thresholdPoints: 100, perks: ["5% off"] },
              { name: "Gold", rank: 2, thresholdPoints: 500, perks: ["10% off", "Priority"] },
            ],
          },
    },
    include: { tiers: { orderBy: { rank: "asc" } }, rewards: true },
  });

  enqueueOutboxSync(
    "loyalty.program.created",
    createGovernedEvent({
      name: "loyalty.program.created",
      businessId: params.businessId,
      aggregateType: "loyalty_program",
      aggregateId: program.id,
      correlationId: correlationId("loyalty"),
      payload: { name: program.name },
    })
  );

  return {
    id: program.id,
    businessId: program.businessId,
    name: program.name,
    active: program.active,
    earnRules: parseEarnRules(program.earnRules),
    tiers: program.tiers.map(mapTier),
    rewards: program.rewards.map((r) => ({
      id: r.id,
      name: r.name,
      pointsCost: r.pointsCost,
      active: r.active,
    })),
    createdAt: program.createdAt.toISOString(),
  };
}

export async function defineRules(params: {
  businessId: string;
  programId: string;
  earnRules?: EarnRule[];
  tiers?: Array<{ id?: string; name: string; rank: number; thresholdPoints: number; perks?: string[] }>;
  rewards?: Array<{ name: string; pointsCost: number; active?: boolean }>;
}): Promise<ProgramDto> {
  const existing = await loadProgramOrThrow(params.programId, params.businessId);

  if (params.earnRules) {
    await prisma.loyaltyProgram.update({
      where: { id: existing.id },
      data: { earnRules: params.earnRules as unknown as Prisma.InputJsonValue },
    });
  }

  if (params.tiers) {
    await prisma.loyaltyTier.deleteMany({ where: { programId: existing.id } });
    await prisma.loyaltyTier.createMany({
      data: params.tiers.map((t) => ({
        programId: existing.id,
        name: t.name,
        rank: t.rank,
        thresholdPoints: t.thresholdPoints,
        perks: (t.perks ?? []) as unknown as Prisma.InputJsonValue,
      })),
    });
  }

  if (params.rewards?.length) {
    for (const r of params.rewards) {
      await prisma.loyaltyReward.create({
        data: {
          programId: existing.id,
          name: r.name,
          pointsCost: r.pointsCost,
          active: r.active ?? true,
        },
      });
    }
  }

  const program = await loadProgramOrThrow(params.programId, params.businessId);
  return {
    id: program.id,
    businessId: program.businessId,
    name: program.name,
    active: program.active,
    earnRules: parseEarnRules(program.earnRules),
    tiers: program.tiers.map(mapTier),
    rewards: program.rewards.map((r) => ({
      id: r.id,
      name: r.name,
      pointsCost: r.pointsCost,
      active: r.active,
    })),
    createdAt: program.createdAt.toISOString(),
  };
}

export async function listPrograms(businessId: string): Promise<ProgramDto[]> {
  const rows = await prisma.loyaltyProgram.findMany({
    where: { businessId },
    include: { tiers: { orderBy: { rank: "asc" } }, rewards: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((program) => ({
    id: program.id,
    businessId: program.businessId,
    name: program.name,
    active: program.active,
    earnRules: parseEarnRules(program.earnRules),
    tiers: program.tiers.map(mapTier),
    rewards: program.rewards.map((r) => ({
      id: r.id,
      name: r.name,
      pointsCost: r.pointsCost,
      active: r.active,
    })),
    createdAt: program.createdAt.toISOString(),
  }));
}

/**
 * Enroll requires MARKETING or EMAIL consent GRANTED for the contact.
 */
export async function enroll(params: {
  businessId: string;
  programId: string;
  contactId: string;
  relationshipId?: string;
}): Promise<EnrollmentDto> {
  const program = await loadProgramOrThrow(params.programId, params.businessId);
  if (!program.active) throw new Error("Program is not active");

  const contact = await prisma.contact.findFirst({
    where: { id: params.contactId, businessId: params.businessId },
  });
  if (!contact) throw new Error("Contact not found");

  const emailConsent = await getLatestConsentForContact(params.contactId, "EMAIL");
  const marketingConsent = await getLatestConsentForContact(params.contactId, "MARKETING");
  const consented =
    emailConsent?.status === "GRANTED" || marketingConsent?.status === "GRANTED";
  if (!consented) {
    throw new Error("Consent required — record EMAIL or MARKETING consent before enrolling");
  }

  let relationshipId = params.relationshipId;
  if (!relationshipId) {
    const rel = await prisma.customerRelationship.findUnique({
      where: {
        businessId_contactId: {
          businessId: params.businessId,
          contactId: params.contactId,
        },
      },
    });
    relationshipId = rel?.id;
  }

  const consentedAt =
    marketingConsent?.status === "GRANTED"
      ? marketingConsent.recordedAt
      : emailConsent!.recordedAt;

  const enrollment = await prisma.loyaltyEnrollment.upsert({
    where: {
      programId_contactId: {
        programId: params.programId,
        contactId: params.contactId,
      },
    },
    create: {
      programId: params.programId,
      businessId: params.businessId,
      contactId: params.contactId,
      relationshipId,
      status: "ACTIVE",
      consentedAt,
    },
    update: {
      status: "ACTIVE",
      relationshipId: relationshipId ?? undefined,
      consentedAt,
    },
  });

  enqueueOutboxSync(
    "loyalty.enroll",
    createGovernedEvent({
      name: "loyalty.enrolled",
      businessId: params.businessId,
      aggregateType: "loyalty_enrollment",
      aggregateId: enrollment.id,
      correlationId: correlationId("enroll"),
      payload: { programId: params.programId, contactId: params.contactId },
    })
  );

  return {
    id: enrollment.id,
    programId: enrollment.programId,
    contactId: enrollment.contactId,
    relationshipId: enrollment.relationshipId,
    status: enrollment.status,
    consentedAt: enrollment.consentedAt.toISOString(),
    balance: 0,
  };
}

async function findIdempotent(
  businessId: string,
  idempotencyKey: string
): Promise<LedgerEntryDto | null> {
  const existing = await prisma.loyaltyLedgerEntry.findUnique({
    where: { businessId_idempotencyKey: { businessId, idempotencyKey } },
  });
  if (!existing) return null;
  return mapLedger(existing);
}

function mapLedger(row: {
  id: string;
  programId: string;
  enrollmentId: string;
  contactId: string;
  type: LoyaltyLedgerType;
  points: number;
  reason: string;
  idempotencyKey: string;
  reversesEntryId: string | null;
  createdBy: string;
  createdAt: Date;
}): LedgerEntryDto {
  return {
    id: row.id,
    programId: row.programId,
    enrollmentId: row.enrollmentId,
    contactId: row.contactId,
    type: row.type,
    points: row.points,
    reason: row.reason,
    idempotencyKey: row.idempotencyKey,
    reversesEntryId: row.reversesEntryId,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
  };
}

async function balanceForEnrollment(enrollmentId: string): Promise<number> {
  const entries = await prisma.loyaltyLedgerEntry.findMany({
    where: { enrollmentId },
    orderBy: { createdAt: "asc" },
    select: { type: true, points: true },
  });
  return computeBalance(entries);
}

export async function award(params: {
  businessId: string;
  enrollmentId: string;
  points: number;
  reason: string;
  idempotencyKey: string;
  evidenceId?: string;
  campaignId?: string;
  createdBy?: string;
}): Promise<{ entry: LedgerEntryDto; balance: number; duplicate: boolean; tier: LoyaltyTierDef | null }> {
  const dup = await findIdempotent(params.businessId, params.idempotencyKey);
  if (dup) {
    const balance = await balanceForEnrollment(dup.enrollmentId);
    const program = await loadProgramOrThrow(dup.programId, params.businessId);
    return {
      entry: dup,
      balance,
      duplicate: true,
      tier: resolveTier(balance, program.tiers.map(mapTier)),
    };
  }

  const enrollment = await prisma.loyaltyEnrollment.findFirst({
    where: { id: params.enrollmentId, businessId: params.businessId, status: "ACTIVE" },
  });
  if (!enrollment) throw new Error("Enrollment not found or inactive");

  const previous = await prisma.loyaltyLedgerEntry.findMany({
    where: { enrollmentId: enrollment.id },
    orderBy: { createdAt: "asc" },
    select: { type: true, points: true },
  });
  const check = validateLedgerAppend(previous, { type: "AWARD", points: params.points });
  if (!check.ok) throw new Error(check.error);

  try {
    const entry = await prisma.loyaltyLedgerEntry.create({
      data: {
        programId: enrollment.programId,
        businessId: params.businessId,
        enrollmentId: enrollment.id,
        contactId: enrollment.contactId,
        relationshipId: enrollment.relationshipId,
        type: "AWARD",
        points: params.points,
        reason: params.reason,
        evidenceId: params.evidenceId,
        campaignId: params.campaignId,
        idempotencyKey: params.idempotencyKey,
        createdBy: params.createdBy ?? "staff",
      },
    });

    const balance = computeBalance([...previous, { type: "AWARD", points: params.points }]);
    const program = await loadProgramOrThrow(enrollment.programId, params.businessId);

    enqueueOutboxSync(
      "loyalty.award",
      createGovernedEvent({
        name: "loyalty.points.awarded",
        businessId: params.businessId,
        aggregateType: "loyalty_enrollment",
        aggregateId: enrollment.id,
        correlationId: correlationId("award"),
        payload: { points: params.points, entryId: entry.id, balance },
      })
    );

    return {
      entry: mapLedger(entry),
      balance,
      duplicate: false,
      tier: resolveTier(balance, program.tiers.map(mapTier)),
    };
  } catch (err) {
    const again = await findIdempotent(params.businessId, params.idempotencyKey);
    if (again) {
      const balance = await balanceForEnrollment(again.enrollmentId);
      const program = await loadProgramOrThrow(again.programId, params.businessId);
      return {
        entry: again,
        balance,
        duplicate: true,
        tier: resolveTier(balance, program.tiers.map(mapTier)),
      };
    }
    throw err;
  }
}

export async function redeem(params: {
  businessId: string;
  enrollmentId: string;
  points: number;
  reason: string;
  idempotencyKey: string;
  rewardId?: string;
  createdBy?: string;
}): Promise<{ entry: LedgerEntryDto; balance: number; duplicate: boolean; tier: LoyaltyTierDef | null }> {
  const dup = await findIdempotent(params.businessId, params.idempotencyKey);
  if (dup) {
    const balance = await balanceForEnrollment(dup.enrollmentId);
    const program = await loadProgramOrThrow(dup.programId, params.businessId);
    return {
      entry: dup,
      balance,
      duplicate: true,
      tier: resolveTier(balance, program.tiers.map(mapTier)),
    };
  }

  const enrollment = await prisma.loyaltyEnrollment.findFirst({
    where: { id: params.enrollmentId, businessId: params.businessId, status: "ACTIVE" },
  });
  if (!enrollment) throw new Error("Enrollment not found or inactive");

  const previous = await prisma.loyaltyLedgerEntry.findMany({
    where: { enrollmentId: enrollment.id },
    orderBy: { createdAt: "asc" },
    select: { type: true, points: true },
  });
  const check = validateLedgerAppend(previous, { type: "REDEEM", points: params.points });
  if (!check.ok) throw new Error(check.error);

  try {
    const entry = await prisma.loyaltyLedgerEntry.create({
      data: {
        programId: enrollment.programId,
        businessId: params.businessId,
        enrollmentId: enrollment.id,
        contactId: enrollment.contactId,
        relationshipId: enrollment.relationshipId,
        type: "REDEEM",
        points: params.points,
        reason: params.reason,
        rewardId: params.rewardId,
        idempotencyKey: params.idempotencyKey,
        createdBy: params.createdBy ?? "staff",
      },
    });

    const balance = computeBalance([...previous, { type: "REDEEM", points: params.points }]);
    const program = await loadProgramOrThrow(enrollment.programId, params.businessId);

    enqueueOutboxSync(
      "loyalty.redeem",
      createGovernedEvent({
        name: "loyalty.points.redeemed",
        businessId: params.businessId,
        aggregateType: "loyalty_enrollment",
        aggregateId: enrollment.id,
        correlationId: correlationId("redeem"),
        payload: { points: params.points, entryId: entry.id, balance },
      })
    );

    return {
      entry: mapLedger(entry),
      balance,
      duplicate: false,
      tier: resolveTier(balance, program.tiers.map(mapTier)),
    };
  } catch (err) {
    const again = await findIdempotent(params.businessId, params.idempotencyKey);
    if (again) {
      const balance = await balanceForEnrollment(again.enrollmentId);
      const program = await loadProgramOrThrow(again.programId, params.businessId);
      return {
        entry: again,
        balance,
        duplicate: true,
        tier: resolveTier(balance, program.tiers.map(mapTier)),
      };
    }
    throw err;
  }
}

/**
 * Reverse an award (subtracts) or a redeem (awards back via REVERSE of redeem = adjust path).
 * For AWARD originals → REVERSE entry. For REDEEM originals → AWARD with reverse link (restore points).
 */
export async function reverse(params: {
  businessId: string;
  entryId: string;
  reason: string;
  idempotencyKey: string;
  createdBy?: string;
}): Promise<{ entry: LedgerEntryDto; balance: number; duplicate: boolean }> {
  const dup = await findIdempotent(params.businessId, params.idempotencyKey);
  if (dup) {
    return {
      entry: dup,
      balance: await balanceForEnrollment(dup.enrollmentId),
      duplicate: true,
    };
  }

  const original = await prisma.loyaltyLedgerEntry.findFirst({
    where: { id: params.entryId, businessId: params.businessId },
  });
  if (!original) throw new Error("Ledger entry not found");

  const already = await prisma.loyaltyLedgerEntry.findFirst({
    where: { reversesEntryId: original.id, businessId: params.businessId },
  });
  if (already) {
    return {
      entry: mapLedger(already),
      balance: await balanceForEnrollment(already.enrollmentId),
      duplicate: true,
    };
  }

  const previous = await prisma.loyaltyLedgerEntry.findMany({
    where: { enrollmentId: original.enrollmentId },
    orderBy: { createdAt: "asc" },
    select: { type: true, points: true },
  });

  // Reverse of AWARD → REVERSE (subtract). Reverse of REDEEM → AWARD (restore).
  const reverseType: LoyaltyLedgerType = original.type === "REDEEM" ? "AWARD" : "REVERSE";
  const check = validateLedgerAppend(previous, {
    type: reverseType,
    points: original.points,
  });
  if (!check.ok) throw new Error(check.error);

  try {
    const entry = await prisma.loyaltyLedgerEntry.create({
      data: {
        programId: original.programId,
        businessId: params.businessId,
        enrollmentId: original.enrollmentId,
        contactId: original.contactId,
        relationshipId: original.relationshipId,
        type: reverseType,
        points: original.points,
        reason: params.reason || `Reverse of ${original.id}`,
        idempotencyKey: params.idempotencyKey,
        reversesEntryId: original.id,
        createdBy: params.createdBy ?? "staff",
      },
    });

    const balance = computeBalance([...previous, { type: reverseType, points: original.points }]);

    enqueueOutboxSync(
      "loyalty.reverse",
      createGovernedEvent({
        name: "loyalty.points.reversed",
        businessId: params.businessId,
        aggregateType: "loyalty_enrollment",
        aggregateId: original.enrollmentId,
        correlationId: correlationId("reverse"),
        payload: { originalEntryId: original.id, entryId: entry.id, balance },
      })
    );

    return { entry: mapLedger(entry), balance, duplicate: false };
  } catch (err) {
    const again = await findIdempotent(params.businessId, params.idempotencyKey);
    if (again) {
      return {
        entry: again,
        balance: await balanceForEnrollment(again.enrollmentId),
        duplicate: true,
      };
    }
    throw err;
  }
}

export async function listLedger(params: {
  businessId: string;
  enrollmentId?: string;
  programId?: string;
  contactId?: string;
  limit?: number;
}): Promise<{ entries: LedgerEntryDto[]; balance: number | null }> {
  const entries = await prisma.loyaltyLedgerEntry.findMany({
    where: {
      businessId: params.businessId,
      ...(params.enrollmentId ? { enrollmentId: params.enrollmentId } : {}),
      ...(params.programId ? { programId: params.programId } : {}),
      ...(params.contactId ? { contactId: params.contactId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: params.limit ?? 50,
  });

  let balance: number | null = null;
  if (params.enrollmentId) {
    balance = await balanceForEnrollment(params.enrollmentId);
  }

  return { entries: entries.map(mapLedger), balance };
}

export async function getEnrollmentBalance(
  businessId: string,
  enrollmentId: string
): Promise<{ balance: number; tier: LoyaltyTierDef | null; enrollment: EnrollmentDto } | null> {
  const enrollment = await prisma.loyaltyEnrollment.findFirst({
    where: { id: enrollmentId, businessId },
  });
  if (!enrollment) return null;
  const balance = await balanceForEnrollment(enrollment.id);
  const program = await loadProgramOrThrow(enrollment.programId, businessId);
  return {
    balance,
    tier: resolveTier(balance, program.tiers.map(mapTier)),
    enrollment: {
      id: enrollment.id,
      programId: enrollment.programId,
      contactId: enrollment.contactId,
      relationshipId: enrollment.relationshipId,
      status: enrollment.status,
      consentedAt: enrollment.consentedAt.toISOString(),
      balance,
    },
  };
}

export { computeBalance, validateLedgerAppend, resolveTier } from "./ledger-math";
