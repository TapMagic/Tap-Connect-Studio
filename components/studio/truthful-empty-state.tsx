import Link from "next/link";
import { cn } from "@/lib/utils";
import type { TruthfulEmptyState } from "@/lib/fusion/studio/empty-states";

/**
 * Truthful empty state — missing / why / normal / one useful action.
 * Does not invent demo activity.
 */
export function TruthfulEmptyStatePanel({
  state,
  className,
  testId,
}: {
  state: TruthfulEmptyState;
  className?: string;
  testId?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-5 py-8 text-center",
        className
      )}
      data-testid={testId ?? state.id}
      role="status"
    >
      <h3 className="text-base font-semibold text-white/90">{state.title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-white/60">{state.whatMissing}</p>
      <p className="mx-auto mt-1 max-w-md text-xs text-white/45">{state.whyEmpty}</p>
      <p className="mx-auto mt-2 max-w-md text-xs text-white/40">
        {state.isNormal ? state.normalNote : "This usually indicates a setup or data issue."}
      </p>
      {state.evidenceNote ? (
        <p className="mx-auto mt-2 max-w-md text-[11px] text-white/35">{state.evidenceNote}</p>
      ) : null}
      <Link
        href={state.actionHref}
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        data-testid={`${state.id}-action`}
      >
        {state.actionLabel}
      </Link>
    </div>
  );
}
