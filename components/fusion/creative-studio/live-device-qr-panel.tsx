"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { Copy, RefreshCw, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { STUDIO_WORDING } from "@/lib/fusion/creative-studio/wording";
import type { TapConnectCardConfig } from "@/lib/brand/tap-card";
import type { BrandContactProfile } from "@/lib/brand/contact-profile";

export type LiveDeviceQrPanelProps = {
  config: TapConnectCardConfig;
  profile: BrandContactProfile;
  businessName: string;
  cardName: string;
  brandKitId?: string | null;
  logoUrl?: string | null;
  reviewUrl?: string | null;
  revision: number;
  className?: string;
};

type SessionResponse = {
  ok?: boolean;
  path?: string;
  url?: string;
  reachableForPhone?: boolean;
  isLocalhost?: boolean;
  guidance?: string | null;
  revision?: number;
  expiresAt?: string;
  error?: string;
  consequence?: string;
  recovery?: string;
};

export function LiveDeviceQrPanel({
  config,
  profile,
  businessName,
  cardName,
  brandKitId,
  logoUrl,
  reviewUrl,
  revision,
  className,
}: LiveDeviceQrPanelProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [reachable, setReachable] = useState(true);
  const [guidance, setGuidance] = useState<string | null>(null);
  const [sessionRevision, setSessionRevision] = useState(revision);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "creating" | "ready" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState(() => new Date().toISOString());
  const autoStarted = useRef(false);
  const stale = revision > sessionRevision;

  const payload = useMemo(
    () => ({
      snapshot: config,
      profile,
      businessName,
      cardName,
      brandKitId: brandKitId || "local",
      logoUrl,
      reviewUrl,
      revision,
    }),
    [config, profile, businessName, cardName, brandKitId, logoUrl, reviewUrl, revision]
  );

  const createOrUpdate = useCallback(
    async (mode: "create" | "update") => {
      setBusy(true);
      setStatus("creating");
      setError(null);
      try {
        const res = await fetch("/api/preview/card/session", {
          method: mode === "update" && token ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            mode === "update" && token ? { token, ...payload } : payload
          ),
        });
        const data = (await res.json()) as SessionResponse & { token?: string };
        if (!res.ok || !data.ok) {
          setError(data.error || "Preview session unavailable");
          setGuidance(data.recovery || data.guidance || null);
          setStatus("error");
          return;
        }
        if (data.token) setToken(data.token);
        setPreviewUrl(data.url || null);
        setReachable(Boolean(data.reachableForPhone));
        setGuidance(data.guidance || null);
        setSessionRevision(data.revision ?? revision);
        setUpdatedAt(new Date().toISOString());
        if (data.expiresAt) setExpiresAt(data.expiresAt);
        if (data.url && data.reachableForPhone) {
          const png = await QRCode.toDataURL(data.url, {
            margin: 1,
            width: 240,
            errorCorrectionLevel: "M",
          });
          setQrDataUrl(png);
          setStatus("ready");
        } else {
          setQrDataUrl(null);
          setStatus(data.url ? "ready" : "error");
        }
      } catch {
        setError("Could not create phone preview");
        setGuidance(
          "Try again, or copy the link after fixing NEXT_PUBLIC_PREVIEW_BASE_URL."
        );
        setStatus("error");
      } finally {
        setBusy(false);
      }
    },
    [payload, revision, token]
  );

  // Entering Live Device auto-creates or refreshes the phone preview QR.
  useEffect(() => {
    if (autoStarted.current) return;
    autoStarted.current = true;
    void createOrUpdate("create");
  }, [createOrUpdate]);

  return (
    <div
      className={cn("space-y-3 p-3", className)}
      data-testid="live-device-qr-panel"
      data-preview-status={status}
    >
      <div className="flex items-center gap-2">
        <Smartphone className="h-4 w-4 text-white/70" aria-hidden />
        <div>
          <p className="text-sm font-medium text-white">
            {STUDIO_WORDING.openLiveDevice}
          </p>
          <p className="text-[11px] text-white/45" data-testid="preview-qr-card-name">
            {cardName} · {STUDIO_WORDING.draftPreview} ·{" "}
            {STUDIO_WORDING.previewOnlyNotPublished}
          </p>
          <p className="text-[10px] text-white/35" data-testid="preview-qr-meta">
            Updated {new Date(updatedAt).toLocaleString()}
            {expiresAt ? ` · Expires ${new Date(expiresAt).toLocaleString()}` : ""}
            {` · rev ${sessionRevision}`}
          </p>
          <p
            className="text-[10px] text-white/40"
            data-testid="preview-status-label"
            data-status={status}
          >
            {status === "creating"
              ? STUDIO_WORDING.creatingPhonePreview
              : status === "ready"
                ? STUDIO_WORDING.phonePreviewReady
                : status === "error"
                  ? "Preview unavailable"
                  : "Preparing…"}
          </p>
          {status === "ready" ? (
            <span className="sr-only" data-testid="live-device-status-ready">
              Phone preview ready
            </span>
          ) : null}
          {status === "error" ? (
            <span className="sr-only" data-testid="live-device-status-error">
              Preview unavailable
            </span>
          ) : null}
        </div>
      </div>

      {stale ? (
        <p
          className="rounded-md border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-100"
          data-testid="preview-stale-notice"
          role="status"
        >
          {STUDIO_WORDING.stalePreview}
        </p>
      ) : null}

      {error ? (
        <div
          className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-100"
          data-testid="preview-session-error"
          role="alert"
        >
          <p>{error}</p>
          {guidance ? <p className="mt-1 text-red-100/80">{guidance}</p> : null}
          <Button
            type="button"
            variant="outline"
            className="mt-2 min-h-10"
            data-testid="preview-generate-qr"
            onClick={() => void createOrUpdate("create")}
          >
            Try again
          </Button>
        </div>
      ) : null}

      {!reachable && guidance ? (
        <p
          className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/75"
          data-testid="preview-localhost-warning"
          role="status"
        >
          {guidance}
        </p>
      ) : null}

      {qrDataUrl && reachable ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qrDataUrl}
          alt={`QR code for draft preview of ${cardName}`}
          className="mx-auto rounded-lg bg-white p-2"
          data-testid="preview-qr-image"
          width={240}
          height={240}
        />
      ) : (
        <div
          className="flex min-h-[160px] items-center justify-center rounded-lg border border-dashed border-white/15 text-xs text-white/45"
          data-testid="preview-qr-unavailable"
        >
          {busy
            ? STUDIO_WORDING.creatingPhonePreview
            : "QR unavailable until a reachable preview URL is configured"}
        </div>
      )}

      {previewUrl ? (
        <div className="space-y-2">
          <p className="break-all text-[11px] text-white/55" data-testid="preview-url-text">
            {previewUrl}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-10"
              data-testid="preview-copy-link"
              onClick={() => void navigator.clipboard.writeText(previewUrl)}
            >
              <Copy className="mr-1 h-3.5 w-3.5" />
              Copy preview link
            </Button>
            <Button
              type="button"
              className="min-h-10 bg-primary text-primary-foreground"
              data-testid="preview-update-phone"
              disabled={busy}
              onClick={() => void createOrUpdate(token ? "update" : "create")}
            >
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
              {STUDIO_WORDING.updatePhonePreview}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-10"
              data-testid="preview-revoke"
              disabled={busy || !token}
              onClick={async () => {
                if (!token) return;
                setBusy(true);
                try {
                  await fetch("/api/preview/card/revoke", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token }),
                  });
                  setPreviewUrl(null);
                  setQrDataUrl(null);
                  setToken(null);
                  setStatus("idle");
                  autoStarted.current = false;
                } finally {
                  setBusy(false);
                }
              }}
            >
              Revoke
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-10"
              data-testid="preview-open-tab"
              onClick={() =>
                window.open(previewUrl, "_blank", "noopener,noreferrer")
              }
            >
              Open preview
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
