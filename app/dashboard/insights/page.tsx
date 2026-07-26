import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { fetchInsightsSnapshot } from "@/lib/fusion/insights/metrics";
import { fetchBusinessFailureRecovery } from "@/lib/fusion/insights/failure-recovery";
import {
  evidenceClassTone,
  formatEvidenceCaption,
} from "@/lib/fusion/insights/evidence-display";
import { INSIGHTS_VIEW_LABELS } from "@/lib/fusion/insights/views";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { StudioHubSections } from "@/components/studio/hub-sections";
import { InsightsControls } from "@/components/fusion/insights/insights-controls";
import { InsightsKpiGrid } from "@/components/fusion/insights/insights-kpi-grid";
import {
  InsightsDrillTable,
  InsightsProvenancePanel,
} from "@/components/fusion/insights/insights-drill-table";
import { humanizeError } from "@/lib/fusion/errors/humanize";

export const dynamic = "force-dynamic";

export default async function InsightsHubPage({
  searchParams,
}: {
  searchParams: Promise<{
    days?: string;
    view?: string;
    compare?: string;
    evidence?: string;
    drill?: string;
    campaignId?: string;
  }>;
}) {
  const { business } = await requireBusiness();
  const params = await searchParams;

  const snapshot = await fetchInsightsSnapshot(business.id, {
    rangeDays: params.days,
    view: params.view,
    compare: params.compare,
    evidence: params.evidence,
    drill: params.drill,
    campaignId: params.campaignId,
  });

  let failureRecovery: Awaited<ReturnType<typeof fetchBusinessFailureRecovery>> | null =
    null;
  try {
    failureRecovery = await fetchBusinessFailureRecovery(business.id);
  } catch {
    failureRecovery = null;
  }

  const kpis = snapshot.kpis;
  const empty = snapshot.empty && !snapshot.error;
  const showError = Boolean(snapshot.error);
  const insightsHuman = snapshot.error ? humanizeError(snapshot.error) : null;

  return (
    <div className="space-y-8 p-5 lg:p-8" data-testid="insights-hub">
      <header className="space-y-2 border-b border-white/8 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          Insights
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">What happened</h1>
        <p className="max-w-2xl text-sm text-white/55">
          Authoritative KPIs with provenance — what changed, why it matters, and what to do next.
        </p>
      </header>

      <InsightsControls
        days={snapshot.rangeDays}
        view={snapshot.view}
        compare={snapshot.compare}
        evidence={snapshot.evidenceFilter}
        drill={snapshot.drillKey}
        campaignId={snapshot.campaignId}
      />

      <div
        className="flex flex-wrap gap-3 text-xs text-muted-foreground"
        data-testid="insights-freshness"
      >
        <span>
          View: <span className="text-white/80">{INSIGHTS_VIEW_LABELS[snapshot.view]}</span>
        </span>
        <span>
          Range {snapshot.from.slice(0, 10)} → {snapshot.to.slice(0, 10)}
        </span>
        {snapshot.compare && snapshot.previousFrom ? (
          <span>
            Prior {snapshot.previousFrom.slice(0, 10)} →{" "}
            {snapshot.previousTo?.slice(0, 10) ?? "—"}
          </span>
        ) : null}
        <span>
          Freshness:{" "}
          <span className="text-primary">{snapshot.freshness.label}</span> (fetched{" "}
          {new Date(snapshot.fetchedAt).toLocaleString()})
        </span>
      </div>

      {showError && insightsHuman ? (
        <Card
          className="border-amber-500/40 bg-amber-950/20"
          data-testid="insights-error"
          role="alert"
        >
          <CardHeader>
            <CardTitle className="text-amber-100">{insightsHuman.title}</CardTitle>
            <CardDescription className="text-amber-100/70">
              {insightsHuman.action ??
                "Retry or check local database health — production is never used from this path."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <details>
              <summary className="cursor-pointer text-xs text-amber-100/70">View details</summary>
              <pre className="mt-2 max-h-40 overflow-auto rounded-md border border-white/10 bg-black/40 p-2 font-mono text-[10px] text-white/55">
                {insightsHuman.details ?? snapshot.error}
              </pre>
            </details>
          </CardContent>
        </Card>
      ) : null}

      {empty && !showError ? (
        <Card className="border-dashed border-border/60" data-testid="insights-empty">
          <CardHeader>
            <CardTitle>No confirmed activity yet</CardTitle>
            <CardDescription>
              Insights stay empty until TapEvents, Leads, Contacts, or TapCommerce mock orders
              appear. Commerce wiring uses modeled evidence for mock checkout — never shown as live
              Stripe fact.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/dashboard/tap-points"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Go to Tap Points
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {!empty && !showError && kpis.length === 0 ? (
        <Card className="border-dashed border-border/60" data-testid="insights-filter-empty">
          <CardHeader>
            <CardTitle>No KPIs match filters</CardTitle>
            <CardDescription>
              Try another view or evidence class. Data may exist outside this filter.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {!showError && kpis.length > 0 ? (
        <InsightsKpiGrid
          kpis={kpis}
          deltas={snapshot.deltas}
          days={snapshot.rangeDays}
          view={snapshot.view}
          compare={snapshot.compare}
          evidence={snapshot.evidenceFilter}
          drillKey={snapshot.drillKey}
          campaignId={snapshot.campaignId}
        />
      ) : null}

      {snapshot.drillKey ? (
        <InsightsDrillTable rows={snapshot.drillRows} kpiKey={snapshot.drillKey} />
      ) : null}

      {(snapshot.view === "tapproof" || snapshot.provenance.length > 0) && !showError ? (
        <InsightsProvenancePanel records={snapshot.provenance} />
      ) : null}

      <Card className="border-border/60">
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <CardTitle>Failure &amp; recovery</CardTitle>
          </div>
          <CardDescription>
            Outbox dead letters and blocked journey runs — memory / isolated DB sources only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!failureRecovery || failureRecovery.empty ? (
            <p className="text-sm text-muted-foreground" data-testid="insights-recovery-empty">
              No failures recorded in scope. Dead letters appear after outbox drain errors; blocked
              runs appear after TapFlow dry-runs or live taps with Guardian gates.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {failureRecovery.metrics.map((m) => (
                <div key={m.key} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="text-xl font-semibold tabular-nums">{m.value}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    <span
                      className={
                        evidenceClassTone(m.evidenceClass) === "primary" ? "text-primary" : ""
                      }
                    >
                      {formatEvidenceCaption({
                        evidenceClass: m.evidenceClass,
                        source: m.source,
                        hint: m.hint,
                      })}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <CardTitle>Evidence legend</CardTitle>
          </div>
          <CardDescription>
            Confirmed = stored events · Derived = computed from confirmed · Modeled = never shown as
            fact · Incomplete = missing data
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Export includes KPI rows, optional drill-down sheet, and TapProof provenance columns.
        </CardContent>
      </Card>

      <StudioHubSections
        destinationId="insights"
        title="Insights"
        subtitle="Analytics tool catalog"
        collapsible
        defaultOpen={false}
      />
    </div>
  );
}
