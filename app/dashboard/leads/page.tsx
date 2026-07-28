import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LeadsManager } from "@/components/leads/leads-manager";
import { TruthfulEmptyStatePanel } from "@/components/studio/truthful-empty-state";
import { getEmptyState } from "@/lib/fusion/studio/empty-states";
import { formatRelativeDate } from "@/lib/utils/app";

export const dynamic = "force-dynamic";

function asMeta(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

export default async function LeadsPage() {
  const { business } = await requireBusiness();

  const leads = await prisma.lead.findMany({
    where: { businessId: business.id },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      campaign: { select: { title: true } },
      deviceSlot: { select: { nickname: true, deviceCode: true } },
    },
  });

  const rows = leads.map((lead) => {
    const meta = asMeta(lead.metadata);
    return {
      id: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      campaignTitle: lead.campaign?.title ?? null,
      deviceLabel: lead.deviceSlot?.nickname ?? lead.deviceSlot?.deviceCode ?? null,
      consentGiven: lead.consentGiven,
      couponClaimed: lead.couponClaimed,
      createdLabel: formatRelativeDate(lead.createdAt),
      notes: String(meta.notes ?? ""),
      contacted: Boolean(meta.contacted),
      archived: Boolean(meta.archived),
    };
  });

  const consented = rows.filter((r) => r.consentGiven).length;

  return (
    <div className="zone-audience space-y-6 p-6 lg:p-8" data-testid="leads-page">
      <div className="space-y-2">
        <p className="zone-label-audience text-[11px] font-semibold uppercase tracking-[0.18em]">
          <Link href="/dashboard/audience" className="hover:underline">
            Audience
          </Link>{" "}
          / Leads
        </p>
        <h1 className="text-2xl font-bold text-white">Leads</h1>
        <p className="text-white/55">
          People who met your Card via a Tap Point and left their details — mark contacted, add
          notes, export CSV.
        </p>
        {rows.length > 0 ? (
          <p className="text-xs text-white/45" data-testid="leads-consent-summary">
            {consented} of {rows.length} shown have marketing consent recorded · the rest are
            suppressed from marketing until consent is captured.
          </p>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <TruthfulEmptyStatePanel state={getEmptyState("leads")} testId="leads-empty" />
      ) : (
        <LeadsManager leads={rows} />
      )}
    </div>
  );
}
