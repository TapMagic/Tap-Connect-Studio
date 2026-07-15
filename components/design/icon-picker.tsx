"use client";

import { useMemo, useRef, useState } from "react";
import { ImageIcon, Link2, Search, Upload, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PremiumIcon } from "@/components/design/premium-icon";
import { ICON_CATEGORIES, searchIconLibrary } from "@/lib/design/icon-library";
import { cn } from "@/lib/utils";

type IconPickerProps = {
  icon?: string;
  customUrl?: string;
  onChange: (next: { icon?: string; customUrl?: string }) => void;
  mediaUploadReady?: boolean;
  label?: string;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

export function IconPicker({
  icon = "link",
  customUrl = "",
  onChange,
  mediaUploadReady = false,
  label = "Icon",
}: IconPickerProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [pasteUrl, setPasteUrl] = useState(customUrl || "");
  const fileRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const list = searchIconLibrary(query, 80);
    if (category === "all") return list;
    return list.filter((i) => i.category === category);
  }, [query, category]);

  async function onUpload(file: File | null) {
    if (!file || !file.type.startsWith("image/")) return;
    const dataUrl = await readFileAsDataUrl(file);
    onChange({ icon: undefined, customUrl: dataUrl });
    setPasteUrl(dataUrl);
  }

  return (
    <div className="space-y-2 rounded-lg border border-border/50 bg-muted/15 p-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">{label}</Label>
        <div className="flex size-9 items-center justify-center rounded-lg border border-border/60 bg-background">
          <PremiumIcon icon={icon} customUrl={customUrl || undefined} sizePx={18} />
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-2 top-2.5 size-3.5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search icons…"
          className="h-9 pl-8 text-sm"
        />
      </div>

      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setCategory("all")}
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-medium",
            category === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          All
        </button>
        {ICON_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] capitalize font-medium",
              category === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid max-h-40 grid-cols-6 gap-1 overflow-y-auto rounded-md border border-border/40 bg-background/60 p-1.5">
        {results.map((item) => (
          <button
            key={item.id}
            type="button"
            title={item.label}
            onClick={() => {
              onChange({ icon: item.id, customUrl: undefined });
              setPasteUrl("");
            }}
            className={cn(
              "flex aspect-square items-center justify-center rounded-md border transition",
              icon === item.id && !customUrl
                ? "border-primary bg-primary/15 text-primary"
                : "border-transparent hover:border-border hover:bg-muted"
            )}
          >
            <PremiumIcon icon={item.id} sizePx={16} />
          </button>
        ))}
      </div>

      <div className="space-y-1.5 border-t border-border/40 pt-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Custom icon
        </p>
        <div className="flex gap-1">
          <Input
            value={pasteUrl}
            onChange={(e) => setPasteUrl(e.target.value)}
            placeholder="Paste image URL or data…"
            className="h-8 font-mono text-[11px]"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 shrink-0 px-2"
            onClick={() => {
              if (!pasteUrl.trim()) return;
              onChange({ icon: undefined, customUrl: pasteUrl.trim() });
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
          {mediaUploadReady ? (
            <span className="self-center text-[10px] text-muted-foreground">
              Or browse media library below
            </span>
          ) : (
            <span className="self-center text-[10px] text-muted-foreground">
              <ImageIcon className="mr-1 inline size-3" />
              Local upload / paste works anytime
            </span>
          )}
          {customUrl ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 text-red-400"
              onClick={() => {
                onChange({ icon: icon || "link", customUrl: undefined });
                setPasteUrl("");
              }}
            >
              <X className="mr-1 size-3.5" />
              Clear custom
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
