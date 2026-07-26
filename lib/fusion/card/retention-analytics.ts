/**
 * Fire retention analytics via existing public click pipeline.
 * Never claims live Wallet install for mock previews.
 */

import { RETENTION_EVENTS } from "./retention";

export async function trackRetentionEvent(input: {
  eventType: string;
  businessId?: string;
  campaignId?: string;
  deviceSlotId?: string;
  blockId?: string;
  method?: string;
}): Promise<void> {
  try {
    await fetch("/api/tap/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: input.eventType,
        businessId: input.businessId,
        campaignId: input.campaignId,
        deviceSlotId: input.deviceSlotId,
        blockId: input.blockId ?? input.method,
      }),
    });
  } catch {
    // best-effort
  }
}

export { RETENTION_EVENTS };
