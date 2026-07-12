"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Archive, ExternalLink, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDevicePath } from "@/lib/utils/app";

type CampaignRow = {
  id: string;
  title: string;
  status: string;
  campaignType: string;
};

type DeviceRow = {
  id: string;
  deviceCode: string;
  nickname: string | null;
  status: string;
  totalTapCount: number;
  lastTappedLabel: string;
  campaignTitle: string | null;
};

export function OverviewLists({
  campaigns: initialCampaigns,
  devices: initialDevices,
  deviceLimit,
  activeDevices: initialActiveDevices,
}: {
  campaigns: CampaignRow[];
  devices: DeviceRow[];
  deviceLimit: number;
  activeDevices: number;
}) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [devices, setDevices] = useState(initialDevices);
  const [activeDevices, setActiveDevices] = useState(initialActiveDevices);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  useEffect(() => {
    setCampaigns(initialCampaigns);
    setDevices(initialDevices);
    setActiveDevices(initialActiveDevices);
  }, [initialCampaigns, initialDevices, initialActiveDevices]);

  async function archiveCampaign(id: string) {
    setBusy(`archive-${id}`);
    setPendingDelete(null);
    setMessage(null);
    const prevCampaigns = campaigns;
    const prevDevices = devices;
    const removed = campaigns.find((c) => c.id === id);
    setCampaigns((list) => list.filter((c) => c.id !== id));
    if (removed) {
      setDevices((list) =>
        list.map((d) =>
          d.campaignTitle === removed.title
            ? {
                ...d,
                campaignTitle: null,
                status: d.status === "ACTIVE" ? "UNASSIGNED" : d.status,
              }
            : d
        )
      );
    }

    const res = await fetch("/api/campaigns/actions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId: id, status: "ARCHIVED" }),
    });
    setBusy(null);
    if (!res.ok) {
      setCampaigns(prevCampaigns);
      setDevices(prevDevices);
      setMessage("Archive failed");
      return;
    }
    setMessage("Campaign archived — linked devices cleared");
    router.refresh();
  }

  async function deleteCampaign(id: string) {
    if (pendingDelete !== `c-${id}`) {
      setPendingDelete(`c-${id}`);
      setMessage("Click delete again to confirm");
      return;
    }
    setPendingDelete(null);
    setBusy(`delete-c-${id}`);
    setMessage(null);
    const prevCampaigns = campaigns;
    const prevDevices = devices;
    const removed = campaigns.find((c) => c.id === id);
    setCampaigns((list) => list.filter((c) => c.id !== id));
    if (removed) {
      setDevices((list) =>
        list.map((d) =>
          d.campaignTitle === removed.title
            ? {
                ...d,
                campaignTitle: null,
                status: d.status === "ACTIVE" ? "UNASSIGNED" : d.status,
              }
            : d
        )
      );
    }

    const res = await fetch("/api/campaigns/actions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId: id }),
    });
    setBusy(null);
    if (!res.ok) {
      setCampaigns(prevCampaigns);
      setDevices(prevDevices);
      setMessage("Delete campaign failed");
      return;
    }
    setMessage("Campaign deleted — devices freed for reuse");
    router.refresh();
  }

  async function deleteDevice(id: string) {
    if (pendingDelete !== `d-${id}`) {
      setPendingDelete(`d-${id}`);
      setMessage("Click delete again to confirm — frees this slot");
      return;
    }
    setPendingDelete(null);
    setBusy(`delete-d-${id}`);
    setMessage(null);
    const prev = devices;
    const removed = devices.find((d) => d.id === id);
    setDevices((list) => list.filter((d) => d.id !== id));
    if (removed?.status === "ACTIVE") {
      setActiveDevices((n) => Math.max(0, n - 1));
    }

    // Close device: ends assignment and removes from active/unassigned quota
    const res = await fetch("/api/devices/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: id, status: "CLOSED" }),
    });
    setBusy(null);
    if (!res.ok) {
      setDevices(prev);
      if (removed?.status === "ACTIVE") setActiveDevices((n) => n + 1);
      setMessage("Failed to delete device");
      return;
    }
    setMessage("Device removed — slot free for a new device");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {message && <p className="text-sm text-primary">{message}</p>}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/60">
          <CardHeader>
            <CardTitle>Recent Campaigns</CardTitle>
            <CardDescription>Archive or delete — linked devices are cleared</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {campaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No campaigns yet.{" "}
                <Link href="/dashboard/workbench" className="text-primary hover:underline">
                  Create your first
                </Link>
              </p>
            ) : (
              campaigns.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/40 px-3 py-2"
                >
                  <Link href={`/dashboard/campaigns/${c.id}`} className="min-w-0 flex-1 hover:text-primary">
                    <p className="font-medium">{c.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.campaignType.replace(/_/g, " ").toLowerCase()}
                    </p>
                  </Link>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline">{c.status.toLowerCase()}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!!busy}
                      onClick={() => void archiveCampaign(c.id)}
                      title="Archive"
                    >
                      <Archive className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!!busy}
                      className={
                        pendingDelete === `c-${c.id}`
                          ? "bg-red-500/20 text-red-300"
                          : "text-red-400 hover:text-red-300"
                      }
                      onClick={() => void deleteCampaign(c.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardHeader>
            <CardTitle>Your Devices</CardTitle>
            <CardDescription>
              {activeDevices} of {deviceLimit} active slots used — delete frees a slot
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {devices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No devices yet.{" "}
                <Link href="/dashboard/devices" className="text-primary hover:underline">
                  Add a device
                </Link>
              </p>
            ) : (
              devices.map((d) => (
                <div
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/40 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <Link href={`/dashboard/devices/${d.id}`} className="font-medium hover:text-primary">
                      {d.nickname ?? d.deviceCode}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {d.campaignTitle ?? "No campaign"} · {d.totalTapCount} taps · {d.lastTappedLabel}
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground">{getDevicePath(d.deviceCode)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline">{d.status.toLowerCase()}</Badge>
                    <a
                      href={getDevicePath(d.deviceCode)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
                      title="Open public tap URL"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!!busy}
                      className={
                        pendingDelete === `d-${d.id}`
                          ? "bg-red-500/20 text-red-300"
                          : "text-red-400 hover:text-red-300"
                      }
                      onClick={() => void deleteDevice(d.id)}
                      title="Remove device & free slot"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
