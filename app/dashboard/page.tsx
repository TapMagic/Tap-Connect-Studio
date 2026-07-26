import Link from "next/link";
import {
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Radio,
  Sparkles,
} from "lucide-react";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { StudioHubSections } from "@/components/studio/hub-sections";
import { OutcomeRecipes } from "@/components/studio/outcome-recipes";
import { requireBusiness } from "@/lib/auth";
import { getDashboardStats } from "@/lib/services/devices";
import { prisma } from "@/lib/db";
import { computeTapPointHealth, summarizeFleetHealth } from "@/lib/fusion/devices/health";
import { listTapPointsForBusiness } from "@/lib/fusion/devices/tap-point-bridge";
import { humanizeError } from "@/lib/fusion/errors/humanize";
import { firstTapSetupProgress } from "@/lib/fusion/readiness/workspace-status";
import { listDecisionQueueItems } from "@/lib/fusion/studio/operator-alerts";
import { CREATE_RECIPES } from "@/lib/fusion/studio/create-recipes";

export const dynamic = "force-dynamic";

type Recommendation = {
  id: string;
  title: string;
  detail: string;
  href: string;
  why: string;
};

export default async function DashboardPage() {
  const { business } = await requireBusiness();
  const stats = await getDashboardStats(business.id);

  const [
    recentCampaigns,
    brandKit,
    campaignCount,
    decisionItems,
    devices,
    tapPoints,
  ] = await Promise.all([
    prisma.campaign.findMany({
      where: {
        businessId: business.id,
        status: { notIn: ["ARCHIVED", "CLOSED"] },
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: { id: true, title: true, status: true, updatedAt: true },
    }),
    prisma.brandKit.findUnique({ where: { businessId: business.id } }),
    prisma.campaign.count({
      where: { businessId: business.id, status: { notIn: ["ARCHIVED", "CLOSED"] } },
    }),
    listDecisionQueueItems({ businessId: business.id, limit: 8 }).catch(() => []),
    prisma.deviceSlot
      .findMany({
        where: { businessId: business.id },
        take: 40,
        select: { id: true, status: true, totalTapCount: true, deviceCode: true },
      })
      .catch(() => []),
    listTapPointsForBusiness(business.id).catch(() => []),
  ]);

  const deviceById = new Map(devices.map((d) => [d.id, d]));
  const unbridged = devices.filter((d) => !tapPoints.some((tp) => tp.deviceSlotId === d.id));
  const fleet = summarizeFleetHealth([
    ...tapPoints.map((tp) => {
      const device = tp.deviceSlotId ? deviceById.get(tp.deviceSlotId) : undefined;
      return computeTapPointHealth({
        status: tp.status,
        hasAddress: Boolean(tp.address?.code),
        totalTapCount: device?.totalTapCount,
        deviceStatus: device?.status,
        bridged: true,
      });
    }),
    ...unbridged.map((d) =>
      computeTapPointHealth({
        status: d.status,
        hasAddress: Boolean(d.deviceCode),
        totalTapCount: d.totalTapCount,
        deviceStatus: d.status,
        bridged: false,
      })
    ),
  ]);

  const setup = firstTapSetupProgress({
    hasBrand: Boolean(business.logoUrl || brandKit),
    hasCampaign: campaignCount > 0,
    hasDevice: devices.length > 0,
    hasLiveAssignment: (stats.liveCampaigns ?? 0) > 0,
  });
  const onboardingSteps = setup.steps;

  const drafts = recentCampaigns.filter((c) => c.status === "DRAFT");
  const recommendations: Recommendation[] = [];

  if (setup.incomplete) {
    const next = onboardingSteps.find((s) => !s.done);
    if (next) {
      recommendations.push({
        id: "setup-next",
        title: next.label,
        detail: "Finish first-tap setup so visitors can reach a live experience.",
        href: next.href,
        why: "Setup progress — grounded in brand, campaign, device, and live assignment checks.",
      });
    }
  }
  if (decisionItems.length > 0) {
    recommendations.push({
      id: "fix-alert",
      title: "Resolve delivery or publish issues",
      detail: `${decisionItems.length} item(s) need recovery.`,
      href: decisionItems[0]!.href,
      why: "From the decision queue (outbox / publish / assign alerts).",
    });
  }
  if (fleet.critical > 0 || fleet.warning > 0) {
    recommendations.push({
      id: "fleet",
      title: "Check Tap Point health",
      detail: `${fleet.critical} critical · ${fleet.warning} warning`,
      href: "/dashboard/tap-points",
      why: "Fleet health rollup from device and Tap Point status.",
    });
  }
  if (drafts.length > 0) {
    recommendations.push({
      id: "resume-draft",
      title: `Continue “${drafts[0]!.title}”`,
      detail: "Unfinished draft campaign",
      href: `/dashboard/campaigns/${drafts[0]!.id}`,
      why: "Recent campaign with DRAFT status.",
    });
  }
  if (recommendations.length === 0) {
    recommendations.push({
      id: "review-insights",
      title: "Review results",
      detail: "See what visitors did after tapping.",
      href: "/dashboard/insights",
      why: "No blockers — Insights is the best next operate action.",
    });
  }

  const startRecipes = CREATE_RECIPES.filter((r) => r.group === "Start");

  return (
    <div className="space-y-10 p-5 lg:p-8" data-testid="studio-home-outcomes">
      <header className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-transparent to-transparent px-6 py-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          Home
        </p>
        <h1 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {business.name}
        </h1>
        <p className="mt-3 max-w-xl text-sm text-white/55">
          Start with an outcome, resume recent work, clear what needs attention — then go deeper
          only when you need to.
        </p>
      </header>

      <OutcomeRecipes recipes={startRecipes} compact />

      <section
        id="recommended"
        className="scroll-mt-24 space-y-3"
        data-testid="home-recommendations"
        aria-labelledby="recommended-heading"
      >
        <h2
          id="recommended-heading"
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/35"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
          Recommended next
        </h2>
        <ul className="grid gap-2 lg:grid-cols-2">
          {recommendations.slice(0, 4).map((r) => (
            <li key={r.id}>
              <Link
                href={r.href}
                data-testid={`home-rec-${r.id}`}
                className="flex h-full flex-col rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <span className="text-sm font-medium text-white/90">{r.title}</span>
                <span className="mt-1 text-xs text-white/50">{r.detail}</span>
                <span className="mt-2 text-[11px] text-white/35">Why: {r.why}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section id="decision-queue" className="scroll-mt-24 space-y-3" data-testid="decision-queue">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/35">
          Needs attention
        </h2>
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-amber-200">
              <AlertTriangle className="h-4 w-4" aria-hidden />
              <p className="text-sm font-medium">Problems</p>
            </div>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-white">
              {decisionItems.length}
            </p>
            <p className="mt-1 text-xs text-white/45">Delivery and publish alerts</p>
            <Link
              href="/dashboard/settings#outbox"
              className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Open recovery <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-primary">
              <Radio className="h-4 w-4" aria-hidden />
              <p className="text-sm font-medium">Tap Point health</p>
            </div>
            <p className="mt-3 text-sm text-white/80">
              {fleet.healthy} healthy · {fleet.warning} warn · {fleet.critical} critical
            </p>
            <Link
              href="/dashboard/tap-points"
              className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Fleet workspace <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-emerald-300">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              <p className="text-sm font-medium">Working now</p>
            </div>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-white">
              {stats.activeDevices}
            </p>
            <p className="mt-1 text-xs text-white/45">
              Active devices · {stats.liveCampaigns} live campaigns
            </p>
          </div>
        </div>

        {decisionItems.length > 0 ? (
          <ul
            className="divide-y divide-white/6 overflow-hidden rounded-xl border border-amber-500/25 bg-amber-500/[0.04]"
            data-testid="decision-queue-items"
            aria-label="Failure remediation list"
          >
            {decisionItems.map((item) => {
              const human = humanizeError(item.detail, item.title);
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="flex flex-col gap-1 px-4 py-3 hover:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between"
                    data-testid={`decision-item-${item.kind}`}
                    data-decision-id={item.id}
                    data-occurrence-count={item.occurrenceCount ?? 1}
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-white/90">
                        {item.title}
                        {(item.occurrenceCount ?? 1) > 1 ? (
                          <span className="ml-2 rounded-full border border-amber-500/40 px-1.5 py-0.5 text-[10px] text-amber-100">
                            ×{item.occurrenceCount}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-xs text-white/45 line-clamp-3">
                        {human.title}
                      </p>
                      <details className="mt-1">
                        <summary className="cursor-pointer text-[11px] text-white/40 hover:text-white/60">
                          View details
                        </summary>
                        <p
                          className="mt-1 font-mono text-[10px] text-white/35"
                          data-testid="decision-item-meta"
                        >
                          {item.aggregateType}:{item.aggregateId}
                          {" · "}
                          <time dateTime={item.occurredAt}>
                            {new Date(item.occurredAt).toLocaleString()}
                          </time>
                          {item.detail !== human.title ? (
                            <>
                              <br />
                              {item.detail}
                            </>
                          ) : null}
                        </p>
                      </details>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs text-primary">
                      {item.nextActionLabel ?? "Open related work"}{" "}
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-white/40" data-testid="decision-queue-empty">
            Nothing blocked — failures appear here with a recovery path.
          </p>
        )}
      </section>

      <section id="readiness" className="scroll-mt-24 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/35">
          Setup progress
        </h2>
        <OnboardingChecklist steps={onboardingSteps} businessName={business.name} />
      </section>

      <section id="upcoming" className="scroll-mt-24 space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/35">
            Recent work
          </h2>
          <Link href="/dashboard/campaigns" className="text-xs text-primary hover:underline">
            All campaigns
          </Link>
        </div>
        <ul className="divide-y divide-white/6 overflow-hidden rounded-xl border border-white/8">
          {recentCampaigns.length === 0 ? (
            <li className="px-4 py-6 text-sm text-white/45">
              No campaigns yet — use Create a Card or Launch an offer above.
            </li>
          ) : (
            recentCampaigns.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/dashboard/campaigns/${c.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.03]"
                >
                  <span className="min-w-0">
                    <span className="block text-sm text-white/90">{c.title}</span>
                    <span className="text-[11px] text-white/35">
                      Updated {new Date(c.updatedAt).toLocaleString()}
                    </span>
                  </span>
                  <span className="font-mono text-[10px] uppercase text-primary">{c.status}</span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>

      <OutcomeRecipes
        title="More outcomes"
        subtitle="Grow audience, loyalty, journeys, and operations."
        recipes={CREATE_RECIPES.filter((r) => r.group !== "Start")}
        compact
      />

      <StudioHubSections
        destinationId="home"
        title="Home destinations"
        subtitle="Secondary Home surfaces — Autopilot remains contextual in the builder."
        headingLevel={2}
        collapsible
        defaultOpen={false}
      />
    </div>
  );
}
