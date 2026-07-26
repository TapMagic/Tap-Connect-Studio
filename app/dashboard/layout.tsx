import { DashboardNav, MobileDashboardNav } from "@/components/dashboard/nav";
import { DashboardChrome } from "@/components/dashboard/dashboard-chrome";
import { StudioTopBar } from "@/components/studio/studio-top-bar";
import { DevModeBanner } from "@/components/dev-mode-banner";
import { requireBusiness } from "@/lib/auth";
import { TAP_CONNECT_LOGO } from "@/lib/brand/assets";
import { prisma } from "@/lib/db";
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
  const { business } = await requireBusiness();
  const featureCtx = await loadFeatureContext();

  const [brandKit, campaignCount, devices, stats, decisionItems] = await Promise.all([
    prisma.brandKit.findUnique({ where: { businessId: business.id } }).catch(() => null),
    prisma.campaign
      .count({
        where: { businessId: business.id, status: { notIn: ["ARCHIVED", "CLOSED"] } },
      })
      .catch(() => 0),
    prisma.deviceSlot
      .findMany({
        where: { businessId: business.id },
        take: 1,
        select: { id: true },
      })
      .catch(() => [] as { id: string }[]),
    getDashboardStats(business.id).catch(() => ({
      liveCampaigns: 0,
      activeDevices: 0,
      totalTaps: 0,
      totalLeads: 0,
    })),
    listDecisionQueueItems({ businessId: business.id, limit: 50 }).catch(() => []),
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
  });

  return (
    <DashboardChrome
      businessName={business.name}
      banner={<DevModeBanner />}
      mobileNav={<MobileDashboardNav businessName={business.name} featureCtx={featureCtx} />}
      topBar={
        <StudioTopBar
          businessName={business.name}
          readinessLabel={workspaceStatus.label}
          readinessTone={workspaceStatus.tone}
          readinessReasons={workspaceStatus.reasons}
          readinessHref={workspaceStatus.href}
          alertCount={workspaceStatus.alertCount}
        />
      }
      nav={<DashboardNav businessName={business.name} featureCtx={featureCtx} />}
    >
      {children}
    </DashboardChrome>
  );
}
