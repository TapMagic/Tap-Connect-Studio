import Link from "next/link";
import { ArrowRight, CreditCard, Layers3, Mail, Wallet } from "lucide-react";
import { StudioHubSections } from "@/components/studio/hub-sections";
import { TruthfulEmptyStatePanel } from "@/components/studio/truthful-empty-state";
import { CardRelationshipAnchor } from "@/components/fusion/card/card-relationship-anchor";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loadCardRelationshipContext } from "@/lib/fusion/studio/load-card-relationship";
import { getEmptyState } from "@/lib/fusion/studio/empty-states";

export const dynamic = "force-dynamic";

const PRIMARY = [
  {
    id: "card",
    label: "Card",
    href: "/dashboard/card",
    description: "The living customer relationship hub",
    testId: "experiences-primary-card",
    icon: CreditCard,
  },
  {
    id: "campaigns",
    label: "Campaigns",
    href: "/dashboard/campaigns",
    description: "Activation and conversion that support the Card",
    testId: "experiences-primary-campaigns",
    icon: Layers3,
  },
  {
    id: "email",
    label: "Email",
    href: "/dashboard/campaigns",
    description: "Prepared communication and return path — open via a campaign",
    testId: "experiences-primary-email",
    icon: Mail,
  },
  {
    id: "canvas",
    label: "TapCanvas",
    href: "/dashboard/experiences/canvas",
    description: "Freeform workspace for planning, mood boards, and visual layouts",
    testId: "experiences-primary-canvas",
    icon: Layers3,
  },
] as const;

const RELATIONSHIP_SUPPORT = [
  {
    id: "tapsave",
    label: "TapSave / Keep",
    href: "/dashboard/card/edit",
    description: "Help customers keep the relationship after the tap",
    maturity: "Available",
    testId: "experiences-support-tapsave",
  },
  {
    id: "wallet",
    label: "Wallet",
    href: "/dashboard/audience/wallet",
    description: "Apple and Google Wallet passes — connection required for live issuance",
    maturity: "Needs connection",
    testId: "experiences-support-wallet",
  },
  {
    id: "journeys",
    label: "Customer actions / TapFlow",
    href: "/dashboard/experiences/journeys",
    description: "Journey drafts for follow-up actions",
    maturity: "Available",
    testId: "experiences-support-journeys",
  },
] as const;

const LABS = [
  {
    id: "whiteboard",
    label: "Campaign planning board",
    href: "/dashboard/workbench",
    description: "Campaign authoring workspace",
    maturity: "Available",
  },
  {
    id: "taptrail",
    label: "TapTrail",
    href: "/dashboard/insights",
    description: "Coming later — opens Insights for now",
    maturity: "Coming later",
  },
  {
    id: "orders",
    label: "Orders",
    href: "/dashboard/experiences/orders",
    description: "Checkout simulation for testing — not live commerce",
    maturity: "Draft only",
  },
  {
    id: "tapcast",
    label: "TapCast",
    href: "/dashboard/experiences/tapcast",
    description: "Social distribution — credentials required for live channels",
    maturity: "Needs connection",
  },
] as const;

export default async function ExperiencesHubPage() {
  const { business } = await requireBusiness();
  const [card, campaigns, groupCount, draftCount] = await Promise.all([
    loadCardRelationshipContext(business.id, business.name, { logoUrl: business.logoUrl }),
    prisma.campaign.findMany({
      where: { businessId: business.id, status: { notIn: ["ARCHIVED", "CLOSED"] } },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: { id: true, title: true, status: true, updatedAt: true },
    }),
    prisma.campaignGroup.count({ where: { businessId: business.id } }),
    prisma.campaign.count({ where: { businessId: business.id, status: "DRAFT" } }),
  ]);

  return (
    <div className="zone-card space-y-8 p-5 lg:p-8" data-testid="experiences-workspace">
      <CardRelationshipAnchor card={card} role="home_command" showReturn={false} />

      <header className="space-y-3 border-b border-white/8 pb-6">
        <p className="zone-label-card text-[11px] font-semibold uppercase tracking-[0.18em]">
          Experiences
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Create and run experiences around the Card
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-white/60">
          Card first. Campaigns and Email support the relationship. Extra tools stay under
          More until you need them.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            href="/dashboard/card"
            data-testid="experiences-cta-card"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <CreditCard className="h-4 w-4" aria-hidden />
            Open Card
          </Link>
          <Link
            href="/dashboard/workbench"
            data-testid="experiences-cta-campaign"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-4 text-sm font-medium text-white/90 hover:border-primary/40"
          >
            <Layers3 className="h-4 w-4" aria-hidden />
            New Campaign
          </Link>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-white/45">
          <span>
            <strong className="text-primary">{campaigns.length}</strong> active campaigns
          </span>
          <span>
            <strong className="text-primary">{groupCount}</strong> groups
          </span>
          <span>
            <strong className="text-primary">{draftCount}</strong> drafts
          </span>
        </div>
      </header>

      <section
        className="space-y-3"
        aria-labelledby="experiences-primary-heading"
        data-testid="experiences-primary"
      >
        <h2
          id="experiences-primary-heading"
          className="text-xs font-semibold uppercase tracking-[0.14em] text-white/35"
        >
          Primary experiences
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PRIMARY.map((item, index) => {
            const Icon = item.icon;
            return (
              <li key={item.id} data-experiences-order={index}>
                <Link
                  href={item.href}
                  data-testid={item.testId}
                  className="flex h-full flex-col rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 hover:border-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-white/95">
                    <Icon className="h-4 w-4 text-primary" aria-hidden />
                    {item.label}
                    {index === 0 ? (
                      <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">
                        Central
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-2 text-xs text-white/50">{item.description}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section
        className="space-y-3"
        aria-labelledby="experiences-support-heading"
        data-testid="experiences-relationship-support"
      >
        <h2
          id="experiences-support-heading"
          className="text-xs font-semibold uppercase tracking-[0.14em] text-white/35"
        >
          Relationship support
        </h2>
        <ul className="grid gap-2 sm:grid-cols-3">
          {RELATIONSHIP_SUPPORT.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                data-testid={item.testId}
                className="block rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 hover:border-white/20"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-white/85">
                  {item.id === "wallet" ? (
                    <Wallet className="h-3.5 w-3.5 text-white/50" aria-hidden />
                  ) : null}
                  {item.label}
                </span>
                <span className="mt-1 block text-[11px] text-white/40">{item.description}</span>
                <span
                  className="mt-2 inline-block text-[10px] uppercase tracking-wide text-white/35"
                  data-testid={`${item.testId}-maturity`}
                >
                  {item.maturity}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <details
        className="rounded-xl border border-white/8 bg-white/[0.015] px-4 py-3"
        data-testid="experiences-labs"
      >
        <summary className="cursor-pointer text-sm font-medium text-white/70">
          More tools
        </summary>
        <ul className="mt-3 space-y-2" data-testid="experiences-labs-list">
          {LABS.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm text-white/60 hover:bg-white/[0.03]"
                data-testid={`experiences-lab-${item.id}`}
              >
                <span>
                  <span className="block text-white/80">{item.label}</span>
                  <span className="text-[11px] text-white/40">{item.description}</span>
                </span>
                <span className="shrink-0 text-[10px] uppercase text-white/35">{item.maturity}</span>
              </Link>
            </li>
          ))}
        </ul>
      </details>

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
        {campaigns.length === 0 ? (
          !card.spotlightTitle ? (
            <TruthfulEmptyStatePanel state={getEmptyState("campaign_spotlight")} />
          ) : (
            <TruthfulEmptyStatePanel state={getEmptyState("campaigns")} />
          )
        ) : (
          <ul className="divide-y divide-white/6 overflow-hidden rounded-xl border border-white/8">
            {campaigns.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/dashboard/campaigns/${c.id}`}
                  className="flex min-h-11 items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.03]"
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
            ))}
          </ul>
        )}
      </section>

      <StudioHubSections
        destinationId="experiences"
        title="Full Experiences catalog"
        subtitle="Full catalog of Experiences tools and their current availability"
        collapsible
        defaultOpen={false}
      />
    </div>
  );
}
