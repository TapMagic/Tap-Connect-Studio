import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { CampaignsList } from "@/components/campaign/campaigns-list";
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
      assignments: {
        where: { status: "ACTIVE" },
        include: {
          deviceSlot: { select: { deviceCode: true, nickname: true } },
        },
      },
    },
  });

  const rows = campaigns.map((c) => ({
    id: c.id,
    title: c.title,
    status: c.status,
    campaignType: c.campaignType,
    assignmentCount: c._count.assignments,
    leadCount: c._count.leads,
    updatedLabel: formatRelativeDate(c.updatedAt),
    deviceCodes: c.assignments.map((a) => a.deviceSlot.deviceCode),
    deviceNicknames: c.assignments.map(
      (a) => a.deviceSlot.nickname ?? a.deviceSlot.deviceCode
    ),
  }));

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">
            Manage drafts, live pages, archives, and device assignments
          </p>
        </div>
        <Link href="/dashboard/workbench" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" />
          New Campaign
        </Link>
      </div>

      <CampaignsList campaigns={rows} campaignLimit={business.activeCampaignLimit} />
    </div>
  );
}
