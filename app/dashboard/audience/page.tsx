import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  countContactsForBusiness,
  countRelationshipsForBusiness,
} from "@/lib/fusion/audience";
import { listFeatureOverrides, toResolveOverrides } from "@/lib/fusion/features/overrides";
import { isFeatureEnabled } from "@/lib/fusion/features";
import { AudienceWorkspace } from "@/components/fusion/audience/audience-workspace";
import { Users, Heart, Inbox, Mail } from "lucide-react";

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

  const tapSaveReady = isFeatureEnabled("tapsave.core", featureCtx);
  const tapLoopReady = isFeatureEnabled("loyalty.taploop", featureCtx);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audience</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Operational workspace — search contacts, consent, MyTap, and TapLoop when enabled. V1 Leads
          remain the capture floor.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Leads (V1)", value: leadCount },
          { label: "Contacts", value: contactCount },
          { label: "Relationships", value: relationshipCount },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border/60 bg-card/40 px-4 py-3"
          >
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="text-2xl font-bold text-primary">{stat.value}</p>
          </div>
        ))}
      </div>

      <AudienceWorkspace initialContactCount={contactCount} tapLoopEnabled={tapLoopReady} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/dashboard/leads"
          className="rounded-xl border border-border/60 bg-card/40 p-4 hover:border-primary/50"
        >
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <p className="font-medium">Leads list (V1)</p>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">CRM list + CSV export</p>
        </Link>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" />
              <p className="font-medium">TapSave / MyTap</p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
                tapSaveReady ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
              }`}
            >
              {tapSaveReady ? "Enabled" : "Coming soon"}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Open MyTap from contact detail — privacy-safe public tokens.
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4 opacity-90">
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-primary" />
            <p className="font-medium">TapInbox</p>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Unified conversations — Channel Guardian enforced
          </p>
        </div>

        <Link
          href="/dashboard/campaigns"
          className="rounded-xl border border-border/60 bg-card/40 p-4 hover:border-primary/50"
        >
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            <p className="font-medium">Email</p>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Campaign email builder + Resend delivery</p>
        </Link>
      </div>
    </div>
  );
}
