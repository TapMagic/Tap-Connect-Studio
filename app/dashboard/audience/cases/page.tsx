import { CaseOperationsWorkspace } from "@/components/fusion/inbox/case-operations-workspace";
import { requireBusiness } from "@/lib/auth";
import { FeatureDisabledState } from "@/components/fusion/features/feature-disabled-state";
import { checkAnyFeatureGate } from "@/lib/fusion/features/gate";
import { loadFeatureContext } from "@/lib/fusion/features/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AudienceCasesPage() {
  const { user, business } = await requireBusiness();
  const featureCtx = await loadFeatureContext();
  const gate = checkAnyFeatureGate(["comms.inbox", "comms.email"], featureCtx);

  if (!gate.ok) {
    return (
      <div className="p-6">
        <FeatureDisabledState
          featureId="comms.inbox"
          title="Cases need Inbox"
          description="Enable Inbox messaging to manage customer cases from Card conversations."
          alternateHref="/dashboard/audience"
          alternateLabel="Back to Audience"
        />
      </div>
    );
  }

  const rows = await prisma.tapCase.findMany({
    where: { businessId: business.id },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const contactIds = Array.from(
    new Set(rows.map((r) => r.contactId).filter(Boolean) as string[])
  );
  const contacts = contactIds.length
    ? await prisma.contact.findMany({
        where: { id: { in: contactIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const contactById = new Map(contacts.map((c) => [c.id, c]));

  const cases = rows.map((r) => {
    const contact = r.contactId ? contactById.get(r.contactId) : null;
    return {
      id: r.id,
      subject: r.subject,
      status: r.status,
      priority: r.priority,
      assigneeId: r.assigneeId,
      contactId: r.contactId,
      threadId: r.threadId,
      openedAt: r.openedAt.toISOString(),
      closedAt: r.closedAt?.toISOString() ?? null,
      metadata: r.metadata,
      contactName: contact?.name ?? null,
      contactEmail: contact?.email ?? null,
    };
  });

  return (
    <div className="zone-service p-4 sm:p-6" data-testid="cases-workspace">
      <CaseOperationsWorkspace cases={cases} currentUserId={user.id} />
    </div>
  );
}
