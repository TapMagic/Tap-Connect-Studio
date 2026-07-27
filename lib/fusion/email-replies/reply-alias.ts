/**
 * Opaque reply-routing tokens — no DB ids, emails, or names in the public token.
 */

import { createHash, randomBytes } from "node:crypto";
import type { ReplyHandlingMode } from "./types";

export const REPLY_ALIAS_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

export type ReplyAliasContext = {
  businessId: string;
  campaignId?: string | null;
  contactId?: string | null;
  relationshipId?: string | null;
  originatingMessageRef?: string | null;
  emailDocumentVersion?: number | null;
  replyPolicyMode?: ReplyHandlingMode | null;
  destinationId?: string | null;
};

export function hashReplyToken(token: string): string {
  return createHash("sha256").update(`reply-alias:${token}`).digest("hex");
}

export function generateOpaqueReplyToken(): string {
  // 24 bytes → ~32 chars base64url — guessing resistant
  return randomBytes(24).toString("base64url");
}

export function buildReplyAliasAddress(input: {
  token: string;
  receivingSubdomain: string;
}): string {
  const domain = input.receivingSubdomain.replace(/^@/, "").trim().toLowerCase();
  return `reply+${input.token}@${domain}`;
}

export function parseReplyAliasAddress(address: string): {
  ok: true;
  token: string;
  domain: string;
} | { ok: false; reason: string } {
  const trimmed = address.trim();
  const m = /^reply\+([A-Za-z0-9_-]+)@(.+)$/i.exec(trimmed);
  if (!m) return { ok: false, reason: "Not a TapConnect reply alias." };
  const token = m[1];
  const domain = m[2].toLowerCase();
  if (!token || token.length < 16) {
    return { ok: false, reason: "Invalid or truncated reply token." };
  }
  return { ok: true, token, domain };
}

export function evaluateReplyAlias(input: {
  alias: {
    businessId: string;
    expiresAt: string;
    deactivatedAt?: string | null;
  } | null;
  expectedBusinessId?: string | null;
  now?: Date;
}):
  | { ok: true }
  | {
      ok: false;
      code: "not_found" | "expired" | "deactivated" | "cross_business";
    } {
  if (!input.alias) return { ok: false, code: "not_found" };
  if (
    input.expectedBusinessId &&
    input.alias.businessId !== input.expectedBusinessId
  ) {
    return { ok: false, code: "cross_business" };
  }
  if (input.alias.deactivatedAt) return { ok: false, code: "deactivated" };
  const now = input.now ?? new Date();
  if (new Date(input.alias.expiresAt).getTime() <= now.getTime()) {
    return { ok: false, code: "expired" };
  }
  return { ok: true };
}

export function createAliasExpiry(now = new Date()): Date {
  return new Date(now.getTime() + REPLY_ALIAS_TTL_MS);
}
