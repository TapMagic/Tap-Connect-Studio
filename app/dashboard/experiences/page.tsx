import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { STUDIO_NAV } from "@/lib/fusion/studio/ia";

export const dynamic = "force-dynamic";

const EXPERIENCE_LINKS = [
  {
    href: "/dashboard/workbench",
    title: "Workbench",
    description: "Build and preview campaign experiences block-by-block.",
  },
  {
    href: "/dashboard/campaigns",
    title: "Campaigns",
    description: "Draft, schedule, and publish tap experiences.",
  },
  {
    href: "/dashboard/card",
    title: "Tap Card",
    description: "Living digital card — Pages Format builder.",
  },
  {
    href: "/dashboard/groups",
    title: "Campaign Groups",
    description: "Shared schedules and rotations across devices.",
  },
] as const;

export default async function ExperiencesHubPage() {
  const { business } = await requireBusiness();
  const nav = STUDIO_NAV.find((item) => item.id === "experiences");

  const [campaignCount, groupCount, draftCount] = await Promise.all([
    prisma.campaign.count({ where: { businessId: business.id } }),
    prisma.campaignGroup.count({ where: { businessId: business.id } }),
    prisma.campaign.count({ where: { businessId: business.id, status: "DRAFT" } }),
  ]);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Experiences</h1>
        <p className="mt-1 text-muted-foreground">
          {nav?.description ?? "Cards, campaigns, groups, and workbench — V1 routes remain available."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Campaigns", value: campaignCount },
          { label: "Groups", value: groupCount },
          { label: "Drafts", value: draftCount },
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

      <div className="grid gap-3 sm:grid-cols-2">
        {EXPERIENCE_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-xl border border-border/60 bg-card/40 p-4 transition hover:border-primary/50 hover:bg-card/60"
          >
            <p className="font-medium">{link.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{link.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
