import Link from "next/link";
import {
  MATURITY_LABEL,
  groupSections,
  sectionsForDestination,
  type StudioMaturity,
} from "@/lib/fusion/studio/ia";
import { cn } from "@/lib/utils";

function maturityClass(m: StudioMaturity) {
  switch (m) {
    case "owner_ready":
      return "border-primary/40 text-primary";
    case "functional":
    case "beta":
      return "border-emerald-500/35 text-emerald-300";
    case "alpha":
      return "border-amber-500/40 text-amber-200";
    case "verified_needs_credentials":
      return "border-sky-500/40 text-sky-200";
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

  return (
    <div className="space-y-8">
      <header className="space-y-2 border-b border-white/8 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          Tap Connect Studio
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">{title}</h1>
        <p className="max-w-2xl text-sm text-white/55">{subtitle}</p>
      </header>

      {grouped.map(({ group, items }) => (
        <section key={group} className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/35">
            {group}
          </h2>
          <ul className="divide-y divide-white/6 overflow-hidden rounded-xl border border-white/8 bg-white/[0.02]">
            {items.map((s) => (
              <li key={s.id}>
                <Link
                  href={s.href}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition hover:bg-white/[0.04]"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white/90">{s.label}</p>
                    <p className="mt-0.5 text-xs text-white/45">{s.description}</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                      maturityClass(s.maturity)
                    )}
                  >
                    {MATURITY_LABEL[s.maturity]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
