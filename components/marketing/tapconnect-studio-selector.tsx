"use client";

import { useState } from "react";
import { trackAssemblyEvent } from "@/lib/fusion/studio-assembly";
import { PRODUCT_PATHS } from "@/lib/marketing/landing-card-centered";
import { cn } from "@/lib/utils";

export type ProductSelectorMode = "tapconnect" | "studio";

export function TapConnectStudioSelector({
  value,
  onChange,
  className,
}: {
  value: ProductSelectorMode;
  onChange: (mode: ProductSelectorMode) => void;
  className?: string;
}) {
  return (
    <section
      id="product-paths"
      className={cn("space-y-5", className)}
      data-testid="tapconnect-studio-selector"
      aria-labelledby="product-paths-heading"
    >
      <div className="max-w-2xl space-y-2">
        <h2
          id="product-paths-heading"
          className="text-2xl font-semibold tracking-tight text-white sm:text-3xl"
        >
          TapConnect and TapConnect Studio
        </h2>
        <p className="text-sm text-white/65">
          The Card remains the same relationship hub. Studio adds operating capabilities.
          Studio feature availability varies by plan. No customer must rebuild the Card when
          upgrading.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Product path"
        className="inline-flex min-h-11 rounded-xl border border-white/15 bg-white/[0.03] p-1"
      >
        {(["tapconnect", "studio"] as const).map((mode) => {
          const selected = value === mode;
          return (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={selected}
              id={`selector-${mode}`}
              data-testid={`selector-${mode}`}
              className={cn(
                "min-h-11 rounded-lg px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-go)]",
                selected
                  ? "bg-white/12 text-white"
                  : "text-white/60 hover:text-white"
              )}
              onClick={() => {
                onChange(mode);
                trackAssemblyEvent({
                  event: "tapconnect_studio_selector_changed",
                  selector: mode,
                });
              }}
            >
              {mode === "tapconnect" ? "TapConnect" : "TapConnect Studio"}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        aria-labelledby={`selector-${value}`}
        className="rounded-xl border border-white/10 bg-white/[0.03] p-5"
        data-testid="selector-panel"
        data-mode={value}
      >
        <h3 className="text-lg font-semibold text-white">{PRODUCT_PATHS[value].title}</h3>
        <p className="mt-2 text-sm text-white/65">{PRODUCT_PATHS[value].body}</p>
        <ul className="mt-4 space-y-2 text-sm text-white/70">
          {PRODUCT_PATHS[value].bullets.map((b) => (
            <li key={b} className="flex gap-2">
              <span className="text-[var(--studio-go)]" aria-hidden>
                ·
              </span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Controlled wrapper used by landing page client shell. */
export function useProductSelector(initial: ProductSelectorMode = "studio") {
  return useState<ProductSelectorMode>(initial);
}
