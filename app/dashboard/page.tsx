import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, AlertTriangle, Radio, CheckCircle2 } from "lucide-react";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { StudioHubSections } from "@/components/studio/hub-sections";
import { OutcomeRecipes } from "@/components/studio/outcome-recipes";
import { HomeCardCommandCenter } from "@/components/studio/home-card-command-center";
import { StudioEntryAssembly } from "@/components/studio/studio-entry-assembly";
import { TruthfulEmptyStatePanel } from "@/components/studio/truthful-empty-state";
import { requireBusiness } from "@/lib/auth";
import { getDashboardStats } from "@/lib/services/devices";
import { prisma } from "@/lib/db";
import { computeTapPointHealth, summarizeFleetHealth } from "@/lib/fusion/devices/health";
import { listTapPointsForBusiness } from "@/lib/fusion/devices/tap-point-bridge";
import { humanizeError } from "@/lib/fusion/errors/humanize";
import { firstTapSetupProgress } from "@/lib/fusion/readiness/workspace-status";
import { listDecisionQueueItems } from "@/lib/fusion/studio/operator-alerts";
import { CREATE_RECIPES } from "@/lib/fusion/studio/create-recipes";
import { loadCardRelationshipContext } from "@/lib/fusion/studio/load-card-relationship";
import { getEmptyState } from "@/lib/fusion/studio/empty-states";
import type { AssemblyCardSnapshot } from "@/lib/fusion/studio-assembly";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { business } = await requireBusiness();
  const stats = await getDashboardStats(business.id);

  const [card, recentCampaigns, brandKit, campaignCount, decisionItems, devices, tapPoints] =
    await Promise.all([
      loadCardRelationshipContext(business.id, business.name, { logoUrl: business.logoUrl }),
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
  const startRecipes = CREATE_RECIPES.filter((r) => r.group === "Start");

  const assemblyCard: AssemblyCardSnapshot = {
    cardName: card.cardName,
    publicStateLabel: card.publicStateLabel,
    tapPointHealthy: card.tapPointHealthy,
    tapPointCount: card.tapPointCount,
    spotlightTitle: card.spotlightTitle,
    tapSaveEnabled: card.tapSaveEnabled,
    nextActionLabel: card.nextAction.label,
    proofSummary: `${card.proof.taps} taps · ${card.proof.saves} saves · ${card.proof.contacts} contacts`,
    safeForPublicAnalytics: true,
  };

  return (
    <div className="zone-home space-y-10 p-5 lg:p-8" data-testid="studio-home-outcomes">
      <Suspense fallback={null}>
        <StudioEntryAssembly card={assemblyCard} />
      </Suspense>
      <header className="space-y-1">
        <p className="zone-label-home text-[11px] font-semibold uppercase tracking-[0.2em]">
          Home · {business.name}
        </p>
      </header>

      <HomeCardCommandCenter card={card} />

      <OutcomeRecipes recipes={startRecipes} compact />

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
              className="mt-3 inline-flex min-h-11 items-center gap-1 text-xs text-primary hover:underline"
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
              className="mt-3 inline-flex min-h-11 items-center gap-1 text-xs text-primary hover:underline"
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
                <li
                  key={item.id}
                  className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
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
                      {human.action ? ` ${human.action}` : ""}
                    </p>
                    <p
                      className="mt-1 font-mono text-[10px] text-white/35"
                      data-testid="decision-item-meta"
                    >
                      {item.aggregateType}:{item.aggregateId}
                      {" · "}
                      <time dateTime={item.occurredAt}>
                        {new Date(item.occurredAt).toLocaleString()}
                      </time>
                    </p>
                    {item.detail && item.detail !== human.title ? (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-[11px] text-white/40 hover:text-white/60">
                          View details
                        </summary>
                        <p className="mt-1 font-mono text-[10px] text-white/35">
                          {item.detail}
                        </p>
                      </details>
                    ) : null}
                  </div>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-11 shrink-0 items-center gap-1 text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    {item.nextActionLabel ?? "Open related work"}{" "}
                    <ArrowRight className="h-3 w-3" />
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

      {setup.incomplete ? (
        <section id="readiness" className="scroll-mt-24 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/35">
            Setup progress
          </h2>
          <OnboardingChecklist steps={onboardingSteps} businessName={business.name} />
        </section>
      ) : null}

      <section id="upcoming" className="scroll-mt-24 space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/35">
            Recent campaigns
          </h2>
          <Link href="/dashboard/campaigns" className="text-xs text-primary hover:underline">
            All campaigns
          </Link>
        </div>
        {recentCampaigns.length === 0 ? (
          <TruthfulEmptyStatePanel state={getEmptyState("campaigns")} />
        ) : (
          <ul className="divide-y divide-white/6 overflow-hidden rounded-xl border border-white/8">
            {recentCampaigns.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/dashboard/campaigns/${c.id}`}
                  className="flex min-h-11 items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.03]"
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
            ))}
          </ul>
        )}
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
        subtitle="Secondary Home surfaces — Autopilot remains contextual on the Card."
        headingLevel={2}
        collapsible
        defaultOpen={false}
      />
    </div>
  );
}
