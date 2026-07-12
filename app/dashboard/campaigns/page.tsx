import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatRelativeDate } from "@/lib/utils/app";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const { business } = await requireBusiness();

  const campaigns = await prisma.campaign.findMany({
    where: { businessId: business.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { assignments: true, leads: true } },
    },
  });

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">
            {campaigns.length} of {business.activeCampaignLimit} campaigns
          </p>
        </div>
        <Link href="/dashboard/workbench" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" />
          New Campaign
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No campaigns yet. Start in the Workbench.</p>
            <Link href="/dashboard/workbench" className={buttonVariants({ className: "mt-4" })}>
              Open Workbench
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((c) => (
            <Link key={c.id} href={`/dashboard/campaigns/${c.id}`}>
              <Card className="border-border/60 transition-colors hover:border-primary/30">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg">{c.title}</CardTitle>
                  <Badge variant="outline">{c.status.toLowerCase()}</Badge>
                </CardHeader>
                <CardContent className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="capitalize">{c.campaignType.replace(/_/g, " ").toLowerCase()}</span>
                  <span>{c._count.assignments} devices</span>
                  <span>{c._count.leads} leads</span>
                  <span>Updated {formatRelativeDate(c.updatedAt)}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
