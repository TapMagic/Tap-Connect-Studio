"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  PREMIUM_FINISH_OPTIONS,
  PREMIUM_FONT_OPTIONS,
  type PremiumFinish,
  type TextFormat,
} from "@/lib/design/premium-finish";

export function FinishPicker({
  value,
  onChange,
  label = "Finish",
}: {
  value?: PremiumFinish | string;
  onChange: (finish: PremiumFinish) => void;
  label?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <select
        className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
        value={value || "metallic"}
        onChange={(e) => onChange(e.target.value as PremiumFinish)}
      >
        {PREMIUM_FINISH_OPTIONS.map((f) => (
          <option key={f.id} value={f.id}>
            {f.label} — {f.hint}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TextFormatControls({
  value = {},
  onChange,
  title = "Typography",
}: {
  value?: TextFormat;
  onChange: (next: TextFormat) => void;
  title?: string;
}) {
  function set<K extends keyof TextFormat>(key: K, v: TextFormat[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className="space-y-2 rounded-lg border border-border/40 bg-muted/20 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-[10px]">Font</Label>
          <select
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
            value={value.fontFamily ?? "sans"}
            onChange={(e) => set("fontFamily", e.target.value as TextFormat["fontFamily"])}
          >
            {PREMIUM_FONT_OPTIONS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Size</Label>
          <select
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
            value={value.fontSize ?? "base"}
            onChange={(e) => set("fontSize", e.target.value as TextFormat["fontSize"])}
          >
            <option value="xs">XS</option>
            <option value="sm">Small</option>
            <option value="base">Medium</option>
            <option value="lg">Large</option>
            <option value="xl">XL</option>
            <option value="2xl">2XL</option>
            <option value="3xl">Hero</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Weight</Label>
          <select
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
            value={value.fontWeight ?? "normal"}
            onChange={(e) => set("fontWeight", e.target.value as TextFormat["fontWeight"])}
          >
            <option value="normal">Regular</option>
            <option value="medium">Medium</option>
            <option value="semibold">Semibold</option>
            <option value="bold">Bold</option>
            <option value="black">Black</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Align</Label>
          <select
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
            value={value.align ?? "left"}
            onChange={(e) => set("align", e.target.value as TextFormat["align"])}
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Tracking</Label>
          <select
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
            value={value.letterSpacing ?? "normal"}
            onChange={(e) =>
              set("letterSpacing", e.target.value as TextFormat["letterSpacing"])
            }
          >
            <option value="tight">Tight</option>
            <option value="normal">Normal</option>
            <option value="wide">Wide</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Color</Label>
          <div className="flex gap-1">
            <input
              type="color"
              value={value.color ?? "#0b0f19"}
              onChange={(e) => set("color", e.target.value)}
              className="h-8 w-10 cursor-pointer rounded border-0"
            />
            <Input
              value={value.color ?? ""}
              onChange={(e) => set("color", e.target.value || undefined)}
              className="h-8 font-mono text-xs"
              placeholder="inherit"
            />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 text-xs">
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={Boolean(value.italic)}
            onChange={(e) => set("italic", e.target.checked)}
          />
          Italic
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={Boolean(value.underline)}
            onChange={(e) => set("underline", e.target.checked)}
          />
          Underline
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={Boolean(value.uppercase)}
            onChange={(e) => set("uppercase", e.target.checked)}
          />
          ALL CAPS
        </label>
      </div>
    </div>
  );
}
