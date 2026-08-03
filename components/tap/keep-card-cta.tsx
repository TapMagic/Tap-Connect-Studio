"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookmarkPlus } from "lucide-react";
import { RetentionChooser } from "@/components/tap/retention-chooser";
import { AddToWalletMock } from "@/components/tap/add-to-wallet-mock";
import {
  RETENTION_EVENTS,
  trackRetentionEvent,
} from "@/lib/fusion/card/retention-analytics";
import type { BrandContactProfile } from "@/lib/brand/contact-profile";
import type { RetentionMethodId, RetentionWalletMode } from "@/lib/fusion/card/retention";
import { cn } from "@/lib/utils";

type KeepCardCtaProps = {
  businessId: string;
  businessName?: string;
  campaignId?: string;
  deviceSlotId?: string;
  /** When false, render nothing (feature gated by parent). */
  enabled?: boolean;
  previewMode?: boolean;
  prefillEmail?: string;
  /** Live vs demo Wallet — never invent live install when preview. */
  walletMode?: RetentionWalletMode;
  walletFeatureOn?: boolean;
  profile?: BrandContactProfile | null;
  /** Optional vCard / contact download URL for Save Contact */
  contactHref?: string;
  className?: string;
};

/**
 * Public “Keep this Card” — primary retention CTA → chooser → confirmation.
 * Customer language only (no TapSave / MyTap / adapter jargon in the CTA).
 */
export function KeepCardCta({
  businessId,
  businessName,
  campaignId,
  deviceSlotId,
  enabled = true,
  previewMode = false,
  prefillEmail,
  walletMode = "preview",
  walletFeatureOn = true,
  profile = null,
  contactHref,
  className = "",
}: KeepCardCtaProps) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<{
    method: RetentionMethodId;
    myTapPath?: string | null;
    publicToken?: string | null;
    homescreenPending?: boolean;
  } | null>(null);

  useEffect(() => {
    // Authoring and view-only previews must never contaminate public engagement analytics.
    if (!enabled || previewMode) return;
    void trackRetentionEvent({
      eventType: RETENTION_EVENTS.ctaViewed,
      businessId,
      campaignId,
      deviceSlotId,
    });
  }, [enabled, previewMode, businessId, campaignId, deviceSlotId]);

  if (!enabled) return null;

  if (done) {
    const savedRelationship = Boolean(done.myTapPath);
    const walletMethod = done.method === "apple_wallet";
    const homescreenPending = done.method === "homescreen" && done.homescreenPending;
    return (
      <div className={cn("tap-block px-4 pt-4", className)} data-testid="retention-success">
        <div className="rounded-xl border border-[var(--tap-primary)]/40 bg-[var(--tap-primary)]/10 p-4 text-center">
          <p className="font-medium text-[var(--tap-primary)]">
            {walletMethod
              ? walletMode === "live"
                ? "Card ready for Wallet"
                : "Card saved · Wallet preview"
              : homescreenPending
                ? "Card kept · Home Screen pending"
                : "Card kept"}
          </p>
          <p className="mt-1 text-sm opacity-80">
            {homescreenPending
              ? "Finish Add to Home Screen anytime from Manage this Card — we saved your place."
              : walletMethod && walletMode !== "live"
                ? "Demo Wallet preview only — not a live Apple pass. Your Card is still saved."
                : savedRelationship
                  ? businessName
                    ? `You can reopen ${businessName} anytime from your saved Card link.`
                    : "You can reopen this Card anytime from your saved link."
                  : "You’re set. Use your Home Screen, Contacts, or link to come back."}
          </p>
          {done.myTapPath ? (
            <Link
              href={done.myTapPath}
              className="tap-btn tap-btn-primary mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2"
              data-testid="retention-open-saved"
              onClick={() => {
                void trackRetentionEvent({
                  eventType: RETENTION_EVENTS.cardReopened,
                  businessId,
                  campaignId,
                  deviceSlotId,
                  method: done.method,
                });
              }}
            >
              Open Card
            </Link>
          ) : null}
          {walletMethod && done.publicToken && !previewMode && walletMode !== "live" ? (
            <div className="mt-4 text-left">
              <AddToWalletMock
                publicToken={done.publicToken}
                businessName={businessName ?? "Tap Connect"}
                presentation="post_keep_preview"
              />
            </div>
          ) : null}
          {walletMethod && done.publicToken && !previewMode && walletMode === "live" ? (
            <div className="mt-4 text-left">
              <AddToWalletMock
                publicToken={done.publicToken}
                businessName={businessName ?? "Tap Connect"}
                presentation="post_keep_live"
              />
            </div>
          ) : null}
          <button
            type="button"
            className="mt-3 text-xs text-white/50 underline-offset-2 hover:underline"
            onClick={() => {
              setDone(null);
              setOpen(true);
            }}
          >
            Choose another way
          </button>
          <p className="mt-3 text-[10px] opacity-50">Powered by Tap The Magic</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("tap-block px-4 pt-4", className)} data-testid="keep-card-cta">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          data-testid="keep-this-card"
          className="tap-btn tap-btn-primary flex min-h-12 w-full items-center justify-center gap-2 text-base font-semibold"
        >
          <BookmarkPlus className="h-5 w-5" aria-hidden />
          Keep this Card
        </button>
      ) : (
        <RetentionChooser
          businessId={businessId}
          businessName={businessName}
          campaignId={campaignId}
          deviceSlotId={deviceSlotId}
          walletMode={walletMode}
          walletFeatureOn={walletFeatureOn}
          previewMode={previewMode}
          profile={profile}
          contactHref={contactHref}
          cardUrl={
            typeof window !== "undefined" ? window.location.href.split("#")[0] : undefined
          }
          prefillEmail={prefillEmail}
          onClose={() => setOpen(false)}
          onComplete={(result) => {
            setOpen(false);
            setDone(result);
          }}
        />
      )}
    </div>
  );
}
