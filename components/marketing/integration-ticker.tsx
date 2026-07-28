"use client";

import { useId, useState, type CSSProperties } from "react";
import {
  INTEGRATION_TICKER_ITEMS,
  MATURITY_TICKER_LABEL,
  type IntegrationTickerItem,
} from "@/lib/marketing/landing-integrations-ticker";
import { ZONE_TOKENS } from "@/lib/fusion/studio/zone-tokens";
import { cn } from "@/lib/utils";

export function IntegrationTicker({ className }: { className?: string }) {
  const labelId = useId();
  const [selected, setSelected] = useState<IntegrationTickerItem | null>(
    INTEGRATION_TICKER_ITEMS[0] ?? null
  );
  const zone = ZONE_TOKENS.integrations;
  const loop = [...INTEGRATION_TICKER_ITEMS, ...INTEGRATION_TICKER_ITEMS];

  return (
    <div
      className={cn("space-y-4", className)}
      data-testid="integration-ticker"
    >
      <div
        className="tc-surface tc-surface-l2 p-4"
        style={
          {
            "--tc-edge": zone.neonEdge,
            "--tc-bloom": zone.bloom,
          } as CSSProperties
        }
        data-zone="integrations"
      >
        <p id={labelId} className="sr-only">
          Integration categories. Use the list to inspect maturity and data flow.
        </p>
        <div className="tc-ticker" aria-labelledby={labelId}>
          <div className="tc-ticker-track" data-testid="integration-ticker-track">
            {loop.map((item, i) => {
              const duplicate = i >= INTEGRATION_TICKER_ITEMS.length;
              return (
                <button
                  key={`${item.id}-${i}`}
                  type="button"
                  tabIndex={duplicate ? -1 : 0}
                  aria-hidden={duplicate ? true : undefined}
                  data-testid={duplicate ? undefined : `ticker-item-${item.id}`}
                  data-selected={selected?.id === item.id ? "true" : "false"}
                  className={cn(
                    "tc-interactive inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm",
                    selected?.id === item.id
                      ? "border-white/35 bg-white/10 text-white"
                      : "border-white/15 bg-black/30 text-white/80"
                  )}
                  onClick={() => setSelected(item)}
                >
                  <span className="font-medium tracking-tight">{item.label}</span>
                  <span className="text-[10px] uppercase tracking-wide text-white/55">
                    {item.category}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SR / reduced-motion semantic list (no duplicates) */}
        <ul className="sr-only" data-testid="integration-ticker-sr-list">
          {INTEGRATION_TICKER_ITEMS.map((item) => (
            <li key={item.id}>
              {item.label} — {MATURITY_TICKER_LABEL[item.maturity]}. {item.whatTapSends}
            </li>
          ))}
        </ul>
      </div>

      {selected ? (
        <div
          className="tc-surface tc-surface-l2 space-y-2 p-4"
          data-testid="integration-ticker-panel"
          style={
            {
              "--tc-edge": zone.neonEdge,
              "--tc-bloom": zone.bloom,
            } as CSSProperties
          }
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">{selected.label}</h3>
            <span
              className="rounded-md border border-white/20 px-2 py-0.5 text-[11px] text-white/75"
              data-testid="ticker-maturity"
            >
              {MATURITY_TICKER_LABEL[selected.maturity]}
            </span>
          </div>
          <p className="text-sm text-white/70">
            <span className="font-medium text-white">Tap sends: </span>
            {selected.whatTapSends}
          </p>
          <p className="text-sm text-white/70">
            <span className="font-medium text-white">External returns: </span>
            {selected.whatReturns}
          </p>
          <p className="text-sm text-white/70">
            <span className="font-medium text-white">Direction: </span>
            {selected.direction}
          </p>
          <p className="text-sm text-white/70">
            <span className="font-medium text-white">Tap knows afterward: </span>
            {selected.whatTapKnows}
          </p>
          <p className="text-xs text-white/55">
            Presence in this ribbon does not imply production readiness.
          </p>
        </div>
      ) : null}
    </div>
  );
}
