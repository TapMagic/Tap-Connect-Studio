/**
 * Certified outcome recipe stubs (F0).
 * One certified recipe only: card.offer.measurable @ 1.0.0
 *
 * Distinct from the campaign generation catalog in ./recipes.ts
 * (AUTOPILOT_RECIPES / AutopilotRecipe) which remains authoritative for J16 generation.
 */

import type { ObjectMutation } from "./plan";
import type { ApprovalLevel } from "./approval-policy";

export const CERTIFIED_RECIPE_SCHEMA_VERSION = "1.0.0" as const;

export const CARD_OFFER_MEASURABLE_RECIPE_ID = "card.offer.measurable" as const;
export const CARD_OFFER_MEASURABLE_VERSION = "1.0.0" as const;

export type RecipeInputSpec = {
  key: string;
  label: string;
  required: boolean;
  /** Fact kinds that must be authoritative when this input is present */
  authoritativeFactKinds?: string[];
  description?: string;
};

export type RecipeSimulationCase = {
  id: string;
  name: string;
  description: string;
  /** Expected outcome classification — runtime not implemented in F0 */
  expect: "pass" | "block" | "fallback";
};

export type CertifiedOutcomeRecipe = {
  id: typeof CARD_OFFER_MEASURABLE_RECIPE_ID | string;
  version: string;
  recipeSchemaVersion: string;
  name: string;
  description: string;
  requiredInputs: RecipeInputSpec[];
  optionalInputs: RecipeInputSpec[];
  authoritativeFactsRequired: string[];
  objectMutations: ObjectMutation[];
  approvals: ApprovalLevel[];
  providers: string[];
  simulationCases: RecipeSimulationCase[];
  successMetrics: Array<{ id: string; name: string; measure: string }>;
  fallback: { strategy: string; description: string };
  stopConditions: string[];
  rollback: { strategy: string; description: string };
  /** Offer Fuse / SoT encoding declarations */
  sourceOfTruth: {
    offerOwner: "campaign.offer_coupon";
    cardSpotlight: "projection";
    email: "distribution_variant";
    tapcast: "distribution_variant";
    followUp: "guardian_and_consent_gated";
    insights: "offer_fuse_events";
    duplicateOfferSourceOfTruth: false;
    liveSending: false;
    wallet: false;
    tapflowBind: false;
    taploopEnrollment: false;
  };
};

/** Object-mutation rules encoding Campaign ownership + projection boundaries */
export const CARD_OFFER_MEASURABLE_MUTATIONS: ObjectMutation[] = [
  {
    id: "mutate.campaign.offer_coupon",
    kind: "update",
    target: "campaign.offer_coupon",
    ownership: "authoritative",
    description:
      "Campaign offer_coupon owns authoritative offer facts (title, terms, code, expiry, CTA).",
  },
  {
    id: "mutate.card.spotlight.project",
    kind: "project",
    target: "card.spotlight",
    ownership: "projection",
    description: "Card Spotlight is a projection of Campaign offer facts; presentation-only overrides allowed.",
    payload: { presentationOnly: true },
  },
  {
    id: "mutate.distribution.email.variant",
    kind: "prepare_distribution",
    target: "distribution.email",
    ownership: "variant",
    description: "Email is a Distribution variant of the same Campaign offer; no duplicate offer SoT.",
    payload: { mock: true, liveSend: false },
  },
  {
    id: "mutate.distribution.tapcast.variant",
    kind: "prepare_distribution",
    target: "distribution.tapcast",
    ownership: "variant",
    description: "TapCast is a Distribution variant of the same Campaign offer; not published live in F0.",
    payload: { mock: true, livePublish: false },
  },
  {
    id: "mutate.follow_up.gate",
    kind: "gate",
    target: "guardian",
    ownership: "gate",
    description: "Follow-up is Guardian and Consent gated; never auto-send without valid consent path.",
    payload: { alsoRequires: "consent" },
  },
  {
    id: "mutate.insights.offer_fuse",
    kind: "measure",
    target: "insights",
    ownership: "measure",
    description: "Insights goals use offer-fuse events (viewed/claimed/lead/keep).",
    payload: {
      events: ["card.offer.viewed", "card.offer.claimed", "card.offer.lead", "card.offer.kept"],
    },
  },
  {
    id: "forbid.duplicate.offer.sot",
    kind: "forbid",
    target: "card.spotlight",
    ownership: "forbidden",
    prohibited: true,
    description: "No duplicate offer source of truth on Card, email, or TapCast.",
    payload: { inventOfferFacts: true },
  },
  {
    id: "forbid.live.sending",
    kind: "forbid",
    target: "provider.live",
    ownership: "forbidden",
    prohibited: true,
    description: "No live sending in this recipe.",
    payload: { liveProvider: true },
  },
  {
    id: "forbid.wallet",
    kind: "forbid",
    target: "wallet",
    ownership: "forbidden",
    prohibited: true,
    description: "No Wallet in this recipe.",
  },
  {
    id: "forbid.tapflow.bind",
    kind: "forbid",
    target: "tapflow",
    ownership: "forbidden",
    prohibited: true,
    description: "No TapFlow bind in this recipe.",
  },
  {
    id: "forbid.taploop.enrollment",
    kind: "forbid",
    target: "taploop",
    ownership: "forbidden",
    prohibited: true,
    description: "No TapLoop enrollment in this recipe.",
  },
];

export const CARD_OFFER_MEASURABLE_RECIPE: CertifiedOutcomeRecipe = {
  id: CARD_OFFER_MEASURABLE_RECIPE_ID,
  version: CARD_OFFER_MEASURABLE_VERSION,
  recipeSchemaVersion: CERTIFIED_RECIPE_SCHEMA_VERSION,
  name: "Measurable Card offer",
  description:
    "Governed outcome: put a Campaign-owned offer on the Card Spotlight, prepare Distribution variants, measure offer-fuse events. No live send, Wallet, TapFlow, or TapLoop.",
  requiredInputs: [
    {
      key: "campaign_id",
      label: "Campaign",
      required: true,
      authoritativeFactKinds: ["offer.title", "offer.description", "offer.cta"],
      description: "Campaign that owns the authoritative offer_coupon.",
    },
    {
      key: "offer_block_id",
      label: "Offer coupon block",
      required: true,
      authoritativeFactKinds: ["offer.title", "offer.description", "offer.cta"],
      description: "Campaign offer_coupon block id.",
    },
    {
      key: "card_id",
      label: "Tap Card",
      required: true,
      description: "Card that will project Spotlight from Campaign facts.",
    },
  ],
  optionalInputs: [
    {
      key: "offer_code",
      label: "Offer code",
      required: false,
      authoritativeFactKinds: ["offer.code"],
      description: "Optional code; must come from Campaign facts, never invented.",
    },
    {
      key: "offer_expires_at",
      label: "Offer expiry",
      required: false,
      authoritativeFactKinds: ["offer.expires_at"],
    },
    {
      key: "distribution_channels",
      label: "Distribution channels",
      required: false,
      description: "email and/or tapcast_social mock packages only.",
    },
    {
      key: "device_code",
      label: "Tap Point device code",
      required: false,
    },
  ],
  authoritativeFactsRequired: [
    "offer.title",
    "offer.description",
    "offer.cta",
    "campaign.id",
    "card.id",
  ],
  objectMutations: CARD_OFFER_MEASURABLE_MUTATIONS,
  approvals: [
    "automatic_within_limits",
    "review_before_publish",
    "review_before_send",
    "prohibited",
  ],
  providers: ["mock.distribution", "none"],
  simulationCases: [
    {
      id: "sim.happy_path",
      name: "Bound Spotlight from Campaign offer",
      description: "Authoritative offer present; Spotlight projects; no live send.",
      expect: "pass",
    },
    {
      id: "sim.missing_offer",
      name: "Missing offer facts",
      description: "Required offer facts absent → missing_fact intervention.",
      expect: "block",
    },
    {
      id: "sim.invent_discount",
      name: "Invented discount prohibited",
      description: "Autopilot invents discount → policy_prohibited.",
      expect: "block",
    },
    {
      id: "sim.send_without_consent",
      name: "Send without consent",
      description: "Customer-contact send without consent path → prohibited.",
      expect: "block",
    },
    {
      id: "sim.stale_projection",
      name: "Stale Spotlight projection",
      description: "Fingerprint mismatch → fallback to refresh/review path.",
      expect: "fallback",
    },
  ],
  successMetrics: [
    { id: "m.viewed", name: "Offer views", measure: "card.offer.viewed" },
    { id: "m.claimed", name: "Offer claims", measure: "card.offer.claimed" },
    { id: "m.lead", name: "Offer leads", measure: "card.offer.lead" },
    { id: "m.kept", name: "Keep Card", measure: "card.offer.kept" },
  ],
  fallback: {
    strategy: "refresh_projection_or_configure",
    description:
      "If Spotlight is bound but Campaign offer is missing/stale, surface configure/partial honesty; never invent offer facts.",
  },
  stopConditions: [
    "Host stops the plan",
    "Confirmed contradiction on authoritative offer facts",
    "Hard budget ceiling exceeded",
    "Policy prohibits remaining mutations",
    "Required consent path invalid for any send step",
  ],
  rollback: {
    strategy: "unproject_spotlight_preserve_campaign",
    description:
      "Rollback clears Spotlight projection bind metadata and prepared Distribution packages; Campaign offer_coupon remains authoritative and unchanged.",
  },
  sourceOfTruth: {
    offerOwner: "campaign.offer_coupon",
    cardSpotlight: "projection",
    email: "distribution_variant",
    tapcast: "distribution_variant",
    followUp: "guardian_and_consent_gated",
    insights: "offer_fuse_events",
    duplicateOfferSourceOfTruth: false,
    liveSending: false,
    wallet: false,
    tapflowBind: false,
    taploopEnrollment: false,
  },
};

const CERTIFIED_RECIPES: CertifiedOutcomeRecipe[] = [CARD_OFFER_MEASURABLE_RECIPE];

export function getCertifiedRecipe(id: string, version?: string): CertifiedOutcomeRecipe | undefined {
  return CERTIFIED_RECIPES.find(
    (r) => r.id === id && (version == null || r.version === version)
  );
}

export function listCertifiedRecipes(): CertifiedOutcomeRecipe[] {
  return [...CERTIFIED_RECIPES];
}

export type RecipeInputGateResult =
  | { ok: true }
  | { ok: false; missing: string[]; message: string };

/**
 * Pure required-input gate for a certified recipe.
 * values: map of input key → provided value (truthy = present).
 */
export function gateCertifiedRecipeInputs(
  recipe: CertifiedOutcomeRecipe,
  values: Record<string, unknown>
): RecipeInputGateResult {
  const missing = recipe.requiredInputs
    .filter((input) => {
      const v = values[input.key];
      if (v == null) return true;
      if (typeof v === "string" && !v.trim()) return true;
      return false;
    })
    .map((input) => input.key);

  if (missing.length) {
    return {
      ok: false,
      missing,
      message: `Missing required inputs: ${missing.join(", ")}`,
    };
  }
  return { ok: true };
}

/** Assert Offer Fuse SoT encoding on the certified recipe */
export function assertOfferFuseSourceOfTruth(recipe: CertifiedOutcomeRecipe): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const sot = recipe.sourceOfTruth;
  if (sot.offerOwner !== "campaign.offer_coupon") {
    errors.push("offerOwner must be campaign.offer_coupon");
  }
  if (sot.cardSpotlight !== "projection") errors.push("cardSpotlight must be projection");
  if (sot.email !== "distribution_variant") errors.push("email must be distribution_variant");
  if (sot.tapcast !== "distribution_variant") errors.push("tapcast must be distribution_variant");
  if (sot.followUp !== "guardian_and_consent_gated") {
    errors.push("followUp must be guardian_and_consent_gated");
  }
  if (sot.insights !== "offer_fuse_events") errors.push("insights must be offer_fuse_events");
  if (sot.duplicateOfferSourceOfTruth !== false) {
    errors.push("duplicateOfferSourceOfTruth must be false");
  }
  if (sot.liveSending !== false) errors.push("liveSending must be false");
  if (sot.wallet !== false) errors.push("wallet must be false");
  if (sot.tapflowBind !== false) errors.push("tapflowBind must be false");
  if (sot.taploopEnrollment !== false) errors.push("taploopEnrollment must be false");

  const auth = recipe.objectMutations.find((m) => m.target === "campaign.offer_coupon");
  if (!auth || auth.ownership !== "authoritative") {
    errors.push("objectMutations must encode campaign.offer_coupon as authoritative");
  }
  const spotlight = recipe.objectMutations.find(
    (m) => m.id === "mutate.card.spotlight.project"
  );
  if (!spotlight || spotlight.ownership !== "projection") {
    errors.push("objectMutations must encode card.spotlight as projection");
  }
  for (const id of [
    "forbid.live.sending",
    "forbid.wallet",
    "forbid.tapflow.bind",
    "forbid.taploop.enrollment",
    "forbid.duplicate.offer.sot",
  ]) {
    if (!recipe.objectMutations.some((m) => m.id === id && m.prohibited)) {
      errors.push(`Missing prohibited mutation ${id}`);
    }
  }

  return { ok: errors.length === 0, errors };
}
