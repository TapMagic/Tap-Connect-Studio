/**
 * Authoritative Autopilot F3 go-live persistence.
 *
 * Domain SoT:
 * - Campaign status/schedule
 * - Brand Kit Spotlight projection
 * - DeviceAssignment / Card-first entry
 * - ClickEvent / Insights
 *
 * LiveActivation is durable orchestration evidence (FusionIdempotencyRecord + audit),
 * not a competing live source of truth.
 */

import type { TapCardSection } from "@/lib/brand/tap-card";
import { prisma } from "@/lib/db";
import { isIsolatedFusionDatabaseConfigured } from "@/lib/fusion/db/safety";
import { hashPayload } from "@/lib/fusion/publication/idempotency";
import {
  assignCampaignToDevice,
  endDeviceAssignment,
} from "@/lib/services/campaigns";
import { getDeviceWithActiveCampaign } from "@/lib/services/devices";
import { resolvePublicTapSurface } from "@/lib/fusion/card/offer-resolver";
import { parseTapConnectCard } from "@/lib/brand/tap-card";
import {
  persistSpotlightOfferBind,
  restoreSpotlightFromPrior,
  readPersistedSpotlightOffer,
} from "@/lib/fusion/card/spotlight-persist";
import type { AutopilotPlan } from "./plan";
import type { PreparedExecution } from "./prepared-execution";
import {
  createLiveAuditRef,
  deriveCustomerLiveState,
  type LiveActivation,
  type LiveEntryPath,
} from "./live-activation";
import {
  activateCardOfferMeasurableOutcome,
  interruptLiveActivation,
  resumeLiveActivation,
  provePublicOfferReachable,
  type ActivateOutcomeInput,
  type DomainLiveSnapshot,
} from "./live-orchestrator";
import { F3_HONESTY_STATEMENT, F3_EXTERNAL_BOUNDARY } from "./live-host";
import {
  buildLiveObservationSummary,
  type LiveObservationSummary,
  type ObservationEventCounts,
} from "./live-observation";
import type { Prisma } from "@prisma/client";

const LIVE_OP = "autopilot.live.activation";
const LIVE_CURRENT_OP = "autopilot.live.current";
const LIVE_RECIPE = "card.offer.measurable";

export type DurablePriorState = {
  campaignStatus: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  priorSection: TapCardSection | null;
  createdSection: boolean;
  sectionId: string | null;
  /** Device assignment F3 created or replaced */
  assignment: {
    deviceSlotId: string;
    deviceCode: string;
    /** Prior ACTIVE campaign on that device before F3, if any */
    priorCampaignId: string | null;
    createdByF3: boolean;
  } | null;
};

export type DurableLiveRecord = {
  schemaVersion: "1.0.0";
  kind: "live_activation";
  activation: LiveActivation;
  prior: DurablePriorState;
  verification: {
    campaignStatus: string;
    spotlightSectionId: string | null;
    offerFingerprint: string | null;
    projectionState: string;
    entryPaths: LiveEntryPath[];
    publicReachable: boolean;
    verifiedAt: string;
  };
  planRef: {
    planId: string;
    planVersion: number;
    objective: string;
    audience: string;
  };
  preparedExecutionId: string;
  /**
   * Orchestration snapshots for host refresh/reconnect.
   * Not Campaign/Spotlight/Insights truth — only Autopilot evidence needed to
   * re-open Stop/Pause/Undo and re-derive live UI after a new session.
   */
  plan?: AutopilotPlan;
  execution?: PreparedExecution;
  businessId: string;
  distributionSent: false;
  customerContactOccurred: false;
};

export type PersistActivateInput = ActivateOutcomeInput & {
  businessId: string;
  businessName: string;
  logoUrl?: string | null;
  actorId?: string | null;
  /** When true, allow assigning approved Tap Point if not already on this campaign */
  allowAssignApprovedTapPoint?: boolean;
};

export type PersistActivateResult =
  | {
      ok: true;
      activation: LiveActivation;
      plan: AutopilotPlan;
      execution: PreparedExecution;
      domain: DomainLiveSnapshot;
      observation: LiveObservationSummary;
      record: DurableLiveRecord;
      idempotent: boolean;
      verifiedPublic: boolean;
    }
  | {
      ok: false;
      activation: LiveActivation;
      plan: AutopilotPlan;
      execution: PreparedExecution;
      domain: DomainLiveSnapshot;
      observation: null;
      record: DurableLiveRecord | null;
      idempotent: boolean;
      verifiedPublic: false;
      message: string;
    };

const memoryRecords = new Map<string, DurableLiveRecord>();
const memoryCurrent = new Map<string, string>(); // businessId → activationId

function currentKey(businessId: string, campaignId: string) {
  return `${businessId}::${campaignId}`;
}

function expiresAt(days = 365) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function writeAudit(input: {
  businessId: string;
  actorId?: string | null;
  action: string;
  resourceId: string;
  metadata: Record<string, unknown>;
}) {
  if (!isIsolatedFusionDatabaseConfigured()) return;
  try {
    await prisma.platformAuditEvent.create({
      data: {
        businessId: input.businessId,
        actorType: input.actorId ? "USER" : "SYSTEM",
        actorId: input.actorId ?? undefined,
        action: input.action,
        resourceType: "autopilot_live_activation",
        resourceId: input.resourceId,
        correlationId:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `live_${Date.now().toString(36)}`,
        metadata: input.metadata as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    console.error("F3 audit persist failed", err);
  }
}

async function saveDurableRecord(record: DurableLiveRecord): Promise<void> {
  memoryRecords.set(record.activation.activationId, record);
  memoryCurrent.set(currentKey(record.businessId, record.activation.campaignId), record.activation.activationId);

  if (!isIsolatedFusionDatabaseConfigured()) return;

  const payload = record as unknown as Prisma.InputJsonValue;
  const reqHash = hashPayload({
    activationId: record.activation.activationId,
    status: record.activation.status,
    updatedAt: record.activation.updatedAt,
  });

  await prisma.fusionIdempotencyRecord.upsert({
    where: {
      businessId_operation_key: {
        businessId: record.businessId,
        operation: LIVE_OP,
        key: record.activation.activationId,
      },
    },
    create: {
      businessId: record.businessId,
      operation: LIVE_OP,
      key: record.activation.activationId,
      requestHash: reqHash,
      resourceType: "autopilot_live_activation",
      resourceId: record.activation.activationId,
      response: payload,
      expiresAt: expiresAt(),
    },
    update: {
      requestHash: reqHash,
      response: payload,
      expiresAt: expiresAt(),
    },
  });

  // Idempotency by activationKey
  await prisma.fusionIdempotencyRecord.upsert({
    where: {
      businessId_operation_key: {
        businessId: record.businessId,
        operation: `${LIVE_OP}.key`,
        key: record.activation.activationKey.slice(0, 190),
      },
    },
    create: {
      businessId: record.businessId,
      operation: `${LIVE_OP}.key`,
      key: record.activation.activationKey.slice(0, 190),
      requestHash: hashPayload(record.activation.activationKey),
      resourceType: "autopilot_live_activation",
      resourceId: record.activation.activationId,
      response: { activationId: record.activation.activationId } as Prisma.InputJsonValue,
      expiresAt: expiresAt(),
    },
    update: {
      resourceId: record.activation.activationId,
      response: { activationId: record.activation.activationId } as Prisma.InputJsonValue,
      expiresAt: expiresAt(),
    },
  });

  await prisma.fusionIdempotencyRecord.upsert({
    where: {
      businessId_operation_key: {
        businessId: record.businessId,
        operation: LIVE_CURRENT_OP,
        key: currentKey(record.businessId, record.activation.campaignId).slice(0, 190),
      },
    },
    create: {
      businessId: record.businessId,
      operation: LIVE_CURRENT_OP,
      key: currentKey(record.businessId, record.activation.campaignId).slice(0, 190),
      requestHash: hashPayload(record.activation.activationId),
      resourceType: "autopilot_live_activation",
      resourceId: record.activation.activationId,
      response: payload,
      expiresAt: expiresAt(),
    },
    update: {
      requestHash: hashPayload(record.activation.activationId),
      resourceId: record.activation.activationId,
      response: payload,
      expiresAt: expiresAt(),
    },
  });
}

async function loadDurableByActivationId(
  businessId: string,
  activationId: string
): Promise<DurableLiveRecord | null> {
  const mem = memoryRecords.get(activationId);
  if (mem && mem.businessId === businessId) return mem;
  if (!isIsolatedFusionDatabaseConfigured()) return mem ?? null;
  const row = await prisma.fusionIdempotencyRecord.findUnique({
    where: {
      businessId_operation_key: {
        businessId,
        operation: LIVE_OP,
        key: activationId,
      },
    },
  });
  if (!row?.response || typeof row.response !== "object") return null;
  const record = row.response as unknown as DurableLiveRecord;
  if (record?.kind !== "live_activation") return null;
  memoryRecords.set(activationId, record);
  return record;
}

async function loadDurableByKey(
  businessId: string,
  activationKey: string
): Promise<DurableLiveRecord | null> {
  if (!isIsolatedFusionDatabaseConfigured()) {
    for (const r of memoryRecords.values()) {
      if (r.businessId === businessId && r.activation.activationKey === activationKey) {
        return r;
      }
    }
    return null;
  }
  const row = await prisma.fusionIdempotencyRecord.findUnique({
    where: {
      businessId_operation_key: {
        businessId,
        operation: `${LIVE_OP}.key`,
        key: activationKey.slice(0, 190),
      },
    },
  });
  const activationId =
    row?.resourceId ||
    (row?.response && typeof row.response === "object"
      ? String((row.response as { activationId?: string }).activationId || "")
      : "");
  if (!activationId) return null;
  return loadDurableByActivationId(businessId, activationId);
}

export async function loadCurrentLiveActivation(input: {
  businessId: string;
  campaignId?: string;
}): Promise<DurableLiveRecord | null> {
  if (input.campaignId) {
    const key = currentKey(input.businessId, input.campaignId);
    const memId = memoryCurrent.get(key);
    if (memId) {
      const mem = await loadDurableByActivationId(input.businessId, memId);
      if (mem) return mem;
    }
    if (isIsolatedFusionDatabaseConfigured()) {
      const row = await prisma.fusionIdempotencyRecord.findUnique({
        where: {
          businessId_operation_key: {
            businessId: input.businessId,
            operation: LIVE_CURRENT_OP,
            key: key.slice(0, 190),
          },
        },
      });
      if (row?.response && typeof row.response === "object") {
        const record = row.response as unknown as DurableLiveRecord;
        if (record?.kind === "live_activation") {
          memoryRecords.set(record.activation.activationId, record);
          return record;
        }
      }
    }
  }

  // Fallback: latest live/scheduled/paused for business
  if (isIsolatedFusionDatabaseConfigured()) {
    const rows = await prisma.fusionIdempotencyRecord.findMany({
      where: {
        businessId: input.businessId,
        operation: LIVE_OP,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    for (const row of rows) {
      const record = row.response as unknown as DurableLiveRecord;
      if (record?.kind !== "live_activation") continue;
      if (input.campaignId && record.activation.campaignId !== input.campaignId) continue;
      if (
        record.activation.status === "live" ||
        record.activation.status === "scheduled" ||
        record.activation.status === "paused"
      ) {
        return record;
      }
    }
  }
  for (const r of memoryRecords.values()) {
    if (r.businessId !== input.businessId) continue;
    if (input.campaignId && r.activation.campaignId !== input.campaignId) continue;
    if (
      r.activation.status === "live" ||
      r.activation.status === "scheduled" ||
      r.activation.status === "paused"
    ) {
      return r;
    }
  }
  return null;
}

/**
 * Re-derive host live label from authoritative DB state + durable evidence.
 */
export async function deriveAuthoritativeLiveState(input: {
  businessId: string;
  businessName: string;
  logoUrl?: string | null;
  campaignId: string;
  deviceCode?: string;
}): Promise<{
  record: DurableLiveRecord | null;
  hostLabel: string;
  maySayYourOfferIsLive: boolean;
  reason: string;
  campaignStatus: string | null;
  observation: LiveObservationSummary | null;
}> {
  const record = await loadCurrentLiveActivation({
    businessId: input.businessId,
    campaignId: input.campaignId,
  });
  const campaign = await prisma.campaign.findFirst({
    where: { id: input.campaignId, businessId: input.businessId },
    select: { id: true, status: true, scheduledStart: true, scheduledEnd: true },
  });
  if (!campaign) {
    return {
      record,
      hostLabel: "Not live",
      maySayYourOfferIsLive: false,
      reason: "Campaign not found.",
      campaignStatus: null,
      observation: null,
    };
  }

  const spotlight = await readPersistedSpotlightOffer({
    businessId: input.businessId,
    businessName: input.businessName,
    logoUrl: input.logoUrl,
    campaignId: input.campaignId,
  });

  let resolverReachable = false;
  if (input.deviceCode) {
    const resolved = await getDeviceWithActiveCampaign(input.deviceCode);
    const hasLive =
      Boolean(resolved?.campaign) &&
      ["LIVE", "SCHEDULED", "READY"].includes(
        String(resolved?.campaign?.status || "").toUpperCase()
      );
    const brandKit = resolved?.device?.business?.brandKit;
    const card = parseTapConnectCard(brandKit?.tapCard, {
      businessName: input.businessName,
    });
    const surface = resolvePublicTapSurface({
      hasLiveCampaign: hasLive,
      liveCampaignId: resolved?.campaign?.id,
      card,
      offerFeatureOn: true,
      hasEndExperience: false,
    });
    resolverReachable =
      hasLive &&
      resolved?.campaign?.id === input.campaignId &&
      (surface.mode === "campaign_takeover_with_spotlight" ||
        surface.mode === "campaign_takeover" ||
        Boolean(spotlight.section));
  } else if (spotlight.section && ["LIVE", "SCHEDULED", "READY"].includes(campaign.status)) {
    resolverReachable = true;
  }

  const activationStatus = record?.activation.status ?? "failed";
  const schedule = record?.activation.schedule ?? {
    label: "When live",
    startsLater: campaign.status === "SCHEDULED",
    startsAt: campaign.scheduledStart?.toISOString() ?? null,
    endsAt: campaign.scheduledEnd?.toISOString() ?? null,
  };

  const derived = deriveCustomerLiveState({
    activationStatus:
      activationStatus === "live" ||
      activationStatus === "scheduled" ||
      activationStatus === "paused" ||
      activationStatus === "stopped" ||
      activationStatus === "rolled_back" ||
      activationStatus === "manual_control"
        ? activationStatus
        : campaign.status === "PAUSED"
          ? "paused"
          : "failed",
    campaignStatus: campaign.status,
    schedule,
    resolverReachable,
    spotlightMatchesOffer:
      spotlight.projectionState === "current" ||
      spotlight.section?.linkedCampaignId === input.campaignId,
    observationActive: record?.activation.observationActive ?? false,
    observationDisclosedIncomplete: !(record?.activation.observationActive ?? false),
    hasAuditEvidence: Boolean(record),
  });

  const observation = record
    ? buildLiveObservationSummary({
        activationId: record.activation.activationId,
        campaignId: input.campaignId,
        statusLabel: derived.hostLabel,
        entryPathCount: record.activation.approvedEntryPaths.filter(
          (p) => p.kind === "tap_point" || p.kind === "tap_point_group"
        ).length,
        entryKind: record.activation.approvedEntryPaths.some((p) => p.kind === "card_first")
          ? "card_first"
          : "tap_point",
        scheduleLabel: schedule.label,
        observationActive: record.activation.observationActive,
        disclosedIncomplete: !record.activation.observationActive,
        followUpReady: true,
      })
    : null;

  return {
    record,
    hostLabel: derived.hostLabel,
    maySayYourOfferIsLive: derived.maySayYourOfferIsLive,
    reason: derived.reason,
    campaignStatus: campaign.status,
    observation,
  };
}

async function verifyPublicPath(input: {
  deviceCode?: string;
  campaignId: string;
  businessId: string;
}): Promise<{ reachable: boolean; mode: string; detail: string }> {
  if (!input.deviceCode) {
    return {
      reachable: false,
      mode: "none",
      detail: "No Tap Point selected for public verification.",
    };
  }

  // Prefer ACTIVE assignment for this campaign (authoritative entry) over group schedule.
  const device = await prisma.deviceSlot.findFirst({
    where: { businessId: input.businessId, deviceCode: input.deviceCode },
    select: {
      id: true,
      deviceCode: true,
      assignments: {
        where: { status: "ACTIVE", campaignId: input.campaignId },
        take: 1,
        include: { campaign: { select: { id: true, status: true } } },
      },
    },
  });
  if (!device) {
    return { reachable: false, mode: "missing", detail: "Tap Point not found." };
  }
  const assigned = device.assignments[0]?.campaign;
  if (assigned && ["LIVE", "SCHEDULED", "READY"].includes(assigned.status)) {
    return {
      reachable: true,
      mode: "assigned",
      detail: "Campaign is actively assigned to the approved Tap Point.",
    };
  }

  // Fallback: resolver path (group/schedule) when it resolves the same campaign
  const resolved = await getDeviceWithActiveCampaign(input.deviceCode);
  const camp = resolved?.campaign;
  if (!camp || camp.id !== input.campaignId) {
    return {
      reachable: false,
      mode: "unassigned",
      detail: "Campaign is not active on the approved Tap Point.",
    };
  }
  const status = String(camp.status).toUpperCase();
  if (!["LIVE", "SCHEDULED", "READY"].includes(status)) {
    return {
      reachable: false,
      mode: "inactive",
      detail: `Campaign status on Tap Point is ${status}.`,
    };
  }
  return { reachable: true, mode: "resolved", detail: "Campaign resolves on public Tap Point." };
}

/**
 * Persist F3 go-live through authoritative domain writes + durable evidence.
 */
export async function persistActivateCardOfferMeasurable(
  input: PersistActivateInput
): Promise<PersistActivateResult> {
  // Idempotent replay from durable store
  const dry = activateCardOfferMeasurableOutcome({
    ...input,
    existingActivation: input.existingActivation,
  });

  if (dry.ok && dry.idempotent && input.existingActivation) {
    const existing = await loadDurableByKey(input.businessId, dry.activation.activationKey);
    if (existing && (existing.activation.status === "live" || existing.activation.status === "scheduled")) {
      return {
        ok: true,
        activation: existing.activation,
        plan: dry.plan,
        execution: dry.execution,
        domain: {
          campaignStatus: existing.verification.campaignStatus,
          cardSections: input.card.sections,
          insightsObservationActive: existing.activation.observationActive,
          preservedEvidence: {
            claimsPreserved: true,
            consentPreserved: true,
            relationshipsPreserved: true,
            auditPreserved: true,
          },
        },
        observation:
          dry.observation ||
          buildLiveObservationSummary({
            activationId: existing.activation.activationId,
            campaignId: existing.activation.campaignId,
            statusLabel: existing.activation.hostStateLabel,
            entryPathCount: existing.activation.approvedEntryPaths.length,
            entryKind: "tap_point",
            scheduleLabel: existing.activation.schedule.label,
            observationActive: existing.activation.observationActive,
          }),
        record: existing,
        idempotent: true,
        verifiedPublic: existing.verification.publicReachable,
      };
    }
  }

  if (!dry.ok) {
    return {
      ok: false,
      activation: dry.activation,
      plan: dry.plan,
      execution: dry.execution,
      domain: dry.domain,
      observation: null,
      record: null,
      idempotent: false,
      verifiedPublic: false,
      message: dry.activation.failure?.message || "Activation refused.",
    };
  }

  // Capture prior authoritative state
  const campaign = await prisma.campaign.findFirst({
    where: { id: input.campaign.id, businessId: input.businessId },
    select: {
      id: true,
      status: true,
      scheduledStart: true,
      scheduledEnd: true,
      title: true,
    },
  });
  if (!campaign) {
    return {
      ok: false,
      activation: {
        ...dry.activation,
        status: "failed",
        failure: {
          code: "campaign_unavailable",
          message: "Campaign not found.",
          nextAction: "Choose a campaign offer, then prepare again.",
        },
        hostStateDetail: "Autopilot could not safely make the offer live. Nothing was left half-finished.",
      },
      plan: dry.plan,
      execution: dry.execution,
      domain: dry.domain,
      observation: null,
      record: null,
      idempotent: false,
      verifiedPublic: false,
      message: "Campaign not found.",
    };
  }

  const prior: DurablePriorState = {
    campaignStatus: campaign.status,
    scheduledStart: campaign.scheduledStart?.toISOString() ?? null,
    scheduledEnd: campaign.scheduledEnd?.toISOString() ?? null,
    priorSection: null,
    createdSection: false,
    sectionId: null,
    assignment: null,
  };

  // Durable attempt record before writes
  let activation: LiveActivation = {
    ...dry.activation,
    status: "activating",
    hostStateLabel: "Making it live",
    hostStateDetail: "Autopilot is making your Card offer live.",
    nextSafeAction: "Wait while Autopilot finishes.",
    localPublish: false,
  };

  const attemptRecord: DurableLiveRecord = {
    schemaVersion: "1.0.0",
    kind: "live_activation",
    activation,
    prior,
    verification: {
      campaignStatus: campaign.status,
      spotlightSectionId: null,
      offerFingerprint: null,
      projectionState: "unbound",
      entryPaths: activation.approvedEntryPaths,
      publicReachable: false,
      verifiedAt: new Date().toISOString(),
    },
    planRef: {
      planId: input.plan.id,
      planVersion: input.plan.planVersion ?? 1,
      objective: input.plan.objective,
      audience: input.plan.audience.summary,
    },
    preparedExecutionId: input.execution.executionId,
    plan: input.plan,
    execution: input.execution,
    businessId: input.businessId,
    distributionSent: false,
    customerContactOccurred: false,
  };
  await saveDurableRecord(attemptRecord);
  await writeAudit({
    businessId: input.businessId,
    actorId: input.actorId,
    action: "autopilot.live.activation_started",
    resourceId: activation.activationId,
    metadata: {
      activationKey: activation.activationKey,
      campaignId: campaign.id,
      recipeId: LIVE_RECIPE,
    },
  });

  // Simulate failure hooks (tests)
  if (input.simulateFailure === "spotlight") {
    return failPersist({
      activation,
      plan: dry.plan,
      execution: dry.execution,
      domain: dry.domain,
      prior,
      businessId: input.businessId,
      message: "Autopilot could not safely make the offer live. Nothing was left half-finished.",
      code: "spotlight_activation_failed",
      compensated: true,
    });
  }

  // 1) Spotlight persist
  const preparedSpotlight = input.execution.preparedObjects.find(
    (o) => o.kind === "card_spotlight_projection" && o.status === "prepared"
  );
  const sectionSeed = preparedSpotlight?.draftState?.section as TapCardSection | undefined;
  const bind = await persistSpotlightOfferBind({
    businessId: input.businessId,
    businessName: input.businessName,
    logoUrl: input.logoUrl,
    campaignId: campaign.id,
    sectionId: sectionSeed?.id,
    offerBlockId: input.campaign.offerBlockId || undefined,
    preservePresentation: true,
    deviceCode: input.deviceCode,
    sectionSeed: sectionSeed || null,
  });
  if (!bind.ok) {
    return failPersist({
      activation,
      plan: dry.plan,
      execution: dry.execution,
      domain: dry.domain,
      prior,
      businessId: input.businessId,
      message: "Autopilot could not safely make the offer live. Nothing was left half-finished.",
      code: "spotlight_activation_failed",
      compensated: true,
    });
  }
  prior.priorSection = bind.priorSection;
  prior.createdSection = bind.createdSection;
  prior.sectionId = bind.section.id;

  if (input.simulateFailure === "campaign") {
    await restoreSpotlightFromPrior({
      businessId: input.businessId,
      businessName: input.businessName,
      logoUrl: input.logoUrl,
      sectionId: prior.sectionId,
      priorSection: prior.priorSection,
      createdSection: prior.createdSection,
    });
    return failPersist({
      activation,
      plan: dry.plan,
      execution: dry.execution,
      domain: dry.domain,
      prior,
      businessId: input.businessId,
      message: "Autopilot could not safely make the offer live. Nothing was left half-finished.",
      code: "campaign_activation_failed",
      compensated: true,
    });
  }

  // 2) Campaign status
  const targetStatus = dry.activation.status === "scheduled" ? "SCHEDULED" : "LIVE";
  try {
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: targetStatus,
        ...(dry.activation.schedule.startsAt
          ? { scheduledStart: new Date(dry.activation.schedule.startsAt) }
          : {}),
        ...(dry.activation.schedule.endsAt
          ? { scheduledEnd: new Date(dry.activation.schedule.endsAt) }
          : {}),
      },
    });
  } catch {
    await restoreSpotlightFromPrior({
      businessId: input.businessId,
      businessName: input.businessName,
      logoUrl: input.logoUrl,
      sectionId: prior.sectionId,
      priorSection: prior.priorSection,
      createdSection: prior.createdSection,
    });
    return failPersist({
      activation,
      plan: dry.plan,
      execution: dry.execution,
      domain: dry.domain,
      prior,
      businessId: input.businessId,
      message: "Autopilot could not safely make the offer live. Nothing was left half-finished.",
      code: "campaign_activation_failed",
      compensated: true,
    });
  }

  // 3) Customer entry — confirm or assign approved Tap Point only
  const tapPath = dry.activation.approvedEntryPaths.find(
    (p) => p.kind === "tap_point" || p.kind === "tap_point_group"
  );
  const deviceCode = input.deviceCode || tapPath?.ref;
  let publicOk = { reachable: false, mode: "none", detail: "" };

  if (tapPath && deviceCode && deviceCode !== "assigned") {
    const device = await prisma.deviceSlot.findFirst({
      where: { businessId: input.businessId, deviceCode },
      select: {
        id: true,
        deviceCode: true,
        assignments: {
          where: { status: "ACTIVE" },
          take: 1,
          select: { campaignId: true },
        },
      },
    });
    if (!device) {
      await compensateActivation({
        businessId: input.businessId,
        businessName: input.businessName,
        logoUrl: input.logoUrl,
        prior,
        campaignId: campaign.id,
      });
      return failPersist({
        activation,
        plan: dry.plan,
        execution: dry.execution,
        domain: dry.domain,
        prior,
        businessId: input.businessId,
        message: "Your offer could not be made live because no Tap Point is connected.",
        code: "no_customer_entry_path",
        compensated: true,
      });
    }

    const activeCampaignId = device.assignments[0]?.campaignId ?? null;
    if (activeCampaignId === campaign.id) {
      prior.assignment = {
        deviceSlotId: device.id,
        deviceCode: device.deviceCode,
        priorCampaignId: campaign.id,
        createdByF3: false,
      };
    } else if (input.allowAssignApprovedTapPoint !== false) {
      prior.assignment = {
        deviceSlotId: device.id,
        deviceCode: device.deviceCode,
        priorCampaignId: activeCampaignId,
        createdByF3: true,
      };
      try {
        await assignCampaignToDevice({
          businessId: input.businessId,
          deviceSlotId: device.id,
          campaignId: campaign.id,
          userId: input.actorId || undefined,
        });
        // assignCampaignToDevice forces LIVE — restore SCHEDULED if needed
        if (targetStatus === "SCHEDULED") {
          await prisma.campaign.update({
            where: { id: campaign.id },
            data: { status: "SCHEDULED" },
          });
        }
      } catch {
        await compensateActivation({
          businessId: input.businessId,
          businessName: input.businessName,
          logoUrl: input.logoUrl,
          prior,
          campaignId: campaign.id,
        });
        return failPersist({
          activation,
          plan: dry.plan,
          execution: dry.execution,
          domain: dry.domain,
          prior,
          businessId: input.businessId,
          message: "Autopilot could not safely make the offer live. Nothing was left half-finished.",
          code: "resolver_unreachable",
          compensated: true,
        });
      }
    } else if (activeCampaignId && activeCampaignId !== campaign.id) {
      await compensateActivation({
        businessId: input.businessId,
        businessName: input.businessName,
        logoUrl: input.logoUrl,
        prior,
        campaignId: campaign.id,
      });
      return failPersist({
        activation,
        plan: dry.plan,
        execution: dry.execution,
        domain: dry.domain,
        prior,
        businessId: input.businessId,
        message: "That Tap Point already shows a different campaign.",
        code: "resolver_unreachable",
        compensated: true,
      });
    }

    if (input.simulateFailure === "resolver") {
      await compensateActivation({
        businessId: input.businessId,
        businessName: input.businessName,
        logoUrl: input.logoUrl,
        prior,
        campaignId: campaign.id,
      });
      return failPersist({
        activation,
        plan: dry.plan,
        execution: dry.execution,
        domain: dry.domain,
        prior,
        businessId: input.businessId,
        message: "Your offer could not be made live because customers cannot reach it yet.",
        code: "resolver_unreachable",
        compensated: true,
      });
    }

    publicOk = await verifyPublicPath({
      deviceCode: device.deviceCode,
      campaignId: campaign.id,
      businessId: input.businessId,
    });
  } else if (dry.activation.approvedEntryPaths.some((p) => p.kind === "card_first")) {
    // Card-first: Spotlight + Campaign LIVE is the entry; public /t still needs a device for headed proof
    publicOk = {
      reachable: true,
      mode: "card_first",
      detail: "Card-first entry approved; Spotlight projection persisted.",
    };
  } else {
    await compensateActivation({
      businessId: input.businessId,
      businessName: input.businessName,
      logoUrl: input.logoUrl,
      prior,
      campaignId: campaign.id,
    });
    return failPersist({
      activation,
      plan: dry.plan,
      execution: dry.execution,
      domain: dry.domain,
      prior,
      businessId: input.businessId,
      message: "Your offer could not be made live because no Tap Point is connected.",
      code: "no_customer_entry_path",
      compensated: true,
    });
  }

  if (!publicOk.reachable) {
    await compensateActivation({
      businessId: input.businessId,
      businessName: input.businessName,
      logoUrl: input.logoUrl,
      prior,
      campaignId: campaign.id,
    });
    return failPersist({
      activation,
      plan: dry.plan,
      execution: dry.execution,
      domain: dry.domain,
      prior,
      businessId: input.businessId,
      message: "Your offer could not be made live because customers cannot reach it yet.",
      code: "resolver_unreachable",
      compensated: true,
    });
  }

  // 4) Insights arming — observation flag; real events come from public path
  if (input.simulateFailure === "insights") {
    await compensateActivation({
      businessId: input.businessId,
      businessName: input.businessName,
      logoUrl: input.logoUrl,
      prior,
      campaignId: campaign.id,
    });
    return failPersist({
      activation,
      plan: dry.plan,
      execution: dry.execution,
      domain: dry.domain,
      prior,
      businessId: input.businessId,
      message: "Autopilot could not safely make the offer live. Nothing was left half-finished.",
      code: "insights_activation_failed",
      compensated: true,
    });
  }

  // Verify Campaign after write
  const verifiedCampaign = await prisma.campaign.findFirst({
    where: { id: campaign.id, businessId: input.businessId },
    select: { status: true },
  });
  const spotlightAfter = await readPersistedSpotlightOffer({
    businessId: input.businessId,
    businessName: input.businessName,
    logoUrl: input.logoUrl,
    campaignId: campaign.id,
  });

  if (
    !verifiedCampaign ||
    !["LIVE", "SCHEDULED"].includes(verifiedCampaign.status) ||
    !spotlightAfter.section ||
    spotlightAfter.projectionState === "unbound"
  ) {
    const detail = [
      !verifiedCampaign ? "campaign_missing" : null,
      verifiedCampaign && !["LIVE", "SCHEDULED"].includes(verifiedCampaign.status)
        ? `campaign_status=${verifiedCampaign.status}`
        : null,
      !spotlightAfter.section ? "spotlight_missing" : null,
      spotlightAfter.projectionState === "unbound" ? "spotlight_unbound" : null,
    ]
      .filter(Boolean)
      .join(",");
    await compensateActivation({
      businessId: input.businessId,
      businessName: input.businessName,
      logoUrl: input.logoUrl,
      prior,
      campaignId: campaign.id,
    });
    return failPersist({
      activation,
      plan: dry.plan,
      execution: dry.execution,
      domain: dry.domain,
      prior,
      businessId: input.businessId,
      message: "Autopilot could not safely make the offer live. Nothing was left half-finished.",
      code: "partial_failure",
      compensated: true,
      detail,
    });
  }

  const now = input.now ?? new Date();
  const finalStatus = targetStatus === "SCHEDULED" ? "scheduled" : "live";
  activation = {
    ...dry.activation,
    status: finalStatus,
    spotlightSectionId: spotlightAfter.section.id,
    priorCampaignStatus: prior.campaignStatus,
    priorSpotlightSection: prior.priorSection
      ? (prior.priorSection as unknown as Record<string, unknown>)
      : { existed: false },
    observationActive: true,
    localPublish: true,
    distributionSent: false,
    customerContactOccurred: false,
    activatedAt: now.toISOString(),
    updatedAt: now.toISOString(),
    hostStateLabel: finalStatus === "live" ? "Live" : "Scheduled",
    hostStateDetail:
      finalStatus === "live"
        ? "Your offer is live."
        : dry.activation.hostStateDetail,
    honestyStatement:
      finalStatus === "live" ? F3_HONESTY_STATEMENT : `Scheduled — not live yet. ${F3_EXTERNAL_BOUNDARY}`,
    nextSafeAction: "Watch results, or Stop / Undo if you need to pull it back.",
    failure: null,
    auditRefs: [
      ...dry.activation.auditRefs,
      createLiveAuditRef({
        action: "activation_completed",
        summary:
          finalStatus === "live"
            ? "Offer is live — verified on persisted domains"
            : "Offer is scheduled — verified on persisted domains",
        detail: {
          campaignStatus: verifiedCampaign.status,
          sectionId: spotlightAfter.section.id,
          publicReachable: publicOk.reachable,
          distributionSent: false,
        },
        now,
      }),
    ],
  };

  const brandKit = await prisma.brandKit.findUnique({
    where: { businessId: input.businessId },
  });
  const card = parseTapConnectCard(brandKit?.tapCard, {
    businessName: input.businessName,
  });

  const record: DurableLiveRecord = {
    ...attemptRecord,
    activation,
    prior,
    verification: {
      campaignStatus: verifiedCampaign.status,
      spotlightSectionId: spotlightAfter.section.id,
      offerFingerprint: spotlightAfter.offer?.factsFingerprint ?? null,
      projectionState: spotlightAfter.projectionState,
      entryPaths: activation.approvedEntryPaths,
      publicReachable: publicOk.reachable,
      verifiedAt: now.toISOString(),
    },
    plan: dry.plan,
    execution: {
      ...dry.execution,
      livePublish: true,
    },
  };
  await saveDurableRecord(record);
  await writeAudit({
    businessId: input.businessId,
    actorId: input.actorId,
    action: "autopilot.live.activation_completed",
    resourceId: activation.activationId,
    metadata: {
      campaignId: campaign.id,
      status: activation.status,
      publicReachable: publicOk.reachable,
      distributionSent: false,
      customerContactOccurred: false,
    },
  });

  const observation = buildLiveObservationSummary({
    activationId: activation.activationId,
    campaignId: campaign.id,
    statusLabel: activation.hostStateLabel,
    entryPathCount: activation.approvedEntryPaths.filter(
      (p) => p.kind === "tap_point" || p.kind === "tap_point_group"
    ).length,
    entryKind: activation.approvedEntryPaths.some((p) => p.kind === "card_first")
      ? "card_first"
      : "tap_point",
    scheduleLabel: activation.schedule.label,
    observationActive: true,
    followUpReady: true,
  });

  return {
    ok: true,
    activation,
    plan: dry.plan,
    execution: {
      ...dry.execution,
      livePublish: true,
    },
    domain: {
      campaignStatus: verifiedCampaign.status,
      cardSections: card.sections,
      insightsObservationActive: true,
      preservedEvidence: {
        claimsPreserved: true,
        consentPreserved: true,
        relationshipsPreserved: true,
        auditPreserved: true,
      },
    },
    observation,
    record,
    idempotent: false,
    verifiedPublic: publicOk.reachable,
  };
}

async function compensateActivation(input: {
  businessId: string;
  businessName: string;
  logoUrl?: string | null;
  prior: DurablePriorState;
  campaignId: string;
}) {
  await restoreSpotlightFromPrior({
    businessId: input.businessId,
    businessName: input.businessName,
    logoUrl: input.logoUrl,
    sectionId: input.prior.sectionId,
    priorSection: input.prior.priorSection,
    createdSection: input.prior.createdSection,
  });
  try {
    await prisma.campaign.update({
      where: { id: input.campaignId },
      data: {
        status: input.prior.campaignStatus as "DRAFT" | "READY" | "LIVE" | "PAUSED" | "SCHEDULED" | "ARCHIVED" | "CLOSED",
        scheduledStart: input.prior.scheduledStart
          ? new Date(input.prior.scheduledStart)
          : null,
        scheduledEnd: input.prior.scheduledEnd
          ? new Date(input.prior.scheduledEnd)
          : null,
      },
    });
  } catch {
    // best effort
  }
  if (input.prior.assignment?.createdByF3) {
    try {
      await endDeviceAssignment({
        businessId: input.businessId,
        deviceSlotId: input.prior.assignment.deviceSlotId,
        reopenSlot: true,
      });
      if (input.prior.assignment.priorCampaignId) {
        await assignCampaignToDevice({
          businessId: input.businessId,
          deviceSlotId: input.prior.assignment.deviceSlotId,
          campaignId: input.prior.assignment.priorCampaignId,
        });
      }
    } catch {
      // best effort
    }
  }
}

async function failPersist(input: {
  activation: LiveActivation;
  plan: AutopilotPlan;
  execution: PreparedExecution;
  domain: DomainLiveSnapshot;
  prior: DurablePriorState;
  businessId: string;
  message: string;
  code: NonNullable<LiveActivation["failure"]>["code"];
  compensated: boolean;
  detail?: string;
}): Promise<PersistActivateResult> {
  const activation: LiveActivation = {
    ...input.activation,
    status: "failed",
    localPublish: false,
    observationActive: false,
    hostStateLabel: "Could not go live",
    hostStateDetail: input.message,
    nextSafeAction: "Fix the issue, then try again.",
    failure: {
      code: input.code,
      message: input.message,
      nextAction: "Fix the issue, then try again.",
      compensated: input.compensated,
    },
    honestyStatement: "Your offer is not live. Email and social were not sent.",
    auditRefs: [
      ...input.activation.auditRefs,
      createLiveAuditRef({
        action: input.compensated ? "activation_compensated" : "activation_failed",
        summary: input.message,
        detail: { code: input.code, detail: input.detail },
      }),
    ],
  };
  const record: DurableLiveRecord = {
    schemaVersion: "1.0.0",
    kind: "live_activation",
    activation,
    prior: input.prior,
    verification: {
      campaignStatus: input.prior.campaignStatus,
      spotlightSectionId: null,
      offerFingerprint: null,
      projectionState: "unbound",
      entryPaths: activation.approvedEntryPaths,
      publicReachable: false,
      verifiedAt: new Date().toISOString(),
    },
    planRef: {
      planId: input.plan.id,
      planVersion: input.plan.planVersion ?? 1,
      objective: input.plan.objective,
      audience: input.plan.audience.summary,
    },
    preparedExecutionId: input.execution.executionId,
    plan: input.plan,
    execution: { ...input.execution, livePublish: false },
    businessId: input.businessId,
    distributionSent: false,
    customerContactOccurred: false,
  };
  await saveDurableRecord(record);
  await writeAudit({
    businessId: input.businessId,
    action: "autopilot.live.activation_failed",
    resourceId: activation.activationId,
    metadata: { code: input.code, compensated: input.compensated, detail: input.detail },
  });
  if (input.detail) {
    console.error("F3 activation verification failed:", input.detail);
  }
  return {
    ok: false,
    activation,
    plan: input.plan,
    execution: { ...input.execution, livePublish: false },
    domain: {
      ...input.domain,
      campaignStatus: input.prior.campaignStatus,
    },
    observation: null,
    record,
    idempotent: false,
    verifiedPublic: false,
    message: input.message,
  };
}

export type PersistInterruptInput = {
  businessId: string;
  businessName: string;
  logoUrl?: string | null;
  actorId?: string | null;
  activationId: string;
  plan?: AutopilotPlan;
  execution?: PreparedExecution;
  mode: "stop" | "pause" | "undo" | "manual" | "resume";
  editorHref?: string;
};

export async function persistInterruptLiveActivation(
  input: PersistInterruptInput
): Promise<{
  ok: boolean;
  activation: LiveActivation;
  plan: AutopilotPlan;
  execution: PreparedExecution;
  domain: DomainLiveSnapshot;
  record: DurableLiveRecord | null;
  message?: string;
}> {
  const record = await loadDurableByActivationId(input.businessId, input.activationId);
  if (!record) {
    return {
      ok: false,
      activation: {
        activationId: input.activationId,
        schemaVersion: "1.0.0",
        planId: input.plan?.id || "missing",
        preparedExecutionId: input.execution?.executionId || "missing",
        approvalId: "missing",
        recipeId: input.plan?.recipeId || "card.offer.measurable",
        recipeVersion: input.plan?.recipeVersion || "1.0.0",
        status: "failed",
        activationKey: "missing",
        fingerprints: { plan: "", facts: "", offer: "", preparation: "" },
        campaignId: "",
        cardId: "",
        spotlightSectionId: null,
        approvedEntryPaths: [],
        schedule: { label: "", startsLater: false },
        distributionSent: false,
        customerContactOccurred: false,
        priorCampaignStatus: "DRAFT",
        priorSpotlightSection: null,
        priorInsightsActive: false,
        observationActive: false,
        auditRefs: [],
        failure: {
          code: "partial_failure",
          message: "Live activation record not found.",
          nextAction: "Take manual control.",
        },
        hostSummary: null,
        hostStateLabel: "Needs attention",
        hostStateDetail: "Live activation record not found.",
        honestyStatement: F3_EXTERNAL_BOUNDARY,
        nextSafeAction: "Take manual control.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        localPublish: false,
        interventions: [],
      },
      plan: input.plan as AutopilotPlan,
      execution: input.execution as PreparedExecution,
      domain: {
        campaignStatus: "DRAFT",
        cardSections: [],
        insightsObservationActive: false,
        preservedEvidence: {
          claimsPreserved: true,
          consentPreserved: true,
          relationshipsPreserved: true,
          auditPreserved: true,
        },
      },
      record: null,
      message: "Live activation record not found.",
    };
  }

  const plan = input.plan || record.plan;
  const execution = input.execution || record.execution;
  if (!plan || !execution) {
    return {
      ok: false,
      activation: {
        ...record.activation,
        status: "failed",
        hostStateLabel: "Needs attention",
        hostStateDetail:
          "Autopilot could not restore the prepared plan for this live offer. Take manual control.",
        nextSafeAction: "Take manual control.",
        failure: {
          code: "partial_failure",
          message: "Prepared plan snapshot missing from durable activation evidence.",
          nextAction: "Take manual control.",
        },
      },
      plan: plan as AutopilotPlan,
      execution: execution as PreparedExecution,
      domain: {
        campaignStatus: record.verification.campaignStatus,
        cardSections: [],
        insightsObservationActive: false,
        preservedEvidence: {
          claimsPreserved: true,
          consentPreserved: true,
          relationshipsPreserved: true,
          auditPreserved: true,
        },
      },
      record,
      message: "Prepared plan snapshot missing from durable activation evidence.",
    };
  }

  const brandKit = await prisma.brandKit.findUnique({
    where: { businessId: input.businessId },
  });
  const card = parseTapConnectCard(brandKit?.tapCard, {
    businessName: input.businessName,
  });
  const domain: DomainLiveSnapshot = {
    campaignStatus: record.verification.campaignStatus,
    cardSections: card.sections,
    insightsObservationActive: record.activation.observationActive,
    preservedEvidence: {
      claimsPreserved: true,
      consentPreserved: true,
      relationshipsPreserved: true,
      auditPreserved: true,
    },
  };

  if (input.mode === "resume") {
    const logical = resumeLiveActivation({
      activation: record.activation,
      plan,
      execution,
      domain,
    });
    if (!logical.ok) {
      return { ...logical, record, message: logical.activation.failure?.message };
    }
    const targetStatus =
      logical.activation.status === "scheduled" ? "SCHEDULED" : "LIVE";
    await prisma.campaign.update({
      where: { id: record.activation.campaignId },
      data: { status: targetStatus },
    });
    const next: DurableLiveRecord = {
      ...record,
      activation: logical.activation,
      plan,
      execution,
      verification: {
        ...record.verification,
        campaignStatus: targetStatus,
        verifiedAt: new Date().toISOString(),
        publicReachable: true,
      },
    };
    await saveDurableRecord(next);
    await writeAudit({
      businessId: input.businessId,
      actorId: input.actorId,
      action: "autopilot.live.resume",
      resourceId: record.activation.activationId,
      metadata: { campaignId: record.activation.campaignId, status: targetStatus },
    });
    return {
      ok: true,
      activation: logical.activation,
      plan: logical.plan,
      execution: logical.execution,
      domain: { ...domain, campaignStatus: targetStatus, insightsObservationActive: true },
      record: next,
    };
  }

  const logical = interruptLiveActivation({
    activation: record.activation,
    plan,
    execution,
    domain,
    mode: input.mode,
    editorHref: input.editorHref,
  });

  if (input.mode === "pause") {
    await prisma.campaign.update({
      where: { id: record.activation.campaignId },
      data: { status: "PAUSED" },
    });
  } else if (input.mode === "stop") {
    await prisma.campaign.update({
      where: { id: record.activation.campaignId },
      data: { status: "PAUSED" },
    });
    await restoreSpotlightFromPrior({
      businessId: input.businessId,
      businessName: input.businessName,
      logoUrl: input.logoUrl,
      sectionId: record.prior.sectionId,
      priorSection: record.prior.priorSection,
      createdSection: record.prior.createdSection,
    });
  } else if (input.mode === "undo") {
    await compensateActivation({
      businessId: input.businessId,
      businessName: input.businessName,
      logoUrl: input.logoUrl,
      prior: record.prior,
      campaignId: record.activation.campaignId,
    });
  }

  const verified = await prisma.campaign.findFirst({
    where: { id: record.activation.campaignId, businessId: input.businessId },
    select: { status: true },
  });
  const next: DurableLiveRecord = {
    ...record,
    activation: logical.activation,
    plan,
    execution: logical.execution,
    verification: {
      ...record.verification,
      campaignStatus: verified?.status ?? record.prior.campaignStatus,
      publicReachable: false,
      verifiedAt: new Date().toISOString(),
    },
  };
  await saveDurableRecord(next);
  await writeAudit({
    businessId: input.businessId,
    actorId: input.actorId,
    action: `autopilot.live.${input.mode}`,
    resourceId: record.activation.activationId,
    metadata: {
      campaignStatus: next.verification.campaignStatus,
      claimsPreserved: true,
      consentPreserved: true,
      relationshipsPreserved: true,
      auditPreserved: true,
      distributionSent: false,
    },
  });

  const refreshedKit = await prisma.brandKit.findUnique({
    where: { businessId: input.businessId },
  });
  return {
    ok: logical.ok,
    activation: logical.activation,
    plan: logical.plan,
    execution: logical.execution,
    domain: {
      campaignStatus: next.verification.campaignStatus,
      cardSections: parseTapConnectCard(refreshedKit?.tapCard, {
        businessName: input.businessName,
      }).sections,
      insightsObservationActive: logical.activation.observationActive,
      preservedEvidence: domain.preservedEvidence,
    },
    record: next,
  };
}

export async function loadObservationCounts(input: {
  businessId: string;
  campaignId: string;
}): Promise<ObservationEventCounts> {
  if (!isIsolatedFusionDatabaseConfigured()) return {};
  const types = [
    "card_offer_viewed",
    "card_offer_claimed",
    "card_offer_lead",
    "card_offer_kept",
  ] as const;
  const rows = await prisma.clickEvent.groupBy({
    by: ["eventType"],
    where: {
      businessId: input.businessId,
      campaignId: input.campaignId,
      eventType: { in: [...types] },
    },
    _count: { _all: true },
  });
  const map = Object.fromEntries(rows.map((r) => [r.eventType, r._count._all]));
  return {
    spotlightViews: map.card_offer_viewed ?? undefined,
    claims: map.card_offer_claimed ?? undefined,
    leads: map.card_offer_lead ?? undefined,
    keeps: map.card_offer_kept ?? undefined,
  };
}

/** Load durable record (exported for API / tests) */
export async function loadDurableByActivationIdSafe(
  businessId: string,
  activationId: string
): Promise<DurableLiveRecord | null> {
  return loadDurableByActivationId(businessId, activationId);
}

/** Test helper — clear memory store */
export function resetLivePersistMemory() {
  memoryRecords.clear();
  memoryCurrent.clear();
}

export { provePublicOfferReachable };
