"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { TapConnectLogo } from "@/components/brand/tap-connect-logo";

type ReturnState =
  | { status: "loading" }
  | { status: "verified"; offerSlug: string; honesty: string }
  | { status: "error"; message: string };

function ReturnInner() {
  const search = useSearchParams();
  const sessionId = search.get("session") ?? "";
  const [state, setState] = useState<ReturnState>(() =>
    sessionId ? { status: "loading" } : { status: "error", message: "Missing session" }
  );

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const statusRes = await fetch("/api/public/offer/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, action: "status" }),
        });
        const statusData = (await statusRes.json()) as {
          status?: string;
          offerSlug?: string;
          error?: string;
        };
        if (cancelled) return;

        if (statusData.status === "completed") {
          setState({
            status: "verified",
            offerSlug: statusData.offerSlug ?? "",
            honesty: "Local simulation verified server-side — not a live payment.",
          });
          return;
        }

        if (statusData.status === "open") {
          const completeRes = await fetch("/api/public/offer/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, action: "complete" }),
          });
          const completeData = (await completeRes.json()) as {
            ok?: boolean;
            offerSlug?: string;
            honesty?: string;
            error?: string;
          };
          if (cancelled) return;
          if (!completeRes.ok || !completeData.ok) {
            setState({
              status: "error",
              message: completeData.error ?? "Payment not verified",
            });
            return;
          }
          setState({
            status: "verified",
            offerSlug: completeData.offerSlug ?? "",
            honesty: completeData.honesty ?? "Verified locally.",
          });
          return;
        }

        setState({
          status: "error",
          message:
            statusData.status === "canceled"
              ? "Checkout was canceled"
              : statusData.error ?? "Payment not verified",
        });
      } catch {
        if (!cancelled) {
          setState({ status: "error", message: "Verification request failed" });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (state.status === "loading") {
    return (
      <p className="p-8 text-white" data-testid="offer-return-loading">
        Verifying purchase…
      </p>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-16 text-white" data-testid="offer-return-error">
        <h1 className="text-2xl font-semibold">We could not confirm this purchase</h1>
        <p className="text-sm text-white/70">{state.message}</p>
        <Link href="/" className="text-[var(--studio-go)] underline">
          Return to TapConnect
        </Link>
      </div>
    );
  }

  return (
    <div
      className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-5 px-4 text-white"
      data-testid="offer-return-success"
      data-offer={state.offerSlug}
    >
      <TapConnectLogo variant="mark" imgClassName="h-12 w-12" />
      <h1 className="text-3xl font-semibold tracking-tight">You are back in TapConnect</h1>
      <p className="text-sm text-white/70">
        Purchase context preserved for <strong>{state.offerSlug}</strong>. Stripe (or this local
        simulation) only handled the transaction moment — the journey continues here.
      </p>
      <p className="text-xs text-sky-200/90">{state.honesty}</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/sign-up?offer=${encodeURIComponent(state.offerSlug)}`}
          data-testid="offer-return-continue"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--studio-go)] px-4 text-sm font-semibold text-[var(--studio-go-fg)]"
        >
          Continue to account / onboarding
        </Link>
        <Link
          href="/dashboard?assembly=first"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/20 px-4 text-sm text-white/85"
        >
          Enter Studio Assembly
        </Link>
      </div>
      <Link href={`/offer/${state.offerSlug}`} className="text-sm text-white/55 underline">
        Review offer Card
      </Link>
    </div>
  );
}

export default function OfferReturnPage() {
  return (
    <Suspense fallback={<p className="p-8 text-white">Loading…</p>}>
      <ReturnInner />
    </Suspense>
  );
}
