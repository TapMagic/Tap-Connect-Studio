/** Premium Tap Device Manager UI mock for landing */

const STATUSES = [
  { label: "Active", tone: "live" as const },
  { label: "Unassigned", tone: "muted" as const },
  { label: "Lost", tone: "warn" as const },
  { label: "Replaced", tone: "blue" as const },
  { label: "Closed", tone: "muted" as const },
];

const HISTORY = [
  { when: "Today · 2:14 PM", what: "Assigned · VIP Denim 15%", who: "Remote scan" },
  { when: "Mon · 9:02 AM", what: "Scheduled · New Arrivals", who: "Workbench" },
  { when: "Last week", what: "Archived · Spring Soft Launch", who: "Owner" },
];

export function DeviceManagerShowcase() {
  return (
    <div className="lp-card-gold relative overflow-hidden rounded-3xl bg-[#0b1020] p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-[rgba(114,255,138,0.08)] blur-2xl" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Tap Device Profile
          </p>
          <h3 className="mt-1 text-lg font-semibold text-white">Front Counter · Display #12</h3>
          <p className="mt-1 font-mono text-[11px] text-slate-400">tc.dev / counter-12</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-[rgba(114,255,138,0.35)] bg-[rgba(114,255,138,0.1)] px-2.5 py-1">
          <span className="lp-live-dot" />
          <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--lp-signal,#72ff8a)]">
            Active
          </span>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Current assignment
        </p>
        <p className="mt-1 text-sm font-semibold text-[var(--lp-gold-bright,#f3c96b)]">
          Weekly Store Promotions · VIP Denim
        </p>
        <p className="mt-1 text-xs text-slate-400">Wed–Thu window · campaign group rotation</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {STATUSES.map((s) => (
          <span
            key={s.label}
            className={
              s.tone === "live"
                ? "rounded-full border border-[rgba(114,255,138,0.4)] bg-[rgba(114,255,138,0.12)] px-2 py-0.5 text-[10px] font-semibold text-[var(--lp-signal,#72ff8a)]"
                : s.tone === "warn"
                  ? "rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200"
                  : s.tone === "blue"
                    ? "rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-200"
                    : "rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-400"
            }
          >
            {s.label}
          </span>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          { k: "Taps · 7d", v: "148" },
          { k: "Leads", v: "23" },
          { k: "Claims", v: "11" },
        ].map((m) => (
          <div
            key={m.k}
            className="rounded-xl border border-[rgba(59,130,246,0.25)] bg-[rgba(59,130,246,0.06)] px-3 py-2.5 text-center"
          >
            <p className="text-lg font-semibold text-white">{m.v}</p>
            <p className="text-[10px] text-slate-400">{m.k}</p>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Assignment history
        </p>
        <ul className="mt-2 space-y-2">
          {HISTORY.map((h) => (
            <li
              key={h.when + h.what}
              className="flex items-start justify-between gap-3 border-b border-white/[0.06] pb-2 last:border-0"
            >
              <div>
                <p className="text-xs font-medium text-slate-200">{h.what}</p>
                <p className="text-[10px] text-slate-500">{h.who}</p>
              </div>
              <p className="shrink-0 text-[10px] text-slate-500">{h.when}</p>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 text-[10px] text-slate-500">
        Stable device identity · dashboard controls what the tap opens
      </p>
    </div>
  );
}
