import { NextResponse } from "next/server";
import { z } from "zod";
import { appendAuditEvent } from "@/lib/control/audit";
import { requireBusinessCapability } from "@/lib/fusion/authz/business-capability";
import {
  archiveCardPublication,
  CardPublicationError,
  listCardPublications,
  publishSavedCard,
  rollbackPublishedCard,
} from "@/lib/fusion/card/publication";

export const runtime = "nodejs";

const commandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("publish"), expectedDraftRevision: z.number().int().min(1) }),
  z.object({ action: z.literal("rollback"), publicationId: z.string().min(1) }),
  z.object({ action: z.literal("archive"), publicationId: z.string().min(1) }),
]);

function errorResponse(error: unknown) {
  if (error instanceof CardPublicationError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: "Invalid Card publication command." }, { status: 400 });
  }
  console.error("Card publication error:", error);
  return NextResponse.json({ error: "Card publication failed." }, { status: 500 });
}

export async function GET() {
  try {
    const { business } = await requireBusinessCapability("onboarding.read");
    const history = await listCardPublications(business.id);
    return NextResponse.json({
      currentPublicationId: history.currentId,
      draftRevision: history.draftRevision,
      revisions: history.rows.map((row) => ({
        id: row.id,
        publicRevisionId: row.publicationSnapshotId,
        version: row.version,
        sourceDraftRevision: row.sourceDraftRevision,
        status: row.status,
        comparisonSummary: row.comparisonSummary,
        publishedById: row.publishedById,
        publishedAt: row.publishedAt.toISOString(),
        archivedAt: row.archivedAt?.toISOString() ?? null,
        current: row.id === history.currentId,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { business, user } = await requireBusinessCapability("card.publish");
    const command = commandSchema.parse(await request.json());
    if (command.action === "publish") {
      const result = await publishSavedCard({
        businessId: business.id,
        expectedDraftRevision: command.expectedDraftRevision,
        publishedById: user.id,
      });
      await appendAuditEvent({
        actorId: user.id,
        businessId: business.id,
        action: "studio.card.published",
        permissionUsed: "card.publish",
        resourceType: "CardPublication",
        resourceId: result.publication.id,
        reason: "Published saved Card draft",
        newValue: {
          version: result.publication.version,
          publicRevisionId: result.snapshot.id,
          sourceDraftRevision: result.publication.sourceDraftRevision,
          comparisonSummary: result.comparisonSummary,
        },
      });
      return NextResponse.json({
        status: "Published",
        created: result.created,
        publication: {
          id: result.publication.id,
          publicRevisionId: result.snapshot.id,
          version: result.publication.version,
          publishedAt: result.publication.publishedAt.toISOString(),
          comparisonSummary: result.comparisonSummary,
        },
      });
    }

    if (command.action === "archive") {
      await archiveCardPublication({
        businessId: business.id,
        publicationId: command.publicationId,
      });
      await appendAuditEvent({
        actorId: user.id,
        businessId: business.id,
        action: "studio.card_revision.archived",
        permissionUsed: "card.publish",
        resourceType: "CardPublication",
        resourceId: command.publicationId,
        reason: "Archived a non-current Card revision",
      });
      return NextResponse.json({ status: "Archived" });
    }

    const result = await rollbackPublishedCard({
      businessId: business.id,
      publicationId: command.publicationId,
      actorId: user.id,
    });
    await appendAuditEvent({
      actorId: user.id,
      businessId: business.id,
      action: "studio.card.rolled_back",
      permissionUsed: "card.publish",
      resourceType: "CardPublication",
      resourceId: result.publication.id,
      reason: "Rolled public Card back to a prior revision",
      priorValue: { publicationId: result.rolledBackFromId },
      newValue: { publicationId: result.publication.id, version: result.publication.version },
    });
    return NextResponse.json({
      status: "Published",
      rolledBack: true,
      publication: {
        id: result.publication.id,
        version: result.publication.version,
        publicRevisionId: result.publication.publicationSnapshotId,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
