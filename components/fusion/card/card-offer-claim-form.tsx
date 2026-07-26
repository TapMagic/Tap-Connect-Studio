"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type CardOfferContext = {
  businessId: string;
  campaignId: string;
  deviceSlotId?: string;
  sectionId?: string;
  offerBlockId?: string;
  businessName?: string;
  offerTitle?: string;
  offerDescription?: string;
  offerCode?: string;
  offerExpires?: string;
  offerCta?: string;
  lockedUntilContact?: boolean;
};

/**
 * In-Card / Spotlight claim form — public conversion entry for Campaign-owned offer.
 */
export function CardOfferClaimForm({
  context,
  onClose,
  onSubmitted,
  className,
  autoView = true,
}: {
  context: CardOfferContext;
  onClose?: () => void;
  onSubmitted?: (result: { myTapPath?: string; statusLabel?: string }) => void;
  className?: string;
  autoView?: boolean;
}) {
  const titleId = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [requestFollowUp, setRequestFollowUp] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{
    myTapPath?: string;
    statusLabel?: string;
    confirmation?: string;
    code?: string;
  } | null>(null);

  useEffect(() => {
    if (!autoView || !context.businessId || !context.campaignId) return;
    void fetch("/api/public/card/offer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId: context.businessId,
        action: "view",
        campaignId: context.campaignId,
        sectionId: context.sectionId,
        offerBlockId: context.offerBlockId,
        deviceSlotId: context.deviceSlotId,
      }),
    }).catch(() => undefined);
  }, [
    autoView,
    context.businessId,
    context.campaignId,
    context.sectionId,
    context.offerBlockId,
    context.deviceSlotId,
  ]);

  async function submit(action: "claim" | "lead" | "keep") {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/public/card/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: context.businessId,
          action,
          campaignId: context.campaignId,
          sectionId: context.sectionId,
          offerBlockId: context.offerBlockId,
          deviceSlotId: context.deviceSlotId,
          name: name.trim() || undefined,
          email: email.trim() || undefined,
          consentGiven,
          requestFollowUp: requestFollowUp && consentGiven,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        myTapPath?: string;
        statusLabel?: string;
        confirmation?: string;
        offer?: { code?: string };
      };
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not complete this offer action.");
        return;
      }
      setDone({
        myTapPath: data.myTapPath,
        statusLabel: data.statusLabel,
        confirmation: data.confirmation,
        code: data.offer?.code,
      });
      onSubmitted?.({ myTapPath: data.myTapPath, statusLabel: data.statusLabel });
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div
        className={cn(
          "rounded-xl border border-primary/30 bg-black/70 p-4 text-sm text-white",
          className
        )}
        data-testid="card-offer-success"
        role="status"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
          {done.statusLabel || "Claimed"}
        </p>
        <p className="mt-2 font-semibold text-white">
          {context.offerTitle || "Your offer"}
        </p>
        <p className="mt-2 text-white/80">{done.confirmation}</p>
        {done.code ? (
          <p
            className="mt-3 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 font-mono text-base tracking-wide text-primary"
            data-testid="card-offer-code"
          >
            {done.code}
          </p>
        ) : null}
        {done.myTapPath ? (
          <a
            href={done.myTapPath}
            className="mt-3 inline-block text-sm text-primary underline underline-offset-2"
          >
            Open MyTap
          </a>
        ) : null}
        {onClose ? (
          <Button type="button" variant="secondary" className="mt-4 w-full" onClick={onClose}>
            Done
          </Button>
        ) : null}
      </div>
    );
  }

  const needsEmail = context.lockedUntilContact !== false;

  return (
    <div
      className={cn(
        "rounded-xl border border-white/15 bg-black/80 p-4 text-sm text-white shadow-xl backdrop-blur",
        className
      )}
      data-testid="card-offer-claim-form"
      aria-labelledby={titleId}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
            Spotlight offer
          </p>
          <h3 id={titleId} className="mt-1 text-base font-semibold">
            {context.offerTitle || "Special offer"}
          </h3>
          {context.offerDescription ? (
            <p className="mt-1 text-white/70">{context.offerDescription}</p>
          ) : null}
          {context.offerExpires ? (
            <p className="mt-1 text-xs text-white/50">Expires {context.offerExpires}</p>
          ) : null}
        </div>
        {onClose ? (
          <button
            type="button"
            className="text-xs text-white/50 hover:text-white"
            onClick={onClose}
          >
            Close
          </button>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label className="text-xs text-white/60" htmlFor={`${titleId}-name`}>
            Name (optional)
          </label>
          <Input
            id={`${titleId}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 bg-black/40"
            autoComplete="name"
          />
        </div>
        <div>
          <label className="text-xs text-white/60" htmlFor={`${titleId}-email`}>
            Email{needsEmail ? "" : " (optional for code-only claim)"}
          </label>
          <Input
            id={`${titleId}-email`}
            type="email"
            required={needsEmail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 bg-black/40"
            autoComplete="email"
          />
        </div>
        <label className="flex items-start gap-2 text-xs text-white/75">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={consentGiven}
            onChange={(e) => setConsentGiven(e.target.checked)}
          />
          <span>
            I agree to be contacted about this offer from{" "}
            {context.businessName || "this business"} by email.
          </span>
        </label>
        <label className="flex items-start gap-2 text-xs text-white/60">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={requestFollowUp}
            onChange={(e) => setRequestFollowUp(e.target.checked)}
            disabled={!consentGiven}
          />
          <span>Send me a follow-up with this offer (mock email · not live send).</span>
        </label>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-300" role="alert" data-testid="card-offer-error">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-2">
        <Button
          type="button"
          className="w-full"
          disabled={busy || (needsEmail && !consentGiven)}
          onClick={() => void submit("claim")}
          data-testid="card-offer-claim"
        >
          {busy ? "Working…" : context.offerCta || "Claim offer"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={busy || !consentGiven || !email.trim()}
          onClick={() => void submit("keep")}
          data-testid="card-offer-keep"
        >
          Keep Card with this offer
        </Button>
      </div>
    </div>
  );
}

/**
 * Compact Spotlight strip injected onto Campaign takeover pages.
 */
export function CardOfferSpotlightStrip({
  context,
  kicker,
  headline,
  className,
}: {
  context: CardOfferContext;
  kicker?: string;
  headline?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("px-4 pt-5", className)} data-testid="card-offer-spotlight-strip">
      {!open ? (
        <button
          type="button"
          className="tap-special-spotlight w-full rounded-xl border border-primary/40 bg-gradient-to-br from-primary/20 to-black/40 px-4 py-4 text-left"
          onClick={() => setOpen(true)}
          data-testid="card-offer-spotlight-open"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            {kicker || "Offer"}
          </p>
          <p className="mt-1 text-lg font-semibold text-white">
            {headline || context.offerTitle || "Special offer"}
          </p>
          {context.offerDescription ? (
            <p className="mt-1 text-sm text-white/70 line-clamp-2">{context.offerDescription}</p>
          ) : null}
          <p className="mt-3 text-sm font-medium text-primary">
            {context.offerCta || "View & claim"} →
          </p>
        </button>
      ) : (
        <CardOfferClaimForm context={context} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}
