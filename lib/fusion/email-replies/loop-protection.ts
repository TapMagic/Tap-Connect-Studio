/**
 * Loop / abuse protections for reply routing.
 */

import { normalizeEmailAddress } from "./destination";

const AUTOREPLY_HEADERS = [
  "auto-submitted",
  "x-auto-response-suppress",
  "precedence",
];

const AUTOREPLY_SUBJECT =
  /^(auto[:\s-]?reply|automatic reply|out of office|vacation|away from (the )?office|ooo:)/i;

const MAILER_DAEMON =
  /^(mailer-daemon|postmaster|mail-daemon)@/i;

export function isMailerDaemonAddress(from: string): boolean {
  return MAILER_DAEMON.test(normalizeEmailAddress(from));
}

export function isAutoResponder(input: {
  from: string;
  subject?: string | null;
  headers?: Record<string, string> | null;
}): boolean {
  if (isMailerDaemonAddress(input.from)) return true;
  if (input.subject && AUTOREPLY_SUBJECT.test(input.subject.trim())) return true;
  const headers = input.headers ?? {};
  for (const key of AUTOREPLY_HEADERS) {
    const v = headers[key] ?? headers[key.toLowerCase()];
    if (!v) continue;
    const lower = v.toLowerCase();
    if (key === "auto-submitted" && lower !== "no") return true;
    if (key === "precedence" && /(bulk|junk|list|auto_reply)/i.test(lower)) return true;
    if (key === "x-auto-response-suppress") return true;
  }
  return false;
}

export function isForwardingLoop(input: {
  from: string;
  toAddresses: string[];
  replyAlias?: string | null;
  tapOutboundAddresses: string[];
  destinationAddress?: string | null;
}): { loop: boolean; reason?: string } {
  const from = normalizeEmailAddress(input.from);
  const outbound = new Set(input.tapOutboundAddresses.map(normalizeEmailAddress));
  if (outbound.has(from)) {
    return { loop: true, reason: "Reply originated from a TapConnect outbound address." };
  }
  if (input.replyAlias) {
    const alias = normalizeEmailAddress(input.replyAlias);
    if (from === alias) {
      return { loop: true, reason: "From address equals inbound reply alias." };
    }
    if (
      input.destinationAddress &&
      normalizeEmailAddress(input.destinationAddress) === alias
    ) {
      return { loop: true, reason: "Destination equals inbound reply alias." };
    }
  }
  for (const to of input.toAddresses) {
    if (outbound.has(normalizeEmailAddress(to)) && outbound.has(from)) {
      return { loop: true, reason: "Inbound and outbound addresses form a loop." };
    }
  }
  return { loop: false };
}

export function isOversizedRetry(attemptNumber: number, max = 5): boolean {
  return attemptNumber > max;
}
