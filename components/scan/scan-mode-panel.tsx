"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Copy,
  Loader2,
  Nfc,
  Phone,
  Radio,
  Share2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SessionType = "DESKTOP_PHONE" | "REMOTE_STAFF" | "OWNER_PHONE";

type Session = {
  id: string;
  status: string;
  sessionType: string;
  accessCode: string | null;
  expiresAt: string;
  scannedDeviceSlotId?: string | null;
};

export function ScanModePanel() {
  const router = useRouter();
  const [mode, setMode] = useState<SessionType | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [device, setDevice] = useState<{
    id: string;
    nickname: string | null;
    deviceCode: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const polling = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (polling.current) {
      clearInterval(polling.current);
      polling.current = null;
    }
  }

  useEffect(() => {
    return () => stopPolling();
  }, []);

  useEffect(() => {
    if (!session || session.status !== "WAITING") return;
    const tick = () => {
      const left = Math.max(
        0,
        Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000)
      );
      setSecondsLeft(left);
      if (left <= 0) {
        setSession((s) => (s ? { ...s, status: "EXPIRED" } : s));
        stopPolling();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session]);

  async function start(sessionType: SessionType) {
    setError(null);
    setDevice(null);
    setMode(sessionType);
    stopPolling();

    const res = await fetch("/api/scan/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionType }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not start scan session");
      return;
    }

    const s = data.session as Session;
    setSession(s);

    polling.current = setInterval(async () => {
      const poll = await fetch(`/api/scan/sessions/${s.id}`);
      const body = await poll.json().catch(() => ({}));
      if (!poll.ok) return;
      const next = body.session as Session;
      setSession(next);
      if (next.status === "SCANNED" && body.device) {
        setDevice(body.device);
        stopPolling();
      }
      if (["EXPIRED", "CANCELED", "SCANNED"].includes(next.status)) {
        stopPolling();
      }
    }, 1500);
  }

  async function cancel() {
    if (session?.id) {
      await fetch(`/api/scan/sessions/${session.id}`, { method: "DELETE" });
    }
    stopPolling();
    setSession(null);
    setMode(null);
    setDevice(null);
  }

  function staffLink() {
    if (!session?.accessCode || typeof window === "undefined") return "";
    return `${window.location.origin}/scan/${session.accessCode}`;
  }

  async function copyLink() {
    const link = staffLink();
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (device && session?.status === "SCANNED") {
    return (
      <Card className="overflow-hidden border-primary/40 bg-gradient-to-br from-primary/15 via-card to-card">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
            <CheckCircle2 className="relative h-16 w-16 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Device identified</h2>
            <p className="mt-1 text-muted-foreground">
              {device.nickname ?? device.deviceCode}
            </p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              /t/{device.deviceCode}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => router.push(`/dashboard/devices/${device.id}`)}>
              Open device profile
            </Button>
            <Button variant="outline" onClick={() => void start(mode ?? "DESKTOP_PHONE")}>
              Scan another
            </Button>
            <Button variant="ghost" onClick={() => void cancel()}>
              Done
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (session?.status === "WAITING") {
    return (
      <Card className="border-primary/30 bg-card/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 animate-pulse text-primary" />
            Waiting for tap…
          </CardTitle>
          <CardDescription>
            {mode === "REMOTE_STAFF"
              ? "Send the staff link, then have them tap the physical tag."
              : "Use your phone to tap the NFC tag (or open its QR /t/ link)."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <span className="absolute inset-4 animate-pulse rounded-full bg-primary/10" />
            <Nfc className="relative h-14 w-14 text-primary" />
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Expires in{" "}
            <span className="font-mono text-foreground">
              {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
            </span>
          </p>

          {mode === "REMOTE_STAFF" && session.accessCode && (
            <div className="space-y-2 rounded-xl border border-border/60 bg-background/50 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Staff scan link
              </p>
              <p className="break-all font-mono text-sm">{staffLink()}</p>
              <p className="text-sm text-muted-foreground">
                Code: <span className="font-mono text-primary">{session.accessCode}</span>
              </p>
              <Button variant="outline" size="sm" onClick={() => void copyLink()}>
                <Copy className="mr-1 h-3.5 w-3.5" />
                {copied ? "Copied" : "Copy link"}
              </Button>
            </div>
          )}

          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={() => void cancel()}>
              <X className="mr-1 h-4 w-4" />
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (session?.status === "EXPIRED") {
    return (
      <Card>
        <CardContent className="space-y-4 py-10 text-center">
          <p className="text-lg font-semibold">Session expired</p>
          <p className="text-sm text-muted-foreground">Start a new scan when you are ready.</p>
          <Button onClick={() => void start(mode ?? "DESKTOP_PHONE")}>Try again</Button>
        </CardContent>
      </Card>
    );
  }

  const modes: {
    type: SessionType;
    title: string;
    description: string;
    icon: typeof Phone;
  }[] = [
    {
      type: "DESKTOP_PHONE",
      title: "Desktop + Phone",
      description: "Wait here, tap the tag with your phone — this screen jumps to the device.",
      icon: Phone,
    },
    {
      type: "REMOTE_STAFF",
      title: "Remote Staff Scan",
      description: "Text a temporary link to staff. They tap the tag; you get the device profile.",
      icon: Share2,
    },
    {
      type: "OWNER_PHONE",
      title: "Local Scan",
      description: "Start listening, then tap any of your tags to open its profile.",
      icon: Nfc,
    },
  ];

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-amber-300">{error}</p>}
      <div className="grid gap-4 md:grid-cols-3">
        {modes.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.type}
              type="button"
              onClick={() => void start(m.type)}
              className={cn(
                "rounded-xl border border-border/60 bg-card/60 p-5 text-left transition",
                "hover:border-primary/50 hover:bg-primary/5"
              )}
            >
              <Icon className="h-8 w-8 text-primary" />
              <h3 className="mt-3 font-semibold">{m.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>
              <p className="mt-4 flex items-center gap-1 text-sm text-primary">
                <Loader2 className="h-3.5 w-3.5 opacity-0" />
                Start listening →
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
