/**
 * Default outbox drain handlers — TapFlow effects use provider stubs; others ack only.
 */

import { drainTapFlowEffect } from "@/lib/fusion/journey/effect-providers";
import type { OutboxRecord } from "./events";

export type EffectDrainResult = {
  handled: boolean;
  topic: string;
  note: string;
  ok?: boolean;
  mock?: boolean;
  providerRef?: string;
};

/**
 * Drain TapFlow / Autopilot / TapSave effect topics.
 * tapflow.effect.* routes through Guardian-gated mock provider stubs.
 */
export async function defaultOutboxEffectHandler(
  record: OutboxRecord
): Promise<EffectDrainResult> {
  const topic = record.topic;

  const tapflow = await drainTapFlowEffect(record);
  if (tapflow) {
    return {
      handled: tapflow.handled,
      topic,
      note: tapflow.note,
      ok: tapflow.ok,
      mock: tapflow.mock,
      providerRef: tapflow.providerRef,
    };
  }

  if (topic.startsWith("journey.") || topic.startsWith("autopilot.") || topic.startsWith("tapsave.")) {
    return {
      handled: true,
      topic,
      note: `Acknowledged ${topic}`,
    };
  }
  return {
    handled: true,
    topic,
    note: "Generic publish ack",
  };
}
