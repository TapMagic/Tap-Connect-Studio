"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import type { CampaignWhereUsedHit } from "@/lib/fusion/studio/where-used";

export function WhereUsedPanel({
  title = "Where used",
  emptyLabel = "Not assigned to any Tap Points or groups yet.",
  hits,
  testId = "where-used-panel",
}: {
  title?: string;
  emptyLabel?: string;
  hits: CampaignWhereUsedHit[];
  testId?: string;
}) {
  return (
    <section
      className="space-y-2 rounded-xl border border-border/60 bg-card/30 p-4"
      data-testid={testId}
      aria-label={title}
    >
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary" aria-hidden />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {hits.length === 0 ? (
        <p className="text-xs text-muted-foreground" data-testid={`${testId}-empty`}>
          {emptyLabel}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {hits.map((h) => (
            <li key={`${h.kind}-${h.id}`}>
              <Link
                href={h.href}
                className="flex flex-col rounded-lg border border-border/40 px-3 py-2 text-left hover:border-primary/40 hover:bg-primary/5"
              >
                <span className="text-sm text-foreground">{h.label}</span>
                <span className="text-[11px] text-muted-foreground">
                  {h.kind.replace(/_/g, " ")}
                  {h.detail ? ` · ${h.detail}` : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
