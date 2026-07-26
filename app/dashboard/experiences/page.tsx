import Link from "next/link";
import { ArrowRight, CreditCard, Layers3, Radio } from "lucide-react";
import { StudioHubSections } from "@/components/studio/hub-sections";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ExperiencesHubPage() {
  const { business } = await requireBusiness();
  const [campaigns, groupCount, draftCount] = await Promise.all([
    prisma.campaign.findMany({
      where: { businessId: business.id, status: { notIn: ["ARCHIVED", "CLOSED"] } },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: { id: true, title: true, status: true, updatedAt: true },
    }),
    prisma.campaignGroup.count({ where: { businessId: business.id } }),
    prisma.campaign.count({ where: { businessId: business.id, status: "DRAFT" } }),
  ]);

  const campaignCount = campaigns.length;

  return (
    <div className="space-y-8 p-5 lg:p-8" data-testid="experiences-workspace">
      <header className="space-y-3 border-b border-white/8 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          Experiences
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Make and ship</h1>
        <p className="max-w-2xl text-sm text-white/55">
          Cards, campaigns, schedules, and journeys — resume recent work or start something new.
          Advanced tools stay one click away.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            href="/dashboard/card"
            data-testid="experiences-cta-card"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <CreditCard className="h-4 w-4" aria-hidden />
            New Card
          </Link>
          <Link
            href="/dashboard/workbench"
            data-testid="experiences-cta-campaign"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-4 text-sm font-medium text-white/90 hover:border-primary/40"
          >
            <Layers3 className="h-4 w-4" aria-hidden />
            New Campaign
          </Link>
          <Link
            href="/dashboard/groups#create"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/10 px-4 text-sm text-white/70 hover:bg-white/5"
          >
            Schedule group
          </Link>
          <Link
            href="/dashboard/experiences/journeys"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/10 px-4 text-sm text-white/70 hover:bg-white/5"
          >
            Journeys
          </Link>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-white/45">
          <span>
            <strong className="text-primary">{campaignCount}</strong> active campaigns
          </span>
          <span>
            <strong className="text-primary">{groupCount}</strong> groups
          </span>
          <span>
            <strong className="text-primary">{draftCount}</strong> drafts
          </span>
        </div>
      </header>

      <section className="space-y-3" aria-labelledby="experiences-recent-heading">
        <div className="flex items-end justify-between gap-3">
          <h2
            id="experiences-recent-heading"
            className="text-xs font-semibold uppercase tracking-[0.14em] text-white/35"
          >
            Recent & drafts
          </h2>
          <Link href="/dashboard/campaigns" className="text-xs text-primary hover:underline">
            All campaigns
          </Link>
        </div>
        <ul className="divide-y divide-white/6 overflow-hidden rounded-xl border border-white/8">
          {campaigns.length === 0 ? (
            <li className="px-4 py-8 text-sm text-white/45">
              No campaigns yet — start with New Campaign or New Card.
            </li>
          ) : (
            campaigns.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/dashboard/campaigns/${c.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.03]"
                >
                  <span className="min-w-0">
                    <span className="block text-sm text-white/90">{c.title}</span>
                    <span className="text-[11px] text-white/35">
                      Updated {new Date(c.updatedAt).toLocaleString()}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase text-primary">{c.status}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-white/30" aria-hidden />
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Related workspaces">
        <Link
          href="/dashboard/experiences/tapcast"
          className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 hover:border-primary/30"
        >
          <p className="text-sm font-medium text-white/90">TapCast</p>
          <p className="mt-1 text-xs text-white/45">Social distribution — channels nested inside</p>
        </Link>
        <Link
          href="/dashboard/experiences/canvas"
          className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 hover:border-primary/30"
        >
          <p className="text-sm font-medium text-white/90">TapCanvas</p>
          <p className="mt-1 text-xs text-white/45">Linked object graph</p>
        </Link>
        <Link
          href="/dashboard/tap-points"
          className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 hover:border-primary/30"
        >
          <p className="flex items-center gap-1.5 text-sm font-medium text-white/90">
            <Radio className="h-3.5 w-3.5 text-primary" aria-hidden />
            Assign to Tap Points
          </p>
          <p className="mt-1 text-xs text-white/45">Put experiences on devices</p>
        </Link>
      </section>

      <StudioHubSections
        destinationId="experiences"
        title="Experiences"
        subtitle="Full tool catalog with readiness detail"
        collapsible
        defaultOpen={false}
      />
    </div>
  );
}
