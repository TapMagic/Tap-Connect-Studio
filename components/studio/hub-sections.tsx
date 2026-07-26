"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
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
      return "border-white/10 text-white/55";
    default:
      return "border-white/15 text-white/45";
  }
}

/**
 * Pillar / tool catalog. Prefer operational workspace content above this.
 * Use `collapsible` so readiness catalogs do not dominate the first viewport.
 */
export function StudioHubSections({
  destinationId,
  title,
  subtitle,
  headingLevel = 1,
  collapsible = false,
  defaultOpen = true,
  hideHeader = false,
}: {
  destinationId: string;
  title: string;
  subtitle: string;
  /** Use 2 when the page already has a primary h1 (e.g. Home). */
  headingLevel?: 1 | 2;
  /** Progressive disclosure — browse tools on demand */
  collapsible?: boolean;
  defaultOpen?: boolean;
  /** When parent page already provides the workspace header */
  hideHeader?: boolean;
}) {
  const sections = sectionsForDestination(destinationId);
  const grouped = groupSections(sections);
  const [openId, setOpenId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(defaultOpen || !collapsible);
  const HeadingTag = headingLevel === 1 ? "h1" : "h2";

  const catalog = (
    <>
      {grouped.map(({ group, items }) => (
        <section key={group} className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
            {group}
          </h3>
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
                      aria-controls={`readiness-detail-${s.id}`}
                      onClick={() => setOpenId(open ? null : s.id)}
                      title="Inspect readiness"
                    >
                      {r.label}
                    </button>
                  </div>
                  {open ? (
                    <div
                      id={`readiness-detail-${s.id}`}
                      role="region"
                      aria-label={`${s.label} readiness detail`}
                      className="mt-3 space-y-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/70"
                    >
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
    </>
  );

  if (collapsible) {
    return (
      <div className="space-y-3" data-testid="studio-browse-tools">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-left hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-expanded={expanded}
          data-testid="studio-browse-tools-toggle"
          onClick={() => setExpanded((v) => !v)}
        >
          <span>
            <span className="block text-sm font-medium text-white/90">
              Browse all tools
              <span className="ml-2 font-normal text-white/40">({sections.length})</span>
            </span>
            <span className="mt-0.5 block text-xs text-white/45">
              Readiness detail on demand — not the main workspace.
            </span>
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-white/45 transition-transform",
              expanded ? "rotate-180" : null
            )}
            aria-hidden
          />
        </button>
        {expanded ? <div className="space-y-6 pt-2">{catalog}</div> : null}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {!hideHeader ? (
        <header className="space-y-2 border-b border-white/8 pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Tap Connect Studio
          </p>
          <HeadingTag className="text-3xl font-semibold tracking-tight text-white">
            {title}
          </HeadingTag>
          <p className="max-w-2xl text-sm text-white/55">{subtitle}</p>
          <p className="max-w-2xl text-xs text-amber-200/80">
            Readiness badges are derived from verification + dependencies — never static OWNER-READY
            claims. Click a badge for what works, what does not, and the next action.
          </p>
        </header>
      ) : null}
      {catalog}
    </div>
  );
}
