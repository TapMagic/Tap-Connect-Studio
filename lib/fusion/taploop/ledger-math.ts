/**
 * TapLoop ledger math — pure helpers shared by domain services + tests.
 * Feature gate: `loyalty.taploop` (TapLoop core).
 */

export type LedgerEntryLike = {
  type: "earn" | "redeem" | "adjust" | "expire" | "reverse" | "AWARD" | "REDEEM" | "ADJUST" | "EXPIRE" | "REVERSE";
  points: number;
};

export function normalizeLedgerType(
  type: LedgerEntryLike["type"]
): "earn" | "redeem" | "adjust" | "expire" | "reverse" {
  const t = String(type).toLowerCase();
  if (t === "award") return "earn";
  if (t === "earn" || t === "redeem" || t === "adjust" || t === "expire" || t === "reverse") {
    return t;
  }
  return "adjust";
}

export function computeBalance(entries: LedgerEntryLike[]): number {
  return entries.reduce((sum, e) => {
    const type = normalizeLedgerType(e.type);
    if (type === "earn" || type === "adjust") return sum + e.points;
    if (type === "redeem" || type === "expire" || type === "reverse") return sum - Math.abs(e.points);
    return sum;
  }, 0);
}

export function validateLedgerAppend(
  previous: LedgerEntryLike[],
  next: LedgerEntryLike
): { ok: true } | { ok: false; error: string } {
  if (next.points === 0) return { ok: false, error: "Zero-point entries are not allowed" };
  if (next.points < 0) return { ok: false, error: "Points must be a positive magnitude" };
  const type = normalizeLedgerType(next.type);
  if (type === "redeem" || type === "expire") {
    const bal = computeBalance(previous);
    if (Math.abs(next.points) > bal) return { ok: false, error: "Insufficient balance" };
  }
  if (type === "reverse") {
    const bal = computeBalance(previous);
    if (Math.abs(next.points) > bal) return { ok: false, error: "Insufficient balance to reverse" };
  }
  return { ok: true };
}

export type LoyaltyTierDef = {
  id: string;
  name: string;
  rank: number;
  thresholdPoints: number;
  perks: string[];
};

export function resolveTier(balance: number, tiers: LoyaltyTierDef[]): LoyaltyTierDef | null {
  const sorted = [...tiers].sort((a, b) => b.thresholdPoints - a.thresholdPoints);
  return sorted.find((t) => balance >= t.thresholdPoints) ?? null;
}
