"use client";

import { TapConnectIcon } from "@/components/fusion/icons/tapconnect-icons";
import { ZONE_TOKENS, type StudioZoneId } from "@/lib/fusion/studio/zone-tokens";
import type { TapConnectIconId } from "@/lib/fusion/icons/registry";
import { cn } from "@/lib/utils";

type MapNode = {
  id: TapConnectIconId;
  label: string;
  zone: StudioZoneId;
  crossCutting?: boolean;
  underlay?: boolean;
  angle: number;
  radius: number;
};

const NODES: MapNode[] = [
  { id: "brand", label: "Brand Kit", zone: "brand", angle: -70, radius: 38 },
  { id: "tap_points", label: "Tap Points", zone: "tap_points", angle: -25, radius: 40 },
  { id: "campaigns", label: "Campaigns", zone: "campaign", angle: 20, radius: 39 },
  { id: "tapsave", label: "TapSave", zone: "card", angle: 60, radius: 36 },
  { id: "audience", label: "Audience", zone: "audience", angle: 105, radius: 40 },
  { id: "email", label: "Email", zone: "email", angle: 145, radius: 39 },
  { id: "autopilot", label: "Autopilot", zone: "autopilot", angle: 180, radius: 37 },
  { id: "insights", label: "Insights", zone: "insights", angle: -115, radius: 39 },
  {
    id: "integrations",
    label: "Integrations",
    zone: "integrations",
    angle: -155,
    radius: 46,
    crossCutting: true,
  },
];

export function StaticPlatformMap({
  mode = "studio",
  className,
  onSelect,
}: {
  mode?: "tapconnect" | "studio";
  className?: string;
  onSelect?: (id: TapConnectIconId) => void;
}) {
  const visible =
    mode === "tapconnect"
      ? NODES.filter((n) =>
          ["brand", "tap_points", "campaigns", "tapsave"].includes(n.id)
        )
      : NODES;

  return (
    <figure
      className={cn("relative w-full", className)}
      data-testid="static-platform-map"
      data-mode={mode}
      aria-labelledby="platform-map-caption"
    >
      <figcaption id="platform-map-caption" className="sr-only">
        Static Card-centered platform map. The Card is central and larger. Capabilities use
        TapConnect icons and zone colors. Integrations extend outward. Trust Fabric sits beneath.
      </figcaption>

      <div className="relative mx-auto aspect-square w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-[oklch(0.12_0.02_260)]">
        {/* Trust Fabric underlay */}
        <div
          className="absolute inset-[10%] rounded-[2rem] border border-dashed border-white/15 opacity-80"
          data-testid="map-trust-underlay"
          aria-hidden
        >
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-white/55">
            <TapConnectIcon id="trust_fabric" className="h-3.5 w-3.5" decorative />
            Trust Fabric
          </div>
        </div>

        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label="Signal paths from the Card to Studio capabilities"
        >
          <title>Card-centered capability paths</title>
          {visible.map((n) => {
            const rad = (n.angle * Math.PI) / 180;
            const x = 50 + Math.cos(rad) * n.radius;
            const y = 50 + Math.sin(rad) * n.radius;
            const accent = ZONE_TOKENS[n.zone].iconAccent;
            return (
              <line
                key={n.id}
                x1={50}
                y1={50}
                x2={x}
                y2={y}
                stroke={accent}
                strokeOpacity={0.35}
                strokeWidth={0.35}
              />
            );
          })}
        </svg>

        {/* Central Card — visibly larger */}
        <div className="absolute left-1/2 top-1/2 z-20 w-[34%] max-w-[11rem] -translate-x-1/2 -translate-y-1/2">
          <div
            className="zone-card rounded-2xl border border-white/25 bg-gradient-to-b from-white/12 to-black/40 p-3 shadow-[0_0_40px_oklch(0.78_0.05_95_/_0.25)]"
            data-testid="map-central-card"
          >
            <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl border border-white/20 bg-black/30 text-[oklch(0.86_0.05_95)]">
              <TapConnectIcon id="card" className="h-7 w-7" title="Card" />
            </div>
            <p className="text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
              The Card
            </p>
            <p className="mt-1 text-center text-xs font-semibold text-white">TapConnect</p>
          </div>
        </div>

        {visible.map((n) => {
          const rad = (n.angle * Math.PI) / 180;
          const left = 50 + Math.cos(rad) * n.radius;
          const top = 50 + Math.sin(rad) * n.radius;
          const accent = ZONE_TOKENS[n.zone].iconAccent;
          const size = n.crossCutting ? "h-10 w-10" : "h-11 w-11";
          return (
            <button
              key={n.id}
              type="button"
              data-testid={`map-node-${n.id}`}
              className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-go)]"
              style={{ left: `${left}%`, top: `${top}%` }}
              onClick={() => onSelect?.(n.id)}
              aria-label={`${n.label}. Opens product explanation.`}
            >
              <span
                className={cn(
                  "grid place-items-center rounded-xl border bg-black/45",
                  size,
                  n.crossCutting ? "border-dashed" : "border-solid"
                )}
                style={{ borderColor: `${accent}99`, color: accent }}
              >
                <TapConnectIcon id={n.id} className="h-5 w-5" decorative />
              </span>
              <span className="max-w-[4.5rem] text-center text-[10px] leading-tight text-white/80">
                {n.label}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-center text-xs text-white/60">
        One Card. Studio capabilities assemble around it. Integrations extend outward. Trust Fabric
        supports beneath.
      </p>
    </figure>
  );
}
