"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getDevicePath } from "@/lib/utils/app";

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

export function DevicesManager({
  devices,
  limit,
}: {
  devices: DeviceRow[];
  limit: number;
}) {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          <Button onClick={createDevice} disabled={loading || devices.length >= limit}>
            <Plus className="mr-2 h-4 w-4" />
            {loading ? "Creating..." : "Create Device Slot"}
          </Button>
        </CardContent>
        {error && <p className="px-6 pb-4 text-sm text-destructive">{error}</p>}
        <p className="px-6 pb-4 text-xs text-muted-foreground">
          {devices.length} of {limit} device slots used. Each device gets a stable URL that never changes.
        </p>
      </Card>

      {devices.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            No devices yet. Create your first device slot above.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {devices.map((d) => (
            <Card key={d.id} className="border-border/60">
              <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{d.nickname ?? d.deviceCode}</p>
                    <Badge variant="outline">{d.status.toLowerCase()}</Badge>
                  </div>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{getDevicePath(d.deviceCode)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {d.campaignTitle ?? "No campaign assigned"} · {d.totalTapCount} taps
                  </p>
                </div>
                <div className="flex gap-2">
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
