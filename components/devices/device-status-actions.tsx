"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const STATUS_ACTIONS = [
  { status: "ACTIVE", label: "Activate" },
  { status: "INACTIVE", label: "Deactivate" },
  { status: "LOST", label: "Mark lost" },
  { status: "REPLACED", label: "Mark replaced" },
  { status: "CLOSED", label: "Close device" },
] as const;

export function DeviceStatusActions({
  deviceId,
  currentStatus,
}: {
  deviceId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function updateStatus(status: string) {
    setLoading(status);
    setMessage(null);
    const res = await fetch("/api/devices/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, status }),
    });
    setLoading(null);
    if (!res.ok) {
      setMessage("Update failed");
      return;
    }
    setMessage(`Status → ${status.toLowerCase()}`);
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-xl border border-border/60 p-5">
      <h3 className="font-semibold">Device status</h3>
      <p className="text-sm text-muted-foreground">
        Current: <span className="font-medium text-foreground">{currentStatus.toLowerCase()}</span>
        . Lost tags can stay active or be closed — active slot limits still apply.
      </p>
      <div className="flex flex-wrap gap-2">
        {STATUS_ACTIONS.filter((a) => a.status !== currentStatus).map((action) => (
          <Button
            key={action.status}
            variant="outline"
            size="sm"
            disabled={!!loading}
            onClick={() => updateStatus(action.status)}
          >
            {loading === action.status ? "..." : action.label}
          </Button>
        ))}
      </div>
      {message && <p className="text-xs text-primary">{message}</p>}
    </div>
  );
}
