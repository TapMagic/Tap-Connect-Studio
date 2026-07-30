"use client";

import { useMemo, useState } from "react";
import { Link2, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BRAND_FIELD_LABELS,
  explainMode,
  type BrandFieldKey,
  type BrandInheritanceState,
  type BrandKitSnapshot,
} from "@/lib/fusion/authoring/brand-inheritance";
import {
  DEFAULT_PREFILL_POLICY,
  enableAutomaticPrefill,
  fillRemainingBlanks,
  keepLinked,
  listPrefillProvenance,
  refreshFromApproved,
  resetToSavedInformation,
  sourceLabel,
  stopAutomaticPrefill,
  stopUsingSource,
  markUseOnlyHere,
  type IntelligentPrefillPolicy,
  type PrefillSourceKind,
} from "@/lib/fusion/authoring/intelligent-prefill";

export function FieldSourceChip({
  source,
  className,
}: {
  source: PrefillSourceKind | "brand_kit" | "business" | "none" | string;
  className?: string;
}) {
  const kind: PrefillSourceKind =
    source === "brand_kit" || source === "brand"
      ? "brand"
      : source === "business"
        ? "business"
        : source === "location"
          ? "location"
          : source === "website"
            ? "website"
            : source === "custom" || source === "overridden"
              ? "custom"
              : source === "none"
                ? "none"
                : "custom";
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-medium tracking-wide",
        kind === "business" && "bg-sky-500/20 text-sky-100",
        kind === "brand" && "bg-primary/15 text-primary",
        kind === "location" && "bg-violet-500/20 text-violet-100",
        kind === "website" && "bg-emerald-500/20 text-emerald-100",
        kind === "custom" && "bg-amber-500/20 text-amber-100",
        kind === "none" && "bg-white/10 text-white/55",
        className
      )}
      data-testid={`field-source-${kind}`}
      data-source={kind}
    >
      {sourceLabel(kind)}
    </span>
  );
}

export function IntelligentPrefillBar({
  state,
  onChange,
  approvedSnapshot,
  policy = DEFAULT_PREFILL_POLICY,
  onPolicyChange,
  lockedKeys = [],
  impactKeys = [],
  sourceSummary = "approved Business and Brand Kit information",
  className,
  compact = false,
}: {
  state: BrandInheritanceState;
  onChange: (next: BrandInheritanceState) => void;
  /** Approved Business / Brand / Location values used for fill/refresh/reset. */
  approvedSnapshot: BrandKitSnapshot;
  policy?: IntelligentPrefillPolicy;
  onPolicyChange?: (next: IntelligentPrefillPolicy) => void;
  lockedKeys?: BrandFieldKey[];
  impactKeys?: BrandFieldKey[];
  sourceSummary?: string;
  className?: string;
  compact?: boolean;
}) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const provenance = useMemo(() => listPrefillProvenance(state), [state]);
  const enabled = policy.enabled && state.useBrandKit;

  function setEnabled(nextEnabled: boolean) {
    const nextPolicy = nextEnabled
      ? enableAutomaticPrefill(policy)
      : stopAutomaticPrefill(policy);
    onPolicyChange?.(nextPolicy);
    // Turning off does not erase values — only stops future automatic application.
    onChange({ ...state, useBrandKit: nextEnabled });
  }

  return (
    <div
      className={cn("rounded-xl border border-primary/25 bg-primary/5 p-3", className)}
      data-testid="brand-inheritance-bar"
      data-intelligent-prefill="true"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          <div>
            <p className="text-sm font-semibold">Intelligent Prefill</p>
            {!compact ? (
              <p className="text-[11px] text-muted-foreground">
                Uses {sourceSummary} for blank fields. Manual overrides and locked values are
                never silently replaced.
              </p>
            ) : null}
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs" data-testid="intelligent-prefill-toggle">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            data-testid="brand-use-toggle"
          />
          Use saved business and Brand information — {enabled ? "On" : "Off"}
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 gap-1 text-[11px]"
          onClick={() => setReviewOpen((v) => !v)}
          data-testid="prefill-review-sources"
        >
          <Link2 className="h-3 w-3" />
          Review sources
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-[11px]"
          disabled={!enabled}
          onClick={() =>
            onChange(
              fillRemainingBlanks(state, approvedSnapshot, { lockedKeys })
            )
          }
          data-testid="prefill-fill-blanks"
        >
          Fill remaining blanks
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-[11px]"
          disabled={!enabled}
          onClick={() => {
            onChange(refreshFromApproved(state, approvedSnapshot, { lockedKeys }));
            onPolicyChange?.({
              ...policy,
              lastRefreshAt: new Date().toISOString(),
            });
          }}
          data-testid="prefill-refresh"
        >
          Refresh from approved information
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 text-[11px]"
          onClick={() => setEnabled(false)}
          data-testid="prefill-stop-automatic"
        >
          Stop automatic prefill
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 gap-1 text-[11px]"
          disabled={!enabled}
          onClick={() =>
            onChange(
              resetToSavedInformation(state, approvedSnapshot, { lockedKeys })
            )
          }
          data-testid="prefill-reset-saved"
        >
          <RotateCcw className="h-3 w-3" />
          Reset to saved information
        </Button>
      </div>

      {impactKeys.length > 0 ? (
        <p className="mt-2 text-[11px] text-amber-200/90" data-testid="brand-update-impact">
          Approved information differs for:{" "}
          {impactKeys.map((k) => BRAND_FIELD_LABELS[k]).join(", ")}. Refresh or reset to
          apply (never automatic on locked or custom fields).
        </p>
      ) : null}

      {reviewOpen ? (
        <ul
          className="mt-3 max-h-48 space-y-1 overflow-y-auto border-t border-border/40 pt-2"
          data-testid="prefill-sources-list"
        >
          {provenance.length === 0 ? (
            <li className="text-[11px] text-muted-foreground">
              No prefilled fields yet. Fill remaining blanks after approving Business and Brand
              information.
            </li>
          ) : (
            provenance.map((entry) => (
              <li
                key={entry.key}
                className="flex flex-wrap items-center justify-between gap-2 text-xs"
                data-testid={`prefill-field-${entry.key}`}
              >
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="font-medium">{BRAND_FIELD_LABELS[entry.key]}</span>
                  <FieldSourceChip source={entry.source} />
                  <span className="text-[10px] text-muted-foreground">
                    {explainMode(entry.mode)}
                  </span>
                  {lockedKeys.includes(entry.key) ? (
                    <span className="text-[10px] text-amber-200">Locked</span>
                  ) : null}
                </span>
                <span className="flex flex-wrap gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[10px]"
                    disabled={lockedKeys.includes(entry.key)}
                    onClick={() => onChange(keepLinked(state, entry.key))}
                    data-testid={`prefill-keep-linked-${entry.key}`}
                  >
                    Keep linked
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[10px]"
                    disabled={lockedKeys.includes(entry.key)}
                    onClick={() => onChange(markUseOnlyHere(state, entry.key))}
                    data-testid={`prefill-use-here-${entry.key}`}
                  >
                    Use only here
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[10px]"
                    disabled={lockedKeys.includes(entry.key)}
                    onClick={() =>
                      onChange(
                        refreshFromApproved(state, {
                          [entry.key]: approvedSnapshot[entry.key],
                        }, { lockedKeys })
                      )
                    }
                    data-testid={`prefill-replace-${entry.key}`}
                  >
                    Replace
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[10px]"
                    disabled={lockedKeys.includes(entry.key)}
                    onClick={() =>
                      onChange(
                        resetToSavedInformation(state, approvedSnapshot, {
                          lockedKeys,
                          onlyKeys: [entry.key],
                        })
                      )
                    }
                    data-testid={`prefill-reset-field-${entry.key}`}
                  >
                    Reset to saved information
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[10px]"
                    disabled={lockedKeys.includes(entry.key)}
                    onClick={() => onChange(stopUsingSource(state, entry.key))}
                    data-testid={`prefill-stop-source-${entry.key}`}
                  >
                    Stop using this source
                  </Button>
                </span>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
