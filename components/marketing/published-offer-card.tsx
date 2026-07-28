"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TapConnectIcon } from "@/components/fusion/icons/tapconnect-icons";
import { PoweredByTapTheMagic } from "@/components/brand/powered-by";
import { TapConnectLogo } from "@/components/brand/tap-connect-logo";
import type { OfferBillingFrequency, PublishedOffer } from "@/lib/marketing/offer-catalog";
import { ZONE_TOKENS } from "@/lib/fusion/studio/zone-tokens";
import { cn } from "@/lib/utils";

export function PublishedOfferCard({
  offer,
  canceled,
}: {
  offer: PublishedOffer;
  canceled?: boolean;
}) {
  const [frequency, setFrequency] = useState<OfferBillingFrequency>(
    offer.billingFrequencies[0] ?? "monthly"
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [honesty, setHonesty] = useState<string | null>(null);

  const zone = ZONE_TOKENS.card;

  const freqLabel = useMemo(() => {
    if (frequency === "annual") return "Annual";
    if (frequency === "one_time") return "One-time";
    return "Monthly";
  }, [frequency]);

  async function startCheckout() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/public/offer/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerSlug: offer.slug, billingFrequency: frequency }),
      });
      const data = (await res.json()) as {
        checkoutUrl?: string;
        honesty?: string;
        error?: string;
      };
      if (!res.ok || !data.checkoutUrl) {
        setError(data.error ?? "Could not start checkout");
        setBusy(false);
        return;
      }
      setHonesty(data.honesty ?? null);
      window.location.href = data.checkoutUrl;
    } catch {
      setError("Could not start checkout");
      setBusy(false);
    }
  }

  return (
    <div
      className="mx-auto min-h-screen max-w-lg px-4 py-10 text-white"
      data-testid="published-offer-card"
      data-offer={offer.slug}
      data-offer-version={offer.version}
    >
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 text-sm text-white/70 hover:text-white">
          <TapConnectLogo variant="mark" imgClassName="h-8 w-8" />
          Back to TapConnect
        </Link>
        <PoweredByTapTheMagic className="scale-90" />
      </div>

      {canceled ? (
        <p
          className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100"
          data-testid="offer-canceled-notice"
        >
          Checkout was canceled. You are still on TapConnect — no payment was taken.
        </p>
      ) : null}

      <article
        className="zone-card rounded-2xl border border-white/15 p-6 shadow-2xl"
        style={{ boxShadow: `0 0 60px ${zone.railAccent}22` }}
      >
        <p className="zone-label-card text-[11px] font-semibold uppercase tracking-[0.18em]">
          Published offer Card
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight" data-testid="offer-display-name">
          {offer.displayName}
        </h1>
        <p className="mt-2 text-sm text-white/70">{offer.description}</p>
        <p className="mt-3 text-sm text-white/80">
          <span className="font-medium text-white">Who it is for: </span>
          {offer.whoFor}
        </p>
        <p className="mt-2 text-sm text-white/80">
          <span className="font-medium text-white">Main outcome: </span>
          {offer.mainOutcome}
        </p>

        <div className="mt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-white/55">
            Capabilities around the Card
          </p>
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Included capability icons">
            {offer.capabilityIcons.map((id) => (
              <li
                key={id}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/15 px-3 text-xs text-white/85"
              >
                <TapConnectIcon id={id} className="h-4 w-4" decorative />
                <span>{id.replaceAll("_", " ")}</span>
              </li>
            ))}
          </ul>
        </div>

        <ul className="mt-4 space-y-1 text-sm text-white/70">
          {offer.capabilityCategories.map((c) => (
            <li key={c}>· {c}</li>
          ))}
        </ul>

        <p className="mt-4 text-xs text-white/60" data-testid="offer-allowance-placeholder">
          {offer.allowancePlaceholder}
        </p>
        <p className="mt-1 text-xs text-white/60">{offer.upgradeContinuity}</p>
        <p className="mt-3 text-sm text-white/75" data-testid="offer-price-placeholder">
          {offer.priceDisplayPlaceholder}
        </p>

        <fieldset className="mt-5">
          <legend className="text-xs font-medium text-white/70">Billing frequency</legend>
          <div className="mt-2 flex flex-wrap gap-2" role="radiogroup">
            {offer.billingFrequencies.map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={frequency === f}
                data-testid={`offer-freq-${f}`}
                className={cn(
                  "min-h-11 rounded-lg border px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-go)]",
                  frequency === f
                    ? "border-[var(--studio-go)] bg-[var(--studio-go)]/15 text-[var(--studio-go)]"
                    : "border-white/15 text-white/70"
                )}
                onClick={() => setFrequency(f)}
              >
                {f === "annual" ? "Annual" : f === "one_time" ? "One-time" : "Monthly"}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-white/55">Selected: {freqLabel}</p>
        </fieldset>

        <p className="mt-4 text-xs text-white/55">{offer.termsSummary}</p>

        {honesty ? (
          <p className="mt-3 text-xs text-sky-200/90" data-testid="offer-checkout-honesty">
            {honesty}
          </p>
        ) : null}
        {error ? (
          <p className="mt-3 text-sm text-red-200" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          data-testid="offer-start-checkout"
          disabled={busy}
          onClick={startCheckout}
          className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--studio-go)] px-4 text-sm font-semibold text-[var(--studio-go-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60"
        >
          {busy ? "Starting secure checkout…" : "Continue to secure checkout"}
        </button>
        <p className="mt-3 text-center text-[11px] text-white/55">
          Stripe collects payment details when live. This environment uses a local simulation —
          you always return to TapConnect.
        </p>
      </article>
    </div>
  );
}
