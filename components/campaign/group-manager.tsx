"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, Pause, Play, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatScheduleWindow } from "@/lib/utils/schedule-time";
import { cn } from "@/lib/utils";

const DAY_OPTIONS = [
  { v: 1, l: "Mon" },
  { v: 2, l: "Tue" },
  { v: 3, l: "Wed" },
  { v: 4, l: "Thu" },
  { v: 5, l: "Fri" },
  { v: 6, l: "Sat" },
  { v: 7, l: "Sun" },
];

type Slot = {
  id: string;
  label: string;
  daysOfWeek: number[] | unknown;
  startTime: string | null;
  endTime: string | null;
  priority: number;
  enabled: boolean;
  campaign: { id: string; title: string; status: string; campaignType?: string };
};

type GroupDetail = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  defaultCampaignId: string | null;
  defaultCampaign: { id: string; title: string; status: string } | null;
  slots: Slot[];
  campaigns: { id: string; title: string; status: string; campaignType: string }[];
  devices: {
    id: string;
    nickname: string | null;
    deviceCode: string;
    status: string;
    locationNote: string | null;
  }[];
};

export function GroupManager({
  group: initial,
  allDevices,
  allCampaigns,
}: {
  group: GroupDetail;
  allDevices: { id: string; label: string; groupId: string | null }[];
  allCampaigns: { id: string; title: string; status: string }[];
}) {
  const router = useRouter();
  const [group, setGroup] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [slotForm, setSlotForm] = useState({
    label: "",
    campaignId: allCampaigns[0]?.id ?? "",
    daysOfWeek: [1, 2, 3, 4, 5] as number[],
    startTime: "16:00",
    endTime: "23:59",
    priority: 5,
  });

  const [attachIds, setAttachIds] = useState<string[]>([]);

  const availableDevices = useMemo(
    () => allDevices.filter((d) => d.groupId !== group.id),
    [allDevices, group.id]
  );

  async function refresh() {
    const res = await fetch(`/api/groups/${group.id}`);
    const data = await res.json();
    if (data.group) setGroup(data.group);
    router.refresh();
  }

  async function toggleGroupLive() {
    setBusy(true);
    const next = group.status === "PAUSED" ? "LIVE" : "PAUSED";
    const res = await fetch(`/api/groups/${group.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setBusy(false);
    if (!res.ok) {
      setMessage("Could not update group");
      return;
    }
    setMessage(next === "LIVE" ? "Group is live" : "Group paused — taps show nothing from this group");
    await refresh();
  }

  async function toggleSlot(slot: Slot) {
    setBusy(true);
    await fetch(`/api/groups/${group.id}/slots`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: slot.id, enabled: !slot.enabled }),
    });
    setBusy(false);
    await refresh();
  }

  async function toggleCampaign(campaignId: string, status: string) {
    setBusy(true);
    const next = status === "PAUSED" ? "LIVE" : "PAUSED";
    await fetch("/api/campaigns/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "status", campaignId, status: next }),
    });
    setBusy(false);
    await refresh();
  }

  async function addSlot() {
    if (!slotForm.campaignId || !slotForm.label.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/groups/${group.id}/slots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slotForm),
    });
    setBusy(false);
    if (!res.ok) {
      setMessage("Could not add schedule slot");
      return;
    }
    setSlotForm((f) => ({ ...f, label: "" }));
    setMessage("Special added to schedule");
    await refresh();
  }

  async function removeSlot(slotId: string) {
    setBusy(true);
    await fetch(`/api/groups/${group.id}/slots?slotId=${slotId}`, { method: "DELETE" });
    setBusy(false);
    await refresh();
  }

  async function attachSelected() {
    if (!attachIds.length) return;
    setBusy(true);
    const res = await fetch(`/api/groups/${group.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceIds: attachIds }),
    });
    setBusy(false);
    if (!res.ok) {
      setMessage("Could not attach devices");
      return;
    }
    setAttachIds([]);
    setMessage("Devices now tap into this group’s schedule");
    await refresh();
  }

  async function detach(deviceId: string) {
    setBusy(true);
    await fetch(`/api/groups/${group.id}?deviceId=${deviceId}`, { method: "DELETE" });
    setBusy(false);
    await refresh();
  }

  async function setDefault(campaignId: string | null) {
    setBusy(true);
    await fetch(`/api/groups/${group.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultCampaignId: campaignId }),
    });
    setBusy(false);
    await refresh();
  }

  const groupLive = group.status === "LIVE" || group.status === "READY" || group.status === "SCHEDULED";

  return (
    <div className="space-y-8">
      {message && <p className="text-sm text-primary">{message}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/40 p-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Group status</p>
          <p className="text-lg font-semibold">
            {groupLive ? "Live — schedule is active" : "Paused"}
          </p>
          <p className="text-sm text-muted-foreground">
            All linked table/bar tags share this schedule. Highest priority matching window wins.
          </p>
        </div>
        <Button
          type="button"
          variant={groupLive ? "outline" : "default"}
          disabled={busy}
          onClick={() => void toggleGroupLive()}
        >
          {groupLive ? (
            <>
              <Pause className="mr-1.5 h-4 w-4" /> Pause group
            </>
          ) : (
            <>
              <Play className="mr-1.5 h-4 w-4" /> Go live
            </>
          )}
        </Button>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Scheduled specials</h2>
          <p className="text-xs text-muted-foreground">
            Default off-hours:{" "}
            {group.defaultCampaign ? (
              <Link href={`/dashboard/campaigns/${group.defaultCampaign.id}`} className="text-primary">
                {group.defaultCampaign.title}
              </Link>
            ) : (
              "none"
            )}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {group.slots.map((slot) => {
            const days = Array.isArray(slot.daysOfWeek) ? (slot.daysOfWeek as number[]) : [];
            const schedule = formatScheduleWindow(days, slot.startTime, slot.endTime);
            const campaignLive = !["PAUSED", "ARCHIVED", "CLOSED"].includes(slot.campaign.status);
            return (
              <div
                key={slot.id}
                className={cn(
                  "rounded-xl border p-4 transition",
                  slot.enabled && campaignLive
                    ? "border-primary/30 bg-primary/5"
                    : "border-border/50 bg-muted/20 opacity-80"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{slot.label}</p>
                    <Link
                      href={`/dashboard/campaigns/${slot.campaign.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {slot.campaign.title}
                    </Link>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void toggleSlot(slot)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase",
                      slot.enabled ? "bg-emerald-500/20 text-emerald-300" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {slot.enabled ? "Live" : "Paused"}
                  </button>
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {schedule}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">Priority {slot.priority}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/dashboard/campaigns/${slot.campaign.id}`}>
                    <Button type="button" size="sm" variant="outline">
                      Edit page
                    </Button>
                  </Link>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => void toggleCampaign(slot.campaign.id, slot.campaign.status)}
                  >
                    {campaignLive ? "Pause page" : "Resume page"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-red-400"
                    disabled={busy}
                    onClick={() => void removeSlot(slot.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {group.defaultCampaign && (
          <div className="rounded-xl border border-dashed border-border/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Default (no schedule match)
            </p>
            <p className="mt-1 font-medium">{group.defaultCampaign.title}</p>
            <Link
              href={`/dashboard/campaigns/${group.defaultCampaign.id}`}
              className="text-sm text-primary"
            >
              Edit welcome page
            </Link>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-border/60 p-4">
        <h3 className="font-semibold">Add a timed special</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Label</Label>
            <Input
              value={slotForm.label}
              onChange={(e) => setSlotForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="e.g. Thu Trivia Night"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Campaign page</Label>
            <select
              className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
              value={slotForm.campaignId}
              onChange={(e) => setSlotForm((f) => ({ ...f, campaignId: e.target.value }))}
            >
              {allCampaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.status})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Days</Label>
            <div className="flex flex-wrap gap-1.5">
              {DAY_OPTIONS.map((d) => {
                const on = slotForm.daysOfWeek.includes(d.v);
                return (
                  <button
                    key={d.v}
                    type="button"
                    onClick={() =>
                      setSlotForm((f) => ({
                        ...f,
                        daysOfWeek: on
                          ? f.daysOfWeek.filter((x) => x !== d.v)
                          : [...f.daysOfWeek, d.v],
                      }))
                    }
                    className={cn(
                      "rounded-md px-2 py-1 text-xs",
                      on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {d.l}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Start</Label>
            <Input
              type="time"
              value={slotForm.startTime}
              onChange={(e) => setSlotForm((f) => ({ ...f, startTime: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">End</Label>
            <Input
              type="time"
              value={slotForm.endTime}
              onChange={(e) => setSlotForm((f) => ({ ...f, endTime: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={busy} onClick={() => void addSlot()}>
            <Plus className="mr-1 h-4 w-4" />
            Add to schedule
          </Button>
          <select
            className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
            value={group.defaultCampaignId ?? ""}
            onChange={(e) => void setDefault(e.target.value || null)}
          >
            <option value="">No default page</option>
            {allCampaigns.map((c) => (
              <option key={c.id} value={c.id}>
                Default: {c.title}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Devices on this group</h2>
        <p className="text-sm text-muted-foreground">
          Link every table tent and bar rail tag here once — they all follow the same day/time rotation.
        </p>
        <ul className="space-y-2">
          {group.devices.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2 text-sm"
            >
              <span>
                {d.nickname ?? d.deviceCode}
                <span className="ml-2 text-xs text-muted-foreground">{d.deviceCode}</span>
              </span>
              <Button type="button" size="sm" variant="ghost" onClick={() => void detach(d.id)}>
                Remove
              </Button>
            </li>
          ))}
          {!group.devices.length && (
            <p className="text-sm text-muted-foreground">No devices linked yet.</p>
          )}
        </ul>
        {availableDevices.length > 0 && (
          <div className="rounded-lg border border-border/50 p-3">
            <Label className="text-xs">Attach devices</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {availableDevices.map((d) => {
                const on = attachIds.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() =>
                      setAttachIds((ids) =>
                        on ? ids.filter((x) => x !== d.id) : [...ids, d.id]
                      )
                    }
                    className={cn(
                      "rounded-md border px-2 py-1 text-xs",
                      on ? "border-primary bg-primary/15" : "border-border/60"
                    )}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
            <Button
              type="button"
              size="sm"
              className="mt-3"
              disabled={!attachIds.length || busy}
              onClick={() => void attachSelected()}
            >
              Attach selected
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
