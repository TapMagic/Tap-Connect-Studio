/**
 * Conversational / ManyChat-style node family — triggers + actions.
 * Regulated actions evaluate Channel Guardian; blocked actions show reason + alternatives.
 */

import { evaluateChannelGuardian, type GuardianPurpose, type MessageChannel } from "@/lib/fusion/comms/channel-guardian";
import {
  RESERVED_CONVERSATIONAL_KEYWORDS,
  buildConversationalKeywordSet,
  type KeywordBrandPack,
} from "@/lib/fusion/keywords/client";
import { addNode, requireCanvas } from "./graph";
import { appendCanvasAudit } from "./store";
import type { ConversationalActionId, ConversationalTriggerId } from "./types";

export const TRIGGER_CATALOG: Array<{
  id: ConversationalTriggerId;
  label: string;
  description: string;
}> = [
  { id: "tap_scan", label: "Tap scan", description: "Visitor taps a Tap Point" },
  { id: "keep_card", label: "Keep Card", description: "Visitor keeps a Tap Card" },
  { id: "keyword", label: "Keyword", description: "Inbound keyword match" },
  { id: "schedule", label: "Schedule", description: "Time-based trigger" },
  { id: "work_item_completed", label: "Work item completed", description: "ExternalWorkItem done" },
  { id: "tiktok_engagement", label: "TikTok engagement", description: "TapCast engagement signal" },
];

export const ACTION_CATALOG: Array<{
  id: ConversationalActionId;
  label: string;
  description: string;
  regulated: boolean;
  channel?: MessageChannel;
  purpose?: GuardianPurpose;
}> = [
  {
    id: "send_email",
    label: "Send email",
    description: "Email follow-up",
    regulated: true,
    channel: "email",
    purpose: "promo",
  },
  {
    id: "send_dm",
    label: "Send DM",
    description: "Messenger / Instagram DM",
    regulated: true,
    channel: "messenger",
    purpose: "promo",
  },
  {
    id: "send_sms",
    label: "Send SMS",
    description: "SMS message",
    regulated: true,
    channel: "sms",
    purpose: "promo",
  },
  {
    id: "create_work_item",
    label: "Create work item",
    description: "ExternalWorkItem via Productivity connectors",
    regulated: false,
  },
  {
    id: "assign_tap_point",
    label: "Assign Tap Point",
    description: "Logical assignment preview (device URL immutable)",
    regulated: false,
  },
  {
    id: "wait",
    label: "Wait",
    description: "Delay before next step",
    regulated: false,
  },
  {
    id: "tag_contact",
    label: "Tag contact",
    description: "Audience tag",
    regulated: false,
  },
  {
    id: "open_wallet",
    label: "Open wallet pass",
    description: "Wallet enrollment prompt",
    regulated: false,
  },
];

export type CanvasActionEval = {
  actionId: ConversationalActionId;
  allowed: boolean;
  reason: string;
  code: string;
  alternatives: string[];
};

export function evaluateCanvasAction(opts: {
  actionId: ConversationalActionId;
  businessId?: string;
  consentGiven?: boolean;
  providerReady?: boolean;
  purpose?: GuardianPurpose;
}): CanvasActionEval {
  const def = ACTION_CATALOG.find((a) => a.id === opts.actionId);
  if (!def) {
    return {
      actionId: opts.actionId,
      allowed: false,
      reason: "Unknown action",
      code: "unknown",
      alternatives: [],
    };
  }

  if (!def.regulated || !def.channel) {
    return {
      actionId: opts.actionId,
      allowed: true,
      reason: "Non-regulated canvas action",
      code: "ok",
      alternatives: [],
    };
  }

  const decision = evaluateChannelGuardian({
    channel: def.channel,
    businessId: opts.businessId,
    purpose: opts.purpose ?? def.purpose ?? "promo",
    consentGiven: opts.consentGiven,
    providerReady: opts.providerReady ?? true,
    featureEnabled: true,
    planAllows: true,
  });

  const alternatives: string[] = [];
  if (!decision.allowed) {
    if (decision.code === "no_consent") {
      alternatives.push("Collect explicit opt-in before promo send");
      alternatives.push("Switch purpose to transactional/service if eligible");
    }
    if (decision.code === "provider_missing") {
      alternatives.push("Use mock provider path for local testing");
      alternatives.push("Configure live credentials in Settings");
    }
    if (decision.code === "quiet_hours") {
      alternatives.push("Schedule send outside quiet hours");
    }
    alternatives.push("Create ExternalWorkItem for human follow-up instead");
  }

  return {
    actionId: opts.actionId,
    allowed: decision.allowed,
    reason: decision.reason,
    code: decision.code,
    alternatives,
  };
}

export function addConversationalTrigger(
  canvasId: string,
  triggerId: ConversationalTriggerId
) {
  const def = TRIGGER_CATALOG.find((t) => t.id === triggerId);
  if (!def) throw new Error(`Unknown trigger: ${triggerId}`);
  const result = addNode(canvasId, {
    kind: "trigger",
    label: def.label,
    sketch: false,
    data: { triggerId, catalog: "conversational", executes: true },
  });
  appendCanvasAudit({
    canvasId,
    action: "conversational.trigger_added",
    detail: { triggerId },
  });
  return result;
}

export function addConversationalAction(
  canvasId: string,
  actionId: ConversationalActionId,
  opts: {
    businessId?: string;
    consentGiven?: boolean;
    providerReady?: boolean;
    purpose?: GuardianPurpose;
  } = {}
) {
  const def = ACTION_CATALOG.find((a) => a.id === actionId);
  if (!def) throw new Error(`Unknown action: ${actionId}`);
  const evalResult = evaluateCanvasAction({
    actionId,
    businessId: opts.businessId ?? requireCanvas(canvasId).businessId,
    consentGiven: opts.consentGiven,
    providerReady: opts.providerReady,
    purpose: opts.purpose,
  });

  const result = addNode(canvasId, {
    kind: "action",
    label: def.label,
    sketch: false,
    data: {
      actionId,
      catalog: "conversational",
      regulated: def.regulated,
      guardianBlocked: !evalResult.allowed,
      guardianReason: evalResult.reason,
      guardianCode: evalResult.code,
      alternatives: evalResult.alternatives,
      executes: evalResult.allowed,
    },
  });

  appendCanvasAudit({
    canvasId,
    action: "conversational.action_added",
    detail: { actionId, guardian: evalResult },
  });

  return { ...result, evaluation: evalResult };
}

/**
 * Bind Brand Pack keywords to a conversational keyword trigger node.
 * Reserved/control words are flagged; regulated send actions still require Channel Guardian.
 * Optionally records a VocabularyTriggerBinding on channel `tapcanvas` for collision detection.
 */
export function bindKeywordTriggerFromBrandPack(
  canvasId: string,
  pack: KeywordBrandPack,
  extraTriggers: string[] = []
) {
  const set = buildConversationalKeywordSet(pack, extraTriggers);
  const reserved = new Set<string>(RESERVED_CONVERSATIONAL_KEYWORDS);
  const safeTriggers = set.triggers.filter((t) => !reserved.has(t));

  const result = addNode(canvasId, {
    kind: "trigger",
    label: "Keyword (Brand Pack)",
    sketch: false,
    data: {
      triggerId: "keyword" satisfies ConversationalTriggerId,
      catalog: "conversational",
      executes: true,
      keywords: safeTriggers,
      synonyms: set.synonyms,
      misspellings: set.misspellings,
      collisions: set.collisions,
      reservedHits: set.reservedHits,
      guardianNote: set.guardianNote,
    },
  });

  appendCanvasAudit({
    canvasId,
    action: "conversational.keyword_brand_pack_bound",
    detail: {
      triggerCount: safeTriggers.length,
      collisionCount: set.collisions.length,
      reservedCount: set.reservedHits.length,
    },
  });

  return { ...result, conversational: set };
}

/** Primary keyword for binding into shared VocabularyTriggerBinding (collision-aware). */
export function primaryKeywordForBinding(
  pack: KeywordBrandPack,
  extraTriggers: string[] = []
): string | null {
  const set = buildConversationalKeywordSet(pack, extraTriggers);
  const reserved = new Set<string>(RESERVED_CONVERSATIONAL_KEYWORDS);
  const safe = set.triggers.filter((t) => !reserved.has(t));
  return safe[0] ?? null;
}

