import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listEmails } from "@/lib/fusion/email/lifecycle";

export const dynamic = "force-dynamic";

function ownerStatus(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase().replaceAll("_", " ");
}

export default async function EmailPage() {
  const { business } = await requireBusiness();
  const [emails, campaigns] = await Promise.all([
    listEmails(business.id),
    prisma.campaign.findMany({
      where: { businessId: business.id, status: { notIn: ["ARCHIVED", "CLOSED"] } },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, status: true },
    }),
  ]);
  const emailCampaigns = new Set(emails.map((email) => email.campaignId).filter(Boolean));
  return (
    <main className="zone-experiences space-y-6 p-6 lg:p-8" data-testid="email-page">
      <header><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Studio</p><h1 className="text-2xl font-bold text-white">Email</h1><p className="text-sm text-white/55">Create, save, preview, and schedule Email safely. Real sending is disabled.</p></header>
      <section className="grid gap-3 md:grid-cols-2">
        {emails.map((email) => (
          <article key={email.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4" data-testid={`email-row-${email.id}`}>
            <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-white">{email.name}</h2><p className="text-xs text-white/45">{email.campaign?.title ?? "Standalone Email"}</p></div><span className="rounded-full border border-white/15 px-2 py-1 text-xs">{ownerStatus(email.status)}</span></div>
            <p className="mt-3 text-sm text-white/65">{email.subject || "No subject yet"}</p>
            <p className="mt-1 text-xs text-white/40">{email.scheduledFor ? `Scheduled ${email.scheduledFor.toLocaleString()}` : "Not scheduled"}</p>
            {email.campaignId ? <Link href={`/dashboard/campaigns/${email.campaignId}/email`} className="mt-4 inline-flex rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Open Email</Link> : null}
          </article>
        ))}
      </section>
      <section className="rounded-xl border border-white/10 p-4"><h2 className="font-semibold text-white">Create an Email</h2><p className="mb-3 text-xs text-white/50">Choose a Campaign. Its Email becomes a first-class saved document while the Campaign compatibility copy remains available.</p><div className="flex flex-wrap gap-2">{campaigns.filter((campaign) => !emailCampaigns.has(campaign.id)).map((campaign) => <Link key={campaign.id} href={`/dashboard/campaigns/${campaign.id}/email`} className="rounded-md border border-white/15 px-3 py-2 text-sm text-white/80 hover:bg-white/5">Create for {campaign.title}</Link>)}</div>{!campaigns.length ? <Link href="/dashboard/campaigns" className="mt-3 inline-flex text-sm text-sky-200">Create a Campaign first</Link> : null}</section>
    </main>
  );
}
