import { StudioHubSections } from "@/components/studio/hub-sections";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ExperiencesHubPage() {
  const { business } = await requireBusiness();
  const [campaignCount, groupCount, draftCount] = await Promise.all([
    prisma.campaign.count({ where: { businessId: business.id } }),
    prisma.campaignGroup.count({ where: { businessId: business.id } }),
    prisma.campaign.count({ where: { businessId: business.id, status: "DRAFT" } }),
  ]);

  return (
    <div className="space-y-8 p-5 lg:p-8">
      <StudioHubSections
        destinationId="experiences"
        title="Experiences"
        subtitle="Cards, Campaigns, Groups, TapCanvas, TapCast (omnichannel hub — TikTok first-class inside TapCast), TapFlow, and distribution — every V1 builder path remains reachable here."
      />
      <div className="flex flex-wrap gap-4 text-sm text-white/55">
        <span>
          <strong className="text-primary">{campaignCount}</strong> campaigns
        </span>
        <span>
          <strong className="text-primary">{groupCount}</strong> groups
        </span>
        <span>
          <strong className="text-primary">{draftCount}</strong> drafts
        </span>
      </div>
    </div>
  );
}
