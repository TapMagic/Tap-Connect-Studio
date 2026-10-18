import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ExperienceLibraryError } from "@/lib/fusion/card/experience-library";

export const EXPERIENCE_CREDENTIAL_TYPES = ["PERMANENT", "ONE_TIME", "LIMITED", "EXPIRING"] as const;
export type ExperienceCredentialType = (typeof EXPERIENCE_CREDENTIAL_TYPES)[number];

export function hashExperienceCredential(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

const PERSISTED_CREDENTIAL_TOKEN_VERSION = "tc1";

/**
 * Reconstructible public representation of a persisted credential.
 *
 * The stored token digest remains secret server-side and acts as the HMAC key,
 * so the public URL can be recreated without retaining or disclosing the raw
 * bearer token that originally created the credential. Revocation, expiry, and
 * redemption remain properties of the same credential row.
 */
export function persistedExperienceCredentialToken(input: { id: string; tokenHash: string }) {
  const proof = createHmac("sha256", input.tokenHash)
    .update(`${PERSISTED_CREDENTIAL_TOKEN_VERSION}:${input.id}`)
    .digest("base64url");
  return `${PERSISTED_CREDENTIAL_TOKEN_VERSION}.${input.id}.${proof}`;
}

export function experienceCredentialAccessPath(input: { id: string; tokenHash: string }) {
  return `/x/${persistedExperienceCredentialToken(input)}`;
}

function parsePersistedCredentialToken(token: string) {
  const [version, id, proof, ...rest] = token.split(".");
  if (version !== PERSISTED_CREDENTIAL_TOKEN_VERSION || !id || !proof || rest.length) return null;
  return { id, proof };
}

function validPersistedCredentialProof(input: { id: string; tokenHash: string }, proof: string) {
  const expected = persistedExperienceCredentialToken(input).split(".")[2];
  const actualBuffer = Buffer.from(proof);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
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

export async function revokeExperienceCredential(input: {
  businessId: string;
  experienceId: string;
  credentialId: string;
}) {
  const credential = await prisma.experienceAccessCredential.findFirst({
    where: {
      id: input.credentialId,
      businessId: input.businessId,
      destination: { experienceId: input.experienceId },
    },
  });
  if (!credential) throw new ExperienceLibraryError("QR credential not found.", "not_found", 404);
  if (credential.status !== "ACTIVE") return { credential, changed: false };
  const revokedAt = new Date();
  const result = await prisma.experienceAccessCredential.updateMany({
    where: { id: credential.id, businessId: input.businessId, status: "ACTIVE" },
    data: { status: "REVOKED", revokedAt },
  });
  return {
    credential: result.count
      ? { ...credential, status: "REVOKED", revokedAt }
      : await prisma.experienceAccessCredential.findUniqueOrThrow({ where: { id: credential.id } }),
    changed: result.count === 1,
  };
}

export async function redeemExperienceCredential(token: string) {
  return prisma.$transaction(async (tx) => {
    const persisted = parsePersistedCredentialToken(token);
    const credential = persisted
      ? await tx.experienceAccessCredential.findUnique({ where: { id: persisted.id }, include: { destination: true } })
      : await tx.experienceAccessCredential.findUnique({ where: { tokenHash: hashExperienceCredential(token) }, include: { destination: true } });
    const now = new Date();
    if (!credential) return { state: "invalid" as const };
    if (persisted && !validPersistedCredentialProof(credential, persisted.proof)) return { state: "invalid" as const };
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
