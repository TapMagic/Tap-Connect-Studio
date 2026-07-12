"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DAY_OPTIONS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
];

type RuleRow = {
  id: string;
  label: string;
  daysOfWeek: number[];
  startTime: string | null;
  endTime: string | null;
  priority: number;
  enabled: boolean;
  campaignId: string;
  deviceSlotId: string;
  campaign?: { id: string; title: string };
  deviceSlot?: { id: string; nickname: string | null; deviceCode: string };
};

interface SchedulePanelProps {
  campaignId: string;
  devices: { id: string; nickname: string | null; deviceCode: string }[];
  campaigns: { id: string; title: string; status: string }[];
}

export function SchedulePanel({ campaignId, devices, campaigns }: SchedulePanelProps) {
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    label: "Happy hour special",
    daysOfWeek: [1, 2, 3, 4, 5],
    startTime: "16:00",
    endTime: "19:00",
    priority: 10,
    deviceSlotId: devices[0]?.id ?? "",
    campaignId,
  });

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/schedule?campaignId=${campaignId}`);
    const data = await res.json();
    setRules(data.rules ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  function toggleDay(day: number) {
    setDraft((prev) => {
      const has = prev.daysOfWeek.includes(day);
      return {
        ...prev,
        daysOfWeek: has
          ? prev.daysOfWeek.filter((d) => d !== day)
          : [...prev.daysOfWeek, day].sort(),
      };
    });
  }

  async function addRule() {
    if (!draft.deviceSlotId || !draft.campaignId) {
      setMessage("Pick a device and campaign first.");
      return;
    }
    setMessage(null);
    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    if (!res.ok) {
      setMessage("Failed to save schedule rule");
      return;
    }
    setMessage("Schedule rule saved — same device URL, different campaign by day/time.");
    await load();
  }

  async function removeRule(id: string) {
    await fetch("/api/schedule", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">Flexible scheduling</h3>
        <p className="text-sm text-muted-foreground">
          One device URL can rotate mini-campaigns (happy hour, weekend special, weekly deal)
          by day and clock time. Highest priority matching rule wins; otherwise the default
          assigned campaign shows.
        </p>
      </div>

      {devices.length === 0 ? (
        <p className="text-sm text-amber-400/90">
          Add a device first, then create schedule rules for that tag URL.
        </p>
      ) : (
        <div className="space-y-3 rounded-xl border border-border/60 p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <Input
              value={draft.label}
              onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
              placeholder="Rule label"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Device (same public URL)</Label>
              <select
                value={draft.deviceSlotId}
                onChange={(e) => setDraft((d) => ({ ...d, deviceSlotId: e.target.value }))}
                className="mt-1 flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 text-sm"
              >
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nickname ?? d.deviceCode}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Mini-campaign to show</Label>
              <select
                value={draft.campaignId}
                onChange={(e) => setDraft((d) => ({ ...d, campaignId: e.target.value }))}
                className="mt-1 flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 text-sm"
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.status.toLowerCase()})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1">
                <Clock className="h-3 w-3" /> Start time
              </Label>
              <Input
                type="time"
                value={draft.startTime}
                onChange={(e) => setDraft((d) => ({ ...d, startTime: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">End time</Label>
              <Input
                type="time"
                value={draft.endTime}
                onChange={(e) => setDraft((d) => ({ ...d, endTime: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Days</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {DAY_OPTIONS.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={`rounded-full px-3 py-1 text-xs ${
                    draft.daysOfWeek.includes(day.value)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
          <div className="max-w-[140px]">
            <Label className="text-xs">Priority</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={draft.priority}
              onChange={(e) => setDraft((d) => ({ ...d, priority: Number(e.target.value) || 0 }))}
            />
          </div>
          <Button onClick={addRule}>Add schedule rule</Button>
        </div>
      )}

      <div className="space-y-2">
        <h4 className="text-sm font-medium">Active rules for this campaign family</h4>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">No schedule rules yet.</p>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">{rule.label}</p>
                <p className="text-xs text-muted-foreground">
                  {(rule.deviceSlot?.nickname ?? rule.deviceSlot?.deviceCode) || "device"} ·{" "}
                  {rule.campaign?.title ?? "campaign"} ·{" "}
                  {(rule.daysOfWeek as number[])
                    .map((d) => DAY_OPTIONS.find((o) => o.value === d)?.label)
                    .filter(Boolean)
                    .join(", ")}{" "}
                  · {rule.startTime ?? "00:00"}–{rule.endTime ?? "23:59"} · priority{" "}
                  {rule.priority}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeRule(rule.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
      {message && <p className="text-sm text-primary">{message}</p>}
    </div>
  );
}
