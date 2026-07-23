/**
 * TapLoop — loyalty ledger contracts (append-only).
 * Wired to Feature Registry `loyalty.taploop`. Persistence lives in lib/fusion/taploop/.
 */

export type {
  LoyaltyTierDef as LoyaltyTier,
  LedgerEntryLike,
} from "@/lib/fusion/taploop/ledger-math";

export {
  computeBalance,
  resolveTier,
  validateLedgerAppend,
  normalizeLedgerType,
} from "@/lib/fusion/taploop/ledger-math";

/** @deprecated Prefer LedgerEntryDto from lib/fusion/taploop — kept for domain-contracts tests */
export type LoyaltyLedgerEntry = {
  id: string;
  relationshipId: string;
  businessId: string;
  type: "earn" | "redeem" | "adjust" | "expire" | "reverse";
  points: number;
  reason: string;
  evidenceId?: string;
  campaignId?: string;
  createdAt: string;
  createdBy: "system" | "staff" | "automation";
};

export type LoyaltyProgram = {
  id: string;
  businessId: string;
  name: string;
  active: boolean;
  tiers: import("@/lib/fusion/taploop/ledger-math").LoyaltyTierDef[];
  earnRules: Array<{ id: string; label: string; points: number; event: string }>;
};
