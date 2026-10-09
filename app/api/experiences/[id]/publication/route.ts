import { NextResponse } from "next/server";
import { z } from "zod";
import { isPlatformAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireBusinessCapability } from "@/lib/fusion/authz/business-capability";
import {
  ExperienceLibraryError,
  listExperiencePublications,
  publishExperience,
  rollbackExperiencePublication,
  unpublishExperience,
} from "@/lib/fusion/card/experience-library";
import { resolveBusinessSignatureEntitlements } from "@/lib/fusion/creative-studio/signature-assets/entitlements.server";
import { appendAuditEvent } from "@/lib/control/audit";

export const runtime = "nodejs";

const commandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("publish"), expectedDraftRevision: z.number().int().min(1) }),
  z.object({ action: z.literal("rollback"), publicationSnapshotId: z.string().min(1) }),
  z.object({ action: z.literal("unpublish") }),
]);

function errorResponse(error: unknown) {
  if (error instanceof ExperienceLibraryError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid Experience publication command." }, { status: 400 });
  console.error("Experience publication error:", error);
  return NextResponse.json({ error: "Experience publication failed." }, { status: 500 });
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { business } = await requireBusinessCapability("card.draft.edit");
    const { id } = await params;
    const result = await listExperiencePublications(business.id, id);
    return NextResponse.json({
      currentPublicationId: result.document.currentPublicationSnapshotId,
      publicationActive: result.document.publicationActive,
      draftRevision: result.document.draftRevision,
      revisions: result.revisions.map((row) => ({
        id: row.id,
        publicRevisionId: row.id,
        version: row.version,
        sourceDraftRevision: Number((row.manifest as { sourceDraftRevision?: number }).sourceDraftRevision ?? 0),
        status: "PUBLISHED",
        current: row.id === result.document.currentPublicationSnapshotId,
        publishedAt: row.publishedAt.toISOString(),
        comparisonSummary: (row.manifest as { comparisonSummary?: unknown }).comparisonSummary,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { business, user } = await requireBusinessCapability("card.publish");
    const { id } = await params;
    const command = commandSchema.parse(await request.json());
    const signatureEntitlementKeys = await resolveBusinessSignatureEntitlements({
      businessId: business.id,
      planDefinitionId: business.planDefinitionId,
      privileged: isPlatformAdmin(user) || Boolean(await prisma.campaign.findFirst({ where: { businessId: business.id, isLandingDemo: true }, select: { id: true } })),
    });
    if (command.action === "publish") {
      const result = await publishExperience({
        businessId: business.id,
        documentId: id,
        expectedDraftRevision: command.expectedDraftRevision,
        publishedById: user.id,
        signatureEntitlementKeys,
      });
      await appendAuditEvent({
        actorId: user.id,
        businessId: business.id,
        action: "studio.experience.published",
        permissionUsed: "card.publish",
        resourceType: "Experience",
        resourceId: id,
        newValue: { publicationSnapshotId: result.snapshot.id, version: result.snapshot.version, publicSlug: result.publicSlug },
      });
      return NextResponse.json({
        status: "Published",
        publicUrl: `/everencore/${result.publicSlug}`,
        publication: { id: result.snapshot.id, version: result.snapshot.version, publishedAt: result.snapshot.publishedAt.toISOString() },
      });
    }
    if (command.action === "unpublish") {
      const prior = await unpublishExperience(business.id, id);
      await appendAuditEvent({
        actorId: user.id,
        businessId: business.id,
        action: "studio.experience.unpublished",
        permissionUsed: "card.publish",
        resourceType: "Experience",
        resourceId: id,
        priorValue: { publicationActive: prior.publicationActive, publicationSnapshotId: prior.currentPublicationSnapshotId },
        newValue: { publicationActive: false, publicationSnapshotId: prior.currentPublicationSnapshotId },
      });
      return NextResponse.json({ status: "Unpublished" });
    }
    const result = await rollbackExperiencePublication({
      businessId: business.id,
      documentId: id,
      publicationSnapshotId: command.publicationSnapshotId,
      signatureEntitlementKeys,
    });
    await appendAuditEvent({
      actorId: user.id,
      businessId: business.id,
      action: "studio.experience.rolled_back",
      permissionUsed: "card.publish",
      resourceType: "Experience",
      resourceId: id,
      newValue: { publicationSnapshotId: result.snapshot.id, version: result.snapshot.version },
    });
    return NextResponse.json({ status: "Published", publication: { id: result.snapshot.id, version: result.snapshot.version } });
  } catch (error) {
    return errorResponse(error);
  }
}
