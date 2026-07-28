import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { InsightKpi } from "@/lib/fusion/insights/types";
import type { InsightKpiDelta } from "@/lib/fusion/insights/comparisons";

/**
 * Card health narrative — a plain-language, evidence-honest summary of what the Card
 * produced in this period. Reads only from the authoritative Insights snapshot KPIs;
 * it invents nothing. Confirmed outcomes are labeled as confirmed; anything computed
 * is labeled inferred. GO green is never used here — it is a narrative, not an action.
 */

function kpi(kpis: InsightKpi[], key: string): InsightKpi | undefined {
  return kpis.find((k) => k.key === key);
}

function num(k: InsightKpi | undefined): number {
  return typeof k?.value === "number" ? k.value : 0;
}

export type CardHealthNarrative = {
  headline: string;
  reason: string;
  basis: "confirmed" | "mixed" | "none";
  metrics: { label: string; value: string; basis: "Confirmed" | "Inferred" }[];
};

export function buildCardHealthNarrative(
  cardName: string,
  kpis: InsightKpi[],
  deltas: InsightKpiDelta[],
  rangeDays: number
): CardHealthNarrative {
  const taps = kpi(kpis, "taps");
  const leads = kpi(kpis, "leads");
  const conversion = kpi(kpis, "conversion");
  const claims = kpi(kpis, "offer_claims");

  const tapCount = num(taps);
  const leadCount = num(leads);
  const claimCount = num(claims);

  const confirmedOutcomes = leadCount + claimCount;
  const tapDelta = deltas.find((d) => d.key === "taps");

  let headline: string;
  let reason: string;
  let basis: CardHealthNarrative["basis"];

  if (tapCount === 0) {
    headline = `${cardName} produced no confirmed outcomes in the last ${rangeDays} days.`;
    reason =
      "No customer taps were recorded in this period — this is normal when the Card is not yet live on a Tap Point, or when the range is quiet.";
    basis = "none";
  } else if (confirmedOutcomes > 0) {
    headline = `${cardName} produced ${confirmedOutcomes} confirmed outcome${
      confirmedOutcomes === 1 ? "" : "s"
    } in the last ${rangeDays} days.`;
    const bits: string[] = [];
    if (leadCount > 0) bits.push(`${leadCount} captured lead${leadCount === 1 ? "" : "s"}`);
    if (claimCount > 0) bits.push(`${claimCount} offer claim${claimCount === 1 ? "" : "s"}`);
    reason = `Because ${tapCount} confirmed tap${tapCount === 1 ? "" : "s"} reached the Card${
      bits.length ? `, driving ${bits.join(" and ")}` : ""
    }. These are stored events — confirmed, not modeled.`;
    basis = "confirmed";
  } else {
    headline = `${cardName} received ${tapCount} confirmed tap${
      tapCount === 1 ? "" : "s"
    } but no downstream outcomes yet.`;
    reason =
      "Taps are confirmed, but no leads or claims followed. Consider whether a Spotlight offer or capture step is wired on the Card.";
    basis = "mixed";
  }

  if (tapDelta && tapDelta.deltaPct !== null) {
    const dir = tapDelta.delta > 0 ? "up" : tapDelta.delta < 0 ? "down" : "flat";
    if (dir !== "flat") {
      reason += ` Taps are ${dir} ${Math.abs(tapDelta.deltaPct)}% vs the prior period (derived).`;
    }
  }

  const metrics: CardHealthNarrative["metrics"] = [
    { label: "Confirmed taps", value: String(tapCount), basis: "Confirmed" },
    { label: "Captured leads", value: String(leadCount), basis: "Confirmed" },
    { label: "Offer claims", value: String(claimCount), basis: "Confirmed" },
    {
      label: "Conversion",
      value: conversion ? `${num(conversion)}%` : "—",
      basis: "Inferred",
    },
  ];

  return { headline, reason, basis, metrics };
}

const BASIS_TONE: Record<"Confirmed" | "Inferred", string> = {
  Confirmed: "border-[oklch(0.78_0.12_155_/_0.5)] text-[oklch(0.82_0.12_155)]",
  Inferred: "border-white/15 text-white/55",
};

export function InsightsCardNarrative({
  cardName,
  kpis,
  deltas,
  rangeDays,
  cardHref = "/dashboard/card",
}: {
  cardName: string;
  kpis: InsightKpi[];
  deltas: InsightKpiDelta[];
  rangeDays: number;
  cardHref?: string;
}) {
  const narrative = buildCardHealthNarrative(cardName, kpis, deltas, rangeDays);

  return (
    <Card
      className="border-[oklch(0.66_0.13_195_/_0.25)] bg-card/40"
      data-testid="insights-card-narrative"
    >
      <CardHeader>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[oklch(0.88_0.09_195)]">
          Card health
        </p>
        <CardTitle className="text-lg leading-snug text-white">{narrative.headline}</CardTitle>
        <CardDescription className="text-white/60">{narrative.reason}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {narrative.metrics.map((m) => (
            <div key={m.label} className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
              <p className="text-[10px] uppercase tracking-wide text-white/45">{m.label}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-white">{m.value}</p>
              <span
                className={`mt-1 inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide ${BASIS_TONE[m.basis]}`}
              >
                {m.basis}
              </span>
            </div>
          ))}
        </div>
        <Link
          href={cardHref}
          className="inline-flex text-xs font-medium text-[oklch(0.82_0.11_195)] underline-offset-4 hover:underline"
          data-testid="insights-narrative-card-link"
        >
          Open the Card this supports →
        </Link>
      </CardContent>
    </Card>
  );
}
