"use client";

import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const PRESETS = [
  "#f8fafc",
  "#0b0f19",
  "#d6a84f",
  "#72ff8a",
  "#38bdf8",
  "#f472b6",
  "#fb7185",
  "#a78bfa",
];

export function ColorSwatchPicker({
  value,
  onChange,
  defaultColor = "#f8fafc",
  title = "Color",
  className,
}: {
  value?: string;
  onChange: (color: string | undefined) => void;
  defaultColor?: string;
  title?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<Element | null>(null);
  const panelId = useId();
  const current = value?.trim() || defaultColor;

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement;
    const triggerEl = triggerRef.current;
    const t = window.setTimeout(() => closeRef.current?.focus(), 0);
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      const restore =
        openerRef.current instanceof HTMLElement
          ? openerRef.current
          : triggerEl;
      restore?.focus();
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative shrink-0", className)}>
      <button
        ref={triggerRef}
        type="button"
        title={title}
        aria-label={title}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "h-9 w-9 rounded-md border border-border/70 shadow-sm transition",
          "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          open && "ring-2 ring-ring"
        )}
        style={{ backgroundColor: current }}
      />

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={title}
          className="absolute right-0 z-40 mt-1.5 w-52 rounded-xl border border-border/60 bg-popover p-3 shadow-lg"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {title}
            </p>
            <button
              ref={closeRef}
              type="button"
              className="rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setOpen(false)}
              aria-label="Close color picker"
              data-testid="color-swatch-close"
            >
              <span className="inline-flex items-center gap-0.5">
                <X className="h-3.5 w-3.5" />
                Done
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label={`${title} picker`}
              value={/^#[0-9a-fA-F]{6}$/.test(current) ? current : defaultColor}
              onChange={(e) => onChange(e.target.value)}
              className="h-9 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
            />
            <Input
              value={value ?? ""}
              onChange={(e) => onChange(e.target.value || undefined)}
              className="h-9 font-mono text-xs"
              placeholder={defaultColor}
            />
          </div>

          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {PRESETS.map((hex) => (
              <button
                key={hex}
                type="button"
                title={hex}
                className={cn(
                  "h-7 w-full rounded-md border border-border/50",
                  value === hex && "ring-2 ring-ring ring-offset-1 ring-offset-popover"
                )}
                style={{ backgroundColor: hex }}
                onClick={() => onChange(hex)}
              />
            ))}
          </div>

          {value ? (
            <button
              type="button"
              className="mt-2 w-full rounded-md px-2 py-1.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => onChange(undefined)}
            >
              Clear — use default
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
