"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { Check, Minus, ChevronDown } from "lucide-react";
import {
  FEATURE_COMPARISON,
  type CompareValue,
  type PricingTierId,
} from "@/lib/marketing/landing-content";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PLANS: { id: PricingTierId; label: string; price: string }[] = [
  { id: "basic", label: "Basic", price: "$19" },
  { id: "studio", label: "Studio", price: "$49" },
  { id: "pro", label: "Pro", price: "$99" },
  { id: "growth", label: "Growth", price: "$199" },
  { id: "enterprise", label: "Enterprise", price: "Custom" },
];

function Cell({ value }: { value: CompareValue }) {
  if (value === true) {
    return (
      <span className="inline-flex size-6 items-center justify-center rounded-full bg-[rgba(214,168,79,0.15)] text-[var(--lp-gold,#d6a84f)]">
        <Check className="size-3.5" strokeWidth={3} />
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex size-6 items-center justify-center text-slate-600">
        <Minus className="size-3.5" />
      </span>
    );
  }
  const soft =
    value === "Coming soon" ||
    value === "Add-on" ||
    value === "Sold separately" ||
    value === "Included path";
  return (
    <span
      className={cn(
        "text-xs font-medium",
        soft ? "text-slate-400" : "text-slate-200"
      )}
    >
      {value}
    </span>
  );
}

export function FeatureComparisonChart() {
  const [openGroup, setOpenGroup] = useState<string | null>(FEATURE_COMPARISON[0]?.title ?? null);
  const [mobilePlan, setMobilePlan] = useState<PricingTierId>("pro");

  return (
    <div className="space-y-6">
      {/* Desktop table */}
      <div className="lp-compare-sticky hidden overflow-x-auto rounded-2xl border border-white/8 lg:block">
        <table className="w-full min-w-[920px] border-collapse text-left text-sm">
          <thead>
            <tr>
              <th className="w-[28%] px-4 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Feature
              </th>
              {PLANS.map((p) => (
                <th
                  key={p.id}
                  className={cn(
                    "px-3 py-4 text-center",
                    p.id === "pro" && "bg-[rgba(214,168,79,0.08)]"
                  )}
                >
                  <div className="text-sm font-semibold text-white">{p.label}</div>
                  <div className="mt-0.5 text-xs text-[var(--lp-gold,#d6a84f)]">{p.price}</div>
                  {p.id === "pro" ? (
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[var(--lp-gold-bright,#f3c96b)]">
                      Recommended
                    </div>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FEATURE_COMPARISON.map((group) => (
              <Fragment key={group.title}>
                <tr>
                  <td
                    colSpan={6}
                    className="border-t border-white/8 bg-[#0b1020] px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--lp-gold,#d6a84f)]"
                  >
                    {group.title}
                  </td>
                </tr>
                {group.rows.map((row) => (
                  <tr
                    key={`${group.title}-${row.feature}`}
                    className="border-t border-white/[0.04] hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3 text-slate-300">{row.feature}</td>
                    {PLANS.map((p) => (
                      <td
                        key={p.id}
                        className={cn(
                          "px-3 py-3 text-center",
                          p.id === "pro" && "bg-[rgba(214,168,79,0.04)]"
                        )}
                      >
                        <Cell value={row[p.id]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: plan picker + accordion groups */}
      <div className="space-y-4 lg:hidden">
        <div className="flex flex-wrap gap-2">
          {PLANS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setMobilePlan(p.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                mobilePlan === p.id
                  ? "bg-[var(--lp-gold,#d6a84f)] text-[#0b0f19]"
                  : "border border-white/10 text-slate-300"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {FEATURE_COMPARISON.map((group) => {
          const open = openGroup === group.title;
          return (
            <div
              key={group.title}
              className="overflow-hidden rounded-2xl border border-white/8 bg-[var(--lp-panel,#0f172a)]"
            >
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold"
                onClick={() => setOpenGroup(open ? null : group.title)}
              >
                {group.title}
                <ChevronDown
                  className={cn("size-4 text-slate-400 transition", open && "rotate-180")}
                />
              </button>
              {open ? (
                <ul className="border-t border-white/8 px-4 pb-3">
                  {group.rows.map((row) => (
                    <li
                      key={row.feature}
                      className="flex items-center justify-between gap-3 border-b border-white/[0.04] py-2.5 last:border-0"
                    >
                      <span className="text-xs text-slate-300">{row.feature}</span>
                      <Cell value={row[mobilePlan]} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-slate-500">
        Launch pricing. Device packs, verified tags, and premium setup sold separately. Some items
        marked Coming soon / Add-on / Custom are roadmap or premium paths — not MVP promises.
      </p>
      <div className="flex justify-center">
        <Link href="/sign-up" className={cn(buttonVariants({ size: "lg" }), "px-8")}>
          Get started on Pro
        </Link>
      </div>
    </div>
  );
}
