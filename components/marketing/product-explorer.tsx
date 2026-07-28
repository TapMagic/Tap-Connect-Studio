"use client";

import { useId, useMemo, useState, useSyncExternalStore } from "react";
import { TapConnectIcon } from "@/components/fusion/icons/tapconnect-icons";
import type { TapConnectIconId } from "@/lib/fusion/icons/registry";
import {
  EXPLORER_MATURITY_LABEL,
  explorerForSelector,
  getExplorerCapability,
  type ProductExplorerCapability,
} from "@/lib/marketing/product-explorer";
import { trackAssemblyEvent } from "@/lib/fusion/studio-assembly";
import { ZONE_TOKENS } from "@/lib/fusion/studio/zone-tokens";
import type { AssemblyCapabilityId } from "@/lib/fusion/studio-assembly/types";
import { cn } from "@/lib/utils";

const EXPLORER_ICON: Record<string, TapConnectIconId> = {
  brand: "brand",
  tap_points: "tap_points",
  campaigns: "campaigns",
  tapsave: "tapsave",
  audience: "audience",
  email: "email",
  autopilot: "autopilot",
  insights: "insights",
  integrations: "integrations",
  trust_fabric: "trust_fabric",
};

function parseHashCapability(hash: string): AssemblyCapabilityId | null {
  const m = hash.match(/^#explorer-([a-z_]+)/);
  if (!m) return null;
  const id = m[1] as AssemblyCapabilityId;
  return getExplorerCapability(id) ? id : null;
}

function subscribeHash(onChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function getHashSnapshot(): string {
  return typeof window !== "undefined" ? window.location.hash : "";
}

export function ProductExplorer({
  mode = "studio",
  initialCapabilityId,
  className,
}: {
  mode?: "tapconnect" | "studio";
  initialCapabilityId?: AssemblyCapabilityId | null;
  className?: string;
}) {
  const headingId = useId();
  const list = useMemo(() => explorerForSelector(mode), [mode]);
  const hash = useSyncExternalStore(subscribeHash, getHashSnapshot, () => "");
  const hashCapability = parseHashCapability(hash);

  const [manualId, setManualId] = useState<AssemblyCapabilityId | null>(
    () => initialCapabilityId ?? null
  );
  const [featureId, setFeatureId] = useState<string | null>(null);
  const [featureForCap, setFeatureForCap] = useState<AssemblyCapabilityId | null>(null);

  const selectedId: AssemblyCapabilityId | null =
    hashCapability ??
    (manualId && list.some((c) => c.id === manualId) ? manualId : null) ??
    list[0]?.id ??
    null;

  const activeFeatureId = featureForCap === selectedId ? featureId : null;

  const selected: ProductExplorerCapability | undefined = list.find(
    (c) => c.id === selectedId
  );
  const selectedFeature = selected?.features.find((f) => f.id === activeFeatureId);

  function selectCapability(id: AssemblyCapabilityId) {
    setManualId(id);
    setFeatureId(null);
    setFeatureForCap(id);
    trackAssemblyEvent({
      event: "product_explorer_capability_selected",
      capabilityId: id,
    });
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#explorer-${id}`);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
  }

  function selectFeature(id: string) {
    setFeatureId(id);
    setFeatureForCap(selectedId);
    trackAssemblyEvent({
      event: "product_explorer_feature_selected",
      capabilityId: selectedId ?? undefined,
      featureId: id,
    });
  }

  return (
    <section
      id="explorer"
      className={cn("space-y-6", className)}
      data-testid="product-explorer"
      aria-labelledby={headingId}
    >
      <div className="max-w-2xl space-y-2">
        <h2 id={headingId} className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Interactive product explorer
        </h2>
        <p className="text-sm text-white/70">
          Select a capability to see how it supports the Card. One focused explanation at a
          time — not a feature-grid wall.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
        <div
          role="listbox"
          aria-label="Studio capabilities"
          className="tc-surface tc-surface-l2 flex max-h-[28rem] flex-col gap-1 overflow-y-auto p-2 sm:max-h-none"
          data-testid="product-explorer-list"
        >
          {list.map((cap) => {
            const iconId = EXPLORER_ICON[cap.id] ?? "card";
            const active = cap.id === selectedId;
            const zone = ZONE_TOKENS[cap.zone];
            return (
              <button
                key={cap.id}
                type="button"
                role="option"
                aria-selected={active}
                id={`explorer-${cap.id}`}
                data-testid={`explorer-cap-${cap.id}`}
                data-selected={active ? "true" : "false"}
                className={cn(
                  "tc-interactive flex min-h-11 items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-go)]",
                  active
                    ? "bg-white/10 text-white"
                    : "text-white/75 hover:bg-white/5 hover:text-white"
                )}
                onClick={() => selectCapability(cap.id)}
              >
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-white/10"
                  style={{ color: zone.iconAccent }}
                  aria-hidden
                >
                  <TapConnectIcon id={iconId} className="h-4 w-4" decorative />
                </span>
                <span className="min-w-0">
                  <span className="block font-medium">{cap.name}</span>
                  {cap.crossCutting ? (
                    <span className="block text-[11px] text-white/65">Cross-cutting</span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>

        <div
          className="tc-surface tc-surface-l2 p-5 sm:p-6"
          data-testid="product-explorer-detail"
          data-selected={selectedId ?? undefined}
          aria-live="polite"
        >
          {selected ? (
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/65">
                  {ZONE_TOKENS[selected.zone].label} ·{" "}
                  {EXPLORER_MATURITY_LABEL[selected.maturity]}
                </p>
                <h3 className="mt-1 text-xl font-semibold text-white">{selected.name}</h3>
                <p className="mt-2 text-sm text-white/70">{selected.shortDescription}</p>
              </div>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium text-white/90">Card relationship: </span>
                  <span className="text-white/65">{selected.cardRelationship}</span>
                </p>
                <p>
                  <span className="font-medium text-white/90">Why it matters: </span>
                  <span className="text-white/65">{selected.customerValue}</span>
                </p>
                <p className="text-xs text-white/65">
                  Plan availability placeholder: {selected.planAvailability.replaceAll("_", " ")} —
                  not entitlement enforcement.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-white/90">Features</h4>
                <ul className="mt-2 space-y-1" role="list">
                  {selected.features.map((f) => {
                    const on = f.id === activeFeatureId;
                    return (
                      <li key={f.id}>
                        <button
                          type="button"
                          data-testid={`explorer-feature-${f.id}`}
                          className={cn(
                            "flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border px-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-go)]",
                            on
                              ? "border-white/25 bg-white/10 text-white"
                              : "border-white/10 text-white/70 hover:bg-white/5"
                          )}
                          aria-pressed={on}
                          onClick={() => selectFeature(f.id)}
                        >
                          <span>{f.name}</span>
                          <span className="shrink-0 text-[11px] text-white/65">
                            {EXPLORER_MATURITY_LABEL[f.maturity]}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {selectedFeature ? (
                <div
                  className="rounded-lg border border-white/10 bg-black/20 p-4"
                  data-testid="product-explorer-feature-detail"
                >
                  <h5 className="text-sm font-medium text-white">{selectedFeature.name}</h5>
                  <p className="mt-1 text-sm text-white/65">{selectedFeature.description}</p>
                </div>
              ) : (
                <p className="text-xs text-white/65">
                  Select a feature for a focused explanation.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-white/55">No capabilities in this mode.</p>
          )}
        </div>
      </div>
    </section>
  );
}
