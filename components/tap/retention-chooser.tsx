"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  detectRetentionDevice,
  homescreenInstructions,
  planRetentionMethods,
  retentionSetupStorageKey,
  RETENTION_UPDATES_COPY,
  type RetentionMethod,
  type RetentionMethodId,
  type RetentionSetupSnapshot,
  type RetentionWalletMode,
} from "@/lib/fusion/card/retention";
import { RETENTION_EVENTS, trackRetentionEvent } from "@/lib/fusion/card/retention-analytics";
import {
  buildVCard,
  saveContactWithUserGesture,
  type BrandContactProfile,
} from "@/lib/brand/contact-profile";
import { cn } from "@/lib/utils";

export type RetentionChooserProps = {
  businessId: string;
  businessName?: string;
  campaignId?: string;
  deviceSlotId?: string;
  walletMode: RetentionWalletMode;
  walletFeatureOn: boolean;
  previewMode?: boolean;
  profile?: BrandContactProfile | null;
  contactHref?: string;
  cardUrl?: string;
  prefillEmail?: string;
  prefillName?: string;
  onClose: () => void;
  onComplete: (result: {
    method: RetentionMethodId;
    myTapPath?: string | null;
    publicToken?: string | null;
    homescreenPending?: boolean;
  }) => void;
  className?: string;
};

type Step = "recommend" | "identity" | "homescreen_guide" | "qr";

function RetentionQrImage({ url }: { url: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/qr?url=${encodeURIComponent(url)}&size=180`);
        const data = (await res.json()) as { ok?: boolean; dataUrl?: string };
        if (!cancelled && data.ok && data.dataUrl) setDataUrl(data.dataUrl);
      } catch {
        // leave null — fallback link below
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!dataUrl) {
    return (
      <p className="rounded-lg border border-white/15 bg-white/5 px-3 py-4 text-xs text-white/70 break-all">
        {url || "Card link unavailable"}
      </p>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- data URL from /api/qr
    <img
      src={dataUrl}
      alt="QR code for this Card"
      width={180}
      height={180}
      className="mx-auto rounded-lg bg-white p-2"
    />
  );
}

function RetentionMethodButton({
  m,
  variant,
  busy,
  onSelect,
}: {
  m: RetentionMethod;
  variant: "primary" | "secondary" | "more";
  busy: boolean;
  onSelect: (m: RetentionMethod) => void;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => onSelect(m)}
      data-testid={`retention-method-${m.id}`}
      data-variant={variant}
      className={cn(
        "flex w-full flex-col rounded-lg border px-3 py-3 text-left transition",
        variant === "primary"
          ? "border-[var(--tap-primary,#bef200)]/60 bg-[var(--tap-primary,#bef200)]/15 shadow-[0_0_24px_rgba(190,255,0,0.08)]"
          : variant === "secondary"
            ? "border-white/15 bg-white/5 hover:bg-white/10"
            : "border-white/10 bg-transparent hover:bg-white/5"
      )}
    >
      <span className="flex flex-wrap items-center gap-2 font-medium">
        {variant === "primary" ? (
          <span className="text-[10px] uppercase tracking-wide text-[var(--tap-primary,#bef200)]">
            Recommended
          </span>
        ) : null}
        {m.badge ? (
          <span className="rounded-full border border-white/20 px-1.5 py-0.5 text-[10px] text-white/70">
            {m.badge}
          </span>
        ) : null}
      </span>
      <span className={cn("font-semibold", variant === "primary" ? "text-base" : "text-sm")}>
        {m.label}
      </span>
      <span className="mt-0.5 text-xs text-white/60">{m.description}</span>
    </button>
  );
}

/**
 * Conversion-first Keep flow: one recommended action, concise alternatives, More options.
 * Automatic lawful prep runs on open; marketing consent is a single benefit-led choice.
 */
export function RetentionChooser({
  businessId,
  businessName,
  campaignId,
  deviceSlotId,
  walletMode,
  walletFeatureOn,
  previewMode = false,
  profile = null,
  contactHref,
  cardUrl,
  prefillEmail,
  prefillName,
  onClose,
  onComplete,
  className,
}: RetentionChooserProps) {
  const titleId = useId();
  const device = useMemo(
    () => detectRetentionDevice(typeof navigator !== "undefined" ? navigator.userAgent : ""),
    []
  );
  const plan = useMemo(
    () => planRetentionMethods({ device, walletMode, walletFeatureOn }),
    [device, walletMode, walletFeatureOn]
  );
  const livingCardUrl =
    cardUrl || (typeof window !== "undefined" ? window.location.href.split("#")[0] : "");

  const [step, setStep] = useState<Step>("recommend");
  const [showMore, setShowMore] = useState(false);
  const [method, setMethod] = useState<RetentionMethodId | null>(null);
  const [name, setName] = useState(prefillName ?? profile?.displayName ?? "");
  const [email, setEmail] = useState(prefillEmail ?? "");
  const [usefulUpdates, setUsefulUpdates] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    void trackRetentionEvent({
      eventType: RETENTION_EVENTS.chooserOpened,
      businessId,
      campaignId,
      deviceSlotId,
    });
    void trackRetentionEvent({
      eventType: RETENTION_EVENTS.intentRecorded,
      businessId,
      campaignId,
      deviceSlotId,
    });
    // Automatic lawful, reversible prep — no marketing consent required
    try {
      const snap: RetentionSetupSnapshot = {
        businessId,
        cardUrl: livingCardUrl,
        campaignId,
        deviceSlotId,
        preparedAt: new Date().toISOString(),
      };
      sessionStorage.setItem(retentionSetupStorageKey(businessId), JSON.stringify(snap));
    } catch {
      // private mode
    }
  }, [businessId, campaignId, deviceSlotId, livingCardUrl]);

  function persistSetup(partial: Partial<RetentionSetupSnapshot>) {
    try {
      const key = retentionSetupStorageKey(businessId);
      const prev = sessionStorage.getItem(key);
      const base = prev ? (JSON.parse(prev) as RetentionSetupSnapshot) : null;
      const next: RetentionSetupSnapshot = {
        businessId,
        cardUrl: livingCardUrl,
        campaignId,
        deviceSlotId,
        preparedAt: base?.preparedAt ?? new Date().toISOString(),
        ...base,
        ...partial,
      };
      sessionStorage.setItem(key, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  function buildLivingVCard(): string | null {
    if (!profile && !businessName) return null;
    const fullName =
      profile?.displayName || profile?.organization || businessName || "Contact";
    return buildVCard({
      fullName,
      organization: profile?.organization || businessName,
      title: profile?.jobTitle,
      phone: profile?.phone,
      email: profile?.email,
      website: profile?.website,
      address: profile?.address,
      livingCardUrl: livingCardUrl || undefined,
      note: livingCardUrl ? `Living Card: ${livingCardUrl}` : undefined,
    });
  }

  async function selectMethod(m: RetentionMethod) {
    setError(null);
    setHint(null);
    setMethod(m.id);
    persistSetup({ method: m.id });
    void trackRetentionEvent({
      eventType: RETENTION_EVENTS.methodSelected,
      businessId,
      campaignId,
      deviceSlotId,
      method: m.id,
    });

    if (m.id === "homescreen") {
      setStep("homescreen_guide");
      void trackRetentionEvent({
        eventType: RETENTION_EVENTS.homescreenGuideShown,
        businessId,
        campaignId,
        deviceSlotId,
        method: m.id,
      });
      return;
    }
    if (m.id === "show_qr") {
      setStep("qr");
      return;
    }
    if (m.needsIdentity) {
      setStep("identity");
      return;
    }
    await runLocalMethod(m.id);
  }

  async function runLocalMethod(id: RetentionMethodId) {
    setBusy(true);
    try {
      if (id === "copy_link") {
        try {
          await navigator.clipboard.writeText(livingCardUrl);
          setHint("Link copied.");
        } catch {
          setHint("Copy the link from your browser address bar.");
        }
        void trackRetentionEvent({
          eventType: RETENTION_EVENTS.retentionSuccess,
          businessId,
          campaignId,
          deviceSlotId,
          method: id,
        });
        onComplete({ method: id });
        return;
      }
      if (id === "save_contact") {
        const content = buildLivingVCard();
        if (content) {
          const fullName =
            profile?.displayName || profile?.organization || businessName || "Contact";
          const result = await saveContactWithUserGesture({
            filename: `${fullName.replace(/\s+/g, "-")}.vcf`,
            content,
            title: fullName,
          });
          if (result === "cancelled") {
            setHint("Save cancelled.");
            return;
          }
          setHint(
            result === "downloaded"
              ? "Contact file ready — open it to add. It includes your Living Card link."
              : "Opening Contacts… Your Living Card link is included."
          );
        } else if (contactHref) {
          window.open(contactHref, "_blank", "noopener,noreferrer");
        } else {
          setHint("Contact details aren’t ready — try Copy link.");
          void trackRetentionEvent({
            eventType: RETENTION_EVENTS.retentionFailure,
            businessId,
            campaignId,
            deviceSlotId,
            method: id,
          });
          return;
        }
        void trackRetentionEvent({
          eventType: RETENTION_EVENTS.retentionSuccess,
          businessId,
          campaignId,
          deviceSlotId,
          method: id,
        });
        onComplete({ method: id });
      }
    } finally {
      setBusy(false);
    }
  }

  async function ensureRelationship(): Promise<{
    myTapPath: string | null;
    publicToken: string | null;
  } | null> {
    if (previewMode) {
      return { myTapPath: "/mytap/preview", publicToken: "preview" };
    }
    if (!email.trim()) return null;
    const keepRes = await fetch("/api/tapsave/keep", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId,
        email: email.trim(),
        name: name.trim() || undefined,
        campaignId,
        deviceSlotId,
        consentGiven: usefulUpdates,
      }),
    });
    const keepData = await keepRes.json();
    if (!keepRes.ok || !keepData.ok) {
      setError(keepData.error ?? "Could not save this Card.");
      return null;
    }
    return {
      myTapPath: keepData.myTapUrl ?? keepData.myTapPath ?? null,
      publicToken: keepData.publicToken ?? null,
    };
  }

  async function submitIdentity(e: React.FormEvent) {
    e.preventDefault();
    if (!method) return;
    setBusy(true);
    setError(null);
    try {
      const rel = await ensureRelationship();
      if (!rel) {
        void trackRetentionEvent({
          eventType: RETENTION_EVENTS.retentionFailure,
          businessId,
          campaignId,
          deviceSlotId,
          method,
        });
        return;
      }

      if (method === "apple_wallet" && rel.publicToken && !previewMode) {
        const isPreview = walletMode !== "live";
        void trackRetentionEvent({
          eventType: isPreview
            ? RETENTION_EVENTS.walletPreviewRequested
            : RETENTION_EVENTS.walletLiveInstallRequested,
          businessId,
          campaignId,
          deviceSlotId,
          method,
        });
        const walletRes = await fetch("/api/mytap/wallet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicToken: rel.publicToken, platform: "apple" }),
        });
        const walletData = await walletRes.json();
        if (!walletRes.ok || !walletData.ok) {
          setHint(
            walletData.error ??
              "Card saved. Wallet preview isn’t available right now — open your Card anytime."
          );
        }
      }

      if (method === "email_card") {
        const url =
          typeof window !== "undefined"
            ? rel.myTapPath
              ? `${window.location.origin}${rel.myTapPath}`
              : livingCardUrl
            : rel.myTapPath ?? livingCardUrl;
        const subject = encodeURIComponent(
          businessName ? `Your ${businessName} Card` : "Your saved Card"
        );
        const body = encodeURIComponent(
          `Here’s your private link to reopen this Card:\n\n${url}\n`
        );
        window.location.href = `mailto:${encodeURIComponent(email.trim())}?subject=${subject}&body=${body}`;
      }

      void trackRetentionEvent({
        eventType: RETENTION_EVENTS.retentionSuccess,
        businessId,
        campaignId,
        deviceSlotId,
        method,
      });
      onComplete({
        method,
        myTapPath: rel.myTapPath,
        publicToken: rel.publicToken,
      });
    } catch {
      setError("Network error. Try again.");
      void trackRetentionEvent({
        eventType: RETENTION_EVENTS.retentionFailure,
        businessId,
        campaignId,
        deviceSlotId,
        method: method ?? undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  async function finishHomescreen(outcome: "completed" | "deferred") {
    setBusy(true);
    persistSetup({
      method: "homescreen",
      homescreenPending: outcome === "deferred",
    });
    void trackRetentionEvent({
      eventType:
        outcome === "completed"
          ? RETENTION_EVENTS.homescreenCompleted
          : RETENTION_EVENTS.homescreenDeferred,
      businessId,
      campaignId,
      deviceSlotId,
      method: "homescreen",
    });
    // Optional soft save if email already known from prefill
    let myTapPath: string | null = null;
    let publicToken: string | null = null;
    if (email.trim() && !previewMode) {
      const rel = await ensureRelationship();
      if (rel) {
        myTapPath = rel.myTapPath;
        publicToken = rel.publicToken;
      }
    }
    void trackRetentionEvent({
      eventType: RETENTION_EVENTS.retentionSuccess,
      businessId,
      campaignId,
      deviceSlotId,
      method: "homescreen",
    });
    onComplete({
      method: "homescreen",
      myTapPath,
      publicToken,
      homescreenPending: outcome === "deferred",
    });
    setBusy(false);
  }

  const guide = homescreenInstructions(device);

  return (
    <div
      className={cn(
        "rounded-xl border border-white/15 bg-black/80 p-4 text-sm text-white shadow-xl backdrop-blur",
        className
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="retention-chooser"
      data-primary-method={plan.primary.id}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--tap-primary,#bef200)]">
            Keep this Card
          </p>
          <h3 id={titleId} className="text-base font-semibold">
            {step === "recommend"
              ? "One clear next step"
              : step === "homescreen_guide"
                ? guide.title
                : step === "qr"
                  ? "Scan on your phone"
                  : "Almost done"}
          </h3>
          <p className="mt-1 text-xs text-white/65">
            {step === "recommend"
              ? plan.rationale
              : step === "identity"
                ? "We’ll save your Card and set up your choice."
                : step === "homescreen_guide"
                  ? guide.note
                  : "Open the camera on your phone and scan."}
          </p>
        </div>
        <button
          type="button"
          className="text-white/50 hover:text-white"
          onClick={onClose}
          aria-label="Close"
          disabled={busy}
        >
          ✕
        </button>
      </div>

      {step === "recommend" ? (
        <div className="mt-4 space-y-2">
          <RetentionMethodButton
            m={plan.primary}
            variant="primary"
            busy={busy}
            onSelect={(m) => void selectMethod(m)}
          />
          {plan.secondary.map((m) => (
            <RetentionMethodButton
              key={m.id}
              m={m}
              variant="secondary"
              busy={busy}
              onSelect={(method) => void selectMethod(method)}
            />
          ))}
          {plan.more.length > 0 ? (
            <div>
              <button
                type="button"
                className="mt-1 text-xs text-white/55 underline-offset-2 hover:underline"
                onClick={() => setShowMore((v) => !v)}
                data-testid="retention-more-options"
                aria-expanded={showMore}
              >
                {showMore ? "Hide more options" : "More options"}
              </button>
              {showMore ? (
                <ul className="mt-2 space-y-2">
                  {plan.more.map((m) => (
                    <li key={m.id}>
                      <RetentionMethodButton
                        m={m}
                        variant="more"
                        busy={busy}
                        onSelect={(method) => void selectMethod(method)}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {step === "identity" ? (
        <form onSubmit={submitIdentity} className="mt-4 space-y-3">
          <label className="block text-xs text-white/70">
            Name (optional)
            <input
              className="tap-input mt-1 w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              data-testid="retention-name"
            />
          </label>
          <label className="block text-xs text-white/70">
            Email
            <input
              className="tap-input mt-1 w-full"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              data-testid="retention-email"
            />
          </label>
          <label className="flex items-start gap-2 rounded-lg border border-white/12 bg-white/5 p-3 text-xs text-white/80">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={usefulUpdates}
              onChange={(e) => setUsefulUpdates(e.target.checked)}
              data-testid="retention-useful-updates"
            />
            <span>
              <span className="font-medium text-white">{RETENTION_UPDATES_COPY.label}</span>
              <span className="mt-1 block text-white/55">{RETENTION_UPDATES_COPY.detail}</span>
            </span>
          </label>
          {error ? (
            <p className="text-sm text-red-300" role="alert" data-testid="retention-error">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              className="tap-btn flex-1 border border-white/15"
              disabled={busy}
              onClick={() => {
                setStep("recommend");
                setMethod(null);
              }}
            >
              Back
            </button>
            <button
              type="submit"
              className="tap-btn tap-btn-primary flex-1"
              disabled={busy}
              data-testid="retention-continue"
            >
              {busy
                ? "Saving…"
                : method === "apple_wallet"
                  ? walletMode === "live"
                    ? "Add to Wallet"
                    : "Save & preview"
                  : "Continue"}
            </button>
          </div>
        </form>
      ) : null}

      {step === "homescreen_guide" ? (
        <div className="mt-4 space-y-3" data-testid="homescreen-guide">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-white/80">
            {guide.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <p className="text-xs text-white/50">{guide.note}</p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="tap-btn tap-btn-primary min-h-11 w-full"
              disabled={busy}
              data-testid="homescreen-done"
              onClick={() => void finishHomescreen("completed")}
            >
              I’ve added it
            </button>
            <button
              type="button"
              className="tap-btn min-h-11 w-full border border-white/15"
              disabled={busy}
              data-testid="homescreen-later"
              onClick={() => void finishHomescreen("deferred")}
            >
              I’ll finish later
            </button>
            <button
              type="button"
              className="text-xs text-white/50"
              disabled={busy}
              onClick={() => {
                setStep("recommend");
                setMethod(null);
              }}
            >
              Back
            </button>
          </div>
        </div>
      ) : null}

      {step === "qr" ? (
        <div className="mt-4 space-y-3 text-center" data-testid="retention-qr">
          <RetentionQrImage url={livingCardUrl} />
          <p className="text-xs text-white/60">Scan to open this Card on your phone, then Keep it there.</p>
          <button
            type="button"
            className="tap-btn w-full border border-white/15"
            onClick={() => {
              void trackRetentionEvent({
                eventType: RETENTION_EVENTS.retentionSuccess,
                businessId,
                campaignId,
                deviceSlotId,
                method: "show_qr",
              });
              onComplete({ method: "show_qr" });
            }}
          >
            Done
          </button>
        </div>
      ) : null}

      {hint ? (
        <p className="mt-3 text-xs text-white/70" role="status" data-testid="retention-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
