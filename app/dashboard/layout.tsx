import { DashboardNav, MobileDashboardNav } from "@/components/dashboard/nav";
import { DashboardChrome } from "@/components/dashboard/dashboard-chrome";
import { StudioTopBar } from "@/components/studio/studio-top-bar";
import { DevModeBanner } from "@/components/dev-mode-banner";
import { requireBusiness } from "@/lib/auth";
import { TAP_CONNECT_LOGO } from "@/lib/brand/assets";
import { prisma } from "@/lib/db";
import { computeTapPointHealth, summarizeFleetHealth } from "@/lib/fusion/devices/health";
import { listTapPointsForBusiness } from "@/lib/fusion/devices/tap-point-bridge";
import { loadFeatureContext } from "@/lib/fusion/features/server";
import {
  computeWorkspaceStatus,
  firstTapSetupProgress,
} from "@/lib/fusion/readiness/workspace-status";
import {
  countOperatorFailures,
  countOutboxOnlyFailures,
  listDecisionQueueItems,
} from "@/lib/fusion/studio/operator-alerts";
import { getDashboardStats } from "@/lib/services/devices";
import "@/app/t/tap.css";
import type { Metadata } from "next";
import { buildWorkspaceMenuModel } from "@/lib/workspace/context";
import Link from "next/link";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const { business } = await requireBusiness();
    const logo = business.logoUrl;
    return {
      title: `${business.name} · Tap Connect Studio`,
      icons: logo
        ? { icon: [{ url: logo }], apple: [{ url: logo }] }
        : {
            icon: [
              { url: "/favicon.ico", sizes: "any" },
              { url: TAP_CONNECT_LOGO, type: "image/png" },
            ],
            apple: "/apple-touch-icon.png",
          },
    };
  } catch {
    return { title: "Tap Connect Studio" };
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { business, user } = await requireBusiness();
  const featureCtx = await loadFeatureContext();

  const [brandKit, campaignCount, devices, stats, decisionItems, tapPoints, workspaceMenu] =
    await Promise.all([
      prisma.brandKit.findUnique({ where: { businessId: business.id } }).catch(() => null),
      prisma.campaign
        .count({
          where: { businessId: business.id, status: { notIn: ["ARCHIVED", "CLOSED"] } },
        })
        .catch(() => 0),
      prisma.deviceSlot
        .findMany({
          where: { businessId: business.id },
          take: 40,
          select: { id: true, status: true, totalTapCount: true, deviceCode: true },
        })
        .catch(
          () =>
            [] as {
              id: string;
              status: string;
              totalTapCount: number;
              deviceCode: string | null;
            }[]
        ),
      getDashboardStats(business.id).catch(() => ({
        liveCampaigns: 0,
        activeDevices: 0,
        totalTaps: 0,
        totalLeads: 0,
      })),
      listDecisionQueueItems({ businessId: business.id, limit: 50 }).catch(() => []),
      listTapPointsForBusiness(business.id).catch(() => []),
      buildWorkspaceMenuModel(user, business),
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

  const workspaceStatus = computeWorkspaceStatus({
    setupIncomplete: setup.incomplete,
    setupTotal: setup.total,
    outboxFailed: countOutboxOnlyFailures(decisionItems),
    operatorFailures: countOperatorFailures(decisionItems),
    criticalTapPoints: fleet.critical,
  });

  return (
    <DashboardChrome
      businessName={business.name}
      banner={
        <>
          <DevModeBanner />
          <div
            className="flex min-h-10 items-center justify-between gap-3 border-b border-emerald-300/15 bg-emerald-300/[0.06] px-4 py-2 text-xs text-white/70"
            data-testid="studio-context-banner"
          >
            <span className="truncate">
              <strong className="text-white">{workspaceMenu.currentWorkspaceName}</strong>
              {" · "}
              {workspaceMenu.mode.label}
            </span>
            <Link
              href={workspaceMenu.returnToControlRoom}
              className="shrink-0 font-medium text-emerald-300 hover:text-emerald-200"
            >
              Return to Control Room
            </Link>
          </div>
        </>
      }
      mobileNav={<MobileDashboardNav businessName={business.name} featureCtx={featureCtx} />}
      topBar={
        <StudioTopBar
          readinessLabel={workspaceStatus.label}
          readinessTone={workspaceStatus.tone}
          readinessReasons={workspaceStatus.reasons}
          readinessHref={workspaceStatus.href}
          alertCount={workspaceStatus.alertCount}
          workspaceMenu={workspaceMenu}
        />
      }
      nav={<DashboardNav businessName={business.name} featureCtx={featureCtx} />}
    >
      {children}
    </DashboardChrome>
  );
}
