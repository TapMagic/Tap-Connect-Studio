import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireBusinessCapability } from "@/lib/fusion/authz/business-capability";
import { EXPERIENCE_CREDENTIAL_TYPES, rotateExperienceCredential } from "@/lib/fusion/card/experience-access-credentials";
import { ExperienceLibraryError } from "@/lib/fusion/card/experience-library";
import { appendAuditEvent } from "@/lib/control/audit";

export const runtime = "nodejs";

const rotateSchema = z.object({
  previousBehavior: z.enum(["keep", "revoke"]).default("keep"),
  credentialType: z.enum(EXPERIENCE_CREDENTIAL_TYPES).default("PERMANENT"),
  redemptionLimit: z.number().int().positive().max(1_000_000).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { business } = await requireBusinessCapability("card.draft.edit");
  const { id } = await params;
  const destination = await prisma.experiencePublicDestination.findFirst({
    where: { businessId: business.id, experienceId: id },
    include: { credentials: { orderBy: { createdAt: "desc" } } },
  });
  if (!destination) return NextResponse.json({ error: "Publish this Experience before generating a QR." }, { status: 409 });
  return NextResponse.json({
    destination: { slug: destination.slug, accessActive: destination.accessActive },
    credentials: destination.credentials.map((credential) => ({
      id: credential.id,
      tokenHint: credential.tokenHint,
      credentialType: credential.credentialType,
      status: credential.status,
      redemptionLimit: credential.redemptionLimit,
      redemptionCount: credential.redemptionCount,
      expiresAt: credential.expiresAt?.toISOString() ?? null,
      lastUsedAt: credential.lastUsedAt?.toISOString() ?? null,
      createdAt: credential.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { business, user } = await requireBusinessCapability("card.publish");
    const { id } = await params;
    const input = rotateSchema.parse(await request.json());
    const result = await rotateExperienceCredential({
      businessId: business.id,
      experienceId: id,
      credentialType: input.credentialType,
      revokePrevious: input.previousBehavior === "revoke",
      redemptionLimit: input.redemptionLimit,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    });
    await appendAuditEvent({
      actorId: user.id,
      businessId: business.id,
      action: result.previousActiveCount ? "studio.experience.qr_rotated" : "studio.experience.qr_generated",
      permissionUsed: "card.publish",
      resourceType: "ExperienceAccessCredential",
      resourceId: result.credential.id,
      newValue: {
        experienceId: id,
        destinationId: result.destination.id,
        credentialId: result.credential.id,
        credentialType: result.credential.credentialType,
        previousBehavior: input.previousBehavior,
      },
    });
    for (const revokedId of result.revokedCredentialIds) {
      await appendAuditEvent({
        actorId: user.id,
        businessId: business.id,
        action: "studio.experience.credential_revoked",
        permissionUsed: "card.publish",
        resourceType: "ExperienceAccessCredential",
        resourceId: revokedId,
        newValue: { experienceId: id, replacementResourceId: result.credential.id, status: "REVOKED" },
      });
    }
    const origin = new URL(request.url).origin;
    return NextResponse.json({
      credential: {
        id: result.credential.id,
        credentialType: result.credential.credentialType,
        status: result.credential.status,
        accessUrl: `${origin}/x/${result.token}`,
        tokenHint: result.credential.tokenHint,
      },
      previousCredentialsRevoked: input.previousBehavior === "revoke",
    }, { status: 201 });
  } catch (error) {
    if (error instanceof ExperienceLibraryError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid QR credential options." }, { status: 400 });
    console.error("Experience credential rotation failed:", error);
    return NextResponse.json({ error: "QR credential could not be generated." }, { status: 500 });
  }
}
