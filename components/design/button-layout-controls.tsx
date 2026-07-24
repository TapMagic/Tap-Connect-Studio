"use client";

import { Label } from "@/components/ui/label";
import {
  CONTENT_ALIGN_OPTIONS,
  ICON_PLACEMENT_OPTIONS,
  ICON_SIZE_OPTIONS,
  TEXT_SIZE_OPTIONS,
  VERTICAL_ALIGN_OPTIONS,
  type ButtonLayoutFields,
  type ContentAlign,
  type IconPlacement,
  type IconSizeToken,
  type TextSizeToken,
  type VerticalAlign,
} from "@/lib/design/button-layout";

/**
 * Pages-style Format panel for button / action icon placement + layout.
 * Every control mutates live state — no refresh required.
 */
export function ButtonLayoutControls({
  value,
  onChange,
  title = "Icon & layout",
  showFullWidth = true,
}: {
  value: ButtonLayoutFields;
  onChange: (patch: Partial<ButtonLayoutFields>) => void;
  title?: string;
  showFullWidth?: boolean;
}) {
  return (
    <div
      className="space-y-2 rounded-lg border border-border/40 bg-muted/20 p-3"
      data-testid="button-layout-controls"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-[10px]">Icon placement</Label>
          <select
            aria-label="Icon placement"
            data-testid="icon-placement"
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
            value={value.iconPosition ?? "before"}
            onChange={(e) => onChange({ iconPosition: e.target.value as IconPlacement })}
          >
            {ICON_PLACEMENT_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Icon size</Label>
          <select
            aria-label="Icon size"
            data-testid="icon-size"
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
            value={value.iconSize ?? "md"}
            onChange={(e) => onChange({ iconSize: e.target.value as IconSizeToken })}
          >
            {ICON_SIZE_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Text size</Label>
          <select
            aria-label="Text size"
            data-testid="text-size"
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
            value={value.textSize ?? "md"}
            onChange={(e) => onChange({ textSize: e.target.value as TextSizeToken })}
          >
            {TEXT_SIZE_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Horizontal align</Label>
          <select
            aria-label="Horizontal align"
            data-testid="content-align"
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
            value={value.contentAlign ?? "center"}
            onChange={(e) => onChange({ contentAlign: e.target.value as ContentAlign })}
          >
            {CONTENT_ALIGN_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Vertical align</Label>
          <select
            aria-label="Vertical align"
            data-testid="vertical-align"
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
            value={value.verticalAlign ?? "center"}
            onChange={(e) => onChange({ verticalAlign: e.target.value as VerticalAlign })}
          >
            {VERTICAL_ALIGN_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-[10px]">Icon gap {value.iconGap ?? 8}px</Label>
          <input
            type="range"
            min={0}
            max={32}
            aria-label="Icon gap"
            data-testid="icon-gap"
            value={value.iconGap ?? 8}
            onChange={(e) => onChange({ iconGap: Number(e.target.value) })}
            className="w-full"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Padding X {value.paddingX ?? 16}px</Label>
          <input
            type="range"
            min={4}
            max={40}
            aria-label="Horizontal padding"
            data-testid="padding-x"
            value={value.paddingX ?? 16}
            onChange={(e) => onChange({ paddingX: Number(e.target.value) })}
            className="w-full"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Padding Y {value.paddingY ?? 12}px</Label>
          <input
            type="range"
            min={4}
            max={32}
            aria-label="Vertical padding"
            data-testid="padding-y"
            value={value.paddingY ?? 12}
            onChange={(e) => onChange({ paddingY: Number(e.target.value) })}
            className="w-full"
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-[10px]">Min height {value.minHeight ?? 44}px</Label>
          <input
            type="range"
            min={28}
            max={72}
            aria-label="Minimum height"
            data-testid="min-height"
            value={value.minHeight ?? 44}
            onChange={(e) => onChange({ minHeight: Number(e.target.value) })}
            className="w-full"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-3 text-xs">
        {showFullWidth ? (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              data-testid="layout-full-width"
              checked={value.fullWidth !== false}
              onChange={(e) => onChange({ fullWidth: e.target.checked })}
            />
            Full width
          </label>
        ) : null}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            data-testid="layout-wrap"
            checked={Boolean(value.wrap)}
            onChange={(e) => onChange({ wrap: e.target.checked })}
          />
          Allow wrap
        </label>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Before/after keep icon adjacent to text; left/right pin the icon to the button edge
        (spread). Hover / focus / pressed / disabled / loading use shared `.tap-btn` /
        `.tcc-pill` interaction CSS. Mobile inherits the same placement matrix with wrap.
      </p>
    </div>
  );
}
