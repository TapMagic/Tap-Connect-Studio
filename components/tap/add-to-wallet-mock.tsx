"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import { WalletMockPassCard } from "@/components/tap/wallet-mock-pass-card";
import type { MyTapWalletSummary } from "@/lib/fusion/wallet/tapsave-wire";

type Props = {
  publicToken: string;
  businessName: string;
  initialWallet?: MyTapWalletSummary | null;
  className?: string;
};

export function AddToWalletMock({
  publicToken,
  businessName,
  initialWallet = null,
  className = "",
}: Props) {
  const [wallet, setWallet] = useState<MyTapWalletSummary | null>(initialWallet);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState(false);

  async function handleAdd() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mytap/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicToken, platform: "apple" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not create wallet pass.");
        return;
      }
      setWallet({
        pass: data.pass,
        mock: data.mock,
        evidenceLabel: data.mock ? "Modeled — mock adapter" : "Confirmed",
        installUrl: data.installUrl,
        previewUrl: data.previewUrl,
      });
      setIssued(!data.alreadyIssued);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (wallet) {
    return (
      <section
        className={`rounded-xl border border-primary/20 bg-primary/5 p-4 ${className}`}
        aria-labelledby="wallet-pass-heading"
      >
        <h2
          id="wallet-pass-heading"
          className="text-sm font-semibold uppercase tracking-wide text-primary/80"
        >
          Wallet pass
        </h2>
        {issued ? (
          <p className="mt-1 text-xs text-white/60">Mock pass issued — linked to your saved relationship.</p>
        ) : (
          <p className="mt-1 text-xs text-white/60">Your wallet pass for this relationship.</p>
        )}
        <div className="mt-3">
          <WalletMockPassCard
            pass={wallet.pass}
            businessName={businessName}
            evidenceLabel={wallet.evidenceLabel}
          />
        </div>
      </section>
    );
  }

  return (
    <section
      className={`rounded-xl border border-white/10 bg-white/5 p-4 ${className}`}
      aria-labelledby="wallet-offer-heading"
    >
      <h2 id="wallet-offer-heading" className="text-sm font-semibold uppercase tracking-wide text-white/50">
        Wallet
      </h2>
      <p className="mt-2 text-sm text-white/70">
        Add a mock Apple Wallet pass linked to this saved relationship. No live Apple or Google
        credentials required.
      </p>
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
      <button
        type="button"
        onClick={handleAdd}
        disabled={loading}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-60"
      >
        <Wallet className="h-4 w-4" aria-hidden />
        {loading ? "Creating pass…" : "Add to Wallet (mock)"}
      </button>
      <p className="mt-3 text-[10px] leading-relaxed text-white/40">
        Live wallet signing is{" "}
        <span className="text-primary/80">VERIFIED — CREDENTIALS REQUIRED</span>. This path uses
        the mock adapter only.
      </p>
    </section>
  );
}
