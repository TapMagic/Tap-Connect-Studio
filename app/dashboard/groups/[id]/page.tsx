import Link from "next/link";
import { notFound } from "next/navigation";
import { GroupManager } from "@/components/campaign/group-manager";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCampaignGroup } from "@/lib/services/groups";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { business } = await requireBusiness();
  const { id } = await params;
  const group = await getCampaignGroup(business.id, id);
  if (!group) notFound();

  const [devices, campaigns] = await Promise.all([
    prisma.deviceSlot.findMany({
      where: {
        businessId: business.id,
        status: { notIn: ["CLOSED", "RETIRED", "ARCHIVED", "REPLACED"] },
      },
      select: { id: true, nickname: true, deviceCode: true, campaignGroupId: true },
      orderBy: { nickname: "asc" },
    }),
    prisma.campaign.findMany({
      where: { businessId: business.id, status: { notIn: ["ARCHIVED", "CLOSED"] } },
      select: { id: true, title: true, status: true },
      orderBy: { title: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/dashboard/groups" className="text-xs text-muted-foreground hover:text-primary">
            ← All groups
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{group.title}</h1>
          {group.description && (
            <p className="text-muted-foreground">{group.description}</p>
          )}
        </div>
        <Link href="/dashboard/workbench" className={buttonVariants({ variant: "outline" })}>
          New campaign page
        </Link>
      </div>

      <GroupManager
        group={{
          id: group.id,
          title: group.title,
          description: group.description,
          status: group.status,
          defaultCampaignId: group.defaultCampaignId,
          defaultCampaign: group.defaultCampaign,
          slots: group.slots.map((s) => ({
            ...s,
            daysOfWeek: s.daysOfWeek as number[],
          })),
          campaigns: group.campaigns,
          devices: group.devices,
        }}
        allDevices={devices.map((d) => ({
          id: d.id,
          label: d.nickname ?? d.deviceCode,
          groupId: d.campaignGroupId,
        }))}
        allCampaigns={campaigns}
      />
    </div>
  );
}
