"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  INSIGHTS_SAVED_VIEWS_KEY,
  builtinSavedViewPresets,
  createSavedView,
  parseSavedViews,
  serializeSavedViews,
  type InsightsSavedView,
} from "@/lib/fusion/insights/saved-views";
import {
  INSIGHTS_VIEWS,
  INSIGHTS_VIEW_LABELS,
  buildInsightsHref,
  type InsightsView,
} from "@/lib/fusion/insights/views";
import type { EvidenceClass } from "@/lib/fusion/insights/tapproof";

const RANGE_OPTIONS = [7, 14, 30, 90] as const;
const EVIDENCE_OPTIONS = [
  "all",
  "confirmed",
  "derived",
  "modeled",
  "incomplete",
] as const;

/**
 * Selected filter-chip styling. GO green (--studio-go / --primary) is reserved for
 * primary actions only — a selected filter is a state, not an action, so it uses the
 * Insights zone accent (oklch 195 hue) instead of the green `default` button variant.
 */
const CHIP_SELECTED =
  "border border-[oklch(0.66_0.13_195_/_0.7)] bg-[oklch(0.66_0.13_195_/_0.16)] text-[oklch(0.9_0.09_195)] shadow-[0_0_0_1px_oklch(0.66_0.13_195_/_0.4),0_0_18px_oklch(0.66_0.13_195_/_0.22)]";

function chipClass(selected: boolean): string {
  return cn(
    buttonVariants({ variant: "outline", size: "sm" }),
    selected && CHIP_SELECTED
  );
}

export function InsightsControls({
  days,
  view,
  compare,
  evidence,
  drill,
  campaignId,
}: {
  days: number;
  view: InsightsView;
  compare: boolean;
  evidence: "all" | EvidenceClass;
  drill: string | null;
  campaignId: string | null;
}) {
  const [saved, setSaved] = useState<InsightsSavedView[]>([]);
  const [name, setName] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const raw = window.localStorage.getItem(INSIGHTS_SAVED_VIEWS_KEY);
        setSaved(parseSavedViews(raw));
      } catch {
        setSaved([]);
      }
      setHydrated(true);
    });
  }, []);

  const presets = useMemo(() => builtinSavedViewPresets(), []);

  function persist(next: InsightsSavedView[]) {
    setSaved(next);
    try {
      window.localStorage.setItem(INSIGHTS_SAVED_VIEWS_KEY, serializeSavedViews(next));
    } catch {
      /* ignore quota */
    }
  }

  function saveCurrent() {
    const next = createSavedView({
      name: name || `${INSIGHTS_VIEW_LABELS[view]} · ${days}d`,
      days,
      view,
      compare,
      evidence,
      drill: drill ?? undefined,
      campaignId: campaignId ?? undefined,
    });
    persist([next, ...saved].slice(0, 20));
    setName("");
  }

  function removeSaved(id: string) {
    persist(saved.filter((v) => v.id !== id));
  }

  const exportHref = `/api/insights/export?days=${days}&format=csv&view=${view}${
    compare ? "&compare=1" : ""
  }${evidence !== "all" ? `&evidence=${evidence}` : ""}${
    drill ? `&drill=${encodeURIComponent(drill)}` : ""
  }${campaignId ? `&campaignId=${encodeURIComponent(campaignId)}` : ""}`;

  return (
    <div className="space-y-4" data-testid="insights-controls">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white">Live snapshot</h2>
          <p className="mt-1 text-sm text-white/50">
            Real aggregations with TapProof evidence — confirmed / derived / modeled / incomplete.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/analytics"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Full analytics
          </Link>
          <a
            href={exportHref}
            className={buttonVariants({ variant: "outline", size: "sm" })}
            data-testid="insights-export-csv"
          >
            Export CSV
          </a>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Date range">
        {RANGE_OPTIONS.map((d) => (
          <Link
            key={d}
            href={buildInsightsHref({
              days: d,
              view,
              compare,
              evidence,
              drill: drill ?? undefined,
              campaignId: campaignId ?? undefined,
            })}
            className={chipClass(d === days)}
            aria-current={d === days ? "true" : undefined}
          >
            {d}d
          </Link>
        ))}
        <Link
          href={buildInsightsHref({
            days,
            view,
            compare: !compare,
            evidence,
            drill: drill ?? undefined,
            campaignId: campaignId ?? undefined,
          })}
          className={chipClass(compare)}
          aria-current={compare ? "true" : undefined}
          data-testid="insights-compare-toggle"
        >
          {compare ? "Comparing prior" : "Compare prior"}
        </Link>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Insights view">
        {INSIGHTS_VIEWS.map((v) => (
          <Link
            key={v}
            href={buildInsightsHref({
              days,
              view: v,
              compare,
              evidence,
              campaignId: campaignId ?? undefined,
            })}
            className={chipClass(v === view)}
            aria-current={v === view ? "true" : undefined}
            data-testid={`insights-view-${v}`}
          >
            {INSIGHTS_VIEW_LABELS[v]}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Evidence filter">
        {EVIDENCE_OPTIONS.map((e) => (
          <Link
            key={e}
            href={buildInsightsHref({
              days,
              view,
              compare,
              evidence: e,
              drill: drill ?? undefined,
              campaignId: campaignId ?? undefined,
            })}
            className={chipClass(e === evidence)}
            aria-current={e === evidence ? "true" : undefined}
            data-testid={`insights-evidence-${e}`}
          >
            {e === "all" ? "All evidence" : e}
          </Link>
        ))}
      </div>

      <div
        className="rounded-xl border border-border/60 bg-card/30 p-4 space-y-3"
        data-testid="insights-saved-views"
      >
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[12rem] flex-1">
            <label htmlFor="insights-save-name" className="text-xs text-muted-foreground">
              Save current filters as a view
            </label>
            <input
              id="insights-save-name"
              data-testid="insights-save-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Campaign 14d compare"
              className="mt-1 w-full rounded-md border border-border/60 bg-black/40 px-3 py-2 text-sm text-white"
            />
          </div>
          <button
            type="button"
            onClick={saveCurrent}
            className={buttonVariants({ size: "sm" })}
            data-testid="insights-save-view"
          >
            Save view
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center">Presets:</span>
          {presets.map((p) => (
            <Link
              key={p.id}
              href={buildInsightsHref({
                days: p.days,
                view: p.view,
                compare: p.compare,
                evidence: p.evidence,
                drill: p.drill,
                campaignId: p.campaignId,
              })}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-xs")}
              data-testid={`insights-preset-${p.id}`}
            >
              {p.name}
            </Link>
          ))}
        </div>

        {hydrated && saved.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {saved.map((v) => (
              <li key={v.id} className="flex items-center gap-1">
                <Link
                  href={buildInsightsHref({
                    days: v.days,
                    view: v.view,
                    compare: v.compare,
                    evidence: v.evidence,
                    drill: v.drill,
                    campaignId: v.campaignId,
                  })}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-xs")}
                >
                  {v.name}
                </Link>
                <button
                  type="button"
                  aria-label={`Remove saved view ${v.name}`}
                  className="text-xs text-muted-foreground hover:text-white px-1"
                  onClick={() => removeSaved(v.id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">
            {hydrated
              ? "No custom saved views yet — presets always available."
              : "Loading saved views…"}
          </p>
        )}
      </div>
    </div>
  );
}
