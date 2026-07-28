import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight } from "lucide-react";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { StudioHubSections } from "@/components/studio/hub-sections";
import { OutcomeRecipes } from "@/components/studio/outcome-recipes";
import { HomeCardCommandCenter } from "@/components/studio/home-card-command-center";
import { StudioEntryAssembly } from "@/components/studio/studio-entry-assembly";
import { TruthfulEmptyStatePanel } from "@/components/studio/truthful-empty-state";
import {
  OperationsConsole,
  type OperationsGroup,
  type OperationsStatus,
} from "@/components/studio/operations-console";
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

  const fleetStatus: OperationsStatus =
    fleet.critical > 0
      ? "critical"
      : fleet.warning > 0
        ? "warn"
        : devices.length === 0
          ? "neutral"
          : "ok";

  const decisionRows = decisionItems.map((item) => {
    const human = humanizeError(item.detail, item.title);
    return {
      id: item.id,
      label: item.title,
      detail: `${human.title}${human.action ? ` ${human.action}` : ""}`,
      status:
        item.kind === "outbox_dead_letter" ? ("critical" as const) : ("warn" as const),
      count: (item.occurrenceCount ?? 1) > 1 ? item.occurrenceCount : undefined,
      meta: `${item.aggregateType}:${item.aggregateId} · ${new Date(
        item.occurredAt
      ).toLocaleString()}`,
      action: { label: item.nextActionLabel ?? "Open related work", href: item.href },
      testId: `decision-item-${item.kind}`,
    };
  });

  const operationsGroups: OperationsGroup[] = [
    {
      id: "decisions",
      title: "Unresolved decisions",
      description: "Delivery and publish failures with a recovery path.",
      testId: "decision-queue-items",
      emptyLabel: "Nothing blocked — failures appear here with a recovery path.",
      rows: decisionRows,
    },
    {
      id: "fleet",
      title: "Tap Point health",
      description: "Routing readiness of the entry points into this Card.",
      rows: [
        {
          id: "fleet-summary",
          label:
            devices.length === 0
              ? "No Tap Points connected"
              : `${fleet.healthy} healthy · ${fleet.warning} warn · ${fleet.critical} critical`,
          detail:
            devices.length === 0
              ? "Connect a device or NFC slot so taps reach your Card."
              : "Fleet routing status across connected entry points.",
          status: fleetStatus,
          action: { label: "Fleet workspace", href: "/dashboard/tap-points" },
        },
        {
          id: "working-now",
          label: `${stats.activeDevices} active · ${stats.liveCampaigns} live campaigns`,
          detail: "Currently running and reachable by customers.",
          status: stats.activeDevices > 0 ? ("ok" as const) : ("neutral" as const),
        },
      ],
    },
  ];

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
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40">
            Needs attention
          </h2>
          {decisionItems.length > 0 ? (
            <Link
              href="/dashboard/settings#outbox"
              className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              Open recovery <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          ) : null}
        </div>
        <OperationsConsole
          groups={operationsGroups}
          testId="home-operations-console"
        />
        {decisionItems.length === 0 ? (
          <p className="text-xs text-white/40" data-testid="decision-queue-empty">
            Nothing blocked — failures appear here with a recovery path.
          </p>
        ) : null}
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
                  <span className="font-mono text-[10px] uppercase text-white/50">{c.status}</span>
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
