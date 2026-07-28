import Link from "next/link";
import { StudioHubSections } from "@/components/studio/hub-sections";
import { AudienceWorkspace } from "@/components/fusion/audience/audience-workspace";
import { TapLoopWorkspace } from "@/components/fusion/audience/taploop-workspace";
import { CardRelationshipAnchor } from "@/components/fusion/card/card-relationship-anchor";
import { TruthfulEmptyStatePanel } from "@/components/studio/truthful-empty-state";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  countContactsForBusiness,
  countRelationshipsForBusiness,
} from "@/lib/fusion/audience";
import { listFeatureOverrides, toResolveOverrides } from "@/lib/fusion/features/overrides";
import { isFeatureEnabled } from "@/lib/fusion/features";
import { loadCardRelationshipContext } from "@/lib/fusion/studio/load-card-relationship";
import { getEmptyState } from "@/lib/fusion/studio/empty-states";

export const dynamic = "force-dynamic";

export default async function AudienceHubPage() {
  const { business } = await requireBusiness();
  const overrides = toResolveOverrides(await listFeatureOverrides());
  const featureCtx = { overrides };

  const [leadCount, contactCount, relationshipCount, card] = await Promise.all([
    prisma.lead.count({ where: { businessId: business.id } }),
    countContactsForBusiness(business.id).catch(() => 0),
    countRelationshipsForBusiness(business.id).catch(() => 0),
    loadCardRelationshipContext(business.id, business.name, { logoUrl: business.logoUrl }),
  ]);

  const tapLoopReady = isFeatureEnabled("loyalty.taploop", featureCtx);

  return (
    <div className="zone-audience space-y-8 p-5 lg:p-8" data-testid="audience-workspace">
      <CardRelationshipAnchor card={card} role="audience_relationships" />
      <header className="space-y-3 border-b border-white/8 pb-6">
        <p className="zone-label-audience text-[11px] font-semibold uppercase tracking-[0.18em]">
          Audience
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          People & relationships
        </h1>
        <p className="max-w-2xl text-sm text-white/55">
          Find contacts, manage consent, run loyalty, and open Inbox — without hunting modules.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/leads"
            className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Open leads
          </Link>
          <Link
            href="/dashboard/audience/inbox"
            className="inline-flex min-h-11 items-center rounded-lg border border-white/15 px-4 text-sm text-white/85 hover:border-primary/40"
          >
            Inbox
          </Link>
          <Link
            href="#taploop"
            className="inline-flex min-h-11 items-center rounded-lg border border-white/10 px-4 text-sm text-white/70 hover:bg-white/5"
          >
            Loyalty
          </Link>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Leads", value: leadCount },
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

      {contactCount === 0 && leadCount === 0 ? (
        <TruthfulEmptyStatePanel state={getEmptyState("audience")} />
      ) : null}

      <div id="workspace" className="scroll-mt-20 space-y-6">
        <AudienceWorkspace initialContactCount={contactCount} tapLoopEnabled={tapLoopReady} />
      </div>

      <div id="taploop" className="scroll-mt-20 space-y-6">
        <TapLoopWorkspace enabled={tapLoopReady} />
      </div>

      <StudioHubSections
        destinationId="audience"
        title="Audience"
        subtitle="Full audience tool catalog"
        collapsible
        defaultOpen={false}
      />
    </div>
  );
}
