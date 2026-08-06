"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Plus, RotateCcw, Shuffle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReusableDesignBrowser } from "@/components/fusion/creative-studio/reusable-design-browser";
import { contrastRatio } from "@/lib/fusion/creative-platform/render";
import {
  DEFAULT_GRADIENT,
  GRADIENT_PRESETS,
  addGradientStop,
  gradientToCss,
  normalizeGradient,
  removeGradientStop,
  reverseGradient,
  type GradientModel,
  type GradientStop,
} from "@/lib/fusion/creative-studio/gradient";

export type GradientStudioProps = {
  value?: GradientModel | null;
  onChange: (gradient: GradientModel, label: string) => void;
  brandColors?: string[];
  brandGradient?: GradientModel | null;
  foregroundColor?: string;
  onSuggestedTextColor?: (color: "#000000" | "#ffffff") => void;
};

export function GradientStudio({
  value,
  onChange,
  brandColors = [],
  brandGradient,
  foregroundColor = "#ffffff",
  onSuggestedTextColor,
}: GradientStudioProps) {
  const gradient = useMemo(() => normalizeGradient(value), [value]);
  const [advanced, setAdvanced] = useState(false);
  const [selectedStopId, setSelectedStopId] = useState(
    gradient.stops[0]?.id || "start"
  );
  const selected =
    gradient.stops.find((stop) => stop.id === selectedStopId) || gradient.stops[0];
  const contrast = useMemo(() => {
    const current = Math.min(
      ...gradient.stops.map((stop) => contrastRatio(foregroundColor, stop.color))
    );
    const black = Math.min(
      ...gradient.stops.map((stop) => contrastRatio("#000000", stop.color))
    );
    const white = Math.min(
      ...gradient.stops.map((stop) => contrastRatio("#ffffff", stop.color))
    );
    return {
      current,
      suggested: black >= white ? ("#000000" as const) : ("#ffffff" as const),
      suggestedRatio: Math.max(black, white),
    };
  }, [foregroundColor, gradient.stops]);
  const resetGradient = useMemo(() => {
    if (brandGradient) return normalizeGradient(brandGradient);
    if (brandColors.length >= 2) {
      return normalizeGradient({
        ...DEFAULT_GRADIENT,
        stops: [
          { ...DEFAULT_GRADIENT.stops[0], color: brandColors[0] },
          { ...DEFAULT_GRADIENT.stops[1], color: brandColors[1] },
        ],
      });
    }
    return structuredClone(DEFAULT_GRADIENT);
  }, [brandColors, brandGradient]);

  function patch(patchValue: Partial<GradientModel>, label: string) {
    onChange(normalizeGradient({ ...gradient, ...patchValue }), label);
  }

  function patchStop(stopId: string, stopPatch: Partial<GradientStop>, label: string) {
    patch(
      {
        stops: gradient.stops.map((stop) =>
          stop.id === stopId ? { ...stop, ...stopPatch } : stop
        ),
      },
      label
    );
  }

  return (
    <section className="space-y-4" data-testid="gradient-studio">
      <div
        className="aspect-[3/1] w-full rounded-xl border border-white/15"
        style={{ background: gradientToCss(gradient) }}
        aria-label="Gradient preview"
        data-testid="gradient-preview"
      />

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="gradient-start">Start</Label>
          <Input
            id="gradient-start"
            type="color"
            value={gradient.stops[0].color}
            onChange={(event) =>
              patchStop(
                gradient.stops[0].id,
                { color: event.target.value },
                "Changed gradient start color"
              )
            }
            data-testid="gradient-start-color"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="gradient-end">End</Label>
          <Input
            id="gradient-end"
            type="color"
            value={gradient.stops[gradient.stops.length - 1].color}
            onChange={(event) =>
              patchStop(
                gradient.stops[gradient.stops.length - 1].id,
                { color: event.target.value },
                "Changed gradient end color"
              )
            }
            data-testid="gradient-end-color"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="gradient-angle">Angle {Math.round(gradient.angle)}°</Label>
        <input
          id="gradient-angle"
          type="range"
          min={0}
          max={359}
          value={gradient.angle}
          className="w-full"
          disabled={false}
          onChange={(event) =>
            patch({ angle: Number(event.target.value) }, "Changed gradient angle")
          }
          data-testid="gradient-angle"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange(reverseGradient(gradient), "Reversed gradient")}
          data-testid="gradient-reverse"
        >
          <Shuffle className="mr-1 h-3.5 w-3.5" />
          Reverse
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setAdvanced((current) => !current)}
          aria-expanded={advanced}
          data-testid="gradient-advanced-toggle"
        >
          {advanced ? "Quick controls" : "Advanced Gradient Studio"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() =>
            onChange(structuredClone(resetGradient), "Reset gradient to Brand")
          }
          data-testid="gradient-reset-brand"
        >
          <RotateCcw className="mr-1 h-3.5 w-3.5" />
          Reset to Brand
        </Button>
      </div>

      {brandColors.length ? (
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wide text-white/45">
            Brand colors
          </p>
          <div className="flex flex-wrap gap-2">
            {brandColors.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Apply Brand color ${color} to selected gradient stop`}
                className="h-9 w-9 rounded-full border border-white/30"
                style={{ backgroundColor: color }}
                onClick={() =>
                  selected &&
                  patchStop(
                    selected.id,
                    { color },
                    "Applied Brand color to gradient"
                  )
                }
              />
            ))}
          </div>
        </div>
      ) : null}

      {advanced ? (
        <div className="space-y-4 border-t border-white/10 pt-4" data-testid="gradient-advanced">
          <div className="flex gap-2">
            {(["linear", "radial", "conic"] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                className={`min-h-10 flex-1 rounded-lg border px-3 text-xs capitalize ${
                  gradient.kind === kind
                    ? "border-white/40 bg-white/10"
                    : "border-white/10"
                }`}
                onClick={() => patch({ kind }, `Changed gradient to ${kind}`)}
                data-testid={`gradient-kind-${kind}`}
              >
                {kind}
              </button>
            ))}
          </div>

          {gradient.kind === "radial" || gradient.kind === "conic" ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-xs">
                <span>Center X {gradient.centerX}%</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={gradient.centerX}
                  onChange={(event) =>
                    patch(
                      { centerX: Number(event.target.value) },
                      "Changed gradient center"
                    )
                  }
                />
              </label>
              <label className="space-y-1 text-xs">
                <span>Center Y {gradient.centerY}%</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={gradient.centerY}
                  onChange={(event) =>
                    patch(
                      { centerY: Number(event.target.value) },
                      "Changed gradient center"
                    )
                  }
                />
              </label>
              {gradient.kind === "radial" ? (
                <label className="col-span-2 space-y-1 text-xs">
                  <span>Size {gradient.size ?? 50}%</span>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={gradient.size ?? 50}
                    onChange={(event) =>
                      patch(
                        { size: Number(event.target.value) },
                        "Changed radial gradient size"
                      )
                    }
                    data-testid="gradient-radial-size"
                  />
                </label>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium">Color stops</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const next = addGradientStop(gradient);
                  onChange(next, "Added gradient stop");
                  setSelectedStopId(next.stops[next.stops.length - 2].id);
                }}
                disabled={gradient.stops.length >= 8}
                data-testid="gradient-add-stop"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add stop
              </Button>
            </div>
            <div className="flex h-12 items-center gap-1 rounded-lg border border-white/10 px-2">
              {gradient.stops.map((stop) => (
                <button
                  key={stop.id}
                  type="button"
                  aria-label={`Select gradient stop at ${Math.round(stop.position)} percent`}
                  className={`h-8 w-8 rounded-full border-2 ${
                    selected?.id === stop.id ? "border-white" : "border-white/25"
                  }`}
                  style={{ backgroundColor: stop.color }}
                  onClick={() => setSelectedStopId(stop.id)}
                />
              ))}
            </div>
          </div>

          {selected ? (
            <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="grid grid-cols-[64px_1fr_80px] items-end gap-2">
                <label className="space-y-1 text-xs">
                  <span>Color</span>
                  <Input
                    type="color"
                    value={selected.color}
                    onChange={(event) =>
                      patchStop(
                        selected.id,
                        { color: event.target.value },
                        "Changed gradient stop color"
                      )
                    }
                  />
                </label>
                <label className="space-y-1 text-xs">
                  <span>Position {Math.round(selected.position)}%</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={selected.position}
                    className="w-full"
                    onChange={(event) =>
                      patchStop(
                        selected.id,
                        { position: Number(event.target.value) },
                        "Moved gradient stop"
                      )
                    }
                    data-testid="gradient-stop-position"
                  />
                </label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={Math.round(selected.position)}
                  aria-label="Exact gradient stop percentage"
                  onChange={(event) =>
                    patchStop(
                      selected.id,
                      { position: Number(event.target.value) },
                      "Set exact gradient stop position"
                    )
                  }
                />
              </div>
              <label className="space-y-1 text-xs">
                <span>Opacity {Math.round(selected.opacity * 100)}%</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(selected.opacity * 100)}
                  className="w-full"
                  onChange={(event) =>
                    patchStop(
                      selected.id,
                      { opacity: Number(event.target.value) / 100 },
                      "Changed gradient stop opacity"
                    )
                  }
                />
              </label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={gradient.stops.length <= 2}
                onClick={() => {
                  const next = removeGradientStop(gradient, selected.id);
                  onChange(next, "Removed gradient stop");
                  setSelectedStopId(next.stops[0].id);
                }}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Remove stop
              </Button>
            </div>
          ) : null}

          <div className="space-y-2">
            <p className="text-xs font-medium">Presets</p>
            <div className="grid grid-cols-2 gap-2">
              {GRADIENT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="overflow-hidden rounded-lg border border-white/10 text-left"
                  onClick={() =>
                    onChange(structuredClone(preset.gradient), `Applied ${preset.label} gradient`)
                  }
                >
                  <span
                    className="block h-10"
                    style={{ background: gradientToCss(preset.gradient) }}
                  />
                  <span className="block px-2 py-1.5 text-[10px]">{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div
            className={`rounded-lg border p-3 text-xs ${
              contrast.current < 4.5
                ? "border-amber-300/35 bg-amber-300/10"
                : "border-emerald-300/25 bg-emerald-300/5"
            }`}
            data-testid="gradient-contrast-assistance"
          >
            <p className="flex items-center gap-2 font-medium">
              {contrast.current < 4.5 ? (
                <AlertTriangle className="h-4 w-4 text-amber-200" />
              ) : (
                <CheckIcon />
              )}
              {contrast.current < 4.5
                ? `Contrast warning · ${contrast.current.toFixed(2)}:1`
                : `Readable contrast · ${contrast.current.toFixed(2)}:1`}
            </p>
            <p className="mt-1 text-[11px] text-white/55">
              Checks the selected text color against every gradient stop.
            </p>
            {contrast.current < 4.5 ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => onSuggestedTextColor?.(contrast.suggested)}
                disabled={!onSuggestedTextColor}
                data-testid="gradient-use-readable-text"
              >
                Use suggested readable text ({contrast.suggestedRatio.toFixed(2)}:1)
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <ReusableDesignBrowser
        kind="GRADIENT"
        value={gradient}
        compact
        title="Saved and recent gradients"
        onInsert={(next, label) => onChange(normalizeGradient(next), label)}
      />
    </section>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 text-emerald-200" aria-hidden>
      <path
        d="m4 10 4 4 8-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

