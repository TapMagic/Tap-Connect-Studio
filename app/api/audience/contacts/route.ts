import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { business } = await requireBusiness();
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const contactId = url.searchParams.get("id");

    if (contactId) {
      const contact = await prisma.contact.findFirst({
        where: { id: contactId, businessId: business.id },
        include: {
          relationships: true,
          consents: { orderBy: { recordedAt: "desc" }, take: 20 },
          leads: { orderBy: { createdAt: "desc" }, take: 20 },
          loyaltyEnrollments: { include: { program: { select: { id: true, name: true } } } },
        },
      });
      if (!contact) {
        return NextResponse.json({ error: "Contact not found" }, { status: 404 });
      }
      const { listContactTimelineEvents } = await import("@/lib/fusion/audience/timeline");
      const timeline = await listContactTimelineEvents({
        businessId: business.id,
        contactId: contact.id,
      });
      return NextResponse.json({
        ok: true,
        contact: {
          id: contact.id,
          email: contact.email,
          phone: contact.phone,
          name: contact.name,
          createdAt: contact.createdAt.toISOString(),
          updatedAt: contact.updatedAt.toISOString(),
          relationships: contact.relationships.map((r) => ({
            id: r.id,
            publicToken: r.publicToken,
            status: r.status,
            tapSaveEnabled: r.tapSaveEnabled,
          })),
          consents: contact.consents.map((c) => ({
            id: c.id,
            channel: c.channel,
            status: c.status,
            recordedAt: c.recordedAt.toISOString(),
          })),
          leads: contact.leads.map((l) => ({
            id: l.id,
            email: l.email,
            name: l.name,
            createdAt: l.createdAt.toISOString(),
          })),
          enrollments: contact.loyaltyEnrollments.map((e) => ({
            id: e.id,
            programId: e.programId,
            programName: e.program.name,
            status: e.status,
          })),
          timeline,
        },
      });
    }

    const rows = await prisma.contact.findMany({
      where: {
        businessId: business.id,
        ...(q
          ? {
              OR: [
                { email: { contains: q, mode: "insensitive" } },
                { name: { contains: q, mode: "insensitive" } },
                { phone: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: {
        relationships: { select: { id: true, publicToken: true, status: true }, take: 1 },
        _count: { select: { consents: true, leads: true } },
      },
    });

    return NextResponse.json({
      ok: true,
      contacts: rows.map((c) => ({
        id: c.id,
        email: c.email,
        phone: c.phone,
        name: c.name,
        updatedAt: c.updatedAt.toISOString(),
        relationshipToken: c.relationships[0]?.publicToken ?? null,
        consentCount: c._count.consents,
        leadCount: c._count.leads,
      })),
    });
  } catch (error) {
    console.error("Audience contacts error:", error);
    return NextResponse.json({ error: "Failed to load contacts" }, { status: 500 });
  }
}
