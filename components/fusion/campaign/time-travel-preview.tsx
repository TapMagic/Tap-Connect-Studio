"use client";

import { useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COMMON_TIMEZONES } from "@/lib/utils/schedule-time";
import {
  resolveTimeTravel,
  type TimeTravelSlot,
} from "@/lib/fusion/publication/time-travel";

type Props = {
  timezone: string;
  slots: {
    id: string;
    label: string;
    daysOfWeek: number[] | unknown;
    startTime: string | null;
    endTime: string | null;
    priority: number;
    enabled: boolean;
    campaign: { id: string; title: string };
  }[];
  defaultCampaignId?: string | null;
  defaultCampaignTitle?: string | null;
  endCampaignId?: string | null;
  endCampaignTitle?: string | null;
};

function asDays(value: number[] | unknown): number[] {
  return Array.isArray(value) ? (value as number[]) : [];
}

export function TimeTravelPreview({
  timezone: initialTz,
  slots,
  defaultCampaignId,
  defaultCampaignTitle,
  endCampaignId,
  endCampaignTitle,
}: Props) {
  const now = new Date();
  const localDefault = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  const [timezone, setTimezone] = useState(initialTz || "America/New_York");
  const [when, setWhen] = useState(localDefault);

  const travelSlots: TimeTravelSlot[] = useMemo(
    () =>
      slots.map((s) => ({
        id: s.id,
        label: s.label,
        daysOfWeek: asDays(s.daysOfWeek),
        startTime: s.startTime,
        endTime: s.endTime,
        priority: s.priority,
        enabled: s.enabled,
        campaignId: s.campaign.id,
        campaignTitle: s.campaign.title,
      })),
    [slots]
  );

  const result = useMemo(() => {
    const at = when ? new Date(when) : new Date();
    return resolveTimeTravel({
      at,
      timezone,
      slots: travelSlots,
      defaultCampaignId,
      defaultCampaignTitle: defaultCampaignTitle ?? undefined,
      endCampaignId,
      endCampaignTitle: endCampaignTitle ?? undefined,
    });
  }, [
    when,
    timezone,
    travelSlots,
    defaultCampaignId,
    defaultCampaignTitle,
    endCampaignId,
    endCampaignTitle,
  ]);

  return (
    <section
      className="space-y-3 rounded-xl border border-border/60 bg-card/30 p-4"
      data-testid="time-travel-preview"
    >
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Time-travel preview</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Pick a date and time to see exactly which campaign this group would resolve — and why.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs" htmlFor="time-travel-when">
            Date & time
          </Label>
          <Input
            id="time-travel-when"
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            data-testid="time-travel-when"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs" htmlFor="time-travel-tz">
            Timezone
          </Label>
          <select
            id="time-travel-tz"
            className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            data-testid="time-travel-timezone"
          >
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        className="rounded-lg border border-primary/25 bg-primary/5 p-3 text-sm"
        data-testid="time-travel-result"
        data-resolve-reason={
          result.matchedSlotId
            ? "slot"
            : result.campaignId && result.campaignId === defaultCampaignId
              ? "default"
              : result.campaignId && result.campaignId === endCampaignId
                ? "end"
                : "none"
        }
      >
        <p className="font-medium text-foreground">
          {result.campaignTitle
            ? `Resolves to “${result.campaignTitle}”`
            : "No campaign resolved"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{result.reason}</p>
        <p className="mt-2 font-mono text-[11px] text-muted-foreground">
          {result.timeHm} · weekday {result.dayOfWeek} · {result.timezone}
          {result.matchedSlotId ? ` · slot ${result.matchedSlotId}` : ""}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-testid="time-travel-now"
          onClick={() => {
            const n = new Date();
            setWhen(
              new Date(n.getTime() - n.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
            );
          }}
        >
          Jump to now
        </Button>
        {result.atIso ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            data-testid="time-travel-public-preview"
            onClick={() => {
              // Public preview uses ?at= — group detail supplies device via data attribute when present
              const root = document.querySelector<HTMLElement>("[data-preview-device-code]");
              const code = root?.dataset.previewDeviceCode;
              if (!code) return;
              const url = `/t/${code}?public=1&at=${encodeURIComponent(result.atIso)}`;
              window.open(url, "_blank", "noopener,noreferrer");
            }}
          >
            Open public at this time
          </Button>
        ) : null}
      </div>
    </section>
  );
}
