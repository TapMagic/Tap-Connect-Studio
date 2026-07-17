"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Eye, EyeOff, Save } from "lucide-react";
import { MediaPicker } from "@/components/media/media-picker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  LANDING_DEMO_MODE_META,
  type LandingDemoMode,
  type LandingDemoSlotRow,
} from "@/lib/marketing/landing-demo-types";
import { cn } from "@/lib/utils";

type CampaignOption = {
  id: string;
  title: string;
  status: string;
  campaignType: string;
  businessName: string;
};

type EditableSlot = LandingDemoSlotRow;

export function LandingDemosEditor({
  initialSlots,
  campaigns,
  mediaUploadReady,
  stockReady,
}: {
  initialSlots: LandingDemoSlotRow[];
  campaigns: CampaignOption[];
  mediaUploadReady: boolean;
  stockReady: boolean;
}) {
  const [slots, setSlots] = useState<EditableSlot[]>(initialSlots);
  const [active, setActive] = useState<LandingDemoMode>("card");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const current = slots.find((s) => s.mode === active) ?? slots[0];

  function patchActive(patch: Partial<EditableSlot>) {
    setSlots((prev) => prev.map((s) => (s.mode === active ? { ...s, ...patch } : s)));
  }

  async function saveActive() {
    if (!current) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/landing-demos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: current.mode,
          campaignId: current.campaignId,
          enabled: current.enabled,
          showLogo: current.showLogo,
          logoUrl: current.logoUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Save failed");
        return;
      }
      setSlots(data.slots);
      setMessage(`Saved ${LANDING_DEMO_MODE_META[current.mode].label} for the landing Live Demo.`);
    } catch {
      setError("Save failed");
    } finally {
      setSaving(false);
    }
  }

  function clearAssignment() {
    patchActive({
      campaignId: null,
      campaignTitle: null,
      campaignStatus: null,
    });
  }

  function clearLogo() {
    patchActive({ logoUrl: "", showLogo: false });
  }

  function useBusinessLogo() {
    patchActive({ logoUrl: null, showLogo: true });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Live Demo modes</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Control all four landing-page demo buttons. Build each experience in Tap Card Builder or
            Campaign Workbench, assign it here, then save. Clear logos when you do not want them
            shown.
          </p>
        </div>
        <Button type="button" onClick={() => void saveActive()} disabled={saving || !current}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving…" : "Save this mode"}
        </Button>
      </div>

      {message ? (
        <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div
        role="tablist"
        className="flex flex-wrap gap-2"
        aria-label="Live demo modes"
      >
        {slots.map((slot) => {
          const meta = LANDING_DEMO_MODE_META[slot.mode];
          const selected = active === slot.mode;
          return (
            <button
              key={slot.mode}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(slot.mode)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-semibold transition",
                selected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-border/60 bg-card/50 text-muted-foreground hover:text-foreground"
              )}
            >
              {meta.label}
              {!slot.campaignId ? (
                <span className="ml-1.5 text-[10px] opacity-70">unassigned</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {current ? (
        <div className="grid gap-6 rounded-2xl border border-border/60 bg-card/40 p-4 lg:grid-cols-2 lg:p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">
                {LANDING_DEMO_MODE_META[current.mode].label}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {LANDING_DEMO_MODE_META[current.mode].description}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {LANDING_DEMO_MODE_META[current.mode].editHint}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => patchActive({ enabled: !current.enabled })}
              >
                {current.enabled ? (
                  <>
                    <Eye className="mr-1 h-3.5 w-3.5" /> Enabled on landing
                  </>
                ) : (
                  <>
                    <EyeOff className="mr-1 h-3.5 w-3.5" /> Hidden on landing
                  </>
                )}
              </Button>
              {current.mode === "card" ? (
                <Link href="/dashboard/card">
                  <Button type="button" size="sm" variant="outline">
                    <ExternalLink className="mr-1 h-3.5 w-3.5" />
                    Open Tap Card Builder
                  </Button>
                </Link>
              ) : null}
              {current.campaignId ? (
                <Link href={`/dashboard/campaigns/${current.campaignId}`}>
                  <Button type="button" size="sm" variant="outline">
                    <ExternalLink className="mr-1 h-3.5 w-3.5" />
                    Edit assigned campaign
                  </Button>
                </Link>
              ) : (
                <Link href="/dashboard/workbench">
                  <Button type="button" size="sm" variant="outline">
                    <ExternalLink className="mr-1 h-3.5 w-3.5" />
                    Open Workbench
                  </Button>
                </Link>
              )}
            </div>

            <div className="space-y-2">
              <Label>Assigned campaign</Label>
              <select
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={current.campaignId ?? ""}
                onChange={(e) => {
                  const id = e.target.value || null;
                  const hit = campaigns.find((c) => c.id === id);
                  patchActive({
                    campaignId: id,
                    campaignTitle: hit?.title ?? null,
                    campaignStatus: hit?.status ?? null,
                  });
                }}
              >
                <option value="">— None (mode uses fallback / hidden content) —</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} · {c.businessName} · {c.status}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={clearAssignment}>
                  Clear assignment
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Logo on this demo</Label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={current.showLogo}
                  onChange={(e) => patchActive({ showLogo: e.target.checked })}
                />
                Show logo in this Live Demo mode
              </label>
              <MediaPicker
                label="Logo override (optional)"
                value={current.logoUrl ?? ""}
                onChange={(url) => patchActive({ logoUrl: url, showLogo: url ? true : current.showLogo })}
                mediaUploadReady={mediaUploadReady}
                stockReady={stockReady}
              />
              <p className="text-xs text-muted-foreground">
                Override replaces the campaign business logo for this mode only. Clear / Remove
                wipes the override and shows no logo (it will not fall back). Use “Business logo”
                to restore the business logo. Uncheck “Show logo” or Reset to hide entirely.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={useBusinessLogo}>
                  Use business logo
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={clearLogo}>
                  Reset logo (hide + clear)
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
