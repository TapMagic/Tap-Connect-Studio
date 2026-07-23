/**
 * TapFlow provider-effect stubs — drain tapflow.effect.* outbox topics beyond queue-only ack.
 * Email routes through Guardian-gated mock enqueue; other effects return structured mock refs.
 */

import { sendEmailViaMock } from "@/lib/fusion/comms/email-mock";
import type { OutboxRecord } from "@/lib/fusion/publication/events";

export type TapFlowEffectDrainResult = {
  handled: boolean;
  action: string;
  ok: boolean;
  mock: boolean;
  providerRef?: string;
  code?: string;
  note: string;
};

function actionFromTopic(topic: string): string | null {
  if (!topic.startsWith("tapflow.effect.")) return null;
  return topic.slice("tapflow.effect.".length);
}

function payloadStr(payload: Record<string, unknown>, key: string): string | undefined {
  const v = payload[key];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function guardianAllowed(payload: Record<string, unknown>): boolean {
  const code = payloadStr(payload, "guardian");
  return !code || code === "ok";
}

function mockRef(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}`;
}

async function drainEmailEffect(
  businessId: string,
  payload: Record<string, unknown>
): Promise<TapFlowEffectDrainResult> {
  if (!guardianAllowed(payload)) {
    return {
      handled: true,
      action: "email",
      ok: false,
      mock: true,
      code: payloadStr(payload, "guardian") ?? "guardian_blocked",
      note: "TapFlow email blocked by Guardian at drain",
    };
  }

  const visitorId = payloadStr(payload, "visitorId") ?? "anonymous";
  const to =
    payloadStr(payload, "recipientEmail") ??
    payloadStr(payload, "to") ??
    `visitor+${visitorId.slice(0, 12)}@tapflow.mock`;
  const subject = payloadStr(payload, "detail") ?? "Journey update";

  const result = await sendEmailViaMock({
    businessId,
    to,
    subject,
    body: `TapFlow journey email for run ${payloadStr(payload, "runId") ?? "unknown"}`,
    purpose: "promo",
    consentGiven: true,
  });

  if (!result.ok) {
    return {
      handled: true,
      action: "email",
      ok: false,
      mock: true,
      code: result.code,
      note: result.error,
    };
  }

  return {
    handled: true,
    action: "email",
    ok: true,
    mock: result.mock,
    providerRef: result.providerRef,
    note: result.mock
      ? "TapFlow email enqueued via mock adapter (Guardian passed)"
      : "TapFlow email enqueued for live provider",
  };
}

async function drainMessageEffect(
  businessId: string,
  payload: Record<string, unknown>
): Promise<TapFlowEffectDrainResult> {
  if (!guardianAllowed(payload)) {
    return {
      handled: true,
      action: "message",
      ok: false,
      mock: true,
      code: payloadStr(payload, "guardian") ?? "guardian_blocked",
      note: "TapFlow message blocked by Guardian at drain",
    };
  }

  const channel = (payloadStr(payload, "detail") ?? "email").toLowerCase();
  const ref = mockRef(`mock_${channel}`);

  return {
    handled: true,
    action: "message",
    ok: true,
    mock: true,
    providerRef: ref,
    note: `TapFlow ${channel} message stub enqueued for business ${businessId}`,
  };
}

function drainLoyaltyEffect(payload: Record<string, unknown>): TapFlowEffectDrainResult {
  const points = payloadStr(payload, "detail")?.match(/points=(\d+)/)?.[1] ?? "0";
  return {
    handled: true,
    action: "award_loyalty",
    ok: true,
    mock: true,
    providerRef: mockRef("mock_loyalty"),
    note: `TapLoop award stub (${points} pts) — ledger write deferred to TapLoop service`,
  };
}

function drainCaseEffect(payload: Record<string, unknown>): TapFlowEffectDrainResult {
  return {
    handled: true,
    action: "create_case",
    ok: true,
    mock: true,
    providerRef: mockRef("mock_case"),
    note: `Inbox case stub: ${payloadStr(payload, "detail") ?? "TapCase"}`,
  };
}

function drainHandoffEffect(): TapFlowEffectDrainResult {
  return {
    handled: true,
    action: "human_handoff",
    ok: true,
    mock: true,
    providerRef: mockRef("mock_handoff"),
    note: "Human handoff stub queued for operator inbox",
  };
}

/**
 * Drain a single tapflow.effect.* outbox record through provider stubs.
 * Returns null when the topic is not a TapFlow effect.
 */
export async function drainTapFlowEffect(
  record: OutboxRecord
): Promise<TapFlowEffectDrainResult | null> {
  const action = actionFromTopic(record.topic);
  if (!action) return null;

  const businessId = record.envelope.businessId ?? "";
  const payload = record.envelope.payload;

  switch (action) {
    case "email":
      return drainEmailEffect(businessId, payload);
    case "message":
      return drainMessageEffect(businessId, payload);
    case "award_loyalty":
      return drainLoyaltyEffect(payload);
    case "create_case":
      return drainCaseEffect(payload);
    case "human_handoff":
      return drainHandoffEffect();
    default:
      return {
        handled: true,
        action,
        ok: false,
        mock: true,
        code: "unknown_action",
        note: `Unknown TapFlow effect action: ${action}`,
      };
  }
}
