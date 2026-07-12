"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

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
  campaign?: { id: string; title: string; status: string };
};

/**
 * Device-centric schedule: one stable URL, many campaigns by day/time.
 * Rules are grouped on this device — highest priority match wins; else default assignment.
 */
export function DeviceScheduleGroup({
  deviceId,
  deviceLabel,
  campaigns,
}: {
  deviceId: string;
  deviceLabel: string;
  campaigns: { id: string; title: string; status: string }[];
}) {
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    label: "Happy hour",
    daysOfWeek: [1, 2, 3, 4, 5],
    startTime: "16:00",
    endTime: "19:00",
    priority: 10,
    campaignId: campaigns[0]?.id ?? "",
  });

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/schedule?deviceSlotId=${deviceId}`);
    const data = await res.json();
    setRules(data.rules ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  useEffect(() => {
    if (!draft.campaignId && campaigns[0]?.id) {
      setDraft((d) => ({ ...d, campaignId: campaigns[0].id }));
    }
  }, [campaigns, draft.campaignId]);

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
    if (!draft.campaignId) {
      setMessage("Pick a campaign for this time window");
      return;
    }
    setMessage(null);
    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...draft,
        deviceSlotId: deviceId,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error ?? "Failed to save schedule");
      return;
    }
    setMessage("Schedule added — same device URL, different campaign by day/time");
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

  const dayLabel = (days: number[]) =>
    days.length === 7
      ? "Every day"
      : days.map((d) => DAY_OPTIONS.find((o) => o.value === d)?.label ?? d).join(", ");

  return (
    <div className="space-y-4 rounded-xl border border-border/60 p-5">
      <div className="flex items-start gap-3">
        <Calendar className="mt-0.5 h-5 w-5 text-primary" />
        <div>
          <h3 className="font-semibold">Scheduled campaigns on this device</h3>
          <p className="text-sm text-muted-foreground">
            Group multiple mini-pages on <span className="font-medium text-foreground">{deviceLabel}</span>.
            The physical tag URL never changes — TapConnect picks the matching campaign by day and
            time. Highest priority wins; otherwise the default assigned campaign shows.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading schedules…</p>
      ) : rules.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-sm text-muted-foreground">
          No timed campaigns yet. Add a window below (e.g. weekday happy hour → Coupon campaign).
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Schedule group ({rules.length})
          </p>
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 bg-card/40 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{rule.label}</p>
                  <Badge variant="outline">priority {rule.priority}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  → {rule.campaign?.title ?? "Campaign"} · {dayLabel(rule.daysOfWeek as number[])} ·{" "}
                  <Clock className="inline h-3 w-3" /> {rule.startTime ?? "00:00"}–
                  {rule.endTime ?? "23:59"}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => void removeRule(rule.id)}>
                <Trash2 className="h-4 w-4 text-red-400" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {campaigns.length === 0 ? (
        <p className="text-sm text-amber-300">Create a campaign in Workbench first, then schedule it here.</p>
      ) : (
        <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-medium">Add timed campaign</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Label</Label>
              <Input
                value={draft.label}
                onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Campaign</Label>
              <select
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={draft.campaignId}
                onChange={(e) => setDraft((d) => ({ ...d, campaignId: e.target.value }))}
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.status.toLowerCase()})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Start</Label>
              <Input
                type="time"
                value={draft.startTime}
                onChange={(e) => setDraft((d) => ({ ...d, startTime: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">End</Label>
              <Input
                type="time"
                value={draft.endTime}
                onChange={(e) => setDraft((d) => ({ ...d, endTime: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Priority (higher wins)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={draft.priority}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, priority: Number(e.target.value) || 0 }))
                }
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Days</Label>
            <div className="mt-1 flex flex-wrap gap-1">
              {DAY_OPTIONS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDay(d.value)}
                  className={`rounded-md px-2 py-1 text-xs ${
                    draft.daysOfWeek.includes(d.value)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={() => void addRule()}>Add to device schedule</Button>
        </div>
      )}

      {message && <p className="text-sm text-primary">{message}</p>}
    </div>
  );
}
