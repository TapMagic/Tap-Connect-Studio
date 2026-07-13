import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LeadsManager } from "@/components/leads/leads-manager";
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

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold">Leads</h1>
        <p className="text-muted-foreground">
          Contacts from tap pages — mark contacted, add notes, export CSV
        </p>
      </div>
      <LeadsManager leads={rows} />
    </div>
  );
}
