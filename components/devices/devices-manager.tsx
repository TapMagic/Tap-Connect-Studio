"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getDevicePath } from "@/lib/utils/app";
import { cn } from "@/lib/utils";

interface DeviceRow {
  id: string;
  deviceCode: string;
  nickname: string | null;
  status: string;
  deviceType: string;
  totalTapCount: number;
  lastTappedAt: string | null;
  campaignTitle: string | null;
}

const TABS = [
  { id: "ALL", label: "All" },
  { id: "ACTIVE", label: "Active" },
  { id: "UNASSIGNED", label: "Unassigned" },
  { id: "INACTIVE", label: "Inactive" },
  { id: "LOST", label: "Lost" },
  { id: "CLOSED", label: "Closed" },
  { id: "ARCHIVED", label: "Archived" },
] as const;

export function DevicesManager({
  devices: initial,
  limit,
}: {
  devices: DeviceRow[];
  limit: number;
}) {
  const router = useRouter();
  const [devices, setDevices] = useState(initial);
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("ALL");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setDevices(initial);
  }, [initial]);

  const quotaUsed = devices.filter((d) =>
    ["ACTIVE", "UNASSIGNED"].includes(d.status)
  ).length;

  const counts = useMemo(() => {
    const map: Record<string, number> = { ALL: devices.length };
    for (const d of devices) map[d.status] = (map[d.status] ?? 0) + 1;
    return map;
  }, [devices]);

  const filtered = devices.filter((d) => (tab === "ALL" ? true : d.status === tab));

  async function createDevice() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: nickname || undefined }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create device");
      setLoading(false);
      return;
    }
    setNickname("");
    setLoading(false);
    router.refresh();
  }

  function copyUrl(code: string) {
    const url = `${window.location.origin}/t/${code}`;
    void navigator.clipboard.writeText(url);
    setMessage("URL copied");
  }

  async function closeDevice(id: string) {
    if (confirmId !== id) {
      setConfirmId(id);
      setMessage("Click delete again to close this device and free the slot");
      return;
    }
    setConfirmId(null);
    setBusy(id);
    const prev = devices;
    setDevices((list) => list.filter((d) => d.id !== id));
    const res = await fetch("/api/devices/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: id, status: "CLOSED" }),
    });
    setBusy(null);
    if (!res.ok) {
      setDevices(prev);
      setMessage("Failed to close device");
      return;
    }
    setMessage("Device closed — slot freed");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-lg">Add Device</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Device nickname (optional)"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="flex-1"
          />
          <Button onClick={createDevice} disabled={loading || quotaUsed >= limit}>
            <Plus className="mr-2 h-4 w-4" />
            {loading ? "Creating..." : "Create Device Slot"}
          </Button>
        </CardContent>
        {error && <p className="px-6 pb-4 text-sm text-destructive">{error}</p>}
        <p className="px-6 pb-4 text-xs text-muted-foreground">
          {quotaUsed} of {limit} slots in use (active + unassigned). Closed/lost devices do not
          count.
        </p>
      </Card>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium",
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label} <span className="opacity-70">{counts[t.id] ?? 0}</span>
          </button>
        ))}
      </div>

      {message && <p className="text-sm text-primary">{message}</p>}

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            {devices.length === 0
              ? "No devices yet. Create your first device slot above."
              : "No devices in this tab."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map((d) => (
            <Card key={d.id} className="border-border/60">
              <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{d.nickname ?? d.deviceCode}</p>
                    <Badge variant="outline">{d.status.toLowerCase()}</Badge>
                  </div>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {getDevicePath(d.deviceCode)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {d.campaignTitle ?? "No campaign assigned"} · {d.totalTapCount} taps
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => copyUrl(d.deviceCode)}>
                    <Copy className="mr-1 h-3.5 w-3.5" />
                    Copy URL
                  </Button>
                  <a
                    href={`/t/${d.deviceCode}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-7 items-center justify-center rounded-lg border border-primary/20 bg-background/70 px-2.5 text-[0.8rem] font-medium hover:border-primary/45 hover:bg-primary/10"
                  >
                    <ExternalLink className="mr-1 h-3.5 w-3.5" />
                    Preview
                  </a>
                  <a
                    href={`/dashboard/devices/${d.id}`}
                    className="inline-flex h-7 items-center justify-center rounded-lg bg-primary px-2.5 text-[0.8rem] font-medium text-primary-foreground"
                  >
                    Manage
                  </a>
                  {d.status !== "CLOSED" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!!busy}
                      className={
                        confirmId === d.id
                          ? "bg-red-500/20 text-red-300"
                          : "text-red-400 hover:text-red-300"
                      }
                      onClick={() => void closeDevice(d.id)}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Close
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
