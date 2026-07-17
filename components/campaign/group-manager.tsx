"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, Copy, GripVertical, Pause, Play, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COMMON_TIMEZONES, formatScheduleWindow } from "@/lib/utils/schedule-time";
import { scrollChildIntoNearestView } from "@/lib/utils/builder-scroll";
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

type Preview = {
  timezone: string;
  localClock: string;
  paused: boolean;
  live: {
    via: "slot" | "default" | "end";
    slotId: string | null;
    label: string;
    campaignId: string;
    campaignTitle: string;
  } | null;
  upcoming: {
    label: string;
    whenLabel: string;
    scheduleLabel: string;
    isLive: boolean;
    campaignTitle?: string;
  }[];
};

type GroupDetail = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  timezone: string | null;
  showUpcomingOnPages: boolean;
  defaultCampaignId: string | null;
  defaultCampaign: { id: string; title: string; status: string } | null;
  endCampaignId?: string | null;
  endCampaign?: { id: string; title: string; status: string } | null;
  slots: Slot[];
  campaigns: { id: string; title: string; status: string; campaignType: string }[];
  devices: {
    id: string;
    nickname: string | null;
    deviceCode: string;
    status: string;
    locationNote: string | null;
    locationId: string | null;
    location?: { id: string; name: string } | null;
  }[];
};

export function GroupManager({
  group: initial,
  preview: initialPreview,
  allDevices,
  allCampaigns,
  locations,
  previewDeviceCode,
}: {
  group: GroupDetail;
  preview: Preview;
  allDevices: { id: string; label: string; groupId: string | null; locationId: string | null }[];
  allCampaigns: { id: string; title: string; status: string }[];
  locations: { id: string; name: string; deviceCount: number }[];
  previewDeviceCode?: string | null;
}) {
  const router = useRouter();
  const [group, setGroup] = useState(initial);
  const [preview, setPreview] = useState(initialPreview);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [dragSlotId, setDragSlotId] = useState<string | null>(null);
  const slotsListRef = useRef<HTMLDivElement>(null);

  const [slotForm, setSlotForm] = useState({
    label: "",
    campaignId: allCampaigns[0]?.id ?? "",
    daysOfWeek: [1, 2, 3, 4, 5] as number[],
    startTime: "09:00",
    endTime: "17:00",
    priority: 5,
  });

  const [slotEdit, setSlotEdit] = useState({
    label: "",
    campaignId: "",
    daysOfWeek: [1, 2, 3, 4, 5] as number[],
    startTime: "09:00",
    endTime: "17:00",
    priority: 0,
    enabled: true,
  });

  const [attachIds, setAttachIds] = useState<string[]>([]);
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");

  const availableDevices = useMemo(
    () => allDevices.filter((d) => d.groupId !== group.id),
    [allDevices, group.id]
  );

  const selectedSlot = group.slots.find((s) => s.id === selectedSlotId) ?? null;

  useEffect(() => {
    const slot = group.slots.find((s) => s.id === selectedSlotId);
    if (!slot) return;
    const days = Array.isArray(slot.daysOfWeek) ? (slot.daysOfWeek as number[]) : [];
    setSlotEdit({
      label: slot.label,
      campaignId: slot.campaign.id,
      daysOfWeek: days.length ? days : [1, 2, 3, 4, 5],
      startTime: slot.startTime ?? "09:00",
      endTime: slot.endTime ?? "17:00",
      priority: slot.priority,
      enabled: slot.enabled,
    });
  }, [selectedSlotId, group.slots]);

  useEffect(() => {
    if (!selectedSlotId || !slotsListRef.current) return;
    const escaped =
      typeof CSS !== "undefined" && CSS.escape
        ? CSS.escape(selectedSlotId)
        : selectedSlotId;
    const el = slotsListRef.current.querySelector(`[data-slot-id="${escaped}"]`);
    if (el instanceof HTMLElement) scrollChildIntoNearestView(el);
  }, [selectedSlotId]);

  async function refresh() {
    const res = await fetch(`/api/groups/${group.id}`);
    const data = await res.json();
    if (data.group) setGroup(data.group);
    if (data.preview) setPreview(data.preview);
    router.refresh();
  }

  async function patchGroup(body: Record<string, unknown>) {
    setBusy(true);
    const res = await fetch(`/api/groups/${group.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      setMessage("Could not update group");
      return;
    }
    await refresh();
  }

  async function toggleGroupLive() {
    const next = group.status === "PAUSED" ? "LIVE" : "PAUSED";
    await patchGroup({ status: next });
    setMessage(next === "LIVE" ? "Group is live" : "Group paused — linked tags won’t serve this schedule");
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

  async function cloneSlot(slotId: string) {
    setBusy(true);
    const res = await fetch(`/api/groups/${group.id}/slots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clone", slotId }),
    });
    setBusy(false);
    if (!res.ok) {
      setMessage("Could not clone");
      return;
    }
    setMessage("Cloned as paused — edit the copy, then turn Live when ready");
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
    setMessage("Timed page added");
    await refresh();
  }

  async function removeSlot(slotId: string) {
    setBusy(true);
    await fetch(`/api/groups/${group.id}/slots?slotId=${slotId}`, { method: "DELETE" });
    setBusy(false);
    if (selectedSlotId === slotId) setSelectedSlotId(null);
    await refresh();
  }

  async function saveSelectedSlot() {
    if (!selectedSlotId) return;
    setBusy(true);
    const res = await fetch(`/api/groups/${group.id}/slots`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selectedSlotId, ...slotEdit }),
    });
    setBusy(false);
    if (!res.ok) {
      setMessage("Could not update timed page");
      return;
    }
    setMessage("Timed page schedule saved");
    await refresh();
  }

  async function reorderSlots(fromId: string, toId: string) {
    if (fromId === toId) return;
    const ordered = [...group.slots].sort((a, b) => b.priority - a.priority || a.label.localeCompare(b.label));
    const from = ordered.findIndex((s) => s.id === fromId);
    const to = ordered.findIndex((s) => s.id === toId);
    if (from < 0 || to < 0) return;
    const next = [...ordered];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    // Higher priority first — mirror list order
    const updates = next.map((s, i) => ({ id: s.id, priority: next.length - i }));
    setBusy(true);
    await Promise.all(
      updates.map((u) =>
        fetch(`/api/groups/${group.id}/slots`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(u),
        })
      )
    );
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
    setMessage("Devices now follow this group’s schedule");
    await refresh();
  }

  async function attachLocation() {
    if (!locationId) return;
    setBusy(true);
    const res = await fetch(`/api/groups/${group.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage("Could not attach location");
      return;
    }
    setMessage(`Attached ${data.attached ?? 0} device(s) from that location`);
    await refresh();
  }

  async function detach(deviceId: string) {
    setBusy(true);
    await fetch(`/api/groups/${group.id}?deviceId=${deviceId}`, { method: "DELETE" });
    setBusy(false);
    await refresh();
  }

  const groupLive = ["LIVE", "READY", "SCHEDULED"].includes(group.status);
  const previewHref = previewDeviceCode ? `/t/${previewDeviceCode}?public=1` : null;

  return (
    <div className="space-y-8">
      {message && <p className="text-sm text-primary">{message}</p>}

      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Live right now</p>
            {preview.paused ? (
              <p className="mt-1 text-lg font-semibold">Group paused</p>
            ) : preview.live ? (
              <>
                <p className="mt-1 text-lg font-semibold">{preview.live.campaignTitle}</p>
                <p className="text-sm text-muted-foreground">
                  {preview.live.label} · via {preview.live.via} · {preview.localClock} (
                  {preview.timezone})
                </p>
              </>
            ) : (
              <p className="mt-1 text-lg font-semibold text-muted-foreground">
                Nothing matching — set a default page or enable a slot
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {preview.live && (
              <Link href={`/dashboard/campaigns/${preview.live.campaignId}`}>
                <Button type="button" size="sm" variant="outline">
                  Edit live page
                </Button>
              </Link>
            )}
            {previewHref && (
              <a href={previewHref} target="_blank" rel="noopener noreferrer">
                <Button type="button" size="sm" variant="outline">
                  Preview tap
                </Button>
              </a>
            )}
            <Button
              type="button"
              size="sm"
              variant={groupLive ? "outline" : "default"}
              disabled={busy}
              onClick={() => void toggleGroupLive()}
            >
              {groupLive ? (
                <>
                  <Pause className="mr-1 h-3.5 w-3.5" /> Pause group
                </>
              ) : (
                <>
                  <Play className="mr-1 h-3.5 w-3.5" /> Go live
                </>
              )}
            </Button>
          </div>
        </div>
        {preview.upcoming.filter((u) => !u.isLive).length > 0 && (
          <ul className="mt-3 space-y-1 border-t border-border/40 pt-3 text-xs text-muted-foreground">
            {preview.upcoming
              .filter((u) => !u.isLive)
              .slice(0, 4)
              .map((u, i) => (
                <li key={`${u.label}-${i}`}>
                  <span className="text-primary">{u.whenLabel}</span> — {u.label}
                </li>
              ))}
          </ul>
        )}
      </div>

      <div className="grid gap-3 rounded-xl border border-border/60 p-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Group timezone</Label>
          <select
            className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
            value={group.timezone ?? preview.timezone}
            disabled={busy}
            onChange={(e) => void patchGroup({ timezone: e.target.value })}
          >
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-end gap-2 pb-1 text-sm">
          <input
            type="checkbox"
            checked={group.showUpcomingOnPages !== false}
            disabled={busy}
            onChange={(e) => void patchGroup({ showUpcomingOnPages: e.target.checked })}
          />
          Show “Coming up” strip on public tap pages
        </label>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Timed pages</h2>
          <p className="text-xs text-muted-foreground">
            Default:{" "}
            {group.defaultCampaign ? (
              <Link href={`/dashboard/campaigns/${group.defaultCampaign.id}`} className="text-primary">
                {group.defaultCampaign.title}
              </Link>
            ) : (
              "none"
            )}
            {group.endCampaign ? (
              <>
                {" · "}
                End:{" "}
                <Link href={`/dashboard/campaigns/${group.endCampaign.id}`} className="text-primary">
                  {group.endCampaign.title}
                </Link>
              </>
            ) : null}
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          Select a slot to edit schedule settings · drag to reorder priority · Edit page opens the
          campaign builder
        </p>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,360px)]">
          <div ref={slotsListRef} className="grid max-h-[70vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {[...group.slots]
              .sort((a, b) => b.priority - a.priority || a.label.localeCompare(b.label))
              .map((slot) => {
                const days = Array.isArray(slot.daysOfWeek) ? (slot.daysOfWeek as number[]) : [];
                const schedule = formatScheduleWindow(days, slot.startTime, slot.endTime);
                const campaignLive = !["PAUSED", "ARCHIVED", "CLOSED"].includes(slot.campaign.status);
                const isLiveNow = preview.live?.slotId === slot.id;
                const selected = selectedSlotId === slot.id;
                return (
                  <div
                    key={slot.id}
                    data-slot-id={slot.id}
                    draggable
                    onDragStart={() => setDragSlotId(slot.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragSlotId) void reorderSlots(dragSlotId, slot.id);
                      setDragSlotId(null);
                    }}
                    onDragEnd={() => setDragSlotId(null)}
                    onClick={() => setSelectedSlotId(slot.id)}
                    className={cn(
                      "cursor-pointer rounded-xl border p-4 transition",
                      selected
                        ? "border-primary bg-primary/15 ring-2 ring-primary/40"
                        : isLiveNow
                          ? "border-primary bg-primary/10"
                          : slot.enabled && campaignLive
                            ? "border-primary/30 bg-primary/5"
                            : "border-border/50 bg-muted/20 opacity-80",
                      dragSlotId === slot.id && "opacity-60"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-2">
                        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing" />
                        <div className="min-w-0">
                          <p className="font-semibold">
                            {slot.label}
                            {isLiveNow ? (
                              <span className="ml-2 text-[10px] uppercase text-primary">Now</span>
                            ) : null}
                          </p>
                          <Link
                            href={`/dashboard/campaigns/${slot.campaign.id}`}
                            className="text-sm text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {slot.campaign.title}
                          </Link>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          void toggleSlot(slot);
                        }}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase",
                          slot.enabled
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {slot.enabled ? "Live" : "Paused"}
                      </button>
                    </div>
                    <p className="mt-3 flex items-center gap-1.5 pl-6 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {schedule}
                    </p>
                    <p className="mt-1 pl-6 text-[11px] text-muted-foreground">
                      Priority {slot.priority}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 pl-6">
                      <Link
                        href={`/dashboard/campaigns/${slot.campaign.id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button type="button" size="sm" variant="outline">
                          Edit page
                        </Button>
                      </Link>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          void cloneSlot(slot.id);
                        }}
                        title="Clone page + schedule"
                      >
                        <Copy className="mr-1 h-3.5 w-3.5" />
                        Clone
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          void toggleCampaign(slot.campaign.id, slot.campaign.status);
                        }}
                      >
                        {campaignLive ? "Pause page" : "Resume page"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-red-400"
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          void removeSlot(slot.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
          </div>

          <aside className="rounded-xl border border-border/60 bg-card/40 p-4 lg:sticky lg:top-4 lg:self-start">
            {selectedSlot ? (
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    Edit timed page
                  </p>
                  <h3 className="mt-1 font-semibold">{selectedSlot.label}</h3>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Label</Label>
                  <Input
                    value={slotEdit.label}
                    onChange={(e) => setSlotEdit((f) => ({ ...f, label: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Campaign page</Label>
                  <select
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                    value={slotEdit.campaignId}
                    onChange={(e) => setSlotEdit((f) => ({ ...f, campaignId: e.target.value }))}
                  >
                    {allCampaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.status})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Days</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {DAY_OPTIONS.map((d) => {
                      const on = slotEdit.daysOfWeek.includes(d.v);
                      return (
                        <button
                          key={d.v}
                          type="button"
                          onClick={() =>
                            setSlotEdit((f) => ({
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
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Start</Label>
                    <Input
                      type="time"
                      value={slotEdit.startTime}
                      onChange={(e) => setSlotEdit((f) => ({ ...f, startTime: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">End</Label>
                    <Input
                      type="time"
                      value={slotEdit.endTime}
                      onChange={(e) => setSlotEdit((f) => ({ ...f, endTime: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Priority</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={slotEdit.priority}
                    onChange={(e) =>
                      setSlotEdit((f) => ({ ...f, priority: Number(e.target.value) || 0 }))
                    }
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={slotEdit.enabled}
                    onChange={(e) => setSlotEdit((f) => ({ ...f, enabled: e.target.checked }))}
                  />
                  Slot enabled (live in schedule)
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button type="button" size="sm" disabled={busy} onClick={() => void saveSelectedSlot()}>
                    Save schedule
                  </Button>
                  <Link href={`/dashboard/campaigns/${selectedSlot.campaign.id}`}>
                    <Button type="button" size="sm" variant="outline">
                      Open campaign builder
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Slot inspector</p>
                <p>
                  Select a timed page to edit its label, campaign, days, hours, and priority —
                  without leaving this group.
                </p>
              </div>
            )}
          </aside>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-border/60 p-4">
        <h3 className="font-semibold">Add a timed page</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Label</Label>
            <Input
              value={slotForm.label}
              onChange={(e) => setSlotForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="e.g. Color special, Weekend consult, Spring cleanup"
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
            onChange={(e) => void patchGroup({ defaultCampaignId: e.target.value || null })}
          >
            <option value="">No default page</option>
            {allCampaigns.map((c) => (
              <option key={c.id} value={c.id}>
                Default: {c.title}
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
            value={group.endCampaignId ?? ""}
            onChange={(e) => void patchGroup({ endCampaignId: e.target.value || null })}
          >
            <option value="">No end page</option>
            {allCampaigns.map((c) => (
              <option key={`end-${c.id}`} value={c.id}>
                End page: {c.title}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => {
              const first = allCampaigns[0];
              if (first) void patchGroup({ endCampaignId: first.id });
            }}
          >
            Use campaign as end page
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          End page shows when no timed slot matches — great for “offer over, stay in touch.”
          Create/edit that campaign like any other page.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Devices on this group</h2>
        <p className="text-sm text-muted-foreground">
          Link every tag once — front desk, chairs, tables, yard signs — they all follow this schedule.
        </p>
        <ul className="space-y-2">
          {group.devices.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2 text-sm"
            >
              <span>
                {d.nickname ?? d.deviceCode}
                <span className="ml-2 text-xs text-muted-foreground">
                  {d.deviceCode}
                  {d.location?.name ? ` · ${d.location.name}` : ""}
                </span>
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

        {locations.length > 0 && (
          <div className="rounded-lg border border-border/50 p-3">
            <Label className="text-xs">Attach entire location</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              <select
                className="h-9 min-w-[12rem] rounded-lg border border-input bg-background px-2 text-sm"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.deviceCount} devices)
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                disabled={!locationId || busy}
                onClick={() => void attachLocation()}
              >
                Attach all at location
              </Button>
            </div>
          </div>
        )}

        {availableDevices.length > 0 && (
          <div className="rounded-lg border border-border/50 p-3">
            <Label className="text-xs">Or pick devices</Label>
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
