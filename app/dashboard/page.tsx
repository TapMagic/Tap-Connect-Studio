import Link from "next/link";
import { ArrowRight, Layers3, Nfc, PenTool, Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { OverviewLists } from "@/components/dashboard/overview-lists";
import { requireBusiness } from "@/lib/auth";
import { getDashboardStats } from "@/lib/services/devices";
import { prisma } from "@/lib/db";
import { formatRelativeDate } from "@/lib/utils/app";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { business } = await requireBusiness();
  const stats = await getDashboardStats(business.id);

  const [recentCampaigns, recentDevices] = await Promise.all([
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
  ]);

  const statCards = [
    { label: "Taps this month", value: stats.tapsThisMonth, icon: Nfc },
    { label: "Leads this month", value: stats.leadsThisMonth, icon: Users },
    { label: "Active devices", value: stats.activeDevices, icon: Nfc },
    { label: "Live campaigns", value: stats.liveCampaigns, icon: Layers3 },
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
          <Link href="/dashboard/devices" className={buttonVariants({ variant: "outline" })}>
            Manage Devices
          </Link>
        </div>
      </div>

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
