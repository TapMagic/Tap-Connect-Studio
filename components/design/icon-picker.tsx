"use client";

import { useMemo, useRef, useState } from "react";
import { ImageIcon, Link2, Search, Upload, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BrandSvg } from "@/components/design/brand-svg";
import { SocialGlyph } from "@/components/tap/social-icons";
import {
  LUCIDE_ICON_CATEGORIES,
  searchLucideIcons,
  type LucideLibraryItem,
} from "@/lib/design/lucide-icon-registry";
import { BRAND_ICON_BY_ID } from "@/lib/design/brand-icons";
import { cn } from "@/lib/utils";

type IconPickerProps = {
  icon?: string;
  customUrl?: string;
  /** Custom icon tint — empty/undefined keeps brand scheme (Google Reviews, etc.) */
  color?: string;
  onChange: (next: { icon?: string; customUrl?: string; color?: string }) => void;
  mediaUploadReady?: boolean;
  label?: string;
  hideCustom?: boolean;
};

const PRESET_COLORS = [
  "#f8fafc",
  "#0b0f19",
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

function LibraryGlyph({
  item,
  size = 18,
  color,
}: {
  item: LucideLibraryItem;
  size?: number;
  color?: string;
}) {
  if (item.brand && BRAND_ICON_BY_ID[item.brand]) {
    return <BrandSvg id={item.brand} sizePx={size} color={color} />;
  }
  if (item.brand) {
    return (
      <span style={{ color: color || "currentColor" }}>
        <SocialGlyph platform={item.brand} sizePx={size} />
      </span>
    );
  }
  if (item.Icon) {
    const Icon = item.Icon;
    return (
      <Icon
        aria-hidden
        style={{ width: size, height: size, color: color || "currentColor" }}
        color={color || "currentColor"}
      />
    );
  }
  return <Search style={{ width: size, height: size, color }} aria-hidden />;
}

/**
 * Advanced searchable Icon Picker — Lucide utilities + simple-icons brands,
 * with live custom coloring (brand schemes preserved when color is cleared).
 */
export function IconPicker({
  icon = "link",
  customUrl = "",
  color,
  onChange,
  mediaUploadReady = false,
  label = "Icon library",
  hideCustom = false,
}: IconPickerProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [selectedColor, setSelectedColor] = useState(color || "");
  const [pasteUrl, setPasteUrl] = useState(customUrl || "");
  const fileRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const list = searchLucideIcons(query, 140);
    if (category === "all") return list;
    return list.filter((i) => i.category === category);
  }, [query, category]);

  const selectedItem = useMemo(
    () =>
      searchLucideIcons(icon, 8).find((i) => i.id === icon) ??
      results.find((i) => i.id === icon),
    [results, icon]
  );

  function applyColor(next: string) {
    setSelectedColor(next);
    onChange({
      icon: customUrl ? undefined : icon,
      customUrl: customUrl || undefined,
      color: next || undefined,
    });
  }

  async function onUpload(file: File | null) {
    if (!file || !file.type.startsWith("image/")) return;
    const dataUrl = await readFileAsDataUrl(file);
    onChange({ icon: undefined, customUrl: dataUrl, color: selectedColor || undefined });
    setPasteUrl(dataUrl);
  }

  return (
    <div className="space-y-3 rounded-xl border border-border/50 bg-muted/15 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <Label className="text-xs font-semibold">{label}</Label>
          <p className="text-[10px] text-muted-foreground">
            Lucide + brand logos · search · custom color
          </p>
        </div>
        <div
          className="flex size-10 items-center justify-center rounded-lg border border-border/60 bg-background shadow-sm"
          style={{ color: selectedColor || undefined }}
        >
          {customUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={customUrl} alt="" className="size-5 object-contain" />
          ) : selectedItem ? (
            <LibraryGlyph item={selectedItem} size={18} color={selectedColor || undefined} />
          ) : (
            <Search className="size-4 text-muted-foreground" />
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[10rem] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search icons (home, github, cart…)"
            className="h-9 pl-9 text-sm"
            aria-label="Search icons"
          />
          {query ? (
            <button
              type="button"
              className="absolute right-2 top-2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5">
          <Label className="text-[10px] text-muted-foreground">Color</Label>
          <input
            type="color"
            value={selectedColor || "#a3e635"}
            onChange={(e) => applyColor(e.target.value)}
            className="h-9 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
            title="Custom icon color"
            aria-label="Icon color"
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-[10px]"
            onClick={() => applyColor("")}
            title="Use brand / default scheme (Google Reviews, socials…)"
          >
            Brand
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            onClick={() => applyColor(c)}
            className={cn(
              "size-5 rounded-full border border-border/60",
              selectedColor === c && "ring-2 ring-primary ring-offset-1 ring-offset-background"
            )}
            style={{ background: c }}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setCategory("all")}
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[10px] font-medium capitalize",
            category === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          All
        </button>
        {LUCIDE_ICON_CATEGORIES.filter((c) => c !== "actions").map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[10px] font-medium capitalize",
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
        className="grid max-h-52 grid-cols-6 gap-1 overflow-y-auto rounded-lg border border-border/40 bg-background/70 p-1.5 sm:grid-cols-8"
        role="listbox"
        aria-label="Icon results"
      >
        {results.length === 0 ? (
          <p className="col-span-full px-2 py-6 text-center text-xs text-muted-foreground">
            No icons match “{query}”
          </p>
        ) : (
          results.map((item) => {
            const selected = icon === item.id && !customUrl;
            return (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={selected}
                title={item.label}
                onClick={() => {
                  onChange({
                    icon: item.id,
                    customUrl: undefined,
                    color: selectedColor || undefined,
                  });
                  setPasteUrl("");
                }}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-md border p-1 transition",
                  selected
                    ? "border-primary bg-primary/15 text-primary shadow-[0_0_0_1px_rgba(163,230,53,0.35)]"
                    : "border-transparent text-foreground/80 hover:border-border hover:bg-muted hover:text-foreground"
                )}
              >
                <LibraryGlyph item={item} size={16} color={selectedColor || undefined} />
              </button>
            );
          })
        )}
      </div>

      {icon && !customUrl ? (
        <p className="text-[11px] text-muted-foreground">
          Selected: <span className="font-medium text-foreground">{icon}</span>
          {selectedItem ? ` · ${selectedItem.label}` : ""}
          {selectedColor ? (
            <span>
              {" "}
              · <span style={{ color: selectedColor }}>{selectedColor}</span>
            </span>
          ) : (
            " · brand / default colors"
          )}
        </p>
      ) : null}

      {!hideCustom ? (
        <div className="space-y-1.5 border-t border-border/40 pt-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Custom icon
          </p>
          <div className="flex gap-1">
            <Input
              value={pasteUrl}
              onChange={(e) => setPasteUrl(e.target.value)}
              placeholder="Paste image URL…"
              className="h-8 font-mono text-[11px]"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 shrink-0 px-2"
              onClick={() => {
                if (!pasteUrl.trim()) return;
                onChange({
                  icon: undefined,
                  customUrl: pasteUrl.trim(),
                  color: selectedColor || undefined,
                });
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
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="mr-1 size-3.5" />
              Upload
            </Button>
            <span className="self-center text-[10px] text-muted-foreground">
              <ImageIcon className="mr-1 inline size-3" />
              {mediaUploadReady ? "Upload or paste anytime" : "Local upload / paste"}
            </span>
            {customUrl ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 text-red-400"
                onClick={() => {
                  onChange({
                    icon: icon || "link",
                    customUrl: undefined,
                    color: selectedColor || undefined,
                  });
                  setPasteUrl("");
                }}
              >
                <X className="mr-1 size-3.5" />
                Clear
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
