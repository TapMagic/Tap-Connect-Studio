/**
 * Small setup helpers for reply aliases / receiving domain.
 */

import { buildReplyAliasAddress as buildAddr } from "./reply-alias";
import { getReceivingSubdomain } from "./providers/resend-adapter";

export function getReceivingSubdomainSafe(): string {
  return getReceivingSubdomain() ?? "reply.tapconnect.local";
}

export function buildReplyAliasAddress(token: string): string {
  return buildAddr({ token, receivingSubdomain: getReceivingSubdomainSafe() });
}
