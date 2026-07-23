/**
 * Default outbox drain handlers — queue-only effects (no live provider sends).
 */

import type { OutboxRecord } from "./events";

export type EffectDrainResult = {
  handled: boolean;
  topic: string;
  note: string;
};

/**
 * Acknowledge TapFlow / Autopilot / TapSave effect topics without calling providers.
 * Live email/SMS/wallet still require credentials + separate adapters.
 */
export async function defaultOutboxEffectHandler(
  record: OutboxRecord
): Promise<EffectDrainResult> {
  const topic = record.topic;
  if (topic.startsWith("tapflow.effect.")) {
    return {
      handled: true,
      topic,
      note: `Acknowledged ${topic} (queue-only; provider send not invoked)`,
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
