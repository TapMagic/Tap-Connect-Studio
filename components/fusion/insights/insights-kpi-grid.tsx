import Link from "next/link";
import {
  evidenceClassTone,
  formatEvidenceCaption,
} from "@/lib/fusion/insights/evidence-display";
import { formatDeltaCaption } from "@/lib/fusion/insights/comparisons";
import type { InsightKpiDelta } from "@/lib/fusion/insights/comparisons";
import type { InsightKpi } from "@/lib/fusion/insights/types";
import { buildInsightsHref, type InsightsView } from "@/lib/fusion/insights/views";
import { cn } from "@/lib/utils";

function formatValue(k: InsightKpi): string {
  if (k.key === "conversion") return `${k.value}%`;
  if (k.key === "commerce_revenue_mock") return `$${k.value}`;
  if (k.key === "email_ready") return k.value ? "Yes" : "No";
  return String(k.value);
}

/**
 * Delta direction → status token. GO green is reserved for primary actions, so a
 * movement caption uses the muted status-ok / status-warn / status-neutral tokens,
 * never --studio-go / --primary.
 */
function deltaToneStyle(d: InsightKpiDelta): { color: string } {
  if (d.delta > 0) return { color: "var(--studio-status-ok)" };
  if (d.delta < 0) return { color: "var(--studio-status-warn)" };
  return { color: "var(--studio-status-neutral)" };
}

/** Confirmed = stored events; everything else is inferred/computed and labeled as such. */
function evidenceBasis(k: InsightKpi): "Confirmed" | "Inferred" {
  return k.evidenceClass === "confirmed" ? "Confirmed" : "Inferred";
}

export function InsightsKpiGrid({
  kpis,
  deltas,
  days,
  view,
  compare,
  evidence,
  drillKey,
  campaignId,
}: {
  kpis: InsightKpi[];
  deltas: InsightKpiDelta[];
  days: number;
  view: InsightsView;
  compare: boolean;
  evidence: string;
  drillKey: string | null;
  campaignId: string | null;
}) {
  const deltaMap = new Map(deltas.map((d) => [d.key, d]));
  const commerce = kpis.filter((k) => k.key.startsWith("commerce_"));
  const rest = kpis.filter((k) => !k.key.startsWith("commerce_"));

  function card(k: InsightKpi, accent?: boolean) {
    const d = deltaMap.get(k.key);
    const active = drillKey === k.key;
    const drillHref = buildInsightsHref({
      days,
      view,
      compare,
      evidence,
      drill: active ? undefined : k.key,
      campaignId: campaignId ?? undefined,
    });

    return (
      <div
        key={k.key}
        className={cn(
          "rounded-xl border p-4",
          accent
            ? "border-[oklch(0.66_0.13_195_/_0.25)] bg-gradient-to-br from-card/80 to-black/30"
            : "border-border/60 bg-card/40",
          active && "ring-1 ring-[oklch(0.66_0.13_195_/_0.6)]"
        )}
        data-testid={`insights-kpi-${k.key}`}
      >
        <p className="text-xs text-muted-foreground">{k.label}</p>
        <p
          className="text-2xl font-semibold tabular-nums text-white"
          data-testid={`insights-kpi-value-${k.key}`}
          data-kpi-value={String(k.value)}
          data-evidence-class={k.evidenceClass}
          data-kpi-source={k.source}
        >
          {formatValue(k)}
        </p>
        {d ? (
          <p
            className="mt-1 text-[10px]"
            style={deltaToneStyle(d)}
            data-testid={`insights-delta-${k.key}`}
          >
            {formatDeltaCaption(d)} · derived
          </p>
        ) : null}
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide",
              k.evidenceClass === "confirmed"
                ? "border-[oklch(0.78_0.12_155_/_0.5)] text-[oklch(0.82_0.12_155)]"
                : "border-white/15 text-white/55"
            )}
            data-testid={`insights-basis-${k.key}`}
          >
            {evidenceBasis(k)}
          </span>
          <span
            className={
              evidenceClassTone(k.evidenceClass) === "muted" ? "text-white/40" : "text-white/55"
            }
            style={{ fontSize: "10px" }}
          >
            {formatEvidenceCaption({
              evidenceClass: k.evidenceClass,
              source: k.source,
              seeded: k.seeded,
              mockPath: k.key.startsWith("commerce_"),
            })}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
          <Link
            href={drillHref}
            className="text-[oklch(0.82_0.11_195)] hover:underline"
            data-testid={`insights-drill-${k.key}`}
          >
            {active ? "Clear drill-down" : "Drill down"}
          </Link>
          {k.drillThroughHref ? (
            <Link
              href={k.drillThroughHref}
              className="text-white/60 hover:text-white hover:underline"
              data-testid={`insights-through-${k.key}`}
            >
              Open source
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {commerce.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-[oklch(0.88_0.09_195)]">
            Commerce &amp; loyalty signals
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {commerce.map((k) => card(k, true))}
          </div>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {rest.map((k) => card(k))}
      </div>
    </div>
  );
}
