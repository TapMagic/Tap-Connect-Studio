"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";
import { TapConnectLogo } from "@/components/brand/tap-connect-logo";

function SimulateInner() {
  const search = useSearchParams();
  const router = useRouter();
  const sessionId = search.get("session") ?? "";
  const offerSlug = search.get("offer") ?? "";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function complete() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/public/offer/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, action: "complete" }),
    });
    const data = (await res.json()) as { returnUrl?: string; error?: string };
    if (!res.ok || !data.returnUrl) {
      setError(data.error ?? "Verification failed");
      setBusy(false);
      return;
    }
    router.push(data.returnUrl);
  }

  function cancel() {
    setBusy(true);
    const fallback = offerSlug ? `/offer/${offerSlug}?canceled=1` : "/";
    // Do not await provider/network — cancel must always return inside TapConnect.
    void fetch("/api/public/offer/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, action: "cancel", offerSlug }),
    }).catch(() => undefined);
    window.location.assign(fallback);
  }

  return (
    <div
      className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-4 text-white"
      data-testid="offer-checkout-simulate"
    >
      <TapConnectLogo variant="mark" imgClassName="h-10 w-10" />
      <h1 className="text-2xl font-semibold">Secure checkout simulation</h1>
      <p className="text-sm text-white/70">
        This stands in for Stripe-hosted payment collection. No real payment method is charged.
        TapConnect still owns the journey — you return here after this step.
      </p>
      <p className="text-xs text-white/55">
        Session: {sessionId || "missing"} · Offer: {offerSlug || "missing"}
      </p>
      {error ? (
        <p className="text-sm text-red-200" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        data-testid="simulate-pay-success"
        disabled={busy || !sessionId}
        onClick={complete}
        className="min-h-11 rounded-lg bg-[var(--studio-go)] px-4 text-sm font-semibold text-[var(--studio-go-fg)] disabled:opacity-50"
      >
        Simulate successful payment
      </button>
      <button
        type="button"
        data-testid="simulate-pay-cancel"
        disabled={busy || !sessionId}
        onClick={cancel}
        className="min-h-11 rounded-lg border border-white/20 px-4 text-sm text-white/80 disabled:opacity-50"
      >
        Cancel and return to offer Card
      </button>
      <Link href={offerSlug ? `/offer/${offerSlug}` : "/"} className="text-sm text-white/60 underline">
        Back without changing session
      </Link>
    </div>
  );
}

export default function OfferCheckoutSimulatePage() {
  return (
    <Suspense fallback={<p className="p-8 text-white">Loading checkout…</p>}>
      <SimulateInner />
    </Suspense>
  );
}
