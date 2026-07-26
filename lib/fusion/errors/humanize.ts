/**
 * Host-facing error language — never lead with Prisma / stack / provider internals.
 */

export type HumanError = {
  /** Plain-language summary for the host */
  title: string;
  /** One short sentence of what to do next */
  action?: string;
  /** Technical detail for “View details” only */
  details?: string;
};

const PRISMA_SCENT =
  /prisma|invocation in|invalid\s*`?prisma|P\d{4}\b|unique constraint|foreign key|relation\s+`/i;
const STACK_SCENT = /^\s*at\s+\S+|Error:\s*|TypeError:|ReferenceError:/m;
const INTERNAL_ID_SCENT = /\b(cl[a-z0-9]{20,}|cuid|uuid)\b/i;

/**
 * Map unknown thrown/API values into host-safe copy.
 * Preserves original text under `details` when useful for support.
 */
export function humanizeError(
  input: unknown,
  fallback = "Something went wrong. Try again, or open Settings to check workspace health."
): HumanError {
  const raw =
    typeof input === "string"
      ? input
      : input instanceof Error
        ? input.message
        : input && typeof input === "object" && "error" in input
          ? String((input as { error: unknown }).error)
          : "";

  const text = raw.trim();
  if (!text) {
    return { title: fallback };
  }

  if (PRISMA_SCENT.test(text) || STACK_SCENT.test(text)) {
    return {
      title: "We couldn’t save or load that right now.",
      action: "Try again in a moment. If it keeps happening, open Settings → recovery.",
      details: text.slice(0, 2000),
    };
  }

  if (/ECONNREFUSED|ETIMEDOUT|fetch failed|network/i.test(text)) {
    return {
      title: "Connection issue — we couldn’t reach the service.",
      action: "Check your network, then retry.",
      details: text.slice(0, 2000),
    };
  }

  if (/unauthorized|forbidden|not authenticated|401|403/i.test(text)) {
    return {
      title: "You don’t have permission for that action.",
      action: "Sign in again, or ask a workspace admin.",
      details: text.slice(0, 2000),
    };
  }

  if (/not found|404/i.test(text)) {
    return {
      title: "We couldn’t find that item.",
      action: "It may have been deleted or moved — refresh and try from the list.",
      details: text.slice(0, 2000),
    };
  }

  // Already human-ish: keep short title; stash long/technical remainder
  if (text.length > 160 || INTERNAL_ID_SCENT.test(text)) {
    const title = text.split(/[\n.]/)[0]!.slice(0, 120).trim() || fallback;
    return {
      title: title.endsWith(".") ? title : `${title}.`,
      details: text.slice(0, 2000),
    };
  }

  return { title: text };
}
