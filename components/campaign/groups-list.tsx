"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderKanban, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatScheduleWindow, COMMON_TIMEZONES } from "@/lib/utils/schedule-time";
import { GROUP_SEED_OPTIONS, type GroupSeedPack } from "@/lib/campaign/group-seeds";

type GroupRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  timezone?: string | null;
  _count: { slots: number; devices: number; campaigns: number };
  slots: {
    id: string;
    label: string;
    daysOfWeek: unknown;
    startTime: string | null;
    endTime: string | null;
    enabled: boolean;
    campaign: { title: string };
  }[];
  defaultCampaign: { title: string } | null;
};

export function GroupsList({
  groups: initial,
  defaultTimezone,
}: {
  groups: GroupRow[];
  defaultTimezone: string;
}) {
  const router = useRouter();
  const [groups] = useState(initial);
  const [title, setTitle] = useState("Seasonal offers");
  const [seedPack, setSeedPack] = useState<GroupSeedPack>("general");
  const [timezone, setTimezone] = useState(defaultTimezone || "America/New_York");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setCreating(true);
    setError(null);
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim() || "Campaign group",
        description: "Shared schedule for every linked tap device",
        timezone,
        seedPack,
      }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(data.error ?? "Create failed");
      return;
    }
    router.push(`/dashboard/groups/${data.group.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border/60 bg-card/30 p-5">
        <h2 className="font-semibold">New campaign group</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          One shared schedule for every tag — salon chairs, venue tables, job-site cards, lobby stands.
          Guests tap once; the right page shows by day and time in your timezone.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Group name</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Front desk offers, Event season, Service promos"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Timezone</Label>
            <select
              className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Starter pack (optional)</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {GROUP_SEED_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSeedPack(opt.id)}
                  className={`rounded-lg border p-3 text-left text-sm transition ${
                    seedPack === opt.id
                      ? "border-primary bg-primary/10"
                      : "border-border/50 hover:border-primary/40"
                  }`}
                >
                  <p className="font-medium">{opt.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{opt.blurb}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
        <Button type="button" className="mt-4" disabled={creating} onClick={() => void create()}>
          <Plus className="mr-1 h-4 w-4" />
          {creating ? "Creating…" : "Create group"}
        </Button>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {groups.map((g) => (
          <Link
            key={g.id}
            href={`/dashboard/groups/${g.id}`}
            className="rounded-xl border border-border/60 bg-card/40 p-4 transition hover:border-primary/40"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">{g.title}</h3>
              </div>
              <span className="text-[11px] uppercase text-muted-foreground">{g.status}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {g._count.devices} devices · {g._count.slots} timed pages · {g._count.campaigns}{" "}
              campaigns
              {g.timezone ? ` · ${g.timezone}` : ""}
            </p>
            <ul className="mt-3 space-y-1.5">
              {g.slots.slice(0, 3).map((s) => {
                const days = Array.isArray(s.daysOfWeek) ? (s.daysOfWeek as number[]) : [];
                return (
                  <li key={s.id} className="text-xs text-muted-foreground">
                    <span className={s.enabled ? "text-foreground" : "line-through opacity-60"}>
                      {s.label}
                    </span>
                    <span className="ml-1 opacity-70">
                      — {formatScheduleWindow(days, s.startTime, s.endTime)}
                    </span>
                  </li>
                );
              })}
              {g.defaultCampaign && (
                <li className="text-xs text-muted-foreground">
                  Default: {g.defaultCampaign.title}
                </li>
              )}
            </ul>
          </Link>
        ))}
      </div>

      {!groups.length && (
        <p className="text-sm text-muted-foreground">
          No groups yet — create one above to rotate offers across all of your tags.
        </p>
      )}
    </div>
  );
}
