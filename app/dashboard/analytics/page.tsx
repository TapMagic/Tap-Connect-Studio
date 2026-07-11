import { requireBusiness } from "@/lib/auth";
import { getDashboardStats } from "@/lib/services/devices";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AnalyticsPage() {
  const { business } = await requireBusiness();
  const stats = await getDashboardStats(business.id);

  const topCampaigns = await prisma.campaign.findMany({
    where: { businessId: business.id },
    take: 5,
    include: { _count: { select: { tapEvents: true, leads: true, clickEvents: true } } },
  });

  topCampaigns.sort((a, b) => b._count.tapEvents - a._count.tapEvents);

  const topDevices = await prisma.deviceSlot.findMany({
    where: { businessId: business.id },
    orderBy: { totalTapCount: "desc" },
    take: 5,
  });

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Tap performance across devices and campaigns</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total taps", value: stats.totalTaps },
          { label: "Taps (30 days)", value: stats.tapsThisMonth },
          { label: "Total leads", value: stats.totalLeads },
          { label: "Leads (30 days)", value: stats.leadsThisMonth },
        ].map((s) => (
          <Card key={s.label}>
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
        <Card>
          <CardHeader>
            <CardTitle>Top Campaigns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topCampaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet</p>
            ) : (
              topCampaigns.map((c) => (
                <div key={c.id} className="flex justify-between text-sm">
                  <span>{c.title}</span>
                  <span className="text-muted-foreground">
                    {c._count.tapEvents} taps · {c._count.leads} leads
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Devices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topDevices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet</p>
            ) : (
              topDevices.map((d) => (
                <div key={d.id} className="flex justify-between text-sm">
                  <span>{d.nickname ?? d.deviceCode}</span>
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
