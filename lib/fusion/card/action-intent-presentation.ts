import { CARD_ACTION_DEFINITIONS } from "./action-registry";
import type { TapCardActionKind } from "@/lib/brand/tap-card";

export type StandardButtonActionIntent = "website" | "call" | "email" | "sms" | "map" | "review" | "book" | "internal_page";

export type StandardButtonActionPresentation = {
  kind: StandardButtonActionIntent;
  label: string;
  fieldLabel: string;
  placeholder: string;
  inputMode: "url" | "tel" | "email" | "text";
};

export type ReconciledActionIntent = {
  kind: StandardButtonActionIntent;
  destination: string;
  source: "destination-scheme" | "explicit-intent" | "http-default" | "fallback";
};

const PRESENTATION: Record<StandardButtonActionIntent, Omit<StandardButtonActionPresentation, "kind" | "label">> = {
  website: { fieldLabel: "Website URL", placeholder: "https://example.com", inputMode: "url" },
  call: { fieldLabel: "Phone number", placeholder: "+1 555 555 0123", inputMode: "tel" },
  email: { fieldLabel: "Email address", placeholder: "hello@example.com", inputMode: "email" },
  sms: { fieldLabel: "Text number", placeholder: "+1 555 555 0123", inputMode: "tel" },
  map: { fieldLabel: "Address or map destination", placeholder: "123 Main Street", inputMode: "text" },
  review: { fieldLabel: "Review URL", placeholder: "https://…", inputMode: "url" },
  book: { fieldLabel: "Booking URL", placeholder: "https://…", inputMode: "url" },
  internal_page: { fieldLabel: "Experience Page", placeholder: "Choose a Page", inputMode: "text" },
};

export function standardButtonActions(): StandardButtonActionPresentation[] {
  const allowed = new Set<StandardButtonActionIntent>(["website", "call", "email", "sms", "map", "review", "book"]);
  const registered = CARD_ACTION_DEFINITIONS.flatMap((definition) => {
    if (!allowed.has(definition.kind as StandardButtonActionIntent)) return [];
    const kind = definition.kind as StandardButtonActionIntent;
    return [{ kind, label: kind === "sms" ? "Text" : kind === "map" ? "Directions" : kind === "book" ? "Booking" : definition.label.replace(/^Click to /, ""), ...PRESENTATION[kind] }];
  });
  return [...registered, { kind: "internal_page" as const, label: "Experience Page", ...PRESENTATION.internal_page }];
}

export function normalizeActionDestination(kind: StandardButtonActionIntent, value: string): string {
  const trimmed = value.trim();
  if (kind === "call") return trimmed.replace(/^tel:/i, "").replace(/[^+\d]/g, "");
  if (kind === "sms") return trimmed.replace(/^(?:sms|smsto):/i, "").replace(/[^+\d]/g, "");
  if (kind === "email") return trimmed.replace(/^mailto:/i, "");
  return trimmed;
}

function registeredIntent(value: unknown): StandardButtonActionIntent | null {
  const normalized = value === "text" || value === "sms" ? "sms" : value === "directions" || value === "map" ? "map" : value;
  return standardButtonActions().some((action) => action.kind === normalized)
    ? normalized as StandardButtonActionIntent
    : null;
}

export function inferActionIntentFromDestination(value: string): StandardButtonActionIntent | null {
  const destination = value.trim();
  if (/^tel:/i.test(destination)) return "call";
  if (/^mailto:/i.test(destination)) return "email";
  if (/^(?:sms|smsto):/i.test(destination)) return "sms";
  if (/^geo:/i.test(destination)) return "map";
  if (/^(?:https?:\/\/)?(?:maps\.apple\.com|(?:www\.)?google\.[^/]+\/maps|maps\.google\.|goo\.gl\/maps|waze\.com\/ul)/i.test(destination)) return "map";
  return null;
}

/**
 * Reconciles stored explicit state with an unambiguous destination authority.
 * Protocol destinations win over incompatible historical state. HTTP(S) keeps
 * registered web sub-intents (Directions, Review, Booking) and otherwise
 * presents as Website.
 */
export function reconcileActionIntent(
  explicitKind: unknown,
  value: string,
): ReconciledActionIntent {
  const destination = value.trim();
  const schemeIntent = inferActionIntentFromDestination(destination);
  if (schemeIntent) return { kind: schemeIntent, destination, source: "destination-scheme" };
  const explicit = registeredIntent(explicitKind);
  if (/^https?:\/\//i.test(destination)) {
    const safeExplicit = explicit && ["website", "map", "review", "book"].includes(explicit) ? explicit : "website";
    return { kind: safeExplicit, destination, source: explicit === safeExplicit ? "explicit-intent" : "http-default" };
  }
  if (explicit) return { kind: explicit, destination, source: "explicit-intent" };
  return { kind: "website", destination, source: "fallback" };
}

export function validateActionDestination(kind: StandardButtonActionIntent, value: string): string | null {
  const normalized = normalizeActionDestination(kind, value);
  if (!normalized) return "Enter a destination.";
  if (kind === "internal_page") return /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/.test(normalized) ? null : "Choose a valid Experience Page.";
  if (kind === "call" || kind === "sms") return /^\+?\d{7,15}$/.test(normalized) ? null : "Enter a valid phone number.";
  if (kind === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? null : "Enter a valid email address.";
  if (kind === "map") return normalized.length >= 3 ? null : "Enter an address or map destination.";
  try {
    const url = new URL(normalized);
    return url.protocol === "http:" || url.protocol === "https:" ? null : "Use an http or https URL.";
  } catch {
    return "Enter a complete URL beginning with https://";
  }
}

export function actionProps(kind: StandardButtonActionIntent, value: string): Record<string, unknown> {
  const normalized = normalizeActionDestination(kind, value);
  if (kind === "internal_page") return { actionType: "internal_page", internalPageId: normalized, destinationRef: normalized, href: "" };
  const href = kind === "call"
    ? `tel:${normalized}`
    : kind === "sms"
      ? `sms:${normalized}`
      : kind === "email"
        ? `mailto:${normalized}`
        : normalized;
  return { actionType: kind satisfies TapCardActionKind, href };
}
