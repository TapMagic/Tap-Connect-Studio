/**
 * Secure destination verification — hashed single-use tokens with expiry + rate limits.
 */

import { createHash, randomBytes } from "node:crypto";
import { normalizeEmailAddress } from "./destination";

export const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
export const VERIFICATION_RATE_LIMIT = 5;
export const VERIFICATION_RATE_WINDOW_MS = 60 * 60 * 1000;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateVerificationToken(): {
  token: string;
  tokenHash: string;
  expiresAt: Date;
} {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
  };
}

export type VerificationTokenRecord = {
  id: string;
  destinationId: string;
  businessId: string;
  tokenHash: string;
  expiresAt: string;
  usedAt?: string | null;
  createdAt: string;
};

export function evaluateVerificationToken(input: {
  presentedToken: string;
  record: VerificationTokenRecord | null;
  now?: Date;
  expectedBusinessId: string;
  expectedDestinationId: string;
}):
  | { ok: true }
  | {
      ok: false;
      code:
        | "not_found"
        | "expired"
        | "already_used"
        | "business_mismatch"
        | "destination_mismatch";
    } {
  if (!input.record) return { ok: false, code: "not_found" };
  if (input.record.businessId !== input.expectedBusinessId) {
    return { ok: false, code: "business_mismatch" };
  }
  if (input.record.destinationId !== input.expectedDestinationId) {
    return { ok: false, code: "destination_mismatch" };
  }
  if (input.record.usedAt) return { ok: false, code: "already_used" };
  const now = input.now ?? new Date();
  if (new Date(input.record.expiresAt).getTime() <= now.getTime()) {
    return { ok: false, code: "expired" };
  }
  const presentedHash = hashToken(input.presentedToken);
  if (presentedHash !== input.record.tokenHash) {
    return { ok: false, code: "not_found" };
  }
  return { ok: true };
}

export function canResendVerification(input: {
  recentSendsInWindow: number;
  limit?: number;
}): { ok: true } | { ok: false; code: "rate_limited"; retryAfterHint: string } {
  const limit = input.limit ?? VERIFICATION_RATE_LIMIT;
  if (input.recentSendsInWindow >= limit) {
    return {
      ok: false,
      code: "rate_limited",
      retryAfterHint: "Try again later. Verification emails are rate-limited.",
    };
  }
  return { ok: true };
}

export function addressesMatch(a: string, b: string): boolean {
  return normalizeEmailAddress(a) === normalizeEmailAddress(b);
}

/** Block routing to unverified / revoked destinations */
export function canRouteToDestination(input: {
  verificationStatus: string;
  enabled: boolean;
  paused: boolean;
}): { ok: true } | { ok: false; reason: string } {
  if (!input.enabled) return { ok: false, reason: "Destination is disabled." };
  if (input.paused) return { ok: false, reason: "Destination is paused." };
  if (input.verificationStatus === "REVOKED") {
    return { ok: false, reason: "Destination was revoked." };
  }
  if (input.verificationStatus !== "VERIFIED") {
    return {
      ok: false,
      reason: "Destination must be verified before receiving customer messages.",
    };
  }
  return { ok: true };
}

export const FAILURE_PAUSE_THRESHOLD = 3;

export function shouldPauseAfterFailures(consecutiveFailureCount: number): boolean {
  return consecutiveFailureCount >= FAILURE_PAUSE_THRESHOLD;
}
