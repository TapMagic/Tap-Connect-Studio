"use client";

import { useId, useMemo, useState } from "react";
import { Settings2 } from "lucide-react";
import {
  buildVCard,
  saveContactWithUserGesture,
  type BrandContactProfile,
} from "@/lib/brand/contact-profile";
import {
  detectRetentionDevice,
  homescreenInstructions,
  RETENTION_EVENTS,
} from "@/lib/fusion/card/retention";
import { trackRetentionEvent } from "@/lib/fusion/card/retention-analytics";
import { AddToWalletMock } from "@/components/tap/add-to-wallet-mock";
import type { MyTapWalletSummary } from "@/lib/fusion/wallet/tapsave-wire";
import type { TapSavePreference } from "@/lib/fusion/tapsave/moments";
import { MyTapPreferencesForm } from "@/components/tap/mytap-preferences-form";
import { cn } from "@/lib/utils";

type ManageCardSheetProps = {
  publicToken: string;
  businessName: string;
  openCardHref: string | null;
  cardUrl: string;
  profile?: BrandContactProfile | null;
  walletSummary?: MyTapWalletSummary | null;
  preferences: TapSavePreference;
  loyalty?: { programName: string; balance: number; tierName: string | null } | null;
  openCaseCount?: number;
  className?: string;
};

/**
 * Subtle Manage this Card control — retention, preferences, relationship, recovery.
 * Does not duplicate Open Card.
 */
export function ManageCardControl({
  publicToken,
  businessName,
  openCardHref,
  cardUrl,
  profile = null,
  walletSummary = null,
  preferences,
  loyalty = null,
  openCaseCount = 0,
  className,
}: ManageCardSheetProps) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<"menu" | "homescreen" | "prefs" | "wallet" | "qr">(
    "menu"
  );
  const [hint, setHint] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const device = useMemo(
    () => detectRetentionDevice(typeof navigator !== "undefined" ? navigator.userAgent : ""),
    []
  );
  const guide = homescreenInstructions(device);
  const living = cardUrl || openCardHref || "";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(living || window.location.href);
      setHint("Permanent Card link copied.");
    } catch {
      setHint("Copy the link from your browser address bar.");
    }
  }

  async function saveContact() {
    const fullName = profile?.displayName || profile?.organization || businessName;
    const link = living || window.location.href;
    const content = buildVCard({
      fullName,
      organization: profile?.organization || businessName,
      title: profile?.jobTitle,
      phone: profile?.phone,
      email: profile?.email,
      website: profile?.website,
      livingCardUrl: link,
      note: `Living Card: ${link}`,
    });
    const result = await saveContactWithUserGesture({
      filename: `${fullName.replace(/\s+/g, "-")}.vcf`,
      content,
      title: fullName,
    });
    if (result === "cancelled") setHint("Save cancelled.");
    else setHint("Contact includes your Living Card link.");
  }

  function emailCard() {
    const url = living || window.location.href;
    const subject = encodeURIComponent(`Your ${businessName} Card`);
    const body = encodeURIComponent(`Reopen your living Card:\n\n${url}\n`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  async function showQr() {
    setPanel("qr");
    setQrDataUrl(null);
    try {
      const target = living.startsWith("http")
        ? living
        : `${window.location.origin}${living.startsWith("/") ? living : `/${living}`}`;
      const res = await fetch(`/api/qr?url=${encodeURIComponent(target)}&size=180`);
      const data = (await res.json()) as { ok?: boolean; dataUrl?: string };
      if (data.ok && data.dataUrl) setQrDataUrl(data.dataUrl);
    } catch {
      setHint("QR unavailable — copy the Card link instead.");
    }
  }

  return (
    <div className={cn("text-center", className)}>
      <button
        type="button"
        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-white/10 hover:text-white"
        data-testid="manage-this-card"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setOpen(true);
          setPanel("menu");
          void trackRetentionEvent({
            eventType: RETENTION_EVENTS.manageOpened,
            method: "manage",
          });
        }}
      >
        <Settings2 className="h-3.5 w-3.5" aria-hidden />
        Manage this Card
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            data-testid="manage-card-sheet"
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/15 bg-[#0b0f19] p-4 text-left text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                  Manage
                </p>
                <h2 id={titleId} className="text-base font-semibold">
                  Manage this Card
                </h2>
              </div>
              <button
                type="button"
                className="text-white/50 hover:text-white"
                aria-label="Close manage sheet"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>

            {panel === "menu" ? (
              <div className="mt-4 space-y-4 text-sm">
                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-white/45">
                    Retention
                  </h3>
                  <ul className="mt-2 space-y-1">
                    <li>
                      <button
                        type="button"
                        className="w-full rounded-lg px-3 py-2.5 text-left hover:bg-white/5"
                        data-testid="manage-wallet"
                        onClick={() => setPanel("wallet")}
                      >
                        {walletSummary ? "Manage Wallet pass" : "Add or preview Wallet pass"}
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="w-full rounded-lg px-3 py-2.5 text-left hover:bg-white/5"
                        data-testid="manage-homescreen"
                        onClick={() => setPanel("homescreen")}
                      >
                        Add Card to Home Screen
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="w-full rounded-lg px-3 py-2.5 text-left hover:bg-white/5"
                        onClick={() => void saveContact()}
                      >
                        Save or update Contact
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="w-full rounded-lg px-3 py-2.5 text-left hover:bg-white/5"
                        onClick={emailCard}
                      >
                        Email Card
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="w-full rounded-lg px-3 py-2.5 text-left hover:bg-white/5"
                        onClick={() => void copyLink()}
                      >
                        Copy permanent Card link
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="w-full rounded-lg px-3 py-2.5 text-left hover:bg-white/5"
                        data-testid="manage-show-qr"
                        onClick={() => void showQr()}
                      >
                        Show QR for another device
                      </button>
                    </li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-white/45">
                    Preferences
                  </h3>
                  <button
                    type="button"
                    className="mt-2 w-full rounded-lg px-3 py-2.5 text-left hover:bg-white/5"
                    data-testid="manage-prefs"
                    onClick={() => setPanel("prefs")}
                  >
                    Communication & update frequency
                  </button>
                  <p className="mt-1 px-3 text-[11px] text-white/55">
                    Language, text size, and theme follow your device for now.
                  </p>
                </section>

                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-white/45">
                    Relationship
                  </h3>
                  <ul className="mt-2 space-y-1 text-white/75">
                    {loyalty ? (
                      <li className="px-3 py-2">
                        Rewards · {loyalty.programName} · {loyalty.balance} pts
                        {loyalty.tierName ? ` · ${loyalty.tierName}` : ""}
                      </li>
                    ) : (
                      <li className="px-3 py-2 text-white/55">No rewards enrolled yet</li>
                    )}
                    {openCaseCount > 0 ? (
                      <li className="px-3 py-2">Open support · {openCaseCount}</li>
                    ) : (
                      <li className="px-3 py-2 text-white/55">No open support cases</li>
                    )}
                  </ul>
                </section>

                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-white/45">
                    Recovery
                  </h3>
                  <ul className="mt-2 space-y-1">
                    <li>
                      <button
                        type="button"
                        className="w-full rounded-lg px-3 py-2.5 text-left hover:bg-white/5"
                        onClick={() => setPanel("wallet")}
                      >
                        Resume or replace Wallet pass
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="w-full rounded-lg px-3 py-2.5 text-left hover:bg-white/5"
                        onClick={() => setPanel("homescreen")}
                      >
                        Resume incomplete Home Screen setup
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="w-full rounded-lg px-3 py-2.5 text-left hover:bg-white/5"
                        onClick={() => void saveContact()}
                      >
                        Re-add Contact
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="w-full rounded-lg px-3 py-2.5 text-left hover:bg-white/5"
                        onClick={emailCard}
                      >
                        Resend Card
                      </button>
                    </li>
                  </ul>
                </section>
              </div>
            ) : null}

            {panel === "homescreen" ? (
              <div className="mt-4 space-y-3" data-testid="manage-homescreen-guide">
                <ol className="list-decimal space-y-1 pl-5 text-sm text-white/80">
                  {guide.steps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
                <p className="text-xs text-white/50">{guide.note}</p>
                <button
                  type="button"
                  className="tap-btn w-full border border-white/15"
                  onClick={() => setPanel("menu")}
                >
                  Back
                </button>
              </div>
            ) : null}

            {panel === "prefs" ? (
              <div className="mt-4 space-y-3">
                <MyTapPreferencesForm publicToken={publicToken} initial={preferences} />
                <button
                  type="button"
                  className="tap-btn w-full border border-white/15"
                  onClick={() => setPanel("menu")}
                >
                  Back
                </button>
              </div>
            ) : null}

            {panel === "wallet" ? (
              <div className="mt-4 space-y-3">
                <AddToWalletMock
                  publicToken={publicToken}
                  businessName={businessName}
                  initialWallet={walletSummary}
                  presentation="mytap"
                />
                <button
                  type="button"
                  className="tap-btn w-full border border-white/15"
                  onClick={() => setPanel("menu")}
                >
                  Back
                </button>
              </div>
            ) : null}

            {panel === "qr" ? (
              <div className="mt-4 space-y-3 text-center" data-testid="manage-qr">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt="QR code for this Card"
                    width={180}
                    height={180}
                    className="mx-auto rounded-lg bg-white p-2"
                  />
                ) : (
                  <p className="text-xs text-white/55 break-all">{living || "Preparing QR…"}</p>
                )}
                <button
                  type="button"
                  className="tap-btn w-full border border-white/15"
                  onClick={() => setPanel("menu")}
                >
                  Back
                </button>
              </div>
            ) : null}

            {hint ? (
              <p className="mt-3 text-xs text-primary/80" role="status">
                {hint}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
