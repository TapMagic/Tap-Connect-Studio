"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  proposalId: string;
  initialStatus: string;
  onAccepted?: () => void;
  onRejected?: () => void;
};

export function AutopilotProposalActions({
  proposalId,
  initialStatus,
  onAccepted,
  onRejected,
}: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "accept" | "reject" | "undo") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId, decision }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Decision failed");
        return;
      }
      setStatus(data.proposal.status);
      if (decision === "accept") onAccepted?.();
      if (decision === "reject") onRejected?.();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">
        Proposal <code className="text-primary">{proposalId.slice(0, 8)}</code> —{" "}
        <span className="capitalize text-foreground">{status}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {status === "pending" ? (
          <>
            <Button size="sm" disabled={busy} onClick={() => decide("accept")}>
              Accept
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => decide("reject")}>
              Reject
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => decide("undo")}>
            Undo
          </Button>
        )}
      </div>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
