import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";

const patchSchema = z.object({
  leadId: z.string(),
  notes: z.string().max(2000).optional(),
  contacted: z.boolean().optional(),
  archived: z.boolean().optional(),
  couponClaimed: z.boolean().optional(),
});

function asMeta(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return { ...(raw as Record<string, unknown>) };
  }
  return {};
}

export async function PATCH(request: Request) {
  try {
    const { business } = await requireBusiness();
    const body = patchSchema.parse(await request.json());

    const existing = await prisma.lead.findFirst({
      where: { id: body.leadId, businessId: business.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const meta = asMeta(existing.metadata);
    if (body.notes !== undefined) meta.notes = body.notes;
    if (body.contacted !== undefined) {
      meta.contacted = body.contacted;
      meta.contactedAt = body.contacted ? new Date().toISOString() : null;
    }
    if (body.archived !== undefined) meta.archived = body.archived;

    const lead = await prisma.lead.update({
      where: { id: body.leadId },
      data: {
        metadata: meta as Prisma.InputJsonValue,
        ...(body.couponClaimed !== undefined ? { couponClaimed: body.couponClaimed } : {}),
      },
    });

    return NextResponse.json({ lead });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    console.error("Lead update error:", error);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { business } = await requireBusiness();
    const { searchParams } = new URL(request.url);
    if (searchParams.get("format") !== "csv") {
      return NextResponse.json({ error: "Use ?format=csv" }, { status: 400 });
    }

    const leads = await prisma.lead.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "desc" },
      include: {
        campaign: { select: { title: true } },
        deviceSlot: { select: { nickname: true, deviceCode: true } },
      },
    });

    const header = [
      "name",
      "email",
      "phone",
      "campaign",
      "device",
      "consent",
      "coupon_claimed",
      "contacted",
      "notes",
      "created_at",
    ];

    const rows = leads.map((l) => {
      const meta = asMeta(l.metadata);
      const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
      return [
        escape(l.name ?? ""),
        escape(l.email),
        escape(l.phone ?? ""),
        escape(l.campaign?.title ?? ""),
        escape(l.deviceSlot?.nickname ?? l.deviceSlot?.deviceCode ?? ""),
        l.consentGiven ? "yes" : "no",
        l.couponClaimed ? "yes" : "no",
        meta.contacted ? "yes" : "no",
        escape(String(meta.notes ?? "")),
        escape(l.createdAt.toISOString()),
      ].join(",");
    });

    const csv = [header.join(","), ...rows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="tapconnect-leads.csv"`,
      },
    });
  } catch (error) {
    console.error("Lead export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
