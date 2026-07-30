import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { ProviderCandidate } from "./providers/types";

const TOKEN_TTL_MS = 5 * 60 * 1000;
const TOKEN_VERSION = 1;

const providerCandidateSchema = z.object({
  provider: z.enum(["pexels", "logo_dev"]),
  providerAssetId: z.string().min(1).max(300),
  previewUrl: z.string().min(1).max(4_000),
  thumbnailUrl: z.string().min(1).max(4_000),
  altText: z.string().max(1_000),
  sourcePageUrl: z.string().url().max(4_000),
  creatorName: z.string().max(500).optional(),
  creatorUrl: z.string().url().max(4_000).optional(),
  width: z.number().int().positive().max(50_000).optional(),
  height: z.number().int().positive().max(50_000).optional(),
  mimeType: z.string().max(100),
  licenseCode: z.enum([
    "OWNER_SUPPLIED",
    "PEXELS",
    "NO_LICENSE_ASSERTED",
    "EXTERNAL_UNVERIFIED",
    "OTHER",
  ]),
  licenseUrl: z.string().url().max(4_000).optional(),
  attributionText: z.string().max(1_000),
  rightsNote: z.string().max(2_000),
  importDescriptor: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  treatment: z
    .object({
      theme: z.enum(["auto", "light", "dark"]).optional(),
      greyscale: z.boolean().optional(),
    })
    .optional(),
});

const providerPayloadSchema = z.object({
  version: z.literal(TOKEN_VERSION),
  kind: z.literal("provider"),
  businessId: z.string().min(1),
  expiresAt: z.number().int().positive(),
  candidate: providerCandidateSchema,
});

const externalPayloadSchema = z.object({
  version: z.literal(TOKEN_VERSION),
  kind: z.literal("external_url"),
  businessId: z.string().min(1),
  expiresAt: z.number().int().positive(),
  url: z.string().url().max(4_000),
  mimeType: z.string().max(100),
  sizeBytes: z.number().int().nonnegative().max(8 * 1024 * 1024),
  filename: z.string().max(300),
});

export type VerifiedProviderCandidate = z.infer<typeof providerPayloadSchema>;
export type VerifiedExternalCandidate = z.infer<typeof externalPayloadSchema>;

function signingSecret(): string {
  const configured = process.env.MEDIA_CANDIDATE_SIGNING_SECRET?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") {
    return "tapconnect-local-media-candidate-v1";
  }
  throw new Error("MEDIA_CANDIDATE_SIGNING_SECRET is not configured");
}

function signature(encodedPayload: string): Buffer {
  return createHmac("sha256", signingSecret()).update(encodedPayload).digest();
}

function encode(payload: unknown): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${signature(body).toString("base64url")}`;
}

function decode(token: string): unknown {
  const [body, encodedSignature, extra] = token.split(".");
  if (!body || !encodedSignature || extra) throw new Error("Invalid candidate token");
  const expected = signature(body);
  const actual = Buffer.from(encodedSignature, "base64url");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new Error("Invalid candidate token");
  }
  return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
}

function assertActive(expiresAt: number): void {
  if (expiresAt < Date.now()) throw new Error("Candidate token expired");
}

export function signProviderCandidate(
  businessId: string,
  candidate: ProviderCandidate,
  now = Date.now()
): string {
  return encode({
    version: TOKEN_VERSION,
    kind: "provider",
    businessId,
    expiresAt: now + TOKEN_TTL_MS,
    candidate,
  });
}

export function verifyProviderCandidate(
  token: string,
  businessId: string
): VerifiedProviderCandidate {
  const payload = providerPayloadSchema.parse(decode(token));
  assertActive(payload.expiresAt);
  if (payload.businessId !== businessId) throw new Error("Candidate belongs to another business");
  return payload;
}

export function signExternalCandidate(
  businessId: string,
  candidate: Omit<VerifiedExternalCandidate, "version" | "kind" | "businessId" | "expiresAt">,
  now = Date.now()
): string {
  return encode({
    version: TOKEN_VERSION,
    kind: "external_url",
    businessId,
    expiresAt: now + TOKEN_TTL_MS,
    ...candidate,
  });
}

export function verifyExternalCandidate(
  token: string,
  businessId: string
): VerifiedExternalCandidate {
  const payload = externalPayloadSchema.parse(decode(token));
  assertActive(payload.expiresAt);
  if (payload.businessId !== businessId) throw new Error("Candidate belongs to another business");
  return payload;
}
