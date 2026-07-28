import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { CampaignsList } from "@/components/campaign/campaigns-list";
import { OpenInTapCanvasLink } from "@/components/fusion/canvas/open-in-tap-canvas";
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

  const devices = await prisma.deviceSlot.findMany({
    where: {
      businessId: business.id,
      status: { notIn: ["CLOSED", "RETIRED", "ARCHIVED", "REPLACED"] },
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, nickname: true, deviceCode: true },
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
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Campaign · the page your Card serves
          </p>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="max-w-2xl text-muted-foreground">
            Each campaign is a live page a tap opens. Manage drafts, live pages, archives, and which
            devices point to them. <span className="text-foreground">Next:</span> edit a draft, then
            assign it to a device so taps go live.
          </p>
          <p className="mt-1">
            <OpenInTapCanvasLink objectType="campaigns" objectId="hub" />
          </p>
        </div>
        <Link href="/dashboard/workbench" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" />
          New Campaign
        </Link>
      </div>

      <CampaignsList
        campaigns={rows}
        campaignLimit={business.activeCampaignLimit}
        devices={devices.map((d) => ({
          id: d.id,
          label: d.nickname ?? d.deviceCode,
        }))}
      />
    </div>
  );
}
