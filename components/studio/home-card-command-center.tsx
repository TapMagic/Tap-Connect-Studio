import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CreditCard,
  ExternalLink,
  Radio,
  Sparkles,
} from "lucide-react";
import type { CardRelationshipContext } from "@/lib/fusion/studio/card-relationship";
import { cn } from "@/lib/utils";

/**
 * Home first-fold Card Command Center — relationship first, not dense analytics.
 */
export function HomeCardCommandCenter({
  card,
}: {
  card: CardRelationshipContext;
}) {
  const healthLabel =
    card.tapPointCount === 0
      ? "No Tap Points connected"
      : `${card.tapPointHealthy} healthy · ${card.tapPointWarning} warn · ${card.tapPointCritical} critical`;

  return (
    <section
      className="zone-home space-y-5 rounded-2xl border border-white/10 px-5 py-6 sm:px-6"
      data-testid="home-card-command-center"
      data-assembly-dest="home"
      tabIndex={-1}
      aria-labelledby="home-card-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <p className="zone-label-home text-[11px] font-semibold uppercase tracking-[0.18em]">
            Card relationship
          </p>
          <h1
            id="home-card-heading"
            className="text-2xl font-semibold tracking-tight text-white sm:text-3xl"
            data-testid="home-card-name"
          >
            {card.cardName}
          </h1>
          <p className="max-w-xl text-sm text-white/55">
            Here is your customer relationship. Here is what it is doing. Here is what needs
            attention. Here is the next useful action.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span
              className={cn(
                "rounded-md px-2 py-1 text-xs font-medium",
                card.publicState === "published"
                  ? "bg-primary/15 text-primary"
                  : card.publicState === "retired" || card.needsAttention
                    ? "bg-amber-500/15 text-amber-100"
                    : "bg-white/10 text-white/75"
              )}
              data-testid="home-card-state"
            >
              {card.publicStateLabel}
            </span>
            <span className="text-xs text-white/45" data-testid="home-card-tappoint-state">
              <Radio className="mr-1 inline h-3.5 w-3.5" aria-hidden />
              {healthLabel}
            </span>
            <span className="text-xs text-white/45" data-testid="home-card-spotlight-state">
              {card.spotlightTitle
                ? `Spotlight · ${card.spotlightTitle}`
                : "No Campaign Spotlight"}
            </span>
            <span className="text-xs text-white/45" data-testid="home-card-tapsave-state">
              {card.tapSaveEnabled ? "TapSave on" : "TapSave off"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={card.openHref}
            data-testid="home-open-card"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-4 text-sm font-medium text-white/90 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <CreditCard className="h-4 w-4" aria-hidden />
            Open Card
          </Link>
          <Link
            href={card.editHref}
            data-testid="home-edit-card"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/10 px-4 text-sm text-white/80 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            Edit Card
          </Link>
          {card.publicHref ? (
            <a
              href={card.publicHref}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="home-view-public-card"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/10 px-4 text-sm text-white/70 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              View public Card <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          ) : null}
        </div>
      </div>

      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        data-testid="home-proof-strip"
        aria-label="Card proof strip"
      >
        {[
          { label: "Taps", value: card.proof.taps, id: "taps" },
          { label: "Saves", value: card.proof.saves, id: "saves" },
          { label: "Contacts", value: card.proof.contacts, id: "contacts" },
          { label: "Claims", value: card.proof.claims, id: "claims" },
        ].map((m) => (
          <div
            key={m.id}
            className="rounded-lg border border-white/8 bg-black/20 px-3 py-2"
            data-testid={`home-proof-${m.id}`}
          >
            <p className="text-[10px] uppercase tracking-wide text-white/40">{m.label}</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-white">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div
          className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-4"
          data-testid="home-next-action"
          data-assembly-dest="autopilot_next"
        >
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Next action
          </p>
          <p className="mt-2 text-base font-medium text-white" data-testid="home-next-action-label">
            {card.nextAction.label}
          </p>
          <p className="mt-1 text-xs text-white/55">{card.nextAction.detail}</p>
          <Link
            href={card.nextAction.href}
            data-testid="home-next-action-go"
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            {card.nextAction.label}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        {card.needsAttention ? (
          <div
            className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] px-4 py-4"
            data-testid="home-needs-attention"
          >
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-200">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              Needs attention
            </p>
            <p className="mt-2 text-base font-medium text-white">{card.needsAttention.title}</p>
            <p className="mt-1 text-xs text-white/55">{card.needsAttention.detail}</p>
            <Link
              href={card.needsAttention.href}
              data-testid="home-needs-attention-go"
              className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm text-amber-100 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              Open recovery <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : card.autopilotSuggestion ? (
          <div
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4"
            data-testid="home-autopilot-suggestion"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
              Autopilot prepared
            </p>
            <p className="mt-2 text-base font-medium text-white">
              {card.autopilotSuggestion.title}
            </p>
            <p className="mt-1 text-xs text-white/55">{card.autopilotSuggestion.detail}</p>
            <Link
              href={card.autopilotSuggestion.href}
              className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm text-white/80 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              data-testid="home-autopilot-go"
            >
              Review recommendation <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
              Relationship movement
            </p>
            <p className="mt-2 text-sm text-white/60">
              {card.proof.taps > 0
                ? `${card.proof.taps} taps recorded · ${card.proof.contacts} contacts in memory.`
                : "No recent taps yet — connect a Tap Point or open the public Card to test."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
