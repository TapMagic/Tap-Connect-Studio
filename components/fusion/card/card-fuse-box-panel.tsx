"use client";

import Link from "next/link";
import {
  FUSE_BOX_STATUS_LABEL,
  type FuseBoxConnection,
  type FuseBoxStatus,
} from "@/lib/fusion/card/fuse-box";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<FuseBoxStatus, string> = {
  connected: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  partially_connected: "border-amber-500/40 bg-amber-500/10 text-amber-100",
  available_to_configure: "border-sky-500/35 bg-sky-500/10 text-sky-100",
  requires_provider: "border-violet-500/35 bg-violet-500/10 text-violet-100",
  requires_consent: "border-orange-500/35 bg-orange-500/10 text-orange-100",
  not_yet_available: "border-white/15 bg-white/5 text-white/55",
};

/**
 * Assembled Card fuse-box — honest connection states only.
 */
export function CardFuseBoxPanel({
  connections,
  className,
}: {
  connections: FuseBoxConnection[];
  className?: string;
}) {
  return (
    <section
      className={cn("space-y-3", className)}
      data-testid="card-fuse-box"
      aria-label="Card fuse-box connections"
    >
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
          Advanced · connections
        </p>
        <h2 className="text-sm font-semibold text-white">How this Card wires into the platform</h2>
        <p className="mt-1 text-xs text-white/55">
          Status overview for operators — not the Card editor. Connected means a real Card wire
          exists (a route or mock alone is not enough).
        </p>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {connections.map((c) => (
          <li
            key={c.id}
            className="rounded-lg border border-white/10 bg-[#080d18] p-3"
            data-testid={`fuse-box-${c.id}`}
            data-status={c.status}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{c.label}</p>
                <p className="text-[10px] uppercase tracking-wide text-white/40">{c.pillar}</p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                  STATUS_CLASS[c.status]
                )}
              >
                {FUSE_BOX_STATUS_LABEL[c.status]}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-white/65">{c.summary}</p>
            {c.readiness ? (
              <p className="mt-1 text-[11px] text-white/40">{c.readiness}</p>
            ) : null}
            {c.whereUsed ? (
              <p className="mt-1 text-[11px] text-white/40">Where used: {c.whereUsed}</p>
            ) : null}
            {c.lastUpdate ? (
              <p className="mt-1 text-[11px] text-white/35">
                Updated {new Date(c.lastUpdate).toLocaleString()}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {c.primaryHref && c.primaryAction ? (
                <Link
                  href={c.primaryHref}
                  className="rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary"
                >
                  {c.primaryAction}
                </Link>
              ) : null}
              {c.canEdit && c.primaryHref ? (
                <Link href={c.primaryHref} className="text-[11px] text-white/50 hover:text-white">
                  Edit
                </Link>
              ) : null}
              {c.canPreview && c.primaryHref ? (
                <Link href={c.primaryHref} className="text-[11px] text-white/50 hover:text-white">
                  Preview
                </Link>
              ) : null}
              {c.canTest ? (
                <span className="text-[11px] text-white/35">Test via public Card</span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
