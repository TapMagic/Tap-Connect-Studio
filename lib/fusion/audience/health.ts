/**
 * Relationship health score — deterministic signal blend for Audience detail.
 * Evidence-class aware: never presents modeled guesses as confirmed facts.
 */

export type HealthSignal = {
  key: string;
  label: string;
  points: number;
  max: number;
  evidenceClass: "confirmed" | "derived" | "modeled" | "incomplete";
};

export type RelationshipHealth = {
  score: number; // 0–100
  grade: "excellent" | "good" | "fair" | "at_risk" | "unknown";
  signals: HealthSignal[];
  summary: string;
};

export type HealthInput = {
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  hasEmail: boolean;
  hasPhone: boolean;
  emailConsent: boolean;
  walletConsent: boolean;
  marketingConsent: boolean;
  tapSaveEnabled: boolean;
  daysSinceCreated: number;
  daysSinceLastTouch?: number | null;
  openThreadCount?: number;
  issuedPassCount?: number;
  leadCount?: number;
};

export function computeRelationshipHealth(input: HealthInput): RelationshipHealth {
  const signals: HealthSignal[] = [];

  signals.push({
    key: "status",
    label: "Relationship active",
    points: input.status === "ACTIVE" ? 20 : input.status === "PAUSED" ? 8 : 0,
    max: 20,
    evidenceClass: "confirmed",
  });

  signals.push({
    key: "identity",
    label: "Contact identity",
    points: (input.hasEmail ? 10 : 0) + (input.hasPhone ? 5 : 0),
    max: 15,
    evidenceClass: input.hasEmail || input.hasPhone ? "confirmed" : "incomplete",
  });

  signals.push({
    key: "consent",
    label: "Consent coverage",
    points:
      (input.emailConsent ? 10 : 0) +
      (input.walletConsent ? 5 : 0) +
      (input.marketingConsent ? 5 : 0),
    max: 20,
    evidenceClass: "confirmed",
  });

  signals.push({
    key: "tapsave",
    label: "TapSave enabled",
    points: input.tapSaveEnabled ? 10 : 0,
    max: 10,
    evidenceClass: "confirmed",
  });

  const recency =
    input.daysSinceLastTouch == null
      ? input.daysSinceCreated <= 30
        ? 10
        : input.daysSinceCreated <= 90
          ? 5
          : 0
      : input.daysSinceLastTouch <= 14
        ? 15
        : input.daysSinceLastTouch <= 45
          ? 8
          : 2;
  signals.push({
    key: "recency",
    label: "Recent engagement",
    points: recency,
    max: 15,
    evidenceClass: input.daysSinceLastTouch == null ? "derived" : "confirmed",
  });

  signals.push({
    key: "wallet",
    label: "Wallet passes issued",
    points: Math.min(10, (input.issuedPassCount ?? 0) * 5),
    max: 10,
    evidenceClass: "confirmed",
  });

  signals.push({
    key: "support",
    label: "Open support load",
    points: (input.openThreadCount ?? 0) > 2 ? 0 : (input.openThreadCount ?? 0) === 0 ? 5 : 3,
    max: 5,
    evidenceClass: "derived",
  });

  signals.push({
    key: "capture",
    label: "Lead history",
    points: Math.min(5, input.leadCount ?? 0),
    max: 5,
    evidenceClass: (input.leadCount ?? 0) > 0 ? "confirmed" : "incomplete",
  });

  const earned = signals.reduce((s, x) => s + x.points, 0);
  const max = signals.reduce((s, x) => s + x.max, 0);
  const score = max === 0 ? 0 : Math.round((earned / max) * 100);

  let grade: RelationshipHealth["grade"];
  if (signals.every((s) => s.evidenceClass === "incomplete") && score === 0) grade = "unknown";
  else if (score >= 80) grade = "excellent";
  else if (score >= 60) grade = "good";
  else if (score >= 40) grade = "fair";
  else grade = "at_risk";

  const summary =
    grade === "excellent"
      ? "Strong relationship with consent and recent activity"
      : grade === "good"
        ? "Healthy relationship — a few gaps remain"
        : grade === "fair"
          ? "Moderate health — improve consent or engagement"
          : grade === "at_risk"
            ? "At risk — missing consent, identity, or engagement"
            : "Insufficient data to score";

  return { score, grade, signals, summary };
}
