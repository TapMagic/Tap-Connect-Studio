"use client";

import { useState } from "react";
import Link from "next/link";
import { BookmarkPlus } from "lucide-react";
import { AddToWalletMock } from "@/components/tap/add-to-wallet-mock";

type KeepCardCtaProps = {
  businessId: string;
  businessName?: string;
  campaignId?: string;
  deviceSlotId?: string;
  /** When false, render nothing (feature gated by parent). */
  enabled?: boolean;
  previewMode?: boolean;
  prefillEmail?: string;
  className?: string;
};

/**
 * Public TapSave Keep Card CTA — creates/updates relationship and links to MyTap.
 * Hidden when `enabled` is false (tapsave.core feature gate).
 */
export function KeepCardCta({
  businessId,
  businessName,
  campaignId,
  deviceSlotId,
  enabled = true,
  previewMode = false,
  prefillEmail,
  className = "",
}: KeepCardCtaProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(prefillEmail ?? "");
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myTapPath, setMyTapPath] = useState<string | null>(null);
  const [publicToken, setPublicToken] = useState<string | null>(null);

  if (!enabled) return null;

  async function handleKeep(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (previewMode) {
      await new Promise((r) => setTimeout(r, 300));
      setMyTapPath("/mytap/preview");
      setPublicToken("preview");
      setOpen(false);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/tapsave/keep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          email,
          name: name || undefined,
          campaignId,
          deviceSlotId,
          consentGiven: consent,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not save this Card.");
        return;
      }
      setMyTapPath(data.myTapUrl ?? data.myTapPath);
      setPublicToken(data.publicToken ?? null);
      setOpen(false);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (myTapPath) {
    return (
      <div className={`tap-block px-4 pt-4 ${className}`}>
        <div className="rounded-xl border border-[var(--tap-primary)]/40 bg-[var(--tap-primary)]/10 p-4 text-center">
          <p className="font-medium text-[var(--tap-primary)]">Card saved</p>
          <p className="mt-1 text-sm opacity-80">
            {businessName
              ? `Your relationship with ${businessName} is saved. Reopen anytime from MyTap.`
              : "Reopen anytime from your private MyTap link."}
          </p>
          <Link
            href={myTapPath}
            className="tap-btn tap-btn-primary mt-3 inline-flex items-center justify-center gap-2"
          >
            Open MyTap
          </Link>
          {publicToken && !previewMode ? (
            <div className="mt-4 text-left">
              <AddToWalletMock
                publicToken={publicToken}
                businessName={businessName ?? "Tap Connect"}
              />
            </div>
          ) : null}
          <p className="mt-3 text-[10px] opacity-50">Powered by Tap The Magic</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`tap-block px-4 pt-4 ${className}`}>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="tap-btn flex w-full items-center justify-center gap-2 border border-white/15 bg-white/5"
        >
          <BookmarkPlus className="h-4 w-4" aria-hidden />
          Keep this Card
        </button>
      ) : (
        <form
          onSubmit={handleKeep}
          className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4"
        >
          <h3 className="text-base font-semibold">Keep this Card</h3>
          <p className="text-xs opacity-70">
            Save a private link to reopen this relationship — we never put your email in the URL.
          </p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (optional)"
            className="tap-input w-full"
            autoComplete="name"
          />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="tap-input w-full"
            autoComplete="email"
          />
          <label className="flex items-start gap-2 text-xs opacity-70">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5"
            />
            I agree to receive updates from this business.
          </label>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="tap-btn tap-btn-primary flex-1">
              {loading ? "Saving…" : "Save to MyTap"}
            </button>
            <button
              type="button"
              className="tap-btn flex-1 border border-white/15"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
