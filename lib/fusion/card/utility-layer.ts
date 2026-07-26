/**
 * Persistent Card utility layer — resolves host-configured utilities that remain
 * available when a Campaign or temporary Experience is active.
 * Uses Card Action Registry eligibility; does not hardcode support into every renderer.
 */

import type { BrandContactProfile } from "@/lib/brand/contact-profile";
import {
  resolveActionHref,
  type CardUtilityKind,
  type CardUtilityLayerSettings,
  type CardUtilityPresentation,
  type CardUtilityToggle,
  type TapCardSection,
  type TapConnectCardConfig,
} from "@/lib/brand/tap-card";
import { evaluateActionEligibility } from "./action-registry";

export const CARD_UTILITY_LAYER_VERSION = 1 as const;

export type ResolvedCardUtility = {
  kind: CardUtilityKind;
  label: string;
  enabled: boolean;
  /** Registry / feature gated */
  eligible: boolean;
  reason?: string;
  href?: string;
  /** For support — open in-layer form rather than navigate */
  runtime: "local_ux" | "url" | "platform_bound";
  analyticsEvent: string;
};

export type ResolveUtilityLayerInput = {
  card: TapConnectCardConfig;
  profile: BrandContactProfile;
  reviewUrl?: string | null;
  featureEnabled: (id: string) => boolean;
  /** tapsave.core executable */
  keepCardEnabled?: boolean;
  /** Override host toggles (Studio preview) */
  hostOverrides?: CardUtilityLayerSettings;
};

export type ResolvedUtilityLayer = {
  version: typeof CARD_UTILITY_LAYER_VERSION;
  enabled: boolean;
  presentation: CardUtilityPresentation;
  utilities: ResolvedCardUtility[];
  /** True when at least one eligible utility will render */
  visible: boolean;
};

const DEFAULT_TOGGLES: CardUtilityToggle[] = [
  { kind: "keep", enabled: true, label: "Keep this Card" },
  { kind: "support", enabled: true, label: "Ask a Question" },
  { kind: "vcard", enabled: true, label: "Save Contact" },
  { kind: "map", enabled: true, label: "Directions" },
  { kind: "book", enabled: true, label: "Book" },
  { kind: "shop", enabled: true, label: "Pay" },
];

const LABELS: Record<CardUtilityKind, string> = {
  keep: "Keep this Card",
  support: "Ask a Question",
  vcard: "Save Contact",
  map: "Directions",
  book: "Book",
  shop: "Pay",
};

function findActionSection(
  sections: TapCardSection[],
  kind: CardUtilityKind
): TapCardSection | undefined {
  const actionKind =
    kind === "keep" ? null : kind === "support" ? "support" : kind === "vcard" ? "vcard" : kind;
  if (!actionKind) return undefined;
  return sections.find(
    (s) => s.type === "action" && s.enabled !== false && s.actionKind === actionKind
  );
}

function mergeToggles(
  settings?: CardUtilityLayerSettings
): CardUtilityToggle[] {
  const fromHost = settings?.utilities ?? [];
  const byKind = new Map<CardUtilityKind, CardUtilityToggle>();
  for (const d of DEFAULT_TOGGLES) byKind.set(d.kind, { ...d });
  for (const t of fromHost) {
    byKind.set(t.kind, {
      kind: t.kind,
      enabled: t.enabled !== false,
      label: t.label || byKind.get(t.kind)?.label,
    });
  }
  return Array.from(byKind.values());
}

/**
 * Resolve which Card utilities should appear on a public Tap Point / Campaign page.
 * Operational utilities outrank promotions — caller places this below campaign blocks.
 */
export function resolveCardUtilityLayer(
  input: ResolveUtilityLayerInput
): ResolvedUtilityLayer {
  const settings = input.hostOverrides ?? input.card.utilityLayer;
  const presentation: CardUtilityPresentation =
    settings?.presentation ?? "compact_row";
  const layerEnabled = settings?.enabled !== false && input.card.lifecycleStatus !== "retired";

  if (!layerEnabled) {
    return {
      version: CARD_UTILITY_LAYER_VERSION,
      enabled: false,
      presentation,
      utilities: [],
      visible: false,
    };
  }

  const toggles = mergeToggles(settings);
  const utilities: ResolvedCardUtility[] = [];

  for (const toggle of toggles) {
    if (!toggle.enabled) continue;
    const label = toggle.label || LABELS[toggle.kind];
    const section = findActionSection(input.card.sections, toggle.kind);

    if (toggle.kind === "keep") {
      const eligible = input.keepCardEnabled !== false;
      utilities.push({
        kind: "keep",
        label,
        enabled: true,
        eligible,
        reason: eligible ? undefined : "TapSave Keep is not available",
        runtime: "local_ux",
        analyticsEvent: "card.utility.keep",
      });
      continue;
    }

    if (toggle.kind === "support") {
      const eligibility = evaluateActionEligibility({
        kind: "support",
        featureEnabled: input.featureEnabled,
      });
      // Support may appear from host toggle even without an in-Card section —
      // that is the persistent layer purpose. Prefer section label when present.
      const supportLabel = section?.label || label;
      utilities.push({
        kind: "support",
        label: supportLabel,
        enabled: true,
        eligible: eligibility.ok,
        reason: eligibility.ok ? undefined : eligibility.message,
        runtime: "platform_bound",
        analyticsEvent: "card.support.submitted",
      });
      continue;
    }

    // map / book / shop / vcard — require configured action or resolvable href
    const href = section
      ? resolveActionHref(section, input.profile, input.reviewUrl)
      : toggle.kind === "vcard"
        ? undefined
        : undefined;

    const hasConfig =
      Boolean(section) ||
      (toggle.kind === "vcard" &&
        Boolean(input.profile.phone || input.profile.email || input.profile.displayName)) ||
      (toggle.kind === "map" && Boolean(input.profile.address)) ||
      (toggle.kind === "book" && Boolean(section?.href)) ||
      (toggle.kind === "shop" && Boolean(section?.href));

    if (!hasConfig && !section) {
      // Host enabled but nothing configured — skip silently (not an error surface)
      continue;
    }

    const eligibility =
      toggle.kind === "vcard"
        ? { ok: true as const }
        : evaluateActionEligibility({
            kind: toggle.kind,
            featureEnabled: input.featureEnabled,
          });

    utilities.push({
      kind: toggle.kind,
      label: section?.label || label,
      enabled: true,
      eligible:
        eligibility.ok &&
        (toggle.kind === "vcard" || Boolean(href) || Boolean(section)),
      reason: eligibility.ok ? undefined : eligibility.message,
      href: href,
      runtime: toggle.kind === "vcard" ? "local_ux" : "url",
      analyticsEvent: `card.utility.${toggle.kind}`,
    });
  }

  const visible = utilities.some((u) => u.eligible);
  return {
    version: CARD_UTILITY_LAYER_VERSION,
    enabled: true,
    presentation,
    utilities,
    visible,
  };
}

/** Default host settings for new / seeded Cards. */
export function defaultUtilityLayerSettings(): CardUtilityLayerSettings {
  return {
    enabled: true,
    presentation: "compact_row",
    utilities: [
      { kind: "keep", enabled: true, label: "Keep this Card" },
      { kind: "support", enabled: true, label: "Ask a Question" },
      { kind: "vcard", enabled: true, label: "Save Contact" },
      { kind: "map", enabled: true },
      { kind: "book", enabled: true },
      { kind: "shop", enabled: true },
    ],
  };
}

export function utilityLayerWhereUsedSummary(layer: ResolvedUtilityLayer): string {
  if (!layer.enabled) return "Utility layer off";
  const names = layer.utilities.filter((u) => u.eligible).map((u) => u.label);
  return names.length ? names.join(" · ") : "No eligible utilities";
}
