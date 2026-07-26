/**
 * Versioned live-activation orchestration contract (F3).
 * Evidence of coordinated go-live — not a competing offer or live source of truth.
 * Customer-live status is derived from Campaign, Card, resolver, and Insights domains.
 */

import type { HumanIntervention } from "./intervention";
import { validateHumanIntervention } from "./intervention";
import type { AuditRef, PreparedAuditAction } from "./prepared-execution";

export const LIVE_ACTIVATION_SCHEMA_VERSION = "1.0.0" as const;

export type LiveActivationStatus =
  | "pending_approval"
  | "activating"
  | "live"
  | "scheduled"
  | "paused"
  | "stopped"
  | "rolled_back"
  | "failed"
  | "manual_control";

export type LiveEntryPathKind = "tap_point" | "card_first" | "tap_point_group";

export type LiveEntryPath = {
  kind: LiveEntryPathKind;
  ref: string;
  label: string;
};

export type LiveActivationFingerprints = {
  plan: string;
  facts: string;
  offer: string;
  preparation: string;
};

export type LiveActivationSchedule = {
  timezone?: string;
  startsAt?: string | null;
  endsAt?: string | null;
  /** Host-safe schedule label */
  label: string;
  /** True when now is before startsAt */
  startsLater: boolean;
};

export type LiveActivationFailureCode =
  | "stale_preparation"
  | "recipe_version_mismatch"
  | "plan_incompatible"
  | "approval_missing"
  | "offer_facts_changed"
  | "schedule_missing_or_expired"
  | "campaign_unavailable"
  | "card_unavailable"
  | "spotlight_bind_conflict"
  | "no_customer_entry_path"
  | "contradiction"
  | "feature_disabled"
  | "policy_blocked"
  | "risk_exceeded"
  | "customer_contact_requested"
  | "provider_activation_requested"
  | "concurrent_edit"
  | "activation_in_progress"
  | "spotlight_activation_failed"
  | "campaign_activation_failed"
  | "insights_activation_failed"
  | "resolver_unreachable"
  | "compensation_failed"
  | "partial_failure"
  | "idempotent_replay";

export type LiveActivationFailure = {
  code: LiveActivationFailureCode;
  message: string;
  nextAction: string;
  intervention?: HumanIntervention;
  compensated?: boolean;
};

export type LiveAuditAction =
  | PreparedAuditAction
  | "final_approval_granted"
  | "activation_started"
  | "activation_completed"
  | "activation_failed"
  | "activation_compensated"
  | "observation_started"
  | "observation_stopped"
  | "stop_requested"
  | "stop_completed"
  | "pause_requested"
  | "pause_completed"
  | "resume_requested"
  | "resume_completed"
  | "undo_golive_requested"
  | "undo_golive_completed"
  | "undo_golive_failed"
  | "manual_takeover"
  | "concurrent_edit_aborted"
  | "idempotent_hit";

export type LiveAuditRef = Omit<AuditRef, "action"> & {
  action: LiveAuditAction;
};

export type LiveHostSummary = {
  whereLive: string;
  schedule: string;
  measured: string;
  needsAttention: string;
  externalBoundary: string;
};

export type LiveActivation = {
  activationId: string;
  schemaVersion: string;
  planId: string;
  preparedExecutionId: string;
  approvalId: string;
  recipeId: string;
  recipeVersion: string;
  status: LiveActivationStatus;
  /** Idempotency key: plan + prepared + approval + fingerprints */
  activationKey: string;
  fingerprints: LiveActivationFingerprints;
  campaignId: string;
  cardId: string;
  spotlightSectionId: string | null;
  approvedEntryPaths: LiveEntryPath[];
  schedule: LiveActivationSchedule;
  /** Always false in F3 — Distribution stays prepared/unsent */
  distributionSent: false;
  /** Always false in F3 — no external customer contact */
  customerContactOccurred: false;
  priorCampaignStatus: string;
  priorSpotlightSection: Record<string, unknown> | null;
  priorInsightsActive: boolean;
  observationActive: boolean;
  activatedAt?: string;
  stoppedAt?: string;
  pausedAt?: string;
  rolledBackAt?: string;
  auditRefs: LiveAuditRef[];
  failure: LiveActivationFailure | null;
  hostSummary: LiveHostSummary | null;
  hostStateLabel: string;
  hostStateDetail: string;
  honestyStatement: string;
  nextSafeAction: string;
  createdAt: string;
  updatedAt: string;
  /** Local Campaign/Card publish happened; never means email/social send */
  localPublish: boolean;
  interventions: HumanIntervention[];
};

export type LiveActivationAction =
  | { type: "grant_approval" }
  | { type: "start_activate" }
  | { type: "mark_live" }
  | { type: "mark_scheduled" }
  | { type: "mark_failed" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "stop" }
  | { type: "undo" }
  | { type: "mark_rolled_back" }
  | { type: "take_manual" };

const ACTIVATION_TRANSITIONS: Record<
  LiveActivationStatus,
  Partial<Record<LiveActivationAction["type"], LiveActivationStatus>>
> = {
  pending_approval: {
    grant_approval: "activating",
    mark_failed: "failed",
  },
  activating: {
    mark_live: "live",
    mark_scheduled: "scheduled",
    mark_failed: "failed",
    undo: "rolled_back",
  },
  live: {
    pause: "paused",
    stop: "stopped",
    undo: "rolled_back",
    take_manual: "manual_control",
  },
  scheduled: {
    mark_live: "live",
    pause: "paused",
    stop: "stopped",
    undo: "rolled_back",
    take_manual: "manual_control",
  },
  paused: {
    resume: "live",
    stop: "stopped",
    undo: "rolled_back",
    take_manual: "manual_control",
  },
  stopped: {
    take_manual: "manual_control",
  },
  rolled_back: {},
  failed: {
    grant_approval: "activating",
  },
  manual_control: {
    stop: "stopped",
    undo: "rolled_back",
  },
};

export function transitionLiveActivation(
  current: LiveActivationStatus,
  action: LiveActivationAction
):
  | { ok: true; status: LiveActivationStatus; previousStatus: LiveActivationStatus }
  | { ok: false; code: "invalid_transition"; message: string } {
  const next = ACTIVATION_TRANSITIONS[current]?.[action.type];
  if (!next) {
    return {
      ok: false,
      code: "invalid_transition",
      message: `Cannot ${action.type} from live-activation status ${current}`,
    };
  }
  return { ok: true, status: next, previousStatus: current };
}

export function canTransitionLiveActivation(
  current: LiveActivationStatus,
  action: LiveActivationAction
): boolean {
  return transitionLiveActivation(current, action).ok;
}

export function buildActivationKey(input: {
  planId: string;
  preparedExecutionId: string;
  approvalId: string;
  fingerprints: LiveActivationFingerprints;
}): string {
  return [
    input.planId,
    input.preparedExecutionId,
    input.approvalId,
    input.fingerprints.plan,
    input.fingerprints.facts,
    input.fingerprints.offer,
    input.fingerprints.preparation,
  ].join("::");
}

export function createLiveAuditRef(input: {
  action: LiveAuditAction;
  summary: string;
  detail?: Record<string, unknown>;
  now?: Date;
  id?: string;
}): LiveAuditRef {
  const now = input.now ?? new Date();
  return {
    id: input.id ?? `laudit_${input.action}_${now.getTime().toString(36)}`,
    action: input.action,
    at: now.toISOString(),
    summary: input.summary,
    detail: input.detail,
  };
}

export type LiveActivationValidationResult =
  | { ok: true; activation: LiveActivation }
  | { ok: false; errors: string[] };

export function validateLiveActivation(
  activation: LiveActivation
): LiveActivationValidationResult {
  const errors: string[] = [];
  if (!activation.activationId?.trim()) errors.push("activationId is required");
  if (activation.schemaVersion !== LIVE_ACTIVATION_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${LIVE_ACTIVATION_SCHEMA_VERSION}`);
  }
  if (!activation.planId?.trim()) errors.push("planId is required");
  if (!activation.preparedExecutionId?.trim()) {
    errors.push("preparedExecutionId is required");
  }
  if (!activation.approvalId?.trim()) errors.push("approvalId is required");
  if (!activation.activationKey?.trim()) errors.push("activationKey is required");
  if (!activation.campaignId?.trim()) errors.push("campaignId is required");
  if (!activation.cardId?.trim()) errors.push("cardId is required");
  if (activation.distributionSent !== false) {
    errors.push("distributionSent must be false in F3");
  }
  if (activation.customerContactOccurred !== false) {
    errors.push("customerContactOccurred must be false in F3");
  }
  if (!Array.isArray(activation.auditRefs)) errors.push("auditRefs must be an array");
  if (!Array.isArray(activation.approvedEntryPaths)) {
    errors.push("approvedEntryPaths must be an array");
  }
  for (const intervention of activation.interventions ?? []) {
    const v = validateHumanIntervention(intervention);
    if (!v.ok) errors.push(v.message);
  }
  const statuses: LiveActivationStatus[] = [
    "pending_approval",
    "activating",
    "live",
    "scheduled",
    "paused",
    "stopped",
    "rolled_back",
    "failed",
    "manual_control",
  ];
  if (!statuses.includes(activation.status)) {
    errors.push(`Invalid status: ${activation.status}`);
  }
  if (
    (activation.status === "live" || activation.status === "scheduled") &&
    activation.approvedEntryPaths.length === 0
  ) {
    errors.push("Live/scheduled activation requires at least one customer entry path");
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, activation };
}

/**
 * Derive customer-facing live label from domain evidence — never from activation alone.
 */
export function deriveCustomerLiveState(input: {
  activationStatus: LiveActivationStatus;
  campaignStatus: string;
  schedule: LiveActivationSchedule;
  resolverReachable: boolean;
  spotlightMatchesOffer: boolean;
  observationActive: boolean;
  observationDisclosedIncomplete?: boolean;
  hasAuditEvidence: boolean;
  now?: Date;
}): {
  hostLabel: "Live" | "Scheduled" | "Paused" | "Stopped" | "Not live" | "Needs attention";
  maySayYourOfferIsLive: boolean;
  reason: string;
} {
  if (input.activationStatus === "paused") {
    return {
      hostLabel: "Paused",
      maySayYourOfferIsLive: false,
      reason: "The offer is on hold.",
    };
  }
  if (input.activationStatus === "stopped" || input.activationStatus === "rolled_back") {
    return {
      hostLabel: "Stopped",
      maySayYourOfferIsLive: false,
      reason: "The offer is no longer shown as live.",
    };
  }
  if (input.activationStatus === "failed" || input.activationStatus === "activating") {
    return {
      hostLabel: "Not live",
      maySayYourOfferIsLive: false,
      reason: "Activation is not complete.",
    };
  }
  if (input.activationStatus === "manual_control") {
    return {
      hostLabel: "Needs attention",
      maySayYourOfferIsLive: false,
      reason: "You took manual control.",
    };
  }

  const camp = input.campaignStatus.toUpperCase();
  const campaignActive = camp === "LIVE" || camp === "SCHEDULED" || camp === "READY";
  if (!campaignActive && input.activationStatus !== "scheduled") {
    return {
      hostLabel: "Not live",
      maySayYourOfferIsLive: false,
      reason: "The Campaign is not active.",
    };
  }
  if (!input.spotlightMatchesOffer) {
    return {
      hostLabel: "Needs attention",
      maySayYourOfferIsLive: false,
      reason: "Card Spotlight no longer matches the Campaign offer.",
    };
  }
  if (!input.resolverReachable) {
    return {
      hostLabel: "Not live",
      maySayYourOfferIsLive: false,
      reason: "No customer entry path can reach the offer.",
    };
  }
  if (!input.hasAuditEvidence) {
    return {
      hostLabel: "Not live",
      maySayYourOfferIsLive: false,
      reason: "Go-live evidence is incomplete.",
    };
  }
  if (!input.observationActive && !input.observationDisclosedIncomplete) {
    return {
      hostLabel: "Needs attention",
      maySayYourOfferIsLive: false,
      reason: "Measurement is not active and was not disclosed as incomplete.",
    };
  }
  if (input.schedule.startsLater || input.activationStatus === "scheduled") {
    return {
      hostLabel: "Scheduled",
      maySayYourOfferIsLive: false,
      reason: `Scheduled — starts ${formatScheduleStart(input.schedule)}`,
    };
  }
  if (camp === "LIVE" || camp === "READY") {
    return {
      hostLabel: "Live",
      maySayYourOfferIsLive: true,
      reason: "Your offer is live.",
    };
  }
  return {
    hostLabel: "Scheduled",
    maySayYourOfferIsLive: false,
    reason: `Scheduled — starts ${formatScheduleStart(input.schedule)}`,
  };
}

function formatScheduleStart(schedule: LiveActivationSchedule): string {
  if (schedule.startsAt) {
    try {
      return new Date(schedule.startsAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return schedule.label || "the scheduled time";
    }
  }
  return schedule.label || "the scheduled time";
}

export function evaluateScheduleWindow(input: {
  startsAt?: string | null;
  endsAt?: string | null;
  timezone?: string;
  notes?: string;
  now?: Date;
}): LiveActivationSchedule {
  const now = input.now ?? new Date();
  const startsAt = input.startsAt ?? null;
  const endsAt = input.endsAt ?? null;
  let startsLater = false;
  if (startsAt) {
    const start = new Date(startsAt);
    if (!Number.isNaN(start.getTime()) && start.getTime() > now.getTime()) {
      startsLater = true;
    }
  }
  let expired = false;
  if (endsAt) {
    const end = new Date(endsAt);
    if (!Number.isNaN(end.getTime()) && end.getTime() < now.getTime()) {
      expired = true;
    }
  }
  const label = startsLater
    ? `Scheduled — starts ${formatScheduleStart({
        startsAt,
        endsAt,
        label: input.notes || "",
        startsLater: true,
        timezone: input.timezone,
      })}`
    : expired
      ? "Schedule ended"
      : input.notes?.trim() ||
        (startsAt || endsAt ? "During the approved schedule" : "Starts when you make it live");

  return {
    timezone: input.timezone,
    startsAt,
    endsAt,
    label: expired ? "Schedule ended" : label,
    startsLater,
  };
}

export function isScheduleExpired(schedule: LiveActivationSchedule, now = new Date()): boolean {
  if (!schedule.endsAt) return false;
  const end = new Date(schedule.endsAt);
  return !Number.isNaN(end.getTime()) && end.getTime() < now.getTime();
}
