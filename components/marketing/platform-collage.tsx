/** In-code platform collage — Build here. Deploy there. Track results everywhere. */

export function PlatformCollageGraphic({ className = "" }: { className?: string }) {
  return (
    <div className={`lp-collage ${className}`}>
      {/* Soft connecting arcs */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-40"
        viewBox="0 0 800 480"
        fill="none"
        aria-hidden
      >
        <path
          d="M400 240 C280 180, 200 140, 140 120"
          stroke="rgba(214,168,79,0.45)"
          strokeWidth="1.5"
          strokeDasharray="4 6"
        />
        <path
          d="M400 240 C520 180, 600 140, 660 110"
          stroke="rgba(59,130,246,0.5)"
          strokeWidth="1.5"
          strokeDasharray="4 6"
        />
        <path
          d="M400 240 C300 300, 220 340, 160 380"
          stroke="rgba(114,255,138,0.35)"
          strokeWidth="1.5"
          strokeDasharray="4 6"
        />
        <path
          d="M400 240 C500 310, 580 350, 640 390"
          stroke="rgba(214,168,79,0.35)"
          strokeWidth="1.5"
          strokeDasharray="4 6"
        />
      </svg>

      {/* Central phone */}
      <div className="absolute left-1/2 top-1/2 z-10 w-[148px] -translate-x-1/2 -translate-y-1/2 sm:w-[168px]">
        <div className="relative mx-auto">
          <div className="absolute left-1/2 top-1/2 size-36 -translate-x-1/2 -translate-y-1/2 sm:size-44">
            <span className="lp-signal-ring" />
            <span className="lp-signal-ring" />
          </div>
          <div className="relative rounded-[1.35rem] border border-white/20 bg-gradient-to-b from-[#1e293b] to-[#0b0f19] p-2.5 shadow-[0_0_40px_rgba(214,168,79,0.2)]">
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/20" />
            <div className="rounded-xl bg-[#0b0f19] px-2.5 py-3 text-center">
              <div className="mb-1.5 flex items-center justify-center gap-1.5">
                <span className="lp-live-dot" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--lp-signal,#72ff8a)]">
                  Live campaign
                </span>
              </div>
              <p className="text-[11px] font-semibold text-white">VIP Denim · 15% Off</p>
              <p className="mt-1 text-[9px] text-slate-400">Wed–Thu · auto-rotated</p>
              <div className="mt-3 rounded-full bg-[var(--lp-gold,#d6a84f)] py-1.5 text-[9px] font-bold text-[#0b0f19]">
                Unlock offer
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating panels — software */}
      <div
        className="lp-collage-float left-[4%] top-[12%] border-[rgba(214,168,79,0.35)] sm:left-[8%] sm:top-[14%]"
        style={{ animationDelay: "0s" }}
      >
        Workbench
        <span>Draft · design · assign later</span>
      </div>
      <div
        className="lp-collage-float right-[4%] top-[10%] border-[rgba(59,130,246,0.4)] sm:right-[8%] sm:top-[12%]"
        style={{ animationDelay: "0.6s" }}
      >
        Campaign Group
        <span>Day / time rotation</span>
      </div>
      <div
        className="lp-collage-float left-[3%] top-[42%] border-[rgba(59,130,246,0.35)] sm:left-[6%]"
        style={{ animationDelay: "1.1s" }}
      >
        Tap Device Profile
        <span>Stable link · history</span>
      </div>
      <div
        className="lp-collage-float right-[3%] top-[40%] border-[rgba(214,168,79,0.3)] sm:right-[6%]"
        style={{ animationDelay: "1.4s" }}
      >
        Contact Collector
        <span>Lead + branded email</span>
      </div>
      <div
        className="lp-collage-float bottom-[18%] left-[10%] border-[rgba(59,130,246,0.35)] sm:bottom-[16%] sm:left-[14%]"
        style={{ animationDelay: "0.3s" }}
      >
        Analytics
        <span>Taps · leads · claims</span>
      </div>
      <div
        className="lp-collage-float bottom-[16%] right-[8%] border-[rgba(214,168,79,0.35)] sm:bottom-[14%] sm:right-[12%]"
        style={{ animationDelay: "0.9s" }}
      >
        Brand Library
        <span>Photos · logos · icons</span>
      </div>

      {/* Physical touchpoints */}
      <div className="absolute bottom-3 left-0 right-0 flex flex-wrap justify-center gap-2 px-3 sm:bottom-4">
        {["Tap Card", "Smart Display Tag", "Product Display", "Table Sign"].map((label) => (
          <span
            key={label}
            className="rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] font-medium text-slate-300 backdrop-blur"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
