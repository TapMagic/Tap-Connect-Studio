/**
 * Pulse offline action queue — in-memory stub until service worker lands.
 * Does not claim durable offline delivery.
 */

export type PulseQueuedAction = {
  id: string;
  kind: "claim" | "rotate" | "note";
  payload: Record<string, unknown>;
  createdAt: string;
  status: "queued" | "flushed" | "failed";
  lastError?: string;
};

const queues = new Map<string, PulseQueuedAction[]>();

export function resetPulseOfflineQueues() {
  queues.clear();
}

export function enqueuePulseAction(
  businessId: string,
  kind: PulseQueuedAction["kind"],
  payload: Record<string, unknown> = {}
): PulseQueuedAction {
  const action: PulseQueuedAction = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `pulse_${Date.now().toString(36)}`,
    kind,
    payload,
    createdAt: new Date().toISOString(),
    status: "queued",
  };
  const list = queues.get(businessId) ?? [];
  list.unshift(action);
  queues.set(businessId, list.slice(0, 100));
  return action;
}

export function listPulseQueue(businessId: string): PulseQueuedAction[] {
  return [...(queues.get(businessId) ?? [])];
}

/** Mark queued items flushed — real sync needs network + Scan/Tap Point APIs */
export function flushPulseQueue(businessId: string): {
  flushed: number;
  remaining: number;
} {
  const list = queues.get(businessId) ?? [];
  let flushed = 0;
  for (const a of list) {
    if (a.status === "queued") {
      a.status = "flushed";
      flushed += 1;
    }
  }
  const remaining = list.filter((a) => a.status === "queued").length;
  return { flushed, remaining };
}
