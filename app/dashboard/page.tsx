import Link from "next/link";
import { ArrowRight, Layers3, Nfc, PenTool, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireBusiness } from "@/lib/auth";
import { getDashboardStats } from "@/lib/services/devices";
import { prisma } from "@/lib/db";
import { formatRelativeDate } from "@/lib/utils/app";

export default async function DashboardPage() {
  const { business } = await requireBusiness();
  const stats = await getDashboardStats(business.id);

  const [recentCampaigns, recentDevices] = await Promise.all([
    prisma.campaign.findMany({
      where: { businessId: business.id },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.deviceSlot.findMany({
      where: { businessId: business.id },
      orderBy: { updatedAt: "desc" },
      take: 5,
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/60">
          <CardHeader>
            <CardTitle>Recent Campaigns</CardTitle>
            <CardDescription>Built in your Workbench</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentCampaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No campaigns yet.{" "}
                <Link href="/dashboard/workbench" className="text-primary hover:underline">
                  Create your first
                </Link>
              </p>
            ) : (
              recentCampaigns.map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/campaigns/${c.id}`}
                  className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2 transition-colors hover:bg-accent/50"
                >
                  <div>
                    <p className="font-medium">{c.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.campaignType.replace(/_/g, " ").toLowerCase()}
                    </p>
                  </div>
                  <Badge variant="outline">{c.status.toLowerCase()}</Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardHeader>
            <CardTitle>Your Devices</CardTitle>
            <CardDescription>
              {stats.activeDevices} of {business.activeDeviceLimit} active slots used
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentDevices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No devices yet.{" "}
                <Link href="/dashboard/devices" className="text-primary hover:underline">
                  Add a device
                </Link>
              </p>
            ) : (
              recentDevices.map((d) => (
                <Link
                  key={d.id}
                  href={`/dashboard/devices/${d.id}`}
                  className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2 transition-colors hover:bg-accent/50"
                >
                  <div>
                    <p className="font-medium">{d.nickname ?? d.deviceCode}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.assignments[0]?.campaign?.title ?? "No campaign assigned"}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{d.totalTapCount} taps</p>
                    <p>{formatRelativeDate(d.lastTappedAt)}</p>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {stats.topDevice && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm text-muted-foreground">Top performing device</p>
              <p className="font-semibold">
                {stats.topDevice.nickname ?? stats.topDevice.deviceCode} — {stats.topDevice.totalTapCount} taps
              </p>
            </div>
            <Link href="/dashboard/analytics" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              View analytics <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
