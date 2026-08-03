import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireBusinessCapability } from "@/lib/fusion/authz/business-capability";
import { isTapConnectCardDraft } from "@/lib/fusion/card/draft";
import { requireCreativeDocumentName } from "@/lib/fusion/creative-studio/document-naming";

export const runtime = "nodejs";
const saveSchema = z.object({ draft: z.unknown(), expectedRevision: z.number().int().min(1) });

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { business } = await requireBusinessCapability("card.draft.edit");
  const { id } = await params;
  const input = saveSchema.parse(await request.json());
  if (!isTapConnectCardDraft(input.draft)) return NextResponse.json({ error: "Invalid Card document" }, { status: 400 });
  const name = requireCreativeDocumentName(input.draft.documentName || "Untitled Card");
  const updated = await prisma.cardCreativeDocument.updateMany({
    where: { id, businessId: business.id, draftRevision: input.expectedRevision },
    data: { name, draft: input.draft as unknown as Prisma.InputJsonValue, draftRevision: { increment: 1 } },
  });
  if (updated.count !== 1) return NextResponse.json({ error: "This Card document changed in another session." }, { status: 409 });
  const document = await prisma.cardCreativeDocument.findUniqueOrThrow({ where: { id } });
  return NextResponse.json({ document, revision: document.draftRevision, updatedAt: document.updatedAt });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { business } = await requireBusinessCapability("card.draft.edit");
  const { id } = await params;
  const deleted = await prisma.cardCreativeDocument.deleteMany({ where: { id, businessId: business.id } });
  return deleted.count ? new NextResponse(null, { status: 204 }) : NextResponse.json({ error: "Card document not found" }, { status: 404 });
}
