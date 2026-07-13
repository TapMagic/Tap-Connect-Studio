import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Layers3,
  Nfc,
  Palette,
  PenTool,
  ScanLine,
  Users,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { OverviewLists } from "@/components/dashboard/overview-lists";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { requireBusiness } from "@/lib/auth";
import { getDashboardStats } from "@/lib/services/devices";
import { prisma } from "@/lib/db";
import { formatRelativeDate } from "@/lib/utils/app";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { business } = await requireBusiness();
  const stats = await getDashboardStats(business.id);

  const [
    recentCampaigns,
    recentDevices,
    statusGroups,
    brandKit,
    liveAssigned,
    totalTaps,
    campaignCount,
  ] = await Promise.all([
    prisma.campaign.findMany({
      where: {
        businessId: business.id,
        status: { notIn: ["ARCHIVED", "CLOSED"] },
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: {
        id: true,
        title: true,
        status: true,
        campaignType: true,
      },
    }),
    prisma.deviceSlot.findMany({
      where: {
        businessId: business.id,
        status: { notIn: ["CLOSED", "RETIRED", "ARCHIVED", "REPLACED"] },
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: {
        assignments: {
          where: { status: "ACTIVE" },
          take: 1,
          include: { campaign: { select: { title: true, status: true } } },
        },
      },
    }),
    prisma.campaign.groupBy({
      by: ["status"],
      where: { businessId: business.id },
      _count: true,
    }),
    prisma.brandKit.findUnique({ where: { businessId: business.id } }),
    prisma.deviceAssignment.count({
      where: { businessId: business.id, status: "ACTIVE" },
    }),
    prisma.tapEvent.count({ where: { businessId: business.id } }),
    prisma.campaign.count({
      where: { businessId: business.id, status: { notIn: ["ARCHIVED", "CLOSED"] } },
    }),
  ]);

  const byStatus = Object.fromEntries(statusGroups.map((g) => [g.status, g._count]));

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
      done: recentDevices.length > 0,
    },
    {
      id: "assign",
      label: "Assign a campaign to a device",
      href: "/dashboard/devices",
      done: liveAssigned > 0,
    },
    {
      id: "test",
      label: "Test the public tap page",
      href: recentDevices[0]
        ? `/t/${recentDevices[0].deviceCode}`
        : "/dashboard/devices",
      done: totalTaps > 0,
    },
  ];

  const statCards = [
    { label: "Taps this month", value: stats.tapsThisMonth, icon: Nfc },
    { label: "Leads this month", value: stats.leadsThisMonth, icon: Users },
    { label: "Active devices", value: stats.activeDevices, icon: Nfc },
    { label: "Live campaigns", value: stats.liveCampaigns, icon: Layers3 },
  ];

  const quickActions = [
    { href: "/dashboard/workbench", label: "Create Campaign", icon: PenTool },
    { href: "/dashboard/devices", label: "Manage Devices", icon: Nfc },
    { href: "/dashboard/scan", label: "Scan Device", icon: ScanLine },
    { href: "/dashboard/leads", label: "View Leads", icon: Users },
    { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/dashboard/brand", label: "Brand Kit", icon: Palette },
  ];

  return (
    <div className="space-y-8 p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{business.name}</h1>
          <p className="text-muted-foreground">Your tap marketing command center</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/workbench" className={buttonVariants()}>
            <PenTool className="mr-2 h-4 w-4" />
            New Campaign
          </Link>
          <Link href="/dashboard/campaigns" className={buttonVariants({ variant: "outline" })}>
            All Campaigns
          </Link>
        </div>
      </div>

      <OnboardingChecklist steps={onboardingSteps} businessName={business.name} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-border/60 bg-card/60">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription>{stat.label}</CardDescription>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-border/60 bg-card/60">
        <CardHeader className="pb-2">
          <CardDescription>Campaign pipeline</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 text-sm">
          {(
            [
              ["DRAFT", "Drafts"],
              ["READY", "Ready"],
              ["SCHEDULED", "Scheduled"],
              ["LIVE", "Live"],
              ["PAUSED", "Paused"],
              ["ARCHIVED", "Archived"],
            ] as const
          ).map(([key, label]) => (
            <Link
              key={key}
              href="/dashboard/campaigns"
              className="rounded-lg border border-border/50 px-3 py-2 hover:border-primary/40"
            >
              <span className="text-muted-foreground">{label}</span>{" "}
              <span className="font-semibold">{byStatus[key] ?? 0}</span>
            </Link>
          ))}
          <span className="rounded-lg border border-border/50 px-3 py-2">
            <span className="text-muted-foreground">Devices</span>{" "}
            <span className="font-semibold">
              {stats.activeDevices}/{business.activeDeviceLimit}
            </span>
          </span>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Icon className="mr-1.5 h-3.5 w-3.5" />
              {action.label}
            </Link>
          );
        })}
      </div>

      <OverviewLists
        campaigns={recentCampaigns}
        devices={recentDevices.map((d) => ({
          id: d.id,
          deviceCode: d.deviceCode,
          nickname: d.nickname,
          status: d.status,
          totalTapCount: d.totalTapCount,
          lastTappedLabel: formatRelativeDate(d.lastTappedAt),
          campaignTitle: d.assignments[0]?.campaign?.title ?? null,
        }))}
        deviceLimit={business.activeDeviceLimit}
        activeDevices={stats.activeDevices}
      />

      {stats.topDevice && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm text-muted-foreground">Top performing device</p>
              <p className="font-semibold">
                {stats.topDevice.nickname ?? stats.topDevice.deviceCode} —{" "}
                {stats.topDevice.totalTapCount} taps
              </p>
            </div>
            <Link
              href="/dashboard/analytics"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              View analytics <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
