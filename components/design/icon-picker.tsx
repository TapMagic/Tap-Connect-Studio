"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ImageIcon, Link2, Loader2, Search, Upload, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MediaPicker } from "@/components/media/media-picker";
import {
  REACT_ICON_COUNT,
  searchReactIcons,
  getReactIconById,
  type ReactIconCategory,
} from "@/lib/design/react-icon-catalog";
import { cn } from "@/lib/utils";

type IconPickerProps = {
  icon?: string;
  customUrl?: string;
  /** Hex tint — defaults to a light UI-friendly color on dark surfaces */
  color?: string;
  onChange: (next: { icon?: string; customUrl?: string; color?: string }) => void;
  mediaUploadReady?: boolean;
  stockReady?: boolean;
  label?: string;
  hideCustom?: boolean;
  showLogoPicker?: boolean;
  /**
   * When set, POSTs to `/api/save-icon` (BrandKit defaults or BrandLink by linkId).
   * Leave off for Tap Card / campaign editors — those save with the parent form.
   */
  persist?: boolean | { linkId: string };
};

const PRESET_COLORS = [
  "#f8fafc",
  "#000000",
  "#a3e635",
  "#d4af37",
  "#ef4444",
  "#3b82f6",
  "#a855f7",
  "#f97316",
  "#1877F2",
  "#E4405F",
  "#25D366",
];

const DEFAULT_COLOR = "#f8fafc";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

/**
 * Searchable Icon + Logo picker backed by react-icons (Simple Icons + Feather + extras).
 */
export function IconPicker({
  icon = "FiLink",
  customUrl = "",
  color = DEFAULT_COLOR,
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
  const [selectedColor, setSelectedColor] = useState(color || DEFAULT_COLOR);
  const [pasteUrl, setPasteUrl] = useState(customUrl || "");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (color) setSelectedColor(color);
  }, [color]);

  useEffect(() => {
    setPasteUrl(customUrl || "");
  }, [customUrl]);

  useEffect(() => {
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, []);

  const results = useMemo(() => {
    const list = searchReactIcons(query, 120);
    if (category === "all") return list;
    return list.filter((i) => i.category === category);
  }, [query, category]);

  const selectedItem = getReactIconById(icon);
  const shouldPersist = Boolean(persist);

  function queuePersist(iconName: string, iconColor: string, logo?: string) {
    if (!shouldPersist || !iconName) return;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      void persistSelection(iconName, iconColor, logo);
    }, 350);
  }

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
          ? "Saved icon to Brand Link"
          : "Saved icon to Brand Kit"
      );
      window.setTimeout(() => setSaveMessage(null), 2200);
    } catch {
      setSaveError("Could not reach /api/save-icon");
    } finally {
      setSaving(false);
    }
  }

  function applyColor(next: string) {
    const value = next || DEFAULT_COLOR;
    setSelectedColor(value);
    onChange({
      icon: customUrl ? undefined : icon,
      customUrl: customUrl || undefined,
      color: value,
    });
    if (icon && !customUrl) queuePersist(icon, value);
  }

  function selectIcon(iconId: string) {
    onChange({
      icon: iconId,
      customUrl: undefined,
      color: selectedColor,
    });
    setPasteUrl("");
    queuePersist(iconId, selectedColor);
  }

  async function onUpload(file: File | null) {
    if (!file || !file.type.startsWith("image/")) return;
    const dataUrl = await readFileAsDataUrl(file);
    onChange({ icon: icon || undefined, customUrl: dataUrl, color: selectedColor });
    setPasteUrl(dataUrl);
    if (icon) queuePersist(icon, selectedColor, dataUrl);
  }

  return (
    <div className="space-y-3 rounded-xl border border-border/50 bg-muted/15 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <Label className="text-xs font-semibold">{label}</Label>
          <p className="text-[10px] text-muted-foreground">
            Search {REACT_ICON_COUNT.toLocaleString()}+ brand & UI icons · hex color
            {shouldPersist
              ? " · auto-saves to Brand Kit / Brand Link"
              : " · saved with parent form"}
          </p>
        </div>
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background shadow-sm"
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
            label="Logo image (preferred — shown instead of icon)"
            value={customUrl || ""}
            onChange={(url) => {
              setPasteUrl(url);
              onChange({
                icon: icon || undefined,
                customUrl: url || undefined,
                color: selectedColor,
              });
              if (icon) queuePersist(icon, selectedColor, url || undefined);
            }}
            mediaUploadReady={mediaUploadReady}
            stockReady={stockReady}
          />
        </fieldset>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type to search — etsy, poshmark, slack, home…"
            className="h-9 pl-9 text-sm"
            aria-label="Search icons"
            disabled={saving}
            autoComplete="off"
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

        <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-background/60 px-2 py-1">
          <Label className="text-[10px] text-muted-foreground">Color</Label>
          <input
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(selectedColor) ? selectedColor : "#f8fafc"}
            onChange={(e) => applyColor(e.target.value)}
            className="h-8 w-9 cursor-pointer rounded border-0 bg-transparent p-0 disabled:opacity-50"
            title="Icon color"
            aria-label="Icon color"
            disabled={saving}
          />
          <Input
            value={selectedColor}
            onChange={(e) => applyColor(e.target.value)}
            className="h-8 w-[5.75rem] font-mono text-[11px]"
            placeholder="#f8fafc"
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

      <div className="flex flex-wrap items-center gap-1">
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
        <span className="ml-auto text-[10px] text-muted-foreground">
          {results.length} shown
          {query ? ` for “${query}”` : ""}
        </span>
      </div>

      <div
        className={cn(
          "grid max-h-64 grid-cols-6 gap-1.5 overflow-y-auto overscroll-contain rounded-lg border border-border/40 bg-background/70 p-2 sm:grid-cols-8",
          saving && "pointer-events-none opacity-60"
        )}
        role="listbox"
        aria-label="Icon results"
        aria-busy={saving}
      >
        {results.length === 0 ? (
          <p className="col-span-full px-2 py-6 text-center text-xs text-muted-foreground">
            No icons match “{query}”. Try etsy, shopify, github, calendar…
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
                title={`${item.name} (${item.category})`}
                disabled={saving}
                onClick={() => selectIcon(item.id)}
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

      {(icon || customUrl) && (
        <p className="text-[11px] text-muted-foreground">
          {customUrl ? (
            <>Using <span className="font-medium text-foreground">logo image</span></>
          ) : (
            <>
              Selected:{" "}
              <span className="font-medium text-foreground">
                {selectedItem?.name || icon}
              </span>
            </>
          )}
          {" · "}
          <span style={{ color: selectedColor }}>{selectedColor}</span>
          {saving ? " · Saving…" : null}
        </p>
      )}

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
                  icon: icon || undefined,
                  customUrl: pasteUrl.trim(),
                  color: selectedColor,
                });
                if (icon) queuePersist(icon, selectedColor, pasteUrl.trim());
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
              Logo overrides library icon when set
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
                    icon: icon || "FiLink",
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
