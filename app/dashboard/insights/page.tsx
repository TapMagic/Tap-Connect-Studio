import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { fetchInsightsSnapshot } from "@/lib/fusion/insights/metrics";
import { fetchBusinessFailureRecovery } from "@/lib/fusion/insights/failure-recovery";
import { parseInsightsRangeDays } from "@/lib/fusion/insights/range";
import {
  evidenceClassTone,
  formatEvidenceCaption,
} from "@/lib/fusion/insights/evidence-display";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { StudioHubSections } from "@/components/studio/hub-sections";

export const dynamic = "force-dynamic";

const RANGE_OPTIONS = [7, 14, 30, 90] as const;

export default async function InsightsHubPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { business } = await requireBusiness();
  const params = await searchParams;
  const days = parseInsightsRangeDays(params.days);

  let snapshot: Awaited<ReturnType<typeof fetchInsightsSnapshot>> | null = null;
  let failureRecovery: Awaited<ReturnType<typeof fetchBusinessFailureRecovery>> | null = null;
  try {
    snapshot = await fetchInsightsSnapshot(business.id, days);
    failureRecovery = await fetchBusinessFailureRecovery(business.id);
  } catch {
    snapshot = null;
    failureRecovery = null;
  }

  const kpis = snapshot?.kpis ?? [];
  const empty = snapshot?.empty ?? true;

  return (
    <div className="space-y-8 p-5 lg:p-8">
      <StudioHubSections
        destinationId="insights"
        title="Insights"
        subtitle="Legacy analytics, TapProof evidence, loyalty/commerce signals, and provider health — V1 Analytics remains linked."
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white">Live snapshot</h2>
          <p className="mt-1 text-sm text-white/50">
            What happened, why it matters, evidence class, next action.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/analytics" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Full analytics
          </Link>
          <a
            href={`/api/insights/export?days=${days}&format=csv`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Export CSV
          </a>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {RANGE_OPTIONS.map((d) => (
          <Link
            key={d}
            href={`/dashboard/insights?days=${d}`}
            className={buttonVariants({
              variant: d === days ? "default" : "outline",
              size: "sm",
            })}
          >
            {d}d
          </Link>
        ))}
      </div>

      {empty || !snapshot ? (
        <Card className="border-dashed border-border/60">
          <CardHeader>
            <CardTitle>No confirmed activity yet</CardTitle>
            <CardDescription>
              Insights stay empty until TapEvents, Leads, or Contacts appear. Nothing here is
              seeded — all KPIs are Prisma-derived when data exists.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {kpis.map((k) => (
            <div key={k.key} className="rounded-xl border border-border/60 bg-card/40 p-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-2xl font-semibold tabular-nums">
                {k.key === "conversion" ? `${k.value}%` : k.value}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                <span
                  className={
                    evidenceClassTone(k.evidenceClass) === "primary"
                      ? "text-primary"
                      : evidenceClassTone(k.evidenceClass) === "muted"
                        ? "text-muted-foreground"
                        : ""
                  }
                >
                  {formatEvidenceCaption({
                    evidenceClass: k.evidenceClass,
                    source: k.source,
                    seeded: k.seeded,
                  })}
                </span>
              </p>
            </div>
          ))}
        </div>
      )}

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
            <p className="text-sm text-muted-foreground">
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
                    {formatEvidenceCaption({
                      evidenceClass: m.evidenceClass,
                      source: m.source,
                      hint: m.hint,
                    })}
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
          Range {snapshot?.from.slice(0, 10) ?? "—"} → {snapshot?.to.slice(0, 10) ?? "—"} · fetched{" "}
          {snapshot ? new Date(snapshot.fetchedAt).toLocaleString() : "unavailable"}
        </CardContent>
      </Card>
    </div>
  );
}
