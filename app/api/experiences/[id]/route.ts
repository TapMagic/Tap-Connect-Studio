import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireBusinessCapability } from "@/lib/fusion/authz/business-capability";
import { ExperienceLibraryError, normalizeExperienceType, setExperienceAccessActive } from "@/lib/fusion/card/experience-library";
import { appendAuditEvent } from "@/lib/control/audit";

export const runtime = "nodejs";

const updateSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("archive") }),
  z.object({ action: z.literal("restore") }),
  z.object({ action: z.literal("mark-preview") }),
  z.object({ action: z.literal("access-on") }),
  z.object({ action: z.literal("access-off") }),
  z.object({
    action: z.literal("metadata"),
    name: z.string().trim().min(1).max(120),
    clientName: z.string().trim().min(1).max(120),
    experienceType: z.string(),
  }),
]);

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { business } = await requireBusinessCapability("card.draft.edit");
  const { id } = await params;
  const document = await prisma.cardCreativeDocument.findFirst({ where: { id, businessId: business.id } });
  return document
    ? NextResponse.json({ document })
    : NextResponse.json({ error: "Experience not found." }, { status: 404 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { business, user } = await requireBusinessCapability("card.draft.edit");
  const { id } = await params;
  const input = updateSchema.parse(await request.json());
  const current = await prisma.cardCreativeDocument.findFirst({
    where: { id, businessId: business.id },
    select: { currentPublicationSnapshotId: true, publicationActive: true },
  });
  if (!current) return NextResponse.json({ error: "Experience not found." }, { status: 404 });
  if (input.action === "access-on" || input.action === "access-off") {
    await requireBusinessCapability("card.publish");
    try {
      const access = await setExperienceAccessActive(business.id, id, input.action === "access-on");
      await appendAuditEvent({
        actorId: user.id,
        businessId: business.id,
        action: input.action === "access-on" ? "studio.experience.access_activated" : "studio.experience.access_deactivated",
        permissionUsed: "card.publish",
        resourceType: "Experience",
        resourceId: id,
        priorValue: { accessActive: access.previousAccessActive },
        newValue: { accessActive: input.action === "access-on" },
      });
      return NextResponse.json({ accessActive: input.action === "access-on" });
    } catch (error) {
      if (error instanceof ExperienceLibraryError) return NextResponse.json({ error: error.message }, { status: error.status });
      throw error;
    }
  }
  const now = new Date();
  const data = input.action === "archive"
    ? { archivedAt: now, experienceStatus: "ARCHIVED" }
    : input.action === "restore"
      ? { archivedAt: null, experienceStatus: current.publicationActive ? "PUBLISHED" : "DRAFT" }
      : input.action === "mark-preview"
        ? { previewedAt: now, experienceStatus: current.publicationActive ? "PUBLISHED" : "PREVIEW_READY" }
        : { name: input.name, clientName: input.clientName, experienceType: normalizeExperienceType(input.experienceType) };
  const updated = await prisma.cardCreativeDocument.updateMany({ where: { id, businessId: business.id }, data });
  if (updated.count !== 1) return NextResponse.json({ error: "Experience not found." }, { status: 404 });
  const document = await prisma.cardCreativeDocument.findUniqueOrThrow({ where: { id } });
  if (input.action === "archive" || input.action === "restore") {
    await appendAuditEvent({
      actorId: user.id,
      businessId: business.id,
      action: input.action === "archive" ? "studio.experience.archived" : "studio.experience.restored",
      permissionUsed: "card.draft.edit",
      resourceType: "Experience",
      resourceId: id,
      newValue: { archivedAt: document.archivedAt?.toISOString() ?? null },
    });
  }
  return NextResponse.json({ document });
}
