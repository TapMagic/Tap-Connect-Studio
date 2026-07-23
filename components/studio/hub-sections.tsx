"use client";

import Link from "next/link";
import { useState } from "react";
import {
  groupSections,
  sectionsForDestination,
} from "@/lib/fusion/studio/ia";
import {
  resolveSectionReadiness,
  type DisplayReadiness,
} from "@/lib/fusion/readiness/display-status";
import { cn } from "@/lib/utils";

function displayClass(d: DisplayReadiness) {
  switch (d) {
    case "owner_ready":
      return "border-primary/50 text-primary";
    case "verified_credentials_required":
      return "border-sky-500/40 text-sky-200";
    case "functional_final_verification_required":
      return "border-emerald-500/35 text-emerald-300";
    case "integrated_incomplete_workflow":
      return "border-amber-500/40 text-amber-200";
    case "blocked":
      return "border-red-500/40 text-red-200";
    case "disabled":
      return "border-white/10 text-white/35";
    default:
      return "border-white/15 text-white/45";
  }
}

export function StudioHubSections({
  destinationId,
  title,
  subtitle,
}: {
  destinationId: string;
  title: string;
  subtitle: string;
}) {
  const sections = sectionsForDestination(destinationId);
  const grouped = groupSections(sections);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      <header className="space-y-2 border-b border-white/8 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          Tap Connect Studio
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">{title}</h1>
        <p className="max-w-2xl text-sm text-white/55">{subtitle}</p>
        <p className="max-w-2xl text-xs text-amber-200/80">
          Readiness badges are derived from verification + dependencies — never static OWNER-READY
          claims. Click a badge for what works, what does not, and the next action.
        </p>
      </header>

      {grouped.map(({ group, items }) => (
        <section key={group} className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/35">
            {group}
          </h2>
          <ul className="divide-y divide-white/6 overflow-hidden rounded-xl border border-white/8 bg-white/[0.02]">
            {items.map((s) => {
              const r = resolveSectionReadiness(s);
              const open = openId === s.id;
              return (
                <li key={s.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <Link href={s.href} className="min-w-0 flex-1 hover:opacity-90">
                      <p className="text-sm font-medium text-white/90">{s.label}</p>
                      <p className="mt-0.5 text-xs text-white/45">{s.description}</p>
                    </Link>
                    <button
                      type="button"
                      className={cn(
                        "shrink-0 rounded-full border px-2 py-0.5 text-left text-[10px] font-medium uppercase tracking-wide",
                        displayClass(r.display)
                      )}
                      aria-expanded={open}
                      onClick={() => setOpenId(open ? null : s.id)}
                      title="Inspect readiness"
                    >
                      {r.label}
                    </button>
                  </div>
                  {open ? (
                    <div className="mt-3 space-y-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/70">
                      <p>
                        <span className="text-white/40">Works: </span>
                        {r.whatWorks}
                      </p>
                      <p>
                        <span className="text-white/40">Does not: </span>
                        {r.whatDoesNot}
                      </p>
                      <p>
                        <span className="text-white/40">Dependencies: </span>
                        {r.missingDependencies.length
                          ? r.missingDependencies.join(", ")
                          : "None recorded"}
                      </p>
                      <p>
                        <span className="text-white/40">Last verified: </span>
                        {r.lastVerifiedAt ?? "Never (no ledger entry)"}
                      </p>
                      <p>
                        <span className="text-white/40">Probes: </span>
                        {r.testsOrProbes}
                      </p>
                      <p>
                        <span className="text-white/40">Next: </span>
                        {r.nextAction}
                      </p>
                      <Link href={s.href} className="inline-block pt-1 text-primary hover:underline">
                        Open workspace →
                      </Link>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
