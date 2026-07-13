"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Nfc } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QuickAssignButton({
  campaignId,
  devices,
}: {
  campaignId: string;
  devices: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deviceId, setDeviceId] = useState(devices[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function assign() {
    if (!deviceId) return;
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/campaigns/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceSlotId: deviceId, campaignId }),
    });
    setLoading(false);
    if (!res.ok) {
      setMsg("Assign failed");
      return;
    }
    setMsg("Live on device");
    setOpen(false);
    router.refresh();
  }

  if (devices.length === 0) {
    return (
      <Button variant="outline" size="sm" disabled title="Create a device first">
        <Nfc className="mr-1 h-3.5 w-3.5" />
        Assign
      </Button>
    );
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Nfc className="mr-1 h-3.5 w-3.5" />
        Assign
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-background/80 p-2">
      <select
        className="h-8 max-w-[160px] rounded-md border border-input bg-background px-2 text-xs"
        value={deviceId}
        onChange={(e) => setDeviceId(e.target.value)}
      >
        {devices.map((d) => (
          <option key={d.id} value={d.id}>
            {d.label}
          </option>
        ))}
      </select>
      <Button size="sm" disabled={loading} onClick={() => void assign()}>
        {loading ? "…" : "Publish"}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      {msg && <span className="text-xs text-primary">{msg}</span>}
    </div>
  );
}
