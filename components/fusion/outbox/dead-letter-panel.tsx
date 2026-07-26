"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type DeadLetter = {
  id: string;
  topic: string;
  status: string;
  attempts: number;
  lastError?: string;
  availableAt: string;
};

export function OutboxDeadLetterPanel({
  initialRecords,
}: {
  initialRecords: DeadLetter[];
}) {
  const [records, setRecords] = useState(initialRecords);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function retry(id: string) {
    setMessage(null);
    startTransition(async () => {
      const res = await fetch("/api/outbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry", id }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessage(data.error ?? "Retry failed");
        return;
      }
      setRecords((prev) => prev.filter((r) => r.id !== id));
      setMessage("Re-queued as PENDING");
    });
  }

  async function discard(id: string) {
    setMessage(null);
    startTransition(async () => {
      const res = await fetch("/api/outbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "discard", id }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessage(data.error ?? "Discard failed");
        return;
      }
      setRecords((prev) => prev.filter((r) => r.id !== id));
      setMessage("Discarded from retry queue");
    });
  }

  async function processNow() {
    setMessage(null);
    startTransition(async () => {
      const res = await fetch("/api/outbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "process" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessage(data.error ?? "Process failed");
        return;
      }
      setMessage(
        `Processed ${data.tick?.processed ?? 0} · failed ${data.tick?.failed ?? 0}`
      );
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Failed outbox events (dead letters). Retry re-queues; Discard removes without delivery;
          Process now drains PENDING.
        </p>
        <Button size="sm" variant="outline" disabled={pending} onClick={processNow}>
          Process now
        </Button>
      </div>
      {message ? <p className="text-sm text-primary">{message}</p> : null}
      {records.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
          No dead letters — outbox is clear.
        </p>
      ) : (
        <div className="space-y-2">
          {records.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm"
              data-testid="outbox-dead-letter"
              data-outbox-id={r.id}
            >
              <div>
                <p className="font-medium">{r.topic}</p>
                <p className="text-xs text-muted-foreground">
                  {r.lastError ?? "No error detail"} · attempts {r.attempts}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{r.status}</Badge>
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() => retry(r.id)}
                  data-testid="outbox-retry"
                >
                  Retry
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => discard(r.id)}
                  data-testid="outbox-discard"
                >
                  Discard
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
