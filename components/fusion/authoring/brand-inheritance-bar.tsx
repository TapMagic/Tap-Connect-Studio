"use client";

import { RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BRAND_FIELD_LABELS,
  copyOnce,
  restoreInherited,
  type BrandFieldKey,
  type BrandInheritanceState,
} from "@/lib/fusion/authoring/brand-inheritance";

export function BrandInheritanceBar({
  state,
  onChange,
  impactKeys = [],
  className,
  compact = false,
  saved = true,
}: {
  state: BrandInheritanceState;
  onChange: (next: BrandInheritanceState) => void;
  /** Keys that differ from Brand Kit snapshot in this session (informational) */
  impactKeys?: BrandFieldKey[];
  className?: string;
  compact?: boolean;
  saved?: boolean;
}) {
  const usingKitCount = Object.values(state.fields).filter(
    (f) => f?.mode === "linked" || f?.mode === "copied"
  ).length;
  const overridden = (
    Object.entries(state.fields) as [
      BrandFieldKey,
      NonNullable<(typeof state.fields)[BrandFieldKey]>,
    ][]
  ).filter(([, f]) => f.mode === "overridden");

  return (
    <div
      className={cn("rounded-xl border border-primary/25 bg-primary/5 p-3", className)}
      data-testid="brand-inheritance-bar"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          <div>
            <p className="text-sm font-semibold">Brand Kit</p>
            {!compact ? (
              <p className="text-[11px] text-muted-foreground">
                Brand can fill missing values. A custom value on this Card stays custom until you
                reset it to Brand.
              </p>
            ) : null}
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={state.useBrandKit}
            onChange={(e) => onChange({ ...state, useBrandKit: e.target.checked })}
            data-testid="brand-use-toggle"
          />
          Use Brand value
        </label>
      </div>

      {state.useBrandKit ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-[11px]"
            onClick={() => onChange(copyOnce(state))}
            data-testid="brand-copy-once"
          >
            Use Brand value
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 gap-1 text-[11px]"
            onClick={() =>
              onChange({
                ...copyOnce(state),
                useBrandKit: true,
              })
            }
            data-testid="brand-customize"
          >
            Use custom value here
          </Button>
          <span className="text-[11px] text-muted-foreground">
            {usingKitCount} field(s) From Brand · {saved ? "Saved" : "Unsaved"}
          </span>
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Custom on this Card · {saved ? "Saved" : "Unsaved"}
        </p>
      )}

      {impactKeys.length > 0 ? (
        <p className="mt-2 text-[11px] text-amber-200/90" data-testid="brand-update-impact">
          Brand Kit snapshot differs for:{" "}
          {impactKeys.map((k) => BRAND_FIELD_LABELS[k]).join(", ")}. Re-copy or restore to
          refresh from Brand Kit (not automatic).
        </p>
      ) : null}

      {overridden.length > 0 ? (
        <ul className="mt-3 space-y-1 border-t border-border/40 pt-2">
          {overridden.map(([key, field]) => (
            <li key={key} className="flex items-center justify-between gap-2 text-xs">
              <span>
                <span className="font-medium">{BRAND_FIELD_LABELS[key]}</span>
                <span className="ml-2 text-muted-foreground">Custom on this Card</span>
                <span className="ml-2 text-[10px] text-muted-foreground">
                  Source: {field.source === "business" ? "Business" : "Brand Kit"}
                </span>
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 gap-1"
                onClick={() => onChange(restoreInherited(state, key))}
                data-testid={`brand-restore-${key}`}
              >
                <RotateCcw className="h-3 w-3" />
                Reset to Brand
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
