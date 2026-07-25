import { StudioHubSections } from "@/components/studio/hub-sections";
import { AudienceWorkspace } from "@/components/fusion/audience/audience-workspace";
import { TapLoopWorkspace } from "@/components/fusion/audience/taploop-workspace";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  countContactsForBusiness,
  countRelationshipsForBusiness,
} from "@/lib/fusion/audience";
import { listFeatureOverrides, toResolveOverrides } from "@/lib/fusion/features/overrides";
import { isFeatureEnabled } from "@/lib/fusion/features";

export const dynamic = "force-dynamic";

export default async function AudienceHubPage() {
  const { business } = await requireBusiness();
  const overrides = toResolveOverrides(await listFeatureOverrides());
  const featureCtx = { overrides };

  const [leadCount, contactCount, relationshipCount] = await Promise.all([
    prisma.lead.count({ where: { businessId: business.id } }),
    countContactsForBusiness(business.id).catch(() => 0),
    countRelationshipsForBusiness(business.id).catch(() => 0),
  ]);

  const tapLoopReady = isFeatureEnabled("loyalty.taploop", featureCtx);

  return (
    <div className="space-y-8 p-5 lg:p-8">
      <StudioHubSections
        destinationId="audience"
        title="Audience"
        subtitle="Leads, relationships, Inbox, Wallet, TapLoop, and commerce — V1 Leads remain the capture floor."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Leads (V1)", value: leadCount },
          { label: "Contacts", value: contactCount },
          { label: "Relationships", value: relationshipCount },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3"
          >
            <p className="text-xs text-white/45">{stat.label}</p>
            <p className="text-2xl font-bold text-primary">{stat.value}</p>
          </div>
        ))}
      </div>

      <div id="workspace" className="scroll-mt-20 space-y-6">
        <AudienceWorkspace initialContactCount={contactCount} tapLoopEnabled={tapLoopReady} />
      </div>

      <div id="taploop" className="scroll-mt-20 space-y-6">
        <TapLoopWorkspace enabled={tapLoopReady} />
      </div>
    </div>
  );
}
