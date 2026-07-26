"use client";

import { useMemo, useState } from "react";
import { Wallet } from "lucide-react";
import { WalletMockPassCard } from "@/components/tap/wallet-mock-pass-card";
import type { MyTapWalletSummary } from "@/lib/fusion/wallet/tapsave-wire";
import {
  detectRetentionDevice,
  WALLET_CUSTOMER_STATE_LABEL,
  walletActionLabel,
  walletCustomerState,
  walletCustomerStateDescription,
} from "@/lib/fusion/card/retention";

type Props = {
  publicToken: string;
  businessName: string;
  initialWallet?: MyTapWalletSummary | null;
  /** post_keep_preview | post_keep_live | mytap */
  presentation?: "post_keep_preview" | "post_keep_live" | "mytap";
  className?: string;
};

/**
 * Customer Wallet offer / status — honest mock vs live language.
 * Never implies a live Apple install when only the mock adapter ran.
 */
export function AddToWalletMock({
  publicToken,
  businessName,
  initialWallet = null,
  presentation = "mytap",
  className = "",
}: Props) {
  const [wallet, setWallet] = useState<MyTapWalletSummary | null>(initialWallet);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const device = useMemo(
    () => detectRetentionDevice(typeof navigator !== "undefined" ? navigator.userAgent : ""),
    []
  );

  const mock = wallet?.mock ?? true;
  const state = walletCustomerState({
    providerStatus: wallet?.pass.status ?? null,
    mock,
    liveReady: presentation === "post_keep_live" && !mock,
    device,
    hasPass: Boolean(wallet?.pass),
  });

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
        setError(data.error ?? "Could not create a Wallet preview.");
        return;
      }
      setWallet({
        pass: data.pass,
        mock: data.mock,
        evidenceLabel: data.mock ? "Modeled — mock adapter" : "Confirmed",
        installUrl: data.installUrl,
        previewUrl: data.previewUrl,
      });
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const action = walletActionLabel({
    state,
    mock: wallet?.mock ?? true,
    hasPass: Boolean(wallet?.pass),
  });

  if (wallet) {
    return (
      <section
        className={`rounded-xl border border-primary/20 bg-primary/5 p-4 ${className}`}
        aria-labelledby="wallet-pass-heading"
        data-testid="wallet-status-card"
        data-wallet-state={state}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2
              id="wallet-pass-heading"
              className="text-sm font-semibold uppercase tracking-wide text-primary/80"
            >
              Apple Wallet
            </h2>
            <p className="mt-1 text-sm text-white/80">
              {WALLET_CUSTOMER_STATE_LABEL[state]}
            </p>
            <p className="mt-1 text-xs text-white/60">{walletCustomerStateDescription(state)}</p>
          </div>
        </div>
        <div className="mt-3">
          <WalletMockPassCard
            pass={wallet.pass}
            businessName={businessName}
            evidenceLabel={wallet.evidenceLabel}
            customerState={state}
            showTechnical={showDetails}
          />
        </div>
        <button
          type="button"
          className="mt-3 text-xs text-white/50 underline-offset-2 hover:underline"
          onClick={() => setShowDetails((v) => !v)}
          data-testid="wallet-view-details"
        >
          {showDetails ? "Hide technical details" : "View technical details"}
        </button>
      </section>
    );
  }

  const isPreviewOffer =
    presentation === "post_keep_preview" || presentation === "mytap" || mock;

  return (
    <section
      className={`rounded-xl border border-white/10 bg-white/5 p-4 ${className}`}
      aria-labelledby="wallet-offer-heading"
      data-testid="wallet-offer-card"
      data-wallet-state={state}
    >
      <h2
        id="wallet-offer-heading"
        className="text-sm font-semibold uppercase tracking-wide text-white/50"
      >
        Apple Wallet
      </h2>
      <p className="mt-2 text-sm text-white/70">{walletCustomerStateDescription(state)}</p>
      {error ? (
        <p className="mt-2 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={handleAdd}
        disabled={loading}
        data-testid="wallet-primary-action"
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-60"
      >
        <Wallet className="h-4 w-4" aria-hidden />
        {loading ? "Working…" : action}
      </button>
      {isPreviewOffer ? (
        <p className="mt-3 text-[10px] leading-relaxed text-white/45">
          Demo / credentials required for live Apple Wallet. This creates a preview only — not a
          live pass install.
        </p>
      ) : null}
    </section>
  );
}
