"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function DeviceAssignForm({
  deviceId,
  campaigns,
  currentCampaignId,
}: {
  deviceId: string;
  campaigns: { id: string; title: string; status: string }[];
  currentCampaignId?: string;
}) {
  const router = useRouter();
  const [campaignId, setCampaignId] = useState(currentCampaignId ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleAssign() {
    if (!campaignId) return;
    setLoading(true);
    setMessage(null);

    const res = await fetch("/api/campaigns/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceSlotId: deviceId, campaignId }),
    });

    if (!res.ok) {
      setMessage("Failed to assign campaign");
      setLoading(false);
      return;
    }

    setMessage("Campaign assigned and live!");
    setLoading(false);
    router.refresh();
  }

  if (campaigns.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Create a campaign in the Workbench first, then assign it here.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 p-5">
      <h3 className="font-semibold">Assign Campaign</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose a Workbench campaign to show on this device. The physical URL stays the same.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label>Campaign</Label>
          <select
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            className="flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 text-sm"
          >
            <option value="">Select campaign...</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.status.toLowerCase()})
              </option>
            ))}
          </select>
        </div>
        <Button onClick={handleAssign} disabled={loading || !campaignId}>
          {loading ? "Assigning..." : "Assign & Go Live"}
        </Button>
      </div>
      {message && <p className="mt-3 text-sm text-primary">{message}</p>}
    </div>
  );
}
