import { Check, Layers3, Sparkles } from "lucide-react";
import { BLOCK_LIBRARY_GROUPS } from "@/lib/marketing/landing-content";

export function BlockLibraryShowcase() {
  return (
    <div className="lp-build-board mt-10 overflow-hidden rounded-[2rem] p-4 sm:p-6 lg:p-8">
      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div className="rounded-3xl border border-[rgba(214,168,79,0.24)] bg-black/25 p-5 lg:sticky lg:top-6">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[rgba(214,168,79,0.14)] text-[var(--lp-gold,#d6a84f)]">
            <Layers3 className="size-6" />
          </div>
          <h3 className="mt-5 text-2xl font-semibold tracking-tight text-white">
            Pick blocks, combine journeys, update anytime.
          </h3>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Studio is a flexible campaign builder for Tap Cards, smart display tags, review signs,
            event signs, table tents, and product displays. Start with the blocks that match the
            moment, then change what the tap opens without replacing the physical touchpoint.
          </p>
          <div className="mt-5 grid gap-2 text-sm text-slate-300">
            {["Capture leads", "Route reviews", "Deliver offers", "Show product stories"].map(
              (item) => (
                <div key={item} className="flex items-center gap-2">
                  <Check className="size-4 text-[var(--lp-signal,#72ff8a)]" />
                  <span>{item}</span>
                </div>
              )
            )}
          </div>
        </div>

        <div className="space-y-5">
          {BLOCK_LIBRARY_GROUPS.map((group, groupIndex) => (
            <section
              key={group.title}
              aria-labelledby={`build-group-${groupIndex}`}
              className="rounded-3xl border border-white/10 bg-[#0f172a]/70 p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p
                    id={`build-group-${groupIndex}`}
                    className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--lp-gold,#d6a84f)]"
                  >
                    {group.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {group.items.length} ways to shape the visitor experience
                  </p>
                </div>
                <Sparkles className="size-5 text-[var(--lp-gold,#d6a84f)]" />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {group.items.map((item, itemIndex) => (
                  <span
                    key={item}
                    className="lp-build-chip rounded-full px-3 py-2 text-xs font-medium text-slate-200 sm:text-sm"
                  >
                    <span
                      className="mr-2 inline-block size-1.5 rounded-full align-middle"
                      style={{
                        background:
                          itemIndex % 4 === 0
                            ? "var(--lp-gold,#d6a84f)"
                            : itemIndex % 4 === 1
                              ? "#60a5fa"
                              : itemIndex % 4 === 2
                                ? "var(--lp-signal,#72ff8a)"
                                : "#c4b5fd",
                      }}
                    />
                    {item}
                  </span>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
