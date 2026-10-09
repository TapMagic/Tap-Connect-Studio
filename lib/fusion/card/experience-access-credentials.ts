import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ExperienceLibraryError } from "@/lib/fusion/card/experience-library";

export const EXPERIENCE_CREDENTIAL_TYPES = ["PERMANENT", "ONE_TIME", "LIMITED", "EXPIRING"] as const;
export type ExperienceCredentialType = (typeof EXPERIENCE_CREDENTIAL_TYPES)[number];

export function hashExperienceCredential(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function evaluateExperienceCredential(input: {
  status: string;
  expiresAt: Date | null;
  redemptionLimit: number | null;
  redemptionCount: number;
}, now = new Date()): "valid" | "revoked" | "expired" | "exhausted" {
  if (input.status !== "ACTIVE") return "revoked";
  if (input.expiresAt && input.expiresAt <= now) return "expired";
  if (input.redemptionLimit != null && input.redemptionCount >= input.redemptionLimit) return "exhausted";
  return "valid";
}

export async function rotateExperienceCredential(input: {
  businessId: string;
  experienceId: string;
  credentialType?: ExperienceCredentialType;
  revokePrevious: boolean;
  redemptionLimit?: number | null;
  expiresAt?: Date | null;
}) {
  const credentialType = input.credentialType ?? "PERMANENT";
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashExperienceCredential(token);
  return prisma.$transaction(async (tx) => {
    const destination = await tx.experiencePublicDestination.findFirst({
      where: { businessId: input.businessId, experienceId: input.experienceId },
    });
    if (!destination) throw new ExperienceLibraryError("Publish this Experience before generating a QR.", "not_found", 409);
    const previousActive = await tx.experienceAccessCredential.findMany({
      where: { destinationId: destination.id, status: "ACTIVE" },
      select: { id: true },
    });
    const previousActiveCount = previousActive.length;
    let previousRevokedCount = 0;
    if (input.revokePrevious) {
      const revoked = await tx.experienceAccessCredential.updateMany({
        where: { destinationId: destination.id, status: "ACTIVE" },
        data: { status: "REVOKED", revokedAt: new Date() },
      });
      previousRevokedCount = revoked.count;
    }
    const redemptionLimit = credentialType === "ONE_TIME"
      ? 1
      : credentialType === "LIMITED"
        ? Math.max(1, input.redemptionLimit ?? 1)
        : null;
    const credential = await tx.experienceAccessCredential.create({
      data: {
        businessId: input.businessId,
        destinationId: destination.id,
        tokenHash,
        tokenHint: token.slice(-8),
        credentialType,
        redemptionLimit,
        expiresAt: input.expiresAt ?? null,
      },
    });
    return { credential, token, destination, previousActiveCount, previousRevokedCount, revokedCredentialIds: input.revokePrevious ? previousActive.map((item) => item.id) : [] };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function redeemExperienceCredential(token: string) {
  const tokenHash = hashExperienceCredential(token);
  return prisma.$transaction(async (tx) => {
    const credential = await tx.experienceAccessCredential.findUnique({
      where: { tokenHash },
      include: { destination: true },
    });
    const now = new Date();
    if (!credential) return { state: "invalid" as const };
    const validity = evaluateExperienceCredential(credential, now);
    if (validity === "expired") {
      await tx.experienceAccessCredential.update({ where: { id: credential.id }, data: { status: "EXPIRED" } });
      return { state: "expired" as const };
    }
    if (validity !== "valid") return { state: validity as "revoked" | "exhausted" };
    const claim = await tx.experienceAccessCredential.updateMany({
      where: {
        id: credential.id,
        status: "ACTIVE",
        ...(credential.redemptionLimit == null ? {} : { redemptionCount: { lt: credential.redemptionLimit } }),
      },
      data: { redemptionCount: { increment: 1 }, lastUsedAt: now },
    });
    if (claim.count !== 1) return { state: "exhausted" as const };
    return { state: "valid" as const, slug: credential.destination.slug };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
