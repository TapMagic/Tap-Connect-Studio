"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { humanizeError, type HumanError } from "@/lib/fusion/errors/humanize";
import { cn } from "@/lib/utils";

/**
 * Host-facing error: plain title + optional action + collapsed technical details.
 */
export function ErrorMessage({
  error,
  className,
  testId = "host-error",
}: {
  error: unknown;
  className?: string;
  testId?: string;
}) {
  const human: HumanError =
    error && typeof error === "object" && "title" in error
      ? (error as HumanError)
      : humanizeError(error);
  const detailsId = useId();
  const [open, setOpen] = useState(false);

  return (
    <div
      role="alert"
      data-testid={testId}
      className={cn(
        "rounded-lg border border-amber-500/35 bg-amber-500/[0.07] px-3 py-2 text-sm text-amber-50",
        className
      )}
    >
      <p className="font-medium">{human.title}</p>
      {human.action ? (
        <p className="mt-1 text-xs text-amber-100/75">{human.action}</p>
      ) : null}
      {human.details ? (
        <div className="mt-2">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-100/80 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-expanded={open}
            aria-controls={detailsId}
            data-testid={`${testId}-view-details`}
            onClick={() => setOpen((v) => !v)}
          >
            View details
            <ChevronDown
              className={cn("h-3 w-3 transition-transform", open ? "rotate-180" : null)}
              aria-hidden
            />
          </button>
          {open ? (
            <pre
              id={detailsId}
              className="mt-2 max-h-40 overflow-auto rounded-md border border-white/10 bg-black/40 p-2 font-mono text-[10px] leading-relaxed text-white/55"
              data-testid={`${testId}-details`}
            >
              {human.details}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
