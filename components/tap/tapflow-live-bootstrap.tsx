"use client";

/**
 * Boots TapFlow live visitor execution from the public tap page.
 * Hits /api/public/tapflow/trigger so the session cookie is set and
 * refresh reuses the same JourneyExecution (idempotent).
 */

import { useEffect, useState } from "react";

type Props = {
  deviceCode: string;
  campaignId?: string;
};

export function TapFlowLiveBootstrap({ deviceCode, campaignId }: Props) {
  const [status, setStatus] = useState<"idle" | "ok" | "skipped" | "error">("idle");
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [duplicated, setDuplicated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/public/tapflow/trigger", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            deviceCode,
            campaignId,
            consent: { email: true, marketing: true, sms: false },
            email: `visitor+${deviceCode}@tapflow.local`,
          }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          skipped?: string;
          executions?: Array<{ id: string; duplicated?: boolean; status?: string }>;
        };
        if (cancelled) return;
        if (!res.ok) {
          setStatus("error");
          return;
        }
        const first = json.executions?.[0];
        if (first?.id) {
          setExecutionId(first.id);
          setDuplicated(Boolean(first.duplicated));
          setStatus("ok");
        } else {
          setStatus(json.skipped ? "skipped" : "ok");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deviceCode, campaignId]);

  return (
    <div
      data-testid="tapflow-live-bootstrap"
      data-status={status}
      data-execution-id={executionId ?? ""}
      data-duplicated={duplicated ? "1" : "0"}
      className="sr-only"
      aria-hidden
    />
  );
}
