import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { getDashboardStats } from "@/lib/services/devices";
import { getAnalyticsTimeseries } from "@/lib/services/analytics";
import { prisma } from "@/lib/db";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const { business } = await requireBusiness();
  const [stats, seriesData, topCampaigns, topDevices] = await Promise.all([
    getDashboardStats(business.id),
    getAnalyticsTimeseries(business.id, 14),
    prisma.campaign.findMany({
      where: { businessId: business.id },
      take: 8,
      include: { _count: { select: { tapEvents: true, leads: true, clickEvents: true } } },
    }),
    prisma.deviceSlot.findMany({
      where: { businessId: business.id },
      orderBy: { totalTapCount: "desc" },
      take: 5,
    }),
  ]);

  topCampaigns.sort((a, b) => b._count.tapEvents - a._count.tapEvents);
  const top5Campaigns = topCampaigns.slice(0, 5);
  const maxCampaignTaps = Math.max(1, ...top5Campaigns.map((c) => c._count.tapEvents));

  const hasData = stats.totalTaps > 0 || stats.totalLeads > 0;

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            How taps turn into leads — last 14 days and all-time
          </p>
        </div>
        <Link href="/dashboard/leads" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Open leads
        </Link>
      </div>

      {!hasData ? (
        <EmptyState
          title="No tap data yet"
          description="Assign a campaign to a device and open the public /t/ link. Charts fill in as people engage."
          actionHref="/dashboard/devices"
          actionLabel="Go to devices"
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Total taps", value: stats.totalTaps },
          { label: "Taps (30 days)", value: stats.tapsThisMonth },
          { label: "Total leads", value: stats.totalLeads },
          { label: "Leads (30 days)", value: stats.leadsThisMonth },
          { label: "Conv. (14 days)", value: `${seriesData.conversionRate}%` },
        ].map((s) => (
          <Card key={s.label} className="border-border/60 bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Taps — 14 days</CardTitle>
            <CardDescription>{seriesData.tapsInRange} taps in this window</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-40 items-end gap-1">
              {seriesData.series.map((day) => (
                <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-sm bg-primary/80 transition-all"
                    style={{
                      height: `${Math.max(4, (day.taps / seriesData.maxTaps) * 100)}%`,
                    }}
                    title={`${day.label}: ${day.taps} taps`}
                  />
                  <span className="text-[9px] text-muted-foreground">{day.label.split(" ")[1]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Leads — 14 days</CardTitle>
            <CardDescription>{seriesData.leadsInRange} leads in this window</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-40 items-end gap-1">
              {seriesData.series.map((day) => (
                <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-sm bg-sky-400/80 transition-all"
                    style={{
                      height: `${Math.max(4, (day.leads / seriesData.maxLeads) * 100)}%`,
                    }}
                    title={`${day.label}: ${day.leads} leads`}
                  />
                  <span className="text-[9px] text-muted-foreground">{day.label.split(" ")[1]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border/60 lg:col-span-1">
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>CTA clicks (14 days)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {seriesData.clicks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No clicks logged yet</p>
            ) : (
              seriesData.clicks.slice(0, 8).map((c) => (
                <div key={c.type} className="flex justify-between text-sm">
                  <span className="capitalize text-muted-foreground">
                    {c.type.replace(/_/g, " ")}
                  </span>
                  <span className="font-medium">{c.count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Top Campaigns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {top5Campaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No campaigns yet</p>
            ) : (
              top5Campaigns.map((c) => (
                <div key={c.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <Link
                      href={`/dashboard/campaigns/${c.id}`}
                      className="font-medium hover:text-primary"
                    >
                      {c.title}
                    </Link>
                    <span className="text-muted-foreground">
                      {c._count.tapEvents} · {c._count.leads} leads
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${(c._count.tapEvents / maxCampaignTaps) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Top Devices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topDevices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No devices yet</p>
            ) : (
              topDevices.map((d) => (
                <div key={d.id} className="flex justify-between text-sm">
                  <Link
                    href={`/dashboard/devices/${d.id}`}
                    className="font-medium hover:text-primary"
                  >
                    {d.nickname ?? d.deviceCode}
                  </Link>
                  <span className="text-muted-foreground">{d.totalTapCount} taps</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
