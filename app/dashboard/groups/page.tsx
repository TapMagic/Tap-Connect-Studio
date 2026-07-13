import { GroupsList } from "@/components/campaign/groups-list";
import { requireBusiness } from "@/lib/auth";
import { listCampaignGroups } from "@/lib/services/groups";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const { business } = await requireBusiness();
  const groups = await listCampaignGroups(business.id);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold">Campaign groups</h1>
        <p className="text-muted-foreground">
          Shared day/time schedules for every table and bar tag — one place to live/pause specials.
        </p>
      </div>
      <GroupsList
        groups={groups.map((g) => ({
          id: g.id,
          title: g.title,
          description: g.description,
          status: g.status,
          _count: g._count,
          slots: g.slots,
          defaultCampaign: g.defaultCampaign,
        }))}
      />
    </div>
  );
}
