"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
  campaigns,
  devices,
  deviceLimit,
  activeDevices,
}: {
  campaigns: CampaignRow[];
  devices: DeviceRow[];
  deviceLimit: number;
  activeDevices: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function archiveCampaign(id: string) {
    setBusy(`archive-${id}`);
    setMessage(null);
    const res = await fetch("/api/campaigns/actions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId: id, status: "ARCHIVED" }),
    });
    setBusy(null);
    if (!res.ok) {
      setMessage("Archive failed");
      return;
    }
    setMessage("Campaign archived");
    router.refresh();
  }

  async function deleteCampaign(id: string) {
    if (!confirm("Delete this campaign permanently?")) return;
    setBusy(`delete-c-${id}`);
    setMessage(null);
    const res = await fetch("/api/campaigns/actions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId: id }),
    });
    setBusy(null);
    if (!res.ok) {
      setMessage("Delete campaign failed");
      return;
    }
    setMessage("Campaign deleted");
    router.refresh();
  }

  async function reopenDevice(id: string) {
    if (!confirm("Clear this device’s campaign and reopen the slot for reuse?")) return;
    setBusy(`reopen-${id}`);
    setMessage(null);
    const res = await fetch("/api/devices/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: id, status: "UNASSIGNED" }),
    });
    setBusy(null);
    if (!res.ok) {
      setMessage("Failed to reopen device slot");
      return;
    }
    setMessage("Device slot reopened for reuse");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {message && <p className="text-sm text-primary">{message}</p>}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/60">
          <CardHeader>
            <CardTitle>Recent Campaigns</CardTitle>
            <CardDescription>Archive or delete without leaving Overview</CardDescription>
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
                    {c.status !== "ARCHIVED" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!!busy}
                        onClick={() => void archiveCampaign(c.id)}
                        title="Archive"
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!!busy}
                      className="text-red-400 hover:text-red-300"
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
              {activeDevices} of {deviceLimit} active slots used — reopen frees a slot
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
                      disabled={!!busy || d.status === "UNASSIGNED"}
                      className="text-red-400 hover:text-red-300"
                      onClick={() => void reopenDevice(d.id)}
                      title="Clear campaign & reopen slot"
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
