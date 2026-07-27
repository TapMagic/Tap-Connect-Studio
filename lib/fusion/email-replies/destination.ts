/**
 * Email destination normalization + validation.
 */

import type { ReplyDestinationType, ReplyMessageCategory } from "./types";
import { REPLY_MESSAGE_CATEGORIES } from "./types";

const EMAIL_RE =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export function normalizeEmailAddress(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "");
}

export function isValidEmailAddress(raw: string): boolean {
  const n = normalizeEmailAddress(raw);
  if (!n || n.length > 320) return false;
  if (n.includes("..")) return false;
  return EMAIL_RE.test(n);
}

/** Accept ordinary email or system intake addresses (Monday, CRM, tickets). */
export function validateDestinationAddress(
  raw: string,
  type: ReplyDestinationType
): { ok: true; normalized: string } | { ok: false; error: string } {
  if (type === "TAP_INBOX") {
    return { ok: true, normalized: "tapinbox" };
  }
  if (type === "INTEGRATION" || type === "WEBHOOK") {
    const ref = raw.trim();
    if (!ref) return { ok: false, error: "Choose a connected destination." };
    return { ok: true, normalized: ref };
  }
  if (!isValidEmailAddress(raw)) {
    return {
      ok: false,
      error: "Enter a valid email or system intake address.",
    };
  }
  return { ok: true, normalized: normalizeEmailAddress(raw) };
}

export function parseMessageCategories(
  raw: unknown
): ReplyMessageCategory[] {
  if (!Array.isArray(raw) || raw.length === 0) return ["all"];
  const allowed = new Set<string>(REPLY_MESSAGE_CATEGORIES);
  const out = raw
    .filter((v): v is string => typeof v === "string")
    .filter((v) => allowed.has(v)) as ReplyMessageCategory[];
  return out.length > 0 ? out : ["all"];
}

export function categoryAccepts(
  selected: ReplyMessageCategory[],
  incoming: ReplyMessageCategory
): boolean {
  if (selected.includes("all")) return true;
  if (incoming === "all") return true;
  return selected.includes(incoming);
}

export function categoryHostLabel(cat: ReplyMessageCategory): string {
  switch (cat) {
    case "all":
      return "All replies";
    case "complaints":
      return "Complaints and service problems";
    case "questions":
      return "Questions and information requests";
    case "bookings":
      return "Booking or appointment requests";
    case "sales":
      return "Sales interest";
    case "other":
      return "Other replies";
  }
}
