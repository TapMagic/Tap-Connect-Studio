"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  CreditCard,
  GitBranch,
  Mail,
  Nfc,
  Star,
  Target,
  Users,
  Wrench,
} from "lucide-react";
import { CREATE_RECIPES, type CreateRecipe } from "@/lib/fusion/studio/create-recipes";
import { cn } from "@/lib/utils";

const RECIPE_ICONS: Record<string, LucideIcon> = {
  recipe_card: CreditCard,
  recipe_card_offer: Target,
  recipe_campaign: Target,
  recipe_tap_point: Nfc,
  recipe_contacts: Users,
  recipe_loyalty: Star,
  recipe_email: Mail,
  recipe_journey: GitBranch,
  recipe_insights: BarChart3,
  recipe_recover: Wrench,
};

/**
 * Outcome tiles — “What do you want to do?”
 * Prefer these over module catalogs for first-time hosts.
 */
export function OutcomeRecipes({
  title = "What do you want to do?",
  subtitle = "Pick an outcome — Studio opens the right workspace and guides the next steps.",
  recipes = CREATE_RECIPES,
  compact = false,
  className,
}: {
  title?: string;
  subtitle?: string;
  recipes?: CreateRecipe[];
  compact?: boolean;
  className?: string;
}) {
  return (
    <section
      className={cn("space-y-3", className)}
      aria-labelledby="outcome-recipes-heading"
      data-testid="outcome-recipes"
    >
      <div>
        <h2
          id="outcome-recipes-heading"
          className="text-xs font-semibold uppercase tracking-[0.14em] text-white/35"
        >
          {title}
        </h2>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm text-white/50">{subtitle}</p> : null}
      </div>
      <ul
        className={cn(
          "grid gap-2",
          compact ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-3"
        )}
      >
        {recipes.map((r) => (
          <li key={r.id}>
            <Link
              href={r.href}
              data-testid={`outcome-recipe-${r.id}`}
              className="group flex h-full flex-col rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-primary/35 hover:bg-primary/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <span className="flex items-start justify-between gap-2">
                <span className="flex min-w-0 items-start gap-2 text-sm font-medium text-white/90 group-hover:text-white">
                  {(() => {
                    const Icon = RECIPE_ICONS[r.id] ?? Target;
                    return (
                      <Icon
                        className="mt-0.5 h-4 w-4 shrink-0 text-primary/90"
                        aria-hidden
                      />
                    );
                  })()}
                  <span className="min-w-0">{r.label}</span>
                </span>
                <ArrowRight
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary opacity-0 transition group-hover:opacity-100"
                  aria-hidden
                />
              </span>
              <span className="mt-1.5 text-xs leading-snug text-white/45">{r.description}</span>
              {!compact ? (
                <span className="mt-2 text-[11px] text-white/35">
                  Next: {r.nextSteps[0]}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
