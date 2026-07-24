import Link from "next/link";
import { ArrowRight, AlertTriangle, CheckCircle2, Radio } from "lucide-react";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { StudioHubSections } from "@/components/studio/hub-sections";
import { requireBusiness } from "@/lib/auth";
import { getDashboardStats } from "@/lib/services/devices";
import { prisma } from "@/lib/db";
import { listDeadLetters } from "@/lib/fusion/publication/events";
import { computeTapPointHealth, summarizeFleetHealth } from "@/lib/fusion/devices/health";
import { listTapPointsForBusiness } from "@/lib/fusion/devices/tap-point-bridge";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { business } = await requireBusiness();
  const stats = await getDashboardStats(business.id);

  const [
    recentCampaigns,
    brandKit,
    campaignCount,
    deadLetters,
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
      select: { id: true, title: true, status: true },
    }),
    prisma.brandKit.findUnique({ where: { businessId: business.id } }),
    prisma.campaign.count({
      where: { businessId: business.id, status: { notIn: ["ARCHIVED", "CLOSED"] } },
    }),
    listDeadLetters({ businessId: business.id, limit: 5 }).catch(() => []),
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

  const onboardingSteps = [
    {
      id: "brand",
      label: "Add logo & brand colors",
      href: "/dashboard/brand",
      done: Boolean(business.logoUrl || brandKit),
    },
    {
      id: "campaign",
      label: "Create your first campaign",
      href: "/dashboard/workbench",
      done: campaignCount > 0,
    },
    {
      id: "device",
      label: "Create a device slot",
      href: "/dashboard/devices",
      done: devices.length > 0,
    },
    {
      id: "assign",
      label: "Assign a live campaign",
      href: "/dashboard/devices",
      done: (stats.liveCampaigns ?? 0) > 0,
    },
  ];

  return (
    <div className="space-y-10 p-5 lg:p-8">
      <header className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-transparent to-transparent px-6 py-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          Home · Operations
        </p>
        <h1 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          What needs attention in {business.name}
        </h1>
        <p className="mt-3 max-w-xl text-sm text-white/55">
          Decision queue, readiness, Tap Point health, and campaign momentum — Fusion pillars live
          under Experiences, Audience, Insights, Assets, and Settings.
        </p>
      </header>

      <section id="decision-queue" className="scroll-mt-24 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/35">
          Decision queue
        </h2>
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-amber-200">
              <AlertTriangle className="h-4 w-4" aria-hidden />
              <p className="text-sm font-medium">Failures</p>
            </div>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-white">
              {deadLetters.length}
            </p>
            <p className="mt-1 text-xs text-white/45">Outbox dead letters (this business)</p>
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
              <p className="text-sm font-medium">Live coverage</p>
            </div>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-white">
              {stats.activeDevices}
            </p>
            <p className="mt-1 text-xs text-white/45">Active devices</p>
          </div>
        </div>
      </section>

      <section id="readiness" className="scroll-mt-24 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/35">
          Readiness
        </h2>
        <OnboardingChecklist steps={onboardingSteps} businessName={business.name} />
      </section>

      <section id="upcoming" className="scroll-mt-24 space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/35">
            Upcoming / recent campaigns
          </h2>
          <Link href="/dashboard/campaigns" className="text-xs text-primary hover:underline">
            All campaigns
          </Link>
        </div>
        <ul className="divide-y divide-white/6 overflow-hidden rounded-xl border border-white/8">
          {recentCampaigns.length === 0 ? (
            <li className="px-4 py-6 text-sm text-white/45">
              No campaigns yet — create one from Experiences or + Create.
            </li>
          ) : (
            recentCampaigns.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/dashboard/campaigns/${c.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.03]"
                >
                  <span className="text-sm text-white/90">{c.title}</span>
                  <span className="font-mono text-[10px] uppercase text-primary">{c.status}</span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>

      <StudioHubSections
        destinationId="home"
        title="Home destinations"
        subtitle="Secondary Home surfaces — Autopilot remains contextual in the builder."
        headingLevel={2}
      />
    </div>
  );
}
