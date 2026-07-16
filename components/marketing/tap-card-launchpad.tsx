/** Tap Card as central launchpad — profile, campaign, collector, offer, email, CSV */

const RAYS = [
  { label: "Profile", angle: -90, color: "#d6a84f" },
  { label: "Campaign", angle: -30, color: "#3b82f6" },
  { label: "Contact Collector", angle: 30, color: "#72ff8a" },
  { label: "Special Offer", angle: 90, color: "#a78bfa" },
  { label: "Branded Follow-Up", angle: 150, color: "#38bdf8" },
  { label: "CSV Export", angle: -150, color: "#f3c96b" },
] as const;

function polar(angleDeg: number, radius: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: 50 + radius * Math.cos(rad), y: 50 + radius * Math.sin(rad) };
}

export function TapCardLaunchpadGraphic() {
  return (
    <div className="lp-card-gold relative mx-auto aspect-square w-full max-w-[420px] overflow-hidden rounded-3xl bg-[#0b1020] p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(214,168,79,0.12),transparent_55%)]" />

      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
        <circle
          cx="50"
          cy="50"
          r="28"
          fill="none"
          stroke="rgba(114,255,138,0.25)"
          strokeWidth="0.4"
          strokeDasharray="1.5 2"
        />
        <circle
          cx="50"
          cy="50"
          r="36"
          fill="none"
          stroke="rgba(59,130,246,0.2)"
          strokeWidth="0.35"
        />
        {RAYS.map((r) => {
          const end = polar(r.angle, 36);
          return (
            <line
              key={r.label}
              x1="50"
              y1="50"
              x2={end.x}
              y2={end.y}
              stroke={r.color}
              strokeOpacity="0.45"
              strokeWidth="0.5"
            />
          );
        })}
      </svg>

      {/* Orbit nodes */}
      {RAYS.map((r) => {
        const p = polar(r.angle, 38);
        return (
          <div
            key={r.label}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/15 bg-[#111827]/95 px-2 py-1.5 text-center shadow-lg backdrop-blur"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              boxShadow: `0 0 16px ${r.color}33`,
              borderColor: `${r.color}55`,
            }}
          >
            <p className="max-w-[5.5rem] text-[9px] font-semibold leading-tight text-white sm:text-[10px]">
              {r.label}
            </p>
          </div>
        );
      })}

      {/* Center card */}
      <div className="absolute left-1/2 top-1/2 z-20 w-[42%] max-w-[140px] -translate-x-1/2 -translate-y-1/2">
        <div className="relative">
          <div className="absolute inset-[-18%] rounded-full border border-[rgba(114,255,138,0.35)] opacity-70" />
          <div className="absolute inset-[-8%] animate-pulse rounded-full border border-[rgba(214,168,79,0.35)]" />
          <div className="rounded-2xl border border-[rgba(214,168,79,0.5)] bg-gradient-to-b from-[#1e293b] to-[#0b0f19] p-3 shadow-[0_0_28px_rgba(214,168,79,0.25)]">
            <div className="mx-auto mb-2 h-1 w-8 rounded-full bg-white/20" />
            <p className="text-center text-[10px] font-bold uppercase tracking-wider text-[var(--lp-gold,#d6a84f)]">
              Tap Card
            </p>
            <p className="mt-1 text-center text-[9px] text-slate-400">Launchpad</p>
            <div className="mt-2 rounded-full bg-[var(--lp-gold,#d6a84f)] py-1 text-center text-[8px] font-bold text-[#0b0f19]">
              One tap
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
