"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  describeOfferCampaignContext,
  formatOfferCampaignOptionLabel,
  initialOfferCampaignSelection,
  listEligibleOfferCampaigns,
  offerSelectionMode,
  type OfferCampaignCandidate,
} from "@/lib/fusion/card/offer-selection";

export type { OfferCampaignCandidate };

/**
 * Host Offer fuse wire — explicit Campaign selection, then bind / preview / Distribution.
 * Never silently defaults to the newest Campaign when multiple offers exist.
 */
export function CardOfferWirePanel({
  campaigns,
  sectionId,
  boundCampaignId,
  className,
}: {
  campaigns: OfferCampaignCandidate[];
  sectionId?: string;
  boundCampaignId?: string | null;
  className?: string;
}) {
  const eligible = useMemo(() => listEligibleOfferCampaigns(campaigns), [campaigns]);
  const mode = offerSelectionMode(eligible);
  const [campaignId, setCampaignId] = useState(() =>
    initialOfferCampaignSelection({ eligible, boundCampaignId })
  );
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    cardSpotlight?: { headline?: string; offerCode?: string; offerTitle?: string };
    email?: { subject?: string };
    tapcast?: { caption?: string };
    projectionState?: string;
  } | null>(null);
  const [pkgId, setPkgId] = useState<string | null>(null);

  const selected = eligible.find((c) => c.id === campaignId) ?? null;
  const canAct = Boolean(campaignId && selected?.hasOffer && confirmed);

  function selectCampaign(nextId: string) {
    setCampaignId(nextId);
    setConfirmed(false);
    setPreview(null);
    setMessage(null);
    setError(null);
    setPkgId(null);
  }

  async function bind(preservePresentation = true) {
    if (!canAct || !campaignId) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/card/offer/bind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          sectionId,
          preservePresentation,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        projectionState?: string;
        offer?: { title?: string };
      };
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not bind offer.");
        return;
      }
      setMessage(
        `Bound “${data.offer?.title || selected?.offerTitle || "offer"}” from “${selected?.title || "Campaign"}” · projection ${data.projectionState || "current"}`
      );
    } catch {
      setError("Network error binding offer.");
    } finally {
      setBusy(false);
    }
  }

  async function loadPreview() {
    if (!canAct || !campaignId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/card/offer/bind?campaignId=${encodeURIComponent(campaignId)}`);
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        previews?: typeof preview;
        projectionState?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not load preview.");
        return;
      }
      setPreview({ ...data.previews, projectionState: data.projectionState });
    } catch {
      setError("Network error loading preview.");
    } finally {
      setBusy(false);
    }
  }

  async function prepareDistribution() {
    if (!canAct || !campaignId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/card/offer/distribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, sectionId }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        package?: { id?: string };
      };
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not prepare distribution.");
        return;
      }
      setPkgId(data.package?.id || null);
      setMessage("Mock Distribution package prepared (email + TapCast · not published).");
    } catch {
      setError("Network error preparing distribution.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={cn(
        "rounded-xl border border-primary/30 bg-[#080d18] p-4",
        className
      )}
      data-testid="card-offer-wire-panel"
      aria-label="Put an offer on my Card"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
        Offer fuse
      </p>
      <h2 className="mt-1 text-base font-semibold text-white">Put an offer on my Card</h2>
      <p className="mt-1 text-sm text-white/60">
        Campaign owns the authoritative offer. Choose which Campaign to project onto Card
        Spotlight — change once, preview everywhere, then publish.
      </p>

      <div className="mt-4 space-y-3">
        {mode === "none" ? (
          <div
            className="rounded-lg border border-amber-500/35 bg-amber-500/10 p-3 text-sm text-amber-50"
            data-testid="card-offer-empty-state"
            role="status"
          >
            <p className="font-medium">No Campaign offer to bind yet</p>
            <p className="mt-1 text-amber-100/85">
              Create a Campaign with an offer / coupon block first. The Card will project that
              offer — it will not invent a separate Card-owned offer.
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              <Link
                href="/dashboard/workbench"
                className="text-primary hover:underline"
                data-testid="card-offer-create-campaign"
              >
                Create Campaign offer in Workbench
              </Link>
              <Link href="/dashboard/campaigns" className="text-primary hover:underline">
                Open Campaigns
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div>
              <label className="text-xs text-white/60" htmlFor="offer-campaign">
                {mode === "multiple"
                  ? "Select a Campaign offer (required)"
                  : "Campaign offer"}
              </label>
              <select
                id="offer-campaign"
                className="mt-1 flex min-h-10 w-full rounded-lg border border-white/15 bg-black/40 px-2 py-2 text-sm text-white"
                value={campaignId}
                onChange={(e) => selectCampaign(e.target.value)}
                data-testid="card-offer-campaign-select"
                data-selection-mode={mode}
                aria-describedby="offer-campaign-help"
              >
                {mode === "multiple" ? (
                  <option value="">Choose a Campaign…</option>
                ) : null}
                {eligible.map((c) => (
                  <option key={c.id} value={c.id}>
                    {formatOfferCampaignOptionLabel(c)}
                  </option>
                ))}
              </select>
              <p id="offer-campaign-help" className="mt-1 text-[11px] text-white/45">
                {mode === "multiple"
                  ? "Multiple offers found — pick one intentionally. Newest is not auto-selected."
                  : "Only one eligible Campaign offer — confirm below before binding."}
              </p>
            </div>

            {selected ? (
              <div
                className="rounded-lg border border-white/10 bg-black/40 p-3 text-xs text-white/80"
                data-testid="card-offer-selected-context"
                aria-live="polite"
              >
                <p className="font-semibold text-white">Selected for Spotlight</p>
                <ul className="mt-2 space-y-1">
                  {describeOfferCampaignContext(selected).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p
                className="text-sm text-white/55"
                data-testid="card-offer-awaiting-selection"
              >
                Select a Campaign to see offer details and enable bind.
              </p>
            )}

            <label
              className={cn(
                "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs",
                selected
                  ? "border-white/15 bg-black/30 text-white/80"
                  : "border-white/10 bg-black/20 text-white/45"
              )}
            >
              <input
                type="checkbox"
                className="mt-0.5"
                checked={confirmed}
                disabled={!selected}
                onChange={(e) => setConfirmed(e.target.checked)}
                data-testid="card-offer-bind-confirm"
              />
              <span>
                I confirm binding{" "}
                <strong className="text-white">
                  {selected
                    ? `“${selected.offerTitle || "this offer"}” from “${selected.title}”`
                    : "the selected Campaign offer"}
                </strong>{" "}
                to this Card Spotlight. Campaign remains the source of truth.
              </span>
            </label>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={busy || !canAct}
                onClick={() => void bind(false)}
                data-testid="card-offer-bind"
              >
                Bind to Card Spotlight
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busy || !canAct}
                onClick={() => void bind(true)}
                data-testid="card-offer-refresh"
              >
                Refresh facts (keep teaser)
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy || !canAct}
                onClick={() => void loadPreview()}
                data-testid="card-offer-preview"
              >
                Unified preview
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy || !canAct}
                onClick={() => void prepareDistribution()}
                data-testid="card-offer-distribution"
              >
                Prepare Distribution (mock)
              </Button>
            </div>
          </>
        )}

        {message ? (
          <p className="text-sm text-emerald-200" role="status" data-testid="card-offer-wire-ok">
            {message}
            {pkgId ? ` · ${pkgId}` : ""}
          </p>
        ) : null}
        {error ? (
          <p className="text-sm text-red-300" role="alert" data-testid="card-offer-wire-error">
            {error}
          </p>
        ) : null}

        {preview ? (
          <div
            className="space-y-2 rounded-lg border border-white/10 bg-black/40 p-3 text-xs text-white/80"
            data-testid="card-offer-unified-preview"
          >
            <p className="font-semibold text-white">
              Unified preview · {selected?.title || "Campaign"} · projection{" "}
              {preview.projectionState || "—"}
            </p>
            <p>
              <span className="text-white/50">Card Spotlight:</span>{" "}
              {preview.cardSpotlight?.headline || preview.cardSpotlight?.offerTitle}
              {preview.cardSpotlight?.offerCode
                ? ` · code ${preview.cardSpotlight.offerCode}`
                : ""}
            </p>
            <p>
              <span className="text-white/50">Email mock:</span> {preview.email?.subject}
            </p>
            <p>
              <span className="text-white/50">TapCast mock:</span> {preview.tapcast?.caption}
            </p>
            <p className="text-white/50">
              Insights attribution uses the same campaignId + offerBlockId + sectionId.
            </p>
          </div>
        ) : null}

        {mode !== "none" ? (
          <div className="flex flex-wrap gap-3 text-xs">
            <Link href="/dashboard/workbench" className="text-primary hover:underline">
              Open Campaign Workbench
            </Link>
            <Link href="/dashboard/insights?view=card" className="text-primary hover:underline">
              Measure in Insights
            </Link>
            <Link href="/dashboard/card/edit?wire=offer" className="text-primary hover:underline">
              Edit Card Spotlight
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
