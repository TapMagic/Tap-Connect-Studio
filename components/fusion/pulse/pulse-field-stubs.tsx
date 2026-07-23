"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Radio, RotateCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  enqueuePulseAction,
  flushPulseQueue,
  listPulseQueue,
  type PulseQueuedAction,
} from "@/lib/fusion/pulse/offline-queue";

type ClaimPhase = "idle" | "waiting" | "claimed" | "expired";

const ROTATION_SLOTS = [
  { id: "mon_am", label: "Mon AM", campaign: "Welcome offer" },
  { id: "mon_pm", label: "Mon PM", campaign: "Product spotlight" },
  { id: "tue_am", label: "Tue AM", campaign: "Weekend promo" },
  { id: "tue_pm", label: "Tue PM", campaign: "VIP signup" },
] as const;

/** Local-only claim session stub — no API / service worker */
export function PulseClaimSessionStub() {
  const [phase, setPhase] = useState<ClaimPhase>("idle");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [accessCode] = useState(() =>
    Math.random().toString(36).slice(2, 8).toUpperCase()
  );

  useEffect(() => {
    if (phase !== "waiting" || secondsLeft <= 0) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setPhase("expired");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, secondsLeft]);

  function startWaiting() {
    setPhase("waiting");
    setSecondsLeft(90);
  }

  function simulateClaim() {
    setPhase("claimed");
    setSecondsLeft(0);
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-primary" aria-hidden />
          <div>
            <p className="text-sm font-medium">Claim session (stub)</p>
            <p className="text-xs text-muted-foreground">
              Mirrors Scan Mode WAITING → CLAIMED without persisting a session.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] uppercase">
          UI only
        </Badge>
      </div>

      <div className="mt-4 space-y-3">
        {phase === "idle" ? (
          <Button type="button" size="sm" onClick={startWaiting}>
            Start waiting session
          </Button>
        ) : null}

        {phase === "waiting" ? (
          <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              Tap a device with access code{" "}
              <span className="font-mono font-semibold text-primary">{accessCode}</span>
            </p>
            <p className="text-sm tabular-nums">
              Expires in{" "}
              <span className="font-semibold text-primary">
                {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={simulateClaim}>
                Simulate claim
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setPhase("idle")}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        {phase === "claimed" ? (
          <p className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">
            Claimed — device bound to this stub session. Open Scan Mode for live flows.
          </p>
        ) : null}

        {phase === "expired" ? (
          <p className="text-sm text-muted-foreground">
            Session expired.{" "}
            <button
              type="button"
              className="text-primary underline-offset-4 hover:underline"
              onClick={startWaiting}
            >
              Start again
            </button>
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Day/time rotation preview — local state only */
export function PulseRotationPreviewStub() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = ROTATION_SLOTS[activeIndex];

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" aria-hidden />
          <div>
            <p className="text-sm font-medium">Campaign rotation (stub)</p>
            <p className="text-xs text-muted-foreground">
              Preview group day/time slots — not wired to CampaignGroup schedules yet.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] uppercase">
          Preview
        </Badge>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {ROTATION_SLOTS.map((slot, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={slot.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={cn(
                "rounded-lg border px-2.5 py-1.5 text-left text-xs transition",
                isActive
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border/50 text-muted-foreground hover:border-primary/30"
              )}
            >
              {slot.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
        <div>
          <p className="text-sm font-medium">{active.campaign}</p>
          <p className="text-xs text-muted-foreground">Active slot · {active.label}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setActiveIndex((i) => (i + 1) % ROTATION_SLOTS.length)}
        >
          <RotateCw className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          Next slot
        </Button>
      </div>
    </div>
  );
}

/** In-memory offline queue preview — not a service worker */
export function PulseOfflineQueueStub({ businessId }: { businessId: string }) {
  const [items, setItems] = useState<PulseQueuedAction[]>([]);

  function refresh() {
    setItems(listPulseQueue(businessId));
  }

  function queueNote() {
    enqueuePulseAction(businessId, "note", {
      text: `Field note ${new Date().toLocaleTimeString()}`,
    });
    refresh();
  }

  function queueClaim() {
    enqueuePulseAction(businessId, "claim", { stub: true });
    refresh();
  }

  function flush() {
    flushPulseQueue(businessId);
    refresh();
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Offline queue (stub)</p>
          <p className="text-xs text-muted-foreground">
            In-memory only — service worker / IndexedDB not wired.
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] uppercase">
          Memory
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={queueClaim}>
          Queue claim
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={queueNote}>
          Queue note
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={flush}
          disabled={items.every((i) => i.status !== "queued")}
        >
          Flush queue
        </Button>
      </div>
      <ul className="mt-3 max-h-32 space-y-1 overflow-auto text-xs text-muted-foreground">
        {items.length === 0 ? (
          <li>No queued actions</li>
        ) : (
          items.map((i) => (
            <li key={i.id} className="font-mono">
              {i.kind} · {i.status} · {i.createdAt.slice(11, 19)}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
