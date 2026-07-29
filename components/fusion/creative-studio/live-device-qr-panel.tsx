"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [error, setError] = useState<string | null>(null);
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
      setError(null);
      try {
        const res = await fetch("/api/preview/card/session", {
          method: mode === "update" && token ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            mode === "update" && token
              ? { token, ...payload }
              : payload
          ),
        });
        const data = (await res.json()) as SessionResponse & { token?: string };
        if (!res.ok || !data.ok) {
          setError(data.error || "Preview session unavailable");
          setGuidance(data.recovery || data.guidance || null);
          return;
        }
        if (data.token) setToken(data.token);
        setPreviewUrl(data.url || null);
        setReachable(Boolean(data.reachableForPhone));
        setGuidance(data.guidance || null);
        setSessionRevision(data.revision ?? revision);
        if (data.url && data.reachableForPhone) {
          const png = await QRCode.toDataURL(data.url, {
            margin: 1,
            width: 240,
            errorCorrectionLevel: "M",
          });
          setQrDataUrl(png);
        } else {
          setQrDataUrl(null);
        }
      } catch {
        setError("Could not create phone preview");
        setGuidance("Try again, or copy the link after fixing NEXT_PUBLIC_PREVIEW_BASE_URL.");
      } finally {
        setBusy(false);
      }
    },
    [payload, revision, token]
  );

  useEffect(() => {
    void createOrUpdate("create");
    // intentionally once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={cn("space-y-3 p-3", className)}
      data-testid="live-device-qr-panel"
    >
      <div className="flex items-center gap-2">
        <Smartphone className="h-4 w-4 text-white/70" aria-hidden />
        <div>
          <p className="text-sm font-medium text-white">{STUDIO_WORDING.openLiveDevice}</p>
          <p className="text-[11px] text-white/45">
            Temporary draft preview — not published
          </p>
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
          {busy ? "Generating preview…" : "QR unavailable until a reachable preview URL is configured"}
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
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center rounded-md border border-white/15 px-3 text-xs text-white/80"
              data-testid="preview-open-tab"
            >
              Open in new tab
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
