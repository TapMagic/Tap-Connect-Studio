/**
 * Card Action Registry — durable, provider-neutral action architecture.
 * Preserves all V1 TapCardActionKind values and extends with fuse-box capabilities.
 * Do not hardcode every future pillar into TapConnectCard — register adapters here.
 */

import {
  TAP_CARD_ACTION_CATALOG,
  type TapCardActionKind,
} from "@/lib/brand/tap-card";

export const CARD_ACTION_REGISTRY_VERSION = 1 as const;

export type CardActionCategory =
  | "contact"
  | "web"
  | "social"
  | "commerce"
  | "booking"
  | "retention"
  | "support"
  | "loyalty"
  | "journey"
  | "custom";

export type CardActionAvailability = "public" | "personalized" | "host_only";

export type CardActionRuntime =
  | "url"
  | "protocol"
  | "local_ux"
  | "platform_bound";

export type CardActionConsentPurpose =
  | "none"
  | "service"
  | "support"
  | "marketing"
  | "loyalty"
  | "transactional";

export type CardActionDefinition = {
  kind: TapCardActionKind;
  version: number;
  label: string;
  icon: string;
  category: CardActionCategory;
  runtime: CardActionRuntime;
  /** V1 catalog kinds — must remain available forever */
  v1Preserved: boolean;
  availability: CardActionAvailability[];
  consentPurpose: CardActionConsentPurpose;
  featureIds: string[];
  entitlement?: string;
  requiredProviders: string[];
  analyticsEvent: string;
  evidenceClaim: string;
  placeholder?: string;
  fallbackKind?: TapCardActionKind;
  description: string;
};

const V1_CATEGORY: Partial<Record<TapCardActionKind, CardActionCategory>> = {
  vcard: "retention",
  call: "contact",
  email: "contact",
  sms: "contact",
  website: "web",
  map: "web",
  review: "web",
  calendar: "booking",
  shop: "commerce",
  book: "booking",
  homescreen: "retention",
  bookmark: "retention",
  instagram: "social",
  facebook: "social",
  tiktok: "social",
  snapchat: "social",
  x: "social",
  youtube: "social",
  linkedin: "social",
  whatsapp: "social",
  yelp: "social",
  custom: "custom",
  support: "support",
};

const V1_RUNTIME: Partial<Record<TapCardActionKind, CardActionRuntime>> = {
  vcard: "local_ux",
  call: "protocol",
  email: "protocol",
  sms: "protocol",
  homescreen: "local_ux",
  bookmark: "local_ux",
  support: "platform_bound",
};

/** Authoritative registered actions — V1 kinds first, then fuse extensions. */
export const CARD_ACTION_DEFINITIONS: CardActionDefinition[] = [
  ...TAP_CARD_ACTION_CATALOG.filter((c) => c.kind !== "support").map((c) => {
    const runtime = V1_RUNTIME[c.kind] ?? "url";
    return {
      kind: c.kind,
      version: 1,
      label: c.label,
      icon: c.icon,
      category: V1_CATEGORY[c.kind] ?? "custom",
      runtime,
      v1Preserved: true,
      availability: ["public", "personalized"] as CardActionAvailability[],
      consentPurpose: "none" as CardActionConsentPurpose,
      featureIds: ["card.builder.v1"],
      requiredProviders: [] as string[],
      analyticsEvent: `card.action.${c.kind}`,
      evidenceClaim: `Customer invoked Card action ${c.kind}`,
      placeholder: c.placeholder,
      description: `V1 Card action: ${c.label}`,
    };
  }),
  {
    kind: "support",
    version: 1,
    label: "Ask a Question",
    icon: "mail",
    category: "support",
    runtime: "platform_bound",
    v1Preserved: false,
    availability: ["public", "personalized"],
    consentPurpose: "support",
    featureIds: ["card.fuse.support", "comms.inbox"],
    entitlement: "comms.support",
    requiredProviders: [],
    analyticsEvent: "card.support.submitted",
    evidenceClaim: "Customer submitted a support question from the Card",
    description:
      "Opens an in-Card question form, creates Contact/Relationship/Consent, TapInbox thread, optional TapCase, and a human-reviewed suggested reply.",
    fallbackKind: "email",
  },
];

export function listCardActions(): CardActionDefinition[] {
  return CARD_ACTION_DEFINITIONS;
}

export function getCardAction(kind: TapCardActionKind): CardActionDefinition | undefined {
  return CARD_ACTION_DEFINITIONS.find((d) => d.kind === kind);
}

export function listV1PreservedActions(): CardActionDefinition[] {
  return CARD_ACTION_DEFINITIONS.filter((d) => d.v1Preserved);
}

export function listActionsByCategory(category: CardActionCategory): CardActionDefinition[] {
  return CARD_ACTION_DEFINITIONS.filter((d) => d.category === category);
}

export function assertV1ActionParity(kinds: readonly TapCardActionKind[]): {
  ok: boolean;
  missing: TapCardActionKind[];
} {
  const preserved = new Set(listV1PreservedActions().map((d) => d.kind));
  const missing = kinds.filter((k) => k !== "support" && !preserved.has(k));
  return { ok: missing.length === 0, missing };
}

export type ActionEligibilityInput = {
  kind: TapCardActionKind;
  featureEnabled: (id: string) => boolean;
  isPersonalized?: boolean;
  providersReady?: Record<string, boolean>;
};

export type ActionEligibilityResult =
  | { ok: true; definition: CardActionDefinition }
  | {
      ok: false;
      code: "unknown" | "feature_off" | "availability" | "provider_missing";
      message: string;
      fallbackKind?: TapCardActionKind;
    };

export function evaluateActionEligibility(
  input: ActionEligibilityInput
): ActionEligibilityResult {
  const definition = getCardAction(input.kind);
  if (!definition) {
    return { ok: false, code: "unknown", message: `Unknown action kind: ${input.kind}` };
  }

  for (const featureId of definition.featureIds) {
    if (!input.featureEnabled(featureId)) {
      return {
        ok: false,
        code: "feature_off",
        message: `Feature ${featureId} is off`,
        fallbackKind: definition.fallbackKind,
      };
    }
  }

  const availability = input.isPersonalized
    ? definition.availability.includes("personalized") ||
      definition.availability.includes("public")
    : definition.availability.includes("public");
  if (!availability) {
    return {
      ok: false,
      code: "availability",
      message: "Action not available in this Card context",
      fallbackKind: definition.fallbackKind,
    };
  }

  for (const provider of definition.requiredProviders) {
    if (input.providersReady && input.providersReady[provider] === false) {
      return {
        ok: false,
        code: "provider_missing",
        message: `Provider ${provider} is not ready`,
        fallbackKind: definition.fallbackKind,
      };
    }
  }

  return { ok: true, definition };
}
