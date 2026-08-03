import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireBusinessCapability } from "@/lib/fusion/authz/business-capability";
import { isTapConnectCardDraft } from "@/lib/fusion/card/draft";
import { cloneCreativeDocumentName, requireCreativeDocumentName } from "@/lib/fusion/creative-studio/document-naming";

export const runtime = "nodejs";

const createSchema = z.object({ name: z.string().max(120).optional(), draft: z.unknown() });

export async function GET() {
  const { business } = await requireBusinessCapability("card.draft.edit");
  const documents = await prisma.cardCreativeDocument.findMany({ where: { businessId: business.id }, orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ documents });
}

export async function POST(request: Request) {
  const { business } = await requireBusinessCapability("card.draft.edit");
  const input = createSchema.parse(await request.json());
  if (!isTapConnectCardDraft(input.draft)) return NextResponse.json({ error: "Invalid Card document" }, { status: 400 });
  const sourceName = requireCreativeDocumentName(input.draft.documentName || `${business.name} Card`);
  const name = input.name ? requireCreativeDocumentName(input.name) : cloneCreativeDocumentName(sourceName);
  const draft = { ...structuredClone(input.draft), documentName: name };
  const document = await prisma.cardCreativeDocument.create({ data: { businessId: business.id, name, draft: draft as unknown as Prisma.InputJsonValue } });
  return NextResponse.json({ document }, { status: 201 });
}
