"use client";

import { useMemo, useRef, useState } from "react";
import { Check, ImageIcon, Link2, Loader2, Search, Upload, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MediaPicker } from "@/components/media/media-picker";
import {
  REACT_ICON_COLLECTION,
  searchReactIcons,
  getReactIconById,
  type ReactIconCategory,
} from "@/lib/design/react-icon-catalog";
import { cn } from "@/lib/utils";

type IconPickerProps = {
  icon?: string;
  /** Custom / uploaded logo mark — preferred over library icon when set */
  customUrl?: string;
  /** Custom hex tint — defaults to #000000 */
  color?: string;
  onChange: (next: { icon?: string; customUrl?: string; color?: string }) => void;
  mediaUploadReady?: boolean;
  stockReady?: boolean;
  label?: string;
  hideCustom?: boolean;
  /** Show logo MediaPicker above the icon grid (preferred when available) */
  showLogoPicker?: boolean;
  /**
   * Persist selection to PostgreSQL via `/api/save-icon`.
   * - `true` → save to BrandKit defaults (iconName / iconColor)
   * - `{ linkId }` → save to that BrandLink row
   */
  persist?: boolean | { linkId: string };
};

const PRESET_COLORS = [
  "#000000",
  "#ffffff",
  "#a3e635",
  "#d4af37",
  "#ef4444",
  "#3b82f6",
  "#a855f7",
  "#f97316",
];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

/**
 * Advanced searchable Icon Picker — react-icons brands + UI,
 * custom hex coloring, optional logo picker, Prisma persist via /api/save-icon.
 */
export function IconPicker({
  icon = "link",
  customUrl = "",
  color = "#000000",
  onChange,
  mediaUploadReady = false,
  stockReady = false,
  label = "Icon & logo picker",
  hideCustom = false,
  showLogoPicker = true,
  persist = false,
}: IconPickerProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | ReactIconCategory>("all");
  const [selectedColor, setSelectedColor] = useState(color || "#000000");
  const [pasteUrl, setPasteUrl] = useState(customUrl || "");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const list = searchReactIcons(query, 120);
    if (category === "all") return list;
    return list.filter((i) => i.category === category);
  }, [query, category]);

  const selectedItem = getReactIconById(icon) ?? REACT_ICON_COLLECTION[0];
  const shouldPersist = Boolean(persist);

  async function persistSelection(iconName: string, iconColor: string, logo?: string) {
    if (!shouldPersist) return;
    setSaving(true);
    setSaveMessage(null);
    setSaveError(null);
    try {
      const linkId = typeof persist === "object" ? persist.linkId : undefined;
      const res = await fetch("/api/save-icon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          iconName,
          iconColor,
          ...(linkId ? { linkId } : {}),
          ...(logo ? { logoUrl: logo } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        savedTo?: string;
      };
      if (!res.ok) {
        setSaveError(data.error || "Save failed");
        return;
      }
      setSaveMessage(
        data.savedTo === "brandLink"
          ? "Icon saved to link"
          : "Icon saved to Brand Kit"
      );
      window.setTimeout(() => setSaveMessage(null), 2500);
    } catch {
      setSaveError("Network error — could not save");
    } finally {
      setSaving(false);
    }
  }

  function applyColor(next: string) {
    const value = next || "#000000";
    setSelectedColor(value);
    onChange({
      icon: customUrl ? undefined : icon,
      customUrl: customUrl || undefined,
      color: value,
    });
    if (icon && !customUrl) {
      void persistSelection(icon, value);
    }
  }

  async function selectIcon(iconId: string) {
    onChange({
      icon: iconId,
      customUrl: undefined,
      color: selectedColor,
    });
    setPasteUrl("");
    await persistSelection(iconId, selectedColor);
  }

  async function onUpload(file: File | null) {
    if (!file || !file.type.startsWith("image/")) return;
    const dataUrl = await readFileAsDataUrl(file);
    onChange({ icon: undefined, customUrl: dataUrl, color: selectedColor });
    setPasteUrl(dataUrl);
    if (icon) {
      await persistSelection(icon, selectedColor, dataUrl);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-border/50 bg-muted/15 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <Label className="text-xs font-semibold">{label}</Label>
          <p className="text-[10px] text-muted-foreground">
            Logo preferred · react-icons search · hex color
            {shouldPersist ? " · auto-saves to database" : ""}
          </p>
        </div>
        <div
          className="flex size-10 items-center justify-center rounded-lg border border-border/60 bg-background shadow-sm"
          style={{ color: selectedColor }}
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : customUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={customUrl} alt="" className="size-5 object-contain" />
          ) : selectedItem ? (
            <selectedItem.Icon size={18} color={selectedColor} style={{ color: selectedColor }} />
          ) : (
            <Search className="size-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {(saveMessage || saveError) && (
        <div
          role="status"
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium",
            saveMessage && "bg-primary/15 text-primary",
            saveError && "bg-red-500/15 text-red-400"
          )}
        >
          {saveMessage ? <Check className="size-3.5 shrink-0" /> : null}
          {saveMessage || saveError}
        </div>
      )}

      {showLogoPicker && !hideCustom ? (
        <fieldset disabled={saving} className="min-w-0 disabled:opacity-60">
          <MediaPicker
            label="Logo mark (preferred over icon)"
            value={customUrl || ""}
            onChange={(url) => {
              setPasteUrl(url);
              onChange({
                icon: url ? undefined : icon,
                customUrl: url || undefined,
                color: selectedColor,
              });
              if (icon) void persistSelection(icon, selectedColor, url || undefined);
            }}
            mediaUploadReady={mediaUploadReady}
            stockReady={stockReady}
          />
        </fieldset>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[10rem] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search icons by name…"
            className="h-9 pl-9 text-sm"
            aria-label="Search icons"
            disabled={saving}
          />
          {query ? (
            <button
              type="button"
              className="absolute right-2 top-2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              disabled={saving}
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5">
          <Label className="text-[10px] text-muted-foreground">Color</Label>
          <input
            type="color"
            value={selectedColor || "#000000"}
            onChange={(e) => applyColor(e.target.value)}
            className="h-9 w-10 cursor-pointer rounded border-0 bg-transparent p-0 disabled:opacity-50"
            title="Custom icon color"
            aria-label="Icon color"
            disabled={saving}
          />
          <Input
            value={selectedColor}
            onChange={(e) => applyColor(e.target.value)}
            className="h-9 w-[5.5rem] font-mono text-[11px]"
            placeholder="#000000"
            disabled={saving}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            disabled={saving}
            onClick={() => applyColor(c)}
            className={cn(
              "size-5 rounded-full border border-border/60 disabled:opacity-40",
              selectedColor.toLowerCase() === c.toLowerCase() &&
                "ring-2 ring-primary ring-offset-1 ring-offset-background"
            )}
            style={{ background: c }}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-1">
        {(["all", "brand", "ui"] as const).map((c) => (
          <button
            key={c}
            type="button"
            disabled={saving}
            onClick={() => setCategory(c)}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[10px] font-medium capitalize disabled:opacity-40",
              category === c
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div
        className={cn(
          "grid max-h-56 grid-cols-6 gap-1.5 overflow-y-auto rounded-lg border border-border/40 bg-background/70 p-2 sm:grid-cols-8",
          saving && "pointer-events-none opacity-60"
        )}
        role="listbox"
        aria-label="Icon results"
        aria-busy={saving}
      >
        {results.length === 0 ? (
          <p className="col-span-full px-2 py-6 text-center text-xs text-muted-foreground">
            No icons match “{query}”
          </p>
        ) : (
          results.map((item) => {
            const selected = icon === item.id && !customUrl;
            const Icon = item.Icon;
            return (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={selected}
                title={item.name}
                disabled={saving}
                onClick={() => void selectIcon(item.id)}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center rounded-md border p-1 transition disabled:cursor-wait",
                  selected
                    ? "border-primary bg-primary/15 shadow-[0_0_0_1px_rgba(163,230,53,0.35)]"
                    : "border-transparent hover:border-border hover:bg-muted"
                )}
              >
                <Icon size={18} color={selectedColor} style={{ color: selectedColor }} />
              </button>
            );
          })
        )}
      </div>

      {icon && !customUrl ? (
        <p className="text-[11px] text-muted-foreground">
          Selected: <span className="font-medium text-foreground">{selectedItem?.name}</span>
          {" · "}
          <span style={{ color: selectedColor }}>{selectedColor}</span>
          {saving ? " · Saving…" : null}
        </p>
      ) : null}

      {!hideCustom ? (
        <div className="space-y-1.5 border-t border-border/40 pt-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Custom logo / paste
          </p>
          <div className="flex gap-1">
            <Input
              value={pasteUrl}
              onChange={(e) => setPasteUrl(e.target.value)}
              placeholder="Paste logo image URL…"
              className="h-8 font-mono text-[11px]"
              disabled={saving}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 shrink-0 px-2"
              disabled={saving}
              onClick={() => {
                if (!pasteUrl.trim()) return;
                onChange({
                  icon: undefined,
                  customUrl: pasteUrl.trim(),
                  color: selectedColor,
                });
                if (icon) void persistSelection(icon, selectedColor, pasteUrl.trim());
              }}
            >
              <Link2 className="size-3.5" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8"
              disabled={saving}
              onClick={() => fileRef.current?.click()}
            >
              {saving ? (
                <Loader2 className="mr-1 size-3.5 animate-spin" />
              ) : (
                <Upload className="mr-1 size-3.5" />
              )}
              Upload logo
            </Button>
            <span className="self-center text-[10px] text-muted-foreground">
              <ImageIcon className="mr-1 inline size-3" />
              Logos preferred when present
            </span>
            {customUrl ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 text-red-400"
                disabled={saving}
                onClick={() => {
                  onChange({
                    icon: icon || "link",
                    customUrl: undefined,
                    color: selectedColor,
                  });
                  setPasteUrl("");
                }}
              >
                <X className="mr-1 size-3.5" />
                Clear logo
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
