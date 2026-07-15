"use client";

import type { CSSProperties } from "react";
import type { BlockStyle } from "@/lib/types/campaign";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function BlockStyleControls({
  style = {},
  onChange,
}: {
  style?: BlockStyle;
  onChange: (next: BlockStyle) => void;
}) {
  function set<K extends keyof BlockStyle>(key: K, value: BlockStyle[K]) {
    onChange({ ...style, [key]: value });
  }

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-border/40 bg-muted/20 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Block design
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-[10px]">Font</Label>
          <select
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
            value={style.fontFamily ?? "sans"}
            onChange={(e) => set("fontFamily", e.target.value as BlockStyle["fontFamily"])}
          >
            <option value="sans">Modern sans</option>
            <option value="serif">Classic serif</option>
            <option value="display">Display / impact</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Size</Label>
          <select
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
            value={style.fontSize ?? "base"}
            onChange={(e) => set("fontSize", e.target.value as BlockStyle["fontSize"])}
          >
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
            value={style.fontWeight ?? "normal"}
            onChange={(e) => set("fontWeight", e.target.value as BlockStyle["fontWeight"])}
          >
            <option value="normal">Regular</option>
            <option value="medium">Medium</option>
            <option value="semibold">Semibold</option>
            <option value="bold">Bold</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Align</Label>
          <select
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
            value={style.align ?? "left"}
            onChange={(e) => set("align", e.target.value as BlockStyle["align"])}
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Spacing</Label>
          <select
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
            value={style.spacing ?? "normal"}
            onChange={(e) => set("spacing", e.target.value as BlockStyle["spacing"])}
          >
            <option value="compact">Compact</option>
            <option value="normal">Normal</option>
            <option value="spacious">Spacious</option>
          </select>
        </div>
        <label className="flex items-end gap-2 pb-1 text-xs">
          <input
            type="checkbox"
            checked={style.card === true}
            onChange={(e) => set("card", e.target.checked)}
          />
          Card background
        </label>
        <label className="flex items-end gap-2 pb-1 text-xs">
          <input
            type="checkbox"
            checked={style.italic === true}
            onChange={(e) => set("italic", e.target.checked)}
          />
          Italic
        </label>
        <label className="flex items-end gap-2 pb-1 text-xs">
          <input
            type="checkbox"
            checked={style.underline === true}
            onChange={(e) => set("underline", e.target.checked)}
          />
          Underline
        </label>
        <label className="flex items-end gap-2 pb-1 text-xs">
          <input
            type="checkbox"
            checked={style.uppercase === true}
            onChange={(e) => set("uppercase", e.target.checked)}
          />
          ALL CAPS
        </label>
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-[10px]">Premium finish</Label>
          <select
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
            value={style.finish ?? ""}
            onChange={(e) =>
              set("finish", (e.target.value || undefined) as BlockStyle["finish"])
            }
          >
            <option value="">None</option>
            <option value="metallic">Metallic</option>
            <option value="glass">Glass</option>
            <option value="tile">Tile</option>
            <option value="neon">Neon glow</option>
            <option value="soft">Soft</option>
            <option value="solid">Solid</option>
            <option value="outline">Outline</option>
            <option value="ghost">Ghost</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Text color</Label>
          <div className="flex gap-1">
            <input
              type="color"
              value={style.textColor ?? "#f8fafc"}
              onChange={(e) => set("textColor", e.target.value)}
              className="h-8 w-10 cursor-pointer rounded border-0"
            />
            <Input
              value={style.textColor ?? ""}
              onChange={(e) => set("textColor", e.target.value || undefined)}
              placeholder="default"
              className="h-8 font-mono text-xs"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Block background</Label>
          <div className="flex gap-1">
            <input
              type="color"
              value={style.backgroundColor ?? "#0b0f19"}
              onChange={(e) => set("backgroundColor", e.target.value)}
              className="h-8 w-10 cursor-pointer rounded border-0"
            />
            <Input
              value={style.backgroundColor ?? ""}
              onChange={(e) => set("backgroundColor", e.target.value || undefined)}
              placeholder="transparent"
              className="h-8 font-mono text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function blockStyleToCss(style?: BlockStyle): CSSProperties {
  if (!style) return {};
  const fontSizeMap = {
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
  };
  const weightMap = {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  };
  const familyMap = {
    sans: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
    serif: "ui-serif, Georgia, Cambria, 'Times New Roman', serif",
    display: "'Segoe UI', 'Helvetica Neue', Impact, sans-serif",
  };
  const padMap = {
    compact: "0.5rem 1rem",
    normal: "1rem",
    spacious: "1.5rem 1.25rem",
  };

  return {
    color: style.textColor,
    backgroundColor: style.backgroundColor,
    fontSize: style.fontSize ? fontSizeMap[style.fontSize] : undefined,
    fontWeight: style.fontWeight ? weightMap[style.fontWeight] : undefined,
    fontFamily: style.fontFamily ? familyMap[style.fontFamily] : undefined,
    textAlign: style.align,
    padding: style.spacing ? padMap[style.spacing] : undefined,
    fontStyle: style.italic ? "italic" : undefined,
    textDecoration: style.underline ? "underline" : undefined,
    textTransform: style.uppercase ? "uppercase" : undefined,
    ...(style.neonColor ? ({ ["--tcc-neon" as string]: style.neonColor } as CSSProperties) : {}),
  };
}
