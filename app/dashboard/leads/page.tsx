import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeDate } from "@/lib/utils/app";

export default async function LeadsPage() {
  const { business } = await requireBusiness();

  const leads = await prisma.lead.findMany({
    where: { businessId: business.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      campaign: { select: { title: true } },
      deviceSlot: { select: { nickname: true, deviceCode: true } },
    },
  });

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold">Leads</h1>
        <p className="text-muted-foreground">{leads.length} contacts captured from tap pages</p>
      </div>

      {leads.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            No leads yet. Add an email capture block to your campaigns.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-muted-foreground">
                    <th className="pb-3 pr-4">Name</th>
                    <th className="pb-3 pr-4">Email</th>
                    <th className="pb-3 pr-4">Campaign</th>
                    <th className="pb-3 pr-4">Device</th>
                    <th className="pb-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-b border-border/30">
                      <td className="py-3 pr-4">{lead.name ?? "—"}</td>
                      <td className="py-3 pr-4">{lead.email}</td>
                      <td className="py-3 pr-4">{lead.campaign?.title ?? "—"}</td>
                      <td className="py-3 pr-4">
                        {lead.deviceSlot?.nickname ?? lead.deviceSlot?.deviceCode ?? "—"}
                      </td>
                      <td className="py-3 text-muted-foreground">{formatRelativeDate(lead.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
